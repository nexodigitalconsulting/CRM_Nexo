"use client";

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useUpdateCampaign } from "@/hooks/useCampaigns";
import type { Campaign } from "@/hooks/useCampaigns";

interface Props {
  campaign: Campaign;
  open: boolean;
  onClose: () => void;
}

const CHANNELS = ["email", "phone", "web", "whatsapp"] as const;
const CHANNEL_LABELS: Record<string, string> = {
  email: "Email",
  phone: "Teléfono",
  web: "Web",
  whatsapp: "WhatsApp",
};

const STATUSES = ["respondido", "cliente", "descartado"] as const;
const STATUS_LABELS: Record<string, string> = {
  respondido: "Respondido",
  cliente: "Convertido a cliente",
  descartado: "Descartado",
};

export function RecordResponseDialog({ campaign, open, onClose }: Props) {
  const updateCampaign = useUpdateCampaign();
  const [channel, setChannel] = useState<string>(campaign.response_channel ?? "email");
  const [notes, setNotes] = useState(campaign.response_notes ?? "");
  const [status, setStatus] = useState<string>(
    ["respondido", "cliente", "descartado"].includes(campaign.status) ? campaign.status : "respondido"
  );

  const handleSave = async () => {
    await updateCampaign.mutateAsync({
      id: campaign.id,
      response_at: campaign.response_at ?? new Date().toISOString(),
      response_channel: channel,
      response_notes: notes,
      last_contact_at: new Date().toISOString(),
      status,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar respuesta</DialogTitle>
          <p className="text-sm text-muted-foreground">{campaign.name} — {campaign.business_name}</p>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Canal de respuesta</Label>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHANNELS.map((c) => (
                  <SelectItem key={c} value={c}>{CHANNEL_LABELS[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Resultado</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Notas</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas sobre la respuesta..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={updateCampaign.isPending}>
            {updateCampaign.isPending ? "Guardando..." : "Guardar respuesta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
