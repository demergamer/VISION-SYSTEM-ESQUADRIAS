import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Loader2, FileText } from "lucide-react";
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";

export default function SolicitarOrcamentoModal({ open, onClose, clientes, representanteCodigo, representanteNome }) {
  const [loading, setLoading] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState('');
  const [itens, setItens] = useState([{ produto: '', quantidade: '', medidas: '' }]);
  const [observacao, setObservacao] = useState('');

  const handleAddItem = () => {
    setItens([...itens, { produto: '', quantidade: '', medidas: '' }]);
  };

  const handleRemoveItem = (index) => {
    setItens(itens.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const newItens = [...itens];
    newItens[index][field] = value;
    setItens(newItens);
  };

  const handleSubmit = async () => {
    if (!clienteSelecionado) {
      toast.error('Selecione um cliente');
      return;
    }

    const itensValidos = itens.filter(item => item.produto && item.quantidade);
    if (itensValidos.length === 0) {
      toast.error('Adicione pelo menos um item');
      return;
    }

    setLoading(true);
    try {
      const cliente = clientes.find(c => c.codigo === clienteSelecionado);
      
      await base44.entities.Orcamento.create({
        cliente_nome: cliente.nome,
        cliente_email: cliente.email || representanteNome, // Fallback para representante
        tipo_origem: 'representante',
        representante_codigo: representanteCodigo,
        representante_nome: representanteNome,
        descricao: JSON.stringify(itensValidos),
        observacao: observacao,
        status: 'enviado'
      });

      toast.success('Orçamento enviado com sucesso!');
      onClose();
      
      // Reset
      setClienteSelecionado('');
      setItens([{ produto: '', quantidade: '', medidas: '' }]);
      setObservacao('');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao enviar orçamento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="w-5 h-5 text-blue-600" />
            Solicitar Orçamento
          </DialogTitle>
          <DialogDescription>
            Envie uma solicitação de orçamento para o comercial
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Selecionar Cliente */}
          <div>
            <Label>Cliente *</Label>
            <Select value={clienteSelecionado} onValueChange={setClienteSelecionado}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o cliente" />
              </SelectTrigger>
              <SelectContent>
                {clientes.map(cliente => (
                  <SelectItem key={cliente.id} value={cliente.codigo}>
                    {cliente.nome} - {cliente.codigo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Itens do Orçamento */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>Itens do Orçamento *</Label>
              <Button size="sm" variant="outline" onClick={handleAddItem} className="gap-2">
                <Plus className="w-4 h-4" />
                Adicionar Item
              </Button>
            </div>

            <div className="space-y-3">
              {itens.map((item, index) => (
                <div key={index} className="border border-slate-200 rounded-lg p-4 relative">
                  {itens.length > 1 && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRemoveItem(index)}
                      className="absolute top-2 right-2 h-8 w-8 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}

                  <div className="grid grid-cols-3 gap-3 pr-10">
                    <div>
                      <Label className="text-xs">Produto</Label>
                      <Input
                        placeholder="Ex: Vidro temperado"
                        value={item.produto}
                        onChange={(e) => handleItemChange(index, 'produto', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Quantidade</Label>
                      <Input
                        type="number"
                        placeholder="Ex: 5"
                        value={item.quantidade}
                        onChange={(e) => handleItemChange(index, 'quantidade', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Medidas</Label>
                      <Input
                        placeholder="Ex: 2m x 1.5m"
                        value={item.medidas}
                        onChange={(e) => handleItemChange(index, 'medidas', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Observações */}
          <div>
            <Label>Observações para o Comercial</Label>
            <Textarea
              placeholder="Detalhes adicionais, prazo desejado, etc..."
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t p-4 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-blue-600 hover:bg-blue-700 gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Enviar Orçamento
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}