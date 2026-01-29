import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import LiquidarContaModal from '@/components/pagamentos/LiquidarContaModal';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  CreditCard, Search, Plus, Edit, Trash2, ArrowLeft, Save, X, Loader2, Upload, 
  CheckCircle, Calendar, DollarSign, Clock, TrendingUp, Archive, Ticket, AlertCircle 
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import ModalContainer from "@/components/modals/ModalContainer";
import PermissionGuard from "@/components/PermissionGuard";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format, addMonths, parseISO, isAfter, isBefore, startOfWeek, endOfWeek, isWithinInterval, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";

function ContaPagarForm({ conta, fornecedores, onSave, onCancel, isLoading }) {
  const [isRecorrente, setIsRecorrente] = useState(conta?.tipo_lancamento === 'recorrente' || false);
  const [isValorVariavel, setIsValorVariavel] = useState(false);
  const [form, setForm] = useState({
    fornecedor_codigo: conta?.fornecedor_codigo || '',
    fornecedor_nome: conta?.fornecedor_nome || '',
    descricao: conta?.descricao || '',
    valor: conta?.valor || '',
    data_vencimento: conta?.data_vencimento || '',
    status: conta?.status || 'pendente',
    observacao: conta?.observacao || '',
    categoria_financeira: conta?.categoria_financeira || 'fixo',
    tipo_lancamento: conta?.tipo_lancamento || 'unica',
    total_parcelas: conta?.total_parcelas || 1
  });

  const [comprovante, setComprovante] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleFornecedorChange = (codigo) => {
    const forn = fornecedores.find(f => f.codigo === codigo);
    setForm({ ...form, fornecedor_codigo: codigo, fornecedor_nome: forn?.nome || '' });
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (form.status !== 'pendente' && !comprovante && !conta?.comprovante_url) {
      toast.error('Anexe o comprovante de pagamento');
      return;
    }

    // Se for conta única
    if (!isRecorrente) {
      onSave({ 
        ...form, 
        comprovante_url: comprovante || conta?.comprovante_url,
        tipo_lancamento: 'unica'
      });
      return;
    }

    // Se for recorrente, criar múltiplas parcelas
    const grupoId = `REC-${Date.now()}`;
    const valorParcela = parseFloat(form.valor) || 0;
    const totalParcelas = parseInt(form.total_parcelas) || 1;
    const dataBase = parseISO(form.data_vencimento);

    const parcelas = [];
    for (let i = 1; i <= totalParcelas; i++) {
      const dataVencimento = format(addMonths(dataBase, i - 1), 'yyyy-MM-dd');
      
      parcelas.push({
        ...form,
        tipo_lancamento: 'recorrente',
        recorrencia_grupo_id: grupoId,
        parcela_numero: i,
        total_parcelas: totalParcelas,
        valor: (i === 1 || !isValorVariavel) ? valorParcela : 0,
        status: (i === 1 || !isValorVariavel) ? 'pendente' : 'pendente_preenchimento',
        data_vencimento: dataVencimento,
        comprovante_url: comprovante || conta?.comprovante_url
      });
    }

    try {
      await base44.entities.ContaPagar.bulkCreate(parcelas);
      toast.success(`${totalParcelas} parcelas criadas!`);
      onCancel();
    } catch (error) {
      toast.error('Erro ao criar recorrência');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
        <div className="flex items-center gap-3">
          <Switch
            checked={isRecorrente}
            onCheckedChange={setIsRecorrente}
            id="recorrente-toggle"
          />
          <Label htmlFor="recorrente-toggle" className="cursor-pointer font-semibold">
            Lançamento Recorrente
          </Label>
        </div>
        {isRecorrente && (
          <Badge className="bg-blue-100 text-blue-700">
            {form.total_parcelas || 1}x
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Fornecedor *</Label>
          <Select value={form.fornecedor_codigo} onValueChange={handleFornecedorChange}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {fornecedores.map(f => (
                <SelectItem key={f.codigo} value={f.codigo}>{f.codigo} - {f.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Categoria *</Label>
          <Select value={form.categoria_financeira} onValueChange={(v) => setForm({ ...form, categoria_financeira: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="fixo">💼 Fixo</SelectItem>
              <SelectItem value="variavel">⚡ Variável</SelectItem>
              <SelectItem value="investimento">📈 Investimento</SelectItem>
              <SelectItem value="vale">🎟️ Vale</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Valor (R$) {isRecorrente && isValorVariavel ? '(1ª Parcela)' : '*'}</Label>
          <Input
            type="number"
            step="0.01"
            value={form.valor}
            onChange={(e) => setForm({ ...form, valor: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Data de Vencimento {isRecorrente ? '(1ª Parcela)' : '*'}</Label>
          <Input
            type="date"
            value={form.data_vencimento}
            onChange={(e) => setForm({ ...form, data_vencimento: e.target.value })}
            required
          />
        </div>

        {isRecorrente && (
          <>
            <div className="space-y-2">
              <Label>Quantidade de Parcelas *</Label>
              <Input
                type="number"
                min="2"
                max="60"
                value={form.total_parcelas}
                onChange={(e) => setForm({ ...form, total_parcelas: e.target.value })}
                required
              />
            </div>

            <div className="space-y-3 md:col-span-2 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={isValorVariavel}
                  onCheckedChange={setIsValorVariavel}
                  id="valor-variavel"
                  className="mt-1"
                />
                <div className="flex-1">
                  <Label htmlFor="valor-variavel" className="cursor-pointer font-semibold text-amber-900">
                    Valor Variável (A definir mês a mês)
                  </Label>
                  <p className="text-xs text-amber-700 mt-1">
                    Ideal para contas como Luz e Água. As parcelas 2 a {form.total_parcelas || 2} serão criadas com valor R$ 0,00.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="space-y-2 md:col-span-2">
          <Label>Descrição *</Label>
          <Textarea
            value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            placeholder="Descreva o item/serviço"
            rows={2}
            required
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>Observações</Label>
          <Textarea
            value={form.observacao}
            onChange={(e) => setForm({ ...form, observacao: e.target.value })}
            rows={2}
          />
        </div>
      </div>

      {!isRecorrente && form.status !== 'pendente' && (
        <div className="space-y-2">
          <Label>Comprovante de Pagamento *</Label>
          <label className={cn(
            "flex items-center justify-center gap-2 h-12 px-4 rounded-xl border-2 border-dashed cursor-pointer transition-all",
            comprovante || conta?.comprovante_url ? "border-green-300 bg-green-50 text-green-700" : "border-slate-300 bg-white hover:border-blue-400"
          )}>
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : comprovante || conta?.comprovante_url ? <CheckCircle className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
            <span className="font-medium">{uploading ? 'Enviando...' : comprovante || conta?.comprovante_url ? 'Comprovante Anexado' : 'Clique para Anexar'}</span>
            <input type="file" accept="image/*,.pdf" onChange={handleUpload} className="hidden" disabled={uploading} />
          </label>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          {isRecorrente ? 'Criar Recorrência' : 'Salvar'}
        </Button>
      </div>
    </form>
  );
}

function ContaCard({ conta, onEdit, onDelete, onQuickPay }) {
  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  
  const getStatusBadge = (status) => {
    const config = {
      pendente: { label: 'Pendente', class: 'bg-yellow-100 text-yellow-700', icon: Clock },
      pago: { label: 'Pago', class: 'bg-green-100 text-green-700', icon: CheckCircle },
      futuro: { label: 'Futuro', class: 'bg-blue-100 text-blue-700', icon: Calendar },
      pendente_preenchimento: { label: 'A Definir', class: 'bg-orange-100 text-orange-700', icon: AlertCircle }
    };
    return config[status] || config.pendente;
  };

  const statusConfig = getStatusBadge(conta?.status);
  const StatusIcon = statusConfig.icon;
  
  const isAtrasada = conta?.status === 'pendente' && conta?.data_vencimento && isPast(parseISO(conta.data_vencimento)) && !isToday(parseISO(conta.data_vencimento));
  const isHoje = conta?.data_vencimento && isToday(parseISO(conta.data_vencimento));

  return (
    <Card className={cn(
      "p-4 hover:shadow-lg transition-all",
      isAtrasada && "border-red-300 bg-red-50",
      isHoje && "border-amber-300 bg-amber-50"
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-slate-800">{conta?.fornecedor_nome}</h3>
            {conta?.tipo_lancamento === 'recorrente' && (
              <Badge className="bg-purple-100 text-purple-700 text-xs">
                {conta.parcela_numero}/{conta.total_parcelas}
              </Badge>
            )}
          </div>
          <p className="text-sm text-slate-600 truncate">{conta?.descricao}</p>
        </div>
        <Badge className={statusConfig.class}>
          <StatusIcon className="w-3 h-3 mr-1" />
          {statusConfig.label}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-xs text-slate-500">Vencimento</p>
          <p className="font-medium text-sm">
            {conta?.data_vencimento ? format(parseISO(conta.data_vencimento), "dd/MM/yyyy", { locale: ptBR }) : '-'}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Valor</p>
          <p className="font-bold text-lg text-slate-800">{formatCurrency(conta?.valor)}</p>
        </div>
      </div>

      {isAtrasada && (
        <div className="mb-3 p-2 bg-red-100 border border-red-300 rounded-lg">
          <p className="text-xs font-semibold text-red-700">⚠️ ATRASADA</p>
        </div>
      )}

      {isHoje && (
        <div className="mb-3 p-2 bg-amber-100 border border-amber-300 rounded-lg">
          <p className="text-xs font-semibold text-amber-700">🔔 VENCE HOJE</p>
        </div>
      )}

      <div className="flex gap-2">
        {conta?.status === 'pendente' && (
          <Button size="sm" className="flex-1" onClick={() => onQuickPay(conta)}>
            <CheckCircle className="w-4 h-4 mr-2" />
            Pagar
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => onEdit(conta)}>
          <Edit className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onDelete(conta)} className="text-red-600">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}

export default function Pagamentos() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedConta, setSelectedConta] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [contaToDelete, setContaToDelete] = useState(null);
  const [showLiquidarModal, setShowLiquidarModal] = useState(false);
  const [contaLiquidar, setContaLiquidar] = useState(null);

  const { data: contas = [], isLoading } = useQuery({
    queryKey: ['contasPagar'],
    queryFn: () => base44.entities.ContaPagar.list('-data_vencimento')
  });

  const { data: fornecedores = [] } = useQuery({
    queryKey: ['fornecedores'],
    queryFn: () => base44.entities.Fornecedor.list()
  });

  const { data: cheques = [] } = useQuery({
    queryKey: ['cheques'],
    queryFn: () => base44.entities.Cheque.list()
  });

  const { data: movimentacoesCaixa = [] } = useQuery({
    queryKey: ['caixaDiario'],
    queryFn: () => base44.entities.CaixaDiario.list('-created_date')
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ContaPagar.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contasPagar'] });
      setShowAddModal(false);
      toast.success('Conta cadastrada!');
    },
    onError: () => toast.error('Erro ao cadastrar')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ContaPagar.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contasPagar'] });
      setShowEditModal(false);
      setSelectedConta(null);
      toast.success('Conta atualizada!');
    },
    onError: () => toast.error('Erro ao atualizar')
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ContaPagar.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contasPagar'] });
      setShowDeleteDialog(false);
      setContaToDelete(null);
      toast.success('Conta excluída!');
    },
    onError: () => toast.error('Erro ao excluir')
  });

  const handleQuickPay = (conta) => {
    setContaLiquidar(conta);
    setShowLiquidarModal(true);
  };

  const liquidarMutation = useMutation({
    mutationFn: async ({ conta, dadosPagamento }) => {
      // 1. Atualizar a conta
      await base44.entities.ContaPagar.update(conta.id, dadosPagamento);

      // 2. Registrar movimentações no caixa (dinheiro)
      const saldoAtual = movimentacoesCaixa[0]?.saldo_atual || 0;
      let novoSaldo = saldoAtual;

      for (const fp of dadosPagamento.formas_pagamento) {
        if (fp.tipo === 'dinheiro' && parseFloat(fp.valor) > 0) {
          novoSaldo -= parseFloat(fp.valor);
          await base44.entities.CaixaDiario.create({
            tipo_operacao: 'saida',
            valor: parseFloat(fp.valor),
            saldo_anterior: saldoAtual,
            saldo_atual: novoSaldo,
            descricao: `Pagamento a ${conta.fornecedor_nome} - ${conta.descricao}`,
            data_operacao: new Date().toISOString()
          });
        }

        // 3. Atualizar status dos cheques (repasse)
        if (fp.tipo === 'cheque_terceiro' && fp.cheque_id) {
          await base44.entities.Cheque.update(fp.cheque_id, {
            status: 'repassado',
            fornecedor_repassado_codigo: conta.fornecedor_codigo,
            fornecedor_repassado_nome: conta.fornecedor_nome,
            data_repasse: new Date().toISOString()
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contasPagar'] });
      queryClient.invalidateQueries({ queryKey: ['caixaDiario'] });
      queryClient.invalidateQueries({ queryKey: ['cheques'] });
      setShowLiquidarModal(false);
      setContaLiquidar(null);
      toast.success('Pagamento realizado e recibo gerado!');
    },
    onError: () => toast.error('Erro ao processar pagamento')
  });

  // Filtros para as abas
  const essaSemana = useMemo(() => {
    const now = new Date();
    const inicio = startOfWeek(now, { weekStartsOn: 0 });
    const fim = endOfWeek(now, { weekStartsOn: 0 });

    return contas.filter(c => 
      c?.status !== 'pago' && 
      c?.data_vencimento && 
      isWithinInterval(parseISO(c.data_vencimento), { start: inicio, end: fim })
    ).sort((a, b) => {
      const dateA = parseISO(a.data_vencimento);
      const dateB = parseISO(b.data_vencimento);
      return dateA - dateB;
    });
  }, [contas]);

  const futuras = useMemo(() => {
    const now = new Date();
    const fimSemana = endOfWeek(now, { weekStartsOn: 0 });

    return contas.filter(c => 
      c?.status !== 'pago' && 
      c?.data_vencimento && 
      isAfter(parseISO(c.data_vencimento), fimSemana)
    );
  }, [contas]);

  const vales = useMemo(() => {
    return contas.filter(c => c?.categoria_financeira === 'vale' && c?.status === 'pendente');
  }, [contas]);

  const historico = useMemo(() => {
    return contas.filter(c => c?.status === 'pago');
  }, [contas]);

  const stats = useMemo(() => {
    const pendentes = contas.filter(c => c?.status === 'pendente' || c?.status === 'pendente_preenchimento');
    const pagas = contas.filter(c => c?.status === 'pago');
    const futuras = contas.filter(c => c?.status === 'futuro');

    return {
      totalPendente: pendentes.reduce((sum, c) => sum + (c?.valor || 0), 0),
      totalPago: pagas.reduce((sum, c) => sum + (c?.valor || 0), 0),
      totalFuturo: futuras.reduce((sum, c) => sum + (c?.valor || 0), 0),
      qtdPendente: pendentes.length
    };
  }, [contas]);

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  const filteredContas = (lista) => lista.filter(c =>
    c?.fornecedor_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c?.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                <h1 className="text-3xl font-bold text-slate-800">Contas a Pagar</h1>
                <p className="text-slate-500 mt-1">Dashboard com recorrência e vales</p>
              </div>
            </div>
            <Button onClick={() => setShowAddModal(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Nova Conta
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Calendar className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Pendentes</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.totalPendente)}</p>
                  <p className="text-xs text-slate-400">{stats.qtdPendente} contas</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Pagas</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.totalPago)}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Futuras</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.totalFuturo)}</p>
                </div>
              </div>
            </Card>
          </div>

          <Card className="p-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar por fornecedor ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </Card>

          <Tabs defaultValue="semana" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="semana" className="gap-2">
                <Calendar className="w-4 h-4" />
                Essa Semana ({essaSemana.length})
              </TabsTrigger>
              <TabsTrigger value="futuras" className="gap-2">
                <TrendingUp className="w-4 h-4" />
                Futuras ({futuras.length})
              </TabsTrigger>
              <TabsTrigger value="vales" className="gap-2">
                <Ticket className="w-4 h-4" />
                Vales ({vales.length})
              </TabsTrigger>
              <TabsTrigger value="historico" className="gap-2">
                <Archive className="w-4 h-4" />
                Histórico ({historico.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="semana" className="mt-6">
              {isLoading ? (
                <Card className="p-8 text-center text-slate-500">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                  Carregando...
                </Card>
              ) : filteredContas(essaSemana).length === 0 ? (
                <Card className="p-8 text-center text-slate-500">
                  <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  Nenhuma conta para essa semana
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredContas(essaSemana).map((conta) => (
                    <ContaCard
                      key={conta?.id}
                      conta={conta}
                      onEdit={(c) => { setSelectedConta(c); setShowEditModal(true); }}
                      onDelete={(c) => { setContaToDelete(c); setShowDeleteDialog(true); }}
                      onQuickPay={handleQuickPay}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="futuras" className="mt-6">
              {filteredContas(futuras).length === 0 ? (
                <Card className="p-8 text-center text-slate-500">
                  <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  Nenhuma conta futura
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredContas(futuras).map((conta) => (
                    <ContaCard
                      key={conta?.id}
                      conta={conta}
                      onEdit={(c) => { setSelectedConta(c); setShowEditModal(true); }}
                      onDelete={(c) => { setContaToDelete(c); setShowDeleteDialog(true); }}
                      onQuickPay={handleQuickPay}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="vales" className="mt-6">
              {filteredContas(vales).length === 0 ? (
                <Card className="p-8 text-center text-slate-500">
                  <Ticket className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  Nenhum vale em aberto
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredContas(vales).map((conta) => (
                    <ContaCard
                      key={conta?.id}
                      conta={conta}
                      onEdit={(c) => { setSelectedConta(c); setShowEditModal(true); }}
                      onDelete={(c) => { setContaToDelete(c); setShowDeleteDialog(true); }}
                      onQuickPay={handleQuickPay}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="historico" className="mt-6">
              {filteredContas(historico).length === 0 ? (
                <Card className="p-8 text-center text-slate-500">
                  <Archive className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  Nenhuma conta paga
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredContas(historico).map((conta) => (
                    <ContaCard
                      key={conta?.id}
                      conta={conta}
                      onEdit={(c) => { setSelectedConta(c); setShowEditModal(true); }}
                      onDelete={(c) => { setContaToDelete(c); setShowDeleteDialog(true); }}
                      onQuickPay={handleQuickPay}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <ModalContainer open={showAddModal} onClose={() => setShowAddModal(false)} title="Nova Conta a Pagar" description="Cadastre uma nova conta ou crie recorrência" size="lg">
            <ContaPagarForm
              fornecedores={fornecedores}
              onSave={(data) => createMutation.mutate(data)}
              onCancel={() => setShowAddModal(false)}
              isLoading={createMutation.isPending}
            />
          </ModalContainer>

          <ModalContainer open={showEditModal} onClose={() => { setShowEditModal(false); setSelectedConta(null); }} title="Editar Conta" description="Atualize os dados da conta">
            {selectedConta && (
              <ContaPagarForm
                conta={selectedConta}
                fornecedores={fornecedores}
                onSave={(data) => updateMutation.mutate({ id: selectedConta.id, data })}
                onCancel={() => { setShowEditModal(false); setSelectedConta(null); }}
                isLoading={updateMutation.isPending}
              />
            )}
          </ModalContainer>

          <ModalContainer 
            open={showLiquidarModal} 
            onClose={() => { setShowLiquidarModal(false); setContaLiquidar(null); }} 
            title="Liquidar Conta a Pagar" 
            description="Múltiplas formas de pagamento e geração de recibo"
            size="lg"
          >
            {contaLiquidar && (
              <LiquidarContaModal
                conta={contaLiquidar}
                saldoCaixa={movimentacoesCaixa[0]?.saldo_atual || 0}
                cheques={cheques}
                onConfirm={(dadosPagamento) => liquidarMutation.mutate({ conta: contaLiquidar, dadosPagamento })}
                onCancel={() => { setShowLiquidarModal(false); setContaLiquidar(null); }}
                isLoading={liquidarMutation.isPending}
              />
            )}
          </ModalContainer>

          <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir esta conta a pagar?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setContaToDelete(null)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteMutation.mutate(contaToDelete.id)} className="bg-red-600 hover:bg-red-700">
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </PermissionGuard>
  );
}