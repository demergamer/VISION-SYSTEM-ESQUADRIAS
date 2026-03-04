import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Upload, Loader2, Wallet, DollarSign, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { base44 } from '@/api/base44Client';
import { motion } from "framer-motion";

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

export default function ChequePagamentoModal({ isOpen, onClose, cheque, onSave, isProcessing, representantes = [] }) {
  const [pagamentoForm, setPagamentoForm] = useState({
    valor: '', metodo: 'dinheiro', parcelas: 1, comprovante: null, representante: '', 
    novoCheque: { banco: '', agencia: '', conta: '', numero: '', valor: '', vencimento: '', emitente: '' }
  });
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (cheque && isOpen) {
      setPagamentoForm({
        valor: cheque.valor || '', metodo: 'dinheiro', parcelas: 1, comprovante: null, representante: '',
        novoCheque: { banco: '', agencia: '', conta: '', numero: '', valor: cheque.valor || '', vencimento: '', emitente: '' }
      });
    }
  }, [cheque, isOpen]);

  const handleUpload = async (file) => {
    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setPagamentoForm(prev => ({ ...prev, comprovante: file_url }));
      toast.success("Comprovante anexado!");
    } catch (e) { toast.error("Erro no upload"); } finally { setIsUploading(false); }
  };

  const handleConfirm = () => {
    if (!pagamentoForm.valor) return toast.error("Informe o valor pago.");
    if (pagamentoForm.metodo === 'cheque_troca' && (!pagamentoForm.novoCheque.numero || !pagamentoForm.novoCheque.valor || !pagamentoForm.novoCheque.banco)) {
        return toast.error("Preencha Banco, Número e Valor do novo cheque.");
    }
    onSave(pagamentoForm);
  };

  if (!isOpen || !cheque) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-[#F8FAFC]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-700"><Wallet className="w-5 h-5"/> Regularizar Devolução</DialogTitle>
          <div className="text-sm text-slate-500">Cheque Original: <strong>#{cheque.numero_cheque}</strong> - {cheque.emitente}</div>
        </DialogHeader>

        <div className="space-y-5 py-2 max-h-[70vh] overflow-y-auto px-1">
          <div className="grid grid-cols-2 gap-4">
             <Card className="p-4 bg-white"><span className="text-xs text-slate-500 font-bold block mb-1">Valor Original</span><span className="text-slate-800 font-bold text-xl">{formatCurrency(cheque.valor)}</span></Card>
             <Card className="p-4 bg-emerald-50 relative"><span className="text-xs text-emerald-600 font-bold block mb-1">Valor Pago</span><Input type="number" className="bg-white border-emerald-200" value={pagamentoForm.valor} onChange={(e) => setPagamentoForm(p => ({...p, valor: e.target.value}))} /></Card>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><Label>Método</Label><Select value={pagamentoForm.metodo} onValueChange={(v) => setPagamentoForm({...pagamentoForm, metodo: v})}><SelectTrigger className="bg-white"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="dinheiro">Dinheiro</SelectItem><SelectItem value="pix">PIX</SelectItem><SelectItem value="cartao">Cartão</SelectItem><SelectItem value="cheque_troca">Outro Cheque</SelectItem></SelectContent></Select></div>
            <div className="space-y-1"><Label>Representante Responsável</Label><Select value={pagamentoForm.representante} onValueChange={(v) => setPagamentoForm({...pagamentoForm, representante: v})}><SelectTrigger className="bg-white"><SelectValue placeholder="Escritório" /></SelectTrigger><SelectContent><SelectItem value="interno">Escritório</SelectItem>{representantes.map(rep => (<SelectItem key={rep.id} value={rep.nome}>{rep.nome}</SelectItem>))}</SelectContent></Select></div>
          </div>

          {pagamentoForm.metodo === 'cheque_troca' && (
            <Card className="border p-4 bg-white">
                <Label className="text-xs mb-2 block font-bold text-blue-600">DADOS DO NOVO CHEQUE</Label>
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><Label className="text-xs">Número *</Label><Input value={pagamentoForm.novoCheque.numero} onChange={(e) => setPagamentoForm(p => ({...p, novoCheque: {...p.novoCheque, numero: e.target.value}}))} /></div>
                    <div className="space-y-1"><Label className="text-xs">Banco *</Label><Input value={pagamentoForm.novoCheque.banco} onChange={(e) => setPagamentoForm(p => ({...p, novoCheque: {...p.novoCheque, banco: e.target.value}}))} /></div>
                    <div className="space-y-1"><Label className="text-xs">Valor *</Label><Input type="number" value={pagamentoForm.novoCheque.valor} onChange={(e) => setPagamentoForm(p => ({...p, novoCheque: {...p.novoCheque, valor: e.target.value}}))} /></div>
                    <div className="space-y-1"><Label className="text-xs">Bom Para</Label><Input type="date" value={pagamentoForm.novoCheque.vencimento} onChange={(e) => setPagamentoForm(p => ({...p, novoCheque: {...p.novoCheque, vencimento: e.target.value}}))} /></div>
                    <div className="col-span-2 space-y-1"><Label className="text-xs">Emitente</Label><Input value={pagamentoForm.novoCheque.emitente} onChange={(e) => setPagamentoForm(p => ({...p, novoCheque: {...p.novoCheque, emitente: e.target.value}}))} /></div>
                </div>
            </Card>
          )}
          
          <div className="space-y-1">
            <Label>Comprovante</Label>
            <div className="relative">
                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={(e) => handleUpload(e.target.files[0])} disabled={isUploading} />
                <Button variant="outline" className="w-full h-11 justify-start">{isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Upload className="w-4 h-4 mr-2"/>} {pagamentoForm.comprovante ? 'Anexado' : 'Anexar Comprovante'}</Button>
            </div>
          </div>
        </div>
        <DialogFooter className="bg-slate-50 p-4 -mx-6 -mb-6 mt-2 border-t"><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={handleConfirm} className="bg-emerald-600 hover:bg-emerald-700 text-white"><CheckCircle className="w-4 h-4 mr-2"/> Confirmar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
