import Expenses from "@/views/Expenses";

export const metadata = { title: "Gastos — CRM Nexo" };

export default function Page() {
  return <Expenses />;
}

export const dynamic = 'force-dynamic';
