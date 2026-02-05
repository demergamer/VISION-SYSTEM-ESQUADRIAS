import React, { useState, useMemo } from 'react';
import { 
  Search, Upload, ChevronRight, AlertCircle, Loader2, CheckCircle2, 
  Wallet, CreditCard, Banknote, QrCode, RefreshCw, ArrowLeft, Image as ImageIcon,
  CalendarDays, Hash, DollarSign, Building2, User, Plus, Trash2
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

// --- COMPONENTES VISUAIS ---

const StepIndicator = ({ currentStep }) => (
  <div className="flex items-center justify-center w-full py-4 bg-slate-50/50 border-b border-slate-100">
    {[
      { id: 1, label: "Seleção" },
      { id: 2, label: "Motivos" },
      { id: 3, label: "Financeiro" }
    ].map((step, idx) => (
      <div key={step.id} className="flex items-center">
        <div className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300",
          currentStep === step.id ? "bg-white shadow-md border border-slate-200 text-blue-600" : 
          currentStep > step.id ? "text-green-600" : "text-slate-400"
        )}>
          <div className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border",
            currentStep === step.id ? "bg-blue-600 border-blue-600 text-white" : 
            currentStep > step.id ? "bg-green-500 border-green-500 text-white" : "border-slate-300"
          )}>
            {currentStep > step.id ? <CheckCircle2 className="w-3.5 h-3.5" /> : step.id}
          </div>
          <span className="text-sm font-medium">{step.label}</span>
        </div>
        {idx < 2 && <div className="w-8 h-0.5 bg-slate-200 mx-2" />}
      </div>
    ))}
  </div>
);

const PaymentMethodCard = ({ icon: Icon, label, selected, onClick, colorClass }) => (
  <div 
    onClick={onClick}
    className={cn(
      "relative cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95 h-24",
      selected 
        ? `border-${colorClass}-500 bg-${colorClass}-50/50 text-${colorClass}-700 shadow-sm` 
        : "border-slate-100 bg-white hover:border-slate-200 text-slate-500"
    )}
  >
    <div className={cn("p-2 rounded-full", selected ? `bg-${colorClass}-100` : "bg-slate-100")}>
        <Icon className={cn("w-5 h-5", selected ? `text-${colorClass}-600` : "text-slate-400")} />
    </div>
    <span className="text-xs font-bold">{label}</span>
    {selected && <div className={`absolute top-2 right-2 w-2 h-2 rounded-full bg-${colorClass}-500`} />}
  </div>
);

// --- COMPONENTE PRINCIPAL ---

export default function RegistrarDevolucaoModal({ isOpen, onClose, todosCheques, onSave, preSelectedIds }) {
  const [step, setStep] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState(preSelectedIds || []);
  const [devolucaoDetails, setDevolucaoDetails] = useState({}); 
  const [pagarAgora, setPagarAgora] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [pagamentoForm, setPagamentoForm] = useState({
    valor: '',
    metodo: 'dinheiro',
    parcelas: 1,
    comprovante: null,
    // AGORA É UM ARRAY PARA SUPORTAR MÚLTIPLOS CHEQUES
    novosCheques: [
        { banco: '', agencia: '', conta: '', numero: '', valor: '', vencimento: '', emitente: '' }
    ]
  });

  const chequesDisponiveis = useMemo(() => {
    return todosCheques.filter(c => 
      c.status !== 'excluido' && c.status !== 'devolvido' && c.status !== 'compensado' &&
      (c.numero_cheque?.toLowerCase().includes(searchTerm.toLowerCase()) || 
       c.titular?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       c.valor?.toString().includes(searchTerm))
    );
  }, [todosCheques, searchTerm]);

  const chequesSelecionados = useMemo(() => {
    return todosCheques.filter(c => selectedIds.includes(c.id));
  }, [todosCheques, selectedIds]);

  const totalDivida = chequesSelecionados.reduce((acc, c) => acc + c.valor, 0);

  // Manipulação de múltiplos cheques
  const handleUpdateCheque = (index, field, value) => {
      const novos = [...pagamentoForm.novosCheques];
      novos[index][field] = value;
      setPagamentoForm({ ...pagamentoForm, novosCheques: novos });
  };

  const handleAddCheque = () => {
      setPagamentoForm({
          ...pagamentoForm,
          novosCheques: [...pagamentoForm.novosCheques, { banco: '', agencia: '', conta: '', numero: '', valor: '', vencimento: '', emitente: '' }]
      });
  };

  const handleRemoveCheque = (index) => {
      if (pagamentoForm.novosCheques.length === 1) return; // Não remove o último
      const novos = pagamentoForm.novosCheques.filter((_, i) => i !== index);
      setPagamentoForm({ ...pagamentoForm, novosCheques: novos });
  };

  // Soma automática dos cheques para validar
  const totalChequesLancados = pagamentoForm.novosCheques.reduce((acc, c) => acc + (parseFloat(c.valor) || 0), 0);

  const handleUpload = async (file, chequeId) => {
    if (!file) return;
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
      toast.error("Erro no upload.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFinalizar = () => {
    const motivosPreenchidos = chequesSelecionados.every(c => devolucaoDetails[c.id]?.motivo);
    if (!motivosPreenchidos) return toast.error("Informe o motivo da devolução para todos os cheques.");
    
    if (pagarAgora) {
        if (!pagamentoForm.valor) return toast.error("Informe o valor total do pagamento.");
        
        if (pagamentoForm.metodo === 'cheque_troca') {
            // Valida se todos os cheques têm dados
            const chequesValidos = pagamentoForm.novosCheques.every(c => c.numero && c.valor && c.banco);
            if (!chequesValidos) return toast.error("Preencha Número, Banco e Valor de todos os cheques.");
            
            // Valida soma (opcional, mas bom ter)
            const diff = Math.abs(parseFloat(pagamentoForm.valor) - totalChequesLancados);
            if (diff > 0.05) return toast.warning(`A soma dos cheques (${formatCurrency(totalChequesLancados)}) difere do valor do pagamento (${formatCurrency(pagamentoForm.valor)}).`, { duration: 5000 });
        }
    }

    onSave({
      cheques_ids: selectedIds,
      detalhes_devolucao: devolucaoDetails,
      pagamento: pagarAgora ? pagamentoForm : null
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-[#F8FAFC]">
        
        {/* HEADER */}
        <div className="bg-white border-b border-slate-200">
            <div className="p-6 pb-2">
                <DialogTitle className="text-xl font-bold text-slate-800">Registrar Devolução</DialogTitle>
            </div>
            <StepIndicator currentStep={step} />
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 md:px-12">
          <AnimatePresence mode="wait">
            
            {/* PASSO 1: SELEÇÃO */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 sticky top-0 z-10">
                  <Search className="w-5 h-5 text-slate-400" />
                  <Input placeholder="Filtrar por número, titular ou valor..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="border-0 shadow-none focus-visible:ring-0 text-base h-auto p-0 bg-transparent" />
                </div>
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="w-[50px] text-center"></TableHead>
                        <TableHead>Cheque</TableHead>
                        <TableHead>Titular</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {chequesDisponiveis.map(cheque => (
                        <TableRow key={cheque.id} className={cn("cursor-pointer hover:bg-slate-50", selectedIds.includes(cheque.id) && "bg-blue-50/50")} onClick={() => setSelectedIds(prev => prev.includes(cheque.id) ? prev.filter(i => i !== cheque.id) : [...prev, cheque.id])}>
                          <TableCell className="text-center" onClick={e => e.stopPropagation()}><Checkbox checked={selectedIds.includes(cheque.id)} onCheckedChange={(checked) => setSelectedIds(prev => checked ? [...prev, cheque.id] : prev.filter(id => id !== cheque.id))} /></TableCell>
                          <TableCell><div className="font-mono font-bold text-slate-700">#{cheque.numero_cheque}</div><div className="text-xs text-slate-400">{cheque.banco}</div></TableCell>
                          <TableCell>{cheque.titular}</TableCell>
                          <TableCell className="text-right font-bold text-slate-700">{formatCurrency(cheque.valor)}</TableCell>
                          <TableCell className="text-center"><Badge variant="outline">{cheque.status}</Badge></TableCell>
                        </TableRow>
                      ))}
                      {chequesDisponiveis.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-12 text-slate-400">Nenhum cheque encontrado.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex justify-between items-center bg-blue-50 text-blue-800 p-4 rounded-xl border border-blue-100">
                    <span className="font-medium">Selecionados: <strong>{selectedIds.length}</strong></span>
                    <span className="text-lg font-bold">{formatCurrency(chequesSelecionados.reduce((a,c)=>a+c.valor,0))}</span>
                </div>
              </motion.div>
            )}

            {/* PASSO 2: MOTIVOS (MANTIDO IGUAL) */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                    {chequesSelecionados.map(cheque => (
                    <Card key={cheque.id} className="overflow-hidden border-slate-200 shadow-sm">
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-slate-200 shadow-sm">
                                    <Wallet className="w-5 h-5 text-slate-400" />
                                </div>
                                <div><p className="font-bold text-slate-700 text-sm">Cheque #{cheque.numero_cheque}</p><p className="text-xs text-slate-400">{cheque.banco}</p></div>
                            </div>
                            <span className="font-bold text-red-600 bg-red-50 px-3 py-1 rounded text-sm">{formatCurrency(cheque.valor)}</span>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white">
                            <div className="space-y-2">
                                <Label className="text-slate-600">Motivo da Devolução</Label>
                                <Select onValueChange={(val) => setDevolucaoDetails(prev => ({...prev, [cheque.id]: {...prev[cheque.id], motivo: val}}))}>
                                <SelectTrigger className="h-11 border-slate-200 bg-slate-50/50"><SelectValue placeholder="Selecione o motivo..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="11">11 - Sem Fundos (1ª)</SelectItem>
                                    <SelectItem value="12">12 - Sem Fundos (2ª)</SelectItem>
                                    <SelectItem value="21">21 - Sustado</SelectItem>
                                    <SelectItem value="outros">Outros</SelectItem>
                                </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-600">Comprovante / Verso</Label>
                                <div className="relative">
                                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={(e) => handleUpload(e.target.files[0], cheque.id)} disabled={isUploading} />
                                    <div className={cn("flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-lg h-11 transition-colors", devolucaoDetails[cheque.id]?.file ? "bg-green-50 border-green-200 text-green-700" : "bg-slate-50 text-slate-500 hover:bg-slate-100")}>
                                        {isUploading ? <Loader2 className="w-4 h-4 animate-spin"/> : devolucaoDetails[cheque.id]?.file ? <CheckCircle2 className="w-4 h-4"/> : <ImageIcon className="w-4 h-4"/>}
                                        <span className="text-sm font-medium">{devolucaoDetails[cheque.id]?.file ? 'Anexado' : 'Clique para enviar foto'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                    ))}
                </div>
              </motion.div>
            )}

            {/* --- PASSO 3: FINANCEIRO (COM MÚLTIPLOS CHEQUES) --- */}
            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                
                <Card className={cn("p-5 border transition-all cursor-pointer", pagarAgora ? "bg-white border-blue-200 ring-2 ring-blue-100" : "bg-slate-50 border-slate-200")}>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2"><RefreshCw className={cn("w-5 h-5", pagarAgora ? "text-blue-600" : "text-slate-400")} /> Regularizar Financeiro Agora?</h3>
                      <p className="text-sm text-slate-500">Lançar um pagamento imediato para abater esta devolução.</p>
                    </div>
                    <Switch checked={pagarAgora} onCheckedChange={setPagarAgora} className="data-[state=checked]:bg-blue-600"/>
                  </div>
                </Card>
                
                {pagarAgora && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <PaymentMethodCard icon={Banknote} label="Dinheiro" colorClass="emerald" selected={pagamentoForm.metodo === 'dinheiro'} onClick={() => setPagamentoForm(p => ({...p, metodo: 'dinheiro'}))} />
                        <PaymentMethodCard icon={QrCode} label="PIX" colorClass="teal" selected={pagamentoForm.metodo === 'pix'} onClick={() => setPagamentoForm(p => ({...p, metodo: 'pix'}))} />
                        <PaymentMethodCard icon={CreditCard} label="Cartão" colorClass="violet" selected={pagamentoForm.metodo === 'cartao'} onClick={() => setPagamentoForm(p => ({...p, metodo: 'cartao'}))} />
                        <PaymentMethodCard icon={RefreshCw} label="Troca (Cheque)" colorClass="blue" selected={pagamentoForm.metodo === 'cheque_troca'} onClick={() => setPagamentoForm(p => ({...p, metodo: 'cheque_troca'}))} />
                    </div>

                    {/* VALOR GLOBAL DO PAGAMENTO */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Valor Total do Pagamento</Label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <Input type="number" className="pl-10 h-12 text-lg font-bold text-slate-700 bg-white" value={pagamentoForm.valor} onChange={(e) => setPagamentoForm({...pagamentoForm, valor: e.target.value})} placeholder={totalDivida.toFixed(2)} />
                            </div>
                            <p className="text-xs text-slate-400 text-right">Dívida Total: {formatCurrency(totalDivida)}</p>
                        </div>

                        <div className="space-y-2">
                            <Label>Comprovante Geral</Label>
                            <div className="relative">
                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={(e) => handleUpload(e.target.files[0], null)} disabled={isUploading} />
                                <Button variant="outline" className="w-full h-12 justify-start text-slate-500 bg-white border-dashed border-2 hover:bg-slate-50">
                                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Upload className="w-4 h-4 mr-2"/>} 
                                    {pagamentoForm.comprovante ? <span className="text-green-600 font-bold">Arquivo Anexado</span> : "Anexar Comprovante"}
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* --- LISTA DE MÚLTIPLOS CHEQUES DE TROCA --- */}
                    {pagamentoForm.metodo === 'cheque_troca' && (
                      <div className="space-y-4">
                          <div className="flex justify-between items-center">
                              <h4 className="font-bold text-sm text-slate-700 uppercase tracking-wide flex items-center gap-2"><Wallet className="w-4 h-4"/> Cheques Recebidos</h4>
                              <Badge variant={Math.abs(totalChequesLancados - parseFloat(pagamentoForm.valor)) < 0.05 ? "success" : "destructive"}>
                                  Soma: {formatCurrency(totalChequesLancados)}
                              </Badge>
                          </div>

                          {pagamentoForm.novosCheques.map((novoCheque, index) => (
                              <motion.div key={index} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden relative group">
                                <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                                    <span className="font-bold text-xs text-slate-500">Cheque #{index + 1}</span>
                                    {pagamentoForm.novosCheques.length > 1 && (
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:text-red-600" onClick={() => handleRemoveCheque(index)}><Trash2 className="w-3 h-3"/></Button>
                                    )}
                                </div>
                                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Número *</Label>
                                        <Input placeholder="Ex: 000123" value={novoCheque.numero} onChange={(e) => handleUpdateCheque(index, 'numero', e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Banco *</Label>
                                        <Select onValueChange={(v) => handleUpdateCheque(index, 'banco', v)} value={novoCheque.banco}>
                                            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
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
                                        <Input placeholder="0000" value={novoCheque.agencia} onChange={(e) => handleUpdateCheque(index, 'agencia', e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Conta</Label>
                                        <Input placeholder="00000-0" value={novoCheque.conta} onChange={(e) => handleUpdateCheque(index, 'conta', e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Valor (R$) *</Label>
                                        <Input type="number" value={novoCheque.valor} onChange={(e) => handleUpdateCheque(index, 'valor', e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Bom Para *</Label>
                                        <Input type="date" value={novoCheque.vencimento} onChange={(e) => handleUpdateCheque(index, 'vencimento', e.target.value)} />
                                    </div>
                                    <div className="md:col-span-2 space-y-1">
                                        <Label className="text-xs">Titular / Emitente</Label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                                            <Input className="pl-8" placeholder="Nome do titular" value={novoCheque.emitente} onChange={(e) => handleUpdateCheque(index, 'emitente', e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                              </motion.div>
                          ))}

                          <Button variant="outline" className="w-full border-dashed border-2 text-blue-600 border-blue-100 hover:bg-blue-50" onClick={handleAddCheque}>
                              <Plus className="w-4 h-4 mr-2"/> Adicionar Outro Cheque
                          </Button>
                      </div>
                    )}

                    {pagamentoForm.metodo === 'cartao' && (
                        <div className="space-y-2 animate-in fade-in">
                            <Label>Parcelas</Label>
                            <Input type="number" min="1" value={pagamentoForm.parcelas} onChange={(e) => setPagamentoForm({...pagamentoForm, parcelas: e.target.value})} className="h-11 bg-white" />
                        </div>
                    )}

                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* FOOTER */}
        <DialogFooter className="bg-white p-4 border-t border-slate-100 flex items-center justify-between w-full">
          {step > 1 ? (
            <Button variant="outline" onClick={() => setStep(step - 1)} className="gap-2 h-11"><ArrowLeft className="w-4 h-4"/> Voltar</Button>
          ) : <div/>}
          
          {step < 3 ? (
            <Button onClick={() => setStep(step + 1)} disabled={selectedIds.length === 0} className="bg-slate-900 hover:bg-slate-800 text-white h-11 px-8 gap-2 shadow-lg shadow-slate-200">
              Próximo <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={handleFinalizar} disabled={isUploading} className="bg-red-600 hover:bg-red-700 text-white h-11 px-8 gap-2 shadow-lg shadow-red-200">
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertCircle className="w-4 h-4" />}
              Confirmar Devolução
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}