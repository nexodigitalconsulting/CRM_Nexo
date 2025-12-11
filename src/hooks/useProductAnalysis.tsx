import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface InvoiceProduct {
  id: string;
  invoice_id: string;
  invoice_number: number;
  invoice_date: string;
  invoice_status: string | null;
  client_id: string;
  client_name: string;
  client_cif: string | null;
  service_id: string;
  service_name: string;
  service_category: string | null;
  quantity: number;
  unit_price: number;
  discount_percent: number | null;
  discount_amount: number | null;
  subtotal: number;
  iva_percent: number | null;
  iva_amount: number | null;
  total: number;
  created_at: string | null;
}

export interface QuoteProduct {
  id: string;
  quote_id: string;
  quote_number: number;
  quote_date: string;
  quote_status: string | null;
  client_id: string | null;
  client_name: string | null;
  contact_id: string | null;
  contact_name: string | null;
  service_id: string;
  service_name: string;
  service_category: string | null;
  quantity: number;
  unit_price: number;
  discount_percent: number | null;
  discount_amount: number | null;
  subtotal: number;
  iva_percent: number | null;
  iva_amount: number | null;
  total: number;
  created_at: string | null;
}

export function useInvoiceProducts() {
  return useQuery({
    queryKey: ["invoice-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice_products")
        .select("*")
        .order("invoice_date", { ascending: false });

      if (error) throw error;
      return data as InvoiceProduct[];
    },
  });
}

export function useQuoteProducts() {
  return useQuery({
    queryKey: ["quote-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quote_products")
        .select("*")
        .order("quote_date", { ascending: false });

      if (error) throw error;
      return data as QuoteProduct[];
    },
  });
}

export function useProductStats() {
  const { data: invoiceProducts } = useInvoiceProducts();
  const { data: quoteProducts } = useQuoteProducts();

  const invoiceStats = invoiceProducts ? {
    // Only count paid invoices for revenue
    totalRevenue: invoiceProducts.filter(p => p.invoice_status === 'paid').reduce((sum, p) => sum + Number(p.total), 0),
    // Total of all invoices (excluding subtotal which would double count)
    totalInvoiced: invoiceProducts.reduce((sum, p) => sum + Number(p.subtotal), 0),
    productCount: invoiceProducts.length,
    uniqueProducts: new Set(invoiceProducts.map(p => p.service_id)).size,
    topProducts: getTopProducts(invoiceProducts),
    byCategory: groupByCategory(invoiceProducts),
  } : null;

  const quoteStats = quoteProducts ? {
    totalQuoted: quoteProducts.reduce((sum, p) => sum + Number(p.subtotal), 0),
    approvedTotal: quoteProducts.filter(p => p.quote_status === 'approved').reduce((sum, p) => sum + Number(p.subtotal), 0),
    productCount: quoteProducts.length,
    uniqueProducts: new Set(quoteProducts.map(p => p.service_id)).size,
    topProducts: getTopProducts(quoteProducts),
    byCategory: groupByCategory(quoteProducts),
  } : null;

  return { invoiceStats, quoteStats };
}

function getTopProducts(products: (InvoiceProduct | QuoteProduct)[]) {
  const grouped = products.reduce((acc, p) => {
    const key = p.service_id;
    if (!acc[key]) {
      acc[key] = { service_name: p.service_name, service_category: p.service_category, total: 0, quantity: 0 };
    }
    acc[key].total += Number(p.total);
    acc[key].quantity += p.quantity;
    return acc;
  }, {} as Record<string, { service_name: string; service_category: string | null; total: number; quantity: number }>);

  return Object.values(grouped)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);
}

function groupByCategory(products: (InvoiceProduct | QuoteProduct)[]) {
  return products.reduce((acc, p) => {
    const key = p.service_category || 'Sin categoría';
    if (!acc[key]) {
      acc[key] = { total: 0, quantity: 0 };
    }
    acc[key].total += Number(p.total);
    acc[key].quantity += p.quantity;
    return acc;
  }, {} as Record<string, { total: number; quantity: number }>);
}
