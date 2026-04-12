import Invoices from "@/views/Invoices";

export const metadata = { title: "Facturas — CRM Nexo" };

export default function Page() {
  return <Invoices />;
}

export const dynamic = 'force-dynamic';
