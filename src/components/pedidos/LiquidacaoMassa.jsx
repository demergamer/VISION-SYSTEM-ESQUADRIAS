import React, { useState, useMemo, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Search, DollarSign, Percent, Wallet, Loader2, Plus, X, Upload, FileText, Trash2, Info, AlertTriangle, Sparkles, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import ModalContainer from "@/components/modals/ModalContainer";
import AdicionarChequeModal from "@/components/pedidos/AdicionarChequeModal";
import { toast } from "sonner";

const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

// --- Sub-componente: Upload inline por forma de pagamento (só click, drag no Card pai) ---
function UploadInline({ comprovante, onUpload, onRemove, uploading }) {
  const ref = useRef(null);

  const handleChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      onUpload(res.file_url);
      toast.success('Comprovante anexado!');
    } catch {
      toast.error('Erro ao enviar arquivo');
    }
  };

  if (comprovante) {
    return (
      <div className="flex items-center gap-2 mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
        <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
        <a href={comprovante} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-700 hover:underline flex-1 truncate">
          Ver comprovante
        </a>
        <Button type="button" size="icon" variant="ghost" onClick={onRemove} className="h-6 w-6 text-red-500 hover:bg-red-50">
          <X className="w-3 h-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-2">
      <input ref={ref} type="file" accept="image/*,.pdf" onChange={handleChange} className="hidden" />
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={uploading}
        onClick={() => ref.current?.click()}
        className="w-full h-8 text-xs gap-1.5 border-dashed"
      >
        {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
        {uploading ? 'Enviando...' : 'Anexar Comprovante'}
      </Button>
    </div>
  );
}

export default function LiquidacaoMassa({ pedidos, onSave, onCancel, isLoading }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPedidos, setSelectedPedidos] = useState([]);
  const [descontoTipo, setDescontoTipo] = useState('reais');
  const [descontoValor, setDescontoValor] = useState('');

  // --- DEVOLUÇÃO com campos condicionais ---
  const [devolucao, setDevolucao] = useState('');
  const [devolucaoMotivo, setDevolucaoMotivo] = useState('');
  const [devolucaoComprovante, setDevolucaoComprovante] = useState('');
  const devolucaoComprovanteRef = useRef(null);
  const [uploadingDevolucao, setUploadingDevolucao] = useState(false);
  const [isDraggingDevolucao, setIsDraggingDevolucao] = useState(false);

  // --- Formas de pagamento COM comprovante inline ---
  const [formasPagamento, setFormasPagamento] = useState([
    { tipo: 'dinheiro', valor: '', parcelas: '1', dadosCheque: { numero: '', banco: '', agencia: '' }, chequesSalvos: [], comprovante: '' }
  ]);

  const [showChequeModal, setShowChequeModal] = useState(false);
  const [chequeModalIndex, setChequeModalIndex] = useState(0);

  // --- CRÉDITOS via checkbox ---
  const [creditosSelecionados, setCreditosSelecionados] = useState([]);

  const [isSaving, setIsSaving] = useState(false);
  const [sinaisInjetados, setSinaisInjetados] = useState([]);
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [uploadingFormaIndex, setUploadingFormaIndex] = useState(null);
  const [isGlobalDragging, setIsGlobalDragging] = useState(false);
  const [isProcessingGlobalDrop, setIsProcessingGlobalDrop] = useState(false);
  const globalDragCounter = useRef(0);

  // --- Pop-up de crédito excedente ---
  const [showCreditoModal, setShowCreditoModal] = useState(false);
  const [excedentePendente, setExcedentePendente] = useState(0);

  const [usarPortsAutomatico, setUsarPortsAutomatico] = useState(false);
  const [chequesDevolvidos, setChequesDevolvidos] = useState([]);

  // Cheques devolvidos do cliente selecionado
  const { data: chequesDevolvidos_db = [] } = useQuery({
    queryKey: ['cheques_devolvidos_liq', selectedPedidos[0]?.cliente_codigo],
    queryFn: async () => {
      if (!selectedPedidos[0]?.cliente_codigo) return [];
      const todos = await base44.entities.Cheque.list('-created_date', 200);
      return todos.filter(c =>
        c.cliente_codigo === selectedPedidos[0].cliente_codigo &&
        c.status === 'devolvido' &&
        c.status_pagamento_devolucao !== 'pago'
      );
    },
    enabled: selectedPedidos.length > 0 && !!selectedPedidos[0]?.cliente_codigo
  });

  const toggleChequeDev = (cheque) => {
    setChequesDevolvidos(prev =>
      prev.find(c => c.id === cheque.id)
        ? prev.filter(c => c.id !== cheque.id)
        : [...prev, cheque]
    );
  };

  const totalChequesDevolvidos = chequesDevolvidos.reduce((s, c) => s + (c.valor || 0), 0);

  const { data: creditos = [] } = useQuery({
    queryKey: ['creditos', selectedPedidos[0]?.cliente_codigo],
    queryFn: async () => {
      if (!selectedPedidos[0]?.cliente_codigo) return [];
      const todosCreditos = await base44.entities.Credito.list('-created_date', 200);
      return todosCreditos.filter(c => c?.cliente_codigo === selectedPedidos[0]?.cliente_codigo && c?.status === 'disponivel');
    },
    enabled: selectedPedidos.length > 0 && !!selectedPedidos[0]?.cliente_codigo
  });

  const { data: todosPortsDisponiveis = [] } = useQuery({
    queryKey: ['ports-massa'],
    queryFn: async () => {
      const allPorts = await base44.entities.Port.list();
      return allPorts.filter(port =>
        port && (port?.saldo_disponivel || 0) > 0 && !['devolvido', 'finalizado'].includes(port?.status)
      );
    }
  });

  const creditoAUsar = useMemo(() => {
    return creditosSelecionados.reduce((sum, id) => {
      const cred = creditos.find(c => c.id === id);
      return sum + (cred?.valor || 0);
    }, 0);
  }, [creditosSelecionados, creditos]);

  React.useEffect(() => {
    if (selectedPedidos.length === 0) {
      setSinaisInjetados([]);
      setFormasPagamento([{ tipo: 'dinheiro', valor: '', parcelas: '1', dadosCheque: { numero: '', banco: '', agencia: '' }, chequesSalvos: [], comprovante: '' }]);
      setCreditosSelecionados([]);
      return;
    }

    const novosSinais = selectedPedidos.flatMap(p => {
      const historico = p.sinais_historico;
      if (historico && historico.length > 0) {
        return historico.filter(s => !s.usado && (parseFloat(s.valor) || 0) > 0).map(s => ({
          id: `sinal-${p.id}-${s.id}`,
          _sinalId: s.id,
          _pedidoId: p.id,
          forma: `Sinal / ${s.tipo_pagamento}`,
          valor: parseFloat(s.valor),
          referencia: `Pedido #${p.numero_pedido}`,
          comprovantes: s.comprovante_url ? [s.comprovante_url] : [],
          isReadOnly: true
        }));
      }
      const valorLegado = parseFloat(p.valor_sinal_informado) || 0;
      if (valorLegado > 0) {
        return [{ id: `sinal-${p.id}`, _sinalId: null, _pedidoId: p.id, forma: 'Sinal / Adiantamento', valor: valorLegado, referencia: `Pedido #${p.numero_pedido}`, comprovantes: p.arquivos_sinal || [], isReadOnly: true }];
      }
      return [];
    });
    setSinaisInjetados(novosSinais);

    setFormasPagamento(prev => {
      const formasManuais = prev.filter(fp => !fp.isReadOnly);
      return formasManuais.length > 0
        ? formasManuais
        : [{ tipo: 'dinheiro', valor: '', parcelas: '1', dadosCheque: { numero: '', banco: '', agencia: '' }, chequesSalvos: [], comprovante: '' }];
    });

    if (novosSinais.length > 0) {
      const totalSinal = novosSinais.reduce((sum, s) => sum + s.valor, 0);
      toast.info(`💰 ${novosSinais.length} sinal(is) injetado(s) (${formatCurrency(totalSinal)})`, { duration: 4000 });
    }
  }, [selectedPedidos]);

  const pedidosComPort = useMemo(() => {
    const pedidosIds = selectedPedidos.map(p => p?.id).filter(Boolean);
    return todosPortsDisponiveis.filter(port => port?.pedidos_ids?.some(pid => pedidosIds.includes(pid)));
  }, [selectedPedidos, todosPortsDisponiveis]);

  const filteredPedidos = useMemo(() => {
    return pedidos.filter(p =>
      p && ['aberto', 'parcial', 'aguardando', 'troca', 'representante_recebe'].includes(p?.status) &&
      (p?.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p?.cliente_codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p?.numero_pedido?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [pedidos, searchTerm]);

  const togglePedido = (pedido) => {
    setSelectedPedidos(prev => {
      const exists = prev.find(p => p.id === pedido.id);
      if (exists) return prev.filter(p => p.id !== pedido.id);
      return [...prev, pedido];
    });
  };

  const toggleAll = () => {
    if (selectedPedidos.length === filteredPedidos.length) setSelectedPedidos([]);
    else setSelectedPedidos(filteredPedidos);
  };

  const toggleCredito = (id) => {
    setCreditosSelecionados(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const calcularTotais = () => {
    const totalOriginal = selectedPedidos.reduce((sum, p) => {
      const valorParaSomar = p?.status?.toLowerCase() === 'parcial'
        ? Math.max(0, (p?.valor_pedido || 0) - (p?.total_pago || 0))
        : (p?.valor_pedido || 0);
      return sum + valorParaSomar;
    }, 0);
    let desconto = 0;
    if (descontoValor) {
      if (descontoTipo === 'reais') desconto = parseFloat(descontoValor) || 0;
      else desconto = (totalOriginal * (parseFloat(descontoValor) || 0)) / 100;
    }
    const devolucaoValor = parseFloat(devolucao) || 0;
    const totalComDesconto = totalOriginal - desconto - devolucaoValor;
    const totalSinais = sinaisInjetados.reduce((sum, s) => sum + s.valor, 0);
    const totalFormasManuais = formasPagamento
      .filter(fp => !fp.isReadOnly)
      .reduce((sum, fp) => sum + (parseFloat(fp?.valor) || 0), 0);
    const totalPago = totalSinais + totalFormasManuais + creditoAUsar;
    return { totalOriginal, desconto, devolucaoValor, totalComDesconto, totalPago };
  };

  const adicionarFormaPagamento = () => {
    setFormasPagamento([...formasPagamento, { tipo: 'dinheiro', valor: '', parcelas: '1', dadosCheque: { numero: '', banco: '', agencia: '' }, chequesSalvos: [], comprovante: '' }]);
  };

  const removerFormaPagamento = (index) => {
    if (formasPagamento.length > 1) setFormasPagamento(formasPagamento.filter((_, i) => i !== index));
  };

  const atualizarFormaPagamento = (index, campo, valor) => {
    const novasFormas = [...formasPagamento];
    if (campo.includes('.')) {
      const [obj, prop] = campo.split('.');
      novasFormas[index][obj][prop] = valor;
    } else {
      novasFormas[index][campo] = valor;
    }
    setFormasPagamento(novasFormas);
  };

  const setComprovanteForma = (index, url) => {
    const novasFormas = [...formasPagamento];
    novasFormas[index].comprovante = url;
    setFormasPagamento(novasFormas);
  };

  const handleGlobalDrop = async (e) => {
    e.preventDefault();
    globalDragCounter.current = 0;
    setIsGlobalDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    setIsProcessingGlobalDrop(true);
    try {
      const novasFormas = [...formasPagamento];
      // Verifica se a primeira linha está completamente vazia
      const primeiraVazia = novasFormas.length === 1 &&
        !novasFormas[0].comprovante &&
        !novasFormas[0].valor &&
        novasFormas[0].tipo === 'dinheiro';

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const res = await base44.integrations.Core.UploadFile({ file });
          if (i === 0 && primeiraVazia) {
            novasFormas[0].comprovante = res.file_url;
          } else {
            novasFormas.push({ tipo: 'pix', valor: '', parcelas: '1', dadosCheque: { numero: '', banco: '', agencia: '' }, chequesSalvos: [], comprovante: res.file_url });
          }
        } catch {
          toast.error(`Erro ao enviar ${file.name}`);
        }
      }
      setFormasPagamento(novasFormas);
      toast.success(`${files.length} arquivo(s) processado(s)! Preencha os valores.`);
    } finally {
      setIsProcessingGlobalDrop(false);
    }
  };

  const handleDropFile = async (index, file) => {
    if (!file) return;
    setUploadingFormaIndex(index);
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      setComprovanteForma(index, res.file_url);
      toast.success('Comprovante anexado!');
    } catch {
      toast.error('Erro ao enviar arquivo');
    } finally {
      setUploadingFormaIndex(null);
    }
  };

  const handleSaveCheque = async (chequeData) => {
    const novoCheque = await base44.entities.Cheque.create(chequeData);
    const novasFormas = [...formasPagamento];
    novasFormas[chequeModalIndex].chequesSalvos.push(novoCheque);
    novasFormas[chequeModalIndex].valor = String(novasFormas[chequeModalIndex].chequesSalvos.reduce((sum, ch) => sum + (parseFloat(ch.valor) || 0), 0));
    setFormasPagamento(novasFormas);
    setShowChequeModal(false);
    toast.success('Cheque cadastrado!');
  };

  const handleSaveChequeAndAddAnother = async (chequeData) => {
    const novoCheque = await base44.entities.Cheque.create(chequeData);
    const novasFormas = [...formasPagamento];
    novasFormas[chequeModalIndex].chequesSalvos.push(novoCheque);
    novasFormas[chequeModalIndex].valor = String(novasFormas[chequeModalIndex].chequesSalvos.reduce((sum, ch) => sum + (parseFloat(ch.valor) || 0), 0));
    setFormasPagamento(novasFormas);
    toast.success('Cheque cadastrado! Adicione outro.');
  };

  const processDevolucaoFile = async (file) => {
    if (!file) return;
    setUploadingDevolucao(true);
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      setDevolucaoComprovante(res.file_url);
      toast.success('Comprovante de devolução anexado!');
    } catch {
      toast.error('Erro ao enviar comprovante');
    } finally {
      setUploadingDevolucao(false);
    }
  };

  const handleUploadDevolucaoComprovante = (e) => processDevolucaoFile(e.target.files[0]);

  const handleDevolucaoDragOver = (e) => {
    e.preventDefault();
    setIsDraggingDevolucao(true);
  };

  const handleDevolucaoDragLeave = (e) => {
    e.preventDefault();
    setIsDraggingDevolucao(false);
  };

  const handleDevolucaoDrop = (e) => {
    e.preventDefault();
    setIsDraggingDevolucao(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processDevolucaoFile(e.dataTransfer.files[0]);
    }
  };

  // --- PARTE 7: Executa liquidação via backend function (evita timeout em 300+ pedidos) ---
  const executarLiquidacao = async (sobraParaCredito = 0) => {
    setShowCreditoModal(false);
    setIsSaving(true);
    try {
      const res = await base44.functions.invoke('liquidarMassaTransaction', {
        selectedPedidosIds: selectedPedidos.map(p => p.id).filter(Boolean),
        formasPagamento: formasPagamento.filter(fp => !fp.isReadOnly && !fp.isSinal),
        sinaisInjetados,
        creditosSelecionadosIds: creditosSelecionados,
        descontoValor,
        descontoTipo,
        devolucao,
        devolucaoMotivo,
        devolucaoComprovante,
        usarPortsAutomatico,
        sobraParaCredito,
        chequesDevolvidos: chequesDevolvidos.map(c => ({ id: c.id, numero_cheque: c.numero_cheque, valor: c.valor, observacao: c.observacao }))
      });

      const resultado = res.data;
      if (!resultado?.success) throw new Error(resultado?.error || 'Erro no servidor');

      await onSave();
      toast.success(`Borderô #${resultado.numero_bordero} criado! ${resultado.pedidos_quitados} pedidos quitados.`);
      if (resultado.credito_gerado > 0) toast.success(`Crédito de ${formatCurrency(resultado.credito_gerado)} gerado!`);
      if (resultado.cheques_baixados > 0) toast.success(`${resultado.cheques_baixados} cheque(s) devolvido(s) baixado(s)!`);
    } catch (error) {
      toast.error('Erro ao processar liquidação: ' + error.message);
      console.error(error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleLiquidar = async () => {
    if (selectedPedidos.length === 0) { toast.error('Selecione pelo menos um pedido'); return; }

    const totais = calcularTotais();
    const formasManuaisAtivas = formasPagamento.filter(fp => !fp.isReadOnly && !fp.isSinal);
    const dinheirNovoTotal = formasManuaisAtivas.reduce((sum, fp) => sum + (parseFloat(fp?.valor) || 0), 0);
    const totalSinaisInjetados = sinaisInjetados.reduce((sum, s) => sum + s.valor, 0);
    const temAlgumPagamento = dinheirNovoTotal > 0 || creditoAUsar > 0 || totais.desconto > 0 || totais.devolucaoValor > 0 || totalSinaisInjetados > 0;
    if (!temAlgumPagamento) { toast.error('Informe algum valor (pagamento, crédito, desconto ou devolução)'); return; }

    // Validação de comprovante obrigatório
    const tiposComComprovanteObrigatorio = { pix: 'PIX', c_debito: 'C. Débito', c_credito: 'C. Crédito', link_pagamento: 'Link de Pagamento', credito_manual: 'Crédito Manual' };
    for (const fp of formasPagamento.filter(f => !f.isReadOnly)) {
      if (tiposComComprovanteObrigatorio[fp.tipo] && parseFloat(fp.valor) > 0 && !fp.comprovante) {
        toast.error(`O comprovante é obrigatório para pagamentos via ${tiposComComprovanteObrigatorio[fp.tipo]}`);
        return;
      }
    }

    // Validação de devolução
    const temDevolucao = parseFloat(devolucao) > 0;
    if (temDevolucao && !devolucaoMotivo.trim() && !devolucaoComprovante) {
      toast.error('⚠️ Devolução requer um Motivo preenchido OU um Comprovante anexado.');
      return;
    }

    // Verificar se total pago > total devido → pop-up
    const excedente = totais.totalPago - totais.totalComDesconto;
    if (excedente > 0.01) {
      setExcedentePendente(excedente);
      setShowCreditoModal(true);
      return;
    }

    executarLiquidacao(0);
  };

  const totais = calcularTotais();
  const devolucaoValorNum = parseFloat(devolucao) || 0;

  return (
    <div
      className="space-y-6 relative"
      onDragEnter={(e) => { e.preventDefault(); globalDragCounter.current += 1; setIsGlobalDragging(true); }}
      onDragOver={(e) => { e.preventDefault(); }}
      onDragLeave={(e) => { globalDragCounter.current -= 1; if (globalDragCounter.current <= 0) { globalDragCounter.current = 0; setIsGlobalDragging(false); } }}
      onDrop={handleGlobalDrop}
    >
      {/* OVERLAY GLOBAL DE DRAG */}
      {isGlobalDragging && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-blue-900/25 backdrop-blur-sm pointer-events-none border-4 border-dashed border-blue-500 rounded-lg">
          <Upload className="w-16 h-16 text-blue-400 mb-4" />
          <p className="text-xl font-extrabold text-white text-center px-8 drop-shadow-lg">
            Solte os comprovantes aqui para criar as formas de pagamento automaticamente
          </p>
          <p className="text-sm text-blue-200 mt-2">Cada arquivo vira uma nova linha de pagamento</p>
        </div>
      )}
      {isProcessingGlobalDrop && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/30 backdrop-blur-sm pointer-events-none">
          <Loader2 className="w-12 h-12 text-white animate-spin mb-3" />
          <p className="text-white font-semibold text-lg">Processando arquivos...</p>
        </div>
      )}
      {/* BUSCA */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input placeholder="Buscar por cliente, código ou número do pedido..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox id="selectAll" checked={selectedPedidos.length === filteredPedidos.length && filteredPedidos.length > 0} onCheckedChange={toggleAll} />
        <Label htmlFor="selectAll" className="cursor-pointer">Selecionar todos ({selectedPedidos.length}/{filteredPedidos.length})</Label>
      </div>

      {/* LISTA DE PEDIDOS */}
      <div className="max-h-96 overflow-y-auto space-y-2">
        {filteredPedidos.map((pedido) => {
          const saldo = pedido?.saldo_restante || ((pedido?.valor_pedido || 0) - (pedido?.total_pago || 0));
          const isSelected = selectedPedidos.find(p => p?.id === pedido?.id);
          const temPort = todosPortsDisponiveis.some(port => port?.pedidos_ids?.includes(pedido?.id));
          return (
            <Card key={pedido?.id} className={cn("p-4 cursor-pointer transition-all relative", isSelected ? "bg-blue-50 border-blue-300" : "hover:bg-slate-50")} onClick={() => togglePedido(pedido)}>
              <div className="absolute top-2 right-2 flex gap-1">
                {pedido?.status === 'aguardando' && <Badge className="bg-blue-100 text-blue-700 text-xs">🚚 Em Trânsito</Badge>}
                {pedido?.status === 'troca' && <Badge className="bg-orange-100 text-orange-700 text-xs border border-orange-200">🔄 Troca</Badge>}
                {pedido?.status === 'representante_recebe' && <Badge className="bg-purple-100 text-purple-700 text-xs border border-purple-200">👤 Rep. Recebe</Badge>}
                {temPort && <Badge className="bg-amber-100 text-amber-700 text-xs">💰 PORT</Badge>}
              </div>
              <div className="flex items-center gap-4">
                <Checkbox checked={!!isSelected} />
                <div className="flex-1 grid grid-cols-5 gap-4">
                  <div><p className="text-xs text-slate-500">Nº Pedido</p><p className="font-mono text-sm font-medium">{pedido?.numero_pedido || '-'}</p></div>
                  <div><p className="text-xs text-slate-500">Cliente</p><p className="font-medium text-sm truncate">{pedido?.cliente_nome || 'Sem nome'}</p></div>
                  <div><p className="text-xs text-slate-500">Código</p><p className="text-sm">{pedido?.cliente_codigo || '-'}</p></div>
                  <div><p className="text-xs text-slate-500">Data Entrega</p><p className="text-sm">{pedido?.data_entrega ? new Date(pedido.data_entrega).toLocaleDateString('pt-BR') : '-'}</p></div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Saldo</p>
                    <p className="font-bold text-sm">{formatCurrency(saldo)}</p>
                    {Number(pedido.valor_sinal_informado) > 0 && <div className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded mt-1 inline-block">💰 Sinal: {formatCurrency(pedido.valor_sinal_informado)}</div>}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {selectedPedidos.length > 0 && (
        <>
          {sinaisInjetados.length > 0 && (
            <Card className="p-3 bg-blue-50 border-blue-200 border flex items-start gap-3">
              <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-700">
                O valor a liquidar usa o <strong>valor integral do pedido</strong>. Os sinais/adiantamentos foram injetados automaticamente como formas de pagamento.
              </p>
            </Card>
          )}

          {pedidosComPort.length > 0 && (
            <Card className="p-4 bg-amber-50 border-amber-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-amber-600" />
                  <div>
                    <p className="font-bold text-amber-700">💰 Sinais Disponíveis Detectados</p>
                    <p className="text-xs text-slate-600">{pedidosComPort.length} PORT(s) vinculado(s) aos pedidos selecionados</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="usarPorts" checked={usarPortsAutomatico} onCheckedChange={setUsarPortsAutomatico} />
                  <Label htmlFor="usarPorts" className="cursor-pointer font-medium">Abater automaticamente</Label>
                </div>
              </div>
              {usarPortsAutomatico && (
                <div className="mt-3 pt-3 border-t border-amber-300 space-y-1">
                  {pedidosComPort.map(port => (
                    <div key={port.id} className="flex justify-between text-xs">
                      <span>PORT #{port.numero_port}</span>
                      <span className="font-bold">{formatCurrency(port.saldo_disponivel)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          <Card className="p-4 bg-slate-50 space-y-4">
            <h3 className="font-semibold">Ajustes de Pagamento</h3>

            {/* DESCONTO */}
            <div className="space-y-2">
              <Label>Desconto</Label>
              <RadioGroup value={descontoTipo} onValueChange={setDescontoTipo} className="flex gap-4">
                <div className="flex items-center gap-2"><RadioGroupItem value="reais" id="reais" /><Label htmlFor="reais">Em Reais (R$)</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="porcentagem" id="porcentagem" /><Label htmlFor="porcentagem">Em Porcentagem (%)</Label></div>
              </RadioGroup>
              <div className="relative">
                {descontoTipo === 'reais' ? <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /> : <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />}
                <Input type="number" step="0.01" min="0" value={descontoValor} onChange={(e) => setDescontoValor(e.target.value)} className="pl-10" />
              </div>
            </div>

            {/* DEVOLUÇÃO + CAMPOS CONDICIONAIS */}
            <div className="space-y-2">
              <Label>Devolução (R$)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input type="number" step="0.01" min="0" value={devolucao} onChange={(e) => setDevolucao(e.target.value)} className="pl-10" />
              </div>

              {devolucaoValorNum > 0 && (
                <Card
                  className="p-3 bg-orange-50 border-orange-200 space-y-3 mt-2 relative overflow-hidden"
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingDevolucao(true); }}
                  onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingDevolucao(true); }}
                  onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); if (!e.currentTarget.contains(e.relatedTarget)) setIsDraggingDevolucao(false); }}
                  onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingDevolucao(false); if (e.dataTransfer.files?.[0]) processDevolucaoFile(e.dataTransfer.files[0]); }}
                >
                  {isDraggingDevolucao && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm border-2 border-dashed border-emerald-500 rounded-lg pointer-events-none">
                      <Upload className="w-8 h-8 text-emerald-600 mb-1" />
                      <span className="text-emerald-700 font-semibold text-sm">Solte o comprovante aqui</span>
                    </div>
                  )}
                  <p className="text-xs font-semibold text-orange-700 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Preencha ao menos um campo abaixo para registrar a devolução
                  </p>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Motivo da Devolução</Label>
                    <Textarea
                      value={devolucaoMotivo}
                      onChange={(e) => setDevolucaoMotivo(e.target.value)}
                      placeholder="Descreva o motivo da devolução..."
                      className="h-20 resize-none text-sm bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Comprovante da Devolução</Label>
                    {devolucaoComprovante ? (
                      <div className="flex items-center gap-2 p-2 bg-white border border-emerald-200 rounded-lg">
                        <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                        <a href={devolucaoComprovante} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-700 hover:underline flex-1 truncate">Ver comprovante</a>
                        <Button type="button" size="icon" variant="ghost" onClick={() => setDevolucaoComprovante('')} className="h-6 w-6 text-red-500 hover:bg-red-50"><X className="w-3 h-3" /></Button>
                      </div>
                    ) : (
                      <>
                        <input ref={devolucaoComprovanteRef} type="file" accept="image/*,.pdf" onChange={handleUploadDevolucaoComprovante} className="hidden" />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={uploadingDevolucao}
                          onClick={() => devolucaoComprovanteRef.current?.click()}
                          className="w-full h-8 text-xs gap-1.5 border-dashed bg-white"
                        >
                          {uploadingDevolucao ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                          {uploadingDevolucao ? 'Enviando...' : 'Anexar Comprovante'}
                        </Button>
                      </>
                    )}
                  </div>
                </Card>
              )}
            </div>

            {/* FORMAS DE PAGAMENTO COM COMPROVANTE INLINE */}
            <div className="space-y-3 pt-3 border-t">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Formas de Pagamento</Label>
                <Button type="button" size="sm" variant="outline" onClick={adicionarFormaPagamento}><Plus className="w-4 h-4 mr-2" />Adicionar</Button>
              </div>

              {sinaisInjetados.map(sinal => (
                <Card key={sinal.id} className="p-3 bg-amber-50 border-amber-200 border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-amber-800">💰 {sinal.forma}</span>
                      <Badge className="bg-amber-400 text-white text-[10px] px-2 py-0.5">Auto · {sinal.referencia}</Badge>
                    </div>
                    <span className="font-bold text-amber-700">{formatCurrency(sinal.valor)}</span>
                  </div>
                  <p className="text-[10px] text-amber-600 mt-1">Pré-pagamento registrado. Não pode ser editado ou removido.</p>
                  {sinal.comprovantes && sinal.comprovantes.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {sinal.comprovantes.map((url, i) => (
                        <div key={i} className="flex items-center gap-2 p-1.5 bg-amber-100 border border-amber-200 rounded-lg">
                          <FileText className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                          <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-amber-800 hover:underline flex-1 truncate">
                            Ver comprovante {sinal.comprovantes.length > 1 ? `(${i + 1})` : ''}
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              ))}

              {formasPagamento.map((fp, index) => (
                <Card
                  key={index}
                  className="bg-white p-3 relative overflow-hidden"
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDraggingIndex(index); }}
                  onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDraggingIndex(index); }}
                  onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); if (!e.currentTarget.contains(e.relatedTarget)) setDraggingIndex(null); }}
                  onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setDraggingIndex(null); handleDropFile(index, e.dataTransfer.files[0]); }}
                >
                  {draggingIndex === index && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm border-2 border-dashed border-emerald-500 rounded-lg pointer-events-none">
                      <Upload className="w-8 h-8 text-emerald-600 mb-1" />
                      <span className="text-emerald-700 font-semibold text-sm">Solte o comprovante aqui</span>
                    </div>
                  )}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Forma {index + 1}</span>
                      {formasPagamento.length > 1 && <Button type="button" size="sm" variant="ghost" onClick={() => removerFormaPagamento(index)} className="text-red-600 h-6"><X className="w-3 h-3" /></Button>}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Tipo *</Label>
                        <Select value={fp.tipo} onValueChange={(v) => atualizarFormaPagamento(index, 'tipo', v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="dinheiro">Dinheiro</SelectItem>
                            <SelectItem value="pix">PIX</SelectItem>
                            <SelectItem value="cheque">Cheque</SelectItem>
                            <SelectItem value="servicos">Serviços</SelectItem>
                            <SelectItem value="c_debito">C. Débito</SelectItem>
                            <SelectItem value="c_credito">C. Crédito</SelectItem>
                            <SelectItem value="link_pagamento">Link de Pagamento</SelectItem>
                            <SelectItem value="credito_manual">Crédito Manual</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Valor (R$) *</Label>
                        <Input type="number" step="0.01" value={fp.valor} onChange={(e) => atualizarFormaPagamento(index, 'valor', e.target.value)} disabled={fp.tipo === 'cheque'} />
                      </div>
                    </div>

                    {(fp.tipo === 'c_credito' || fp.tipo === 'link_pagamento') && (
                      <div className="space-y-2">
                        <Label>Parcelas</Label>
                        <Select value={fp.parcelas} onValueChange={(v) => atualizarFormaPagamento(index, 'parcelas', v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{Array.from({ length: 18 }, (_, i) => i + 1).map(n => (<SelectItem key={n} value={String(n)}>{n}x</SelectItem>))}</SelectContent>
                        </Select>
                      </div>
                    )}

                    {fp.tipo === 'cheque' && (
                      <div className="space-y-2">
                        <Button type="button" variant="outline" onClick={() => { setChequeModalIndex(index); setShowChequeModal(true); }} className="w-full text-xs h-8">
                          {fp.chequesSalvos.length > 0 ? `+ Adicionar mais cheques (${fp.chequesSalvos.length} salvo(s))` : 'Cadastrar Cheque'}
                        </Button>
                        {fp.chequesSalvos.length > 0 && (
                          <div className="space-y-1">
                            {fp.chequesSalvos.map((ch, ci) => (
                              <div key={ci} className="flex items-center justify-between text-xs bg-slate-50 border rounded px-2 py-1.5">
                                <span className="text-slate-700">Cheque #{ch.numero_cheque} · {ch.banco} · <strong>{formatCurrency(ch.valor)}</strong></span>
                                <Button
                                  type="button" size="icon" variant="ghost"
                                  className="h-5 w-5 text-red-500 hover:bg-red-50"
                                  onClick={() => {
                                    const novasFormas = [...formasPagamento];
                                    novasFormas[index].chequesSalvos = novasFormas[index].chequesSalvos.filter((_, i) => i !== ci);
                                    novasFormas[index].valor = String(novasFormas[index].chequesSalvos.reduce((s, c) => s + (parseFloat(c.valor) || 0), 0));
                                    setFormasPagamento(novasFormas);
                                  }}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* COMPROVANTE INLINE POR FORMA */}
                    <UploadInline
                      comprovante={fp.comprovante}
                      onUpload={(url) => setComprovanteForma(index, url)}
                      onRemove={() => setComprovanteForma(index, '')}
                      uploading={uploadingFormaIndex === index}
                    />
                  </div>
                </Card>
              ))}
            </div>

            {/* PARTE 4: CHEQUES DEVOLVIDOS DO CLIENTE */}
            {chequesDevolvidos_db.length > 0 && (
              <Card className="p-4 bg-red-50 border-red-200">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span className="font-bold text-red-700">Cheques Devolvidos do Cliente</span>
                  <Badge className="bg-red-100 text-red-700 text-xs">{chequesDevolvidos_db.length} pendentes</Badge>
                </div>
                <p className="text-xs text-red-600 mb-3">Selecione cheques devolvidos para baixá-los junto com esta liquidação (no mesmo Borderô).</p>
                <div className="space-y-2">
                  {chequesDevolvidos_db.map(cheque => (
                    <div key={cheque.id} className="flex items-center gap-3 p-2.5 bg-white rounded-lg border border-red-100">
                      <Checkbox
                        id={`chqdev-${cheque.id}`}
                        checked={!!chequesDevolvidos.find(c => c.id === cheque.id)}
                        onCheckedChange={() => toggleChequeDev(cheque)}
                      />
                      <Label htmlFor={`chqdev-${cheque.id}`} className="flex-1 cursor-pointer text-sm">
                        <span className="font-medium text-slate-800">Cheque #{cheque.numero_cheque}</span>
                        <span className="text-slate-500 ml-2 text-xs">{cheque.banco} · Motivo: {cheque.motivo_devolucao || '—'}</span>
                      </Label>
                      <span className="font-bold text-red-700 text-sm">{formatCurrency(cheque.valor)}</span>
                    </div>
                  ))}
                </div>
                {totalChequesDevolvidos > 0 && (
                  <div className="mt-2 pt-2 border-t border-red-200 flex justify-between items-center text-sm">
                    <span className="text-red-700 font-medium">Total cheques a baixar:</span>
                    <span className="font-bold text-red-800">{formatCurrency(totalChequesDevolvidos)}</span>
                  </div>
                )}
              </Card>
            )}

            {/* CRÉDITOS VIA CHECKBOX */}
            {creditos.length > 0 && (
              <Card className="p-4 bg-green-50 border-green-200">
                <div className="flex items-center gap-2 mb-3">
                  <Wallet className="w-4 h-4 text-green-700" />
                  <span className="font-bold text-green-700">Créditos Disponíveis do Cliente</span>
                </div>
                <div className="space-y-2">
                  {creditos.map(cred => (
                    <div key={cred.id} className="flex items-center gap-3 p-2.5 bg-white rounded-lg border border-green-100">
                      <Checkbox
                        id={`cred-${cred.id}`}
                        checked={creditosSelecionados.includes(cred.id)}
                        onCheckedChange={() => toggleCredito(cred.id)}
                      />
                      <Label htmlFor={`cred-${cred.id}`} className="flex-1 cursor-pointer text-sm">
                        <span className="font-medium text-slate-800">{cred.origem || 'Crédito'}</span>
                        {cred.created_date && (
                          <span className="text-slate-500 ml-1 text-xs">
                            — {new Date(cred.created_date).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </Label>
                      <span className="font-bold text-green-700 text-sm">{formatCurrency(cred.valor)}</span>
                    </div>
                  ))}
                </div>
                {creditoAUsar > 0 && (
                  <div className="mt-2 pt-2 border-t border-green-200 flex justify-between items-center text-sm">
                    <span className="text-green-700 font-medium">Total de créditos selecionados:</span>
                    <span className="font-bold text-green-800">{formatCurrency(creditoAUsar)}</span>
                  </div>
                )}
              </Card>
            )}

            {/* TOTALIZADOR */}
            <div className="pt-4 border-t space-y-2">
              <div className="flex justify-between text-sm"><span>Valor Integral dos Pedidos:</span><span className="font-medium">{formatCurrency(totais.totalOriginal)}</span></div>
              {sinaisInjetados.length > 0 && (
                <div className="flex justify-between text-sm text-amber-600">
                  <span>💰 Sinais / Adiantamentos:</span>
                  <span>- {formatCurrency(sinaisInjetados.reduce((s, x) => s + x.valor, 0))}</span>
                </div>
              )}
              {totais.desconto > 0 && <div className="flex justify-between text-sm text-red-600"><span>Desconto:</span><span>- {formatCurrency(totais.desconto)}</span></div>}
              {totais.devolucaoValor > 0 && <div className="flex justify-between text-sm text-orange-600"><span>Devolução:</span><span>- {formatCurrency(totais.devolucaoValor)}</span></div>}
              {creditoAUsar > 0 && <div className="flex justify-between text-sm text-green-600"><span>Créditos Usados:</span><span>- {formatCurrency(creditoAUsar)}</span></div>}
              <div className="flex justify-between font-bold text-lg text-blue-700 border-t pt-2"><span>Total a Pagar:</span><span>{formatCurrency(totais.totalComDesconto)}</span></div>
              <div className="flex justify-between font-bold text-lg text-green-700"><span>Total Pago:</span><span>{formatCurrency(totais.totalPago)}</span></div>
              {totais.totalPago < totais.totalComDesconto && (
                <div className="flex justify-between font-bold text-base text-amber-600 border-t pt-2 border-amber-100">
                  <span>Falta Pagar:</span>
                  <span>{formatCurrency(totais.totalComDesconto - totais.totalPago)}</span>
                </div>
              )}
              {totais.totalPago > totais.totalComDesconto + 0.01 && (
                <div className="flex justify-between font-bold text-base text-indigo-600 border-t pt-2 border-indigo-100">
                  <span>💳 Excedente (vira crédito):</span>
                  <span>{formatCurrency(totais.totalPago - totais.totalComDesconto)}</span>
                </div>
              )}
              {totais.totalPago < totais.totalComDesconto && totais.totalPago > 0 && (
                <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg">⚠️ Liquidação parcial — o pedido ficará com status <strong>Parcial</strong>.</p>
              )}
            </div>
          </Card>
        </>
      )}

      {/* BOTÕES */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel} disabled={isLoading || isSaving}>Cancelar</Button>
        <Button
          onClick={handleLiquidar}
          disabled={isLoading || isSaving || selectedPedidos.length === 0 || totais.totalPago <= 0}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processando...</> : 'Liquidar em Massa'}
        </Button>
      </div>

      {/* OVERLAY DE LOADING */}
      {isSaving && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-800">Processando Liquidação em Massa</h3>
              <p className="text-sm text-slate-500">Gerando Borderô e atualizando {selectedPedidos.length} pedidos...</p>
            </div>
          </div>
        </div>
      )}

      {/* POP-UP: PAGAMENTO A MAIOR → GERAR CRÉDITO */}
      <Dialog open={showCreditoModal} onOpenChange={setShowCreditoModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <Sparkles className="w-5 h-5" />
              Pagamento a Maior Detectado
            </DialogTitle>
            <DialogDescription>
              Confirme como deseja tratar o valor excedente
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-center">
              <p className="text-sm text-indigo-700 mb-1">Valor informado é</p>
              <p className="text-3xl font-extrabold text-indigo-800">{formatCurrency(excedentePendente)}</p>
              <p className="text-sm text-indigo-700 mt-1">maior que o total devido</p>
            </div>
            <p className="text-sm text-slate-600">
              Deseja gerar esse valor como um <strong>Crédito</strong> para o cliente{' '}
              <strong>{selectedPedidos[0]?.cliente_nome}</strong> utilizar em compras futuras?
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <Button
                onClick={() => executarLiquidacao(excedentePendente)}
                className="bg-indigo-600 hover:bg-indigo-700 gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Sim, Gerar Crédito e Liquidar
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowCreditoModal(false)}
                className="text-slate-600"
              >
                Não, vou corrigir os valores
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL CHEQUE */}
      <ModalContainer open={showChequeModal} onClose={() => setShowChequeModal(false)} title="Adicionar Cheque" size="lg">
        {selectedPedidos[0] && (
          <AdicionarChequeModal
            clienteInfo={{ cliente_codigo: selectedPedidos[0].cliente_codigo, cliente_nome: selectedPedidos[0].cliente_nome }}
            onSave={handleSaveCheque}
            onSaveAndAddAnother={handleSaveChequeAndAddAnother}
            onCancel={() => setShowChequeModal(false)}
          />
        )}
      </ModalContainer>
    </div>
  );
}