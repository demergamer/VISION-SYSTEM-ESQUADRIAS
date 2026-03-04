import React, { useState, useMemo, useEffect } from 'react';
import { Search, Upload, ChevronRight, AlertCircle, Loader2, CheckCircle2, Wallet, Image as ImageIcon, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// O Modal de Devolução agora usa o ModalContainer oficial
import ModalContainer from "@/components/modals/ModalContainer";

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

const StepIndicator = ({ currentStep }) => (
  <div className="flex items-center justify-center w-full py-4 bg-slate-50/50 border-b border-slate-100">
    {[
      { id: 1, label: "Seleção" },
      { id: 2, label: "Motivos" }
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
        {idx < 1 && <div className="w-8 h-0.5 bg-slate-200 mx-2" />}
      </div>
    ))}
  </div>
);

export default function RegistrarDevolucaoModal({ isOpen, onClose, todosCheques, onSave, preSelectedIds }) {
  const [step, setStep] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [devolucaoDetails, setDevolucaoDetails] = useState({}); 
  const [isUploading, setIsUploading] = useState(false);

  // Sincroniza IDs pré-selecionados e reseta os passos ao abrir o modal
  useEffect(() => {
    if (isOpen) {
        setSelectedIds(preSelectedIds || []);
        setStep(1);
        setSearchTerm('');
        setDevolucaoDetails({});
    }
  }, [isOpen, preSelectedIds]);

  const chequesDisponiveis = useMemo(() => {
    return todosCheques.filter(c => 
      c.status !== 'excluido' && c.status !== 'devolvido' && c.status !== 'compensado' &&
      (c.numero_cheque?.toLowerCase().includes(searchTerm.toLowerCase()) || 
       c.emitente?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [todosCheques, searchTerm]);

  const chequesSelecionados = useMemo(() => {
    return todosCheques.filter(c => selectedIds.includes(c.id));
  }, [todosCheques, selectedIds]);

  const handleUpload = async (file, chequeId) => {
    if (!file) return;
    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setDevolucaoDetails(prev => ({ ...prev, [chequeId]: { ...prev[chequeId], file: file_url } }));
      toast.success("Foto anexada!");
    } catch (e) {
      toast.error("Erro no upload.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFinalizar = () => {
    const motivosPreenchidos = chequesSelecionados.every(c => devolucaoDetails[c.id]?.motivo);
    if (!motivosPreenchidos) return toast.error("Informe o motivo da devolução para todos os cheques.");
    
    // Simplificado apenas para registrar devolução, pagamentos ocorrem num fluxo separado
    onSave({ cheques_ids: selectedIds, detalhes_devolucao: devolucaoDetails, pagamento: null });
  };

  return (
    <ModalContainer 
        open={isOpen} 
        onClose={onClose} 
        title="Registrar Devolução" 
        size="3xl"
    >
      <div className="flex flex-col h-full">
        {/* Cabeçalho com Passos (Estica até a borda do ModalContainer) */}
        <div className="-mt-4 -mx-4 sm:-mt-6 sm:-mx-6 mb-6">
            <StepIndicator currentStep={step} />
        </div>

        <div className="flex-1 overflow-y-auto px-2">
          <AnimatePresence mode="wait">
            
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div className="bg-slate-50 p-3 rounded-lg border flex items-center gap-3">
                  <Search className="w-4 h-4 text-slate-400" />
                  <Input placeholder="Filtrar por número ou emitente..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="border-0 bg-transparent focus-visible:ring-0 h-8" />
                </div>
                
                <div className="border rounded-lg overflow-hidden bg-white min-h-[300px]">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead>Nº Cheque</TableHead>
                        <TableHead>Emitente</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {chequesDisponiveis.map(cheque => (
                        <TableRow key={cheque.id} className={cn("cursor-pointer hover:bg-slate-50", selectedIds.includes(cheque.id) && "bg-blue-50/50")} onClick={() => setSelectedIds(prev => prev.includes(cheque.id) ? prev.filter(i => i !== cheque.id) : [...prev, cheque.id])}>
                          <TableCell onClick={e => e.stopPropagation()}>
                              <Checkbox checked={selectedIds.includes(cheque.id)} onCheckedChange={(checked) => setSelectedIds(prev => checked ? [...prev, cheque.id] : prev.filter(id => id !== cheque.id))} />
                          </TableCell>
                          <TableCell className="font-mono font-bold text-slate-700">#{cheque.numero_cheque}</TableCell>
                          <TableCell>{cheque.emitente}</TableCell>
                          <TableCell className="text-right font-bold text-slate-700">{formatCurrency(cheque.valor)}</TableCell>
                        </TableRow>
                      ))}
                      {chequesDisponiveis.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-12 text-slate-400">Nenhum cheque válido encontrado para o termo "{searchTerm}".</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-between items-center bg-blue-50 text-blue-800 p-4 rounded-xl border border-blue-100">
                    <span className="font-medium">Selecionados: <strong>{selectedIds.length}</strong></span>
                    <span className="text-lg font-bold">{formatCurrency(chequesSelecionados.reduce((a,c)=>a+c.valor,0))}</span>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                {chequesSelecionados.map(cheque => (
                  <Card key={cheque.id} className="overflow-hidden border-slate-200 shadow-sm">
                      <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                          <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-slate-200"><Wallet className="w-5 h-5 text-slate-400" /></div>
                              <div><p className="font-bold text-slate-700 text-sm">Cheque #{cheque.numero_cheque}</p><p className="text-xs text-slate-400">{cheque.banco}</p></div>
                          </div>
                          <span className="font-bold text-red-600 bg-red-50 px-3 py-1 rounded text-sm">{formatCurrency(cheque.valor)}</span>
                      </div>
                      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white">
                          <div className="space-y-2">
                              <Label>Motivo da Devolução</Label>
                              <Select onValueChange={(val) => setDevolucaoDetails(prev => ({...prev, [cheque.id]: {...prev[cheque.id], motivo: val}}))}>
                                  <SelectTrigger className="h-11"><SelectValue placeholder="Selecione o motivo..." /></SelectTrigger>
                                  {/* Z-INDEX para não ficar atrás do Modal */}
                                  <SelectContent className="z-[99999]">
                                      <SelectItem value="11">11 - Sem Fundos (1ª)</SelectItem>
                                      <SelectItem value="12">12 - Sem Fundos (2ª)</SelectItem>
                                      <SelectItem value="21">21 - Sustado</SelectItem>
                                      <SelectItem value="outros">Outros</SelectItem>
                                  </SelectContent>
                              </Select>
                          </div>
                          <div className="space-y-2">
                              <Label>Comprovante / Verso (Opcional)</Label>
                              <div className="relative">
                                  <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={(e) => handleUpload(e.target.files[0], cheque.id)} disabled={isUploading} />
                                  <Button variant="outline" className={cn("w-full h-11 justify-start border-dashed border-2", devolucaoDetails[cheque.id]?.file ? "bg-green-50 border-green-200 text-green-700" : "")}>
                                      {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : devolucaoDetails[cheque.id]?.file ? <CheckCircle2 className="w-4 h-4 mr-2"/> : <Upload className="w-4 h-4 mr-2"/>} 
                                      {devolucaoDetails[cheque.id]?.file ? <span className="font-bold">Foto Anexada</span> : 'Anexar Foto'}
                                  </Button>
                              </div>
                          </div>
                      </div>
                  </Card>
                ))}
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* FOOTER */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 mt-4 flex items-center justify-between rounded-b-lg">
          {step > 1 ? (
            <Button variant="outline" onClick={() => setStep(step - 1)} className="gap-2 h-11 bg-white"><ArrowLeft className="w-4 h-4"/> Voltar</Button>
          ) : (
            <Button variant="outline" onClick={onClose} className="h-11 bg-white">Cancelar</Button>
          )}
          
          {step < 2 ? (
            <Button onClick={() => setStep(step + 1)} disabled={selectedIds.length === 0} className="bg-slate-900 hover:bg-slate-800 text-white h-11 px-8 gap-2">
                Próximo ({selectedIds.length}) <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={handleFinalizar} disabled={isUploading} className="bg-red-600 hover:bg-red-700 text-white h-11 px-8 gap-2 shadow-md shadow-red-200">
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertCircle className="w-4 h-4" />} 
                Confirmar Devolução
            </Button>
          )}
        </div>
      </div>
    </ModalContainer>
  );
}