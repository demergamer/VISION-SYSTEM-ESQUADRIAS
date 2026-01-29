import React, { useState, useMemo, useEffect } from 'react';
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
  Wallet, TrendingUp, TrendingDown, Plus, Minus, DollarSign, Clock, 
  ArrowLeft, Save, Loader2, Upload, CheckCircle, Ticket, Receipt, 
  ArrowUpCircle, ArrowDownCircle, Users, AlertCircle, Camera
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import ModalContainer from "@/components/modals/ModalContainer";
import PermissionGuard from "@/components/PermissionGuard";
import { cn } from "@/lib/utils";
import { format, startOfDay, endOfDay, isToday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

function SaldoCard({ movimentacoes }) {
  const ultimaMov = movimentacoes[0];
  const saldoAtual = ultimaMov?.saldo_atual || 0;

  const movHoje = movimentacoes.filter(m => 
    m?.created_date && isToday(parseISO(m.created_date))
  );

  const entradasHoje = movHoje
    .filter(m => ['entrada', 'ticket_troco', 'aporte'].includes(m?.tipo_operacao))
    .reduce((sum, m) => sum + (m?.valor || 0), 0);

  const saidasHoje = movHoje
    .filter(m => ['saida', 'sangria', 'ticket_criado', 'ticket_reembolso'].includes(m?.tipo_operacao))
    .reduce((sum, m) => sum + (m?.valor || 0), 0);

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

function OperacaoCaixaForm({ movimentacoes, onSave, onCancel, isLoading }) {
  const saldoAtual = movimentacoes[0]?.saldo_atual || 0;
  const [tipo, setTipo] = useState('entrada');
  const [valor, setValor] = useState('');
  const [descricao, setDescricao] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const valorNum = parseFloat(valor) || 0;
    
    if (valorNum <= 0) {
      toast.error('Valor deve ser maior que zero');
      return;
    }

    let novoSaldo = saldoAtual;
    if (['entrada', 'aporte'].includes(tipo)) {
      novoSaldo += valorNum;
    } else {
      novoSaldo -= valorNum;
    }

    onSave({
      tipo_operacao: tipo,
      valor: valorNum,
      saldo_anterior: saldoAtual,
      saldo_atual: novoSaldo,
      descricao,
      data_operacao: new Date().toISOString()
    });
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
        <Input
          type="number"
          step="0.01"
          min="0.01"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="0,00"
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Descrição *</Label>
        <Textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Descreva a operação..."
          rows={3}
          required
        />
      </div>

      {valor && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-sm text-slate-600 mb-1">Novo Saldo Previsto</p>
          <p className="text-2xl font-bold text-blue-700">
            {formatCurrency(
              ['entrada', 'aporte'].includes(tipo) 
                ? saldoAtual + (parseFloat(valor) || 0)
                : saldoAtual - (parseFloat(valor) || 0)
            )}
          </p>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading} className={isLoading ? 'cursor-not-allowed opacity-70' : ''}>
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Registrar
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

function CriarTicketForm({ movimentacoes, onSave, onCancel, isLoading }) {
  const saldoAtual = movimentacoes[0]?.saldo_atual || 0;
  const [funcionario, setFuncionario] = useState('');
  const [valor, setValor] = useState('');
  const [classificacao, setClassificacao] = useState('alimentacao');
  const [motivo, setMotivo] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const valorNum = parseFloat(valor) || 0;

    if (valorNum <= 0) {
      toast.error('Valor deve ser maior que zero');
      return;
    }

    if (valorNum > saldoAtual) {
      toast.error('Saldo insuficiente no caixa!');
      return;
    }

    const novoSaldo = saldoAtual - valorNum;

    onSave({
      tipo_operacao: 'ticket_criado',
      valor: valorNum,
      saldo_anterior: saldoAtual,
      saldo_atual: novoSaldo,
      descricao: `Vale para ${funcionario} - ${motivo}`,
      ticket_funcionario: funcionario,
      classificacao,
      data_operacao: new Date().toISOString()
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-900">Atenção: Saída de Caixa</p>
            <p className="text-xs text-amber-700 mt-1">
              Ao criar este vale, o valor será DEBITADO do saldo atual do caixa imediatamente.
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 bg-slate-50 rounded-xl">
        <p className="text-sm text-slate-600">Saldo Disponível</p>
        <p className="text-3xl font-bold text-slate-800">{formatCurrency(saldoAtual)}</p>
      </div>

      <div className="space-y-2">
        <Label>Nome do Funcionário *</Label>
        <Input
          value={funcionario}
          onChange={(e) => setFuncionario(e.target.value)}
          placeholder="Ex: João da Silva"
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Valor do Vale (R$) *</Label>
        <Input
          type="number"
          step="0.01"
          min="0.01"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="0,00"
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Classificação da Despesa *</Label>
        <Select value={classificacao} onValueChange={setClassificacao}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="alimentacao">🍔 Alimentação</SelectItem>
            <SelectItem value="combustivel">⛽ Combustível</SelectItem>
            <SelectItem value="manutencao">🔧 Manutenção</SelectItem>
            <SelectItem value="material">📦 Material</SelectItem>
            <SelectItem value="servico">🛠️ Serviço</SelectItem>
            <SelectItem value="outro">📝 Outro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Motivo/Descrição *</Label>
        <Textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Para que será usado o vale?"
          rows={3}
          required
        />
      </div>

      {valor && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm text-slate-600 mb-1">Saldo Após Vale</p>
          <p className="text-2xl font-bold text-red-700">
            {formatCurrency(saldoAtual - (parseFloat(valor) || 0))}
          </p>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading} className={isLoading ? 'cursor-not-allowed opacity-70' : ''}>
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Criando...
            </>
          ) : (
            <>
              <Ticket className="w-4 h-4 mr-2" />
              Criar Vale
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

function BaixarTicketForm({ ticket, movimentacoes, onSave, onCancel, isLoading }) {
  const saldoAtual = movimentacoes[0]?.saldo_atual || 0;
  const [valorGasto, setValorGasto] = useState('');
  const [comprovante, setComprovante] = useState(null);
  const [uploading, setUploading] = useState(false);

  const valorVale = ticket?.valor || 0;
  const valorGastoNum = parseFloat(valorGasto) || 0;
  const diferenca = valorVale - valorGastoNum;

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setComprovante(file_url);
      toast.success('Comprovante anexado!');
    } catch (error) {
      toast.error('Erro ao enviar arquivo');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (valorGastoNum <= 0) {
      toast.error('Informe o valor gasto');
      return;
    }

    if (!comprovante) {
      toast.error('Anexe o comprovante da despesa');
      return;
    }

    let novoSaldo = saldoAtual;
    let tipoOperacao = '';
    let descricao = '';

    if (diferenca > 0) {
      // Troco - Dinheiro volta para o caixa
      novoSaldo = saldoAtual + diferenca;
      tipoOperacao = 'ticket_troco';
      descricao = `Troco do vale de ${ticket.ticket_funcionario} - Gastou ${formatCurrency(valorGastoNum)} de ${formatCurrency(valorVale)}`;
    } else if (diferenca < 0) {
      // Reembolso - Empresa paga a diferença
      novoSaldo = saldoAtual - Math.abs(diferenca);
      tipoOperacao = 'ticket_reembolso';
      descricao = `Reembolso para ${ticket.ticket_funcionario} - Gastou ${formatCurrency(valorGastoNum)} de ${formatCurrency(valorVale)}`;
    } else {
      // Valor exato
      tipoOperacao = 'ticket_troco';
      descricao = `Baixa do vale de ${ticket.ticket_funcionario} - Valor exato`;
    }

    onSave({
      tipo_operacao: tipoOperacao,
      valor: Math.abs(diferenca),
      saldo_anterior: saldoAtual,
      saldo_atual: novoSaldo,
      descricao,
      ticket_id: ticket.id,
      ticket_funcionario: ticket.ticket_funcionario,
      comprovante_url: comprovante,
      data_operacao: new Date().toISOString()
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 bg-blue-50 rounded-xl space-y-2">
        <div className="flex justify-between">
          <span className="text-sm text-slate-600">Funcionário:</span>
          <span className="font-semibold">{ticket?.ticket_funcionario}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-slate-600">Valor do Vale:</span>
          <span className="font-bold text-blue-700">{formatCurrency(valorVale)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-slate-600">Data:</span>
          <span className="text-sm">
            {ticket?.created_date ? format(parseISO(ticket.created_date), "dd/MM/yyyy HH:mm", { locale: ptBR }) : '-'}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Valor Gasto Real (R$) *</Label>
        <Input
          type="number"
          step="0.01"
          min="0.01"
          value={valorGasto}
          onChange={(e) => setValorGasto(e.target.value)}
          placeholder="Quanto foi efetivamente gasto?"
          required
        />
      </div>

      {valorGasto && (
        <div className={cn(
          "p-4 rounded-xl border-2",
          diferenca > 0 ? "bg-green-50 border-green-300" : 
          diferenca < 0 ? "bg-red-50 border-red-300" : 
          "bg-slate-50 border-slate-300"
        )}>
          <p className="text-sm font-semibold mb-2">
            {diferenca > 0 ? '💚 Troco a Devolver' : 
             diferenca < 0 ? '💸 Reembolso Necessário' : 
             '✅ Valor Exato'}
          </p>
          <p className="text-2xl font-bold">
            {diferenca !== 0 ? formatCurrency(Math.abs(diferenca)) : 'Nenhum ajuste'}
          </p>
          {diferenca > 0 && (
            <p className="text-xs text-green-700 mt-2">
              ↑ Entrada no caixa: {formatCurrency(saldoAtual + diferenca)}
            </p>
          )}
          {diferenca < 0 && (
            <p className="text-xs text-red-700 mt-2">
              ↓ Saída do caixa: {formatCurrency(saldoAtual - Math.abs(diferenca))}
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label>Comprovante da Despesa *</Label>
        <label className={cn(
          "flex items-center justify-center gap-2 h-16 px-4 rounded-xl border-2 border-dashed cursor-pointer transition-all",
          comprovante ? "border-green-300 bg-green-50" : "border-slate-300 bg-white hover:border-blue-400"
        )}>
          {uploading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : comprovante ? (
            <>
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-700">Comprovante Anexado</span>
            </>
          ) : (
            <>
              <Camera className="w-5 h-5 text-slate-400" />
              <span className="font-medium text-slate-600">Clique para Anexar Foto</span>
            </>
          )}
          <input 
            type="file" 
            accept="image/*,.pdf" 
            onChange={handleUpload} 
            className="hidden" 
            disabled={uploading} 
          />
        </label>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading || uploading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading || uploading} className={(isLoading || uploading) ? 'cursor-not-allowed opacity-70' : ''}>
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Baixar Vale
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

export default function CaixaDiario() {
  const queryClient = useQueryClient();
  const [showOperacaoModal, setShowOperacaoModal] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showBaixarModal, setShowBaixarModal] = useState(false);
  const [ticketSelecionado, setTicketSelecionado] = useState(null);

  const { data: movimentacoes = [], isLoading } = useQuery({
    queryKey: ['caixaDiario'],
    queryFn: () => base44.entities.CaixaDiario.list('-created_date')
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CaixaDiario.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caixaDiario'] });
      setShowOperacaoModal(false);
      setShowTicketModal(false);
      setShowBaixarModal(false);
      setTicketSelecionado(null);
      toast.success('Operação registrada!');
    },
    onError: () => toast.error('Erro ao registrar operação')
  });

  const ticketsAbertos = useMemo(() => {
    return movimentacoes.filter(m => m?.tipo_operacao === 'ticket_criado');
  }, [movimentacoes]);

  const historico = useMemo(() => {
    return movimentacoes.filter(m => m?.tipo_operacao !== 'ticket_criado');
  }, [movimentacoes]);

  const getTipoIcon = (tipo) => {
    const icons = {
      entrada: <ArrowUpCircle className="w-5 h-5 text-green-600" />,
      saida: <ArrowDownCircle className="w-5 h-5 text-red-600" />,
      sangria: <ArrowDownCircle className="w-5 h-5 text-orange-600" />,
      aporte: <ArrowUpCircle className="w-5 h-5 text-blue-600" />,
      ticket_criado: <Ticket className="w-5 h-5 text-amber-600" />,
      ticket_troco: <ArrowUpCircle className="w-5 h-5 text-green-600" />,
      ticket_reembolso: <ArrowDownCircle className="w-5 h-5 text-red-600" />
    };
    return icons[tipo] || <Receipt className="w-5 h-5 text-slate-400" />;
  };

  const getTipoLabel = (tipo) => {
    const labels = {
      entrada: 'Entrada',
      saida: 'Saída',
      sangria: 'Sangria',
      aporte: 'Aporte',
      ticket_criado: 'Vale Criado',
      ticket_troco: 'Troco Devolvido',
      ticket_reembolso: 'Reembolso'
    };
    return labels[tipo] || tipo;
  };

  return (
    <PermissionGuard setor="ChequesPagar">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Dashboard')}>
                <Button variant="ghost" size="icon" className="rounded-xl">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-slate-800">Caixa Diário</h1>
                <p className="text-slate-500 mt-1">Controle de dinheiro físico e vales</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowTicketModal(true)} variant="outline" className="gap-2">
                <Ticket className="w-4 h-4" />
                Criar Vale
              </Button>
              <Button onClick={() => setShowOperacaoModal(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Nova Operação
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <SaldoCard movimentacoes={movimentacoes} />
            </div>

            <div className="lg:col-span-2 grid grid-cols-2 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Ticket className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Vales Abertos</p>
                    <p className="text-2xl font-bold text-slate-800">{ticketsAbertos.length}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Receipt className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Movimentações Hoje</p>
                    <p className="text-2xl font-bold text-slate-800">
                      {movimentacoes.filter(m => 
                        m?.created_date && isToday(parseISO(m.created_date))
                      ).length}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          <Tabs defaultValue="tickets" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="tickets" className="gap-2">
                <Ticket className="w-4 h-4" />
                Vales Abertos ({ticketsAbertos.length})
              </TabsTrigger>
              <TabsTrigger value="historico" className="gap-2">
                <Receipt className="w-4 h-4" />
                Histórico
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tickets" className="mt-6">
              {ticketsAbertos.length === 0 ? (
                <Card className="p-12 text-center">
                  <Ticket className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Nenhum vale em aberto</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {ticketsAbertos.map((ticket) => (
                    <Card key={ticket?.id} className="p-4 hover:shadow-lg transition-all">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-amber-600" />
                          <h3 className="font-semibold text-slate-800">{ticket?.ticket_funcionario}</h3>
                        </div>
                        <Badge className="bg-amber-100 text-amber-700">Aberto</Badge>
                      </div>
                      
                      <p className="text-sm text-slate-600 mb-3 line-clamp-2">{ticket?.descricao}</p>
                      
                      <div className="space-y-2 mb-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Valor:</span>
                          <span className="font-bold text-lg">{formatCurrency(ticket?.valor)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Data:</span>
                          <span>
                            {ticket?.created_date ? format(parseISO(ticket.created_date), "dd/MM HH:mm", { locale: ptBR }) : '-'}
                          </span>
                        </div>
                      </div>

                      <Button 
                        size="sm" 
                        className="w-full"
                        onClick={() => {
                          setTicketSelecionado(ticket);
                          setShowBaixarModal(true);
                        }}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Baixar Vale
                      </Button>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="historico" className="mt-6">
              {historico.length === 0 ? (
                <Card className="p-12 text-center">
                  <Clock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">Nenhuma movimentação registrada</p>
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
                            <td className="p-4">
                              <p className="text-sm text-slate-600 max-w-xs truncate">{mov?.descricao || '-'}</p>
                            </td>
                            <td className="p-4">
                              <p className={cn(
                                "font-semibold",
                                ['entrada', 'ticket_troco', 'aporte'].includes(mov?.tipo_operacao) 
                                  ? "text-green-600" 
                                  : "text-red-600"
                              )}>
                                {['entrada', 'ticket_troco', 'aporte'].includes(mov?.tipo_operacao) ? '+' : '-'}
                                {formatCurrency(mov?.valor)}
                              </p>
                            </td>
                            <td className="p-4">
                              <p className="font-bold text-slate-800">{formatCurrency(mov?.saldo_atual)}</p>
                            </td>
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

          <ModalContainer 
            open={showOperacaoModal} 
            onClose={() => setShowOperacaoModal(false)} 
            title="Nova Operação de Caixa"
            description="Registre entradas, saídas, sangrias ou aportes"
          >
            <OperacaoCaixaForm
              movimentacoes={movimentacoes}
              onSave={(data) => createMutation.mutate(data)}
              onCancel={() => setShowOperacaoModal(false)}
              isLoading={createMutation.isPending}
            />
          </ModalContainer>

          <ModalContainer 
            open={showTicketModal} 
            onClose={() => setShowTicketModal(false)} 
            title="Criar Vale/Ticket"
            description="Registre a entrega de dinheiro para funcionário"
          >
            <CriarTicketForm
              movimentacoes={movimentacoes}
              onSave={(data) => createMutation.mutate(data)}
              onCancel={() => setShowTicketModal(false)}
              isLoading={createMutation.isPending}
            />
          </ModalContainer>

          <ModalContainer 
            open={showBaixarModal} 
            onClose={() => { setShowBaixarModal(false); setTicketSelecionado(null); }} 
            title="Baixar Vale/Ticket"
            description="Registre o acerto de contas do vale"
          >
            {ticketSelecionado && (
              <BaixarTicketForm
                ticket={ticketSelecionado}
                movimentacoes={movimentacoes}
                onSave={(data) => createMutation.mutate(data)}
                onCancel={() => { setShowBaixarModal(false); setTicketSelecionado(null); }}
                isLoading={createMutation.isPending}
              />
            )}
          </ModalContainer>
        </div>
      </div>
    </PermissionGuard>
  );
}