import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  ChevronDown, ChevronRight, Palette, Layout, Type, 
  Settings2, Scale, FileSignature, PanelLeftClose, PanelLeft,
  Menu
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PanelSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
  defaultOpen?: boolean;
}

interface PdfSettingsPanelProps {
  sections: PanelSection[];
  className?: string;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function PdfSettingsPanel({ 
  sections, 
  className,
  collapsed = false,
  onCollapsedChange 
}: PdfSettingsPanelProps) {
  const [openSections, setOpenSections] = useState<string[]>(
    sections.filter(s => s.defaultOpen).map(s => s.id)
  );

  const toggleSection = (id: string) => {
    setOpenSections(prev => 
      prev.includes(id) 
        ? prev.filter(s => s !== id)
        : [...prev, id]
    );
  };

  const PanelContent = () => (
    <ScrollArea className="h-full">
      <div className="space-y-2 p-4">
        {sections.map((section) => (
          <Collapsible
            key={section.id}
            open={openSections.includes(section.id)}
            onOpenChange={() => toggleSection(section.id)}
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between h-10 px-3 font-medium"
              >
                <span className="flex items-center gap-2">
                  {section.icon}
                  <span className="text-sm">{section.title}</span>
                </span>
                {openSections.includes(section.id) ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 pb-4">
              {section.content}
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </ScrollArea>
  );

  // Mobile: Sheet drawer
  const MobilePanel = () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="lg:hidden fixed bottom-4 left-4 z-50 h-12 w-12 rounded-full shadow-lg">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[320px] p-0">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Configuración PDF</h3>
          <p className="text-sm text-muted-foreground">Ajusta las opciones</p>
        </div>
        <PanelContent />
      </SheetContent>
    </Sheet>
  );

  // Desktop: Collapsible sidebar
  const DesktopPanel = () => (
    <div
      className={cn(
        "hidden lg:flex flex-col border-r bg-background transition-all duration-300",
        collapsed ? "w-14" : "w-80",
        className
      )}
    >
      {/* Header */}
      <div className="h-14 border-b flex items-center justify-between px-3">
        {!collapsed && (
          <span className="font-semibold text-sm">Configuración</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onCollapsedChange?.(!collapsed)}
        >
          {collapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Collapsed state: icons only */}
      {collapsed ? (
        <div className="flex flex-col items-center gap-1 py-2">
          {sections.map((section) => (
            <Button
              key={section.id}
              variant={openSections.includes(section.id) ? "secondary" : "ghost"}
              size="icon"
              className="h-10 w-10"
              onClick={() => {
                onCollapsedChange?.(false);
                setOpenSections([section.id]);
              }}
              title={section.title}
            >
              {section.icon}
            </Button>
          ))}
        </div>
      ) : (
        <PanelContent />
      )}
    </div>
  );

  return (
    <>
      <MobilePanel />
      <DesktopPanel />
    </>
  );
}

// Helper components for section content
export function PanelSectionContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 space-y-4">
      {children}
    </div>
  );
}

export function PanelRow({ 
  label, 
  children,
  description
}: { 
  label: string; 
  children: React.ReactNode;
  description?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{label}</label>
        {children}
      </div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
