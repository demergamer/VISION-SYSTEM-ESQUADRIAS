import React, { useState, useMemo, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Search, DollarSign, Percent, Loader2, Plus, X, Upload, 
  FileText, Trash2, ShoppingCart, AlertTriangle, CheckCircle, Download, ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { base44 } from '@/api/base44Client';

const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

export default function AprovarLiquidacaoModal({ 
  autorizacao, 
  todosPedidos, 
  onAprovar, 
  onRejeitar, 
  onCancel, 
  isProcessing 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [pedidosSelecionados, setPedidosSelecionados] = useState([]);
  
  // Estados do formulário
  const [descontoTipo, setDescontoTipo] = useState('reais');
  const [descontoValor, setDescontoValor] = useState('');
  const [devolucao, setDevolucao] = useState('');
  const [formasPagamento, setFormasPagamento] = useState([]);
  const [comprovantes, setComprovantes] = useState([]);
  
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showRejeicaoForm, setShowRejeicaoForm] = useState(false);
  const [motivoRejeicao, setMotivoRejeicao] = useState('');

  // --- CARREGAMENTO DE DADOS ---
  useEffect(() => {
    if (autorizacao) {
      // 1. Pedidos
      const pedidosDoBanco = autorizacao.pedidos_ids?.map(pid => todosPedidos.find(p => p.id === pid)).filter(Boolean) || [];
      setPedidosSelecionados(pedidosDoBanco);

      // 2. Anexos (Lógica corrigida para lista simples)
      let anexosIniciais = [];
      if (Array.isArray(autorizacao.comprovantes_urls) && autorizacao.comprovantes_urls.length > 0) {
        anexosIniciais = [...autorizacao.comprovantes_urls];
      } else if (autorizacao.comprovante_url) {
        anexosIniciais = [autorizacao.comprovante_url];
      }
      // Filtra urls vazias
      setComprovantes(anexosIniciais.filter(url => url && typeof url === 'string' && url.trim() !== ''));

      // 3. Descontos
      if (autorizacao.descontos_cascata && autorizacao.descontos_cascata.length > 0) {
        const desc = autorizacao.descontos_cascata[0];
        setDescontoTipo(desc.tipo || 'reais');
        setDescontoValor(desc.valor ? String(desc.valor) : '');
      } else {
        setDescontoValor('');
      }

      // 4. Devolução
      setDevolucao(autorizacao.devolucao_valor ? String(autorizacao.devolucao_valor) : '');

      // 5. Inicializar Pagamento
      const valorInicial = autorizacao.valor_final_proposto || autorizacao.valor_total_original || 0;
      setFormasPagamento([{ tipo: 'dinheiro', valor: String(valorInicial), parcelas: '1' }]);
    }
  }, [autorizacao, todosPedidos]);

  // ... (Funções auxiliares mantidas iguais: pedidosDisponiveis, adicionarPedido, etc)
  const pedidosDisponiveis = useMemo(() => {
    const clienteCodigo = autorizacao?.cliente_codigo;
    if (!clienteCodigo) return [];
    const idsJaSelecionados = pedidosSelecionados.map(p => p.id);
    return todosPedidos.filter(p => 
      p.cliente_codigo === clienteCodigo &&
      ['aberto', 'parcial', 'aguardando'].includes(p.status) &&
      !idsJaSelecionados.includes(p.id) &&
      (p.numero_pedido?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       p.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [todosPedidos, autorizacao, pedidosSelecionados, searchTerm]);

  const adicionarPedido = (pedido) => { setPedidosSelecionados(prev => [...prev, pedido]); setSearchTerm(''); };
  const removerPedido = (pedidoId) => { setPedidosSelecionados(prev => prev.filter(p => p.id !== pedidoId)); };
  const adicionarFormaPagamento = () => { setFormasPagamento([...formasPagamento, { tipo: 'dinheiro', valor: '', parcelas: '1' }]); };
  const removerFormaPagamento = (index) => { if (formasPagamento.length > 1) setFormasPagamento(formasPagamento.filter((_, i) => i !== index)); };
  const atualizarFormaPagamento = (index, campo, valor) => { const novasFormas = [...formasPagamento]; novasFormas[index][campo] = valor; setFormasPagamento(novasFormas); };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setUploadingFile(true);
    try {
      const uploadPromises = files.map(file => base44.integrations.Core.UploadFile({ file }));
      const results = await Promise.all(uploadPromises);
      const urls = results.map(r => r.file_url).filter(Boolean);
      setComprovantes(prev => [...prev, ...urls]);
      toast.success('Arquivo anexado!');
    } catch (error) { toast.error('Erro ao enviar'); } finally { setUploadingFile(false); }
  };

  const removerComprovante = (index) => { setComprovantes(prev => prev.filter((_, i) => i !== index)); };

  const calcularTotais = () => {
    const totalOriginal = pedidosSelecionados.reduce((sum, p) => sum + (p?.saldo_restante || ((p?.valor_pedido || 0) - (p?.total_pago || 0))), 0);
    let desconto = 0;
    if (descontoValor) {
      if (descontoTipo === 'reais') desconto = parseFloat(descontoValor) || 0; 
      else desconto = (totalOriginal * (parseFloat(descontoValor) || 0)) / 100;
    }
    const devolucaoValor = parseFloat(devolucao) || 0;
    const totalComDesconto = totalOriginal - desconto - devolucaoValor;
    const totalPago = formasPagamento.reduce((sum, fp) => sum + (parseFloat(fp.valor) || 0), 0);
    return { totalOriginal, desconto, devolucaoValor, totalComDesconto, totalPago };
  };

  const handleRejeitar = () => { if (!motivoRejeicao.trim()) { toast.error('Informe o motivo'); return; } onRejeitar(motivoRejeicao); };

  const handleAprovar = () => {
    if (pedidosSelecionados.length === 0) { toast.error('Selecione pelo menos um pedido'); return; }
    const totais = calcularTotais();
    if (totais.totalPago <= 0) { toast.error('Informe o valor pago'); return; }

    const dadosAprovacao = {
      pedidosSelecionados,
      descontoTipo,
      descontoValor: parseFloat(descontoValor) || 0,
      devolucao: parseFloat(devolucao) || 0,
      formasPagamento: formasPagamento.filter(fp => parseFloat(fp.valor) > 0),
      comprovantes, 
      totais
    };
    onAprovar(dadosAprovacao);
  };

  const totais = calcularTotais();

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
        <div><p className="text-xs text-slate-500 font-bold uppercase">Solicitação</p><p className="text-xl font-bold text-slate-800">#{autorizacao?.numero_solicitacao}</p></div>
        <div><p className="text-xs text-slate-500 font-bold uppercase">Cliente</p><p className="text-sm font-semibold text-slate-800 truncate">{autorizacao?.cliente_nome}</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ESQUERDA: Pedidos */}
        <div className="space-y-4">
          <div className="flex items-center justify-between"><h3 className="font-bold text-slate-800 flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-blue-600" /> Pedidos ({pedidosSelecionados.length})</h3></div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Buscar e adicionar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
          {searchTerm && pedidosDisponiveis.length > 0 && (
            <Card className="p-2 space-y-1 max-h-48 overflow-y-auto bg-blue-50 border-blue-100">
              {pedidosDisponiveis.slice(0, 3).map(pedido => (
                <div key={pedido.id} onClick={() => adicionarPedido(pedido)} className="flex justify-between p-2 hover:bg-blue-100 rounded cursor-pointer">
                  <span className="text-sm">#{pedido.numero_pedido} - {formatCurrency(pedido.saldo_restante)}</span>
                  <Plus className="w-4 h-4 text-blue-600" />
                </div>
              ))}
            </Card>
          )}
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {pedidosSelecionados.map((pedido) => (
              <Card key={pedido.id} className="p-3 relative bg-white border-slate-200">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-mono text-sm font-bold">#{pedido.numero_pedido}</p>
                    <p className="text-xs text-slate-500">{formatCurrency(pedido.saldo_restante)}</p>
                  </div>
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500" onClick={() => removerPedido(pedido.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* DIREITA: Financeiro e Anexos */}
        <div className="space-y-4">
          {/* Ajustes */}
          <Card className="p-4 bg-slate-50 space-y-3">
            <h3 className="font-semibold text-slate-800">Pagamento</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Desconto</Label>
                <div className="flex gap-1">
                  <select className="h-9 rounded-md border text-xs" value={descontoTipo} onChange={e => setDescontoTipo(e.target.value)}>
                    <option value="reais">R$</option>
                    <option value="porcentagem">%</option>
                  </select>
                  <Input className="h-9" type="number" value={descontoValor} onChange={e => setDescontoValor(e.target.value)} />
                </div>
              </div>
              <div>
                <Label className="text-xs">Devolução (R$)</Label>
                <Input className="h-9" type="number" value={devolucao} onChange={e => setDevolucao(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2 border-t pt-2">
               {formasPagamento.map((fp, idx) => (
                 <div key={idx} className="flex gap-2">
                   <Select value={fp.tipo} onValueChange={v => atualizarFormaPagamento(idx, 'tipo', v)}>
                     <SelectTrigger className="h-9 w-28"><SelectValue /></SelectTrigger>
                     <SelectContent><SelectItem value="dinheiro">Dinheiro</SelectItem><SelectItem value="pix">PIX</SelectItem><SelectItem value="cheque">Cheque</SelectItem></SelectContent>
                   </Select>
                   <Input className="h-9 flex-1" type="number" value={fp.valor} onChange={e => atualizarFormaPagamento(idx, 'valor', e.target.value)} />
                   {idx === 0 ? <Button size="icon" variant="outline" className="h-9 w-9" onClick={adicionarFormaPagamento}><Plus className="w-4 h-4" /></Button> : <Button size="icon" variant="ghost" className="h-9 w-9 text-red-500" onClick={() => removerFormaPagamento(idx)}><X className="w-4 h-4" /></Button>}
                 </div>
               ))}
            </div>

            <div className="pt-2 border-t flex justify-between items-center">
              <span className="text-sm font-medium text-slate-600">Total a Pagar:</span>
              <span className="text-lg font-bold text-blue-600">{formatCurrency(totais.totalComDesconto)}</span>
            </div>
          </Card>

          {/* ANEXOS - VERSÃO LISTA SIMPLES (CORRIGIDA) */}
          <Card className="p-4 space-y-3 bg-white border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" /> 
                Anexos ({comprovantes.length})
              </h3>
              <label className="cursor-pointer">
                 <input type="file" multiple onChange={handleFileUpload} disabled={uploadingFile} className="hidden" />
                 <span className="text-xs bg-slate-100 px-2 py-1 rounded hover:bg-slate-200 cursor-pointer border flex items-center gap-1">
                   {uploadingFile ? <Loader2 className="w-3 h-3 animate-spin"/> : <Upload className="w-3 h-3"/>} Adicionar
                 </span>
              </label>
            </div>

            {comprovantes.length > 0 ? (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {comprovantes.map((url, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-100 group">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="bg-emerald-100 p-1.5 rounded"><FileText className="w-4 h-4 text-emerald-700" /></div>
                      <span className="text-xs text-slate-600 truncate max-w-[150px]">Comprovante {index + 1}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-7 px-2 text-blue-600 hover:bg-blue-50 text-xs" 
                        onClick={() => window.open(url, '_blank')}
                      >
                        <ExternalLink className="w-3 h-3 mr-1" /> Abrir
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50" 
                        onClick={() => removerComprovante(index)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 border border-dashed rounded bg-slate-50/50">
                <p className="text-xs text-slate-400">Nenhum comprovante anexado</p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {showRejeicaoForm && (
        <Card className="p-4 bg-red-50 border-red-200 mt-4 space-y-2">
          <Label className="text-red-700 font-bold">Motivo da Rejeição</Label>
          <Textarea value={motivoRejeicao} onChange={e => setMotivoRejeicao(e.target.value)} className="bg-white" />
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" onClick={() => setShowRejeicaoForm(false)}>Cancelar</Button>
            <Button size="sm" variant="destructive" onClick={handleRejeitar}>Confirmar Rejeição</Button>
          </div>
        </Card>
      )}

      {!showRejeicaoForm && (
        <div className="flex gap-3 pt-4 border-t mt-4">
          <Button variant="outline" onClick={onCancel} disabled={isProcessing}>Cancelar</Button>
          <Button variant="destructive" onClick={() => setShowRejeicaoForm(true)} disabled={isProcessing}>Rejeitar</Button>
          <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={handleAprovar} disabled={isProcessing}>
            {isProcessing ? <Loader2 className="animate-spin" /> : <><CheckCircle className="w-4 h-4 mr-2" /> Aprovar e Liquidar</>}
          </Button>
        </div>
      )}
    </div>
  );
}