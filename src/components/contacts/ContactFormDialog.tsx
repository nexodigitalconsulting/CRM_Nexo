import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateContact, useUpdateContact, Contact, ContactInsert } from "@/hooks/useContacts";
import { Loader2 } from "lucide-react";

interface ContactFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: Contact | null;
}

const initialFormState: ContactInsert = {
  name: "",
  email: "",
  phone: "",
  source: "web",
  status: "new",
  notes: "",
  meeting_date: null,
  presentation_url: "",
  quote_url: "",
};

export function ContactFormDialog({ open, onOpenChange, contact }: ContactFormDialogProps) {
  const [formData, setFormData] = useState<ContactInsert>(initialFormState);
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  
  const isEditing = !!contact;
  const isLoading = createContact.isPending || updateContact.isPending;

  useEffect(() => {
    if (contact) {
      setFormData({
        name: contact.name,
        email: contact.email || "",
        phone: contact.phone || "",
        source: contact.source || "web",
        status: contact.status || "new",
        notes: contact.notes || "",
        meeting_date: contact.meeting_date,
        presentation_url: contact.presentation_url || "",
        quote_url: contact.quote_url || "",
      });
    } else {
      setFormData(initialFormState);
    }
  }, [contact, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isEditing && contact) {
        await updateContact.mutateAsync({ id: contact.id, ...formData });
      } else {
        await createContact.mutateAsync(formData);
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleChange = (field: keyof ContactInsert, value: string | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Contacto" : "Nuevo Contacto"}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ""}
                onChange={(e) => handleChange("email", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={formData.phone || ""}
                onChange={(e) => handleChange("phone", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Origen</Label>
              <Select
                value={formData.source || "web"}
                onValueChange={(value) => handleChange("source", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="web">Web</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="referido">Referido</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="telefono">Teléfono</SelectItem>
                  <SelectItem value="evento">Evento</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                value={formData.status || "new"}
                onValueChange={(value) => handleChange("status", value as ContactInsert["status"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Nuevo</SelectItem>
                  <SelectItem value="contacted">Contactado</SelectItem>
                  <SelectItem value="follow_up">Seguimiento</SelectItem>
                  <SelectItem value="discarded">Descartado</SelectItem>
                  <SelectItem value="converted">Convertido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="meeting_date">Fecha de Reunión</Label>
            <Input
              id="meeting_date"
              type="datetime-local"
              value={formData.meeting_date?.slice(0, 16) || ""}
              onChange={(e) => handleChange("meeting_date", e.target.value ? new Date(e.target.value).toISOString() : null)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="presentation_url">URL Presentación</Label>
              <Input
                id="presentation_url"
                type="url"
                value={formData.presentation_url || ""}
                onChange={(e) => handleChange("presentation_url", e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quote_url">URL Presupuesto</Label>
              <Input
                id="quote_url"
                type="url"
                value={formData.quote_url || ""}
                onChange={(e) => handleChange("quote_url", e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={formData.notes || ""}
              onChange={(e) => handleChange("notes", e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Guardar Cambios" : "Crear Contacto"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
