import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Loader2, CreditCard, Banknote } from "lucide-react";
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

export default function ChequePagamentoModal({ isOpen, onClose, cheque, onSave, isProcessing }) {
  const [pagamento, setPagamento] = useState({ metodo: 'dinheiro', comprovante: null, novoCheque: null });

  if (!cheque) return null;

  const handleFileUpload = async (file) => {
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setPagamento(prev => ({ ...prev, comprovante: file_url }));
      toast.success("Comprovante enviado!");
    } catch (e) {
      toast.error("Erro ao enviar arquivo.");
    }
  };

  const handleSave = () => {
    if (!pagamento.comprovante && pagamento.metodo !== 'cheque_troca') {
      toast.error("Anexe o comprovante de pagamento.");
      return;
    }

    if (pagamento.metodo === 'cheque_troca' && (!pagamento.novoCheque?.numero || !pagamento.novoCheque?.banco || !pagamento.novoCheque?.valor)) {
      toast.error("Preencha os dados do novo cheque.");
      return;
    }

    onSave(pagamento);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><DollarSign className="w-5 h-5 text-emerald-600" /> Regularizar Cheque Devolvido</DialogTitle>
          <DialogDescription>Registre o pagamento referente ao cheque devolvido.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* INFO DO CHEQUE */}
          <div className="bg-slate-50 border rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-slate-800">Cheque #{cheque.numero_cheque}</p>
                <p className="text-sm text-slate-600">{cheque.banco} - {cheque.cliente_nome}</p>
                {cheque.motivo_devolucao && <Badge className="mt-2 bg-red-100 text-red-700 border-red-200">{cheque.motivo_devolucao}</Badge>}
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-slate-800">{formatCurrency(cheque.valor)}</p>
                <p className="text-xs text-slate-500">Valor devolvido</p>
              </div>
            </div>
          </div>

          {/* MÉTODO DE PAGAMENTO */}
          <div className="space-y-2">
            <Label className="text-sm font-bold text-slate-700">Método de Pagamento</Label>
            <Select value={pagamento.metodo} onValueChange={(v) => setPagamento({ ...pagamento, metodo: v, novoCheque: v === 'cheque_troca' ? {} : null })}>
              <SelectTrigger className="bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dinheiro"><div className="flex items-center gap-2"><Banknote className="w-4 h-4" /> Dinheiro</div></SelectItem>
                <SelectItem value="pix"><div className="flex items-center gap-2"><CreditCard className="w-4 h-4" /> PIX</div></SelectItem>
                <SelectItem value="transferencia">Transferência Bancária</SelectItem>
                <SelectItem value="cheque_troca">Troca por Novo Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* TROCA POR NOVO CHEQUE */}
          {pagamento.metodo === 'cheque_troca' && (
            <div className="space-y-3 border-l-4 border-blue-500 pl-4 py-2">
              <p className="text-sm font-bold text-slate-700">Dados do Novo Cheque</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-600">Número do Cheque</Label>
                  <Input placeholder="Ex: 123456" onChange={(e) => setPagamento({ ...pagamento, novoCheque: { ...pagamento.novoCheque, numero: e.target.value } })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-600">Banco</Label>
                  <Input placeholder="Ex: Itaú" onChange={(e) => setPagamento({ ...pagamento, novoCheque: { ...pagamento.novoCheque, banco: e.target.value } })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-600">Valor</Label>
                  <Input type="number" step="0.01" placeholder="0,00" onChange={(e) => setPagamento({ ...pagamento, novoCheque: { ...pagamento.novoCheque, valor: e.target.value } })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-600">Vencimento</Label>
                  <Input type="date" onChange={(e) => setPagamento({ ...pagamento, novoCheque: { ...pagamento.novoCheque, vencimento: e.target.value } })} />
                </div>
              </div>
            </div>
          )}

          {/* COMPROVANTE */}
          {pagamento.metodo !== 'cheque_troca' && (
            <div className="space-y-2">
              <Label className="text-sm font-bold text-slate-700">Comprovante de Pagamento</Label>
              <Input type="file" accept="image/*,application/pdf" onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0])} className="bg-white" />
              {pagamento.comprovante && <Badge className="mt-2 bg-green-100 text-green-700">Comprovante anexado</Badge>}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isProcessing} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <DollarSign className="w-4 h-4 mr-2" />}
            Confirmar Pagamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}