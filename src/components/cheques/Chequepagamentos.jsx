import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Upload, Loader2, Wallet, User, DollarSign, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { base44 } from '@/api/base44Client';
import { motion } from "framer-motion";

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

export default function ChequePagamentoModal({ isOpen, onClose, cheque, onSave, isProcessing, representantes = [] }) {
  const [pagamentoForm, setPagamentoForm] = useState({
    valor: '',
    metodo: 'dinheiro',
    parcelas: 1,
    comprovante: null,
    representante: '', 
    // Estrutura completa igual ao Chequesdevolvidos.jsx
    novoCheque: { 
        banco: '', 
        agencia: '', 
        conta: '', 
        numero: '', 
        valor: '', 
        vencimento: '', 
        emitente: '' 
    }
  });
  const [isUploading, setIsUploading] = useState(false);

  // Preenche valores iniciais
  useEffect(() => {
    if (cheque && isOpen) {
      setPagamentoForm({
        valor: cheque.valor || '',
        metodo: 'dinheiro',
        parcelas: 1,
        comprovante: null,
        representante: cheque.representante_nome || '',
        novoCheque: { 
            banco: '', 
            agencia: '', 
            conta: '', 
            numero: '', 
            valor: cheque.valor || '', 
            vencimento: '', 
            emitente: '' 
        }
      });
    }
  }, [cheque, isOpen]);

  // Sincroniza valor do pagamento com valor do cheque
  const handleValorChange = (val) => {
      setPagamentoForm(prev => ({
          ...prev, 
          valor: val,
          novoCheque: { ...prev.novoCheque, valor: val }
      }));
  };

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
    if (!pagamentoForm.valor) return toast.error("Informe o valor pago.");
    
    if (pagamentoForm.metodo === 'cheque_troca') {
        if(!pagamentoForm.novoCheque.numero || !pagamentoForm.novoCheque.valor || !pagamentoForm.novoCheque.banco) {
            return toast.error("Preencha os dados obrigatórios do novo cheque (Banco, Número, Valor).");
        }
    }
    
    onSave(pagamentoForm);
  };

  if (!isOpen || !cheque) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-[#F8FAFC]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-700">
            <Wallet className="w-5 h-5"/> Regularizar Devolução
          </DialogTitle>
          <div className="text-sm text-slate-500">
            Cheque Original: <strong>#{cheque.numero_cheque}</strong> - {cheque.titular}
          </div>
        </DialogHeader>

        <div className="space-y-5 py-2 max-h-[70vh] overflow-y-auto px-1">
          
          {/* Resumo de Valores */}
          <div className="grid grid-cols-2 gap-4">
             <Card className="p-4 bg-white border-slate-200 shadow-sm">
                <span className="text-xs text-slate-500 font-bold uppercase block mb-1">Valor Original</span>
                <span className="text-slate-800 font-bold text-xl">{formatCurrency(cheque.valor)}</span>
             </Card>
             <Card className="p-4 bg-emerald-50 border-emerald-100 shadow-sm relative">
                <span className="text-xs text-emerald-600 font-bold uppercase block mb-1">Valor Pago Agora</span>
                <DollarSign className="absolute left-3 bottom-3 w-4 h-4 text-emerald-600" />
                <Input 
                    type="number" 
                    className="h-9 pl-8 bg-white border-emerald-200 text-emerald-800 font-bold text-lg focus-visible:ring-emerald-500" 
                    value={pagamentoForm.valor} 
                    onChange={(e) => handleValorChange(e.target.value)} 
                />
             </Card>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Forma de Pagamento</Label>
              <Select value={pagamentoForm.metodo} onValueChange={(v) => setPagamentoForm({...pagamentoForm, metodo: v})}>
                <SelectTrigger className="bg-white"><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dinheiro">Dinheiro / Espécie</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="cartao">Cartão</SelectItem>
                  <SelectItem value="cheque_troca">Outro Cheque (Troca)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Quem Recebeu? (Representante)</Label>
              <Select value={pagamentoForm.representante} onValueChange={(v) => setPagamentoForm({...pagamentoForm, representante: v})}>
                <SelectTrigger className="bg-white"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="interno">Interno / Escritório</SelectItem>
                  {representantes.map(rep => (
                      <SelectItem key={rep.id} value={rep.nome}>{rep.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {pagamentoForm.metodo === 'cartao' && (
            <div className="space-y-1 animate-in fade-in">
              <Label>Parcelas</Label>
              <Input type="number" min="1" value={pagamentoForm.parcelas} onChange={(e) => setPagamentoForm({...pagamentoForm, parcelas: e.target.value})} className="bg-white" />
            </div>
          )}

          {/* FORMULÁRIO COMPLETO DE NOVO CHEQUE (Igual ao Wizard) */}
          {pagamentoForm.metodo === 'cheque_troca' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden">
                <Card className="border border-slate-200 shadow-sm overflow-hidden">
                    <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-blue-600" />
                        <h4 className="font-bold text-xs uppercase text-slate-600">Dados do Novo Cheque (Troca)</h4>
                    </div>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 bg-white">
                        <div className="space-y-1">
                            <Label className="text-xs">Número *</Label>
                            <Input placeholder="Ex: 000123" value={pagamentoForm.novoCheque.numero} onChange={(e) => setPagamentoForm(prev => ({...prev, novoCheque: {...prev.novoCheque, numero: e.target.value}}))} />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Banco *</Label>
                            <Select onValueChange={(v) => setPagamentoForm(prev => ({...prev, novoCheque: {...prev.novoCheque, banco: v}}))} value={pagamentoForm.novoCheque.banco}>
                                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="BRADESCO">Bradesco</SelectItem>
                                    <SelectItem value="ITAU">Itaú</SelectItem>
                                    <SelectItem value="SANTANDER">Santander</SelectItem>
                                    <SelectItem value="CAIXA">Caixa</SelectItem>
                                    <SelectItem value="BRASIL">Banco do Brasil</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Agência</Label>
                            <Input placeholder="0000" value={pagamentoForm.novoCheque.agencia} onChange={(e) => setPagamentoForm(prev => ({...prev, novoCheque: {...prev.novoCheque, agencia: e.target.value}}))} />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Conta</Label>
                            <Input placeholder="00000-0" value={pagamentoForm.novoCheque.conta} onChange={(e) => setPagamentoForm(prev => ({...prev, novoCheque: {...prev.novoCheque, conta: e.target.value}}))} />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Valor (R$) *</Label>
                            <Input type="number" value={pagamentoForm.novoCheque.valor} onChange={(e) => setPagamentoForm(prev => ({...prev, novoCheque: {...prev.novoCheque, valor: e.target.value}}))} />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Bom Para *</Label>
                            <Input type="date" value={pagamentoForm.novoCheque.vencimento} onChange={(e) => setPagamentoForm(prev => ({...prev, novoCheque: {...prev.novoCheque, vencimento: e.target.value}}))} />
                        </div>
                        <div className="md:col-span-2 space-y-1">
                            <Label className="text-xs">Titular / Emitente</Label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                                <Input className="pl-8" placeholder="Nome do titular" value={pagamentoForm.novoCheque.emitente} onChange={(e) => setPagamentoForm(prev => ({...prev, novoCheque: {...prev.novoCheque, emitente: e.target.value}}))} />
                            </div>
                        </div>
                    </div>
                </Card>
            </motion.div>
          )}

          <div className="space-y-1">
            <Label>Comprovante</Label>
            <Button variant="outline" className="w-full relative h-10 bg-white" disabled={isUploading}>
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Upload className="w-4 h-4 mr-2"/>} 
                {pagamentoForm.comprovante ? <span className="text-emerald-600 font-bold">Arquivo Anexado</span> : 'Anexar Comprovante'}
                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleUpload(e.target.files[0])} />
            </Button>
          </div>
        </div>

        <DialogFooter className="border-t border-slate-200 pt-4 bg-slate-50/50 -mx-6 -mb-6 px-6 pb-6 mt-2">
          <Button variant="outline" onClick={onClose} disabled={isProcessing} className="bg-white">Cancelar</Button>
          <Button onClick={handleConfirm} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-200" disabled={isProcessing || isUploading}>
             {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <CheckCircle className="w-4 h-4 mr-2"/>}
             Confirmar Liquidação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}