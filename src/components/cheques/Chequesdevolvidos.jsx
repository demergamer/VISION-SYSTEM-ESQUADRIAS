import React, { useState, useMemo } from 'react';
import { 
  Search, Upload, FileText, ChevronRight, AlertCircle, 
  Loader2, CheckCircle2, Wallet, CreditCard, Banknote, QrCode, RefreshCw, X, ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

// Componente visual para os passos
const StepIndicator = ({ currentStep }) => (
  <div className="flex items-center justify-center mb-6 space-x-4">
    {[1, 2, 3].map((step) => (
      <div key={step} className="flex items-center">
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 border-2",
          currentStep === step ? "bg-red-600 border-red-600 text-white" : 
          currentStep > step ? "bg-green-500 border-green-500 text-white" : "bg-white border-slate-200 text-slate-400"
        )}>
          {currentStep > step ? <CheckCircle2 className="w-5 h-5" /> : step}
        </div>
        {step < 3 && <div className={cn("w-12 h-0.5 mx-2", currentStep > step ? "bg-green-500" : "bg-slate-200")} />}
      </div>
    ))}
  </div>
);

// Card de Seleção de Método de Pagamento
const PaymentMethodCard = ({ icon: Icon, label, selected, onClick }) => (
  <div 
    onClick={onClick}
    className={cn(
      "cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center justify-center gap-2 transition-all hover:bg-slate-50",
      selected ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-100 text-slate-500"
    )}
  >
    <Icon className={cn("w-6 h-6", selected ? "text-blue-600" : "text-slate-400")} />
    <span className="text-xs font-bold">{label}</span>
  </div>
);

export default function RegistrarDevolucaoModal({ isOpen, onClose, todosCheques, onSave, preSelectedIds }) {
  const [step, setStep] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState(preSelectedIds || []);
  const [devolucaoDetails, setDevolucaoDetails] = useState({}); 
  const [pagarAgora, setPagarAgora] = useState(false);
  const [pagamentoForm, setPagamentoForm] = useState({
    valor: '',
    metodo: 'dinheiro',
    parcelas: 1,
    comprovante: null,
    novoCheque: { numero: '', banco: '', vencimento: '', valor: '' }
  });
  const [isUploading, setIsUploading] = useState(false);

  const chequesDisponiveis = useMemo(() => {
    return todosCheques.filter(c => 
      c.status !== 'excluido' && 
      c.status !== 'devolvido' && 
      c.status !== 'compensado' &&
      (c.numero_cheque?.toLowerCase().includes(searchTerm.toLowerCase()) || 
       c.titular?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       c.valor?.toString().includes(searchTerm))
    );
  }, [todosCheques, searchTerm]);

  const chequesSelecionados = useMemo(() => {
    return todosCheques.filter(c => selectedIds.includes(c.id));
  }, [todosCheques, selectedIds]);

  const totalDivida = chequesSelecionados.reduce((acc, c) => acc + c.valor, 0);

  const handleUpload = async (file, chequeId) => {
    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (chequeId) {
        setDevolucaoDetails(prev => ({ ...prev, [chequeId]: { ...prev[chequeId], file: file_url } }));
      } else {
        setPagamentoForm(prev => ({ ...prev, comprovante: file_url }));
      }
      toast.success("Arquivo anexado!");
    } catch (e) {
      toast.error("Erro no upload");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFinalizar = () => {
    const motivosPreenchidos = chequesSelecionados.every(c => devolucaoDetails[c.id]?.motivo);
    if (!motivosPreenchidos) return toast.error("Informe o motivo para todos os cheques selecionados.");
    if (pagarAgora && !pagamentoForm.valor) return toast.error("Informe o valor do pagamento.");

    if (pagarAgora && pagamentoForm.metodo === 'cheque_troca') {
        if(!pagamentoForm.novoCheque.numero || !pagamentoForm.novoCheque.valor) return toast.error("Preencha os dados do novo cheque.");
    }

    onSave({
      cheques_ids: selectedIds,
      detalhes_devolucao: devolucaoDetails,
      pagamento: pagarAgora ? pagamentoForm : null
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-slate-50/50">
        
        {/* HEADER CUSTOMIZADO */}
        <div className="bg-white p-6 border-b border-slate-100 pb-2">
            <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-800">Registrar Devolução</DialogTitle>
            <p className="text-sm text-slate-500">
                {step === 1 ? 'Selecione os cheques que voltaram.' : step === 2 ? 'Informe o motivo e anexe a foto.' : 'Regularização Financeira.'}
            </p>
            </DialogHeader>
            <StepIndicator currentStep={step} />
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            
            {/* PASSO 1: SELEÇÃO */}
            {step === 1 && (
              <motion.div 
                key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input 
                    placeholder="Pesquisar cheque por número, titular..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    className="pl-10 h-12 text-base bg-white shadow-sm border-slate-200" 
                  />
                </div>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-[350px] relative">
                  <div className="overflow-y-auto h-full">
                    <Table>
                      <TableHeader className="sticky top-0 bg-slate-50 z-10 shadow-sm">
                        <TableRow>
                          <TableHead className="w-[50px]"></TableHead>
                          <TableHead>Cheque</TableHead>
                          <TableHead>Titular</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {chequesDisponiveis.map(cheque => (
                          <TableRow key={cheque.id} className={cn("hover:bg-blue-50/50 cursor-pointer transition-colors", selectedIds.includes(cheque.id) && "bg-blue-50")}>
                            <TableCell>
                              <Checkbox checked={selectedIds.includes(cheque.id)} onCheckedChange={(checked) => setSelectedIds(prev => checked ? [...prev, cheque.id] : prev.filter(id => id !== cheque.id))} />
                            </TableCell>
                            <TableCell>
                                <span className="font-mono font-bold text-slate-700">#{cheque.numero_cheque}</span>
                                <div className="text-xs text-slate-400">{cheque.banco}</div>
                            </TableCell>
                            <TableCell>{cheque.titular}</TableCell>
                            <TableCell className="text-right font-bold text-slate-700">{formatCurrency(cheque.valor)}</TableCell>
                          </TableRow>
                        ))}
                        {chequesDisponiveis.length === 0 && (
                            <TableRow><TableCell colSpan={4} className="text-center py-10 text-slate-400">Nenhum cheque encontrado.</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
                <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-sm text-slate-500">Selecionados: <strong className="text-slate-800">{selectedIds.length}</strong></span>
                    <span className="text-sm text-slate-500">Total: <strong className="text-red-600">{formatCurrency(chequesSelecionados.reduce((a,c)=>a+c.valor,0))}</strong></span>
                </div>
              </motion.div>
            )}

            {/* PASSO 2: DETALHES */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                {chequesSelecionados.map(cheque => (
                  <Card key={cheque.id} className="p-0 border-slate-200 overflow-hidden shadow-sm">
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-slate-400" />
                        <span className="font-bold text-slate-700">Cheque #{cheque.numero_cheque}</span>
                      </div>
                      <span className="font-bold text-red-600 bg-red-50 px-2 py-1 rounded text-sm">{formatCurrency(cheque.valor)}</span>
                    </div>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white">
                      <div className="space-y-2">
                        <Label>Motivo da Devolução</Label>
                        <Select onValueChange={(val) => setDevolucaoDetails(prev => ({...prev, [cheque.id]: {...prev[cheque.id], motivo: val}}))}>
                          <SelectTrigger className="bg-white"><SelectValue placeholder="Selecione o motivo..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="11"><span className="font-bold mr-2">11</span> Sem Fundos (1ª Apresentação)</SelectItem>
                            <SelectItem value="12"><span className="font-bold mr-2">12</span> Sem Fundos (2ª Apresentação)</SelectItem>
                            <SelectItem value="21"><span className="font-bold mr-2">21</span> Sustado / Contra-Ordem</SelectItem>
                            <SelectItem value="22"><span className="font-bold mr-2">22</span> Divergência de Assinatura</SelectItem>
                            <SelectItem value="31"><span className="font-bold mr-2">31</span> Erro Formal</SelectItem>
                            <SelectItem value="outros">Outros Motivos</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Evidência (Foto/Verso)</Label>
                        <div className="relative group">
                            <Button variant="outline" className={cn("w-full border-dashed border-2 h-10 hover:bg-slate-50", devolucaoDetails[cheque.id]?.file && "border-green-500 bg-green-50 text-green-700")} disabled={isUploading}>
                                {isUploading ? <Loader2 className="w-4 h-4 animate-spin"/> : devolucaoDetails[cheque.id]?.file ? <CheckCircle2 className="w-4 h-4 mr-2"/> : <Upload className="w-4 h-4 mr-2"/>}
                                {devolucaoDetails[cheque.id]?.file ? 'Arquivo Anexado' : 'Carregar Imagem'}
                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleUpload(e.target.files[0], cheque.id)} />
                            </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </motion.div>
            )}

            {/* PASSO 3: PAGAMENTO */}
            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                
                <Card className={cn("p-5 border transition-all cursor-pointer", pagarAgora ? "bg-white border-blue-200 ring-2 ring-blue-100" : "bg-slate-50 border-slate-200")}>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                        <RefreshCw className={cn("w-5 h-5", pagarAgora ? "text-blue-600" : "text-slate-400")} />
                        Regularizar Financeiro Agora?
                      </h3>
                      <p className="text-sm text-slate-500">Lançar um pagamento imediato (total ou parcial) para abater esta devolução.</p>
                    </div>
                    <Switch checked={pagarAgora} onCheckedChange={setPagarAgora} className="data-[state=checked]:bg-blue-600"/>
                  </div>
                </Card>
                
                {pagarAgora && (
                  <div className="space-y-5 animate-in fade-in slide-in-from-top-2 p-1">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Valor a Pagar (R$)</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">R$</span>
                            <Input type="number" className="pl-8 text-lg font-bold text-slate-700 h-12" value={pagamentoForm.valor} onChange={(e) => setPagamentoForm({...pagamentoForm, valor: e.target.value})} placeholder={totalDivida.toFixed(2)} />
                        </div>
                        <p className="text-xs text-slate-400 text-right">Dívida Total: {formatCurrency(totalDivida)}</p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Forma de Pagamento</Label>
                        <div className="grid grid-cols-4 gap-2">
                            <PaymentMethodCard icon={Banknote} label="Dinheiro" selected={pagamentoForm.metodo === 'dinheiro'} onClick={() => setPagamentoForm(p => ({...p, metodo: 'dinheiro'}))} />
                            <PaymentMethodCard icon={QrCode} label="PIX" selected={pagamentoForm.metodo === 'pix'} onClick={() => setPagamentoForm(p => ({...p, metodo: 'pix'}))} />
                            <PaymentMethodCard icon={CreditCard} label="Cartão" selected={pagamentoForm.metodo === 'cartao'} onClick={() => setPagamentoForm(p => ({...p, metodo: 'cartao'}))} />
                            <PaymentMethodCard icon={RefreshCw} label="Troca" selected={pagamentoForm.metodo === 'cheque_troca'} onClick={() => setPagamentoForm(p => ({...p, metodo: 'cheque_troca'}))} />
                        </div>
                      </div>
                    </div>

                    {pagamentoForm.metodo === 'cartao' && (
                      <div className="space-y-2 animate-in fade-in">
                        <Label>Número de Parcelas</Label>
                        <Input type="number" min="1" value={pagamentoForm.parcelas} onChange={(e) => setPagamentoForm({...pagamentoForm, parcelas: e.target.value})} className="h-11" />
                      </div>
                    )}

                    {pagamentoForm.metodo === 'cheque_troca' && (
                      <Card className="p-4 bg-blue-50 border-blue-200 animate-in fade-in">
                        <Label className="mb-3 block font-bold text-blue-800 flex items-center gap-2"><Wallet className="w-4 h-4"/> Dados do Novo Cheque (Troca)</Label>
                        <div className="grid grid-cols-2 gap-3">
                          <Input placeholder="Banco" className="bg-white border-blue-100" onChange={(e) => setPagamentoForm(prev => ({...prev, novoCheque: {...prev.novoCheque, banco: e.target.value}}))} />
                          <Input placeholder="Número" className="bg-white border-blue-100" onChange={(e) => setPagamentoForm(prev => ({...prev, novoCheque: {...prev.novoCheque, numero: e.target.value}}))} />
                          <div className="relative">
                             <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">R$</span>
                             <Input type="number" placeholder="Valor" className="bg-white border-blue-100 pl-8" onChange={(e) => setPagamentoForm(prev => ({...prev, novoCheque: {...prev.novoCheque, valor: e.target.value}}))} />
                          </div>
                          <Input type="date" className="bg-white border-blue-100" onChange={(e) => setPagamentoForm(prev => ({...prev, novoCheque: {...prev.novoCheque, vencimento: e.target.value}}))} />
                        </div>
                      </Card>
                    )}

                    <div className="space-y-2">
                      <Label>Comprovante</Label>
                      <Button variant="outline" className="w-full h-12 border-dashed border-2 relative hover:bg-slate-50" disabled={isUploading}>
                          {isUploading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Upload className="w-4 h-4 mr-2 text-slate-400"/>} 
                          {pagamentoForm.comprovante ? <span className="text-green-600 font-bold flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/> Comprovante Anexado</span> : <span className="text-slate-500">Clique para anexar comprovante</span>}
                          <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleUpload(e.target.files[0], null)} />
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <DialogFooter className="bg-white p-4 border-t border-slate-100 flex justify-between items-center">
          {step > 1 ? (
            <Button variant="outline" onClick={() => setStep(step - 1)} className="gap-2"><ArrowLeft className="w-4 h-4"/> Voltar</Button>
          ) : <div></div>}
          
          {step < 3 ? (
            <Button onClick={() => setStep(step + 1)} disabled={selectedIds.length === 0} className="bg-slate-900 text-white hover:bg-slate-800 gap-2 px-6">
              Próximo Passo <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={handleFinalizar} disabled={isUploading} className="bg-red-600 hover:bg-red-700 text-white gap-2 px-6 shadow-lg shadow-red-200">
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertCircle className="w-4 h-4" />}
              Confirmar Devolução
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}