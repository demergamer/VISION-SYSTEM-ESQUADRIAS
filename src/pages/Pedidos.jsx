import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ShoppingCart, Plus, Search, RefreshCw, DollarSign, AlertTriangle,
  FileText, ArrowLeft, Filter, Upload, Truck, Clock, CheckCircle, XCircle,
  MoreHorizontal, ChevronDown, Package, UserPlus
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

// Componentes Internos
import ModalContainer from "@/components/modals/ModalContainer";
import PedidoForm from "@/components/pedidos/PedidoForm";
import PedidoDetails from "@/components/pedidos/PedidoDetails";
import PedidoTable from "@/components/pedidos/PedidoTable";
import LiquidacaoForm from "@/components/pedidos/LiquidacaoForm";
import ImportarPedidos from "@/components/pedidos/ImportarPedidos";
import RotasList from "@/components/pedidos/RotasList";
import RotaChecklist from "@/components/pedidos/RotaChecklist";
import AlterarPortadorModal from "@/components/pedidos/AlterarPortadorModal";
import ClienteForm from "@/components/clientes/ClienteForm";
import CancelarPedidoModal from "@/components/pedidos/CancelarPedidoModal";
import LiquidacaoMassa from "@/components/pedidos/LiquidacaoMassa";
import RotaCobrancaModal from "@/components/pedidos/RotaCobrancaModal";
import PermissionGuard from "@/components/PermissionGuard";
import { usePermissions } from "@/components/UserNotRegisteredError";

// --- NOVO COMPONENTE DE CARD MAIOR PARA "AGUARDANDO" ---
const PedidoAguardandoCard = ({ pedido, onConfirmar, onCancelar, onCadastrarCliente }) => {
  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy');
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col gap-4 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-400" />
      
      <div className="flex justify-between items-start pl-2">
        <div>
          <span className="text-xs font-bold text-amber-700 uppercase tracking-wider block mb-0.5">Nº Pedido</span>
          <h3 className="text-2xl font-extrabold text-slate-800">#{pedido.numero_pedido}</h3>
        </div>
        <div className="text-right bg-white/60 px-3 py-1 rounded-lg border border-amber-100">
           <span className="text-[10px] font-bold text-slate-400 uppercase block">Entrega</span>
           <span className="text-sm font-semibold text-slate-700">{formatDate(pedido.data_entrega)}</span>
        </div>
      </div>

      <div className="bg-white/80 rounded-xl p-4 border border-amber-100 flex flex-col gap-3">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Cliente / Código</span>
          {pedido.cliente_pendente ? (
             <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100">
                <AlertTriangle size={18} />
                <span className="font-bold text-sm">Cliente Não Cadastrado</span>
             </div>
          ) : (
             <div className="flex flex-col">
                <span className="font-bold text-slate-800 text-base line-clamp-1" title={pedido.cliente_nome}>
                  {pedido.cliente_nome || "Nome não informado"}
                </span>
                <span className="text-xs text-slate-500 font-mono mt-0.5">
                  Cód: {pedido.cliente_codigo || "-"}
                </span>
             </div>
          )}
        </div>
        
        <div className="flex items-end justify-between border-t border-slate-100 pt-3 mt-1">
           <span className="text-xs font-medium text-slate-500">Valor Total</span>
           <span className="text-xl font-bold text-emerald-600">{formatCurrency(pedido.valor_pedido)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-auto pt-2">
        {pedido.cliente_pendente ? (
          <Button 
            onClick={() => onCadastrarCliente(pedido)} 
            className="col-span-2 bg-amber-500 hover:bg-amber-600 text-white h-11 font-semibold text-base shadow-sm shadow-amber-200"
          >
            <UserPlus className="w-5 h-5 mr-2" />
            Cadastrar
          </Button>
        ) : (
          <Button 
            onClick={() => onConfirmar(pedido)} 
            className="col-span-1 bg-emerald-500 hover:bg-emerald-600 text-white h-11 font-semibold text-base shadow-sm shadow-emerald-200"
          >
            <CheckCircle className="w-5 h-5 mr-2" />
            Confirmar
          </Button>
        )}
        
        <Button 
          variant="outline" 
          onClick={() => onCancelar(pedido)} 
          className={`h-11 font-semibold text-base border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 ${pedido.cliente_pendente ? 'col-span-2' : 'col-span-1'}`}
        >
          <XCircle className="w-5 h-5 mr-2" />
          Cancelar
        </Button>
      </div>
    </div>
  );
};

const StatWidget = ({ title, value, icon: Icon, color }) => {
  const colorStyles = {
    blue: "bg-blue-50 text-blue-600",
    red: "bg-red-50 text-red-600",
    yellow: "bg-amber-50 text-amber-600",
    purple: "bg-purple-50 text-purple-600",
    emerald: "bg-emerald-50 text-emerald-600",
    slate: "bg-slate-100 text-slate-600"
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start justify-between hover:shadow-md transition-all duration-300">
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
      </div>
      <div className={`p-3 rounded-xl ${colorStyles[color] || colorStyles.slate}`}>
        <Icon size={20} />
      </div>
    </div>
  );
};

export default function Pedidos() {
  const queryClient = useQueryClient();
  const { canDo } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('abertos');
  
  // Modais State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showLiquidarModal, setShowLiquidarModal] = useState(false);
  const [showCancelarDialog, setShowCancelarDialog] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showRotaModal, setShowRotaModal] = useState(false);
  const [showAlterarPortadorModal, setShowAlterarPortadorModal] = useState(false);
  const [showCadastrarClienteModal, setShowCadastrarClienteModal] = useState(false);
  const [showCancelarPedidoModal, setShowCancelarPedidoModal] = useState(false);
  const [showLiquidacaoMassaModal, setShowLiquidacaoMassaModal] = useState(false);
  const [showRotaCobrancaModal, setShowRotaCobrancaModal] = useState(false);
  
  // Selection State
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [selectedRota, setSelectedRota] = useState(null);
  const [pedidoParaCadastro, setPedidoParaCadastro] = useState(null);
  const [pedidoParaCancelar, setPedidoParaCancelar] = useState(null);
  const [showReverterDialog, setShowReverterDialog] = useState(false);
  const [pedidoParaReverter, setPedidoParaReverter] = useState(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const clienteCodigo = urlParams.get('cliente');
    if (clienteCodigo) {
      setSearchTerm(clienteCodigo);
    }
  }, []);

  const { data: pedidos = [], isLoading: loadingPedidos, refetch: refetchPedidos } = useQuery({
    queryKey: ['pedidos'],
    queryFn: () => base44.entities.Pedido.list()
  });

  const { data: clientes = [] } = useQuery({ queryKey: ['clientes'], queryFn: () => base44.entities.Cliente.list() });
  const { data: rotas = [], isLoading: loadingRotas, refetch: refetchRotas } = useQuery({ queryKey: ['rotas'], queryFn: () => base44.entities.RotaImportada.list('-created_date') });
  const { data: representantes = [] } = useQuery({ queryKey: ['representantes'], queryFn: () => base44.entities.Representante.list() });
  const { data: cheques = [] } = useQuery({ queryKey: ['cheques'], queryFn: () => base44.entities.Cheque.list() });

  const stats = useMemo(() => {
    const now = new Date();
    const twentyDaysAgo = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);
    
    const aguardando = pedidos.filter(p => p.status === 'aguardando');
    const abertos = pedidos.filter(p => p.status === 'aberto' || p.status === 'parcial');
    const pagos = pedidos.filter(p => p.status === 'pago');
    const cancelados = pedidos.filter(p => p.status === 'cancelado');
    const atrasados = abertos.filter(p => new Date(p.data_entrega) < twentyDaysAgo);
    
    const totalAReceber = abertos.reduce((sum, p) => sum + (p.saldo_restante || (p.valor_pedido - (p.total_pago || 0))), 0);
    const totalAtrasado = atrasados.reduce((sum, p) => sum + (p.saldo_restante || (p.valor_pedido - (p.total_pago || 0))), 0);

    return {
      aguardando: aguardando.length,
      abertos: abertos.length,
      pagos: pagos.length,
      cancelados: cancelados.length,
      atrasados: atrasados.length,
      totalAReceber,
      totalAtrasado
    };
  }, [pedidos]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Pedido.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pedidos'] }); setShowAddModal(false); toast.success('Pedido cadastrado!'); }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Pedido.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['pedidos'] }); setShowEditModal(false); setShowLiquidarModal(false); setSelectedPedido(null); toast.success('Pedido atualizado!'); }
  });

  const filteredPedidos = useMemo(() => {
    let filtered = pedidos;
    switch (activeTab) {
      case 'aguardando': filtered = filtered.filter(p => p.status === 'aguardando'); break;
      case 'abertos': filtered = filtered.filter(p => p.status === 'aberto' || p.status === 'parcial'); break;
      case 'pagos': filtered = filtered.filter(p => p.status === 'pago'); break;
      case 'cancelados': filtered = filtered.filter(p => p.status === 'cancelado'); break;
    }
    if (searchTerm) {
      filtered = filtered.filter(pedido =>
        pedido.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pedido.cliente_codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pedido.numero_pedido?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return filtered;
  }, [pedidos, activeTab, searchTerm]);

  const pedidosDaRota = useMemo(() => {
    if (!selectedRota) return [];
    return pedidos.filter(p => p.rota_importada_id === selectedRota.id);
  }, [pedidos, selectedRota]);

  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

  const handleEdit = (pedido) => { setSelectedPedido(pedido); setShowEditModal(true); };
  const handleView = (pedido) => { setSelectedPedido(pedido); pedido.status === 'pago' ? setShowDetailsModal(true) : setShowEditModal(true); };
  const handleLiquidar = (pedido) => { setSelectedPedido(pedido); setShowLiquidarModal(true); };
  const handleCancelar = (pedido) => { setPedidoParaCancelar(pedido); setShowCancelarPedidoModal(true); };
  const handleRefresh = () => { refetchPedidos(); refetchRotas(); toast.success('Atualizado!'); };
  const handleImportComplete = () => { queryClient.invalidateQueries({ queryKey: ['pedidos'] }); queryClient.invalidateQueries({ queryKey: ['rotas'] }); setShowImportModal(false); toast.success('Importação concluída!'); };
  
  const handleSelectRota = async (rota) => { 
    try {
      const pedidosDaRotaAtual = pedidos.filter(p => p.rota_importada_id === rota.id);
      const pedidosPendentes = pedidosDaRotaAtual.filter(p => p.cliente_pendente);
      let atualizados = 0;
      for (const pedido of pedidosPendentes) {
        const nomeClientePedido = pedido.cliente_nome?.toLowerCase().trim() || '';
        const clienteEncontrado = clientes.find(c => {
          const nomeCliente = c.nome?.toLowerCase().trim() || '';
          return nomeCliente === nomeClientePedido || nomeCliente.includes(nomeClientePedido) || nomeClientePedido.includes(nomeCliente);
        });
        if (clienteEncontrado) {
          await base44.entities.Pedido.update(pedido.id, {
            cliente_codigo: clienteEncontrado.codigo,
            cliente_regiao: clienteEncontrado.regiao,
            representante_codigo: clienteEncontrado.representante_codigo,
            representante_nome: clienteEncontrado.representante_nome,
            porcentagem_comissao: clienteEncontrado.porcentagem_comissao,
            cliente_pendente: false
          });
          atualizados++;
        }
      }
      if (atualizados > 0) {
        await queryClient.invalidateQueries({ queryKey: ['pedidos'] });
        toast.success(`${atualizados} pedido(s) vinculado(s) automaticamente!`);
      }
      setSelectedRota(rota);
      setShowRotaModal(true);
    } catch (error) {
      console.error('Erro ao verificar pedidos:', error);
      setSelectedRota(rota);
      setShowRotaModal(true);
    }
  };

  const handleSaveRotaChecklist = async (data) => { setShowRotaModal(false); toast.success('Rota salva!'); };
  const handleAlterarPortador = (rota) => { setSelectedRota(rota); setShowAlterarPortadorModal(true); };
  const handleSaveAlterarPortador = async (motorista) => { setShowAlterarPortadorModal(false); toast.success('Portador alterado!'); };
  const handleCadastrarCliente = (pedido) => { setPedidoParaCadastro(pedido); setShowCadastrarClienteModal(true); };
  const handleSaveNovoCliente = async (clienteData) => { 
      try {
        const novoCliente = await base44.entities.Cliente.create(clienteData);
        const nomeNovoCliente = clienteData.nome?.toLowerCase().trim() || '';
        const pedidosComMesmoCliente = pedidos.filter(p => {
          const nomePedido = p.cliente_nome?.toLowerCase().trim() || '';
          return nomePedido === nomeNovoCliente || nomePedido.includes(nomeNovoCliente) || nomeNovoCliente.includes(nomePedido);
        });
        for (const pedido of pedidosComMesmoCliente) {
          const updateData = {
            cliente_codigo: novoCliente.codigo,
            cliente_regiao: novoCliente.regiao,
            representante_codigo: novoCliente.representante_codigo,
            representante_nome: novoCliente.representante_nome,
            porcentagem_comissao: novoCliente.porcentagem_comissao,
            cliente_pendente: false
          };
          if (pedidoParaCadastro && pedido.id === pedidoParaCadastro.id) {
            updateData.confirmado_entrega = true;
            updateData.status = 'aberto';
          }
          await base44.entities.Pedido.update(pedido.id, updateData);
        }
        await queryClient.invalidateQueries({ queryKey: ['clientes'] });
        await queryClient.invalidateQueries({ queryKey: ['pedidos'] });
        setShowCadastrarClienteModal(false);
        setPedidoParaCadastro(null);
        toast.success(`Cliente cadastrado! ${pedidosComMesmoCliente.length} pedido(s) vinculados.`);
      } catch (error) { toast.error('Erro ao cadastrar cliente'); }
  };
  
  const handleCancelarPedidoRota = (pedido) => { setPedidoParaCancelar(pedido); setShowCancelarPedidoModal(true); };
  const handleSaveCancelarPedido = async (data) => { 
      try {
          await base44.entities.Pedido.update(pedidoParaCancelar.id, data);
          await queryClient.invalidateQueries({ queryKey: ['pedidos'] });
          setShowCancelarPedidoModal(false);
          toast.success('Pedido cancelado!');
      } catch(e) { toast.error('Erro ao cancelar'); }
  };
  
  const handleConfirmarAguardando = async (pedido) => {
    try {
      await base44.entities.Pedido.update(pedido.id, { confirmado_entrega: true, status: 'aberto' });
      await queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      toast.success('Pedido confirmado!');
    } catch (error) { toast.error('Erro ao confirmar'); }
  };

  const handleReverterLiquidacao = async () => { 
      if (!pedidoParaReverter) return;
      try {
          await base44.entities.Pedido.update(pedidoParaReverter.id, {
              status: 'aberto',
              saldo_restante: pedidoParaReverter.valor_pedido,
              total_pago: 0,
              data_pagamento: null,
              mes_pagamento: null,
              desconto_dado: 0, // Resetar desconto
              outras_informacoes: pedidoParaReverter.outras_informacoes + `\n[${new Date().toLocaleDateString()}] Liquidação Revertida.`
          });
          await queryClient.invalidateQueries({ queryKey: ['pedidos'] });
          setShowReverterDialog(false);
          setPedidoParaReverter(null);
          toast.success('Revertido!');
      } catch (e) { toast.error('Erro ao reverter'); }
  };

  // --- FUNÇÃO DE LIQUIDAÇÃO EM MASSA ATUALIZADA (COM CÁLCULO PROPORCIONAL DE DESCONTO) ---
  const handleLiquidacaoMassa = async (data) => {
    try {
        const mesAtual = new Date().toISOString().slice(0, 7);
        const hoje = new Date().toISOString().split('T')[0];

        // 1. Gerar Crédito (Excedente)
        if (data.credito > 0 && data.pedidos.length > 0) {
             const primeiroPedido = data.pedidos[0];
             const todosCreditos = await base44.entities.Credito.list();
             const proximoNumero = todosCreditos.length > 0 ? Math.max(...todosCreditos.map(c => c.numero_credito || 0)) + 1 : 1;
             await base44.entities.Credito.create({
                numero_credito: proximoNumero,
                cliente_codigo: primeiroPedido.cliente_codigo,
                cliente_nome: primeiroPedido.cliente_nome,
                valor: data.credito,
                origem: `Excedente Liquidação em Massa (${data.pedidos.length} pedidos)`,
                pedido_origem_id: primeiroPedido.id,
                status: 'disponivel',
                data_emissao: hoje
             });
        }

        // 2. Consumir Créditos
        if (data.creditoUsado > 0 && data.pedidos.length > 0) {
            const primeiroPedido = data.pedidos[0];
            const todosCreditos = await base44.entities.Credito.list();
            const creditosDisponiveis = todosCreditos.filter(c => 
                c.cliente_codigo === primeiroPedido.cliente_codigo && c.status === 'disponivel'
            );
            let valorParaAbater = data.creditoUsado;
            for (const cred of creditosDisponiveis) {
                if (valorParaAbater <= 0) break;
                if (cred.valor <= valorParaAbater) {
                    await base44.entities.Credito.update(cred.id, { status: 'usado', data_uso: hoje, pedido_uso_id: primeiroPedido.id });
                    valorParaAbater -= cred.valor;
                } else {
                    const saldoRestanteCredito = cred.valor - valorParaAbater;
                    await base44.entities.Credito.update(cred.id, { status: 'usado', data_uso: hoje, pedido_uso_id: primeiroPedido.id });
                    const proximoNumero = todosCreditos.length > 0 ? Math.max(...todosCreditos.map(c => c.numero_credito || 0)) + 1 : 1;
                    await base44.entities.Credito.create({
                        numero_credito: proximoNumero + 1,
                        cliente_codigo: cred.cliente_codigo,
                        cliente_nome: cred.cliente_nome,
                        valor: saldoRestanteCredito,
                        origem: `Saldo restante do crédito #${cred.numero_credito}`,
                        status: 'disponivel',
                        data_emissao: hoje
                    });
                    valorParaAbater = 0;
                }
            }
        }

        // 3. Montar Texto Detalhado dos Cheques para os Pedidos
        let textoDetalheCheques = "";
        if (data.cheques && data.cheques.length > 0) {
            const detalhes = data.cheques.map(c => 
                `Cheque Nº ${c.numero_cheque} (${c.banco || 'Bco N/A'}${c.agencia ? '/Ag '+c.agencia : ''}${c.conta ? '/CC '+c.conta : ''}) - R$ ${formatCurrency(c.valor)}`
            );
            textoDetalheCheques = "\nDETALHE CHEQUES:\n" + detalhes.join("\n");
        }

        // 4. Montar Texto Detalhado dos Pedidos para os Cheques (ORIGEM)
        const listaNumerosPedidos = data.pedidos.map(p => `#${p.numero_pedido}`).join(", ");
        const textoOrigemParaCheques = `ORIGEM: Liquidação Pedidos ${listaNumerosPedidos}`;

        // 5. Atualizar Pedidos com DESCONTO PROPORCIONAL
        const totalSaldoOriginal = data.pedidos.reduce((sum, p) => sum + (p.saldo_original || 0), 0);
        let descontoRestante = parseFloat(data.desconto || 0);

        for (let i = 0; i < data.pedidos.length; i++) {
            const p = data.pedidos[i];
            const pedidoOriginal = pedidos.find(item => item.id === p.id);
            if (!pedidoOriginal) continue;

            // Calcular a fatia do desconto
            let descontoDestePedido = 0;
            if (totalSaldoOriginal > 0 && descontoRestante > 0) {
                if (i === data.pedidos.length - 1) {
                    descontoDestePedido = descontoRestante;
                } else {
                    const proporcao = (p.saldo_original || 0) / totalSaldoOriginal;
                    descontoDestePedido = parseFloat((data.desconto * proporcao).toFixed(2));
                    descontoRestante -= descontoDestePedido;
                }
            }

            const currentInfo = pedidoOriginal.outras_informacoes || '';
            const formaPagamentoTexto = data.formaPagamento || 'Liquidação em Massa';
            const infoDesconto = descontoDestePedido > 0 ? ` (Desc. aplicado: R$ ${descontoDestePedido.toFixed(2)})` : '';
            
            const newInfo = currentInfo
                ? `${currentInfo}\n[${new Date().toLocaleDateString('pt-BR')}] LIQUIDAÇÃO EM MASSA: ${formaPagamentoTexto}${infoDesconto}${textoDetalheCheques}`
                : `[${new Date().toLocaleDateString('pt-BR')}] LIQUIDAÇÃO EM MASSA: ${formaPagamentoTexto}${infoDesconto}${textoDetalheCheques}`;

            // *** CORREÇÃO DE VALORES ***
            // O Desconto é cumulativo (se já tiver desconto anterior)
            const descontoAnterior = parseFloat(pedidoOriginal.desconto_dado || 0);
            const novoDescontoDado = descontoAnterior + descontoDestePedido;
            
            // O Total Pago é o Valor do Pedido MENOS o Desconto Total
            // Ex: Pedido 100, Desconto 10 -> Pagou 90.
            const novoTotalPago = parseFloat(pedidoOriginal.valor_pedido) - novoDescontoDado;

            await base44.entities.Pedido.update(p.id, {
                status: 'pago',
                saldo_restante: 0,
                total_pago: novoTotalPago,
                desconto_dado: novoDescontoDado, // Salva o desconto
                data_pagamento: hoje,
                mes_pagamento: mesAtual,
                outras_informacoes: newInfo
            });
        }

        // 6. Atualizar Cheques (Anotar a origem)
        if (data.cheques && data.cheques.length > 0) {
            for (const cheque of data.cheques) {
                await base44.entities.Cheque.update(cheque.id, {
                    observacao: textoOrigemParaCheques 
                });
            }
        }

        await queryClient.invalidateQueries({ queryKey: ['pedidos'] });
        await queryClient.invalidateQueries({ queryKey: ['cheques'] }); 
        await queryClient.invalidateQueries({ queryKey: ['creditos'] });
        
        setShowLiquidacaoMassaModal(false);
        toast.success('Liquidação em massa realizada com sucesso!');

    } catch (error) {
        console.error(error);
        toast.error('Erro ao realizar liquidação em massa.');
    }
  };

  return (
    <PermissionGuard setor="Pedidos">
      <div className="min-h-screen bg-[#F5F7FA] pb-10 font-sans text-slate-900">
        <div className="max-w-[1600px] mx-auto p-4 md:p-8 space-y-8">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Dashboard')}>
                <Button variant="ghost" size="icon" className="rounded-xl hover:bg-white hover:shadow-sm">
                  <ArrowLeft className="w-5 h-5 text-slate-500" />
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Gerenciamento de Pedidos</h1>
                <p className="text-slate-500 mt-1">Controle de entregas, faturamento e rotas</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={handleRefresh} className="bg-white border-slate-200 shadow-sm hover:bg-slate-50 text-slate-600 gap-2 rounded-xl h-10">
                <RefreshCw className="w-4 h-4" /> <span className="hidden sm:inline">Atualizar</span>
              </Button>
              {canDo('Pedidos', 'adicionar') && (
                <>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="bg-white border-slate-200 shadow-sm hover:bg-slate-50 text-slate-600 gap-2 rounded-xl h-10">
                        <MoreHorizontal className="w-4 h-4" /> <span className="hidden sm:inline">Ferramentas</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 rounded-xl">
                      <DropdownMenuLabel>Ações em Massa</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setShowImportModal(true)} className="gap-2 cursor-pointer"><Upload className="w-4 h-4" /> Importar Planilha</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShowLiquidacaoMassaModal(true)} className="gap-2 cursor-pointer"><DollarSign className="w-4 h-4" /> Liquidação em Massa</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setShowRotaCobrancaModal(true)} className="gap-2 cursor-pointer"><FileText className="w-4 h-4" /> Rota de Cobrança</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button onClick={() => setShowAddModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 gap-2 rounded-xl h-10 px-6">
                    <Plus className="w-4 h-4" /> Novo Pedido
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Widgets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatWidget title="Total a Receber" value={formatCurrency(stats.totalAReceber)} icon={DollarSign} color="blue" />
            <StatWidget title="Em Atraso" value={formatCurrency(stats.totalAtrasado)} icon={AlertTriangle} color="red" />
            <StatWidget title="Aguardando Conf." value={stats.aguardando} icon={Package} color="yellow" />
            <StatWidget title="Pedidos Abertos" value={stats.abertos} icon={FileText} color="purple" />
          </div>

          {/* Abas */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <TabsList className="bg-slate-100 p-1 rounded-full border border-slate-200 h-auto flex-wrap justify-start">
                <TabsTrigger value="aguardando" className="rounded-full px-4 py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all gap-2"><Package className="w-4 h-4 text-amber-500" /> Aguardando <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[10px] ml-1">{stats.aguardando}</span></TabsTrigger>
                <TabsTrigger value="abertos" className="rounded-full px-4 py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all gap-2"><FileText className="w-4 h-4 text-blue-500" /> Abertos <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[10px] ml-1">{stats.abertos}</span></TabsTrigger>
                <TabsTrigger value="pagos" className="rounded-full px-4 py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all gap-2"><CheckCircle className="w-4 h-4 text-emerald-500" /> Pagos <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] ml-1">{stats.pagos}</span></TabsTrigger>
                <TabsTrigger value="cancelados" className="rounded-full px-4 py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all gap-2"><XCircle className="w-4 h-4 text-slate-400" /> Cancelados</TabsTrigger>
                <div className="w-px h-6 bg-slate-300 mx-1 hidden sm:block" />
                <TabsTrigger value="rotas" className="rounded-full px-4 py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all gap-2"><Truck className="w-4 h-4 text-purple-500" /> Rotas <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-[10px] ml-1">{rotas.length}</span></TabsTrigger>
              </TabsList>
              {activeTab !== 'rotas' && (
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input placeholder="Buscar pedido, cliente..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-white border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all" />
                </div>
              )}
            </div>

            <TabsContent value="rotas" className="mt-0 focus-visible:outline-none">
              <Card className="p-0 border-none shadow-none bg-transparent">
                <RotasList rotas={rotas} onSelectRota={handleSelectRota} onAlterarPortador={handleAlterarPortador} isLoading={loadingRotas} />
              </Card>
            </TabsContent>

            <TabsContent value="aguardando" className="mt-0 focus-visible:outline-none">
              {filteredPedidos.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredPedidos.map((pedido) => (
                    <PedidoAguardandoCard key={pedido.id} pedido={pedido} onConfirmar={handleConfirmarAguardando} onCancelar={handleCancelar} onCadastrarCliente={handleCadastrarCliente} />
                  ))}
                </div>
              ) : (
                <Card className="flex flex-col items-center justify-center py-16 text-center border-dashed border-2 border-slate-200 bg-slate-50/50">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-slate-100"><Package className="w-8 h-8 text-slate-300" /></div>
                  <h3 className="text-lg font-medium text-slate-900">Tudo limpo!</h3>
                  <p className="text-slate-500 max-w-sm mt-1">Nenhum pedido aguardando confirmação no momento.</p>
                </Card>
              )}
            </TabsContent>

            {['abertos', 'pagos', 'cancelados'].map((tab) => (
              <TabsContent key={tab} value={tab} className="mt-0 focus-visible:outline-none">
                <Card className="border border-slate-100 shadow-sm rounded-2xl overflow-hidden bg-white">
                  <PedidoTable pedidos={filteredPedidos} onEdit={handleEdit} onView={handleView} onLiquidar={handleLiquidar} onCancelar={handleCancelar} onReverter={tab === 'pagos' ? (pedido) => { setPedidoParaReverter(pedido); setShowReverterDialog(true); } : null} isLoading={loadingPedidos} />
                </Card>
              </TabsContent>
            ))}
          </Tabs>

          <ModalContainer open={showAddModal} onClose={() => setShowAddModal(false)} title="Novo Pedido" description="Cadastre um novo pedido a receber" size="lg"><PedidoForm clientes={clientes} onSave={(data) => createMutation.mutate(data)} onCancel={() => setShowAddModal(false)} isLoading={createMutation.isPending} /></ModalContainer>
          <ModalContainer open={showEditModal} onClose={() => { setShowEditModal(false); setSelectedPedido(null); }} title="Editar Pedido" description="Atualize os dados do pedido" size="lg"><PedidoForm pedido={selectedPedido} clientes={clientes} onSave={(data) => updateMutation.mutate({ id: selectedPedido.id, data })} onCancel={() => { setShowEditModal(false); setSelectedPedido(null); }} isLoading={updateMutation.isPending} /></ModalContainer>
          <ModalContainer open={showDetailsModal} onClose={() => { setShowDetailsModal(false); setSelectedPedido(null); }} title="Detalhes do Pedido" description="Visualização completa do pedido" size="xl">{selectedPedido && <PedidoDetails pedido={selectedPedido} onClose={() => { setShowDetailsModal(false); setSelectedPedido(null); }} />}</ModalContainer>
          <ModalContainer open={showLiquidarModal} onClose={() => { setShowLiquidarModal(false); setSelectedPedido(null); }} title="Liquidação de Pedido" description="Registre o pagamento do pedido">{selectedPedido && <LiquidacaoForm pedido={selectedPedido} onSave={(data) => updateMutation.mutate({ id: selectedPedido.id, data })} onCancel={() => { setShowLiquidarModal(false); setSelectedPedido(null); }} isLoading={updateMutation.isPending} />}</ModalContainer>
          <ModalContainer open={showImportModal} onClose={() => setShowImportModal(false)} title="Importar Pedidos" description="Importe pedidos de uma planilha Excel" size="lg"><ImportarPedidos clientes={clientes} rotas={rotas} onImportComplete={handleImportComplete} onCancel={() => setShowImportModal(false)} /></ModalContainer>
          <ModalContainer open={showRotaModal} onClose={() => { setShowRotaModal(false); setSelectedRota(null); }} title="Checklist da Rota" description="Confirme os pedidos entregues" size="lg">{selectedRota && <RotaChecklist rota={selectedRota} pedidos={pedidosDaRota} onSave={handleSaveRotaChecklist} onCadastrarCliente={handleCadastrarCliente} onCancelarPedido={handleCancelarPedidoRota} onCancel={() => { setShowRotaModal(false); setSelectedRota(null); }} />}</ModalContainer>
          <ModalContainer open={showAlterarPortadorModal} onClose={() => { setShowAlterarPortadorModal(false); setSelectedRota(null); }} title="Alterar Portador da Rota" description="Gere um relatório PDF e altere o motorista responsável" size="lg">{selectedRota && <AlterarPortadorModal rota={selectedRota} pedidos={pedidosDaRota} onSave={handleSaveAlterarPortador} onCancel={() => { setShowAlterarPortadorModal(false); setSelectedRota(null); }} />}</ModalContainer>
          <ModalContainer open={showCadastrarClienteModal} onClose={() => { setShowCadastrarClienteModal(false); setPedidoParaCadastro(null); }} title="Cadastrar Cliente Pendente" description={`Cliente: ${pedidoParaCadastro?.cliente_nome || ''}`} size="lg"><ClienteForm cliente={pedidoParaCadastro ? { nome: pedidoParaCadastro.cliente_nome } : null} representantes={representantes} onSave={handleSaveNovoCliente} onCancel={() => { setShowCadastrarClienteModal(false); setPedidoParaCadastro(null); }} /></ModalContainer>
          <ModalContainer open={showCancelarPedidoModal} onClose={() => { setShowCancelarPedidoModal(false); setPedidoParaCancelar(null); }} title="Cancelar Pedido" description="Informe o motivo do cancelamento">{pedidoParaCancelar && <CancelarPedidoModal pedido={pedidoParaCancelar} onSave={handleSaveCancelarPedido} onCancel={() => { setShowCancelarPedidoModal(false); setPedidoParaCancelar(null); }} />}</ModalContainer>
          <ModalContainer open={showLiquidacaoMassaModal} onClose={() => setShowLiquidacaoMassaModal(false)} title="Liquidação em Massa" description="Selecione e liquide múltiplos pedidos de uma vez" size="xl"><LiquidacaoMassa pedidos={pedidos} onSave={handleLiquidacaoMassa} onCancel={() => setShowLiquidacaoMassaModal(false)} /></ModalContainer>
          {showRotaCobrancaModal && <RotaCobrancaModal pedidos={pedidos} cheques={cheques} onClose={() => setShowRotaCobrancaModal(false)} />}
          <AlertDialog open={showReverterDialog} onOpenChange={setShowReverterDialog}>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Reverter Liquidação</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja reverter essa liquidação? {pedidoParaReverter && (<div className="mt-4 p-3 bg-slate-50 rounded-lg"><p className="font-medium">Pedido: {pedidoParaReverter.numero_pedido}</p><p className="text-sm">Cliente: {pedidoParaReverter.cliente_nome}</p><p className="text-sm mt-2 text-amber-600">Esta ação irá reverter o pedido para status "aberto", zerar o valor pago e o desconto.</p></div>)}</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel onClick={() => { setShowReverterDialog(false); setPedidoParaReverter(null); }}>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleReverterLiquidacao}>Sim, Reverter</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </PermissionGuard>
  );
}