import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Wallet, Plus, DollarSign, Clock, ArrowLeft, Save, Loader2,
  CheckCircle, Ticket, Receipt, ArrowUpCircle, ArrowDownCircle,
  Users, AlertCircle, Edit, Hash, FileText, Filter
} from "lucide-react";
import { imprimirExtrato } from "@/components/caixa/ExtratoCaixaPDF";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import ModalContainer from "@/components/modals/ModalContainer";
import PermissionGuard from "@/components/PermissionGuard";
import { cn } from "@/lib/utils";
import { format, isToday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

import CriarValeModal from "@/components/caixa/CriarValeModal";
import BaixarValeModal from "@/components/caixa/BaixarValeModal";
import EditarValeModal from "@/components/caixa/EditarValeModal";

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

// ── Calcular próximo ticket_id sequencial ──────────────────────────────────
async function getProximoTicketId() {
  const todos = await base44.entities.Vale.list('-ticket_id', 1);
  const ultimo = todos[0]?.ticket_id || 0;
  return ultimo + 1;
}

// ── SaldoCard ─────────────────────────────────────────────────────────────
function SaldoCard({ movimentacoes }) {
  const ultimaMov = movimentacoes[0];
  const saldoAtual = ultimaMov?.saldo_atual || 0;

  const movHoje = movimentacoes.filter(m => m?.created_date && isToday(parseISO(m.created_date)));
  const entradasHoje = movHoje.filter(m => ['entrada', 'ticket_troco', 'aporte'].includes(m?.tipo_operacao)).reduce((s, m) => s + (m?.valor || 0), 0);
  const saidasHoje = movHoje.filter(m => ['saida', 'sangria', 'ticket_criado', 'ticket_reembolso'].includes(m?.tipo_operacao)).reduce((s, m) => s + (m?.valor || 0), 0);

  return (
    <Card className="p-6 bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium opacity-90">💰 Caixa em Tempo Real</h3>
        <Wallet className="w-6 h-6 opacity-70" />
      </div>
      <div className="mb-6">
        <p className="text-sm opacity-80 mb-1">Saldo Atual</p>
        <p className="text-5xl font-bold tracking-tight">{formatCurrency(saldoAtual)}</p>
      </div>
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/20">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ArrowUpCircle className="w-4 h-4 text-green-200" />
            <p className="text-xs opacity-80">Entradas Hoje</p>
          </div>
          <p className="text-xl font-semibold">{formatCurrency(entradasHoje)}</p>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ArrowDownCircle className="w-4 h-4 text-red-200" />
            <p className="text-xs opacity-80">Saídas Hoje</p>
          </div>
          <p className="text-xl font-semibold">{formatCurrency(saidasHoje)}</p>
        </div>
      </div>
    </Card>
  );
}

// ── OperacaoCaixaForm ─────────────────────────────────────────────────────
function OperacaoCaixaForm({ movimentacoes, onSave, onCancel, isLoading }) {
  const saldoAtual = movimentacoes[0]?.saldo_atual || 0;
  const [tipo, setTipo] = useState('entrada');
  const [valor, setValor] = useState('');
  const [descricao, setDescricao] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const valorNum = parseFloat(valor) || 0;
    if (valorNum <= 0) { toast.error('Valor deve ser maior que zero'); return; }
    const novoSaldo = ['entrada', 'aporte'].includes(tipo) ? saldoAtual + valorNum : saldoAtual - valorNum;
    onSave({ tipo_operacao: tipo, valor: valorNum, saldo_anterior: saldoAtual, saldo_atual: novoSaldo, descricao, data_operacao: new Date().toISOString() });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 bg-slate-50 rounded-xl">
        <p className="text-sm text-slate-600">Saldo Atual</p>
        <p className="text-3xl font-bold text-slate-800">{formatCurrency(saldoAtual)}</p>
      </div>
      <div className="space-y-2">
        <Label>Tipo de Operação *</Label>
        <Select value={tipo} onValueChange={setTipo}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="entrada">💵 Entrada (Venda/Recebimento)</SelectItem>
            <SelectItem value="saida">💸 Saída (Pagamento)</SelectItem>
            <SelectItem value="sangria">🏦 Sangria (Retirar p/ Banco)</SelectItem>
            <SelectItem value="aporte">📥 Aporte (Colocar Dinheiro)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Valor (R$) *</Label>
        <Input type="number" step="0.01" min="0.01" value={valor} onChange={e => setValor(e.target.value)} placeholder="0,00" required />
      </div>
      <div className="space-y-2">
        <Label>Descrição *</Label>
        <Textarea value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Descreva a operação..." rows={3} required />
      </div>
      {valor && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-sm text-slate-600 mb-1">Novo Saldo Previsto</p>
          <p className="text-2xl font-bold text-blue-700">
            {formatCurrency(['entrada', 'aporte'].includes(tipo) ? saldoAtual + (parseFloat(valor) || 0) : saldoAtual - (parseFloat(valor) || 0))}
          </p>
        </div>
      )}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>Cancelar</Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : <><Save className="w-4 h-4 mr-2" />Registrar</>}
        </Button>
      </div>
    </form>
  );
}

// ── ValeCard ──────────────────────────────────────────────────────────────
function ValeCard({ vale, onBaixar, onEditar, showBaixar = true }) {
  const classLabels = {
    alimentacao: '🍔 Alimentação', combustivel: '⛽ Combustível',
    manutencao: '🔧 Manutenção', material: '📦 Material',
    servico: '🛠️ Serviço', outro: '📝 Outro'
  };

  return (
    <Card className={cn("p-4 hover:shadow-lg transition-all", vale.status === 'baixado' && "opacity-75")}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-amber-600" />
          <h3 className="font-semibold text-slate-800">{vale.funcionario}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-blue-600">#{vale.ticket_id}</span>
          <Badge className={vale.status === 'baixado' ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>
            {vale.status === 'baixado' ? '✅ Baixado' : '⏳ Aberto'}
          </Badge>
        </div>
      </div>

      <p className="text-sm text-slate-600 mb-3 line-clamp-2">{vale.motivo}</p>

      <div className="space-y-1 mb-3 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500">Valor:</span>
          <span className="font-bold text-lg">{formatCurrency(vale.valor)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Classe:</span>
          <span className="text-xs">{classLabels[vale.classificacao] || vale.classificacao}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Lançamento:</span>
          <span className="text-xs">{vale.data_lancamento || '-'}</span>
        </div>
        {vale.status === 'baixado' && vale.valor_gasto != null && (
          <div className="flex justify-between">
            <span className="text-slate-500">Gasto:</span>
            <span className="font-semibold text-emerald-700">{formatCurrency(vale.valor_gasto)}</span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <PermissionGuard setor="CaixaDiario" funcao="editar" showBlocked={false}>
          <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => onEditar(vale)}>
            <Edit className="w-3 h-3" />Editar
          </Button>
        </PermissionGuard>
        {showBaixar && (
          <PermissionGuard setor="CaixaDiario" funcao="editar" showBlocked={false}>
            <Button size="sm" className="flex-1 gap-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => onBaixar(vale)}>
              <CheckCircle className="w-3 h-3" />Baixar
            </Button>
          </PermissionGuard>
        )}
      </div>
    </Card>
  );
}

// ── Página Principal ──────────────────────────────────────────────────────
export default function CaixaDiario() {
  const queryClient = useQueryClient();
  const [showOperacaoModal, setShowOperacaoModal] = useState(false);
  const [showCriarValeModal, setShowCriarValeModal] = useState(false);
  const [showBaixarModal, setShowBaixarModal] = useState(false);
  const [showEditarModal, setShowEditarModal] = useState(false);
  const [valeSelecionado, setValeSelecionado] = useState(null);
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');

  const { data: movimentacoes = [], isLoading: loadingMov } = useQuery({
    queryKey: ['caixaDiario'],
    queryFn: () => base44.entities.CaixaDiario.list('-created_date')
  });

  const { data: vales = [], isLoading: loadingVales } = useQuery({
    queryKey: ['vales'],
    queryFn: () => base44.entities.Vale.list('-ticket_id')
  });

  // Real-time sync
  useEffect(() => {
    const unsubs = [
      base44.entities.CaixaDiario.subscribe(() => queryClient.invalidateQueries({ queryKey: ['caixaDiario'] })),
      base44.entities.Vale.subscribe(() => queryClient.invalidateQueries({ queryKey: ['vales'] })),
    ];
    return () => unsubs.forEach(u => u());
  }, [queryClient]);

  const saldoAtual = movimentacoes[0]?.saldo_atual || 0;

  const valesAbertos = useMemo(() => vales.filter(v => v.status === 'aberto'), [vales]);
  const valesFechados = useMemo(() => vales.filter(v => v.status === 'baixado'), [vales]);

  const historico = useMemo(() => {
    return movimentacoes.filter(m => {
      if (!m) return false;
      // Aplica filtro de período se definido
      const dataRef = m.data_operacao || m.created_date;
      if (filtroDataInicio && dataRef) {
        if (dataRef.slice(0, 10) < filtroDataInicio) return false;
      }
      if (filtroDataFim && dataRef) {
        if (dataRef.slice(0, 10) > filtroDataFim) return false;
      }
      return true;
    });
  }, [movimentacoes, filtroDataInicio, filtroDataFim]);

  const handleEmitirExtrato = () => {
    imprimirExtrato({
      movimentacoes: historico,
      valesAbertos,
      dataInicio: filtroDataInicio || null,
      dataFim: filtroDataFim || null,
    });
  };

  // ── Mutation: Registrar operação de caixa ───────────────────────────────
  const caixaMutation = useMutation({
    mutationFn: (data) => base44.entities.CaixaDiario.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caixaDiario'] });
      setShowOperacaoModal(false);
      toast.success('Operação registrada!');
    },
    onError: () => toast.error('Erro ao registrar operação')
  });

  // ── Mutation: Criar Vale ────────────────────────────────────────────────
  const criarValeMutation = useMutation({
    mutationFn: async (formData) => {
      const ticketId = await getProximoTicketId();
      const novoSaldo = saldoAtual - formData.valor;

      // 1. Cria a movimentação de caixa (saída)
      const mov = await base44.entities.CaixaDiario.create({
        tipo_operacao: 'ticket_criado',
        valor: formData.valor,
        saldo_anterior: saldoAtual,
        saldo_atual: novoSaldo,
        descricao: `Vale #${ticketId} para ${formData.funcionario} - ${formData.motivo}`,
        ticket_funcionario: formData.funcionario,
        classificacao: formData.classificacao,
        data_operacao: new Date().toISOString()
      });

      // 2. Cria o Vale
      await base44.entities.Vale.create({
        ticket_id: ticketId,
        funcionario: formData.funcionario,
        valor: formData.valor,
        classificacao: formData.classificacao,
        motivo: formData.motivo,
        data_lancamento: formData.data_lancamento,
        data_uso: formData.data_uso,
        status: 'aberto',
        anexos_complexos: formData.anexos_complexos || [],
        movimentacao_criacao_id: mov.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caixaDiario'] });
      queryClient.invalidateQueries({ queryKey: ['vales'] });
      setShowCriarValeModal(false);
      toast.success('Vale criado com sucesso!');
    },
    onError: (e) => toast.error('Erro ao criar vale: ' + e.message)
  });

  // ── Mutation: Baixar Vale ───────────────────────────────────────────────
  const baixarValeMutation = useMutation({
    mutationFn: async ({ tipoBaixa, valorAjuste, dataDevolucao, anexosBaixa }) => {
      const vale = valeSelecionado;

      // Mapeia tipo de baixa → tipo de operação e impacto no saldo
      const tipoOperacaoMap = {
        troco:     'ticket_troco',
        sem_troco: 'ticket_baixa_exata',
        estorno:   'ticket_reembolso',
      };
      const tipoOperacao = tipoOperacaoMap[tipoBaixa];

      const novoSaldo =
        tipoBaixa === 'troco'    ? saldoAtual + valorAjuste :
        tipoBaixa === 'estorno'  ? saldoAtual - valorAjuste :
        saldoAtual; // sem_troco: sem alteração

      const descricaoMap = {
        troco:     `Troco do vale #${vale.ticket_id} (${vale.funcionario}) — ${formatCurrency(valorAjuste)} devolvidos ao caixa`,
        sem_troco: `Baixa s/ troco do vale #${vale.ticket_id} (${vale.funcionario}) — valor exato`,
        estorno:   `Estorno do vale #${vale.ticket_id} (${vale.funcionario}) — ${formatCurrency(valorAjuste)} reembolsados`,
      };
      const descricao = descricaoMap[tipoBaixa];

      // 1. Cria movimentação de caixa apenas quando há impacto financeiro
      let movId = null;
      if (tipoBaixa !== 'sem_troco') {
        const mov = await base44.entities.CaixaDiario.create({
          tipo_operacao: tipoOperacao,
          valor: valorAjuste,
          saldo_anterior: saldoAtual,
          saldo_atual: novoSaldo,
          descricao,
          ticket_funcionario: vale.funcionario,
          ticket_id: vale.id,
          anexos_complexos: anexosBaixa,
          data_operacao: new Date().toISOString()
        });
        movId = mov.id;
      }

      // 2. Atualiza o Vale para 'baixado'
      await base44.entities.Vale.update(vale.id, {
        status: 'baixado',
        valor_gasto: tipoBaixa === 'sem_troco' ? vale.valor : vale.valor + (tipoBaixa === 'estorno' ? valorAjuste : -valorAjuste),
        diferenca: tipoBaixa === 'troco' ? valorAjuste : tipoBaixa === 'estorno' ? -valorAjuste : 0,
        tipo_diferenca: tipoBaixa === 'troco' ? 'troco' : tipoBaixa === 'estorno' ? 'reembolso' : 'exato',
        data_devolucao: dataDevolucao,
        anexos_baixa: anexosBaixa,
        movimentacao_baixa_id: movId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caixaDiario'] });
      queryClient.invalidateQueries({ queryKey: ['vales'] });
      setShowBaixarModal(false);
      setValeSelecionado(null);
      toast.success('Vale baixado com sucesso!');
    },
    onError: (e) => toast.error('Erro ao baixar vale: ' + e.message)
  });

  // ── Mutation: Editar Vale ───────────────────────────────────────────────
  const editarValeMutation = useMutation({
    mutationFn: (data) => base44.entities.Vale.update(valeSelecionado.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vales'] });
      setShowEditarModal(false);
      setValeSelecionado(null);
      toast.success('Vale atualizado!');
    },
    onError: (e) => toast.error('Erro ao editar vale: ' + e.message)
  });

  const getTipoIcon = (tipo) => {
    const icons = {
      entrada: <ArrowUpCircle className="w-5 h-5 text-green-600" />,
      saida: <ArrowDownCircle className="w-5 h-5 text-red-600" />,
      sangria: <ArrowDownCircle className="w-5 h-5 text-orange-600" />,
      aporte: <ArrowUpCircle className="w-5 h-5 text-blue-600" />,
      ticket_criado: <Ticket className="w-5 h-5 text-amber-600" />,
      ticket_troco: <ArrowUpCircle className="w-5 h-5 text-green-600" />,
      ticket_reembolso: <ArrowDownCircle className="w-5 h-5 text-red-600" />,
      ticket_baixa_exata: <CheckCircle className="w-5 h-5 text-slate-500" />
    };
    return icons[tipo] || <Receipt className="w-5 h-5 text-slate-400" />;
  };

  const getTipoLabel = (tipo) => {
    const labels = {
      entrada: 'Entrada', saida: 'Saída', sangria: 'Sangria', aporte: 'Aporte',
      ticket_criado: 'Vale Criado', ticket_troco: 'Troco Devolvido',
      ticket_reembolso: 'Reembolso', ticket_baixa_exata: 'Vale Baixado'
    };
    return labels[tipo] || tipo;
  };

  const isLoading = loadingMov || loadingVales;

  return (
    <PermissionGuard setor="CaixaDiario">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Caixa Diário</h1>
              <p className="text-slate-500 mt-1">Controle de dinheiro físico e vales</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <PermissionGuard setor="CaixaDiario" funcao="adicionar" showBlocked={false}>
                <Button onClick={() => setShowCriarValeModal(true)} variant="outline" className="gap-2">
                  <Ticket className="w-4 h-4" />Criar Vale
                </Button>
              </PermissionGuard>
              <PermissionGuard setor="CaixaDiario" funcao="adicionar" showBlocked={false}>
                <Button onClick={() => setShowOperacaoModal(true)} className="gap-2">
                  <Plus className="w-4 h-4" />Nova Operação
                </Button>
              </PermissionGuard>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              {isLoading ? <Card className="p-6 h-48 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-300" /></Card> : <SaldoCard movimentacoes={movimentacoes} />}
            </div>
            <div className="lg:col-span-2 grid grid-cols-2 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg"><Ticket className="w-5 h-5 text-amber-600" /></div>
                  <div>
                    <p className="text-sm text-slate-500">Vales Abertos</p>
                    <p className="text-2xl font-bold text-amber-600">{valesAbertos.length}</p>
                    <p className="text-xs text-slate-400">{formatCurrency(valesAbertos.reduce((s, v) => s + v.valor, 0))} em aberto</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg"><Receipt className="w-5 h-5 text-blue-600" /></div>
                  <div>
                    <p className="text-sm text-slate-500">Movimentos Hoje</p>
                    <p className="text-2xl font-bold text-slate-800">
                      {movimentacoes.filter(m => m?.created_date && isToday(parseISO(m.created_date))).length}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="abertos" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="abertos" className="gap-2">
                <Ticket className="w-4 h-4" />Vales Abertos ({valesAbertos.length})
              </TabsTrigger>
              <TabsTrigger value="fechados" className="gap-2">
                <CheckCircle className="w-4 h-4" />Vales Fechados ({valesFechados.length})
              </TabsTrigger>
              <TabsTrigger value="historico" className="gap-2">
                <Receipt className="w-4 h-4" />Histórico Caixa
              </TabsTrigger>
            </TabsList>

            {/* Vales Abertos */}
            <TabsContent value="abertos" className="mt-6">
              {valesAbertos.length === 0 ? (
                <Card className="p-12 text-center">
                  <Ticket className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Nenhum vale em aberto</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {valesAbertos.map(vale => (
                    <ValeCard
                      key={vale.id}
                      vale={vale}
                      showBaixar={true}
                      onBaixar={(v) => { setValeSelecionado(v); setShowBaixarModal(true); }}
                      onEditar={(v) => { setValeSelecionado(v); setShowEditarModal(true); }}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Vales Fechados */}
            <TabsContent value="fechados" className="mt-6">
              {valesFechados.length === 0 ? (
                <Card className="p-12 text-center">
                  <CheckCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Nenhum vale fechado ainda</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {valesFechados.map(vale => (
                    <ValeCard
                      key={vale.id}
                      vale={vale}
                      showBaixar={false}
                      onBaixar={() => {}}
                      onEditar={(v) => { setValeSelecionado(v); setShowEditarModal(true); }}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Histórico */}
            <TabsContent value="historico" className="mt-6">
              {/* Filtros de período + botão extrato */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4 items-end">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                  <Label className="text-xs text-slate-500 shrink-0">De:</Label>
                  <Input
                    type="date"
                    value={filtroDataInicio}
                    onChange={e => setFiltroDataInicio(e.target.value)}
                    className="w-36 h-8 text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-slate-500 shrink-0">Até:</Label>
                  <Input
                    type="date"
                    value={filtroDataFim}
                    onChange={e => setFiltroDataFim(e.target.value)}
                    className="w-36 h-8 text-sm"
                  />
                </div>
                {(filtroDataInicio || filtroDataFim) && (
                  <Button size="sm" variant="ghost" className="text-slate-400 h-8 px-2 text-xs" onClick={() => { setFiltroDataInicio(''); setFiltroDataFim(''); }}>
                    Limpar
                  </Button>
                )}
                <div className="sm:ml-auto">
                  <Button onClick={handleEmitirExtrato} className="gap-2 bg-blue-600 hover:bg-blue-700 h-8 text-sm">
                    <FileText className="w-4 h-4" />Emitir Extrato PDF
                  </Button>
                </div>
              </div>

              {historico.length === 0 ? (
                <Card className="p-12 text-center">
                  <Clock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Nenhuma movimentação{(filtroDataInicio || filtroDataFim) ? ' no período selecionado' : ' registrada'}</p>
                </Card>
              ) : (
                <Card className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b">
                        <tr>
                          <th className="text-left p-4 text-sm font-medium text-slate-600">Tipo</th>
                          <th className="text-left p-4 text-sm font-medium text-slate-600">Descrição</th>
                          <th className="text-left p-4 text-sm font-medium text-slate-600">Valor</th>
                          <th className="text-left p-4 text-sm font-medium text-slate-600">Saldo</th>
                          <th className="text-left p-4 text-sm font-medium text-slate-600">Data</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {historico.map((mov) => (
                          <tr key={mov?.id} className="hover:bg-slate-50">
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                {getTipoIcon(mov?.tipo_operacao)}
                                <span className="text-sm font-medium">{getTipoLabel(mov?.tipo_operacao)}</span>
                              </div>
                            </td>
                            <td className="p-4"><p className="text-sm text-slate-600 max-w-xs truncate">{mov?.descricao || '-'}</p></td>
                            <td className="p-4">
                              <p className={cn("font-semibold", ['entrada', 'ticket_troco', 'aporte'].includes(mov?.tipo_operacao) ? "text-green-600" : mov?.tipo_operacao === 'ticket_baixa_exata' ? "text-slate-500" : "text-red-600")}>
                                {['entrada', 'ticket_troco', 'aporte'].includes(mov?.tipo_operacao) ? '+' : mov?.tipo_operacao === 'ticket_baixa_exata' ? '~' : '-'}
                                {formatCurrency(mov?.valor)}
                              </p>
                            </td>
                            <td className="p-4"><p className="font-bold text-slate-800">{formatCurrency(mov?.saldo_atual)}</p></td>
                            <td className="p-4">
                              <p className="text-sm text-slate-600">
                                {mov?.created_date ? format(parseISO(mov.created_date), "dd/MM/yyyy HH:mm", { locale: ptBR }) : '-'}
                              </p>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </TabsContent>
          </Tabs>

          {/* Modais */}
          <ModalContainer open={showOperacaoModal} onClose={() => setShowOperacaoModal(false)} title="Nova Operação de Caixa" description="Registre entradas, saídas, sangrias ou aportes">
            <OperacaoCaixaForm movimentacoes={movimentacoes} onSave={(data) => caixaMutation.mutate(data)} onCancel={() => setShowOperacaoModal(false)} isLoading={caixaMutation.isPending} />
          </ModalContainer>

          <ModalContainer open={showCriarValeModal} onClose={() => setShowCriarValeModal(false)} title="Criar Vale" description="Registre a entrega de dinheiro para funcionário" size="lg">
            <CriarValeModal saldoAtual={saldoAtual} onSave={(data) => criarValeMutation.mutate(data)} onCancel={() => setShowCriarValeModal(false)} isLoading={criarValeMutation.isPending} />
          </ModalContainer>

          <ModalContainer open={showBaixarModal} onClose={() => { setShowBaixarModal(false); setValeSelecionado(null); }} title="Baixar Vale" description="Registre o acerto de contas do vale" size="lg">
            {valeSelecionado && (
              <BaixarValeModal
                vale={valeSelecionado}
                saldoAtual={saldoAtual}
                onSave={(data) => baixarValeMutation.mutate(data)}
                onCancel={() => { setShowBaixarModal(false); setValeSelecionado(null); }}
                isLoading={baixarValeMutation.isPending}
              />
            )}
          </ModalContainer>

          <ModalContainer open={showEditarModal} onClose={() => { setShowEditarModal(false); setValeSelecionado(null); }} title="Editar Vale" description="Alterações serão registradas no histórico do vale" size="lg">
            {valeSelecionado && (
              <EditarValeModal
                vale={valeSelecionado}
                onSave={(data) => editarValeMutation.mutate(data)}
                onCancel={() => { setShowEditarModal(false); setValeSelecionado(null); }}
                isLoading={editarValeMutation.isPending}
              />
            )}
          </ModalContainer>
        </div>
      </div>
    </PermissionGuard>
  );
}