import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Upload, Loader2, FileText, Wallet } from "lucide-react";
import { toast } from "sonner";
import { base44 } from '@/api/base44Client';

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

export default function ChequePagamentoModal({ isOpen, onClose, cheque, onSave, isProcessing }) {
  const [pagamentoForm, setPagamentoForm] = useState({
    valor: cheque ? cheque.valor : '',
    metodo: 'dinheiro',
    parcelas: 1,
    comprovante: null,
    novoCheque: { numero: '', banco: '', vencimento: '', valor: cheque ? cheque.valor : '' }
  });
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (file) => {
    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setPagamentoForm(prev => ({ ...prev, comprovante: file_url }));
      toast.success("Comprovante anexado!");
    } catch (e) {
      toast.error("Erro no upload");
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirm = () => {
    if (!pagamentoForm.valor) return toast.error("Informe o valor.");
    onSave(pagamentoForm);
  };

  if (!isOpen || !cheque) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Regularizar Cheque Devolvido</DialogTitle>
          <DialogDescription>
            Registrar pagamento para o cheque <strong>#{cheque.numero_cheque}</strong> de {cheque.titular}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <Card className="p-3 bg-red-50 border-red-100 flex justify-between items-center">
             <span className="text-red-800 font-medium">Valor Original</span>
             <span className="text-red-800 font-bold text-lg">{formatCurrency(cheque.valor)}</span>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Valor Pago Agora</Label>
              <Input type="number" value={pagamentoForm.valor} onChange={(e) => setPagamentoForm({...pagamentoForm, valor: e.target.value})} />
            </div>
            <div className="space-y-1">
              <Label>Forma Pagamento</Label>
              <Select value={pagamentoForm.metodo} onValueChange={(v) => setPagamentoForm({...pagamentoForm, metodo: v})}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="cartao">Cartão</SelectItem>
                  <SelectItem value="cheque_troca">Outro Cheque (Troca)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {pagamentoForm.metodo === 'cartao' && (
            <div className="space-y-1">
              <Label>Parcelas</Label>
              <Input type="number" value={pagamentoForm.parcelas} onChange={(e) => setPagamentoForm({...pagamentoForm, parcelas: e.target.value})} />
            </div>
          )}

          {pagamentoForm.metodo === 'cheque_troca' && (
            <Card className="p-4 bg-blue-50 border-blue-100">
              <Label className="mb-2 block font-bold text-blue-800 flex items-center gap-2"><Wallet className="w-4 h-4"/> Novo Cheque</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Banco" onChange={(e) => setPagamentoForm(prev => ({...prev, novoCheque: {...prev.novoCheque, banco: e.target.value}}))} className="bg-white" />
                <Input placeholder="Número" onChange={(e) => setPagamentoForm(prev => ({...prev, novoCheque: {...prev.novoCheque, numero: e.target.value}}))} className="bg-white" />
                <Input type="number" placeholder="Valor" value={pagamentoForm.novoCheque.valor} onChange={(e) => setPagamentoForm(prev => ({...prev, novoCheque: {...prev.novoCheque, valor: e.target.value}}))} className="bg-white" />
                <Input type="date" onChange={(e) => setPagamentoForm(prev => ({...prev, novoCheque: {...prev.novoCheque, vencimento: e.target.value}}))} className="bg-white" />
              </div>
            </Card>
          )}

          <div className="space-y-1">
            <Label>Comprovante</Label>
            <Button variant="outline" className="w-full relative" disabled={isUploading}>
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Upload className="w-4 h-4 mr-2"/>} 
                {pagamentoForm.comprovante ? 'Alterar Comprovante' : 'Anexar Comprovante'}
                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleUpload(e.target.files[0])} />
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>Cancelar</Button>
          <Button onClick={handleConfirm} className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isProcessing || isUploading}>
             {isProcessing ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Confirmar Pagamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}