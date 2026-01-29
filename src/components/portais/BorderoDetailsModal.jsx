import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Download, CreditCard, Image as ImageIcon } from "lucide-react";
import { format } from "date-fns";

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

export default function BorderoDetailsModal({ bordero, pedidos, open, onClose }) {
  if (!bordero) return null;

  const pedidosDoBordero = pedidos.filter(p => bordero.pedidos_ids?.includes(p.id));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0" style={{ scrollbarWidth: 'auto', scrollbarColor: '#888 #f1f1f1' }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="w-5 h-5 text-blue-600" />
            Borderô #{bordero.numero_bordero}
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 px-6 pb-6" style={{ scrollbarWidth: 'auto', scrollbarColor: '#888 #f1f1f1' }}>
          <div className="space-y-6">
            {/* Cabeçalho */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-blue-600 font-bold uppercase">Nº Borderô</p>
                  <p className="text-2xl font-bold text-blue-800">#{bordero.numero_bordero}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 font-bold uppercase">Valor Total</p>
                  <p className="text-xl font-bold text-slate-800">{formatCurrency(bordero.valor_total)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 font-bold uppercase">Data</p>
                  <p className="text-sm font-medium text-slate-800">
                    {bordero.created_date ? format(new Date(bordero.created_date), 'dd/MM/yyyy HH:mm') : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 font-bold uppercase">Tipo</p>
                  <Badge className="mt-1">{bordero.tipo_liquidacao}</Badge>
                </div>
              </div>
              {bordero.cliente_nome && (
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <p className="text-xs text-blue-600 font-bold">CLIENTE</p>
                  <p className="text-sm font-medium text-slate-800">{bordero.cliente_nome}</p>
                </div>
              )}
            </div>

            {/* Lista de Pedidos */}
            <div>
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Pedidos Liquidados ({pedidosDoBordero.length})
              </h3>
              {pedidosDoBordero.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead>Nº Pedido</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="text-right">Saldo Pago</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pedidosDoBordero.map(p => (
                        <TableRow key={p.id}>
                          <TableCell className="font-mono font-medium">#{p.numero_pedido}</TableCell>
                          <TableCell>{p.cliente_nome}</TableCell>
                          <TableCell className="text-right text-slate-600">{formatCurrency(p.valor_pedido)}</TableCell>
                          <TableCell className="text-right font-bold text-emerald-600">
                            {formatCurrency(p.saldo_restante || 0)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center py-4 bg-slate-50 rounded-lg">
                  Nenhum pedido vinculado.
                </p>
              )}
            </div>

            {/* Forma de Pagamento */}
            {bordero.forma_pagamento && (
              <div className="border border-slate-200 rounded-lg p-4">
                <p className="text-xs text-slate-600 font-bold uppercase mb-2">Forma de Pagamento</p>
                <p className="text-sm font-medium text-slate-800">{bordero.forma_pagamento}</p>
              </div>
            )}

            {/* Comprovantes */}
            {bordero.comprovantes_urls && bordero.comprovantes_urls.length > 0 && (
              <div>
                <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Comprovantes de Pagamento ({bordero.comprovantes_urls.length})
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {bordero.comprovantes_urls.map((url, idx) => (
                    <div key={idx} className="relative group">
                      <img 
                        src={url} 
                        alt={`Comprovante ${idx + 1}`} 
                        className="w-full aspect-square object-cover rounded-lg border-2 border-slate-200 cursor-pointer hover:border-blue-400 transition-all"
                        onClick={() => window.open(url, '_blank')}
                      />
                      <a 
                        href={url} 
                        download 
                        className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      >
                        <Download className="w-4 h-4 text-slate-600" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cheques */}
            {bordero.cheques_anexos && bordero.cheques_anexos.length > 0 && (
              <div>
                <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Cheques Vinculados ({bordero.cheques_anexos.length})
                </h3>
                <div className="grid gap-3">
                  {bordero.cheques_anexos.map((cheque, idx) => (
                    <div key={idx} className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-xl p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <CreditCard className="w-5 h-5 text-amber-600" />
                            <p className="font-bold text-lg text-slate-800">Cheque #{cheque.numero_cheque}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                            <div>
                              <span className="text-slate-500">Banco:</span>
                              <span className="ml-2 font-medium text-slate-800">{cheque.banco}</span>
                            </div>
                            <div>
                              <span className="text-slate-500">Valor:</span>
                              <span className="ml-2 font-bold text-emerald-600">{formatCurrency(cheque.valor)}</span>
                            </div>
                            {cheque.data_bom_para && (
                              <div>
                                <span className="text-slate-500">Bom Para:</span>
                                <span className="ml-2 font-medium text-slate-800">
                                  {format(new Date(cheque.data_bom_para), 'dd/MM/yyyy')}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      {cheque.anexo_foto_url && (
                        <div className="mt-3 pt-3 border-t border-amber-200">
                          <img 
                            src={cheque.anexo_foto_url} 
                            alt="Foto do Cheque" 
                            className="w-full max-w-md rounded-lg border border-amber-300 cursor-pointer hover:opacity-80"
                            onClick={() => window.open(cheque.anexo_foto_url, '_blank')}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Observações */}
            {bordero.observacao && (
              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                <p className="text-xs text-slate-600 font-bold uppercase mb-2">Observações</p>
                <p className="text-sm text-slate-700">{bordero.observacao}</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}