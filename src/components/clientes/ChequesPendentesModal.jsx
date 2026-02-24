import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { ScrollText } from "lucide-react";

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

export default function ChequesPendentesModal({ open, onClose, cliente, cheques = [] }) {
  const chequesPendentes = cheques.filter(c =>
    c.cliente_codigo === cliente?.codigo && c.status === 'normal'
  );

  const total = chequesPendentes.reduce((sum, c) => sum + (c.valor || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-purple-600" />
            Cheques a Compensar — {cliente?.nome}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {chequesPendentes.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <ScrollText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhum cheque pendente</p>
              <p className="text-sm mt-1">Este cliente não possui cheques em carteira</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50 sticky top-0">
                <TableRow>
                  <TableHead>Nº Cheque</TableHead>
                  <TableHead>Banco</TableHead>
                  <TableHead>Agência</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Bom Para</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chequesPendentes.map(c => (
                  <TableRow key={c.id} className="hover:bg-slate-50">
                    <TableCell className="font-mono font-bold text-slate-700">#{c.numero_cheque}</TableCell>
                    <TableCell className="text-slate-600 uppercase text-xs">{c.banco || '—'}</TableCell>
                    <TableCell className="text-slate-500 text-sm">{c.agencia || '—'}</TableCell>
                    <TableCell className="text-right font-bold text-slate-800">{formatCurrency(c.valor)}</TableCell>
                    <TableCell>
                      {c.data_vencimento ? (
                        <Badge variant="outline" className="text-xs border-purple-200 text-purple-700 bg-purple-50">
                          {format(parseISO(c.data_vencimento), 'dd/MM/yyyy')}
                        </Badge>
                      ) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {chequesPendentes.length > 0 && (
          <div className="border-t pt-3 flex justify-between items-center text-sm">
            <span className="text-slate-500">{chequesPendentes.length} cheque(s)</span>
            <div className="text-right">
              <span className="text-slate-500 text-xs">Total</span>
              <p className="font-bold text-purple-700 text-lg">{formatCurrency(total)}</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}