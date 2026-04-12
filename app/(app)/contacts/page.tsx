import Contacts from "@/views/Contacts";

export const metadata = { title: "Contactos — CRM Nexo" };

export default function Page() {
  return <Contacts />;
}

export const dynamic = 'force-dynamic';
