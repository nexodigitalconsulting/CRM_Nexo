import Remittances from "@/views/Remittances";

export const metadata = { title: "Remesas — CRM Nexo" };

export default function Page() {
  return <Remittances />;
}

export const dynamic = 'force-dynamic';
