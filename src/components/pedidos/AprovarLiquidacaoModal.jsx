import React, { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  DollarSign, Loader2, Plus, X, Upload, FileText, Trash2, 
  ShoppingCart, Calculator, ExternalLink, CheckCircle
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { base44 } from '@/api/base44Client';

const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

export default function AprovarLiquidacaoModal({ 
  autorizacao, 
  todosPedidos = [], 
  onAprovar, 
  onRejeitar, 
  onCancel, 
  isProcessing 
}) {
  // --- ESTADOS ---
  const [pedidosSelecionados, setPedidosSelecionados] = useState([]);
  
  // Financeiro
  const [descontoReais, setDescontoReais] = useState(''); 
  const [devolucaoReais, setDevolucaoReais] = useState('');
  const [formasPagamento, setFormasPagamento] = useState([]); 
  
  // Anexos
  const [comprovantes, setComprovantes] = useState([]); 
  const [uploading, setUploading] = useState(false);

  // Rejeição
  const [modoRejeicao, setModoRejeicao] = useState(false);
  const [motivoRejeicao, setMotivoRejeicao] = useState('');

  // --- 1. INICIALIZAÇÃO SEGURA ---
  useEffect(() => {
    if (autorizacao?.id) {
      console.log("Inicializando Modal para ID:", autorizacao.id);

      // A. Carregar Pedidos
      const pedidosDoBanco = autorizacao.pedidos_ids?.map(pid => 
        todosPedidos.find(p => p.id === pid)
      ).filter(Boolean) || [];
      setPedidosSelecionados(pedidosDoBanco);

      // B. Carregar Anexos
      let listaAnexos = [];
      if (Array.isArray(autorizacao.comprovantes_urls) && autorizacao.comprovantes_urls.length > 0) {
        listaAnexos = [...autorizacao.comprovantes_urls];
      } else if (autorizacao.comprovante_url) {
        listaAnexos = [autorizacao.comprovante_url];
      }
      setComprovantes(listaAnexos.filter(url => url && typeof url === 'string' && url.trim() !== ''));

      // C. Carregar Valores
      let descInicial = '';
      if (autorizacao.descontos_cascata?.length > 0) {
        const totalDesc = autorizacao.descontos_cascata.reduce((acc, d) => acc + (parseFloat(d.valor) || 0), 0);
        if (totalDesc > 0) descInicial = String(totalDesc);
      }
      setDescontoReais(descInicial);
      setDevolucaoReais(autorizacao.devolucao_valor ? String(autorizacao.devolucao_valor) : '');

      // D. Inicializar Pagamento
      let valorInicial = parseFloat(autorizacao.valor_final_proposto) || 0;
      if (valorInicial <= 0.01) {
         valorInicial = parseFloat(autorizacao.valor_total_original) || 0;
      }
      
      setFormasPagamento([
        { tipo: 'dinheiro', valor: String(valorInicial) }
      ]);
    }
  }, [autorizacao?.id]); 

  // --- 2. CÁLCULOS ---
  const totais = useMemo(() => {
    const totalOriginal = pedidosSelecionados.reduce((acc, p) => {
        const saldo = p.saldo_restante !== undefined ? p.saldo_restante : (p.valor_pedido - (p.total_pago || 0));
        return acc + saldo;
    }, 0);

    const desconto = parseFloat(descontoReais) || 0;
    const devolucao = parseFloat(devolucaoReais) || 0;
    
    const totalAjustes = desconto + devolucao;
    const totalAPagar = Math.max(0, totalOriginal - totalAjustes);

    const totalInformado = formasPagamento.reduce((acc, f) => acc + (parseFloat(f.valor) || 0), 0);
    const diferenca = totalInformado - totalAPagar;

    return { totalOriginal, desconto, devolucao, totalAjustes, totalAPagar, totalInformado, diferenca };
  }, [pedidosSelecionados, descontoReais, devolucaoReais, formasPagamento]);

  // --- 3. AÇÕES (HANDLERS SEGUROS) ---
  
  const handleAddForma = () => {
    setFormasPagamento([...formasPagamento, { tipo: 'dinheiro', valor: '' }]);
  };

  const handleRemoveForma = (index) => {
    if (formasPagamento.length > 1) {
      setFormasPagamento(formasPagamento.filter((_, i) => i !== index));
    }
  };

  // CORREÇÃO CRÍTICA PARA TELA BRANCA NA EDIÇÃO
  const handleUpdateForma = (index, field, value) => {
    setFormasPagamento(current => {
      const novas = [...current];
      novas[index] = { ...novas[index], [field]: value }; // Cria novo objeto, não muta
      return novas;
    });
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const promises = files.map(file => base44.integrations.Core.UploadFile({ file }));
      const results = await Promise.all(promises);
      const urls = results.map(r => r.file_url).filter(Boolean);
      setComprovantes(prev => [...prev, ...urls]);
      toast.success("Anexo adicionado!");
    } catch (err) {
      toast.error("Erro ao enviar arquivo.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAnexo = (index) => {
    setComprovantes(prev => prev.filter((_, i) => i !== index));
  };

  // --- 4. VALIDAÇÃO E ENVIO ---
  const handleAprovarClick = () => {
    if (pedidosSelecionados.length === 0) {
      toast.error("Nenhum pedido selecionado.");
      return;
    }

    if (totais.totalInformado <= 0.01) {
      toast.error("O valor do pagamento não pode ser zero.");
      return;
    }

    const dadosFinais = {
      pedidosSelecionados,
      totais: {
        totalOriginal: totais.totalOriginal,
        desconto: totais.desconto,
        devolucao: totais.devolucao,
        totalPago: totais.totalInformado
      },
      descontoTipo: 'reais',
      descontoValor: totais.desconto,
      devolucao: totais.devolucao,
      formasPagamento: formasPagamento.filter(f => parseFloat(f.valor) > 0),
      comprovantes: comprovantes
    };

    onAprovar(dadosFinais);
  };

  if (!autorizacao) return null;

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* HEADER */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-xs font-bold text-slate-500 uppercase block">Solicitação</span>
          <span className="font-bold text-lg text-slate-800">#{autorizacao.numero_solicitacao}</span>
        </div>
        <div>
          <span className="text-xs font-bold text-slate-500 uppercase block">Cliente</span>
          <span className="font-medium text-slate-700 truncate block">{autorizacao.cliente_nome}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 overflow-hidden">
        
        {/* ESQUERDA: PEDIDOS */}
        <div className="flex flex-col space-y-3 h-full overflow-hidden">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-blue-600" /> 
              Pedidos ({pedidosSelecionados.length})
            </h3>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-bold">
              {formatCurrency(totais.totalOriginal)}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto border rounded-xl bg-slate-50 p-2 space-y-2 max-h-[400px]">
            {pedidosSelecionados.map(p => (
              <Card key={p.id} className="p-3 bg-white flex justify-between items-center shadow-sm">
                <div>
                  <p className="font-bold text-xs text-slate-500">#{p.numero_pedido}</p>
                  <p className="text-sm font-medium text-slate-700 truncate w-32">{p.cliente_nome}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">Saldo</p>
                  <p className="font-bold text-emerald-600">
                    {formatCurrency(p.saldo_restante || (p.valor_pedido - (p.total_pago || 0)))}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* DIREITA: PAGAMENTO */}
        <div className="flex flex-col space-y-4 h-full overflow-y-auto pr-2">
          <Card className="p-4 bg-white border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Calculator className="w-4 h-4" /> Conferência
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-500 mb-1">Desconto (R$)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-2 top-2.5 w-3 h-3 text-slate-400" />
                  <Input 
                    type="number" 
                    className="pl-7 h-9 text-sm" 
                    value={descontoReais} 
                    onChange={e => setDescontoReais(e.target.value)} 
                    placeholder="0,00"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs text-slate-500 mb-1">Devolução (R$)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-2 top-2.5 w-3 h-3 text-slate-400" />
                  <Input 
                    type="number" 
                    className="pl-7 h-9 text-sm" 
                    value={devolucaoReais} 
                    onChange={e => setDevolucaoReais(e.target.value)} 
                    placeholder="0,00"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2 border-t pt-3">
              <div className="flex justify-between items-center mb-1">
                <Label className="text-xs font-bold text-slate-700">Formas de Pagamento</Label>
                <Button size="sm" variant="ghost" className="h-6 text-xs text-blue-600" onClick={handleAddForma}>
                  <Plus className="w-3 h-3 mr-1" /> Adicionar
                </Button>
              </div>
              {formasPagamento.map((fp, idx) => (
                <div key={idx} className="flex gap-2">
                  <Select value={fp.tipo} onValueChange={v => handleUpdateForma(idx, 'tipo', v)}>
                    <SelectTrigger className="h-9 w-28 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="credito">Crédito</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input 
                    type="number" 
                    className="h-9 flex-1 text-sm" 
                    value={fp.valor} 
                    onChange={e => handleUpdateForma(idx, 'valor', e.target.value)} 
                  />
                  {idx > 0 && (
                    <Button size="icon" variant="ghost" className="h-9 w-9 text-red-500" onClick={() => handleRemoveForma(idx)}>
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div className="bg-slate-100 rounded-lg p-3 space-y-1 text-sm">
              <div className="flex justify-between font-bold text-slate-800 border-b border-slate-200 pb-1 mb-1">
                <span>A Pagar:</span>
                <span>{formatCurrency(totais.totalAPagar)}</span>
              </div>
              <div className="flex justify-between font-bold text-emerald-600">
                <span>Total Pago:</span>
                <span>{formatCurrency(totais.totalInformado)}</span>
              </div>
              {Math.abs(totais.diferenca) > 0.01 && (
                <div className={cn("flex justify-between font-bold pt-1", totais.diferenca > 0 ? "text-blue-600" : "text-red-600")}>
                  <span>{totais.diferenca > 0 ? "Troco:" : "Faltam:"}</span>
                  <span>{formatCurrency(Math.abs(totais.diferenca))}</span>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-4 bg-white border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <FileText className="w-4 h-4" /> Anexos ({comprovantes.length})
              </h3>
              <label className="cursor-pointer">
                <input type="file" multiple onChange={handleFileUpload} disabled={uploading} className="hidden" />
                <Badge variant="outline" className="cursor-pointer hover:bg-slate-100">
                  {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                </Badge>
              </label>
            </div>
            
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {comprovantes.length > 0 ? comprovantes.map((url, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 border rounded text-xs">
                  <span className="truncate max-w-[180px] text-blue-600 underline cursor-pointer" onClick={() => window.open(url, '_blank')}>
                    Comprovante {idx + 1}
                  </span>
                  <Button size="icon" variant="ghost" className="h-5 w-5 text-red-400" onClick={() => handleRemoveAnexo(idx)}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )) : <p className="text-xs text-slate-400 text-center">Sem anexos.</p>}
            </div>
          </Card>
        </div>
      </div>

      <div className="pt-4 border-t mt-auto">
        {!modoRejeicao ? (
          <div className="flex gap-3">
            <Button variant="outline" onClick={onCancel} disabled={isProcessing} className="flex-1">Cancelar</Button>
            <Button variant="destructive" onClick={() => setModoRejeicao(true)} disabled={isProcessing} className="flex-1">Recusar</Button>
            <Button className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleAprovarClick} disabled={isProcessing}>
              {isProcessing ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle className="mr-2 h-4 w-4" />}
              Aprovar
            </Button>
          </div>
        ) : (
          <div className="space-y-3 bg-red-50 p-3 rounded-lg border border-red-200">
            <Label className="text-red-700 font-bold">Motivo da Recusa:</Label>
            <Textarea value={motivoRejeicao} onChange={e => setMotivoRejeicao(e.target.value)} className="bg-white" />
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={() => setModoRejeicao(false)}>Voltar</Button>
              <Button size="sm" variant="destructive" onClick={() => onRejeitar(motivoRejeicao)}>Confirmar</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}