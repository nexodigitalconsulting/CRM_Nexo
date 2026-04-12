"use client";

import { useState } from 'react';
import { useEmailLogs, EmailLog } from '@/hooks/useEmailLogs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Search, Mail, Paperclip, AlertCircle, CheckCircle, Clock, Eye } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export function EmailLogsPanel() {
  const { data: logs = [], isLoading } = useEmailLogs();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<EmailLog | null>(null);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.recipient_email.toLowerCase().includes(search.toLowerCase()) ||
      log.subject.toLowerCase().includes(search.toLowerCase()) ||
      log.sender_email.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    const matchesProvider = providerFilter === 'all' || log.provider === providerFilter;
    
    return matchesSearch && matchesStatus && matchesProvider;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Enviado</Badge>;
      case 'failed':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Error</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pendiente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getProviderBadge = (provider: string) => {
    switch (provider) {
      case 'smtp':
        return <Badge variant="outline">SMTP</Badge>;
      case 'gmail':
        return <Badge variant="outline" className="border-red-500 text-red-600">Gmail</Badge>;
      case 'outlook':
        return <Badge variant="outline" className="border-blue-500 text-blue-600">Outlook</Badge>;
      default:
        return <Badge variant="outline">{provider}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Historial de Correos Enviados
          </CardTitle>
          <CardDescription>
            Registro de todos los correos enviados automáticamente desde el sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por email, asunto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="sent">Enviados</SelectItem>
                <SelectItem value="failed">Fallidos</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
              </SelectContent>
            </Select>
            <Select value={providerFilter} onValueChange={setProviderFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Proveedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="smtp">SMTP</SelectItem>
                <SelectItem value="gmail">Gmail</SelectItem>
                <SelectItem value="outlook">Outlook</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Estadísticas rápidas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{logs.length}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div className="bg-green-500/10 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{logs.filter(l => l.status === 'sent').length}</div>
              <div className="text-xs text-muted-foreground">Enviados</div>
            </div>
            <div className="bg-red-500/10 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-red-600">{logs.filter(l => l.status === 'failed').length}</div>
              <div className="text-xs text-muted-foreground">Fallidos</div>
            </div>
            <div className="bg-blue-500/10 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-600">{logs.filter(l => l.attachment_count > 0).length}</div>
              <div className="text-xs text-muted-foreground">Con adjuntos</div>
            </div>
          </div>

          {/* Tabla */}
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Destinatario</TableHead>
                  <TableHead>Asunto</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Adjuntos</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No hay registros de correos
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(log.sent_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{log.recipient_name || '-'}</span>
                          <span className="text-xs text-muted-foreground">{log.recipient_email}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{log.subject}</TableCell>
                      <TableCell>{getProviderBadge(log.provider)}</TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell>
                        {log.attachment_count > 0 && (
                          <Badge variant="outline" className="gap-1">
                            <Paperclip className="h-3 w-3" />
                            {log.attachment_count}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedLog(log)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Modal de detalle */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalle del Correo</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Fecha de envío</label>
                  <p>{format(new Date(selectedLog.sent_at), "dd/MM/yyyy HH:mm:ss", { locale: es })}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Estado</label>
                  <div className="mt-1">{getStatusBadge(selectedLog.status)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Remitente</label>
                  <p>{selectedLog.sender_name} &lt;{selectedLog.sender_email}&gt;</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Destinatario</label>
                  <p>{selectedLog.recipient_name || '-'} &lt;{selectedLog.recipient_email}&gt;</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Proveedor</label>
                  <div className="mt-1">{getProviderBadge(selectedLog.provider)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Entidad</label>
                  <p>{selectedLog.entity_type || '-'} {selectedLog.entity_id ? `(${selectedLog.entity_id.slice(0, 8)}...)` : ''}</p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Asunto</label>
                <p className="font-medium">{selectedLog.subject}</p>
              </div>

              {selectedLog.body_preview && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Vista previa del contenido</label>
                  <p className="text-sm bg-muted p-3 rounded-md mt-1">{selectedLog.body_preview}</p>
                </div>
              )}

              {selectedLog.attachments && selectedLog.attachments.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Adjuntos</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedLog.attachments.map((att, i) => (
                      <Badge key={i} variant="secondary" className="gap-1">
                        <Paperclip className="h-3 w-3" />
                        {att.name} ({att.type})
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedLog.error_message && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
                  <label className="text-sm font-medium text-destructive">Error</label>
                  <p className="text-sm text-destructive">{selectedLog.error_message}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
