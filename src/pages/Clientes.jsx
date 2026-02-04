import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { 
  Building2, 
  UserPlus, 
  Search, 
  RefreshCw,
  TrendingUp,
  UserCheck,
  ArrowLeft,
  Ban,
  Users,
  Loader2,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

import StatCard from "@/components/dashboard/StatCard";
import ModalContainer from "@/components/modals/ModalContainer";
import ClienteForm from "@/components/clientes/ClienteForm";
import ClienteTable from "@/components/clientes/ClienteTable";
import ClienteDetails from "@/components/clientes/ClienteDetails";
import PermissionGuard from "@/components/PermissionGuard";
import { usePermissions } from "@/components/hooks/usePermissions";

// --- MODAL DE ATUALIZAÇÃO EM MASSA (Mantido) ---
const BulkUpdateModal = ({ isOpen, total, current, currentName, logs }) => {
  if (!isOpen) return null;

  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-lg p-6 shadow-2xl border-slate-200">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-600 mb-3 animate-pulse">
            <RefreshCw className="w-6 h-6 animate-spin" />
          </div>
          <h3 className="text-xl font-bold text-slate-800">Atualizando Clientes</h3>
          <p className="text-sm text-slate-500">Consultando Receita Federal e enriquecendo dados...</p>
        </div>

        <div className="space-y-2 mb-6">
          <div className="flex justify-between text-xs font-semibold text-slate-600">
            <span>Processando: {current} de {total}</span>
            <span>{percentage}%</span>
          </div>
          <Progress value={percentage} className="h-3" />
          <p className="text-xs text-center text-slate-400 mt-2 truncate min-h-[20px]">
            {currentName ? `Verificando: ${currentName}` : 'Iniciando...'}
          </p>
        </div>

        <div className="bg-slate-50 rounded-lg p-3 h-40 overflow-y-auto border border-slate-100 text-xs font-mono space-y-1">
          {logs.map((log, index) => (
            <div key={index} className={`flex items-center gap-2 ${log.type === 'error' ? 'text-red-600' : log.type === 'success' ? 'text-green-600' : 'text-slate-500'}`}>
              {log.type === 'success' ? <CheckCircle size={10} /> : log.type === 'error' ? <AlertCircle size={10} /> : <Loader2 size={10} />}
              <span>{log.message}</span>
            </div>
          ))}
          <div id="log-end" />
        </div>
      </Card>
    </div>
  );
};

export default function ClientesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { canDo } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modais Normais
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState(null);

  // Estados da Atualização em Massa
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState({ current: 0, total: 0, currentName: '' });
  const [updateLogs, setUpdateLogs] = useState([]);

  // Fetch data
  const { data: clientes = [], isLoading: loadingClientes, refetch: refetchClientes } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => base44.entities.Cliente.list()
  });

  const { data: representantes = [] } = useQuery({
    queryKey: ['representantes'],
    queryFn: () => base44.entities.Representante.list()
  });

  const { data: pedidos = [] } = useQuery({ queryKey: ['pedidos'], queryFn: () => base44.entities.Pedido.list() });
  const { data: creditos = [] } = useQuery({ queryKey: ['creditos'], queryFn: () => base44.entities.Credito.list() });
  const { data: cheques = [] } = useQuery({ queryKey: ['cheques'], queryFn: () => base44.entities.Cheque.list() });

  // --- ESTATÍSTICAS ---
  const clienteStats = useMemo(() => {
    const stats = {};
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const fifteenDaysAgo = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);

    clientes.forEach(cli => {
      const cliPedidos = pedidos.filter(p => p.cliente_codigo === cli.codigo);
      const pedidosAbertos = cliPedidos.filter(p => p.status === 'aberto' || p.status === 'parcial');
      
      const totalPedidosAbertos = pedidosAbertos.reduce((sum, p) => 
        sum + (p.saldo_restante || (p.valor_pedido - (p.total_pago || 0))), 0
      );

      const compras30Dias = cliPedidos
        .filter(p => new Date(p.data_entrega) >= thirtyDaysAgo)
        .reduce((sum, p) => sum + (p.valor_pedido || 0), 0);

      const ativo = cliPedidos.some(p => new Date(p.data_entrega) >= sixtyDaysAgo);
      const temAtraso = pedidosAbertos.some(p => new Date(p.data_entrega) < fifteenDaysAgo);
      const ultrapassouLimite = totalPedidosAbertos > (cli.limite_credito || 0);
      const bloqueadoAuto = temAtraso || ultrapassouLimite;

      const chequesAVencer = cheques.filter(ch => {
        if (ch.cliente_codigo !== cli.codigo) return false;
        if (ch.status !== 'normal') return false;
        const vencimento = new Date(ch.data_vencimento);
        vencimento.setHours(0, 0, 0, 0);
        return vencimento > now;
      });
      const totalChequesVencer = chequesAVencer.reduce((sum, ch) => sum + (ch.valor || 0), 0);

      stats[cli.codigo] = {
        totalPedidosAbertos,
        totalChequesVencer,
        bloqueadoAuto,
        compras30k: compras30Dias >= 30000,
        ativo
      };
    });

    return stats;
  }, [clientes, pedidos, cheques]);

  const generalStats = useMemo(() => {
    const ativos = clientes.filter(c => clienteStats[c.codigo]?.ativo).length;
    const inativos = clientes.length - ativos;
    const com30k = clientes.filter(c => clienteStats[c.codigo]?.compras30k).length;
    const bloqueados = clientes.filter(c => c.bloqueado_manual || clienteStats[c.codigo]?.bloqueadoAuto).length;
    
    return { total: clientes.length, ativos, inativos, com30k, bloqueados };
  }, [clientes, clienteStats]);

  // --- LÓGICA DE ATUALIZAÇÃO EM MASSA (COM RETRY) ---
  const addLog = (message, type = 'info') => {
    setUpdateLogs(prev => [{ message, type }, ...prev]);
  };

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Função Principal que pode ser chamada recursivamente
  const processBatch = async (batchList, isRetry = false) => {
    if (batchList.length === 0) {
      setIsBulkUpdating(false);
      return;
    }

    if (!isRetry) {
      const confirm = window.confirm(`Deseja iniciar a atualização automática de ${batchList.length} clientes?`);
      if (!confirm) return;
      setUpdateLogs([]);
    }

    setIsBulkUpdating(true);
    setUpdateProgress({ current: 0, total: batchList.length, currentName: '' });

    let updatedCount = 0;
    let failedList = [];

    for (let i = 0; i < batchList.length; i++) {
      const cliente = batchList[i];
      setUpdateProgress({ current: i + 1, total: batchList.length, currentName: cliente.nome });

      const cnpjLimpo = cliente.cnpj?.replace(/\D/g, '');
      
      if (!cnpjLimpo || cnpjLimpo.length !== 14) {
        addLog(`Ignorado: ${cliente.codigo} - CNPJ inválido ou CPF`, 'info');
        continue;
      }

      try {
        await sleep(300);

        const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        const data = await response.json();

        const newData = {};
        let hasChanges = false;

        // 1. Identificação
        if (!cliente.razao_social) { newData.razao_social = data.razao_social; hasChanges = true; }
        if (!cliente.nome_fantasia) { newData.nome_fantasia = data.nome_fantasia || data.razao_social; hasChanges = true; }
        
        // 2. Endereço
        if (!cliente.cep) { newData.cep = data.cep; hasChanges = true; }
        if (!cliente.endereco) { newData.endereco = data.logradouro; hasChanges = true; }
        if (!cliente.numero) { newData.numero = data.numero; hasChanges = true; }
        if (!cliente.bairro) { newData.bairro = data.bairro; hasChanges = true; }
        if (!cliente.cidade) { newData.cidade = data.municipio; hasChanges = true; }
        if (!cliente.estado) { newData.estado = data.uf; hasChanges = true; }
        if (!cliente.complemento && data.complemento) { newData.complemento = data.complemento; hasChanges = true; }

        // 3. Inteligência Fiscal
        if (!cliente.cnaes_descricao) {
          const cnaesComST = ['4744005', '4744099', '4672900'];
          const todosCnaes = [
            { codigo: data.cnae_fiscal, descricao: data.cnae_fiscal_descricao },
            ...(data.cnaes_secundarios || [])
          ];
          
          const possuiST = todosCnaes.some(cnae => {
            const codigoLimpo = String(cnae.codigo).replace(/\D/g, '');
            return cnaesComST.includes(codigoLimpo);
          });

          const textoCnaes = todosCnaes.map(c => `${c.codigo} - ${c.descricao}`).join('\n');

          newData.cnaes_descricao = textoCnaes;
          newData.tem_st = possuiST;
          hasChanges = true;
        }

        if (hasChanges) {
          await base44.entities.Cliente.update(cliente.id, newData);
          updatedCount++;
          addLog(`Atualizado: ${cliente.nome}`, 'success');
        } else {
          addLog(`Sem mudanças: ${cliente.nome}`, 'info');
        }

      } catch (error) {
        addLog(`Erro: ${cliente.nome} - Falha na consulta`, 'error');
        failedList.push(cliente);
      }
    }

    await queryClient.invalidateQueries({ queryKey: ['clientes'] });
    
    if (failedList.length > 0) {
        await sleep(500); 
        const retry = window.confirm(`O processo finalizou com ${failedList.length} erros. \n\nDeseja tentar novamente APENAS para estes clientes?`);
        if (retry) {
            addLog(`--- Retentativa para ${failedList.length} clientes ---`, 'info');
            processBatch(failedList, true);
            return;
        }
    }

    toast.success(`Processo finalizado!`);
    setTimeout(() => { setIsBulkUpdating(false); }, 2000);
  };

  const handleBulkUpdateClick = () => { processBatch(clientes, false); };

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Cliente.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['clientes'] }); setShowAddModal(false); toast.success('Cliente cadastrado!'); },
    onError: (e) => toast.error('Erro ao cadastrar: ' + e.message)
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Cliente.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['clientes'] }); setShowEditModal(false); setSelectedCliente(null); toast.success('Cliente atualizado!'); },
    onError: (e) => toast.error('Erro ao atualizar: ' + e.message)
  });

  const filteredClientes = clientes.filter(cli =>
    cli.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cli.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cli.regiao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cli.representante_nome?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (cli) => { setSelectedCliente(cli); setShowEditModal(true); };
  const handleView = (cli) => { setSelectedCliente(cli); setShowDetailsModal(true); };
  const handleViewPedidos = (cli) => { navigate(createPageUrl('Pedidos') + `?cliente=${cli.codigo}`); };
  const handleInvite = async (cli) => { /* Mantido */ };

  return (
    <PermissionGuard setor="Clientes">
      <BulkUpdateModal 
        isOpen={isBulkUpdating} 
        total={updateProgress.total} 
        current={updateProgress.current} 
        currentName={updateProgress.currentName}
        logs={updateLogs}
      />

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 font-sans text-slate-900">
        <div className="max-w-[1600px] mx-auto p-6 md:p-8 space-y-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Dashboard')}>
                <Button variant="ghost" size="icon" className="rounded-xl hover:bg-white hover:shadow-sm">
                  <ArrowLeft className="w-5 h-5 text-slate-500" />
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Clientes</h1>
                <p className="text-slate-500 mt-1">Cadastro e gestão de clientes</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                onClick={handleBulkUpdateClick} 
                disabled={isBulkUpdating}
                className="bg-white border-slate-200 shadow-sm hover:bg-slate-50 text-slate-600 gap-2 rounded-xl h-10"
              >
                {isBulkUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                <span className="hidden sm:inline">Atualizar & Enriquecer</span>
              </Button>

              {canDo('Clientes', 'adicionar') && (
                <Button onClick={() => setShowAddModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 gap-2 rounded-xl h-10 px-6">
                  <UserPlus className="w-4 h-4" />
                  Novo Cliente
                </Button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard title="Total Cadastrados" value={generalStats.total} icon={Building2} color="blue" />
            <StatCard title="Ativos (60 dias)" value={generalStats.ativos} icon={UserCheck} color="green" />
            <StatCard title="Inativos" value={generalStats.inativos} icon={Users} color="slate" />
            <StatCard title="+ R$ 30k Compras" value={generalStats.com30k} icon={TrendingUp} color="purple" />
            <StatCard title="Bloqueados" value={generalStats.bloqueados} icon={Ban} color="red" />
          </div>

          {/* Search and Table */}
          <Card className="border border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-white">
            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar por nome, código, região ou representante..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
                />
              </div>
            </div>
            <ClienteTable
              clientes={filteredClientes}
              stats={clienteStats}
              onEdit={handleEdit}
              onView={handleView}
              onViewPedidos={handleViewPedidos}
              onInvite={handleInvite}
              isLoading={loadingClientes}
            />
          </Card>

          {/* MUDANÇA PRINCIPAL AQUI: size="3xl" */}
          <ModalContainer 
            open={showAddModal} 
            onClose={() => setShowAddModal(false)} 
            title="Novo Cliente" 
            description="Preencha os dados para cadastrar um novo cliente" 
            size="3xl" 
          >
            <ClienteForm representantes={representantes} todosClientes={clientes} onSave={(data) => createMutation.mutate(data)} onCancel={() => setShowAddModal(false)} isLoading={createMutation.isPending} />
          </ModalContainer>

          <ModalContainer 
            open={showEditModal} 
            onClose={() => { setShowEditModal(false); setSelectedCliente(null); }} 
            title="Editar Cliente" 
            description="Atualize os dados do cliente" 
            size="3xl"
          >
            <ClienteForm cliente={selectedCliente} representantes={representantes} todosClientes={clientes} onSave={(data) => updateMutation.mutate({ id: selectedCliente.id, data })} onCancel={() => { setShowEditModal(false); setSelectedCliente(null); }} isLoading={updateMutation.isPending} />
          </ModalContainer>

          <ModalContainer 
            open={showDetailsModal} 
            onClose={() => { setShowDetailsModal(false); setSelectedCliente(null); }} 
            title="Detalhes do Cliente" 
            size="xl"
          >
            {selectedCliente && (
              <ClienteDetails
                cliente={selectedCliente}
                stats={clienteStats[selectedCliente.codigo]}
                creditos={creditos.filter(c => c.cliente_codigo === selectedCliente.codigo)}
                onEdit={() => { setShowDetailsModal(false); setShowEditModal(true); }}
                onClose={() => { setShowDetailsModal(false); setSelectedCliente(null); }}
                onViewPedidos={() => handleViewPedidos(selectedCliente)}
              />
            )}
          </ModalContainer>
        </div>
      </div>
    </PermissionGuard>
  );
}