import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  FileText, Save, Plus, Trash2, Copy, Eye, EyeOff, Star,
  Code, Palette, Layout, Type, Table2, Image, Building2,
  User, Calendar, DollarSign, Hash, Mail, Phone, MapPin,
  FileSignature, Sparkles, Download, Upload, Check
} from 'lucide-react';
import { toast } from 'sonner';
import { PdfPreview } from './PdfPreview';
import {
  usePdfTemplates,
  useCreatePdfTemplate,
  useUpdatePdfTemplate,
  useDeletePdfTemplate,
  useSetDefaultTemplate,
  PdfTemplate,
} from '@/hooks/usePdfTemplates';

interface PdfTemplateEditorProps {
  documentType: 'invoice' | 'contract' | 'quote';
}

const DOCUMENT_LABELS = {
  invoice: 'Factura',
  contract: 'Contrato',
  quote: 'Presupuesto',
};

// Bloques HTML predefinidos para cada tipo de documento
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
    <p style="margin: 4px 0;">{{company_phone}}</p>
  </div>
</div>`,
    },
    {
      id: 'client_box',
      label: 'Datos Cliente',
      icon: User,
      category: 'content',
      html: `<div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <h3 style="margin: 0 0 10px 0; font-size: 12px; color: #666; text-transform: uppercase;">Datos del Cliente</h3>
  <p style="margin: 4px 0; font-weight: bold;">{{client_name}}</p>
  <p style="margin: 4px 0; font-size: 13px;">{{client_address}}</p>
  <p style="margin: 4px 0; font-size: 13px;">CIF: {{client_cif}}</p>
  <p style="margin: 4px 0; font-size: 13px;">{{client_email}}</p>
</div>`,
    },
    {
      id: 'separator',
      label: 'Línea Separadora',
      icon: Type,
      category: 'layout',
      html: `<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />`,
    },
    {
      id: 'notes_section',
      label: 'Notas / Observaciones',
      icon: FileText,
      category: 'content',
      html: `<div style="margin: 30px 0; padding: 15px; background: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 0 8px 8px 0;">
  <h4 style="margin: 0 0 8px 0; font-size: 13px; color: #92400e;">Observaciones</h4>
  <p style="margin: 0; font-size: 13px; color: #78350f;">{{notes}}</p>
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
  <p>Documento generado el {{current_date}}</p>
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
  <h1 style="margin: 0; color: #4f46e5; font-size: 28px;">FACTURA</h1>
  <p style="margin: 8px 0 0 0; font-size: 16px; color: #6b7280;">Nº {{invoice_number}}</p>
</div>`,
    },
    {
      id: 'invoice_dates',
      label: 'Fechas Factura',
      icon: Calendar,
      category: 'content',
      html: `<div style="display: flex; gap: 30px; margin: 20px 0;">
  <div>
    <span style="font-size: 12px; color: #6b7280;">Fecha emisión:</span>
    <strong style="margin-left: 8px;">{{issue_date}}</strong>
  </div>
  <div>
    <span style="font-size: 12px; color: #6b7280;">Vencimiento:</span>
    <strong style="margin-left: 8px;">{{due_date}}</strong>
  </div>
</div>`,
    },
    {
      id: 'services_table',
      label: 'Tabla de Servicios',
      icon: Table2,
      category: 'table',
      html: `<table style="width: 100%; border-collapse: collapse; margin: 25px 0;">
  <thead>
    <tr style="background: #4f46e5; color: white;">
      <th style="padding: 12px; text-align: left; font-size: 12px;">Descripción</th>
      <th style="padding: 12px; text-align: center; font-size: 12px; width: 60px;">Cant.</th>
      <th style="padding: 12px; text-align: right; font-size: 12px; width: 100px;">Precio</th>
      <th style="padding: 12px; text-align: right; font-size: 12px; width: 100px;">Total</th>
    </tr>
  </thead>
  <tbody>
    {{#services}}
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 12px; font-size: 13px;">{{name}}</td>
      <td style="padding: 12px; text-align: center; font-size: 13px;">{{quantity}}</td>
      <td style="padding: 12px; text-align: right; font-size: 13px;">{{unit_price}}</td>
      <td style="padding: 12px; text-align: right; font-size: 13px; font-weight: 500;">{{total}}</td>
    </tr>
    {{/services}}
  </tbody>
</table>`,
    },
    {
      id: 'invoice_totals',
      label: 'Totales Factura',
      icon: DollarSign,
      category: 'totals',
      html: `<div style="margin-left: auto; width: 250px; margin-top: 20px;">
  <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
    <span style="color: #6b7280;">Subtotal:</span>
    <span>{{subtotal}}</span>
  </div>
  <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
    <span style="color: #6b7280;">IVA ({{iva_percent}}%):</span>
    <span>{{iva_amount}}</span>
  </div>
  <div style="display: flex; justify-content: space-between; padding: 12px 0; font-size: 18px; font-weight: bold; color: #4f46e5;">
    <span>TOTAL:</span>
    <span>{{total}}</span>
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
      html: `<div style="text-align: center; margin: 30px 0; padding: 20px; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; border-radius: 8px;">
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
  <h2 style="font-size: 16px; color: #374151; border-bottom: 2px solid #4f46e5; padding-bottom: 8px;">PARTES CONTRATANTES</h2>
  <div style="margin-top: 15px;">
    <p><strong>PRESTADOR:</strong> {{company_name}}, con CIF {{company_cif}}, domiciliada en {{company_address}}.</p>
    <p style="margin-top: 10px;"><strong>CLIENTE:</strong> {{client_name}}, con CIF {{client_cif}}, domiciliada en {{client_address}}.</p>
  </div>
</div>`,
    },
    {
      id: 'contract_services',
      label: 'Servicios del Contrato',
      icon: Table2,
      category: 'content',
      html: `<div style="margin: 30px 0;">
  <h2 style="font-size: 16px; color: #374151; border-bottom: 2px solid #4f46e5; padding-bottom: 8px;">SERVICIOS CONTRATADOS</h2>
  <p style="margin-top: 15px;"><strong>{{contract_name}}</strong></p>
  {{#services}}
  <p style="margin: 8px 0; padding-left: 15px;">• {{service_name}}: {{service_price}}€</p>
  {{/services}}
</div>`,
    },
    {
      id: 'contract_duration',
      label: 'Duración',
      icon: Calendar,
      category: 'content',
      html: `<div style="margin: 30px 0;">
  <h2 style="font-size: 16px; color: #374151; border-bottom: 2px solid #4f46e5; padding-bottom: 8px;">DURACIÓN Y VIGENCIA</h2>
  <p style="margin-top: 15px;">El presente contrato tendrá vigencia desde <strong>{{start_date}}</strong> hasta <strong>{{end_date}}</strong>.</p>
  <p>Periodicidad de facturación: <strong>{{billing_period}}</strong></p>
</div>`,
    },
    {
      id: 'contract_totals',
      label: 'Condiciones Económicas',
      icon: DollarSign,
      category: 'totals',
      html: `<div style="margin: 30px 0; padding: 20px; background: #f9fafb; border-radius: 8px;">
  <h2 style="font-size: 16px; color: #374151; margin: 0 0 15px 0;">CONDICIONES ECONÓMICAS</h2>
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
    <div><span style="color: #6b7280;">Subtotal:</span> <strong>{{subtotal}}</strong></div>
    <div><span style="color: #6b7280;">IVA ({{iva_percent}}%):</span> <strong>{{iva_amount}}</strong></div>
    <div style="grid-column: span 2; font-size: 18px; color: #4f46e5; margin-top: 10px;">
      <strong>TOTAL: {{total}}</strong>
    </div>
  </div>
</div>`,
    },
    {
      id: 'signatures',
      label: 'Área de Firmas',
      icon: FileSignature,
      category: 'footer',
      html: `<div style="margin-top: 60px; display: flex; justify-content: space-around;">
  <div style="text-align: center;">
    <div style="width: 200px; border-bottom: 1px solid #000; height: 60px;"></div>
    <p style="margin-top: 8px; font-size: 13px;">El Prestador</p>
    <p style="font-size: 12px; color: #6b7280;">{{company_name}}</p>
  </div>
  <div style="text-align: center;">
    <div style="width: 200px; border-bottom: 1px solid #000; height: 60px;"></div>
    <p style="margin-top: 8px; font-size: 13px;">El Cliente</p>
    <p style="font-size: 12px; color: #6b7280;">{{client_name}}</p>
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
  <h1 style="margin: 0; color: #059669; font-size: 28px;">PRESUPUESTO</h1>
  <p style="margin: 8px 0 0 0; font-size: 16px; color: #6b7280;">Nº {{quote_number}}</p>
</div>`,
    },
    {
      id: 'quote_dates',
      label: 'Fechas y Validez',
      icon: Calendar,
      category: 'content',
      html: `<div style="display: flex; gap: 30px; margin: 20px 0; padding: 15px; background: #ecfdf5; border-radius: 8px;">
  <div>
    <span style="font-size: 12px; color: #047857;">Fecha:</span>
    <strong style="margin-left: 8px;">{{quote_date}}</strong>
  </div>
  <div>
    <span style="font-size: 12px; color: #047857;">Válido hasta:</span>
    <strong style="margin-left: 8px;">{{valid_until}}</strong>
  </div>
</div>`,
    },
    {
      id: 'quote_services_table',
      label: 'Tabla de Servicios',
      icon: Table2,
      category: 'table',
      html: `<table style="width: 100%; border-collapse: collapse; margin: 25px 0;">
  <thead>
    <tr style="background: #059669; color: white;">
      <th style="padding: 12px; text-align: left; font-size: 12px;">Servicio</th>
      <th style="padding: 12px; text-align: center; font-size: 12px; width: 60px;">Cant.</th>
      <th style="padding: 12px; text-align: right; font-size: 12px; width: 100px;">Precio</th>
      <th style="padding: 12px; text-align: right; font-size: 12px; width: 100px;">Total</th>
    </tr>
  </thead>
  <tbody>
    {{#services}}
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 12px; font-size: 13px;">{{name}}</td>
      <td style="padding: 12px; text-align: center; font-size: 13px;">{{quantity}}</td>
      <td style="padding: 12px; text-align: right; font-size: 13px;">{{unit_price}}</td>
      <td style="padding: 12px; text-align: right; font-size: 13px; font-weight: 500;">{{total}}</td>
    </tr>
    {{/services}}
  </tbody>
</table>`,
    },
    {
      id: 'quote_totals',
      label: 'Totales Presupuesto',
      icon: DollarSign,
      category: 'totals',
      html: `<div style="margin-left: auto; width: 250px; margin-top: 20px;">
  <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
    <span style="color: #6b7280;">Subtotal:</span>
    <span>{{subtotal}}</span>
  </div>
  <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
    <span style="color: #6b7280;">IVA ({{iva_percent}}%):</span>
    <span>{{iva_total}}</span>
  </div>
  <div style="display: flex; justify-content: space-between; padding: 12px 0; font-size: 18px; font-weight: bold; color: #059669;">
    <span>TOTAL:</span>
    <span>{{total}}</span>
  </div>
</div>`,
    },
  ],
};

// Variables disponibles por tipo de documento
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
    { key: 'current_date', label: 'Fecha actual', icon: Calendar },
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
    { key: 'contract_name', label: 'Nombre contrato', icon: FileText },
    { key: 'start_date', label: 'Fecha inicio', icon: Calendar },
    { key: 'end_date', label: 'Fecha fin', icon: Calendar },
    { key: 'billing_period', label: 'Periodicidad', icon: Calendar },
    { key: 'subtotal', label: 'Subtotal', icon: DollarSign },
    { key: 'iva_percent', label: '% IVA', icon: DollarSign },
    { key: 'iva_amount', label: 'IVA', icon: DollarSign },
    { key: 'total', label: 'Total', icon: DollarSign },
  ],
  quote: [
    { key: 'quote_number', label: 'Nº Presupuesto', icon: Hash },
    { key: 'quote_name', label: 'Nombre presupuesto', icon: FileText },
    { key: 'quote_date', label: 'Fecha', icon: Calendar },
    { key: 'valid_until', label: 'Válido hasta', icon: Calendar },
    { key: 'subtotal', label: 'Subtotal', icon: DollarSign },
    { key: 'iva_percent', label: '% IVA', icon: DollarSign },
    { key: 'iva_total', label: 'IVA', icon: DollarSign },
    { key: 'total', label: 'Total', icon: DollarSign },
    { key: 'notes', label: 'Notas', icon: FileText },
  ],
};

// Plantillas predeterminadas
const DEFAULT_TEMPLATES = {
  invoice: `<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1f2937;">
  <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 30px;">
    <div>
      {{company_logo}}
      <h2 style="margin: 10px 0 0 0; color: #333;">{{company_name}}</h2>
    </div>
    <div style="text-align: right; font-size: 12px; color: #666;">
      <p style="margin: 4px 0;">{{company_address}}</p>
      <p style="margin: 4px 0;">CIF: {{company_cif}}</p>
      <p style="margin: 4px 0;">{{company_email}}</p>
    </div>
  </div>

  <div style="text-align: center; margin: 30px 0;">
    <h1 style="margin: 0; color: #4f46e5; font-size: 28px;">FACTURA</h1>
    <p style="margin: 8px 0 0 0; font-size: 16px; color: #6b7280;">Nº {{invoice_number}}</p>
  </div>

  <div style="display: flex; gap: 30px; margin: 20px 0;">
    <div>
      <span style="font-size: 12px; color: #6b7280;">Fecha emisión:</span>
      <strong style="margin-left: 8px;">{{issue_date}}</strong>
    </div>
    <div>
      <span style="font-size: 12px; color: #6b7280;">Vencimiento:</span>
      <strong style="margin-left: 8px;">{{due_date}}</strong>
    </div>
  </div>

  <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3 style="margin: 0 0 10px 0; font-size: 12px; color: #666; text-transform: uppercase;">Cliente</h3>
    <p style="margin: 4px 0; font-weight: bold;">{{client_name}}</p>
    <p style="margin: 4px 0; font-size: 13px;">{{client_address}}</p>
    <p style="margin: 4px 0; font-size: 13px;">CIF: {{client_cif}}</p>
  </div>

  <table style="width: 100%; border-collapse: collapse; margin: 25px 0;">
    <thead>
      <tr style="background: #4f46e5; color: white;">
        <th style="padding: 12px; text-align: left; font-size: 12px;">Descripción</th>
        <th style="padding: 12px; text-align: center; font-size: 12px; width: 60px;">Cant.</th>
        <th style="padding: 12px; text-align: right; font-size: 12px; width: 100px;">Precio</th>
        <th style="padding: 12px; text-align: right; font-size: 12px; width: 100px;">Total</th>
      </tr>
    </thead>
    <tbody>
      {{#services}}
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px; font-size: 13px;">{{name}}</td>
        <td style="padding: 12px; text-align: center; font-size: 13px;">{{quantity}}</td>
        <td style="padding: 12px; text-align: right; font-size: 13px;">{{unit_price}}</td>
        <td style="padding: 12px; text-align: right; font-size: 13px; font-weight: 500;">{{total}}</td>
      </tr>
      {{/services}}
    </tbody>
  </table>

  <div style="margin-left: auto; width: 250px; margin-top: 20px;">
    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
      <span style="color: #6b7280;">Subtotal:</span>
      <span>{{subtotal}}</span>
    </div>
    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
      <span style="color: #6b7280;">IVA ({{iva_percent}}%):</span>
      <span>{{iva_amount}}</span>
    </div>
    <div style="display: flex; justify-content: space-between; padding: 12px 0; font-size: 18px; font-weight: bold; color: #4f46e5;">
      <span>TOTAL:</span>
      <span>{{total}}</span>
    </div>
  </div>

  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 11px; color: #9ca3af;">
    <p>{{company_name}} · {{company_address}}</p>
    <p>IBAN: {{company_iban}}</p>
  </div>
</div>`,
  contract: `<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1f2937;">
  <div style="text-align: center; margin: 30px 0; padding: 20px; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; border-radius: 8px;">
    <h1 style="margin: 0; font-size: 24px;">CONTRATO DE SERVICIOS</h1>
    <p style="margin: 8px 0 0 0; opacity: 0.9;">Nº {{contract_number}}</p>
  </div>

  <div style="margin: 30px 0;">
    <h2 style="font-size: 16px; color: #374151; border-bottom: 2px solid #4f46e5; padding-bottom: 8px;">PARTES CONTRATANTES</h2>
    <div style="margin-top: 15px;">
      <p><strong>PRESTADOR:</strong> {{company_name}}, con CIF {{company_cif}}.</p>
      <p style="margin-top: 10px;"><strong>CLIENTE:</strong> {{client_name}}, con CIF {{client_cif}}.</p>
    </div>
  </div>

  <div style="margin: 30px 0;">
    <h2 style="font-size: 16px; color: #374151; border-bottom: 2px solid #4f46e5; padding-bottom: 8px;">SERVICIOS</h2>
    <p style="margin-top: 15px;"><strong>{{contract_name}}</strong></p>
    {{#services}}
    <p style="margin: 8px 0; padding-left: 15px;">• {{service_name}}: {{service_price}}€</p>
    {{/services}}
  </div>

  <div style="margin: 30px 0; padding: 20px; background: #f9fafb; border-radius: 8px;">
    <h2 style="font-size: 16px; color: #374151; margin: 0 0 15px 0;">CONDICIONES ECONÓMICAS</h2>
    <p>Subtotal: <strong>{{subtotal}}</strong></p>
    <p>IVA ({{iva_percent}}%): <strong>{{iva_amount}}</strong></p>
    <p style="font-size: 18px; color: #4f46e5;"><strong>TOTAL: {{total}}</strong></p>
  </div>

  <p style="margin: 30px 0;">Vigencia: <strong>{{start_date}}</strong> hasta <strong>{{end_date}}</strong></p>

  <div style="margin-top: 60px; display: flex; justify-content: space-around;">
    <div style="text-align: center;">
      <div style="width: 200px; border-bottom: 1px solid #000; height: 60px;"></div>
      <p style="margin-top: 8px; font-size: 13px;">El Prestador</p>
    </div>
    <div style="text-align: center;">
      <div style="width: 200px; border-bottom: 1px solid #000; height: 60px;"></div>
      <p style="margin-top: 8px; font-size: 13px;">El Cliente</p>
    </div>
  </div>
</div>`,
  quote: `<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1f2937;">
  <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 30px;">
    <div>
      {{company_logo}}
      <h2 style="margin: 10px 0 0 0; color: #333;">{{company_name}}</h2>
    </div>
    <div style="text-align: right; font-size: 12px; color: #666;">
      <p style="margin: 4px 0;">{{company_address}}</p>
      <p style="margin: 4px 0;">{{company_email}}</p>
    </div>
  </div>

  <div style="text-align: center; margin: 30px 0;">
    <h1 style="margin: 0; color: #059669; font-size: 28px;">PRESUPUESTO</h1>
    <p style="margin: 8px 0 0 0; font-size: 16px; color: #6b7280;">Nº {{quote_number}}</p>
  </div>

  <div style="background: #ecfdf5; padding: 15px 20px; border-radius: 8px; margin: 20px 0; display: flex; gap: 30px;">
    <div>
      <span style="font-size: 12px; color: #047857;">Fecha:</span>
      <strong style="margin-left: 8px;">{{quote_date}}</strong>
    </div>
    <div>
      <span style="font-size: 12px; color: #047857;">Válido hasta:</span>
      <strong style="margin-left: 8px;">{{valid_until}}</strong>
    </div>
  </div>

  <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3 style="margin: 0 0 10px 0; font-size: 12px; color: #666; text-transform: uppercase;">Para</h3>
    <p style="margin: 4px 0; font-weight: bold;">{{client_name}}</p>
    <p style="margin: 4px 0; font-size: 13px;">{{client_address}}</p>
    <p style="margin: 4px 0; font-size: 13px;">{{client_email}}</p>
  </div>

  <h3 style="margin: 25px 0 15px 0;">{{quote_name}}</h3>

  <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
    <thead>
      <tr style="background: #059669; color: white;">
        <th style="padding: 12px; text-align: left; font-size: 12px;">Servicio</th>
        <th style="padding: 12px; text-align: center; font-size: 12px; width: 60px;">Cant.</th>
        <th style="padding: 12px; text-align: right; font-size: 12px; width: 100px;">Precio</th>
        <th style="padding: 12px; text-align: right; font-size: 12px; width: 100px;">Total</th>
      </tr>
    </thead>
    <tbody>
      {{#services}}
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px; font-size: 13px;">{{name}}</td>
        <td style="padding: 12px; text-align: center; font-size: 13px;">{{quantity}}</td>
        <td style="padding: 12px; text-align: right; font-size: 13px;">{{unit_price}}</td>
        <td style="padding: 12px; text-align: right; font-size: 13px; font-weight: 500;">{{total}}</td>
      </tr>
      {{/services}}
    </tbody>
  </table>

  <div style="margin-left: auto; width: 250px;">
    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
      <span style="color: #6b7280;">Subtotal:</span>
      <span>{{subtotal}}</span>
    </div>
    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
      <span style="color: #6b7280;">IVA:</span>
      <span>{{iva_total}}</span>
    </div>
    <div style="display: flex; justify-content: space-between; padding: 12px 0; font-size: 18px; font-weight: bold; color: #059669;">
      <span>TOTAL:</span>
      <span>{{total}}</span>
    </div>
  </div>

  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 11px; color: #9ca3af;">
    <p>Documento generado el {{current_date}}</p>
  </div>
</div>`,
};

export function PdfTemplateEditor({ documentType }: PdfTemplateEditorProps) {
  const { data: templates, isLoading } = usePdfTemplates(documentType);
  const createTemplate = useCreatePdfTemplate();
  const updateTemplate = useUpdatePdfTemplate();
  const deleteTemplate = useDeletePdfTemplate();
  const setDefaultTemplate = useSetDefaultTemplate();

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editName, setEditName] = useState('');
  const [showPreview, setShowPreview] = useState(true);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [activeTab, setActiveTab] = useState('blocks');

  // Cargar plantilla seleccionada
  useEffect(() => {
    if (templates && templates.length > 0 && !selectedTemplateId) {
      const defaultTemplate = templates.find(t => t.is_default) || templates[0];
      setSelectedTemplateId(defaultTemplate.id);
      setEditContent(defaultTemplate.content);
      setEditName(defaultTemplate.name);
    }
  }, [templates, selectedTemplateId]);

  const selectedTemplate = templates?.find(t => t.id === selectedTemplateId);

  const handleSelectTemplate = (template: PdfTemplate) => {
    setSelectedTemplateId(template.id);
    setEditContent(template.content);
    setEditName(template.name);
  };

  const handleSave = () => {
    if (!selectedTemplateId) return;
    updateTemplate.mutate({
      id: selectedTemplateId,
      updates: { content: editContent, name: editName },
    });
  };

  const handleCreateTemplate = () => {
    if (!newTemplateName.trim()) {
      toast.error('Introduce un nombre para la plantilla');
      return;
    }
    createTemplate.mutate(
      {
        name: newTemplateName,
        entity_type: documentType,
        content: DEFAULT_TEMPLATES[documentType],
        is_default: false,
        is_active: true,
      },
      {
        onSuccess: (data) => {
          setShowNewDialog(false);
          setNewTemplateName('');
          setSelectedTemplateId(data.id);
          setEditContent(data.content);
          setEditName(data.name);
        },
      }
    );
  };

  const handleDuplicateTemplate = () => {
    if (!selectedTemplate) return;
    createTemplate.mutate({
      name: `${selectedTemplate.name} (copia)`,
      entity_type: documentType,
      content: editContent,
      is_default: false,
      is_active: true,
    });
  };

  const handleSetDefault = () => {
    if (!selectedTemplateId) return;
    setDefaultTemplate.mutate({ id: selectedTemplateId, entityType: documentType });
  };

  const insertBlock = (html: string) => {
    setEditContent(prev => prev + '\n\n' + html);
  };

  const insertVariable = (variable: string) => {
    setEditContent(prev => prev + `{{${variable}}}`);
  };

  const allBlocks = [...HTML_BLOCKS.common, ...(HTML_BLOCKS[documentType] || [])];
  const allVariables = [...VARIABLES.common, ...(VARIABLES[documentType] || [])];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-280px)] min-h-[600px]">
      {/* Header con gestión de plantillas */}
      <div className="flex items-center justify-between mb-4 gap-4">
        <div className="flex items-center gap-3">
          <Select value={selectedTemplateId || ''} onValueChange={(id) => {
            const t = templates?.find(t => t.id === id);
            if (t) handleSelectTemplate(t);
          }}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Seleccionar plantilla" />
            </SelectTrigger>
            <SelectContent>
              {templates?.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  <div className="flex items-center gap-2">
                    {t.is_default && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                    {t.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Nueva
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nueva plantilla de {DOCUMENT_LABELS[documentType]}</DialogTitle>
                <DialogDescription>
                  Crea una nueva plantilla basada en el diseño predeterminado.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Label htmlFor="template-name">Nombre de la plantilla</Label>
                <Input
                  id="template-name"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder={`Mi ${DOCUMENT_LABELS[documentType]} personalizada`}
                  className="mt-2"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowNewDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateTemplate} disabled={createTemplate.isPending}>
                  <Sparkles className="h-4 w-4 mr-1" />
                  Crear plantilla
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowPreview(!showPreview)}>
            {showPreview ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
            {showPreview ? 'Ocultar' : 'Vista previa'}
          </Button>

          <Separator orientation="vertical" className="h-6" />

          <Button variant="ghost" size="sm" onClick={handleDuplicateTemplate} disabled={!selectedTemplate}>
            <Copy className="h-4 w-4 mr-1" />
            Duplicar
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleSetDefault}
            disabled={!selectedTemplate || selectedTemplate?.is_default}
          >
            <Star className="h-4 w-4 mr-1" />
            Predeterminada
          </Button>

          {selectedTemplate && !selectedTemplate.is_default && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar plantilla?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción no se puede deshacer. Se eliminará permanentemente la plantilla "{selectedTemplate.name}".
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      deleteTemplate.mutate(selectedTemplate.id);
                      setSelectedTemplateId(null);
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          <Separator orientation="vertical" className="h-6" />

          <Button onClick={handleSave} disabled={updateTemplate.isPending}>
            <Save className="h-4 w-4 mr-1" />
            Guardar
          </Button>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Panel izquierdo - Bloques y Variables */}
        <Card className="w-72 flex-shrink-0 flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Layout className="h-4 w-4" />
              Componentes
            </CardTitle>
            <CardDescription className="text-xs">
              Haz clic para insertar en el editor
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 p-2 overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="blocks" className="text-xs">
                  <Layout className="h-3 w-3 mr-1" />
                  Bloques
                </TabsTrigger>
                <TabsTrigger value="variables" className="text-xs">
                  <Code className="h-3 w-3 mr-1" />
                  Variables
                </TabsTrigger>
              </TabsList>

              <TabsContent value="blocks" className="mt-2 h-[calc(100%-40px)]">
                <ScrollArea className="h-full pr-2">
                  <div className="space-y-4">
                    {['header', 'content', 'table', 'totals', 'layout', 'footer'].map((category) => {
                      const categoryBlocks = allBlocks.filter(b => b.category === category);
                      if (categoryBlocks.length === 0) return null;
                      
                      const categoryLabels: Record<string, string> = {
                        header: 'Cabecera',
                        content: 'Contenido',
                        table: 'Tablas',
                        totals: 'Totales',
                        layout: 'Diseño',
                        footer: 'Pie de página',
                      };

                      return (
                        <div key={category}>
                          <p className="text-xs font-medium text-muted-foreground mb-2 px-1">
                            {categoryLabels[category]}
                          </p>
                          <div className="space-y-1">
                            {categoryBlocks.map((block) => (
                              <Button
                                key={block.id}
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start gap-2 text-xs h-9"
                                onClick={() => insertBlock(block.html)}
                              >
                                <block.icon className="h-3.5 w-3.5 text-muted-foreground" />
                                {block.label}
                              </Button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="variables" className="mt-2 h-[calc(100%-40px)]">
                <ScrollArea className="h-full pr-2">
                  <div className="space-y-1">
                    {allVariables.map((v) => (
                      <Button
                        key={v.key}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start gap-2 text-xs h-9 font-mono"
                        onClick={() => insertVariable(v.key)}
                      >
                        <v.icon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="truncate">{v.label}</span>
                        <Badge variant="secondary" className="ml-auto text-[10px] font-mono">
                          {`{{${v.key.split('_')[0]}}}`}
                        </Badge>
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Editor de código */}
        <Card className={`flex-1 flex flex-col ${showPreview ? '' : 'col-span-2'}`}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code className="h-4 w-4" />
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-7 text-sm font-medium w-56"
                />
              </div>
              {selectedTemplate?.is_default && (
                <Badge variant="secondary" className="gap-1">
                  <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                  Predeterminada
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-2 overflow-hidden">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="h-full font-mono text-xs resize-none"
              placeholder="Escribe o pega el HTML de tu plantilla aquí..."
            />
          </CardContent>
        </Card>

        {/* Preview */}
        {showPreview && (
          <div className="w-[400px] flex-shrink-0">
            <PdfPreview
              content={editContent}
              documentType={documentType}
              scale={0.55}
            />
          </div>
        )}
      </div>
    </div>
  );
}
