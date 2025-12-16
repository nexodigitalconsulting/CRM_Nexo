import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface InvoiceService {
  id?: string;
  service_id: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  discount_amount: number;
  subtotal: number;
  iva_percent: number;
  iva_amount: number;
  total: number;
  description?: string;
  service?: {
    id: string;
    name: string;
    price: number;
  };
}

export interface InvoiceWithDetails {
  id: string;
  invoice_number: number;
  client_id: string;
  contract_id: string | null;
  issue_date: string;
  due_date: string | null;
  status: "draft" | "issued" | "paid" | "cancelled";
  subtotal: number | null;
  iva_percent: number | null;
  iva_amount: number | null;
  total: number | null;
  notes: string | null;
  document_url: string | null;
  remittance_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  client?: {
    id: string;
    name: string;
    cif: string | null;
    email: string | null;
    iban: string | null;
  };
  contract?: {
    id: string;
    name: string | null;
    contract_number: number;
  };
  services?: InvoiceService[];
}

export interface InvoiceInsert {
  client_id: string;
  contract_id?: string | null;
  issue_date: string;
  due_date?: string | null;
  status?: "draft" | "issued" | "paid" | "cancelled";
  subtotal?: number;
  iva_percent?: number;
  iva_amount?: number;
  total?: number;
  notes?: string | null;
  services: InvoiceService[];
}

export interface InvoiceUpdate {
  client_id?: string;
  contract_id?: string | null;
  issue_date?: string;
  due_date?: string | null;
  status?: "draft" | "issued" | "paid" | "cancelled";
  subtotal?: number;
  iva_percent?: number;
  iva_amount?: number;
  total?: number;
  notes?: string | null;
  services?: InvoiceService[];
}

export function useInvoices() {
  return useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          *,
          client:clients(id, name, cif, email, iban),
          contract:contracts(id, name, contract_number)
        `)
        .order("invoice_number", { ascending: false });
      
      if (error) throw error;
      return data as InvoiceWithDetails[];
    },
  });
}

export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: ["invoices", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          *,
          client:clients(id, name, cif, email, iban),
          contract:contracts(id, name, contract_number),
          services:invoice_services(
            *,
            service:services(id, name, price)
          )
        `)
        .eq("id", id)
        .maybeSingle();
      
      if (error) throw error;
      return data as InvoiceWithDetails | null;
    },
    enabled: !!id,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (invoice: InvoiceInsert) => {
      const { services, ...invoiceData } = invoice;
      
      // Create invoice
      const { data: invoiceResult, error: invoiceError } = await supabase
        .from("invoices")
        .insert(invoiceData)
        .select()
        .single();
      
      if (invoiceError) throw invoiceError;
      
      // Create invoice services
      if (services.length > 0) {
        const invoiceServices = services.map((s) => ({
          invoice_id: invoiceResult.id,
          service_id: s.service_id,
          quantity: s.quantity,
          unit_price: s.unit_price,
          discount_percent: s.discount_percent,
          discount_amount: s.discount_amount,
          subtotal: s.subtotal,
          iva_percent: s.iva_percent,
          iva_amount: s.iva_amount,
          total: s.total,
          description: s.description,
        }));
        
        const { error: servicesError } = await supabase
          .from("invoice_services")
          .insert(invoiceServices);
        
        if (servicesError) throw servicesError;
      }
      
      return invoiceResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Factura creada correctamente");
    },
    onError: (error) => {
      toast.error("Error al crear la factura: " + error.message);
    },
  });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, invoice }: { id: string; invoice: InvoiceUpdate }) => {
      const { services, ...invoiceData } = invoice;
      
      // Update invoice
      const { data: invoiceResult, error: invoiceError } = await supabase
        .from("invoices")
        .update(invoiceData)
        .eq("id", id)
        .select()
        .single();
      
      if (invoiceError) throw invoiceError;
      
      // Update services if provided
      if (services) {
        // Delete existing services
        await supabase
          .from("invoice_services")
          .delete()
          .eq("invoice_id", id);
        
        // Insert new services
        if (services.length > 0) {
          const invoiceServices = services.map((s) => ({
            invoice_id: id,
            service_id: s.service_id,
            quantity: s.quantity,
            unit_price: s.unit_price,
            discount_percent: s.discount_percent,
            discount_amount: s.discount_amount,
            subtotal: s.subtotal,
            iva_percent: s.iva_percent,
            iva_amount: s.iva_amount,
            total: s.total,
            description: s.description,
          }));
          
          const { error: servicesError } = await supabase
            .from("invoice_services")
            .insert(invoiceServices);
          
          if (servicesError) throw servicesError;
        }
      }
      
      return invoiceResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Factura actualizada correctamente");
    },
    onError: (error) => {
      toast.error("Error al actualizar la factura: " + error.message);
    },
  });
}

export function useUpdateInvoiceStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "draft" | "issued" | "paid" | "cancelled" }) => {
      const { data, error } = await supabase
        .from("invoices")
        .update({ status })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Estado de factura actualizado");
    },
    onError: (error) => {
      toast.error("Error: " + error.message);
    },
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      // Delete invoice services first
      await supabase
        .from("invoice_services")
        .delete()
        .eq("invoice_id", id);
      
      // Delete invoice
      const { error } = await supabase
        .from("invoices")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Factura eliminada correctamente");
    },
    onError: (error) => {
      toast.error("Error al eliminar la factura: " + error.message);
    },
  });
}

export function useContractsForInvoice() {
  return useQuery({
    queryKey: ["contracts", "for-invoice"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select(`
          id,
          name,
          contract_number,
          client_id,
          status,
          client:clients(id, name, cif)
        `)
        .in("status", ["active", "pending_activation"])
        .order("contract_number", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
}

// Mark invoice as sent (for automation control)
export function useMarkInvoiceAsSent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("invoices")
        .update({ 
          is_sent: true,
          sent_at: new Date().toISOString()
        })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (error) => {
      toast.error("Error al marcar como enviada: " + error.message);
    },
  });
}
