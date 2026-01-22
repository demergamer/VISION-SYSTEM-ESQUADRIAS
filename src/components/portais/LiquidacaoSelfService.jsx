import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Upload, DollarSign, Percent, Trash2, Plus, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function LiquidacaoSelfService({ pedidos, clienteCodigo, clienteNome, onSuccess, onCancel }) {
  const [selectedPedidos, setSelectedPedidos] = useState([]);
  const [descontosCascata, setDescontosCascata] = useState([]);
  const [devolucao, setDevolucao] = useState({ valor: '', observacao: '' });
  const [comprovante, setComprovante] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  const togglePedido = (pedido) => {
    setSelectedPedidos(prev =>
      prev.find(p => p.id === pedido.id)
        ? prev.filter(p => p.id !== pedido.id)
        : [...prev, pedido]
    );
  };

  const adicionarDesconto = () => {
    setDescontosCascata([...descontosCascata, { tipo: 'reais', valor: '' }]);
  };

  const removerDesconto = (index) => {
    setDescontosCascata(descontosCascata.filter((_, i) => i !== index));
  };

  const atualizarDesconto = (index, campo, valor) => {
    const novos = [...descontosCascata];
    novos[index][campo] = valor;
    setDescontosCascata(novos);
  };

  const calcularTotais = useMemo(() => {
    const totalOriginal = selectedPedidos.reduce((sum, p) => sum + (p.saldo_restante || 0), 0);
    
    let valorComDescontos = totalOriginal;
    descontosCascata.forEach(desc => {
      const val = parseFloat(desc.valor) || 0;
      if (desc.tipo === 'porcentagem') {
        valorComDescontos -= (valorComDescontos * val) / 100;
      } else {
        valorComDescontos -= val;
      }
    });

    const devolucaoVal = parseFloat(devolucao.valor) || 0;
    const valorFinal = valorComDescontos - devolucaoVal;

    return { totalOriginal, valorComDescontos, devolucaoVal, valorFinal };
  }, [selectedPedidos, descontosCascata, devolucao]);

  const handleComprovanteUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setComprovante(file_url);
      toast.success('Comprovante enviado!');
    } catch (error) {
      toast.error('Erro ao enviar comprovante');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (selectedPedidos.length === 0) {
      toast.error('Selecione pelo menos um pedido');
      return;
    }

    if (!comprovante) {
      toast.error('Anexe o comprovante de pagamento');
      return;
    }

    if (calcularTotais.devolucaoVal > 0 && !devolucao.observacao) {
      toast.error('Informe a observação da devolução');
      return;
    }

    setIsSaving(true);
    try {
      const todasSolicitacoes = await base44.entities.LiquidacaoPendente.list();
      const proximoNumero = todasSolicitacoes.length > 0
        ? Math.max(...todasSolicitacoes.map(s => s.numero_solicitacao || 0)) + 1
        : 1;

      await base44.entities.LiquidacaoPendente.create({
        numero_solicitacao: proximoNumero,
        cliente_codigo: clienteCodigo,
        cliente_nome: clienteNome,
        pedidos_ids: selectedPedidos.map(p => p.id),
        valor_total_original: calcularTotais.totalOriginal,
        descontos_cascata: descontosCascata.filter(d => d.valor),
        devolucao_valor: calcularTotais.devolucaoVal,
        devolucao_observacao: devolucao.observacao,
        comprovante_url: comprovante,
        valor_final_proposto: calcularTotais.valorFinal,
        status: 'pendente'
      });

      toast.success('Solicitação enviada! Aguarde aprovação.');
      onSuccess();
    } catch (error) {
      toast.error('Erro ao enviar solicitação');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-slate-800">Solicitar Liquidação</h3>

      {/* Seleção de Pedidos */}
      <div className="space-y-2">
        <Label>Selecione os Pedidos</Label>
        {pedidos.map(pedido => (
          <Card
            key={pedido.id}
            onClick={() => togglePedido(pedido)}
            className={cn(
              "p-4 cursor-pointer transition-all",
              selectedPedidos.find(p => p.id === pedido.id) ? "bg-blue-50 border-blue-300" : "hover:bg-slate-50"
            )}
          >
            <div className="flex items-center gap-4">
              <Checkbox checked={!!selectedPedidos.find(p => p.id === pedido.id)} />
              <div className="flex-1">
                <p className="font-semibold">Pedido #{pedido.numero_pedido}</p>
                <p className="text-sm text-slate-500">Saldo: {formatCurrency(pedido.saldo_restante)}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Descontos em Cascata */}
      {selectedPedidos.length > 0 && (
        <Card className="p-4 bg-slate-50 space-y-4">
          <div className="flex items-center justify-between">
            <Label>Descontos em Cascata</Label>
            <Button type="button" size="sm" variant="outline" onClick={adicionarDesconto}>
              <Plus className="w-4 h-4 mr-2" /> Adicionar Desconto
            </Button>
          </div>

          {descontosCascata.map((desc, idx) => (
            <div key={idx} className="flex items-end gap-3">
              <div className="flex-1 space-y-2">
                <RadioGroup value={desc.tipo} onValueChange={(v) => atualizarDesconto(idx, 'tipo', v)} className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="reais" id={`reais-${idx}`} />
                    <Label htmlFor={`reais-${idx}`}>R$</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="porcentagem" id={`porc-${idx}`} />
                    <Label htmlFor={`porc-${idx}`}>%</Label>
                  </div>
                </RadioGroup>
                <div className="relative">
                  {desc.tipo === 'reais' ? <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /> : <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />}
                  <Input
                    type="number"
                    step="0.01"
                    value={desc.valor}
                    onChange={(e) => atualizarDesconto(idx, 'valor', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button type="button" size="icon" variant="ghost" onClick={() => removerDesconto(idx)} className="text-red-600">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}

          {/* Devolução */}
          <div className="pt-4 border-t space-y-2">
            <Label>Devolução (R$)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type="number"
                step="0.01"
                value={devolucao.valor}
                onChange={(e) => setDevolucao({...devolucao, valor: e.target.value})}
                className="pl-10"
              />
            </div>
            {parseFloat(devolucao.valor) > 0 && (
              <>
                <Label className="text-red-600">Observação da Devolução *</Label>
                <Textarea
                  value={devolucao.observacao}
                  onChange={(e) => setDevolucao({...devolucao, observacao: e.target.value})}
                  placeholder="Explique o motivo da devolução..."
                  rows={3}
                  required
                />
              </>
            )}
          </div>

          {/* Upload Comprovante */}
          <div className="pt-4 border-t space-y-2">
            <Label>Comprovante de Pagamento * <span className="text-red-500">(Obrigatório)</span></Label>
            <label className={cn(
              "flex items-center justify-center gap-2 h-12 px-4 rounded-xl border-2 border-dashed cursor-pointer transition-all",
              comprovante ? "border-green-300 bg-green-50 text-green-700" : "border-slate-300 bg-white hover:border-blue-400 hover:bg-blue-50 text-slate-600"
            )}>
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : comprovante ? <CheckCircle className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
              <span className="font-medium">{uploading ? 'Enviando...' : comprovante ? 'Comprovante Anexado' : 'Clique para Anexar'}</span>
              <input type="file" accept="image/*,.pdf" onChange={handleComprovanteUpload} className="hidden" disabled={uploading} />
            </label>
          </div>

          {/* Resumo */}
          <div className="pt-4 border-t space-y-2 bg-white rounded-xl p-4">
            <div className="flex justify-between"><span>Total Original:</span><span className="font-bold">{formatCurrency(calcularTotais.totalOriginal)}</span></div>
            {descontosCascata.length > 0 && <div className="flex justify-between text-red-600"><span>Descontos:</span><span>- {formatCurrency(calcularTotais.totalOriginal - calcularTotais.valorComDescontos)}</span></div>}
            {calcularTotais.devolucaoVal > 0 && <div className="flex justify-between text-orange-600"><span>Devolução:</span><span>- {formatCurrency(calcularTotais.devolucaoVal)}</span></div>}
            <div className="flex justify-between text-xl font-bold text-blue-700 pt-2 border-t"><span>Valor Final Proposto:</span><span>{formatCurrency(calcularTotais.valorFinal)}</span></div>
          </div>
        </Card>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel} disabled={isSaving}>Cancelar</Button>
        <Button onClick={handleSubmit} disabled={isSaving || selectedPedidos.length === 0 || !comprovante}>
          {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</> : 'Enviar Solicitação'}
        </Button>
      </div>

      {isSaving && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-800">Enviando Solicitação</h3>
              <p className="text-sm text-slate-500">Processando sua liquidação...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}