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
import { Search, DollarSign, Percent, Wallet, Loader2, Plus, X, Upload, FileText, Trash2, Info, AlertTriangle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import ModalContainer from "@/components/modals/ModalContainer";
import AdicionarChequeModal from "@/components/pedidos/AdicionarChequeModal";
import { toast } from "sonner";

const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

// --- Sub-componente: Upload inline por forma de pagamento ---
function UploadInline({ comprovante, onUpload, onRemove }) {
  const ref = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      onUpload(res.file_url);
      toast.success('Comprovante anexado!');
    } catch {
      toast.error('Erro ao enviar arquivo');
    } finally {
      setUploading(false);
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

  // --- Pop-up de crédito excedente ---
  const [showCreditoModal, setShowCreditoModal] = useState(false);
  const [excedentePendente, setExcedentePendente] = useState(0);

  const [usarPortsAutomatico, setUsarPortsAutomatico] = useState(false);

  const { data: creditos = [] } = useQuery({
    queryKey: ['creditos', selectedPedidos[0]?.cliente_codigo],
    queryFn: async () => {
      if (!selectedPedidos[0]?.cliente_codigo) return [];
      const todosCreditos = await base44.entities.Credito.list();
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
      p && ['aberto', 'parcial', 'aguardando'].includes(p?.status) &&
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
    const totalOriginal = selectedPedidos.reduce((sum, p) => sum + (p?.valor_pedido || 0), 0);
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

  const handleUploadDevolucaoComprovante = async (e) => {
    const file = e.target.files[0];
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

  // --- Executa a liquidação de fato ---
  const executarLiquidacao = async (sobraParaCredito = 0) => {
    setShowCreditoModal(false);
    setIsSaving(true);
    try {
      const user = await base44.auth.me();
      const totais = calcularTotais();
      const formasManuaisAtivas = formasPagamento.filter(fp => !fp.isReadOnly && !fp.isSinal);
      const dinheirNovoTotal = formasManuaisAtivas.reduce((sum, fp) => sum + (parseFloat(fp?.valor) || 0), 0);
      const totalSinaisInjetados = sinaisInjetados.reduce((sum, s) => sum + s.valor, 0);

      let devolucaoRestante = totais.devolucaoValor;
      let descontoRestante = totais.desconto;
      let creditoRestante = creditoAUsar;
      let pagamentoRestante = dinheirNovoTotal;

      const portsUsados = [];
      const portsParaUsar = usarPortsAutomatico ? [...pedidosComPort] : [];
      const pedidosProcessados = [];

      for (const pedido of selectedPedidos) {
        if (!pedido?.id) continue;
        let saldoAtual = pedido?.saldo_restante ?? Math.max(0, (pedido?.valor_pedido || 0) - (pedido?.total_pago || 0));
        let devolucaoAplicada = 0, descontoAplicado = 0, portAplicado = 0, creditoAplicado = 0, pagamentoAplicado = 0, portUsadoInfo = null;

        if (devolucaoRestante > 0 && saldoAtual > 0) { const v = Math.min(saldoAtual, devolucaoRestante); devolucaoAplicada = v; saldoAtual -= v; devolucaoRestante -= v; }
        if (descontoRestante > 0 && saldoAtual > 0) { const v = Math.min(saldoAtual, descontoRestante); descontoAplicado = v; saldoAtual -= v; descontoRestante -= v; }

        if (usarPortsAutomatico && saldoAtual > 0) {
          const portParaEstePedido = portsParaUsar.find(port => port?.pedidos_ids?.includes(pedido?.id) && (port?.saldo_disponivel || 0) > 0);
          if (portParaEstePedido) {
            const valorUsar = Math.min(saldoAtual, portParaEstePedido?.saldo_disponivel || 0);
            portAplicado = valorUsar; saldoAtual -= valorUsar; portParaEstePedido.saldo_disponivel -= valorUsar;
            portUsadoInfo = { id: portParaEstePedido?.id, numero: portParaEstePedido?.numero_port, valorUsado: valorUsar };
            const portJaUsado = portsUsados.find(p => p?.id === portParaEstePedido?.id);
            if (portJaUsado) portJaUsado.valorTotal += valorUsar;
            else portsUsados.push({ id: portParaEstePedido?.id, numero: portParaEstePedido?.numero_port, valorTotal: valorUsar, saldoRestante: portParaEstePedido?.saldo_disponivel || 0, comprovantes_urls: portParaEstePedido?.comprovantes_urls || [] });
          }
        }

        if (creditoRestante > 0 && saldoAtual > 0) { const v = Math.min(saldoAtual, creditoRestante); creditoAplicado = v; saldoAtual -= v; creditoRestante -= v; }
        if (pagamentoRestante > 0 && saldoAtual > 0) { const v = Math.min(saldoAtual, pagamentoRestante); pagamentoAplicado = v; saldoAtual -= v; pagamentoRestante -= v; }

        pedidosProcessados.push({ pedido, novoTotalPago: (pedido?.total_pago || 0) + pagamentoAplicado + creditoAplicado + devolucaoAplicada + portAplicado, novoDescontoTotal: (pedido?.desconto_dado || 0) + descontoAplicado, novoSaldo: Math.max(0, saldoAtual), devolucaoAplicada, descontoAplicado, portAplicado, portUsadoInfo, creditoAplicado, pagamentoAplicado });
      }

      // Borderô
      const todosBorderos = await base44.entities.Bordero.list();
      const proximoNumeroBordero = todosBorderos.length > 0 ? Math.max(...todosBorderos.map(b => b.numero_bordero || 0)) + 1 : 1;

      let todosChequesUsados = [];
      const formasManuaisStr = formasManuaisAtivas.filter(fp => parseFloat(fp.valor) > 0).map(fp => {
        let str = `${fp.tipo.toUpperCase()}: ${formatCurrency(parseFloat(fp.valor))}`;
        if (fp.tipo === 'credito' && fp.parcelas !== '1') str += ` (${fp.parcelas}x)`;
        if (fp.chequesSalvos && fp.chequesSalvos.length > 0) { str += ` | ${fp.chequesSalvos.length} cheque(s)`; todosChequesUsados = [...todosChequesUsados, ...fp.chequesSalvos]; }
        return str;
      }).join(' | ');

      const sinaisStr = sinaisInjetados.map(s => `SINAL (Histórico) · ${s.referencia}: ${formatCurrency(s.valor)}`).join(' | ');
      const creditoEfetivamenteUsado = creditoAUsar - creditoRestante;
      const totalPortUsado = portsUsados.reduce((sum, p) => sum + p.valorTotal, 0);

      let formasFinal = [sinaisStr, formasManuaisStr].filter(Boolean).join(' | ');
      if (totalPortUsado > 0) formasFinal += ` | SINAL PORT (${portsUsados.map(p => `#${p.numero}`).join(', ')}): ${formatCurrency(totalPortUsado)}`;
      if (creditoEfetivamenteUsado > 0) formasFinal += ` | CRÉDITO: ${formatCurrency(creditoEfetivamenteUsado)}`;
      if (totais.desconto > 0) formasFinal += ` | DESCONTO: ${formatCurrency(totais.desconto)}`;
      if (totais.devolucaoValor > 0) formasFinal += ` | DEVOLUÇÃO: ${formatCurrency(totais.devolucaoValor)}`;

      // Comprovantes = todos os comprovantes inline das formas + comprovante de devolução + ports
      let comprovantesFinais = formasManuaisAtivas.map(fp => fp.comprovante).filter(Boolean);
      if (devolucaoComprovante) comprovantesFinais.push(devolucaoComprovante);
      portsUsados.forEach(port => { if (port.comprovantes_urls) comprovantesFinais = [...comprovantesFinais, ...port.comprovantes_urls]; });

      const chequesAnexos = todosChequesUsados.map(ch => ({ numero: ch.numero_cheque, banco: ch.banco, agencia: ch.agencia, conta: ch.conta, emitente: ch.emitente, valor: ch.valor, data_vencimento: ch.data_vencimento, anexo_foto_url: ch.anexo_foto_url, anexo_video_url: ch.anexo_video_url }));
      const valorTotalBordero = dinheirNovoTotal + creditoEfetivamenteUsado + totalPortUsado + totalSinaisInjetados;

      let observacaoBordero = `Desconto: ${formatCurrency(totais.desconto)} | Devolução: ${formatCurrency(totais.devolucaoValor)} | ${selectedPedidos.length} pedidos`;
      if (devolucaoMotivo) observacaoBordero += ` | Motivo devolução: ${devolucaoMotivo}`;
      if (totalPortUsado > 0) observacaoBordero += ` | PORTs usados: ${portsUsados.map(p => `#${p?.numero || 'N/A'}`).join(', ')}`;

      await base44.entities.Bordero.create({
        numero_bordero: proximoNumeroBordero,
        tipo_liquidacao: 'massa',
        cliente_codigo: selectedPedidos[0]?.cliente_codigo || '',
        cliente_nome: selectedPedidos[0]?.cliente_nome || '',
        pedidos_ids: selectedPedidos.map(p => p?.id).filter(Boolean),
        valor_total: valorTotalBordero,
        forma_pagamento: formasFinal,
        comprovantes_urls: comprovantesFinais,
        cheques_anexos: chequesAnexos,
        observacao: observacaoBordero,
        liquidado_por: user?.email || ''
      });

      for (const proc of pedidosProcessados) {
        if (!proc?.pedido?.id) continue;
        await base44.entities.Pedido.update(proc.pedido.id, {
          total_pago: proc?.novoTotalPago || 0,
          desconto_dado: proc?.novoDescontoTotal || 0,
          saldo_restante: proc?.novoSaldo || 0,
          status: (proc?.novoSaldo || 0) <= 0 ? 'pago' : 'parcial',
          data_pagamento: (proc?.novoSaldo || 0) <= 0 ? new Date().toISOString().split('T')[0] : proc?.pedido?.data_pagamento,
          mes_pagamento: (proc?.novoSaldo || 0) <= 0 ? new Date().toISOString().slice(0, 7) : proc?.pedido?.mes_pagamento,
          bordero_numero: proximoNumeroBordero,
          outras_informacoes: (proc?.pedido?.outras_informacoes || '') + `\n[${new Date().toLocaleDateString('pt-BR')}] Borderô #${proximoNumeroBordero}: Dev=${formatCurrency(proc?.devolucaoAplicada || 0)} | Desc=${formatCurrency(proc?.descontoAplicado || 0)} | Créd=${formatCurrency(proc?.creditoAplicado || 0)} | Pago=${formatCurrency(proc?.pagamentoAplicado || 0)}`
        });
      }

      for (const sinalInj of sinaisInjetados) {
        if (!sinalInj._sinalId || !sinalInj._pedidoId) continue;
        const pedidoOriginal = selectedPedidos.find(p => p.id === sinalInj._pedidoId);
        if (!pedidoOriginal || !pedidoOriginal.sinais_historico) continue;
        await base44.entities.Pedido.update(sinalInj._pedidoId, { sinais_historico: pedidoOriginal.sinais_historico.map(s => s.id === sinalInj._sinalId ? { ...s, usado: true } : s) });
      }

      for (const portUsado of portsUsados) {
        if (!portUsado?.id) continue;
        const portOriginal = await base44.entities.Port.get(portUsado.id);
        await base44.entities.Port.update(portUsado.id, {
          saldo_disponivel: portUsado?.saldoRestante || 0,
          status: (portUsado?.saldoRestante || 0) <= 0 ? 'finalizado' : 'parcialmente_usado',
          observacao: `${portOriginal?.observacao || ''}\n[${new Date().toLocaleDateString('pt-BR')}] Usado ${formatCurrency(portUsado?.valorTotal || 0)} no Borderô #${proximoNumeroBordero}`.trim()
        });
      }

      if (creditoEfetivamenteUsado > 0) {
        let valorAMarcar = creditoEfetivamenteUsado;
        for (const credito of creditosSelecionados.map(id => creditos.find(c => c.id === id)).filter(Boolean)) {
          if (valorAMarcar <= 0) break;
          await base44.entities.Credito.update(credito.id, { status: 'usado', pedido_uso_id: selectedPedidos[0]?.id || '', data_uso: new Date().toISOString().split('T')[0] });
          valorAMarcar -= credito.valor || 0;
        }
      }

      // Gerar crédito pelo excedente (confirmado pelo usuário)
      if (sobraParaCredito > 0.01) {
        const todosCreditos = await base44.entities.Credito.list();
        const proximoNumero = todosCreditos.length > 0 ? Math.max(...todosCreditos.map(c => c?.numero_credito || 0)) + 1 : 1;
        await base44.entities.Credito.create({
          numero_credito: proximoNumero,
          cliente_codigo: selectedPedidos[0]?.cliente_codigo || '',
          cliente_nome: selectedPedidos[0]?.cliente_nome || '',
          valor: sobraParaCredito,
          origem: `Excedente Liquidação Massa - Borderô #${proximoNumeroBordero}`,
          status: 'disponivel'
        });
        toast.success(`Crédito #${proximoNumero} de ${formatCurrency(sobraParaCredito)} gerado!`);
      }

      await onSave();
      toast.success(`Borderô #${proximoNumeroBordero} criado! ${pedidosProcessados.filter(p => p.novoSaldo <= 0).length} pedidos quitados.`);
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
    <div className="space-y-6">
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
                <Card className="p-3 bg-orange-50 border-orange-200 space-y-3 mt-2">
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
                    <input ref={devolucaoComprovanteRef} type="file" accept="image/*,.pdf" onChange={handleUploadDevolucaoComprovante} className="hidden" />
                    {devolucaoComprovante ? (
                      <div className="flex items-center gap-2 p-2 bg-white border border-emerald-200 rounded-lg">
                        <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                        <a href={devolucaoComprovante} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-700 hover:underline flex-1 truncate">Ver comprovante</a>
                        <Button type="button" size="icon" variant="ghost" onClick={() => setDevolucaoComprovante('')} className="h-6 w-6 text-red-500 hover:bg-red-50"><X className="w-3 h-3" /></Button>
                      </div>
                    ) : (
                      <Button type="button" size="sm" variant="outline" disabled={uploadingDevolucao} onClick={() => devolucaoComprovanteRef.current?.click()} className="w-full h-8 text-xs gap-1.5 border-dashed">
                        {uploadingDevolucao ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                        {uploadingDevolucao ? 'Enviando...' : 'Anexar Comprovante'}
                      </Button>
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
                </Card>
              ))}

              {formasPagamento.map((fp, index) => (
                <Card key={index} className="bg-white p-3">
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
                            <SelectItem value="debito">Débito</SelectItem>
                            <SelectItem value="credito">Crédito</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Valor (R$) *</Label>
                        <Input type="number" step="0.01" value={fp.valor} onChange={(e) => atualizarFormaPagamento(index, 'valor', e.target.value)} disabled={fp.tipo === 'cheque' && fp.chequesSalvos.length > 0} />
                      </div>
                    </div>

                    {fp.tipo === 'credito' && (
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
                        <div className="grid grid-cols-3 gap-2">
                          <div><Label className="text-xs">Nº Cheque</Label><Input value={fp.dadosCheque.numero} onChange={(e) => atualizarFormaPagamento(index, 'dadosCheque.numero', e.target.value)} /></div>
                          <div><Label className="text-xs">Banco</Label><Input value={fp.dadosCheque.banco} onChange={(e) => atualizarFormaPagamento(index, 'dadosCheque.banco', e.target.value)} /></div>
                          <div><Label className="text-xs">Agência</Label><Input value={fp.dadosCheque.agencia} onChange={(e) => atualizarFormaPagamento(index, 'dadosCheque.agencia', e.target.value)} /></div>
                        </div>
                        <Button type="button" variant="outline" onClick={() => { setChequeModalIndex(index); setShowChequeModal(true); }} className="w-full text-xs h-8">
                          {fp.chequesSalvos.length > 0 ? `${fp.chequesSalvos.length} Cheque(s) Salvos - Adicionar` : 'Cadastrar Cheque Completo'}
                        </Button>
                      </div>
                    )}

                    {/* COMPROVANTE INLINE POR FORMA */}
                    <UploadInline
                      comprovante={fp.comprovante}
                      onUpload={(url) => setComprovanteForma(index, url)}
                      onRemove={() => setComprovanteForma(index, '')}
                    />
                  </div>
                </Card>
              ))}
            </div>

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