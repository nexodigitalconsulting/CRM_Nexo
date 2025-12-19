import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Building2,
  FileText,
  Calendar,
  User,
  Table2,
  DollarSign,
  FileSignature,
  Eye,
  EyeOff,
} from "lucide-react";
import { PdfSections, getDefaultSections } from "@/lib/pdf/pdfUtils";

interface PdfSectionEditorProps {
  sections: PdfSections;
  onChange: (sections: PdfSections) => void;
}

interface SectionItemProps {
  title: string;
  icon: React.ReactNode;
  visible: boolean;
  onVisibilityChange: (visible: boolean) => void;
  children: React.ReactNode;
}

function SectionItem({ title, icon, visible, onVisibilityChange, children }: SectionItemProps) {
  return (
    <AccordionItem value={title} className="border rounded-lg px-4 mb-2">
      <AccordionTrigger className="py-3 hover:no-underline">
        <div className="flex items-center gap-3 flex-1">
          <div className={`p-2 rounded-md ${visible ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
            {icon}
          </div>
          <span className={`font-medium ${!visible ? 'text-muted-foreground' : ''}`}>{title}</span>
          <div className="ml-auto mr-4" onClick={(e) => e.stopPropagation()}>
            <Switch
              checked={visible}
              onCheckedChange={onVisibilityChange}
              className="data-[state=checked]:bg-primary"
            />
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pb-4">
        <div className={`space-y-4 ${!visible ? 'opacity-50 pointer-events-none' : ''}`}>
          {children}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

interface SliderControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}

function SliderControl({ label, value, min, max, step = 1, unit = 'px', onChange }: SliderControlProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <Label>{label}</Label>
        <span className="text-muted-foreground font-mono">{value}{unit}</span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
        className="w-full"
      />
    </div>
  );
}

interface ColorControlProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function ColorControl({ label, value, onChange }: ColorControlProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-10 p-1 cursor-pointer"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 font-mono text-sm"
        />
      </div>
    </div>
  );
}

export function PdfSectionEditor({ sections, onChange }: PdfSectionEditorProps) {
  const updateSection = <K extends keyof PdfSections>(
    sectionKey: K,
    updates: Partial<PdfSections[K]>
  ) => {
    onChange({
      ...sections,
      [sectionKey]: { ...sections[sectionKey], ...updates },
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Editor de Secciones
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Ajusta el espaciado y visibilidad de cada área del PDF
        </p>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full" defaultValue={["Cabecera"]}>
          {/* Header Section */}
          <SectionItem
            title="Cabecera"
            icon={<Building2 className="h-4 w-4" />}
            visible={sections.header.visible}
            onVisibilityChange={(v) => updateSection('header', { visible: v })}
          >
            <SliderControl
              label="Espaciado interno"
              value={sections.header.spacing}
              min={4}
              max={20}
              onChange={(v) => updateSection('header', { spacing: v })}
            />
            <SliderControl
              label="Tamaño máximo del logo"
              value={sections.header.logo_size || 60}
              min={30}
              max={100}
              onChange={(v) => updateSection('header', { logo_size: v })}
            />
          </SectionItem>

          {/* Title Section */}
          <SectionItem
            title="Título"
            icon={<FileText className="h-4 w-4" />}
            visible={sections.title.visible}
            onVisibilityChange={(v) => updateSection('title', { visible: v })}
          >
            <SliderControl
              label="Margen superior"
              value={sections.title.margin_top}
              min={5}
              max={50}
              onChange={(v) => updateSection('title', { margin_top: v })}
            />
            <SliderControl
              label="Espaciado tras título"
              value={sections.title.spacing}
              min={5}
              max={30}
              onChange={(v) => updateSection('title', { spacing: v })}
            />
            <SliderControl
              label="Tamaño de fuente"
              value={sections.title.size || 28}
              min={18}
              max={40}
              onChange={(v) => updateSection('title', { size: v })}
            />
          </SectionItem>

          {/* Dates Section */}
          <SectionItem
            title="Fechas"
            icon={<Calendar className="h-4 w-4" />}
            visible={sections.dates.visible}
            onVisibilityChange={(v) => updateSection('dates', { visible: v })}
          >
            <SliderControl
              label="Margen superior"
              value={sections.dates.margin_top}
              min={5}
              max={40}
              onChange={(v) => updateSection('dates', { margin_top: v })}
            />
            <SliderControl
              label="Espaciado interno"
              value={sections.dates.spacing}
              min={5}
              max={20}
              onChange={(v) => updateSection('dates', { spacing: v })}
            />
          </SectionItem>

          {/* Client Section */}
          <SectionItem
            title="Datos del Cliente"
            icon={<User className="h-4 w-4" />}
            visible={sections.client.visible}
            onVisibilityChange={(v) => updateSection('client', { visible: v })}
          >
            <SliderControl
              label="Margen superior"
              value={sections.client.margin_top}
              min={5}
              max={50}
              onChange={(v) => updateSection('client', { margin_top: v })}
            />
            <SliderControl
              label="Padding interno"
              value={sections.client.padding}
              min={8}
              max={30}
              onChange={(v) => updateSection('client', { padding: v })}
            />
            <SliderControl
              label="Espaciado entre líneas"
              value={sections.client.spacing}
              min={10}
              max={22}
              onChange={(v) => updateSection('client', { spacing: v })}
            />
            <ColorControl
              label="Color de fondo"
              value={sections.client.background_color || '#f8f9fa'}
              onChange={(v) => updateSection('client', { background_color: v })}
            />
          </SectionItem>

          {/* Table Section */}
          <SectionItem
            title="Tabla de Servicios"
            icon={<Table2 className="h-4 w-4" />}
            visible={sections.table.visible}
            onVisibilityChange={(v) => updateSection('table', { visible: v })}
          >
            <SliderControl
              label="Margen superior"
              value={sections.table.margin_top}
              min={10}
              max={50}
              onChange={(v) => updateSection('table', { margin_top: v })}
            />
            <SliderControl
              label="Altura de cabecera"
              value={sections.table.header_height}
              min={18}
              max={40}
              onChange={(v) => updateSection('table', { header_height: v })}
            />
            <SliderControl
              label="Altura de filas"
              value={sections.table.row_height}
              min={16}
              max={36}
              onChange={(v) => updateSection('table', { row_height: v })}
            />
            <div className="flex items-center justify-between">
              <Label>Mostrar bordes entre filas</Label>
              <Switch
                checked={sections.table.show_borders}
                onCheckedChange={(v) => updateSection('table', { show_borders: v })}
              />
            </div>
            {sections.table.show_borders && (
              <ColorControl
                label="Color de bordes"
                value={sections.table.border_color || '#e5e7eb'}
                onChange={(v) => updateSection('table', { border_color: v })}
              />
            )}
          </SectionItem>

          {/* Totals Section */}
          <SectionItem
            title="Totales"
            icon={<DollarSign className="h-4 w-4" />}
            visible={sections.totals.visible}
            onVisibilityChange={(v) => updateSection('totals', { visible: v })}
          >
            <SliderControl
              label="Margen superior"
              value={sections.totals.margin_top}
              min={5}
              max={40}
              onChange={(v) => updateSection('totals', { margin_top: v })}
            />
            <SliderControl
              label="Espaciado entre líneas"
              value={sections.totals.line_spacing}
              min={14}
              max={40}
              onChange={(v) => updateSection('totals', { line_spacing: v })}
            />
            <div className="flex items-center justify-between">
              <Label>Mostrar líneas separadoras</Label>
              <Switch
                checked={sections.totals.show_lines}
                onCheckedChange={(v) => updateSection('totals', { show_lines: v })}
              />
            </div>
            {sections.totals.show_lines && (
              <ColorControl
                label="Color de líneas"
                value={sections.totals.line_color || '#e5e7eb'}
                onChange={(v) => updateSection('totals', { line_color: v })}
              />
            )}
          </SectionItem>

          {/* Footer Section */}
          <SectionItem
            title="Pie de Página"
            icon={<FileSignature className="h-4 w-4" />}
            visible={sections.footer.visible}
            onVisibilityChange={(v) => updateSection('footer', { visible: v })}
          >
            <SliderControl
              label="Margen superior"
              value={sections.footer.margin_top}
              min={20}
              max={80}
              onChange={(v) => updateSection('footer', { margin_top: v })}
            />
            <SliderControl
              label="Espaciado entre líneas"
              value={sections.footer.spacing}
              min={8}
              max={20}
              onChange={(v) => updateSection('footer', { spacing: v })}
            />
            <div className="flex items-center justify-between">
              <Label>Mostrar IBAN</Label>
              <Switch
                checked={sections.footer.show_iban}
                onCheckedChange={(v) => updateSection('footer', { show_iban: v })}
              />
            </div>
          </SectionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
