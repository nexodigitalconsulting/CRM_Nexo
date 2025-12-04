import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";

export type Contact = Tables<"contacts">;
export type ContactInsert = TablesInsert<"contacts">;
export type ContactUpdate = TablesUpdate<"contacts">;

export function useContacts() {
  return useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .order("contact_number", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
}

export function useContact(id: string | undefined) {
  return useQuery({
    queryKey: ["contacts", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("id", id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (contact: ContactInsert) => {
      const { data, error } = await supabase
        .from("contacts")
        .insert(contact)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contacto creado correctamente");
    },
    onError: (error) => {
      toast.error("Error al crear el contacto: " + error.message);
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...contact }: ContactUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("contacts")
        .update(contact)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contacto actualizado correctamente");
    },
    onError: (error) => {
      toast.error("Error al actualizar el contacto: " + error.message);
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contacts")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contacto eliminado correctamente");
    },
    onError: (error) => {
      toast.error("Error al eliminar el contacto: " + error.message);
    },
  });
}

export function useConvertToClient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (contact: Contact) => {
      // Create client from contact
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .insert({
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
          source: contact.source,
          contact_id: contact.id,
        })
        .select()
        .single();
      
      if (clientError) throw clientError;
      
      // Update contact status
      const { error: updateError } = await supabase
        .from("contacts")
        .update({ status: "converted" })
        .eq("id", contact.id);
      
      if (updateError) throw updateError;
      
      return client;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Contacto convertido a cliente");
    },
    onError: (error) => {
      toast.error("Error al convertir el contacto: " + error.message);
    },
  });
}
