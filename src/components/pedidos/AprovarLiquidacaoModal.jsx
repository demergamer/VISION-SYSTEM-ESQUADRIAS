import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Search, DollarSign, Percent, Wallet, Loader2, Plus, X, Upload, 
  FileText, Trash2, ShoppingCart, AlertTriangle, CheckCircle 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";

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
  
  // Inicializa pedidos selecionados
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

  // --- CORREÇÃO PRINCIPAL: CARREGAR DADOS DO REPRESENTANTE ---
  useEffect(() => {
    if (autorizacao) {
      // 1. Carregar Pedidos
      const pedidosDoBanco = autorizacao.pedidos_ids?.map(pid => todosPedidos.find(p => p.id === pid)).filter(Boolean) || [];
      setPedidosSelecionados(pedidosDoBanco);

      // 2. Carregar Anexos (Comprovantes)
      // Tenta pegar do array novo ou do campo antigo para compatibilidade
      let anexosIniciais = [];
      if (autorizacao.comprovantes_urls && Array.isArray(autorizacao.comprovantes_urls)) {
        anexosIniciais = [...autorizacao.comprovantes_urls];
      } else if (autorizacao.comprovante_url) {
        anexosIniciais = [autorizacao.comprovante_url];
      }
      setComprovantes(anexosIniciais);

      // 3. Carregar Descontos (Pega o primeiro se houver)
      if (autorizacao.descontos_cascata && autorizacao.descontos_cascata.length > 0) {
        const desc = autorizacao.descontos_cascata[0];
        setDescontoTipo(desc.tipo || 'reais');
        setDescontoValor(desc.valor ? String(desc.valor) : '');
      } else {
        setDescontoValor('');
      }

      // 4. Carregar Devolução
      setDevolucao(autorizacao.devolucao_valor ? String(autorizacao.devolucao_valor) : '');

      // 5. Inicializar Forma de Pagamento com o Valor Proposto
      // Isso evita que o total pago comece zerado
      setFormasPagamento([
        { 
          tipo: 'dinheiro', // Padrão, já que o representante não envia detalhes estruturados de pagamento aqui
          valor: autorizacao.valor_final_proposto ? String(autorizacao.valor_final_proposto) : '', 
          parcelas: '1' 
        }
      ]);
    }
  }, [autorizacao, todosPedidos]);

  // Filtro de pedidos disponíveis para adicionar (mesma lógica anterior)
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

  // Handlers auxiliares
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
      toast.success(`${files.length} arquivo(s) anexado(s)!`);
    } catch (error) { toast.error('Erro ao enviar arquivo(s)'); } finally { setUploadingFile(false); }
  };

  const removerComprovante = (index) => { setComprovantes(prev => prev.filter((_, i) => i !== index)); toast.success('Arquivo removido'); };

  const calcularTotais = () => {
    const totalOriginal = pedidosSelecionados.reduce((sum, p) => 
      sum + (p?.saldo_restante || ((p?.valor_pedido || 0) - (p?.total_pago || 0))), 0
    );
    
    let desconto = 0;
    if (descontoValor) {
      if (descontoTipo === 'reais') { 
        desconto = parseFloat(descontoValor) || 0; 
      } else { 
        desconto = (totalOriginal * (parseFloat(descontoValor) || 0)) / 100; 
      }
    }
    
    const devolucaoValor = parseFloat(devolucao) || 0;
    const totalComDesconto = totalOriginal - desconto - devolucaoValor;
    const totalPago = formasPagamento.reduce((sum, fp) => sum + (parseFloat(fp.valor) || 0), 0);
    
    return { totalOriginal, desconto, devolucaoValor, totalComDesconto, totalPago };
  };

  const handleRejeitar = () => { if (!motivoRejeicao.trim()) { toast.error('Informe o motivo da rejeição'); return; } onRejeitar(motivoRejeicao); };

  const handleAprovar = () => {
    if (pedidosSelecionados.length === 0) { toast.error('Selecione pelo menos um pedido'); return; }
    const totais = calcularTotais();
    if (totais.totalPago <= 0) { toast.error('Informe pelo menos uma forma de pagamento'); return; }

    const dadosAprovacao = {
      pedidosSelecionados,
      descontoTipo,
      descontoValor: parseFloat(descontoValor) || 0,
      devolucao: parseFloat(devolucao) || 0,
      formasPagamento: formasPagamento.filter(fp => parseFloat(fp.valor) > 0),
      comprovantes, // Passando o array correto de URLs
      totais
    };
    onAprovar(dadosAprovacao);
  };

  const totais = calcularTotais();

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="grid grid-cols-2 gap-4 p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border border-orange-200">
        <div><p className="text-xs text-orange-600 font-bold uppercase">Solicitação</p><p className="text-2xl font-bold text-slate-800">#{autorizacao?.numero_solicitacao}</p></div>
        <div><p className="text-xs text-slate-500 font-bold uppercase">Solicitante</p><p className="text-sm font-medium text-slate-700 truncate">{autorizacao?.solicitante_tipo === 'cliente' ? '👤 Cliente' : '🤝 Representante'}</p></div>
        <div><p className="text-xs text-slate-500 font-bold uppercase">Cliente</p><p className="text-sm font-semibold text-slate-800 truncate">{autorizacao?.cliente_nome}</p></div>
        <div><p className="text-xs text-slate-500 font-bold uppercase">Data</p><p className="text-sm text-slate-700">{autorizacao?.created_date ? format(new Date(autorizacao.created_date), 'dd/MM/yyyy HH:mm') : '-'}</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Esquerda: Seleção de Pedidos */}
        <div className="space-y-4">
          <div className="flex items-center justify-between"><h3 className="font-bold text-slate-800 flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-blue-600" /> Pedidos ({pedidosSelecionados.length})</h3></div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Buscar e adicionar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
          {searchTerm && pedidosDisponiveis.length > 0 && (
            <Card className="p-2 space-y-1 max-h-48 overflow-y-auto">
              {pedidosDisponiveis.slice(0, 5).map(pedido => (
                <div key={pedido.id} onClick={() => adicionarPedido(pedido)} className="flex items-center justify-between p-2 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors">
                  <div><p className="font-mono text-sm font-medium">#{pedido.numero_pedido}</p><p className="text-xs text-slate-500 truncate w-32">{pedido.cliente_nome}</p></div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-blue-600">{formatCurrency(pedido.saldo_restante || 0)}</span><Plus className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
              ))}
            </Card>
          )}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {pedidosSelecionados.map((pedido) => {
              const saldo = pedido.saldo_restante || ((pedido.valor_pedido || 0) - (pedido.total_pago || 0));
              return (
                <Card key={pedido.id} className="p-4 relative">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1 min-w-0"><p className="font-mono font-medium text-sm">#{pedido.numero_pedido}</p><p className="text-xs text-slate-500 truncate">{pedido.cliente_nome}</p></div>
                    <Button type="button" size="icon" variant="ghost" onClick={() => removerPedido(pedido.id)} className="text-red-600 hover:bg-red-50 h-8 w-8"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-slate-500">Valor:</span><span className="ml-2 font-medium">{formatCurrency(pedido.valor_pedido)}</span></div>
                    <div><span className="text-slate-500">Saldo:</span><span className="ml-2 font-bold text-red-600">{formatCurrency(saldo)}</span></div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Direita: Financeiro e Anexos */}
        <div className="space-y-4">
          <Card className="p-4 bg-slate-50 space-y-4">
            <h3 className="font-semibold text-slate-800">Ajustes & Pagamento</h3>
            
            {/* Descontos */}
            <div className="space-y-2">
              <Label>Desconto</Label>
              <RadioGroup value={descontoTipo} onValueChange={setDescontoTipo} className="flex gap-4">
                <div className="flex items-center gap-2"><RadioGroupItem value="reais" id="dr" /><Label htmlFor="dr">Reais (R$)</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="porcentagem" id="dp" /><Label htmlFor="dp">Porcentagem (%)</Label></div>
              </RadioGroup>
              <div className="relative">
                {descontoTipo === 'reais' ? <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /> : <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />}
                <Input type="number" step="0.01" min="0" value={descontoValor} onChange={(e) => setDescontoValor(e.target.value)} className="pl-10" placeholder="0,00" />
              </div>
            </div>

            {/* Devolução */}
            <div className="space-y-2">
              <Label>Devolução (R$)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input type="number" step="0.01" min="0" value={devolucao} onChange={(e) => setDevolucao(e.target.value)} className="pl-10" placeholder="0,00" />
              </div>
            </div>

            {/* Formas Pagamento */}
            <div className="space-y-3 pt-3 border-t">
              <div className="flex items-center justify-between"><Label className="font-semibold">Formas de Pagamento</Label><Button type="button" size="sm" variant="outline" onClick={adicionarFormaPagamento}><Plus className="w-4 h-4 mr-2" />Adicionar</Button></div>
              {formasPagamento.map((fp, index) => (
                <Card key={index} className="p-3 bg-white">
                  <div className="flex justify-between mb-2"><span className="text-sm font-medium">Forma {index + 1}</span>{formasPagamento.length > 1 && <Button size="sm" variant="ghost" onClick={() => removerFormaPagamento(index)} className="text-red-600 h-6"><X className="w-3 h-3" /></Button>}</div>
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={fp.tipo} onValueChange={(v) => atualizarFormaPagamento(index, 'tipo', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="dinheiro">Dinheiro</SelectItem><SelectItem value="pix">PIX</SelectItem><SelectItem value="cheque">Cheque</SelectItem><SelectItem value="credito">Crédito</SelectItem></SelectContent></Select>
                    <Input type="number" step="0.01" value={fp.valor} onChange={(e) => atualizarFormaPagamento(index, 'valor', e.target.value)} />
                  </div>
                </Card>
              ))}
            </div>

            {/* Totais */}
            <div className="pt-4 border-t space-y-2 text-sm">
              <div className="flex justify-between"><span>Original:</span><span className="font-medium">{formatCurrency(totais.totalOriginal)}</span></div>
              {(totais.desconto > 0 || totais.devolucaoValor > 0) && <div className="flex justify-between text-red-600"><span>Ajustes:</span><span>- {formatCurrency(totais.desconto + totais.devolucaoValor)}</span></div>}
              <div className="flex justify-between font-bold text-lg text-blue-700 border-t pt-2"><span>A Pagar:</span><span>{formatCurrency(totais.totalComDesconto)}</span></div>
              <div className="flex justify-between font-bold text-lg text-emerald-700"><span>Informado:</span><span>{formatCurrency(totais.totalPago)}</span></div>
              {Math.abs(totais.totalPago - totais.totalComDesconto) > 0.01 && <div className="flex justify-between font-bold text-red-600 border-t pt-2"><span>Diferença:</span><span>{formatCurrency(totais.totalPago - totais.totalComDesconto)}</span></div>}
            </div>
          </Card>

          {/* Comprovantes */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between"><h3 className="font-bold text-slate-800 flex items-center gap-2"><FileText className="w-5 h-5 text-emerald-600" /> Comprovantes ({comprovantes.length})</h3>
            <label className="cursor-pointer">
              <input type="file" multiple accept="image/*,.pdf" onChange={handleFileUpload} disabled={uploadingFile} className="hidden" />
              <Button type="button" size="sm" variant="outline" disabled={uploadingFile} className="gap-2" onClick={(e) => e.target.parentElement.click()}>
                {uploadingFile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Anexar
              </Button>
            </label>
            </div>
            {comprovantes.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {comprovantes.map((url, index) => { 
                  const isPdf = typeof url === 'string' && url.toLowerCase().endsWith('.pdf'); 
                  return (
                    <div key={index} className="relative group border rounded-lg overflow-hidden h-20 bg-slate-100 flex items-center justify-center">
                      <a href={url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 flex items-center justify-center">
                        {isPdf ? <FileText className="w-8 h-8 text-red-500" /> : <img src={url} alt="Comprovante" className="w-full h-full object-cover" />}
                      </a>
                      <Button type="button" size="icon" variant="destructive" onClick={() => removerComprovante(index)} className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  ); 
                })}
              </div>
            ) : <div className="text-center py-4 border-2 border-dashed border-slate-200 rounded-lg"><p className="text-xs text-slate-400">Sem anexos</p></div>}
          </Card>
        </div>
      </div>

      {showRejeicaoForm && (
        <Card className="p-4 bg-red-50 border-red-200 space-y-3 mt-4">
          <h3 className="font-bold text-red-700">Motivo da Rejeição</h3>
          <Textarea placeholder="Explique..." value={motivoRejeicao} onChange={(e) => setMotivoRejeicao(e.target.value)} className="bg-white" />
          <div className="flex gap-2"><Button variant="outline" onClick={() => setShowRejeicaoForm(false)} className="flex-1">Cancelar</Button><Button variant="destructive" onClick={handleRejeitar} className="flex-1">Confirmar</Button></div>
        </Card>
      )}

      {!showRejeicaoForm && (
        <div className="flex gap-3 pt-4 border-t mt-4">
          <Button variant="outline" onClick={onCancel} disabled={isProcessing} className="flex-1">Cancelar</Button>
          <Button variant="destructive" onClick={() => setShowRejeicaoForm(true)} disabled={isProcessing} className="flex-1">Rejeitar</Button>
          <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={handleAprovar} disabled={isProcessing || pedidosSelecionados.length === 0}>{isProcessing ? <Loader2 className="animate-spin" /> : <><CheckCircle className="mr-2 h-4 w-4" /> Aprovar e Liquidar</>}</Button>
        </div>
      )}
    </div>
  );
}