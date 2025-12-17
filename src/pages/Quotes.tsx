import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Filter, MoreVertical, FileText, Send, Check, X, Loader2, ArrowRight, Printer, LayoutGrid, List, Mail, Download } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useQuotes, useQuote, useDeleteQuote, useUpdateQuoteStatus, useMarkQuoteAsSent, QuoteWithDetails } from "@/hooks/useQuotes";
import { QuoteFormDialog } from "@/components/quotes/QuoteFormDialog";
import { ExportDropdown } from "@/components/common/ExportDropdown";
import { TableViewManager, ColumnConfig } from "@/components/common/TableViewManager";
import { useDefaultTableView } from "@/hooks/useTableViews";
import { entityExportConfigs } from "@/lib/exportUtils";
import { useDefaultTemplate } from "@/hooks/useTemplates";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { printDocument, formatQuoteData } from "@/lib/printUtils";
import { downloadQuotePdf } from "@/lib/pdf/quotePdf";
import { SendEmailDialog } from "@/components/common/SendEmailDialog";
import { toast } from "sonner";

const statusMap: Record<string, "inactive" | "new" | "active" | "danger"> = {
  draft: "inactive",
  sent: "new",
  approved: "active",
  rejected: "danger",
};

const statusLabels: Record<string, string> = {
  draft: "Borrador",
  sent: "Enviado",
  approved: "Aprobado",
  rejected: "Rechazado",
};

const statusIcons: Record<string, React.ElementType> = {
  draft: FileText,
  sent: Send,
  approved: Check,
  rejected: X,
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(amount);

const columnConfigs: ColumnConfig[] = [
  { key: "quote_number", label: "Nº Presupuesto", defaultVisible: true },
  { key: "name", label: "Nombre", defaultVisible: true },
  { key: "client", label: "Cliente/Contacto", defaultVisible: true },
  { key: "status", label: "Estado", defaultVisible: true },
  { key: "subtotal", label: "Subtotal", defaultVisible: false },
  { key: "iva_total", label: "IVA", defaultVisible: false },
  { key: "total", label: "Total", defaultVisible: true },
  { key: "valid_until", label: "Validez", defaultVisible: true },
  { key: "created_at", label: "Creado", defaultVisible: false },
  { key: "notes", label: "Notas", defaultVisible: false },
  { key: "actions", label: "Acciones", defaultVisible: true },
];

export default function Quotes() {
  const { data: quotes, isLoading, error } = useQuotes();
  const deleteQuote = useDeleteQuote();
  const updateStatus = useUpdateQuoteStatus();
  const markAsSent = useMarkQuoteAsSent();
  const { data: quoteTemplate } = useDefaultTemplate("quote");
  const { data: companySettings } = useCompanySettings();
  const { data: defaultView } = useDefaultTableView("quotes");
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<QuoteWithDetails | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState<QuoteWithDetails | null>(null);
  const [quoteForPrint, setQuoteForPrint] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    columnConfigs.filter((c) => c.defaultVisible).map((c) => c.key)
  );
  
  // Email dialog state
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailQuote, setEmailQuote] = useState<QuoteWithDetails | null>(null);

  // Apply default view
  if (defaultView && visibleColumns.length === columnConfigs.filter(c => c.defaultVisible).length) {
    const cols = defaultView.visible_columns as string[];
    if (cols.length > 0) setVisibleColumns(cols);
  }

  // Fetch full quote for printing
  const { data: fullQuote } = useQuote(quoteForPrint || undefined);

  // Effect to print when full quote is loaded
  if (fullQuote && quoteForPrint && quoteTemplate) {
    const data = formatQuoteData(
      fullQuote as unknown as Record<string, unknown>,
      companySettings as unknown as Record<string, unknown>
    );
    printDocument({
      template: quoteTemplate.content,
      data,
      filename: `presupuesto-${fullQuote.quote_number}.html`,
      logoUrl: companySettings?.logo_url || undefined,
    });
    setQuoteForPrint(null);
  }

  const handleEdit = (quote: QuoteWithDetails) => {
    setSelectedQuote(quote);
    setDialogOpen(true);
  };

  const handleDelete = (quote: QuoteWithDetails) => {
    setQuoteToDelete(quote);
    setDeleteDialogOpen(true);
  };

  const handlePrint = (quoteId: string) => {
    if (!quoteTemplate) {
      toast.error("No hay plantilla de presupuesto configurada. Ve a Configuración > Plantillas.");
      return;
    }
    setQuoteForPrint(quoteId);
  };

  const confirmDelete = async () => {
    if (quoteToDelete) {
      await deleteQuote.mutateAsync(quoteToDelete.id);
      setDeleteDialogOpen(false);
      setQuoteToDelete(null);
    }
  };

  const handleStatusChange = async (quote: QuoteWithDetails, newStatus: typeof quote.status) => {
    await updateStatus.mutateAsync({ id: quote.id, status: newStatus });
  };

  const filteredQuotes = quotes?.filter((quote) => {
    const matchesSearch = 
      quote.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.contact?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  }) || [];

  const getQuotesByStatus = (status: string) => 
    filteredQuotes.filter((q) => q.status === status);

  const statuses = ["draft", "sent", "approved", "rejected"];

  const columns = [
    {
      key: "quote_number",
      label: "Nº",
      render: (quote: QuoteWithDetails) => (
        <span className="font-mono text-xs">PP-{String(quote.quote_number).padStart(4, "0")}</span>
      ),
    },
    {
      key: "name",
      label: "Nombre",
      render: (quote: QuoteWithDetails) => <span className="font-medium">{quote.name || "Sin nombre"}</span>,
    },
    {
      key: "client",
      label: "Cliente/Contacto",
      render: (quote: QuoteWithDetails) => (
        <span>{quote.client?.name || quote.contact?.name || "Sin cliente"}</span>
      ),
    },
    {
      key: "status",
      label: "Estado",
      render: (quote: QuoteWithDetails) => (
        <StatusBadge variant={statusMap[quote.status || "draft"]}>
          {statusLabels[quote.status || "draft"]}
        </StatusBadge>
      ),
    },
    {
      key: "subtotal",
      label: "Subtotal",
      render: (quote: QuoteWithDetails) => <span className="text-sm">{formatCurrency(Number(quote.subtotal) || 0)}</span>,
    },
    {
      key: "iva_total",
      label: "IVA",
      render: (quote: QuoteWithDetails) => <span className="text-sm">{formatCurrency(Number(quote.iva_total) || 0)}</span>,
    },
    {
      key: "total",
      label: "Total",
      render: (quote: QuoteWithDetails) => (
        <span className="font-semibold">{formatCurrency(Number(quote.total) || 0)}</span>
      ),
    },
    {
      key: "valid_until",
      label: "Validez",
      render: (quote: QuoteWithDetails) => (
        <span className="text-sm text-muted-foreground">
          {quote.valid_until ? new Date(quote.valid_until).toLocaleDateString("es-ES") : "-"}
        </span>
      ),
    },
    {
      key: "created_at",
      label: "Creado",
      render: (quote: QuoteWithDetails) => (
        <span className="text-sm text-muted-foreground">
          {quote.created_at ? new Date(quote.created_at).toLocaleDateString("es-ES") : "-"}
        </span>
      ),
    },
    {
      key: "notes",
      label: "Notas",
      render: (quote: QuoteWithDetails) => (
        <span className="text-sm text-muted-foreground truncate max-w-[150px] block">{quote.notes || "-"}</span>
      ),
    },
    {
      key: "actions",
      label: "Acciones",
      render: (quote: QuoteWithDetails) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleEdit(quote)}>Editar</DropdownMenuItem>
            <DropdownMenuItem onClick={async () => {
              try {
                const quoteData = {
                  quote_number: quote.quote_number,
                  created_at: quote.created_at || new Date().toISOString(),
                  valid_until: quote.valid_until,
                  subtotal: quote.subtotal,
                  iva_total: quote.iva_total,
                  total: quote.total,
                  notes: quote.notes,
                  name: quote.name,
                  client: quote.client,
                  contact: quote.contact,
                };
                await downloadQuotePdf(quoteData as any, companySettings as any);
                toast.success("PDF descargado");
              } catch (error) {
                toast.error("Error al descargar PDF");
              }
            }}>
              <Download className="h-4 w-4 mr-2" /> Descargar PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handlePrint(quote.id)}>
              <Printer className="h-4 w-4 mr-2" /> Imprimir
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              setEmailQuote(quote);
              setEmailDialogOpen(true);
            }}>
              <Mail className="h-4 w-4 mr-2" /> Enviar por email
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              setSelectedQuote({ ...quote, id: "" } as QuoteWithDetails);
              setDialogOpen(true);
            }}>Duplicar</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(quote)}>
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  if (error) {
    return <div className="p-6 text-destructive">Error al cargar presupuestos: {error.message}</div>;
  }

  return (
    <div className="animate-fade-in">
      <Header
        title="Presupuestos"
        subtitle="Gestión de presupuestos enviados"
        actions={
          <Button className="gap-2" onClick={() => { setSelectedQuote(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4" />
            Nuevo Presupuesto
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-semibold mt-1">{quotes?.length || 0}</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Borradores</p>
            <p className="text-2xl font-semibold mt-1 text-muted-foreground">
              {quotes?.filter((q) => q.status === "draft").length || 0}
            </p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Enviados</p>
            <p className="text-2xl font-semibold mt-1 text-primary">
              {quotes?.filter((q) => q.status === "sent").length || 0}
            </p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Aprobados</p>
            <p className="text-2xl font-semibold mt-1 text-success">
              {quotes?.filter((q) => q.status === "approved").length || 0}
            </p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Valor Total</p>
            <p className="text-2xl font-semibold mt-1">
              {formatCurrency(quotes?.reduce((sum, q) => sum + (Number(q.total) || 0), 0) || 0)}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Input 
            placeholder="Buscar presupuestos..." 
            className="sm:w-80" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="flex gap-2 ml-auto">
            <div className="flex border border-border rounded-lg overflow-hidden">
              <Button
                variant={viewMode === "kanban" ? "default" : "ghost"}
                size="icon"
                className="rounded-none"
                onClick={() => setViewMode("kanban")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="icon"
                className="rounded-none"
                onClick={() => setViewMode("table")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filtros
            </Button>
            <TableViewManager
              entityName="quotes"
              columns={columnConfigs}
              visibleColumns={visibleColumns}
              onVisibleColumnsChange={setVisibleColumns}
              filters={{}}
            />
            <ExportDropdown
              data={filteredQuotes}
              columns={entityExportConfigs.quotes.columns as any}
              filename={entityExportConfigs.quotes.filename}
            />
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : viewMode === "table" ? (
          <DataTable columns={columns} data={filteredQuotes} visibleColumns={visibleColumns} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {statuses.map((status) => {
              const StatusIcon = statusIcons[status];
              const statusQuotes = getQuotesByStatus(status);

              return (
                <div key={status} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StatusIcon className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-medium text-foreground">{statusLabels[status]}</h3>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {statusQuotes.length}
                    </span>
                  </div>

                  <div className="space-y-3 min-h-[200px]">
                    {statusQuotes.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-lg">
                        Sin presupuestos
                      </div>
                    ) : (
                      statusQuotes.map((quote) => (
                        <div
                          key={quote.id}
                          className="bg-card rounded-lg border border-border p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                          onClick={() => handleEdit(quote)}
                        >
                          <div className="flex items-start justify-between">
                            <span className="font-mono text-xs text-muted-foreground">
                              PP-{String(quote.quote_number).padStart(4, "0")}
                            </span>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                <DropdownMenuItem onClick={() => handleEdit(quote)}>Editar</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handlePrint(quote.id)}>
                                  <Printer className="h-4 w-4 mr-2" /> Imprimir
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  setSelectedQuote({ ...quote, id: "" } as QuoteWithDetails);
                                  setDialogOpen(true);
                                }}>Duplicar</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {status === "draft" && (
                                  <DropdownMenuItem onClick={() => handleStatusChange(quote, "sent")}>
                                    <Send className="h-4 w-4 mr-2" /> Marcar como Enviado
                                  </DropdownMenuItem>
                                )}
                                {status === "sent" && (
                                  <>
                                    <DropdownMenuItem onClick={() => handleStatusChange(quote, "approved")}>
                                      <Check className="h-4 w-4 mr-2" /> Aprobar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleStatusChange(quote, "rejected")}>
                                      <X className="h-4 w-4 mr-2" /> Rechazar
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {status === "approved" && (
                                  <DropdownMenuItem>
                                    <ArrowRight className="h-4 w-4 mr-2" /> Crear Contrato
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-destructive" 
                                  onClick={() => handleDelete(quote)}
                                >
                                  Eliminar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          <h4 className="mt-2 font-medium text-foreground line-clamp-1">
                            {quote.name || "Sin nombre"}
                          </h4>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {quote.client?.name || quote.contact?.name || "Sin cliente"}
                          </p>

                          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                            <span className="text-sm font-semibold text-foreground">
                              {formatCurrency(Number(quote.total) || 0)}
                            </span>
                            {quote.valid_until && (
                              <span className="text-xs text-muted-foreground">
                                Válido: {new Date(quote.valid_until).toLocaleDateString("es-ES")}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <QuoteFormDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
        quote={selectedQuote} 
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar presupuesto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el presupuesto "{quoteToDelete?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {emailQuote && (
        <SendEmailDialog
          open={emailDialogOpen}
          onOpenChange={(open) => {
            setEmailDialogOpen(open);
            if (!open) setEmailQuote(null);
          }}
          entityType="quote"
          entityId={emailQuote.id}
          entityNumber={emailQuote.quote_number}
          clientName={emailQuote.client?.name || emailQuote.contact?.name || ""}
          clientEmail={emailQuote.client?.email || ""}
          contactEmail={emailQuote.contact?.email || ""}
          total={Number(emailQuote.total) || 0}
          dueDate={emailQuote.valid_until || undefined}
          entityData={emailQuote as unknown as Record<string, unknown>}
          onSendSuccess={() => {
            // Mark quote as sent and update status
            markAsSent.mutate(emailQuote.id);
            toast.success("Presupuesto marcado como enviado");
          }}
        />
      )}
    </div>
  );
}
