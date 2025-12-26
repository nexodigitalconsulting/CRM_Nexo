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
  ChevronDown, ChevronRight, PanelLeftClose, PanelLeft,
  Settings, Save
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  onSave?: () => void;
  isSaving?: boolean;
  hasChanges?: boolean;
}

export function PdfSettingsPanel({ 
  sections, 
  className,
  collapsed = false,
  onCollapsedChange,
  onSave,
  isSaving,
  hasChanges
}: PdfSettingsPanelProps) {
  const [openSections, setOpenSections] = useState<string[]>(
    sections.filter(s => s.defaultOpen).map(s => s.id)
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleSection = (id: string) => {
    setOpenSections(prev => 
      prev.includes(id) 
        ? prev.filter(s => s !== id)
        : [...prev, id]
    );
  };

  const SaveButton = () => (
    onSave && hasChanges ? (
      <Button 
        size="sm" 
        onClick={onSave} 
        disabled={isSaving}
        className="w-full mt-3"
      >
        <Save className="h-4 w-4 mr-2" />
        {isSaving ? 'Guardando...' : 'Guardar'}
      </Button>
    ) : null
  );

  const PanelContent = () => (
    <ScrollArea className="h-[calc(100vh-120px)]">
      <div className="space-y-1 p-3">
        {sections.map((section) => (
          <Collapsible
            key={section.id}
            open={openSections.includes(section.id)}
            onOpenChange={() => toggleSection(section.id)}
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between h-9 px-3 font-medium text-sm hover:bg-accent"
              >
                <span className="flex items-center gap-2">
                  {section.icon}
                  <span>{section.title}</span>
                </span>
                {openSections.includes(section.id) ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 pb-4 px-2">
              {section.content}
            </CollapsibleContent>
          </Collapsible>
        ))}
        <SaveButton />
      </div>
    </ScrollArea>
  );

  // Mobile: Sheet drawer with fixed floating button
  const MobilePanel = () => (
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="default" 
          size="icon" 
          className="lg:hidden fixed bottom-4 left-4 z-50 h-12 w-12 rounded-full shadow-lg"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] p-0">
        <div className="h-12 border-b flex items-center justify-between px-4">
          <h3 className="font-semibold text-sm">Configuración PDF</h3>
        </div>
        <PanelContent />
      </SheetContent>
    </Sheet>
  );

  // Desktop: Collapsible sidebar (Lovable style)
  const DesktopPanel = () => (
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          "hidden lg:flex flex-col border-r bg-sidebar transition-all duration-200 ease-in-out relative shrink-0",
          collapsed ? "w-14" : "w-72",
          className
        )}
      >
        {/* Header with toggle button */}
        <div className={cn(
          "h-12 border-b flex items-center shrink-0",
          collapsed ? "justify-center" : "justify-between px-4"
        )}>
          {!collapsed && (
            <span className="font-semibold text-sm">Configuración</span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-md hover:bg-accent"
            onClick={() => onCollapsedChange?.(!collapsed)}
          >
            {collapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Collapsed state: icons only with tooltips */}
        {collapsed ? (
          <div className="flex flex-col items-center gap-1 pt-3 px-1.5">
            {sections.map((section) => (
              <Tooltip key={section.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant={openSections.includes(section.id) ? "secondary" : "ghost"}
                    size="icon"
                    className="h-10 w-10"
                    onClick={() => {
                      onCollapsedChange?.(false);
                      setOpenSections([section.id]);
                    }}
                  >
                    {section.icon}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  {section.title}
                </TooltipContent>
              </Tooltip>
            ))}
            {onSave && hasChanges && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="default"
                    size="icon"
                    className="h-10 w-10 mt-2"
                    onClick={onSave}
                    disabled={isSaving}
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  Guardar cambios
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        ) : (
          <PanelContent />
        )}
      </div>
    </TooltipProvider>
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
    <div className="space-y-3">
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
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-medium">{label}</label>
        {children}
      </div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
