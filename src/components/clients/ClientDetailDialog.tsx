"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Client } from "@/hooks/useClients";
import { useContracts, ContractWithDetails } from "@/hooks/useContracts";
import { useInvoices, InvoiceWithDetails } from "@/hooks/useInvoices";
import { useQuotes } from "@/hooks/useQuotes";
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  FileText,
  Receipt,
  Briefcase,
  Edit,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ContractFormDialog } from "@/components/contracts/ContractFormDialog";
import { InvoiceFormDialog } from "@/components/invoices/InvoiceFormDialog";
import { QuoteFormDialog } from "@/components/quotes/QuoteFormDialog";

interface ClientDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
  onEdit: () => void;
}

export function ClientDetailDialog({ open, onOpenChange, client, onEdit }: ClientDetailDialogProps) {
  const { data: allContracts } = useContracts();
  const { data: allInvoices } = useInvoices();
  const { data: allQuotes } = useQuotes();
  
  // State for opening sub-dialogs
  const [selectedContract, setSelectedContract] = useState<ContractWithDetails | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithDetails | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);

  if (!client) return null;

  const clientContracts = allContracts?.filter((c) => c.client_id === client.id) || [];
  const clientInvoices = allInvoices?.filter((i) => i.client_id === client.id) || [];
  const clientQuotes = allQuotes?.filter((q) => q.client_id === client.id) || [];

  const totalRevenue = clientInvoices
    .filter((i) => i.status === "pagada")
    .reduce((sum, i) => sum + (Number(i.total) || 0), 0);

  const activeContracts = clientContracts.filter((c) => c.status === "vigente").length;

  const segmentLabels: Record<string, string> = {
    corporativo: "Corporativo",
    pyme: "PYME",
    autonomo: "Autónomo",
    particular: "Particular",
  };

  const handleOpenContract = (contract: ContractWithDetails) => {
    setSelectedContract(contract);
    setContractDialogOpen(true);
  };

  const handleOpenInvoice = (invoice: InvoiceWithDetails) => {
    setSelectedInvoice(invoice);
    setInvoiceDialogOpen(true);
  };

  const handleOpenQuote = (quote: any) => {
    setSelectedQuote(quote);
    setQuoteDialogOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <DialogTitle className="text-xl">{client.name}</DialogTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={client.status === "activo" ? "default" : "secondary"}>
                      {client.status === "activo" ? "Activo" : "Inactivo"}
                    </Badge>
                    <Badge variant="outline">{segmentLabels[client.segment || "pyme"]}</Badge>
                    <span className="text-sm text-muted-foreground">CL-{String(client.client_number).padStart(4, "0")}</span>
                  </div>
                </div>
              </div>
              <Button variant="outline" onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            </div>
          </DialogHeader>

          <Tabs defaultValue="info" className="mt-4">
            <TabsList>
              <TabsTrigger value="info">Información</TabsTrigger>
              <TabsTrigger value="contracts">Contratos ({clientContracts.length})</TabsTrigger>
              <TabsTrigger value="invoices">Facturas ({clientInvoices.length})</TabsTrigger>
              <TabsTrigger value="quotes">Presupuestos ({clientQuotes.length})</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[55vh] mt-4">
              {/* Info Tab */}
              <TabsContent value="info" className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-primary">
                        {totalRevenue.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                      </div>
                      <p className="text-sm text-muted-foreground">Facturado total</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{activeContracts}</div>
                      <p className="text-sm text-muted-foreground">Contratos activos</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold">{clientInvoices.length}</div>
                      <p className="text-sm text-muted-foreground">Facturas emitidas</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Contact Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Datos de Contacto</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{client.email || "Sin email"}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{client.phone || "Sin teléfono"}</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p>{client.address || "Sin dirección"}</p>
                          <p className="text-sm text-muted-foreground">
                            {[client.city, client.province, client.postal_code].filter(Boolean).join(", ")}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground">CIF/NIF</p>
                        <p className="font-medium">{client.cif || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">IBAN</p>
                        <p className="font-medium font-mono text-sm">{client.iban || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Origen</p>
                        <p className="font-medium">{client.source || "-"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Notes */}
                {client.notes && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Notas</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground whitespace-pre-wrap">{client.notes}</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Contracts Tab */}
              <TabsContent value="contracts" className="space-y-3">
                {clientContracts.length > 0 ? (
                  clientContracts.map((contract) => (
                    <Card 
                      key={contract.id} 
                      className="hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => handleOpenContract(contract)}
                    >
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div>
                              <p className="font-medium">{contract.name || `Contrato #${contract.contract_number}`}</p>
                              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                                <span>{format(new Date(contract.start_date), "dd MMM yyyy", { locale: es })}</span>
                                {contract.end_date && (
                                  <>
                                    <span>→</span>
                                    <span>{format(new Date(contract.end_date), "dd MMM yyyy", { locale: es })}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <Badge variant={contract.status === "vigente" ? "default" : "secondary"}>
                                {contract.status === "vigente" ? "Activo" : contract.status}
                              </Badge>
                              <p className="text-sm font-medium mt-1">
                                {Number(contract.total || 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                              </p>
                            </div>
                            <ExternalLink className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No hay contratos asociados</p>
                  </div>
                )}
              </TabsContent>

              {/* Invoices Tab */}
              <TabsContent value="invoices" className="space-y-3">
                {clientInvoices.length > 0 ? (
                  clientInvoices.map((invoice) => (
                    <Card 
                      key={invoice.id} 
                      className="hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => handleOpenInvoice(invoice)}
                    >
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div>
                              <p className="font-medium font-mono">FF-{String(invoice.invoice_number).padStart(4, "0")}</p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(invoice.issue_date), "dd MMM yyyy", { locale: es })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <Badge
                                variant={
                                  invoice.status === "pagada"
                                    ? "default"
                                    : invoice.status === "emitida"
                                    ? "secondary"
                                    : "outline"
                                }
                              >
                                {invoice.status === "pagada"
                                  ? "Pagada"
                                  : invoice.status === "emitida"
                                  ? "Emitida"
                                  : invoice.status === "borrador"
                                  ? "Borrador"
                                  : "Cancelada"}
                              </Badge>
                              <p className="text-sm font-medium mt-1">
                                {Number(invoice.total || 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                              </p>
                            </div>
                            <ExternalLink className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No hay facturas asociadas</p>
                  </div>
                )}
              </TabsContent>

              {/* Quotes Tab */}
              <TabsContent value="quotes" className="space-y-3">
                {clientQuotes.length > 0 ? (
                  clientQuotes.map((quote) => (
                    <Card 
                      key={quote.id} 
                      className="hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => handleOpenQuote(quote)}
                    >
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div>
                              <p className="font-medium">{quote.name || `Presupuesto #${quote.quote_number}`}</p>
                              <p className="text-sm text-muted-foreground">
                                {quote.valid_until
                                  ? `Válido hasta: ${format(new Date(quote.valid_until), "dd MMM yyyy", { locale: es })}`
                                  : "Sin fecha de validez"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <Badge
                                variant={
                                  quote.status === "aceptado"
                                    ? "default"
                                    : quote.status === "enviado"
                                    ? "secondary"
                                    : "outline"
                                }
                              >
                                {quote.status === "aceptado"
                                  ? "Aprobado"
                                  : quote.status === "enviado"
                                  ? "Enviado"
                                  : quote.status === "borrador"
                                  ? "Borrador"
                                  : "Rechazado"}
                              </Badge>
                              <p className="text-sm font-medium mt-1">
                                {Number(quote.total || 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}
                              </p>
                            </div>
                            <ExternalLink className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No hay presupuestos asociados</p>
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Sub-dialogs for editing */}
      <ContractFormDialog
        open={contractDialogOpen}
        onOpenChange={(open) => {
          setContractDialogOpen(open);
          if (!open) setSelectedContract(null);
        }}
        contract={selectedContract || undefined}
      />

      <InvoiceFormDialog
        open={invoiceDialogOpen}
        onOpenChange={(open) => {
          setInvoiceDialogOpen(open);
          if (!open) setSelectedInvoice(null);
        }}
        invoice={selectedInvoice}
      />

      <QuoteFormDialog
        open={quoteDialogOpen}
        onOpenChange={(open) => {
          setQuoteDialogOpen(open);
          if (!open) setSelectedQuote(null);
        }}
        quote={selectedQuote}
      />
    </>
  );
}