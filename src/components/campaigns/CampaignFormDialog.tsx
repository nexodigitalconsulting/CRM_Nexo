"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateCampaign, useUpdateCampaign, type Campaign } from "@/hooks/useCampaigns";
import { useEffect } from "react";
import { Separator } from "@/components/ui/separator";

const formSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  place_id: z.string().optional(),
  business_name: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  category: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().url("URL inválida").optional().or(z.literal("")),
  address: z.string().optional(),
  province: z.string().optional(),
  city: z.string().optional(),
  postal_code: z.string().optional(),
  capture_date: z.string().optional(),
  status: z.string().optional(),
  sent_at: z.string().optional(),
  response_at: z.string().optional(),
  response_channel: z.string().optional(),
  last_contact_at: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CampaignFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign?: Campaign | null;
}

export function CampaignFormDialog({ open, onOpenChange, campaign }: CampaignFormDialogProps) {
  const createCampaign = useCreateCampaign();
  const updateCampaign = useUpdateCampaign();
  const isEditing = !!campaign;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      place_id: "",
      business_name: "",
      email: "",
      category: "",
      phone: "",
      website: "",
      address: "",
      province: "",
      city: "",
      postal_code: "",
      capture_date: new Date().toISOString().split("T")[0],
      status: "pendiente",
      sent_at: "",
      response_at: "",
      response_channel: "",
      last_contact_at: "",
    },
  });

  useEffect(() => {
    if (campaign) {
      form.reset({
        name: campaign.name || "",
        place_id: campaign.place_id || "",
        business_name: campaign.business_name || "",
        email: campaign.email || "",
        category: campaign.category || "",
        phone: campaign.phone || "",
        website: campaign.website || "",
        address: campaign.address || "",
        province: campaign.province || "",
        city: campaign.city || "",
        postal_code: campaign.postal_code || "",
        capture_date: campaign.capture_date || new Date().toISOString().split("T")[0],
        status: campaign.status || "pendiente",
        sent_at: campaign.sent_at ? campaign.sent_at.slice(0, 16) : "",
        response_at: campaign.response_at ? campaign.response_at.slice(0, 16) : "",
        response_channel: campaign.response_channel || "",
        last_contact_at: campaign.last_contact_at ? campaign.last_contact_at.slice(0, 16) : "",
      });
    } else {
      form.reset({
        name: "",
        place_id: "",
        business_name: "",
        email: "",
        category: "",
        phone: "",
        website: "",
        address: "",
        province: "",
        city: "",
        postal_code: "",
        capture_date: new Date().toISOString().split("T")[0],
        status: "pendiente",
        sent_at: "",
        response_at: "",
        response_channel: "",
        last_contact_at: "",
      });
    }
  }, [campaign, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      type CampaignStatus = "pendiente" | "enviado" | "respondido" | "descartado" | "cliente";
      
      const payload = {
        name: values.name,
        place_id: values.place_id || null,
        business_name: values.business_name || null,
        email: values.email || null,
        category: values.category || null,
        phone: values.phone || null,
        website: values.website || null,
        address: values.address || null,
        province: values.province || null,
        city: values.city || null,
        postal_code: values.postal_code || null,
        capture_date: values.capture_date || null,
        status: (values.status || "pendiente") as CampaignStatus,
        sent_at: values.sent_at ? new Date(values.sent_at).toISOString() : null,
        response_at: values.response_at ? new Date(values.response_at).toISOString() : null,
        response_channel: values.response_channel || null,
        last_contact_at: values.last_contact_at ? new Date(values.last_contact_at).toISOString() : null,
      };

      if (isEditing && campaign) {
        await updateCampaign.mutateAsync({
          id: campaign.id,
          ...payload,
        });
      } else {
        await createCampaign.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving campaign:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Campaña" : "Nueva Campaña"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre de la campaña" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="place_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID Place</FormLabel>
                    <FormControl>
                      <Input placeholder="ID del lugar (Google)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="business_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del Negocio</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Nombre completo del negocio" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@ejemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl>
                      <Input placeholder="+34 600 000 000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoría</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Categoría del negocio" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Web del Negocio</FormLabel>
                  <FormControl>
                    <Input type="url" placeholder="https://www.ejemplo.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Dirección completa" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ciudad</FormLabel>
                    <FormControl>
                      <Input placeholder="Ciudad" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="province"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provincia</FormLabel>
                    <FormControl>
                      <Input placeholder="Provincia" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="postal_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código Postal</FormLabel>
                    <FormControl>
                      <Input placeholder="28001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator className="my-4" />
            <p className="text-sm font-medium text-muted-foreground">Seguimiento y Estado</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="capture_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Captura</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pendiente">Pendiente</SelectItem>
                        <SelectItem value="enviado">Enviado</SelectItem>
                        <SelectItem value="respondido">Respondido</SelectItem>
                        <SelectItem value="descartado">Descartado</SelectItem>
                        <SelectItem value="cliente">Cliente</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sent_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha/Hora de Envío</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="response_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha/Hora de Respuesta</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="response_channel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Canal de Respuesta</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar canal" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Sin especificar</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="phone">Teléfono</SelectItem>
                        <SelectItem value="web">Web</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="last_contact_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Último Contacto</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createCampaign.isPending || updateCampaign.isPending}>
                {isEditing ? "Guardar Cambios" : "Crear Campaña"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
