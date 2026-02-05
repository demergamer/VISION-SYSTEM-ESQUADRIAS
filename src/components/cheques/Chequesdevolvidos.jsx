import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { base44 } from '@/api/base44Client';

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

export default function RegistrarDevolucaoModal({ isOpen, onClose, todosCheques, preSelectedIds = [], onSave }) {
  const [selectedIds, setSelectedIds] = useState(preSelectedIds);
  const [detalhes, setDetalhes] = useState({});
  const [pagamento, setPagamento] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const chequesDisponiveis = useMemo(() => {
    return todosCheques.filter(c => c.status === 'normal' || c.status === 'repassado');
  }, [todosCheques]);

  const chequesSelecionados = useMemo(() => {
    return chequesDisponiveis.filter(c => selectedIds.includes(c.id));
  }, [chequesDisponiveis, selectedIds]);

  const totalSelecionado = useMemo(() => {
    return chequesSelecionados.reduce((acc, c) => acc + c.valor, 0);
  }, [chequesSelecionados]);

  const handleToggle = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleFileUpload = async (id, file) => {
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setDetalhes(prev => ({ ...prev, [id]: { ...prev[id], file: file_url } }));
      toast.success("Arquivo enviado!");
    } catch (e) {
      toast.error("Erro ao enviar arquivo.");
    }
  };

  const handleSave = () => {
    if (selectedIds.length === 0) {
      toast.error("Selecione ao menos um cheque.");
      return;
    }

    onSave({
      cheques_ids: selectedIds,
      detalhes_devolucao: detalhes,
      pagamento
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Devolução de Cheques</DialogTitle>
          <DialogDescription>Selecione os cheques devolvidos e informe os detalhes.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* ALERTAS */}
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
            <div className="text-sm text-red-800">
              <p className="font-bold">Atenção: Registro de Devolução</p>
              <p>Esta ação marcará os cheques como devolvidos. Certifique-se de anexar comprovantes.</p>
            </div>
          </div>

          {/* LISTA DE CHEQUES */}
          <div className="space-y-3 max-h-[40vh] overflow-y-auto border rounded-lg p-3">
            {chequesDisponiveis.length === 0 ? (
              <p className="text-center text-slate-500 py-4">Nenhum cheque disponível para devolução.</p>
            ) : (
              chequesDisponiveis.map(cheque => (
                <div key={cheque.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-slate-50">
                  <Checkbox checked={selectedIds.includes(cheque.id)} onCheckedChange={() => handleToggle(cheque.id)} />
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-slate-800">#{cheque.numero_cheque} - {cheque.banco}</p>
                        <p className="text-sm text-slate-600">{cheque.cliente_nome}</p>
                      </div>
                      <p className="font-bold text-slate-800">{formatCurrency(cheque.valor)}</p>
                    </div>

                    {selectedIds.includes(cheque.id) && (
                      <div className="mt-3 space-y-2 bg-slate-50 p-3 rounded border">
                        <div className="space-y-1">
                          <Label className="text-xs font-bold text-slate-600">Motivo da Devolução</Label>
                          <Select value={detalhes[cheque.id]?.motivo || 'outros'} onValueChange={(v) => setDetalhes(prev => ({ ...prev, [cheque.id]: { ...prev[cheque.id], motivo: v } }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="insuficiencia_fundos">Insuficiência de Fundos</SelectItem>
                              <SelectItem value="conta_encerrada">Conta Encerrada</SelectItem>
                              <SelectItem value="assinatura_divergente">Assinatura Divergente</SelectItem>
                              <SelectItem value="outros">Outros</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs font-bold text-slate-600">Comprovante (Foto/Arquivo)</Label>
                          <Input type="file" accept="image/*,application/pdf" onChange={(e) => e.target.files[0] && handleFileUpload(cheque.id, e.target.files[0])} />
                          {detalhes[cheque.id]?.file && <Badge className="mt-1">Arquivo anexado</Badge>}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* PAGAMENTO IMEDIATO (OPCIONAL) */}
          {selectedIds.length > 0 && (
            <div className="border rounded-lg p-4 space-y-3 bg-slate-50">
              <div className="flex items-center gap-2">
                <Checkbox checked={!!pagamento} onCheckedChange={(checked) => setPagamento(checked ? { metodo: 'dinheiro' } : null)} />
                <Label className="font-bold text-slate-800">Pagamento será realizado agora?</Label>
              </div>

              {pagamento && (
                <div className="space-y-3 ml-6">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-600">Método de Pagamento</Label>
                    <Select value={pagamento.metodo} onValueChange={(v) => setPagamento({ ...pagamento, metodo: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dinheiro">Dinheiro</SelectItem>
                        <SelectItem value="pix">PIX</SelectItem>
                        <SelectItem value="transferencia">Transferência</SelectItem>
                        <SelectItem value="cheque_troca">Troca por Novo Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {pagamento.metodo === 'cheque_troca' && (
                    <div className="space-y-2 border-l-4 border-blue-500 pl-3">
                      <p className="text-sm font-bold text-slate-700">Dados do Novo Cheque</p>
                      <Input placeholder="Número do Cheque" onChange={(e) => setPagamento({ ...pagamento, novoCheque: { ...pagamento.novoCheque, numero: e.target.value } })} />
                      <Input placeholder="Banco" onChange={(e) => setPagamento({ ...pagamento, novoCheque: { ...pagamento.novoCheque, banco: e.target.value } })} />
                      <Input type="number" placeholder="Valor" onChange={(e) => setPagamento({ ...pagamento, novoCheque: { ...pagamento.novoCheque, valor: e.target.value } })} />
                      <Input type="date" placeholder="Vencimento" onChange={(e) => setPagamento({ ...pagamento, novoCheque: { ...pagamento.novoCheque, vencimento: e.target.value } })} />
                    </div>
                  )}

                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-600">Comprovante de Pagamento</Label>
                    <Input type="file" accept="image/*,application/pdf" onChange={(e) => e.target.files[0] && base44.integrations.Core.UploadFile({ file: e.target.files[0] }).then(res => setPagamento({ ...pagamento, comprovante: res.file_url }))} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* RESUMO */}
          {selectedIds.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <p className="text-sm font-bold text-blue-800">Total Selecionado: {formatCurrency(totalSelecionado)}</p>
              <p className="text-xs text-blue-600">{selectedIds.length} cheque(s) selecionado(s)</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isProcessing || selectedIds.length === 0} className="bg-red-600 hover:bg-red-700 text-white">
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Confirmar Devolução
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}