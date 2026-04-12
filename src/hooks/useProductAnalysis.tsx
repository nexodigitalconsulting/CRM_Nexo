// Migrado de Supabase a Drizzle - v2
import { useQuery } from "@tanstack/react-query";
import {
  fetchContractProducts,
  fetchInvoiceProducts,
  fetchQuoteProducts,
} from "@/lib/api/product-analysis";

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

export interface ContractProduct {
  id: string;
  contract_id: string;
  contract_number: number;
  contract_name: string | null;
  contract_status: string | null;
  client_id: string;
  client_name: string;
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
  billing_period: string | null;
  start_date: string | null;
  is_active: boolean;
}

export function useInvoiceProducts() {
  return useQuery({
    queryKey: ["invoice-products"],
    queryFn: () => fetchInvoiceProducts() as unknown as Promise<InvoiceProduct[]>,
  });
}

export function useQuoteProducts() {
  return useQuery({
    queryKey: ["quote-products"],
    queryFn: () => fetchQuoteProducts() as unknown as Promise<QuoteProduct[]>,
  });
}

export function useContractProducts() {
  return useQuery({
    queryKey: ["contract-products"],
    queryFn: async () => {
      const rows = await fetchContractProducts();
      return rows.map((item) => ({
        id: item.id,
        contract_id: item.contract_id,
        contract_number: (item.contract as { contract_number?: number })?.contract_number ?? 0,
        contract_name: null,
        contract_status: (item.contract as { status?: string })?.status ?? null,
        client_id: (item.contract as { client?: { id?: string } })?.client?.id ?? "",
        client_name: (item.contract as { client?: { name?: string } })?.client?.name ?? "",
        service_id: item.service_id,
        service_name: (item.service as { name?: string })?.name ?? "",
        service_category: (item.service as { category?: string | null })?.category ?? null,
        quantity: item.quantity ?? 1,
        unit_price: Number(item.unit_price),
        discount_percent: null,
        discount_amount: null,
        subtotal: Number(item.unit_price) * (item.quantity ?? 1),
        iva_percent: null,
        iva_amount: null,
        total: Number(item.total),
        billing_period: null,
        start_date: null,
        is_active: item.is_active ?? true,
      })) as ContractProduct[];
    },
  });
}

export function useProductStats() {
  const { data: invoiceProducts } = useInvoiceProducts();
  const { data: quoteProducts } = useQuoteProducts();
  const { data: contractProducts } = useContractProducts();

  const invoiceStats = invoiceProducts ? {
    totalInvoiced: invoiceProducts.filter((p) => p.invoice_status !== "cancelada").reduce((sum, p) => sum + Number(p.subtotal), 0),
    totalPaid: invoiceProducts.filter((p) => p.invoice_status === "pagada").reduce((sum, p) => sum + Number(p.subtotal), 0),
    totalPending: invoiceProducts.filter((p) => p.invoice_status === "emitida").reduce((sum, p) => sum + Number(p.subtotal), 0),
    productCount: invoiceProducts.length,
    uniqueProducts: new Set(invoiceProducts.map((p) => p.service_id)).size,
    topProducts: getTopProducts(invoiceProducts),
    byCategory: groupByCategory(invoiceProducts),
  } : null;

  const quoteStats = quoteProducts ? {
    totalQuoted: quoteProducts.filter((p) => p.quote_status !== "rechazado").reduce((sum, p) => sum + Number(p.subtotal), 0),
    approvedTotal: quoteProducts.filter((p) => p.quote_status === "aceptado").reduce((sum, p) => sum + Number(p.subtotal), 0),
    productCount: quoteProducts.length,
    uniqueProducts: new Set(quoteProducts.map((p) => p.service_id)).size,
    topProducts: getTopProducts(quoteProducts),
    byCategory: groupByCategory(quoteProducts),
  } : null;

  const contractStats = contractProducts ? {
    totalContracted: contractProducts.filter((p) => p.contract_status === "vigente").reduce((sum, p) => sum + Number(p.subtotal), 0),
    totalAll: contractProducts.reduce((sum, p) => sum + Number(p.subtotal), 0),
    productCount: contractProducts.length,
    uniqueProducts: new Set(contractProducts.map((p) => p.service_id)).size,
    activeContracts: new Set(contractProducts.filter((p) => p.contract_status === "vigente").map((p) => p.contract_id)).size,
    topProducts: getTopContractProducts(contractProducts),
    byCategory: groupByCategory(contractProducts),
  } : null;

  return { invoiceStats, quoteStats, contractStats };
}

function getTopProducts(products: (InvoiceProduct | QuoteProduct)[]) {
  const grouped = products.reduce((acc, p) => {
    const key = p.service_id;
    if (!acc[key]) acc[key] = { service_name: p.service_name, service_category: p.service_category, total: 0, quantity: 0 };
    acc[key].total += Number(p.subtotal);
    acc[key].quantity += p.quantity;
    return acc;
  }, {} as Record<string, { service_name: string; service_category: string | null; total: number; quantity: number }>);
  return Object.values(grouped).sort((a, b) => b.total - a.total).slice(0, 10);
}

function getTopContractProducts(products: ContractProduct[]) {
  const grouped = products.reduce((acc, p) => {
    const key = p.service_id;
    if (!acc[key]) acc[key] = { service_name: p.service_name, service_category: p.service_category, total: 0, quantity: 0 };
    acc[key].total += Number(p.subtotal);
    acc[key].quantity += p.quantity;
    return acc;
  }, {} as Record<string, { service_name: string; service_category: string | null; total: number; quantity: number }>);
  return Object.values(grouped).sort((a, b) => b.total - a.total).slice(0, 10);
}

function groupByCategory(products: (InvoiceProduct | QuoteProduct | ContractProduct)[]) {
  return products.reduce((acc, p) => {
    const key = p.service_category || "Sin categoría";
    if (!acc[key]) acc[key] = { total: 0, quantity: 0 };
    acc[key].total += Number(p.subtotal);
    acc[key].quantity += p.quantity;
    return acc;
  }, {} as Record<string, { total: number; quantity: number }>);
}
