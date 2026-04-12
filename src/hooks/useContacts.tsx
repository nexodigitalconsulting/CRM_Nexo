// Migrado de Supabase a Drizzle - v2
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchContacts,
  fetchContact as fetchContactById,
  createContact,
  updateContact,
  deleteContact,
  convertContactToClient,
  type ContactRow,
  type ContactInsert as ContactInsertApi,
  type ContactUpdate as ContactUpdateApi,
} from "@/lib/api/contacts";
import { useAuth } from "@/hooks/useAuth";

export type Contact = ContactRow;
export type ContactInsert = ContactInsertApi;
export type ContactUpdate = Partial<ContactInsertApi>;

export function useContacts() {
  return useQuery({
    queryKey: ["contacts"],
    queryFn: fetchContacts,
  });
}

export function useContact(id: string | undefined) {
  return useQuery({
    queryKey: ["contacts", id],
    queryFn: async () => {
      if (!id) return null;
      return fetchContactById(id).catch(() => null);
    },
    enabled: !!id,
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (contact: ContactInsert) => createContact(contact),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contacto creado correctamente");
    },
    onError: (error: Error) => {
      toast.error("Error al crear el contacto: " + error.message);
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...contact }: ContactUpdate & { id: string }) =>
      updateContact(id, contact),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contacto actualizado correctamente");
    },
    onError: (error: Error) => {
      toast.error("Error al actualizar el contacto: " + error.message);
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteContact(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contacto eliminado correctamente");
    },
    onError: (error: Error) => {
      toast.error("Error al eliminar el contacto: " + error.message);
    },
  });
}

export function useConvertToClient() {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async (contact: Contact) => {
      const userId = session?.user?.id ?? "";
      return convertContactToClient(
        contact.id,
        {
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
          source: contact.source,
          contact_id: contact.id,
        },
        userId
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Contacto convertido a cliente");
    },
    onError: (error: Error) => {
      toast.error("Error al convertir el contacto: " + error.message);
    },
  });
}
