import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Filter, MoreVertical, FileText, Send, Check, X, Loader2, ArrowRight } from "lucide-react";
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
import { useQuotes, useDeleteQuote, useUpdateQuoteStatus, QuoteWithDetails } from "@/hooks/useQuotes";
import { QuoteFormDialog } from "@/components/quotes/QuoteFormDialog";

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

export default function Quotes() {
  const { data: quotes, isLoading, error } = useQuotes();
  const deleteQuote = useDeleteQuote();
  const updateStatus = useUpdateQuoteStatus();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<QuoteWithDetails | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState<QuoteWithDetails | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const handleEdit = (quote: QuoteWithDetails) => {
    setSelectedQuote(quote);
    setDialogOpen(true);
  };

  const handleDelete = (quote: QuoteWithDetails) => {
    setQuoteToDelete(quote);
    setDeleteDialogOpen(true);
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
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </Button>
        </div>

        {/* Kanban View */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
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
    </div>
  );
}
