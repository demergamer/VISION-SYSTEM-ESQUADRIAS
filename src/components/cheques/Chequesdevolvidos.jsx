import React, { useState, useMemo } from 'react';
import { 
  Search, Upload, ChevronRight, AlertCircle, Loader2, CheckCircle2, 
  Wallet, CreditCard, Banknote, QrCode, RefreshCw, ArrowLeft, Image as ImageIcon,
  CalendarDays, Hash, DollarSign, Building
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

// --- COMPONENTES VISUAIS AUXILIARES ---

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
      "relative cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95 h-28",
      selected 
        ? `border-${colorClass}-500 bg-${colorClass}-50/50 text-${colorClass}-700 shadow-sm` 
        : "border-slate-100 bg-white hover:border-slate-200 text-slate-500"
    )}
  >
    <div className={cn("p-2 rounded-full", selected ? `bg-${colorClass}-100` : "bg-slate-100")}>
        <Icon className={cn("w-6 h-6", selected ? `text-${colorClass}-600` : "text-slate-400")} />
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
  const [pagamentoForm, setPagamentoForm] = useState({
    valor: '',
    metodo: 'dinheiro',
    parcelas: 1,
    comprovante: null,
    novoCheque: { numero: '', banco: '', vencimento: '', valor: '' }
  });
  const [isUploading, setIsUploading] = useState(false);

  // Filtragem inteligente
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
      toast.success("Arquivo anexado com sucesso!");
    } catch (e) {
      toast.error("Falha no upload da imagem.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFinalizar = () => {
    const motivosPreenchidos = chequesSelecionados.every(c => devolucaoDetails[c.id]?.motivo);
    if (!motivosPreenchidos) {
        toast.error("Por favor, selecione o motivo da devolução para todos os cheques.");
        return;
    }
    
    if (pagarAgora) {
        if (!pagamentoForm.valor) return toast.error("Informe o valor do pagamento.");
        if (pagamentoForm.metodo === 'cheque_troca' && (!pagamentoForm.novoCheque.numero || !pagamentoForm.novoCheque.valor)) {
            return toast.error("Preencha os dados do novo cheque.");
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

        {/* BODY COM SCROLL */}
        <div className="flex-1 overflow-y-auto p-6 md:px-12">
          <AnimatePresence mode="wait">
            
            {/* --- PASSO 1: SELEÇÃO --- */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 sticky top-0 z-10">
                  <Search className="w-5 h-5 text-slate-400" />
                  <Input 
                    placeholder="Filtrar por número, titular ou valor..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    className="border-0 shadow-none focus-visible:ring-0 text-base h-auto p-0 bg-transparent placeholder:text-slate-400" 
                  />
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
                          <TableCell className="text-center" onClick={e => e.stopPropagation()}>
                            <Checkbox checked={selectedIds.includes(cheque.id)} onCheckedChange={(checked) => setSelectedIds(prev => checked ? [...prev, cheque.id] : prev.filter(id => id !== cheque.id))} />
                          </TableCell>
                          <TableCell>
                              <div className="font-mono font-bold text-slate-700">#{cheque.numero_cheque}</div>
                              <div className="text-xs text-slate-400">{cheque.banco}</div>
                          </TableCell>
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

            {/* --- PASSO 2: MOTIVOS --- */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                    {chequesSelecionados.map(cheque => (
                    <Card key={cheque.id} className="overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-slate-200 shadow-sm">
                                    <Wallet className="w-5 h-5 text-slate-400" />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-700 text-sm">Cheque #{cheque.numero_cheque}</p>
                                    <p className="text-xs text-slate-400">{cheque.banco}</p>
                                </div>
                            </div>
                            <Badge variant="secondary" className="text-base px-3 bg-white border-slate-200 text-slate-700">{formatCurrency(cheque.valor)}</Badge>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white">
                            <div className="space-y-2">
                                <Label className="text-slate-600">Motivo da Devolução</Label>
                                <Select onValueChange={(val) => setDevolucaoDetails(prev => ({...prev, [cheque.id]: {...prev[cheque.id], motivo: val}}))}>
                                <SelectTrigger className="h-11 border-slate-200 bg-slate-50/50"><SelectValue placeholder="Selecione o motivo..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="11"><span className="font-mono font-bold text-slate-500 mr-2">11</span> Sem Fundos (1ª)</SelectItem>
                                    <SelectItem value="12"><span className="font-mono font-bold text-slate-500 mr-2">12</span> Sem Fundos (2ª)</SelectItem>
                                    <SelectItem value="21"><span className="font-mono font-bold text-slate-500 mr-2">21</span> Sustado</SelectItem>
                                    <SelectItem value="22"><span className="font-mono font-bold text-slate-500 mr-2">22</span> Divergência</SelectItem>
                                    <SelectItem value="31"><span className="font-mono font-bold text-slate-500 mr-2">31</span> Erro Formal</SelectItem>
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

            {/* --- PASSO 3: FINANCEIRO --- */}
            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                
                <div className="bg-indigo-900 rounded-2xl p-6 text-white flex flex-col md:flex-row items-center justify-between shadow-lg shadow-indigo-900/10">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/10 rounded-full"><RefreshCw className="w-6 h-6 text-indigo-100" /></div>
                        <div>
                            <h3 className="text-lg font-bold">Regularizar Agora?</h3>
                            <p className="text-indigo-200 text-sm">Lance o pagamento ou troca para abater esta dívida.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 mt-4 md:mt-0 bg-white/10 px-4 py-2 rounded-lg">
                        <span className="text-sm font-medium">Habilitar</span>
                        <Switch checked={pagarAgora} onCheckedChange={setPagarAgora} className="data-[state=checked]:bg-green-400" />
                    </div>
                </div>
                
                {pagarAgora && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    
                    {/* Grid de Pagamento */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <PaymentMethodCard icon={Banknote} label="Dinheiro" colorClass="emerald" selected={pagamentoForm.metodo === 'dinheiro'} onClick={() => setPagamentoForm(p => ({...p, metodo: 'dinheiro'}))} />
                        <PaymentMethodCard icon={QrCode} label="PIX" colorClass="teal" selected={pagamentoForm.metodo === 'pix'} onClick={() => setPagamentoForm(p => ({...p, metodo: 'pix'}))} />
                        <PaymentMethodCard icon={CreditCard} label="Cartão" colorClass="violet" selected={pagamentoForm.metodo === 'cartao'} onClick={() => setPagamentoForm(p => ({...p, metodo: 'cartao'}))} />
                        <PaymentMethodCard icon={RefreshCw} label="Troca (Cheque)" colorClass="blue" selected={pagamentoForm.metodo === 'cheque_troca'} onClick={() => setPagamentoForm(p => ({...p, metodo: 'cheque_troca'}))} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Valor do Pagamento</Label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <Input type="number" className="pl-10 h-12 text-lg font-bold text-slate-700 bg-white" value={pagamentoForm.valor} onChange={(e) => setPagamentoForm({...pagamentoForm, valor: e.target.value})} placeholder={totalDivida.toFixed(2)} />
                            </div>
                            <p className="text-xs text-slate-400 text-right">Total Pendente: {formatCurrency(totalDivida)}</p>
                        </div>

                        {/* Upload Comprovante Genérico */}
                        <div className="space-y-2">
                            <Label>Comprovante</Label>
                            <div className="relative">
                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={(e) => handleUpload(e.target.files[0], null)} disabled={isUploading} />
                                <Button variant="outline" className="w-full h-12 justify-start text-slate-500 bg-white border-dashed border-2 hover:bg-slate-50">
                                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Upload className="w-4 h-4 mr-2"/>} 
                                    {pagamentoForm.comprovante ? <span className="text-green-600 font-bold">Arquivo Anexado</span> : "Anexar Comprovante"}
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* FORMULÁRIO DE TROCA DE CHEQUE (Estilo Talão) */}
                    {pagamentoForm.metodo === 'cheque_troca' && (
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#fdfbf7] border border-orange-200 rounded-xl p-6 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-orange-100 rounded-bl-full opacity-50"></div>
                        
                        <div className="flex items-center gap-2 mb-4 text-orange-800">
                            <Wallet className="w-5 h-5" />
                            <h4 className="font-bold text-sm uppercase tracking-wide">Novo Cheque (Troca)</h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                            <div className="md:col-span-8 space-y-1">
                                <Label className="text-xs text-orange-700 uppercase font-bold">Banco</Label>
                                <div className="relative">
                                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-300" />
                                    <Input placeholder="Ex: Bradesco, Itaú..." className="pl-9 border-orange-200 bg-white focus:border-orange-400" onChange={(e) => setPagamentoForm(prev => ({...prev, novoCheque: {...prev.novoCheque, banco: e.target.value}}))} />
                                </div>
                            </div>
                            <div className="md:col-span-4 space-y-1">
                                <Label className="text-xs text-orange-700 uppercase font-bold">Valor</Label>
                                <Input type="number" placeholder="0,00" className="border-orange-200 bg-white font-bold text-slate-700 focus:border-orange-400" value={pagamentoForm.novoCheque.valor} onChange={(e) => setPagamentoForm(prev => ({...prev, novoCheque: {...prev.novoCheque, valor: e.target.value}}))} />
                            </div>
                            <div className="md:col-span-6 space-y-1">
                                <Label className="text-xs text-orange-700 uppercase font-bold">Número</Label>
                                <div className="relative">
                                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-300" />
                                    <Input placeholder="000000" className="pl-9 border-orange-200 bg-white font-mono focus:border-orange-400" onChange={(e) => setPagamentoForm(prev => ({...prev, novoCheque: {...prev.novoCheque, numero: e.target.value}}))} />
                                </div>
                            </div>
                            <div className="md:col-span-6 space-y-1">
                                <Label className="text-xs text-orange-700 uppercase font-bold">Bom Para</Label>
                                <div className="relative">
                                    <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-300" />
                                    <Input type="date" className="pl-9 border-orange-200 bg-white focus:border-orange-400" onChange={(e) => setPagamentoForm(prev => ({...prev, novoCheque: {...prev.novoCheque, vencimento: e.target.value}}))} />
                                </div>
                            </div>
                        </div>
                      </motion.div>
                    )}

                    {pagamentoForm.metodo === 'cartao' && (
                        <div className="space-y-2">
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