import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Upload, Loader2, Wallet, CheckCircle2, AlertTriangle, ChevronRight, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from "framer-motion";

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

export default function RegistrarDevolucaoModal({ todosCheques, onSave, preSelectedIds, onCancel }) {
  const [step, setStep] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState(preSelectedIds || []);
  const [devolucaoDetails, setDevolucaoDetails] = useState({}); 
  const [isUploading, setIsUploading] = useState(false);

  const chequesDisponiveis = todosCheques.filter(c => 
    c.status !== 'excluido' && c.status !== 'devolvido' && c.status !== 'compensado' &&
    (c.numero_cheque?.toLowerCase().includes(searchTerm.toLowerCase()) || c.emitente?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const chequesSelecionados = todosCheques.filter(c => selectedIds.includes(c.id));

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
    <div className="flex flex-col h-full bg-[#F8FAFC]">
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <AnimatePresence mode="wait">
          
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 sticky top-0 z-10">
                <Search className="w-5 h-5 text-slate-400" />
                <Input placeholder="Filtrar por número ou emitente..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="border-0 shadow-none focus-visible:ring-0 text-base h-auto p-0 bg-transparent" />
              </div>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>Cheque</TableHead>
                      <TableHead>Emitente</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {chequesDisponiveis.map(cheque => (
                      <TableRow key={cheque.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setSelectedIds(prev => prev.includes(cheque.id) ? prev.filter(i => i !== cheque.id) : [...prev, cheque.id])}>
                        <TableCell onClick={e => e.stopPropagation()}><Checkbox checked={selectedIds.includes(cheque.id)} onCheckedChange={(checked) => setSelectedIds(prev => checked ? [...prev, cheque.id] : prev.filter(id => id !== cheque.id))} /></TableCell>
                        <TableCell><div className="font-mono font-bold text-slate-700">#{cheque.numero_cheque}</div></TableCell>
                        <TableCell>{cheque.emitente}</TableCell>
                        <TableCell className="text-right font-bold text-slate-700">{formatCurrency(cheque.valor)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
                            <div><p className="font-bold text-slate-700 text-sm">#{cheque.numero_cheque}</p><p className="text-xs text-slate-400">{cheque.banco}</p></div>
                        </div>
                        <span className="font-bold text-red-600 bg-red-50 px-3 py-1 rounded text-sm">{formatCurrency(cheque.valor)}</span>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white">
                        <div className="space-y-2">
                            <Label>Motivo da Devolução</Label>
                            <Select onValueChange={(val) => setDevolucaoDetails(prev => ({...prev, [cheque.id]: {...prev[cheque.id], motivo: val}}))}>
                                <SelectTrigger className="h-11"><SelectValue placeholder="Selecione o motivo..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="11">11 - Sem Fundos (1ª)</SelectItem>
                                    <SelectItem value="12">12 - Sem Fundos (2ª)</SelectItem>
                                    <SelectItem value="21">21 - Sustado</SelectItem>
                                    <SelectItem value="outros">Outros</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Comprovante / Verso</Label>
                            <div className="relative">
                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={(e) => handleUpload(e.target.files[0], cheque.id)} disabled={isUploading} />
                                <Button variant="outline" className="w-full h-11 justify-start">
                                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Upload className="w-4 h-4 mr-2"/>} 
                                    {devolucaoDetails[cheque.id]?.file ? <span className="text-emerald-600 font-bold">Anexado</span> : 'Anexar Foto'}
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

      <div className="bg-white p-4 border-t border-slate-200 flex items-center justify-between shrink-0">
        {step > 1 ? <Button variant="outline" onClick={() => setStep(step - 1)} className="gap-2 h-11"><ArrowLeft className="w-4 h-4"/> Voltar</Button> : <Button variant="outline" onClick={onCancel} className="h-11">Cancelar</Button>}
        {step < 2 ? <Button onClick={() => setStep(step + 1)} disabled={selectedIds.length === 0} className="bg-slate-900 hover:bg-slate-800 text-white h-11 px-8 gap-2">Próximo <ChevronRight className="w-4 h-4" /></Button> : <Button onClick={handleFinalizar} disabled={isUploading} className="bg-red-600 hover:bg-red-700 text-white h-11 px-8 gap-2">{isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertCircle className="w-4 h-4" />} Confirmar Devolução</Button>}
      </div>
    </div>
  );
}
