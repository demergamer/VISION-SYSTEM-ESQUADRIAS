import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileSpreadsheet, Search, Plus, Edit, Trash2, ArrowLeft, 
  Save, X, Loader2, Filter, RefreshCw, AlertTriangle, 
  CheckCircle, History, AlertCircle, Eye, CornerUpLeft, Wallet
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { format, parseISO, isPast, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";

// Componentes internos e Hooks
import ModalContainer from "@/components/modals/ModalContainer";
import ChequeForm from "@/components/cheques/ChequeForm"; // Assumindo que você tem este form
import PermissionGuard from "@/components/PermissionGuard";
import { usePermissions } from "@/components/hooks/usePermissions";

// --- COMPONENTE: MODAL DE RESOLUÇÃO DE DUPLICATAS ---
function ResolveDuplicatesModal({ duplicateGroups, onResolve, onCancel, isProcessing }) {
  // Estado para armazenar qual ID foi escolhido para MANTER em cada grupo
  // Formato: { 'chave_do_grupo': 'id_do_cheque_escolhido' }
  const [selectedKeepers, setSelectedKeepers] = useState({});

  // Inicializa escolhendo automaticamente o primeiro de cada grupo como sugestão
  React.useEffect(() => {
    const initialSelections = {};
    Object.keys(duplicateGroups).forEach(key => {
      initialSelections[key] = duplicateGroups[key][0].id;
    });
    setSelectedKeepers(initialSelections);
  }, [duplicateGroups]);

  const handleConfirm = () => {
    // Monta lista de IDs para EXCLUIR (todos que NÃO foram selecionados)
    const idsToExclude = [];
    
    Object.keys(duplicateGroups).forEach(key => {
      const keeperId = selectedKeepers[key];
      const group = duplicateGroups[key];
      
      group.forEach(cheque => {
        if (cheque.id !== keeperId) {
          idsToExclude.push(cheque.id);
        }
      });
    });

    onResolve(idsToExclude);
  };

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  return (
    <div className="space-y-6">
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
        <div className="text-sm text-amber-800">
          <p className="font-bold">Atenção: Cheques Duplicados Detectados</p>
          <p>O sistema encontrou registros idênticos (mesmo número, conta e titular). Selecione abaixo qual registro é o <strong>original</strong> para manter. Os outros serão movidos para a aba "Excluídos".</p>
        </div>
      </div>

      <div className="max-h-[60vh] overflow-y-auto space-y-6 pr-2">
        {Object.entries(duplicateGroups).map(([key, group], index) => (
          <Card key={key} className="p-4 border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-3 border-b pb-2">
              <span className="bg-slate-100 text-slate-500 text-xs font-bold px-2 py-1 rounded">Grupo #{index + 1}</span>
              <span className="font-mono text-sm text-slate-700 font-medium">Cheque Nº {group[0].numero_cheque}</span>
              <span className="text-sm text-slate-500">| {group[0].titular}</span>
              <span className="ml-auto font-bold text-slate-800">{formatCurrency(group[0].valor)}</span>
            </div>

            <RadioGroup 
              value={selectedKeepers[key]} 
              onValueChange={(val) => setSelectedKeepers(prev => ({ ...prev, [key]: val }))}
              className="space-y-3"
            >
              {group.map(cheque => (
                <div key={cheque.id} className={cn(
                  "flex items-start space-x-3 p-3 rounded-lg border transition-all cursor-pointer",
                  selectedKeepers[key] === cheque.id ? "border-green-500 bg-green-50" : "border-slate-200 hover:bg-slate-50"
                )}>
                  <RadioGroupItem value={cheque.id} id={cheque.id} className="mt-1" />
                  <div className="flex-1 cursor-pointer" onClick={() => setSelectedKeepers(prev => ({ ...prev, [key]: cheque.id }))}>
                    <div className="flex justify-between">
                      <Label htmlFor={cheque.id} className="font-bold cursor-pointer text-slate-800">
                        ID: {cheque.id} <span className="font-normal text-slate-500 text-xs">(Criado em: {format(parseISO(cheque.created_date || new Date().toISOString()), 'dd/MM/yy HH:mm')})</span>
                      </Label>
                      <Badge variant="outline" className="capitalize">{cheque.status}</Badge>
                    </div>
                    
                    <div className="mt-2 text-xs text-slate-600 grid grid-cols-2 gap-2">
                        <div>
                            <span className="font-semibold block text-slate-400">Origem/Uso:</span>
                            {cheque.pedido_id ? `Pedido #${cheque.pedido_id}` : (cheque.origem || 'Manual')}
                        </div>
                        <div>
                            <span className="font-semibold block text-slate-400">Observação:</span>
                            {cheque.observacao || '-'}
                        </div>
                    </div>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </Card>
        ))}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel} disabled={isProcessing}>Cancelar</Button>
        <Button onClick={handleConfirm} disabled={isProcessing} className="bg-green-600 hover:bg-green-700 text-white">
          {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
          Confirmar e Resolver
        </Button>
      </div>
    </div>
  );
}

export default function Cheques() {
  const queryClient = useQueryClient();
  const { canDo } = usePermissions();
  
  // --- STATES ---
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('em_maos');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCheque, setSelectedCheque] = useState(null);
  
  // Lógica de Duplicatas
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);

  // --- QUERIES ---
  const { data: cheques = [], isLoading } = useQuery({
    queryKey: ['cheques'],
    queryFn: () => base44.entities.Cheque.list()
  });

  // --- MUTAÇÕES ---
  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Cheque.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cheques'] });
      setShowAddModal(false);
      toast.success('Cheque cadastrado!');
    },
    onError: () => toast.error('Erro ao cadastrar')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Cheque.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cheques'] });
      setShowEditModal(false);
      setSelectedCheque(null);
      toast.success('Cheque atualizado!');
    },
    onError: () => toast.error('Erro ao atualizar')
  });

  // --- LÓGICA DE VERIFICAÇÃO DE DUPLICATAS ---
  const handleCheckDuplicates = () => {
    const groups = {};
    let duplicatesFound = 0;

    // 1. Agrupar Cheques Ativos (Ignora já excluídos ou compensados se quiser, mas aqui vamos olhar 'em_maos' e 'repassado')
    cheques.forEach(c => {
      // Ignora excluídos e compensados da verificação para não gerar falso positivo com histórico antigo
      if (c.status === 'excluido' || c.status === 'compensado' || c.status === 'devolvido') return;

      // Chave Única: Numero + Agencia + Conta + Titular(Primeiro nome) + Vencimento
      // Normalizamos strings para evitar erros de caixa alta/baixa ou espaços
      const cleanNumero = c.numero_cheque?.trim();
      const cleanAgencia = c.agencia?.trim();
      const cleanConta = c.conta?.trim();
      const cleanTitular = c.titular?.trim().toLowerCase();
      const cleanVencimento = c.data_vencimento ? c.data_vencimento.split('T')[0] : ''; // Pega YYYY-MM-DD

      const key = `${cleanNumero}|${cleanAgencia}|${cleanConta}|${cleanVencimento}|${cleanTitular}`;

      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    });

    // 2. Filtrar apenas grupos com mais de 1 item
    const conflictGroups = {};
    Object.keys(groups).forEach(key => {
      if (groups[key].length > 1) {
        conflictGroups[key] = groups[key];
        duplicatesFound += groups[key].length;
      }
    });

    // 3. Ação
    if (Object.keys(conflictGroups).length > 0) {
      setDuplicateGroups(conflictGroups);
      setShowDuplicateModal(true);
      toast.warning(`Encontramos ${Object.keys(conflictGroups).length} grupos de cheques idênticos.`);
    } else {
      toast.success("Tudo certo! Nenhuma duplicata encontrada nos cheques ativos.", {
        icon: <CheckCircle className="text-emerald-500" />
      });
    }
  };

  const handleResolveDuplicates = async (idsToExclude) => {
    setIsProcessing(true);
    try {
      // Move para status 'excluido' e adiciona log na observação
      const promises = idsToExclude.map(id => {
        const chequeOriginal = cheques.find(c => c.id === id);
        return base44.entities.Cheque.update(id, {
          status: 'excluido',
          observacao: (chequeOriginal.observacao || '') + ' [AUTO] Removido por duplicidade em ' + new Date().toLocaleDateString()
        });
      });

      await Promise.all(promises);
      await queryClient.invalidateQueries({ queryKey: ['cheques'] });
      
      setShowDuplicateModal(false);
      setDuplicateGroups({});
      toast.success(`${idsToExclude.length} cheques duplicados foram movidos para a aba "Excluídos".`);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao processar exclusões.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestore = async (cheque) => {
      // Restaura cheque excluído para 'em_maos'
      if (!confirm("Deseja restaurar este cheque para 'Em Mãos'?")) return;
      try {
          await base44.entities.Cheque.update(cheque.id, { status: 'em_maos' });
          queryClient.invalidateQueries({ queryKey: ['cheques'] });
          toast.success("Cheque restaurado!");
      } catch(e) { toast.error("Erro ao restaurar"); }
  }

  // --- FILTROS DE TABELA ---
  const filteredCheques = useMemo(() => {
    let data = cheques;
    
    // Filtro por Aba
    if (activeTab === 'excluidos') {
        data = data.filter(c => c.status === 'excluido');
    } else if (activeTab === 'todos') {
        data = data.filter(c => c.status !== 'excluido');
    } else {
        data = data.filter(c => c.status === activeTab);
    }

    // Busca Texto
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      data = data.filter(c => 
        c.titular?.toLowerCase().includes(lower) ||
        c.numero_cheque?.includes(lower) ||
        c.banco?.toLowerCase().includes(lower)
      );
    }
    
    // Ordenação (Vencimento mais próximo primeiro)
    return data.sort((a, b) => new Date(a.data_vencimento) - new Date(b.data_vencimento));
  }, [cheques, activeTab, searchTerm]);

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  const getStatusBadge = (status) => {
      switch(status) {
          case 'em_maos': return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200">Em Mãos</Badge>;
          case 'repassado': return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200">Repassado</Badge>;
          case 'compensado': return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200">Compensado</Badge>;
          case 'devolvido': return <Badge className="bg-red-100 text-red-700 hover:bg-red-200">Devolvido</Badge>;
          case 'excluido': return <Badge variant="outline" className="border-slate-300 text-slate-500 bg-slate-50">Excluído</Badge>;
          default: return <Badge variant="outline">{status}</Badge>;
      }
  };

  return (
    <PermissionGuard setor="Cheques">
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Dashboard')}>
                <Button variant="ghost" size="icon" className="rounded-xl">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-slate-800">Gestão de Cheques</h1>
                <p className="text-slate-500 mt-1">Controle de recebíveis e custódia</p>
              </div>
            </div>
            <div className="flex gap-2">
                {/* BOTÃO ATUALIZAR / VERIFICAR DUPLICATAS */}
                {canDo('Cheques', 'editar') && (
                    <Button 
                        variant="outline" 
                        onClick={handleCheckDuplicates}
                        className="bg-white border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300"
                        title="Verificar se existem cheques cadastrados duas vezes"
                    >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Verificar Duplicatas
                    </Button>
                )}

                {canDo('Cheques', 'adicionar') && (
                    <Button onClick={() => setShowAddModal(true)} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                        <Plus className="w-4 h-4" />
                        Novo Cheque
                    </Button>
                )}
            </div>
          </div>

          <Card className="overflow-hidden shadow-sm border-slate-200">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="p-4 border-b bg-white flex flex-col md:flex-row justify-between items-center gap-4">
                    <TabsList className="bg-slate-100 p-1">
                        <TabsTrigger value="em_maos" className="gap-2"><WalletIcon className="w-4 h-4 text-blue-600"/> Em Mãos</TabsTrigger>
                        <TabsTrigger value="repassado" className="gap-2"><ArrowUpRightIcon className="w-4 h-4 text-amber-600"/> Repassados</TabsTrigger>
                        <TabsTrigger value="compensado" className="gap-2"><CheckCircle className="w-4 h-4 text-emerald-600"/> Compensados</TabsTrigger>
                        <TabsTrigger value="devolvido" className="gap-2"><AlertCircle className="w-4 h-4 text-red-600"/> Devolvidos</TabsTrigger>
                        <div className="w-px h-4 bg-slate-300 mx-1"></div>
                        <TabsTrigger value="todos">Todos</TabsTrigger>
                        {/* ABA EXCLUÍDOS */}
                        {canDo('Cheques', 'excluir') && (
                            <TabsTrigger value="excluidos" className="gap-2 text-slate-500 data-[state=active]:text-slate-700">
                                <Trash2 className="w-4 h-4"/> Excluídos
                            </TabsTrigger>
                        )}
                    </TabsList>

                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input 
                            placeholder="Buscar cheque..." 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                            className="pl-10"
                        />
                    </div>
                </div>

                {/* CONTEÚDO TABELA */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600 font-medium border-b">
                            <tr>
                                <th className="p-4">Vencimento</th>
                                <th className="p-4">Titular/Cliente</th>
                                <th className="p-4">Detalhes (Banco/Num)</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-right">Valor</th>
                                <th className="p-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {isLoading ? (
                                <tr><td colSpan="6" className="p-8 text-center text-slate-500">Carregando cheques...</td></tr>
                            ) : filteredCheques.length === 0 ? (
                                <tr><td colSpan="6" className="p-8 text-center text-slate-500">Nenhum cheque encontrado nesta categoria.</td></tr>
                            ) : (
                                filteredCheques.map((cheque) => (
                                    <tr key={cheque.id} className={cn("hover:bg-slate-50 transition-colors", cheque.status === 'excluido' && "opacity-60 bg-slate-50/50")}>
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span className={cn("font-bold", cheque.data_vencimento && isPast(parseISO(cheque.data_vencimento)) && !isToday(parseISO(cheque.data_vencimento)) && cheque.status === 'em_maos' ? "text-red-600" : "text-slate-700")}>
                                                    {cheque.data_vencimento ? format(parseISO(cheque.data_vencimento), 'dd/MM/yyyy') : '-'}
                                                </span>
                                                <span className="text-xs text-slate-400">Emissão: {cheque.data_emissao ? format(parseISO(cheque.data_emissao), 'dd/MM/yy') : '-'}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <p className="font-medium text-slate-800 line-clamp-1" title={cheque.titular}>{cheque.titular}</p>
                                            <p className="text-xs text-slate-500 line-clamp-1">{cheque.cliente_vinculado || 'Cliente avulso'}</p>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-xs space-y-0.5">
                                                <p><span className="text-slate-400">Banco:</span> {cheque.banco} ({cheque.agencia})</p>
                                                <p><span className="text-slate-400">Conta:</span> {cheque.conta}</p>
                                                <p><span className="text-slate-400">Num:</span> <span className="font-mono text-slate-700 font-bold">{cheque.numero_cheque}</span></p>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            {getStatusBadge(cheque.status)}
                                        </td>
                                        <td className="p-4 text-right">
                                            <span className="font-bold text-slate-800 text-base">{formatCurrency(cheque.valor)}</span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                {/* Ações Específicas para Excluídos */}
                                                {cheque.status === 'excluido' ? (
                                                    canDo('Cheques', 'editar') && (
                                                        <Button variant="ghost" size="sm" onClick={() => handleRestore(cheque)} className="text-emerald-600 hover:bg-emerald-50" title="Restaurar">
                                                            <CornerUpLeft className="w-4 h-4" />
                                                        </Button>
                                                    )
                                                ) : (
                                                    // Ações Normais
                                                    <>
                                                        {canDo('Cheques', 'editar') && (
                                                            <Button variant="ghost" size="sm" onClick={() => { setSelectedCheque(cheque); setShowEditModal(true); }}>
                                                                <Edit className="w-4 h-4 text-blue-600" />
                                                            </Button>
                                                        )}
                                                        {/* Visualização Rápida */}
                                                        {canDo('Cheques', 'visualizar') && (
                                                            <Button variant="ghost" size="sm" onClick={() => { setSelectedCheque(cheque); setShowEditModal(true); }}>
                                                                <Eye className="w-4 h-4 text-slate-400" />
                                                            </Button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Tabs>
          </Card>

          {/* MODAL DE CADASTRO/EDIÇÃO (ASSUMINDO COMPONENTE EXISTENTE) */}
          <ModalContainer open={showAddModal} onClose={() => setShowAddModal(false)} title="Novo Cheque">
             <ChequeForm onSave={(data) => createMutation.mutate(data)} onCancel={() => setShowAddModal(false)} isLoading={createMutation.isPending} />
          </ModalContainer>

          <ModalContainer open={showEditModal} onClose={() => {setShowEditModal(false); setSelectedCheque(null);}} title="Editar Cheque">
             {selectedCheque && (
                 <ChequeForm cheque={selectedCheque} onSave={(data) => updateMutation.mutate({ id: selectedCheque.id, data })} onCancel={() => {setShowEditModal(false); setSelectedCheque(null);}} isLoading={updateMutation.isPending} />
             )}
          </ModalContainer>

          {/* MODAL DE DUPLICATAS */}
          <Dialog open={showDuplicateModal} onOpenChange={setShowDuplicateModal}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Resolver Duplicatas</DialogTitle>
                <DialogDescription>
                  Selecione qual registro deve permanecer ativo. Os não selecionados serão movidos para "Excluídos".
                </DialogDescription>
              </DialogHeader>
              
              <ResolveDuplicatesModal 
                duplicateGroups={duplicateGroups} 
                onResolve={handleResolveDuplicates} 
                onCancel={() => setShowDuplicateModal(false)} 
                isProcessing={isProcessing}
              />
            </DialogContent>
          </Dialog>

        </div>
      </div>
    </PermissionGuard>
  );
}

// Icones auxiliares simples caso não existam
function WalletIcon(props) { return <Wallet {...props} /> }
function ArrowUpRightIcon(props) { return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg> }