import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import {
  usePdfTemplates,
  useCreatePdfTemplate,
  useUpdatePdfTemplate,
  useDeletePdfTemplate,
  useSetDefaultTemplate,
  PdfTemplate,
} from "@/hooks/usePdfTemplates";
import { 
  Loader2, FileText, Palette, Eye, Save, Layout, Type, Image, 
  CheckCircle, AlertCircle, PenTool, Plus, Trash2, Copy, Star,
  Building2, User, Calendar, DollarSign, Hash, Mail, Phone, MapPin,
  Table2, FileSignature, Settings2, Layers
} from "lucide-react";
import { toast } from "sonner";
import { PdfPreview } from "./PdfPreview";
import { PdfSectionEditor } from "./PdfSectionEditor";
import { embedPdfConfigInTemplate, extractPdfConfigFromTemplate } from "@/hooks/useDefaultTemplate";
import { PdfConfig, PdfSections, getDefaultSections } from "@/lib/pdf/pdfUtils";

type DocumentType = 'invoice' | 'quote' | 'contract';

const documentLabels: Record<DocumentType, string> = {
  invoice: 'Factura',
  quote: 'Presupuesto',
  contract: 'Contrato',
};

// Bloques HTML predefinidos
const HTML_BLOCKS = {
  common: [
    {
      id: 'company_header',
      label: 'Cabecera Empresa',
      icon: Building2,
      category: 'header',
      html: `<div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 30px;">
  <div>
    {{company_logo}}
    <h2 style="margin: 10px 0 0 0; color: #333;">{{company_name}}</h2>
  </div>
  <div style="text-align: right; font-size: 12px; color: #666;">
    <p style="margin: 4px 0;">{{company_address}}</p>
    <p style="margin: 4px 0;">CIF: {{company_cif}}</p>
    <p style="margin: 4px 0;">{{company_email}}</p>
  </div>
</div>`,
    },
    {
      id: 'client_box',
      label: 'Datos Cliente',
      icon: User,
      category: 'content',
      html: `<div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <h3 style="margin: 0 0 10px 0; font-size: 12px; color: #666; text-transform: uppercase;">Cliente</h3>
  <p style="margin: 4px 0; font-weight: bold;">{{client_name}}</p>
  <p style="margin: 4px 0; font-size: 13px;">{{client_address}}</p>
  <p style="margin: 4px 0; font-size: 13px;">CIF: {{client_cif}}</p>
</div>`,
    },
    {
      id: 'notes_section',
      label: 'Notas / Observaciones',
      icon: FileText,
      category: 'content',
      html: `<div style="margin: 30px 0; padding: 15px; background: #fffbeb; border-left: 4px solid #f59e0b;">
  <h4 style="margin: 0 0 8px 0; font-size: 13px; color: #92400e;">Observaciones</h4>
  <p style="margin: 0; font-size: 13px;">{{notes}}</p>
</div>`,
    },
    {
      id: 'footer',
      label: 'Pie de Página',
      icon: FileSignature,
      category: 'footer',
      html: `<div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 11px; color: #9ca3af;">
  <p>{{company_name}} · {{company_address}}</p>
  <p>IBAN: {{company_iban}}</p>
</div>`,
    },
  ],
  invoice: [
    {
      id: 'invoice_title',
      label: 'Título Factura',
      icon: FileText,
      category: 'header',
      html: `<div style="text-align: center; margin: 30px 0;">
  <h1 style="margin: 0; color: {{primary_color}}; font-size: 28px;">FACTURA</h1>
  <p style="margin: 8px 0 0 0; font-size: 16px; color: {{secondary_color}};">Nº {{invoice_number}}</p>
</div>`,
    },
    {
      id: 'invoice_dates',
      label: 'Fechas Factura',
      icon: Calendar,
      category: 'content',
      html: `<div style="display: flex; gap: 30px; margin: 20px 0;">
  <div><span style="font-size: 12px; color: {{secondary_color}};">Fecha emisión:</span> <strong>{{issue_date}}</strong></div>
  <div><span style="font-size: 12px; color: {{secondary_color}};">Vencimiento:</span> <strong>{{due_date}}</strong></div>
</div>`,
    },
    {
      id: 'services_table',
      label: 'Tabla de Servicios',
      icon: Table2,
      category: 'table',
      html: `<table style="width: 100%; border-collapse: collapse; margin: 25px 0;">
  <thead>
    <tr style="background: {{primary_color}}; color: white;">
      <th style="padding: 12px; text-align: left;">Descripción</th>
      <th style="padding: 12px; text-align: center; width: 60px;">Cant.</th>
      <th style="padding: 12px; text-align: right; width: 100px;">Precio</th>
      <th style="padding: 12px; text-align: right; width: 100px;">Total</th>
    </tr>
  </thead>
  <tbody>{{services_rows}}</tbody>
</table>`,
    },
    {
      id: 'invoice_totals',
      label: 'Totales Factura',
      icon: DollarSign,
      category: 'totals',
      html: `<div style="margin-left: auto; width: 250px;">
  <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
    <span style="color: {{secondary_color}};">Subtotal:</span><span>{{subtotal}}</span>
  </div>
  <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
    <span style="color: {{secondary_color}};">IVA ({{iva_percent}}%):</span><span>{{iva_amount}}</span>
  </div>
  <div style="display: flex; justify-content: space-between; padding: 12px 0; font-size: 18px; font-weight: bold; color: {{primary_color}};">
    <span>TOTAL:</span><span>{{total}}</span>
  </div>
</div>`,
    },
  ],
  quote: [
    {
      id: 'quote_title',
      label: 'Título Presupuesto',
      icon: FileText,
      category: 'header',
      html: `<div style="text-align: center; margin: 30px 0;">
  <h1 style="margin: 0; color: {{primary_color}}; font-size: 28px;">PRESUPUESTO</h1>
  <p style="margin: 8px 0 0 0; font-size: 16px; color: {{secondary_color}};">Nº {{quote_number}}</p>
</div>`,
    },
    {
      id: 'quote_dates',
      label: 'Fechas Presupuesto',
      icon: Calendar,
      category: 'content',
      html: `<div style="display: flex; gap: 30px; margin: 20px 0; padding: 15px; background: #f0fdf4; border-radius: 8px;">
  <div><span style="font-size: 12px; color: {{secondary_color}};">Fecha:</span> <strong>{{quote_date}}</strong></div>
  <div><span style="font-size: 12px; color: {{secondary_color}};">Válido hasta:</span> <strong>{{valid_until}}</strong></div>
</div>`,
    },
    {
      id: 'quote_services_table',
      label: 'Tabla de Servicios',
      icon: Table2,
      category: 'table',
      html: `<table style="width: 100%; border-collapse: collapse; margin: 25px 0;">
  <thead>
    <tr style="background: {{primary_color}}; color: white;">
      <th style="padding: 12px; text-align: left;">Servicio</th>
      <th style="padding: 12px; text-align: center; width: 60px;">Cant.</th>
      <th style="padding: 12px; text-align: right; width: 100px;">Precio</th>
      <th style="padding: 12px; text-align: right; width: 100px;">Total</th>
    </tr>
  </thead>
  <tbody>{{services_rows}}</tbody>
</table>`,
    },
    {
      id: 'quote_totals',
      label: 'Totales Presupuesto',
      icon: DollarSign,
      category: 'totals',
      html: `<div style="margin-left: auto; width: 250px;">
  <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
    <span style="color: {{secondary_color}};">Subtotal:</span><span>{{subtotal}}</span>
  </div>
  <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
    <span style="color: {{secondary_color}};">IVA:</span><span>{{iva_total}}</span>
  </div>
  <div style="display: flex; justify-content: space-between; padding: 12px 0; font-size: 18px; font-weight: bold; color: {{primary_color}};">
    <span>TOTAL:</span><span>{{total}}</span>
  </div>
</div>`,
    },
  ],
  contract: [
    {
      id: 'contract_title',
      label: 'Título Contrato',
      icon: FileText,
      category: 'header',
      html: `<div style="text-align: center; margin: 30px 0; padding: 20px; background: {{primary_color}}; color: white; border-radius: 8px;">
  <h1 style="margin: 0; font-size: 24px;">CONTRATO DE SERVICIOS</h1>
  <p style="margin: 8px 0 0 0; opacity: 0.9;">Nº {{contract_number}}</p>
</div>`,
    },
    {
      id: 'contract_parties',
      label: 'Partes Contratantes',
      icon: User,
      category: 'content',
      html: `<div style="margin: 30px 0;">
  <h2 style="font-size: 16px; border-bottom: 2px solid {{primary_color}}; padding-bottom: 8px;">PARTES</h2>
  <p><strong>PRESTADOR:</strong> {{company_name}}, CIF {{company_cif}}</p>
  <p><strong>CLIENTE:</strong> {{client_name}}, CIF {{client_cif}}</p>
</div>`,
    },
    {
      id: 'contract_duration',
      label: 'Duración',
      icon: Calendar,
      category: 'content',
      html: `<div style="margin: 30px 0;">
  <h2 style="font-size: 16px; border-bottom: 2px solid {{primary_color}}; padding-bottom: 8px;">DURACIÓN</h2>
  <p>Vigencia desde <strong>{{start_date}}</strong> hasta <strong>{{end_date}}</strong>.</p>
  <p>Facturación: <strong>{{billing_period}}</strong></p>
</div>`,
    },
    {
      id: 'contract_totals',
      label: 'Condiciones Económicas',
      icon: DollarSign,
      category: 'totals',
      html: `<div style="margin: 30px 0; padding: 20px; background: #f9fafb; border-radius: 8px;">
  <h2 style="font-size: 16px; margin: 0 0 15px 0;">CONDICIONES ECONÓMICAS</h2>
  <p><span style="color: {{secondary_color}};">Subtotal:</span> <strong>{{subtotal}}</strong></p>
  <p><span style="color: {{secondary_color}};">IVA:</span> <strong>{{iva_amount}}</strong></p>
  <p style="font-size: 18px; color: {{primary_color}};"><strong>TOTAL: {{total}}</strong></p>
</div>`,
    },
    {
      id: 'signatures',
      label: 'Firmas',
      icon: FileSignature,
      category: 'footer',
      html: `<div style="margin-top: 60px; display: flex; justify-content: space-around;">
  <div style="text-align: center;">
    <div style="width: 200px; border-bottom: 1px solid #000; height: 60px;"></div>
    <p style="margin-top: 8px;">El Prestador</p>
  </div>
  <div style="text-align: center;">
    <div style="width: 200px; border-bottom: 1px solid #000; height: 60px;"></div>
    <p style="margin-top: 8px;">El Cliente</p>
  </div>
</div>`,
    },
  ],
};

// Variables disponibles
const VARIABLES = {
  common: [
    { key: 'company_name', label: 'Nombre empresa', icon: Building2 },
    { key: 'company_cif', label: 'CIF empresa', icon: Hash },
    { key: 'company_address', label: 'Dirección empresa', icon: MapPin },
    { key: 'company_email', label: 'Email empresa', icon: Mail },
    { key: 'company_phone', label: 'Teléfono empresa', icon: Phone },
    { key: 'company_iban', label: 'IBAN empresa', icon: DollarSign },
    { key: 'company_logo', label: 'Logo empresa', icon: Image },
    { key: 'client_name', label: 'Nombre cliente', icon: User },
    { key: 'client_cif', label: 'CIF cliente', icon: Hash },
    { key: 'client_address', label: 'Dirección cliente', icon: MapPin },
    { key: 'client_email', label: 'Email cliente', icon: Mail },
    { key: 'primary_color', label: 'Color primario', icon: Palette },
    { key: 'secondary_color', label: 'Color secundario', icon: Palette },
  ],
  invoice: [
    { key: 'invoice_number', label: 'Nº Factura', icon: Hash },
    { key: 'issue_date', label: 'Fecha emisión', icon: Calendar },
    { key: 'due_date', label: 'Vencimiento', icon: Calendar },
    { key: 'subtotal', label: 'Subtotal', icon: DollarSign },
    { key: 'iva_percent', label: '% IVA', icon: DollarSign },
    { key: 'iva_amount', label: 'IVA', icon: DollarSign },
    { key: 'total', label: 'Total', icon: DollarSign },
    { key: 'notes', label: 'Notas', icon: FileText },
  ],
  contract: [
    { key: 'contract_number', label: 'Nº Contrato', icon: Hash },
    { key: 'start_date', label: 'Fecha inicio', icon: Calendar },
    { key: 'end_date', label: 'Fecha fin', icon: Calendar },
    { key: 'billing_period', label: 'Periodicidad', icon: Calendar },
    { key: 'subtotal', label: 'Subtotal', icon: DollarSign },
    { key: 'iva_amount', label: 'IVA', icon: DollarSign },
    { key: 'total', label: 'Total', icon: DollarSign },
  ],
  quote: [
    { key: 'quote_number', label: 'Nº Presupuesto', icon: Hash },
    { key: 'quote_date', label: 'Fecha', icon: Calendar },
    { key: 'valid_until', label: 'Válido hasta', icon: Calendar },
    { key: 'subtotal', label: 'Subtotal', icon: DollarSign },
    { key: 'iva_total', label: 'IVA', icon: DollarSign },
    { key: 'total', label: 'Total', icon: DollarSign },
    { key: 'notes', label: 'Notas', icon: FileText },
  ],
};

// Plantillas predeterminadas por tipo
const getDefaultTemplate = (type: DocumentType, primaryColor: string, secondaryColor: string): string => {
  const templates: Record<DocumentType, string> = {
    invoice: `<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1f2937;">
  <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 30px;">
    <div>{{company_logo}}<h2 style="margin: 10px 0 0 0; color: #333;">{{company_name}}</h2></div>
    <div style="text-align: right; font-size: 12px; color: ${secondaryColor};">
      <p style="margin: 4px 0;">{{company_address}}</p>
      <p style="margin: 4px 0;">CIF: {{company_cif}}</p>
      <p style="margin: 4px 0;">{{company_email}}</p>
    </div>
  </div>
  <div style="text-align: center; margin: 30px 0;">
    <h1 style="margin: 0; color: ${primaryColor}; font-size: 28px;">FACTURA</h1>
    <p style="margin: 8px 0 0 0; font-size: 16px; color: ${secondaryColor};">Nº {{invoice_number}}</p>
  </div>
  <div style="display: flex; gap: 30px; margin: 20px 0;">
    <div><span style="font-size: 12px; color: ${secondaryColor};">Fecha emisión:</span> <strong>{{issue_date}}</strong></div>
    <div><span style="font-size: 12px; color: ${secondaryColor};">Vencimiento:</span> <strong>{{due_date}}</strong></div>
  </div>
  <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3 style="margin: 0 0 10px 0; font-size: 12px; color: ${secondaryColor}; text-transform: uppercase;">Cliente</h3>
    <p style="margin: 4px 0; font-weight: bold;">{{client_name}}</p>
    <p style="margin: 4px 0; font-size: 13px;">{{client_address}}</p>
    <p style="margin: 4px 0; font-size: 13px;">CIF: {{client_cif}}</p>
  </div>
  <table style="width: 100%; border-collapse: collapse; margin: 25px 0;">
    <thead>
      <tr style="background: ${primaryColor}; color: white;">
        <th style="padding: 12px; text-align: left;">Descripción</th>
        <th style="padding: 12px; text-align: center; width: 60px;">Cant.</th>
        <th style="padding: 12px; text-align: right; width: 100px;">Precio</th>
        <th style="padding: 12px; text-align: right; width: 100px;">Total</th>
      </tr>
    </thead>
    <tbody>{{services_rows}}</tbody>
  </table>
  <div style="margin-left: auto; width: 250px;">
    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
      <span style="color: ${secondaryColor};">Subtotal:</span><span>{{subtotal}}</span>
    </div>
    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
      <span style="color: ${secondaryColor};">IVA ({{iva_percent}}%):</span><span>{{iva_amount}}</span>
    </div>
    <div style="display: flex; justify-content: space-between; padding: 12px 0; font-size: 18px; font-weight: bold; color: ${primaryColor};">
      <span>TOTAL:</span><span>{{total}}</span>
    </div>
  </div>
  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 11px; color: #9ca3af;">
    <p>{{company_name}} · {{company_address}}</p>
    <p>IBAN: {{company_iban}}</p>
  </div>
</div>`,
    quote: `<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1f2937;">
  <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 30px;">
    <div>{{company_logo}}<h2 style="margin: 10px 0 0 0; color: #333;">{{company_name}}</h2></div>
    <div style="text-align: right; font-size: 12px; color: ${secondaryColor};">
      <p style="margin: 4px 0;">{{company_address}}</p>
      <p style="margin: 4px 0;">CIF: {{company_cif}}</p>
    </div>
  </div>
  <div style="text-align: center; margin: 30px 0;">
    <h1 style="margin: 0; color: ${primaryColor}; font-size: 28px;">PRESUPUESTO</h1>
    <p style="margin: 8px 0 0 0; font-size: 16px; color: ${secondaryColor};">Nº {{quote_number}}</p>
  </div>
  <div style="display: flex; gap: 30px; margin: 20px 0; padding: 15px; background: #f0fdf4; border-radius: 8px;">
    <div><span style="font-size: 12px; color: ${secondaryColor};">Fecha:</span> <strong>{{quote_date}}</strong></div>
    <div><span style="font-size: 12px; color: ${secondaryColor};">Válido hasta:</span> <strong>{{valid_until}}</strong></div>
  </div>
  <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3 style="margin: 0 0 10px 0; font-size: 12px; color: ${secondaryColor}; text-transform: uppercase;">Cliente</h3>
    <p style="margin: 4px 0; font-weight: bold;">{{client_name}}</p>
    <p style="margin: 4px 0; font-size: 13px;">{{client_address}}</p>
    <p style="margin: 4px 0; font-size: 13px;">CIF: {{client_cif}}</p>
  </div>
  <table style="width: 100%; border-collapse: collapse; margin: 25px 0;">
    <thead>
      <tr style="background: ${primaryColor}; color: white;">
        <th style="padding: 12px; text-align: left;">Servicio</th>
        <th style="padding: 12px; text-align: center; width: 60px;">Cant.</th>
        <th style="padding: 12px; text-align: right; width: 100px;">Precio</th>
        <th style="padding: 12px; text-align: right; width: 100px;">Total</th>
      </tr>
    </thead>
    <tbody>{{services_rows}}</tbody>
  </table>
  <div style="margin-left: auto; width: 250px;">
    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
      <span style="color: ${secondaryColor};">Subtotal:</span><span>{{subtotal}}</span>
    </div>
    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
      <span style="color: ${secondaryColor};">IVA:</span><span>{{iva_total}}</span>
    </div>
    <div style="display: flex; justify-content: space-between; padding: 12px 0; font-size: 18px; font-weight: bold; color: ${primaryColor};">
      <span>TOTAL:</span><span>{{total}}</span>
    </div>
  </div>
</div>`,
    contract: `<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1f2937;">
  <div style="text-align: center; margin: 30px 0; padding: 20px; background: ${primaryColor}; color: white; border-radius: 8px;">
    <h1 style="margin: 0; font-size: 24px;">CONTRATO DE SERVICIOS</h1>
    <p style="margin: 8px 0 0 0; opacity: 0.9;">Nº {{contract_number}}</p>
  </div>
  <div style="margin: 30px 0;">
    <h2 style="font-size: 16px; border-bottom: 2px solid ${primaryColor}; padding-bottom: 8px;">PARTES CONTRATANTES</h2>
    <p><strong>PRESTADOR:</strong> {{company_name}}, con CIF {{company_cif}}, domiciliada en {{company_address}}.</p>
    <p><strong>CLIENTE:</strong> {{client_name}}, con CIF {{client_cif}}, domiciliada en {{client_address}}.</p>
  </div>
  <div style="margin: 30px 0;">
    <h2 style="font-size: 16px; border-bottom: 2px solid ${primaryColor}; padding-bottom: 8px;">DURACIÓN Y VIGENCIA</h2>
    <p>El presente contrato tendrá vigencia desde <strong>{{start_date}}</strong> hasta <strong>{{end_date}}</strong>.</p>
    <p>Periodicidad de facturación: <strong>{{billing_period}}</strong></p>
  </div>
  <div style="margin: 30px 0; padding: 20px; background: #f9fafb; border-radius: 8px;">
    <h2 style="font-size: 16px; margin: 0 0 15px 0;">CONDICIONES ECONÓMICAS</h2>
    <p><span style="color: ${secondaryColor};">Subtotal:</span> <strong>{{subtotal}}</strong></p>
    <p><span style="color: ${secondaryColor};">IVA:</span> <strong>{{iva_amount}}</strong></p>
    <p style="font-size: 18px; color: ${primaryColor};"><strong>TOTAL: {{total}}</strong></p>
  </div>
  <div style="margin-top: 60px; display: flex; justify-content: space-around;">
    <div style="text-align: center;">
      <div style="width: 200px; border-bottom: 1px solid #000; height: 60px;"></div>
      <p style="margin-top: 8px;">El Prestador</p>
      <p style="font-size: 12px; color: ${secondaryColor};">{{company_name}}</p>
    </div>
    <div style="text-align: center;">
      <div style="width: 200px; border-bottom: 1px solid #000; height: 60px;"></div>
      <p style="margin-top: 8px;">El Cliente</p>
      <p style="font-size: 12px; color: ${secondaryColor};">{{client_name}}</p>
    </div>
  </div>
</div>`,
  };
  return templates[type];
};

export function PdfSettingsManager() {
  const { data: companySettings } = useCompanySettings();
  const [selectedDocument, setSelectedDocument] = useState<DocumentType>('invoice');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState<string>('');
  const [editedName, setEditedName] = useState<string>('');
  const [primaryColor, setPrimaryColor] = useState('#3366cc');
  const [secondaryColor, setSecondaryColor] = useState('#666666');
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Extended design settings
  const [titleText, setTitleText] = useState('FACTURA');
  const [titleSize, setTitleSize] = useState(28);
  const [clientBoxColor, setClientBoxColor] = useState('#f1f5f9');
  const [tableHeaderColor, setTableHeaderColor] = useState('#3b82f6');
  const [showFooterLegal, setShowFooterLegal] = useState(false);
  const [footerLegalText, setFooterLegalText] = useState('');
  
  // Spacing settings
  const [lineSpacing, setLineSpacing] = useState(14);
  const [sectionSpacing, setSectionSpacing] = useState(28);
  const [rowHeight, setRowHeight] = useState(22);
  const [clientBoxPadding, setClientBoxPadding] = useState(14);
  const [docMargins, setDocMargins] = useState(50);

  // Lines
  const [showTableBorders, setShowTableBorders] = useState(true);
  const [tableBorderColor, setTableBorderColor] = useState('#e5e7eb');
  const [showTotalsLines, setShowTotalsLines] = useState(true);
  const [totalsLineColor, setTotalsLineColor] = useState('#e5e7eb');

  // Section-based configuration
  const [sections, setSections] = useState<PdfSections>(getDefaultSections());

  const { data: templates = [], isLoading } = usePdfTemplates(selectedDocument);
  const createTemplate = useCreatePdfTemplate();
  const updateTemplate = useUpdatePdfTemplate();
  const deleteTemplate = useDeletePdfTemplate();
  const setDefaultTemplate = useSetDefaultTemplate();

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  // Load extended config when template is selected
  const loadExtendedConfig = useCallback((content: string) => {
    const templateData = { content, id: '', name: '', entity_type: selectedDocument, variables: null, is_default: false, is_active: true, created_at: '', updated_at: '' };
    const config = extractPdfConfigFromTemplate(templateData as any);
    
    if (config.primary_color) setPrimaryColor(config.primary_color);
    if (config.secondary_color) setSecondaryColor(config.secondary_color);
    if (config.title_text) setTitleText(config.title_text);
    if (config.title_size) setTitleSize(config.title_size);
    if (config.client_box_color) setClientBoxColor(config.client_box_color);
    if (config.table_header_color) setTableHeaderColor(config.table_header_color);
    setShowFooterLegal(config.show_footer_legal ?? false);
    if (config.footer_legal_lines) setFooterLegalText(config.footer_legal_lines.join('\n'));
    
    // Load spacing settings
    if (config.line_spacing) setLineSpacing(config.line_spacing);
    if (config.section_spacing) setSectionSpacing(config.section_spacing);
    if (config.row_height) setRowHeight(config.row_height);
    if (config.client_box_padding) setClientBoxPadding(config.client_box_padding);
    if (config.margins) setDocMargins(config.margins);

    // Load table border settings
    setShowTableBorders(config.show_table_borders ?? true);
    if (config.table_border_color) setTableBorderColor(config.table_border_color);

    // Load totals separator settings
    setShowTotalsLines(config.show_totals_lines ?? true);
    if (config.totals_line_color) setTotalsLineColor(config.totals_line_color);

    // Load section-based configuration
    if (config.sections) {
      setSections({ ...getDefaultSections(), ...config.sections });
    } else {
      setSections(getDefaultSections());
    }
  }, [selectedDocument]);

  // Seleccionar plantilla predeterminada al cargar
  useEffect(() => {
    if (templates.length > 0 && !selectedTemplateId) {
      const defaultTemplate = templates.find(t => t.is_default) || templates[0];
      setSelectedTemplateId(defaultTemplate.id);
      setEditedContent(defaultTemplate.content);
      setEditedName(defaultTemplate.name);
      loadExtendedConfig(defaultTemplate.content);
    }
  }, [templates, selectedTemplateId, loadExtendedConfig]);

  // Resetear selección cuando cambia el tipo de documento
  useEffect(() => {
    setSelectedTemplateId(null);
    setHasUnsavedChanges(false);
    // Reset title based on document type
    const defaultTitles: Record<DocumentType, string> = {
      invoice: 'FACTURA',
      quote: 'PRESUPUESTO',
      contract: 'CONTRATO'
    };
    setTitleText(defaultTitles[selectedDocument]);
  }, [selectedDocument]);

  // Legacy function for backward compatibility
  const extractColorsFromContent = (content: string) => {
    loadExtendedConfig(content);
  };

  // Actualizar colores en el contenido
  const updateColorsInContent = useCallback((content: string, primary: string, secondary: string): string => {
    // Reemplazar colores primarios típicos
    let updated = content.replace(/#4f46e5/gi, primary);
    updated = updated.replace(/#3366cc/gi, primary);
    updated = updated.replace(/#059669/gi, primary);
    // Reemplazar colores secundarios
    updated = updated.replace(/#6b7280/gi, secondary);
    updated = updated.replace(/#666666/gi, secondary);
    return updated;
  }, []);

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplateId(templateId);
      setEditedContent(template.content);
      setEditedName(template.name);
      extractColorsFromContent(template.content);
      setHasUnsavedChanges(false);
    }
  };

  const handleContentChange = (content: string) => {
    setEditedContent(content);
    setHasUnsavedChanges(true);
  };

  const handleColorChange = (type: 'primary' | 'secondary', color: string) => {
    if (type === 'primary') {
      setPrimaryColor(color);
      const updated = updateColorsInContent(editedContent, color, secondaryColor);
      setEditedContent(updated);
    } else {
      setSecondaryColor(color);
      const updated = updateColorsInContent(editedContent, primaryColor, color);
      setEditedContent(updated);
    }
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    if (!selectedTemplateId) return;
    try {
      // Create PDF_CONFIG from current settings including extended parameters
      const pdfConfig: PdfConfig = {
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        accent_color: primaryColor,
        show_logo: true,
        logo_position: 'left',
        show_iban_footer: editedContent.includes('{{company_iban}}'),
        show_notes: editedContent.includes('{{notes}}'),
        show_discounts_column: editedContent.includes('{{discount'),
        header_style: 'classic',
        font_size_base: 10,
        // Extended parameters
        title_text: titleText,
        title_size: titleSize,
        client_box_color: clientBoxColor,
        table_header_color: tableHeaderColor,
        show_footer_legal: showFooterLegal,
        footer_legal_lines: footerLegalText.split('\n').filter(line => line.trim()),
        // Spacing parameters
        line_spacing: lineSpacing,
        section_spacing: sectionSpacing,
        row_height: rowHeight,
        client_box_padding: clientBoxPadding,
        margins: docMargins,
        // Table borders
        show_table_borders: showTableBorders,
        table_border_color: tableBorderColor,
        // Totals
        show_totals_lines: showTotalsLines,
        totals_line_color: totalsLineColor,
        // Section-based configuration
        sections: sections,
      };

      // Embed PDF_CONFIG comment in the content for reliable extraction
      const contentWithConfig = embedPdfConfigInTemplate(editedContent, pdfConfig);

      await updateTemplate.mutateAsync({
        id: selectedTemplateId,
        updates: {
          name: editedName,
          content: contentWithConfig,
        },
      });
      
      // Update local content with the embedded config
      setEditedContent(contentWithConfig);
      setHasUnsavedChanges(false);
      console.log('[PdfSettingsManager] Saved template with PDF_CONFIG:', pdfConfig);
      toast.success('Plantilla actualizada');
    } catch (error) {
      console.error('Error saving template:', error);
    }
  };

  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim()) {
      toast.error('Introduce un nombre para la plantilla');
      return;
    }
    try {
      const defaultContent = getDefaultTemplate(selectedDocument, primaryColor, secondaryColor);
      await createTemplate.mutateAsync({
        name: newTemplateName,
        entity_type: selectedDocument,
        content: defaultContent,
        is_default: templates.length === 0,
      });
      setNewTemplateName('');
      setShowNewDialog(false);
    } catch (error) {
      console.error('Error creating template:', error);
    }
  };

  const handleDuplicate = async () => {
    if (!selectedTemplate) return;
    try {
      await createTemplate.mutateAsync({
        name: `${selectedTemplate.name} (copia)`,
        entity_type: selectedDocument,
        content: editedContent,
        is_default: false,
      });
    } catch (error) {
      console.error('Error duplicating template:', error);
    }
  };

  const handleDelete = async () => {
    if (!selectedTemplateId) return;
    try {
      await deleteTemplate.mutateAsync(selectedTemplateId);
      setSelectedTemplateId(null);
      setShowDeleteDialog(false);
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const handleSetDefault = async () => {
    if (!selectedTemplateId) return;
    try {
      await setDefaultTemplate.mutateAsync({
        id: selectedTemplateId,
        entityType: selectedDocument,
      });
    } catch (error) {
      console.error('Error setting default:', error);
    }
  };

  const handleInsertBlock = (html: string) => {
    const colorizedHtml = html
      .replace(/\{\{primary_color\}\}/g, primaryColor)
      .replace(/\{\{secondary_color\}\}/g, secondaryColor);
    setEditedContent(prev => prev + '\n\n' + colorizedHtml);
    setHasUnsavedChanges(true);
    toast.success('Bloque insertado');
  };

  const handleInsertVariable = (variable: string) => {
    setEditedContent(prev => prev + `{{${variable}}}`);
    setHasUnsavedChanges(true);
  };

  const hasLogo = !!companySettings?.logo_url;
  const allBlocks = [...HTML_BLOCKS.common, ...(HTML_BLOCKS[selectedDocument] || [])];
  const allVariables = [...VARIABLES.common, ...(VARIABLES[selectedDocument] || [])];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Editor de Plantillas PDF
          </h3>
          <p className="text-sm text-muted-foreground">
            Personaliza las plantillas para facturas, presupuestos y contratos
          </p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={updateTemplate.isPending || !hasUnsavedChanges} 
          className="gap-2"
        >
          {updateTemplate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar cambios
        </Button>
      </div>

      {/* 1. Document Type Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Layout className="h-4 w-4" />
            Tipo de documento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {(Object.keys(documentLabels) as DocumentType[]).map((type) => (
              <Button
                key={type}
                variant={selectedDocument === type ? "default" : "outline"}
                onClick={() => setSelectedDocument(type)}
                className="flex-1"
              >
                {documentLabels[type]}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 2. Template Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileSignature className="h-4 w-4" />
            Plantilla
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={selectedTemplateId || ''} onValueChange={handleTemplateSelect}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Selecciona una plantilla" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    <div className="flex items-center gap-2">
                      {template.is_default && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                      {template.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={() => setShowNewDialog(true)}>
              <Plus className="h-4 w-4 mr-1" /> Nueva
            </Button>
            
            {selectedTemplate && (
              <>
                <Button variant="outline" size="sm" onClick={handleDuplicate}>
                  <Copy className="h-4 w-4 mr-1" /> Duplicar
                </Button>
                
                {!selectedTemplate.is_default && (
                  <Button variant="outline" size="sm" onClick={handleSetDefault}>
                    <Star className="h-4 w-4 mr-1" /> Predeterminada
                  </Button>
                )}
                
                {templates.length > 1 && (
                  <Button variant="outline" size="sm" onClick={() => setShowDeleteDialog(true)}>
                    <Trash2 className="h-4 w-4 mr-1" /> Eliminar
                  </Button>
                )}
              </>
            )}

            {selectedTemplate?.is_default && (
              <Badge variant="secondary" className="gap-1">
                <Star className="h-3 w-3 fill-current" /> Predeterminada
              </Badge>
            )}

            {hasUnsavedChanges && (
              <Badge variant="outline" className="text-amber-600 border-amber-300">
                Cambios sin guardar
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 3. Editor Tabs + Preview */}
      {selectedTemplate && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Editor Panel */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="sections" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="sections" className="gap-1">
                  <Layers className="h-4 w-4" />
                  <span className="hidden sm:inline">Secciones</span>
                </TabsTrigger>
                <TabsTrigger value="colors" className="gap-1">
                  <Palette className="h-4 w-4" />
                  <span className="hidden sm:inline">Colores</span>
                </TabsTrigger>
                <TabsTrigger value="design" className="gap-1">
                  <Settings2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Diseño</span>
                </TabsTrigger>
                <TabsTrigger value="content" className="gap-1">
                  <Layout className="h-4 w-4" />
                  <span className="hidden sm:inline">Variables</span>
                </TabsTrigger>
                <TabsTrigger value="blocks" className="gap-1">
                  <Table2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Bloques</span>
                </TabsTrigger>
              </TabsList>

              {/* Secciones - Nueva pestaña */}
              <TabsContent value="sections" className="mt-4">
                <PdfSectionEditor 
                  sections={sections} 
                  onChange={(newSections) => {
                    setSections(newSections);
                    setHasUnsavedChanges(true);
                  }} 
                />
              </TabsContent>

              {/* Colores */}
              <TabsContent value="colors" className="mt-4">
                <Card>
                  <CardContent className="pt-6 space-y-6">
                    <div className="space-y-2">
                      <Label>Nombre de la plantilla</Label>
                      <Input
                        value={editedName}
                        onChange={(e) => {
                          setEditedName(e.target.value);
                          setHasUnsavedChanges(true);
                        }}
                        placeholder="Nombre de la plantilla"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>Color primario</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={primaryColor}
                            onChange={(e) => handleColorChange('primary', e.target.value)}
                            className="w-12 h-10 p-1 cursor-pointer"
                          />
                          <Input
                            value={primaryColor}
                            onChange={(e) => handleColorChange('primary', e.target.value)}
                            className="flex-1 font-mono text-sm"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">Títulos, cabeceras y totales</p>
                      </div>

                      <div className="space-y-2">
                        <Label>Color secundario</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={secondaryColor}
                            onChange={(e) => handleColorChange('secondary', e.target.value)}
                            className="w-12 h-10 p-1 cursor-pointer"
                          />
                          <Input
                            value={secondaryColor}
                            onChange={(e) => handleColorChange('secondary', e.target.value)}
                            className="flex-1 font-mono text-sm"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">Texto secundario y etiquetas</p>
                      </div>
                    </div>

                    <div className="border rounded-lg p-4 bg-muted/30">
                      <p className="text-sm font-medium mb-3">Vista previa de colores</p>
                      <div className="flex gap-6">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded border" style={{ backgroundColor: primaryColor }} />
                          <span className="text-sm" style={{ color: primaryColor }}>Título Principal</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded border" style={{ backgroundColor: secondaryColor }} />
                          <span className="text-sm" style={{ color: secondaryColor }}>Texto secundario</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Diseño Avanzado */}
              <TabsContent value="design" className="mt-4">
                <Card>
                  <CardContent className="pt-6 space-y-6">
                    {/* Título */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-sm flex items-center gap-2">
                        <Type className="h-4 w-4" />
                        Título del documento
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Texto del título</Label>
                          <Input
                            value={titleText}
                            onChange={(e) => {
                              setTitleText(e.target.value);
                              setHasUnsavedChanges(true);
                            }}
                            placeholder="FACTURA"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Tamaño (px): {titleSize}</Label>
                          <Input
                            type="range"
                            min="20"
                            max="40"
                            value={titleSize}
                            onChange={(e) => {
                              setTitleSize(Number(e.target.value));
                              setHasUnsavedChanges(true);
                            }}
                            className="w-full"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Colores de elementos */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-sm flex items-center gap-2">
                        <Palette className="h-4 w-4" />
                        Colores de elementos
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Fondo caja cliente</Label>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              value={clientBoxColor}
                              onChange={(e) => {
                                setClientBoxColor(e.target.value);
                                setHasUnsavedChanges(true);
                              }}
                              className="w-12 h-10 p-1 cursor-pointer"
                            />
                            <Input
                              value={clientBoxColor}
                              onChange={(e) => {
                                setClientBoxColor(e.target.value);
                                setHasUnsavedChanges(true);
                              }}
                              className="flex-1 font-mono text-sm"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Cabecera de tabla</Label>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              value={tableHeaderColor}
                              onChange={(e) => {
                                setTableHeaderColor(e.target.value);
                                setHasUnsavedChanges(true);
                              }}
                              className="w-12 h-10 p-1 cursor-pointer"
                            />
                            <Input
                              value={tableHeaderColor}
                              onChange={(e) => {
                                setTableHeaderColor(e.target.value);
                                setHasUnsavedChanges(true);
                              }}
                              className="flex-1 font-mono text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer Legal */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm flex items-center gap-2">
                          <FileSignature className="h-4 w-4" />
                          Pie legal
                        </h4>
                        <Switch
                          checked={showFooterLegal}
                          onCheckedChange={(checked) => {
                            setShowFooterLegal(checked);
                            setHasUnsavedChanges(true);
                          }}
                        />
                      </div>
                      {showFooterLegal && (
                        <div className="space-y-2">
                          <Label>Texto legal (una línea por fila)</Label>
                          <Textarea
                            value={footerLegalText}
                            onChange={(e) => {
                              setFooterLegalText(e.target.value);
                              setHasUnsavedChanges(true);
                            }}
                            placeholder="Esta factura ha sido emitida conforme a la legislación vigente.&#10;Los datos fiscales son confidenciales.&#10;Para consultas contacte con info@empresa.com"
                            rows={4}
                            className="text-sm"
                          />
                          <p className="text-xs text-muted-foreground">
                            Cada línea aparecerá centrada en el pie del PDF
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Espaciado */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-sm flex items-center gap-2">
                        <Layout className="h-4 w-4" />
                        Espaciado
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Espaciado entre líneas: {lineSpacing}px</Label>
                          <Input
                            type="range"
                            min="10"
                            max="22"
                            value={lineSpacing}
                            onChange={(e) => {
                              setLineSpacing(Number(e.target.value));
                              setHasUnsavedChanges(true);
                            }}
                            className="w-full"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Espacio entre secciones: {sectionSpacing}px</Label>
                          <Input
                            type="range"
                            min="16"
                            max="50"
                            value={sectionSpacing}
                            onChange={(e) => {
                              setSectionSpacing(Number(e.target.value));
                              setHasUnsavedChanges(true);
                            }}
                            className="w-full"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Altura de filas tabla: {rowHeight}px</Label>
                          <Input
                            type="range"
                            min="18"
                            max="36"
                            value={rowHeight}
                            onChange={(e) => {
                              setRowHeight(Number(e.target.value));
                              setHasUnsavedChanges(true);
                            }}
                            className="w-full"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Padding caja cliente: {clientBoxPadding}px</Label>
                          <Input
                            type="range"
                            min="8"
                            max="28"
                            value={clientBoxPadding}
                            onChange={(e) => {
                              setClientBoxPadding(Number(e.target.value));
                              setHasUnsavedChanges(true);
                            }}
                            className="w-full"
                          />
                        </div>
                        <div className="space-y-2 col-span-2">
                          <Label>Márgenes del documento: {docMargins}px</Label>
                          <Input
                            type="range"
                            min="30"
                            max="80"
                            value={docMargins}
                            onChange={(e) => {
                              setDocMargins(Number(e.target.value));
                              setHasUnsavedChanges(true);
                            }}
                            className="w-full"
                          />
                        </div>
                      </div>
                      
                      {/* Bordes de tabla */}
                      <div className="mt-4 pt-4 border-t space-y-3">
                        <div className="flex items-center justify-between">
                          <Label>Mostrar líneas divisorias en tabla</Label>
                          <Switch
                            checked={showTableBorders}
                            onCheckedChange={(checked) => {
                              setShowTableBorders(checked);
                              setHasUnsavedChanges(true);
                            }}
                          />
                        </div>
                        {showTableBorders && (
                          <div className="flex items-center gap-3">
                            <Label className="w-32">Color de líneas:</Label>
                            <Input
                              type="color"
                              value={tableBorderColor}
                              onChange={(e) => {
                                setTableBorderColor(e.target.value);
                                setHasUnsavedChanges(true);
                              }}
                              className="w-12 h-8 p-0"
                            />
                            <span className="text-xs text-muted-foreground">{tableBorderColor}</span>
                          </div>
                        )}
                      </div>

                      {/* Líneas en Totales */}
                      <div className="mt-4 pt-4 border-t space-y-3">
                        <div className="flex items-center justify-between">
                          <Label>Mostrar líneas separadoras en Totales</Label>
                          <Switch
                            checked={showTotalsLines}
                            onCheckedChange={(checked) => {
                              setShowTotalsLines(checked);
                              setHasUnsavedChanges(true);
                            }}
                          />
                        </div>
                        {showTotalsLines && (
                          <div className="flex items-center gap-3">
                            <Label className="w-32">Color de líneas:</Label>
                            <Input
                              type="color"
                              value={totalsLineColor}
                              onChange={(e) => {
                                setTotalsLineColor(e.target.value);
                                setHasUnsavedChanges(true);
                              }}
                              className="w-12 h-8 p-0"
                            />
                            <span className="text-xs text-muted-foreground">{totalsLineColor}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Vista previa */}
                    <div className="border rounded-lg p-4 bg-muted/30">
                      <p className="text-sm font-medium mb-3">Vista previa de configuración</p>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Título:</span>
                          <span className="font-medium">{titleText} ({titleSize}px)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Espaciado líneas:</span>
                          <span>{lineSpacing}px</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Caja cliente:</span>
                          <div className="w-12 h-4 rounded" style={{ backgroundColor: clientBoxColor }} />
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Espacio secciones:</span>
                          <span>{sectionSpacing}px</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Cabecera tabla:</span>
                          <div className="w-12 h-4 rounded" style={{ backgroundColor: tableHeaderColor }} />
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Altura filas:</span>
                          <span>{rowHeight}px</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Pie legal:</span>
                          <span>{showFooterLegal ? 'Sí' : 'No'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Márgenes:</span>
                          <span>{docMargins}px</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Bordes tabla:</span>
                          <span>{showTableBorders ? 'Sí' : 'No'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Líneas totales:</span>
                          <span>{showTotalsLines ? 'Sí' : 'No'}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Contenido / Variables */}
              <TabsContent value="content" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground mb-4">
                      Variables disponibles para usar en las plantillas PDF
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {allVariables.map((variable) => (
                        <Button
                          key={variable.key}
                          variant="outline"
                          size="sm"
                          className="justify-start text-xs"
                          onClick={() => handleInsertVariable(variable.key)}
                        >
                          <variable.icon className="h-3 w-3 mr-2" />
                          {variable.label}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Bloques */}
              <TabsContent value="blocks" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-muted-foreground mb-4">
                      Haz clic en un bloque para añadirlo al final de la plantilla
                    </p>
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-4">
                        {['header', 'content', 'table', 'totals', 'footer'].map(category => {
                          const categoryBlocks = allBlocks.filter(b => b.category === category);
                          if (categoryBlocks.length === 0) return null;
                          return (
                            <div key={category}>
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                                {category === 'header' ? 'Cabecera' :
                                 category === 'content' ? 'Contenido' :
                                 category === 'table' ? 'Tablas' :
                                 category === 'totals' ? 'Totales' : 'Pie de página'}
                              </h4>
                              <div className="grid grid-cols-2 gap-2">
                                {categoryBlocks.map(block => (
                                  <Button
                                    key={block.id}
                                    variant="outline"
                                    size="sm"
                                    className="justify-start"
                                    onClick={() => handleInsertBlock(block.html)}
                                  >
                                    <block.icon className="h-4 w-4 mr-2" />
                                    {block.label}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

            </Tabs>
          </div>

          {/* Preview Panel */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Vista previa
                  </span>
                  <Badge variant="secondary">{documentLabels[selectedDocument]}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PdfPreview
                  content={editedContent}
                  documentType={selectedDocument}
                />
                <p className="text-xs text-muted-foreground text-center mt-3">
                  Vista previa simplificada
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!selectedTemplate && templates.length === 0 && (
        <Card className="p-8 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">No hay plantillas</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Crea tu primera plantilla para {documentLabels[selectedDocument].toLowerCase()}
          </p>
          <Button onClick={() => setShowNewDialog(true)}>
            <Plus className="h-4 w-4 mr-2" /> Crear plantilla
          </Button>
        </Card>
      )}

      {/* New Template Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva plantilla</DialogTitle>
            <DialogDescription>
              Crea una nueva plantilla para {documentLabels[selectedDocument].toLowerCase()}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Nombre de la plantilla</Label>
            <Input
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              placeholder="Ej: Plantilla moderna"
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateTemplate} disabled={createTemplate.isPending}>
              {createTemplate.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar plantilla?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La plantilla "{selectedTemplate?.name}" será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
