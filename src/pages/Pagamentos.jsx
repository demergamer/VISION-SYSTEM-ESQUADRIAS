import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search, Plus, Edit, Trash2, Building2, DollarSign, Clock, CheckCircle,
  Calendar, TrendingUp, Archive, AlertCircle, FileText, Settings, RefreshCw,
  Loader2, X, ChevronDown
} from "lucide-react";
import { toast } from "sonner";
import ModalContainer from "@/components/modals/ModalContainer";
import PermissionGuard from "@/components/PermissionGuard";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format, parseISO, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";

import ContaPagarForm from '@/components/pagamentos/ContaPagarForm';
import EmpresasModal from '@/components/pagamentos/EmpresasModal';
import LiquidarContasMassaModal from '@/components/pagamentos/LiquidarContasMassaModal';
import BorderoPagamentoModal from "@/components/pagamentos/BorderoPagamentoModal";

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

function getStatusInfo(conta) {
  const isPendente = conta.status === 'pendente';
  const isAtrasada = isPendente && conta.data_vencimento && isPast(parseISO(conta.data_vencimento)) && !isToday(parseISO(conta.data_vencimento));
  const isHoje = conta.data_vencimento && isToday(parseISO(conta.data_vencimento));
  return { isAtrasada, isHoje };
}

function ContaRow({ conta, onEdit, onDelete }) {
  const { isAtrasada, isHoje } = getStatusInfo(conta);

  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-xl border transition-all hover:shadow-sm",
      isAtrasada ? "border-red-200 bg-red-50" : isHoje ? "border-amber-200 bg-amber-50" : conta.status === 'pendente_preenchimento' ? "border-yellow-300 bg-yellow-50" : "border-slate-200 bg-white"
    )}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm text-slate-800">{conta.fornecedor_nome}</span>
          {conta.numero_lancamento && (
            <span className="text-base font-black font-mono text-blue-700 tracking-wide">{conta.numero_lancamento}</span>
          )}
          {conta.tipo_lancamento === 'recorrente' && <Badge className="bg-purple-100 text-purple-700 text-xs py-0">🔄 Recorrente</Badge>}
          {conta.tipo_lancamento === 'parcelado' && <Badge className="bg-sky-100 text-sky-700 text-xs py-0">📅 Parcelado</Badge>}
          {isAtrasada && <Badge className="bg-red-100 text-red-700 text-xs py-0">⚠️ Atrasada</Badge>}
          {isHoje && <Badge className="bg-amber-100 text-amber-700 text-xs py-0">🔔 Hoje</Badge>}
          {conta.status === 'pendente_preenchimento' && <Badge className="bg-yellow-100 text-yellow-800 text-xs py-0">A Definir</Badge>}
        </div>
        <p className="text-xs text-slate-500 mt-0.5 truncate">{conta.descricao}</p>
        {conta.nf_origem && <p className="text-xs text-slate-400">NF: {conta.nf_origem}</p>}
      </div>
      <div className="text-right shrink-0">
        <p className="font-bold text-slate-800">{formatCurrency(conta.valor)}</p>
        <p className="text-xs text-slate-400">{conta.data_vencimento ? format(parseISO(conta.data_vencimento), 'dd/MM/yy', { locale: ptBR }) : '-'}</p>
      </div>
      <div className="flex gap-1 shrink-0">
        <PermissionGuard setor="Pagamentos" funcao="editar" showBlocked={false}>
          <Button size="sm" variant="ghost" onClick={() => onEdit(conta)} className="h-8 w-8 p-0 text-slate-500">
            <Edit className="w-3 h-3" />
          </Button>
        </PermissionGuard>
        <PermissionGuard setor="Pagamentos" funcao="excluir" showBlocked={false}>
          <Button size="sm" variant="ghost" onClick={() => onDelete(conta)} className="h-8 w-8 p-0 text-red-400">
            <Trash2 className="w-3 h-3" />
          </Button>
        </PermissionGuard>
      </div>
    </div>
  );
}

function EmpresaSection({ empresa, contas, onEdit, onDelete, searchTerm }) {
  const now = new Date();

  const atrasadas = contas.filter(c => {
    if (!['pendente', 'parcial'].includes(c.status)) return false;
    if (!c.data_vencimento) return false;
    return isPast(parseISO(c.data_vencimento)) && !isToday(parseISO(c.data_vencimento));
  });

  const hoje = contas.filter(c => ['pendente', 'parcial'].includes(c.status) && c.data_vencimento && isToday(parseISO(c.data_vencimento)));

  const futuras = contas.filter(c => {
    if (!['pendente', 'parcial', 'futuro'].includes(c.status)) return false;
    if (!c.data_vencimento) return false;
    return !isPast(parseISO(c.data_vencimento)) && !isToday(parseISO(c.data_vencimento));
  });

  const pagas = contas.filter(c => c.status === 'pago');
  const recorrentes = contas.filter(c => c.tipo_lancamento === 'recorrente' && c.status !== 'pago');
  const aDefinir = contas.filter(c => c.status === 'pendente_preenchimento');

  const filterBySearch = (list) => {
    if (!searchTerm) return list;
    const t = searchTerm.toLowerCase();
    return list.filter(c =>
      c.fornecedor_nome?.toLowerCase().includes(t) ||
      c.descricao?.toLowerCase().includes(t) ||
      c.numero_lancamento?.toLowerCase().includes(t)
    );
  };

  const totalAberto = [...atrasadas, ...hoje, ...futuras].reduce((s, c) => s + (c.valor || 0), 0);

  const TabGroup = ({ label, icon: Icon, items, colorClass, emptyMsg }) => {
    const filtered = filterBySearch(items);
    if (filtered.length === 0 && !searchTerm) return null;
    return (
      <div className="space-y-2">
        <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold", colorClass)}>
          <Icon className="w-3.5 h-3.5" />
          {label} ({filtered.length})
          <span className="ml-auto font-bold">{formatCurrency(filtered.reduce((s, c) => s + (c.valor || 0), 0))}</span>
        </div>
        {filtered.length === 0 ? (
          <p className="text-xs text-slate-400 px-3">{emptyMsg}</p>
        ) : (
          <div className="space-y-1.5">
            {filtered.map(c => <ContaRow key={c.id} conta={c} onEdit={onEdit} onDelete={onDelete} />)}
          </div>
        )}
      </div>
    );
  };

  const [aberto, setAberto] = useState(atrasadas.length > 0 || hoje.length > 0);

  return (
    <Card className="overflow-hidden border-2 border-slate-100">
      {/* Header Acordeão */}
      <div
        className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-white border-b cursor-pointer hover:bg-slate-50 transition-colors select-none"
        onClick={() => setAberto(o => !o)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-sm">{empresa.sigla?.slice(0, 3) || '?'}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-800">{empresa.nome}</h3>
              <Badge variant="outline" className="text-xs font-mono">{empresa.codigo}</Badge>
            </div>
            <p className="text-xs text-slate-400">{empresa.razao_social}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-slate-500">Em aberto</p>
            <p className="font-bold text-lg text-slate-800">{formatCurrency(totalAberto)}</p>
          </div>
          <ChevronDown className={cn("w-5 h-5 text-slate-400 transition-transform shrink-0", aberto && "rotate-180")} />
        </div>
      </div>

      {aberto && <div className="p-4">
        <Tabs defaultValue={atrasadas.length > 0 ? "atrasadas" : "futuras"}>
          <TabsList className="flex w-full gap-1 h-auto flex-wrap bg-slate-100 p-1 rounded-lg mb-4">
            {atrasadas.length > 0 && <TabsTrigger value="atrasadas" className="text-xs data-[state=active]:bg-red-500 data-[state=active]:text-white">⚠️ Atraso ({atrasadas.length})</TabsTrigger>}
            {hoje.length > 0 && <TabsTrigger value="hoje" className="text-xs data-[state=active]:bg-amber-500 data-[state=active]:text-white">🔔 Hoje ({hoje.length})</TabsTrigger>}
            <TabsTrigger value="futuras" className="text-xs">📅 Futuras ({futuras.length})</TabsTrigger>
            <TabsTrigger value="pagas" className="text-xs">✅ Pagas ({pagas.length})</TabsTrigger>
            {recorrentes.length > 0 && <TabsTrigger value="recorrentes" className="text-xs">🔄 Recorrentes ({recorrentes.length})</TabsTrigger>}
          </TabsList>

          {atrasadas.length > 0 && (
            <TabsContent value="atrasadas" className="mt-0">
              <div className="space-y-1.5">
                {filterBySearch(atrasadas).map(c => <ContaRow key={c.id} conta={c} onEdit={onEdit} onDelete={onDelete} />)}
              </div>
            </TabsContent>
          )}

          {hoje.length > 0 && (
            <TabsContent value="hoje" className="mt-0">
              <div className="space-y-1.5">
                {filterBySearch(hoje).map(c => <ContaRow key={c.id} conta={c} onEdit={onEdit} onDelete={onDelete} />)}
              </div>
            </TabsContent>
          )}

          <TabsContent value="futuras" className="mt-0">
            {filterBySearch(futuras).length === 0 ? (
              <p className="text-center text-slate-400 py-6 text-sm">Nenhuma conta futura</p>
            ) : (
              <div className="space-y-1.5">
                {filterBySearch(futuras).map(c => <ContaRow key={c.id} conta={c} onEdit={onEdit} onDelete={onDelete} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="pagas" className="mt-0">
            {filterBySearch(pagas).length === 0 ? (
              <p className="text-center text-slate-400 py-6 text-sm">Nenhuma conta paga</p>
            ) : (
              <div className="space-y-1.5">
                {filterBySearch(pagas).map(c => <ContaRow key={c.id} conta={c} onEdit={onEdit} onDelete={onDelete} />)}
              </div>
            )}
          </TabsContent>

          {recorrentes.length > 0 && (
            <TabsContent value="recorrentes" className="mt-0">
              <div className="space-y-1.5">
                {filterBySearch(recorrentes).map(c => <ContaRow key={c.id} conta={c} onEdit={onEdit} onDelete={onDelete} />)}
              </div>
              {aDefinir.length > 0 && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                  <p className="text-xs font-semibold text-yellow-800 mb-2">⚠️ {aDefinir.length} conta(s) recorrente(s) aguardando preenchimento de valor:</p>
                  {filterBySearch(aDefinir).map(c => <ContaRow key={c.id} conta={c} onEdit={onEdit} onDelete={onDelete} />)}
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>}
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
  const [showEmpresasModal, setShowEmpresasModal] = useState(false);
  const [showLiquidarMassaModal, setShowLiquidarMassaModal] = useState(false);
  const [showBorderoModal, setShowBorderoModal] = useState(false);
  const [selectedBorderoId, setSelectedBorderoId] = useState(null);

  const { data: contas = [], isLoading } = useQuery({
    queryKey: ['contasPagar'],
    queryFn: () => base44.entities.ContaPagar.list('-data_vencimento')
  });

  const { data: empresas = [] } = useQuery({
    queryKey: ['empresas'],
    queryFn: () => base44.entities.Empresa.list('codigo')
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
    queryFn: () => base44.entities.CaixaDiario.list('-created_date', 1)
  });

  const empresasAtivas = useMemo(() => empresas.filter(e => !e.arquivada), [empresas]);

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

  const stats = useMemo(() => {
    const pendentes = contas.filter(c => ['pendente', 'pendente_preenchimento', 'parcial'].includes(c.status));
    const pagas = contas.filter(c => c.status === 'pago');
    const atrasadas = pendentes.filter(c => c.data_vencimento && isPast(parseISO(c.data_vencimento)) && !isToday(parseISO(c.data_vencimento)));
    return {
      totalPendente: pendentes.reduce((s, c) => s + (c.valor || 0), 0),
      totalPago: pagas.reduce((s, c) => s + (c.valor || 0), 0),
      qtdAtrasadas: atrasadas.length,
      qtdPendente: pendentes.length
    };
  }, [contas]);

  const handleEdit = (conta) => { setSelectedConta(conta); setShowEditModal(true); };
  const handleDelete = (conta) => { setContaToDelete(conta); setShowDeleteDialog(true); };

  return (
    <PermissionGuard setor="Pagamentos">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Centro Financeiro</h1>
              <p className="text-slate-500 mt-1">Contas a pagar por empresa</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setShowEmpresasModal(true)} className="gap-2">
                <Settings className="w-4 h-4" />
                Empresas
              </Button>
              <PermissionGuard setor="Pagamentos" funcao="liquidar" showBlocked={false}>
                <Button onClick={() => setShowLiquidarMassaModal(true)} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                  <DollarSign className="w-4 h-4" />
                  Liquidar Contas
                </Button>
              </PermissionGuard>
              <PermissionGuard setor="Pagamentos" funcao="adicionar" showBlocked={false}>
                <Button onClick={() => setShowAddModal(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Nova Conta
                </Button>
              </PermissionGuard>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-4">
              <p className="text-xs text-slate-500">Pendentes</p>
              <p className="text-xl font-bold text-slate-800 mt-1">{formatCurrency(stats.totalPendente)}</p>
              <p className="text-xs text-slate-400">{stats.qtdPendente} contas</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-slate-500">Pagas</p>
              <p className="text-xl font-bold text-green-600 mt-1">{formatCurrency(stats.totalPago)}</p>
            </Card>
            <Card className={cn("p-4", stats.qtdAtrasadas > 0 && "border-red-200 bg-red-50")}>
              <p className="text-xs text-slate-500">Em Atraso</p>
              <p className={cn("text-xl font-bold mt-1", stats.qtdAtrasadas > 0 ? "text-red-600" : "text-slate-800")}>{stats.qtdAtrasadas}</p>
              <p className="text-xs text-slate-400">contas atrasadas</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-slate-500">Empresas Ativas</p>
              <p className="text-xl font-bold text-blue-600 mt-1">{empresasAtivas.length}</p>
            </Card>
          </div>

          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Buscar por fornecedor, descrição, número..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
          </div>

          {/* Conteúdo principal */}
          {isLoading ? (
            <Card className="p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-slate-400" />
              <p className="text-slate-500">Carregando...</p>
            </Card>
          ) : empresasAtivas.length === 0 ? (
            <Card className="p-12 text-center">
              <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="font-bold text-slate-600 mb-2">Nenhuma empresa configurada</h3>
              <p className="text-slate-400 text-sm mb-4">Configure as empresas para organizar as contas a pagar por grupo.</p>
              <Button onClick={() => setShowEmpresasModal(true)} className="gap-2">
                <Settings className="w-4 h-4" />
                Configurar Empresas
              </Button>
            </Card>
          ) : (
            <div className="space-y-6">
              {empresasAtivas.map(empresa => {
                const contasDaEmpresa = contas.filter(c => c.empresa_codigo === empresa.codigo);
                // Se busca ativa, mostrar mesmo sem contas correspondentes
                if (!searchTerm && contasDaEmpresa.length === 0) return null;
                return (
                  <EmpresaSection
                    key={empresa.id}
                    empresa={empresa}
                    contas={contasDaEmpresa}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    searchTerm={searchTerm}
                  />
                );
              })}

              {/* Contas sem empresa */}
              {(() => {
                const semEmpresa = contas.filter(c => !c.empresa_codigo || !empresasAtivas.find(e => e.codigo === c.empresa_codigo));
                if (semEmpresa.length === 0) return null;
                return (
                  <EmpresaSection
                    key="sem-empresa"
                    empresa={{ codigo: '', sigla: '?', nome: 'Sem Empresa', razao_social: 'Contas não vinculadas' }}
                    contas={semEmpresa}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    searchTerm={searchTerm}
                  />
                );
              })()}
            </div>
          )}

          {/* Modais */}
          <EmpresasModal open={showEmpresasModal} onClose={() => setShowEmpresasModal(false)} />

          <LiquidarContasMassaModal
            open={showLiquidarMassaModal}
            onClose={() => setShowLiquidarMassaModal(false)}
            empresas={empresasAtivas}
            contas={contas}
            cheques={cheques}
            saldoCaixa={movimentacoesCaixa[0]?.saldo_atual || 0}
          />

          <ModalContainer open={showAddModal} onClose={() => setShowAddModal(false)} title="Nova Conta a Pagar" description="Cadastre uma nova conta ou crie recorrência" size="lg">
            <ContaPagarForm
              fornecedores={fornecedores}
              empresas={empresasAtivas}
              onSave={(data) => createMutation.mutate(data)}
              onCancel={() => setShowAddModal(false)}
              isLoading={createMutation.isPending}
            />
          </ModalContainer>

          <ModalContainer open={showEditModal} onClose={() => { setShowEditModal(false); setSelectedConta(null); }} title="Editar Conta" description="Atualize os dados da conta" size="lg">
            {selectedConta && (
              <ContaPagarForm
                conta={selectedConta}
                fornecedores={fornecedores}
                empresas={empresasAtivas}
                onSave={(data) => updateMutation.mutate({ id: selectedConta.id, data })}
                onCancel={() => { setShowEditModal(false); setSelectedConta(null); }}
                isLoading={updateMutation.isPending}
              />
            )}
          </ModalContainer>

          {showBorderoModal && selectedBorderoId && (
            <BorderoPagamentoModal borderoId={selectedBorderoId} onClose={() => { setShowBorderoModal(false); setSelectedBorderoId(null); }} />
          )}

          <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                <AlertDialogDescription>Tem certeza que deseja excluir esta conta a pagar?</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setContaToDelete(null)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteMutation.mutate(contaToDelete.id)} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </PermissionGuard>
  );
}