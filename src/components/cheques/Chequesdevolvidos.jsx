import React, { useState, useMemo } from 'react';
import { 
  Search, Upload, FileText, ChevronRight, AlertCircle, 
  Loader2, CheckCircle2, Wallet, CreditCard 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { base44 } from '@/api/base44Client';

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

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

  // Filtra cheques válidos (não excluídos, não devolvidos, não compensados)
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

    const payload = {
      cheques_ids: selectedIds,
      detalhes_devolucao: devolucaoDetails,
      pagamento: pagarAgora ? pagamentoForm : null
    };
    onSave(payload);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Registrar Devolução</DialogTitle>
          <DialogDescription>Passo {step} de 3: {step===1?'Seleção':step===2?'Motivos':'Financeiro'}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-2 space-y-4">
          {/* PASSO 1: SELEÇÃO */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input placeholder="Pesquisar cheque..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
              <div className="border rounded-md h-[300px] overflow-y-auto">
                <Table>
                  <TableHeader><TableRow><TableHead className="w-[50px]"></TableHead><TableHead>Cheque</TableHead><TableHead>Titular</TableHead><TableHead>Valor</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {chequesDisponiveis.map(cheque => (
                      <TableRow key={cheque.id}>
                        <TableCell><Checkbox checked={selectedIds.includes(cheque.id)} onCheckedChange={(checked) => setSelectedIds(prev => checked ? [...prev, cheque.id] : prev.filter(id => id !== cheque.id))} /></TableCell>
                        <TableCell>#{cheque.numero_cheque}</TableCell>
                        <TableCell>{cheque.titular}</TableCell>
                        <TableCell>{formatCurrency(cheque.valor)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="text-right text-sm text-slate-500">{selectedIds.length} selecionados</p>
            </div>
          )}

          {/* PASSO 2: DETALHES */}
          {step === 2 && chequesSelecionados.map(cheque => (
            <Card key={cheque.id} className="p-4 border-slate-200">
              <div className="flex justify-between mb-2 font-bold text-slate-700"><span>Cheque #{cheque.numero_cheque}</span><span>{formatCurrency(cheque.valor)}</span></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Motivo Devolução</Label>
                  <Select onValueChange={(val) => setDevolucaoDetails(prev => ({...prev, [cheque.id]: {...prev[cheque.id], motivo: val}}))}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="11">11 - Sem Fundos (1ª)</SelectItem>
                      <SelectItem value="12">12 - Sem Fundos (2ª)</SelectItem>
                      <SelectItem value="21">21 - Sustado</SelectItem>
                      <SelectItem value="outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Frente/Verso</Label>
                  <Button variant="outline" className="w-full relative" disabled={isUploading}>
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Upload className="w-4 h-4 mr-2"/>} Upload
                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleUpload(e.target.files[0], cheque.id)} />
                  </Button>
                </div>
              </div>
            </Card>
          ))}

          {/* PASSO 3: PAGAMENTO */}
          {step === 3 && (
            <div className="space-y-4">
              <Card className="p-4 bg-slate-50 flex justify-between items-center">
                <Label className="text-base">Lançar Pagamento Agora?</Label>
                <Switch checked={pagarAgora} onCheckedChange={setPagarAgora} />
              </Card>
              
              {pagarAgora && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label>Valor Pago</Label>
                      <Input type="number" value={pagamentoForm.valor} onChange={(e) => setPagamentoForm({...pagamentoForm, valor: e.target.value})} placeholder={totalDivida} />
                    </div>
                    <div className="space-y-1">
                      <Label>Forma Pagamento</Label>
                      <Select value={pagamentoForm.metodo} onValueChange={(v) => setPagamentoForm({...pagamentoForm, metodo: v})}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dinheiro">Dinheiro</SelectItem>
                          <SelectItem value="pix">PIX</SelectItem>
                          <SelectItem value="cartao">Cartão</SelectItem>
                          <SelectItem value="cheque_troca">Outro Cheque</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {pagamentoForm.metodo === 'cheque_troca' && (
                    <Card className="p-4 bg-blue-50 border-blue-100">
                      <Label className="mb-2 block font-bold text-blue-800">Dados do Novo Cheque</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="Banco" onChange={(e) => setPagamentoForm(prev => ({...prev, novoCheque: {...prev.novoCheque, banco: e.target.value}}))} />
                        <Input placeholder="Número" onChange={(e) => setPagamentoForm(prev => ({...prev, novoCheque: {...prev.novoCheque, numero: e.target.value}}))} />
                        <Input type="number" placeholder="Valor" onChange={(e) => setPagamentoForm(prev => ({...prev, novoCheque: {...prev.novoCheque, valor: e.target.value}}))} />
                        <Input type="date" onChange={(e) => setPagamentoForm(prev => ({...prev, novoCheque: {...prev.novoCheque, vencimento: e.target.value}}))} />
                      </div>
                    </Card>
                  )}

                  <div className="space-y-1">
                    <Label>Comprovante</Label>
                    <Button variant="outline" className="w-full relative">
                        <Upload className="w-4 h-4 mr-2"/> Anexar Comprovante
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleUpload(e.target.files[0], null)} />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="mt-4 border-t pt-4">
          {step > 1 && <Button variant="outline" onClick={() => setStep(step - 1)}>Voltar</Button>}
          {step < 3 ? <Button onClick={() => setStep(step + 1)} disabled={selectedIds.length === 0}>Próximo</Button> : <Button onClick={handleFinalizar} className="bg-red-600 hover:bg-red-700 text-white">Concluir Devolução</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}