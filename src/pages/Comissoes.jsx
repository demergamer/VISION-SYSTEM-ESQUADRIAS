import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from '@/api/base44Client';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Wallet, Users, Calendar, DollarSign, FileText, Search, ArrowRight, Loader2 } from "lucide-react";
import PermissionGuard from "@/components/PermissionGuard";
import ModalContainer from "@/components/modals/ModalContainer";
import ComissaoDetalhes from "@/components/comissoes/ComissaoDetalhes";
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

// --- COMPONENTE CARD DE REPRESENTANTE ---
const RepresentanteCard = ({ rep, onClick }) => {
  const statusColor = rep.status === 'fechado' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200';
  
  return (
    <div 
      onClick={onClick}
      className="group bg-white rounded-xl border border-slate-200 p-5 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all relative overflow-hidden"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" /> {rep.nome}
          </h3>
          <p className="text-xs text-slate-500 font-mono mt-1">Cód: {rep.codigo}</p>
        </div>
        <Badge variant="outline" className={statusColor}>
          {rep.status === 'fechado' ? 'Fechado' : 'Aberto'}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
          <p className="text-slate-500 text-xs uppercase font-bold">Vendas</p>
          <p className="text-slate-700 font-bold">{formatCurrency(rep.totalVendas)}</p>
        </div>
        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
          <p className="text-slate-500 text-xs uppercase font-bold">A Pagar</p>
          <p className="text-emerald-600 font-bold text-lg">{formatCurrency(rep.saldoAPagar)}</p>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
        <span>{rep.pedidos.length} pedidos elegíveis</span>
        <span className="group-hover:translate-x-1 transition-transform flex items-center text-blue-600 font-medium">
          Ver Detalhes <ArrowRight className="w-3 h-3 ml-1" />
        </span>
      </div>
    </div>
  );
};

export default function Comissoes() {
  const queryClient = useQueryClient();
  const hoje = new Date();
  const [mesAnoSelecionado, setMesAnoSelecionado] = useState(format(hoje, 'yyyy-MM'));
  const [representanteSelecionado, setRepresentanteSelecionado] = useState(null);
  const [showDetalhes, setShowDetalhes] = useState(false);
  const [buscaRepresentante, setBuscaRepresentante] = useState('');

  // --- QUERIES ---
  const { data: pedidos = [] } = useQuery({ queryKey: ['pedidos'], queryFn: () => base44.entities.Pedido.list() });
  const { data: representantes = [] } = useQuery({ queryKey: ['representantes'], queryFn: () => base44.entities.Representante.list() });
  const { data: controles = [] } = useQuery({ queryKey: ['comissaoControle'], queryFn: () => base44.entities.ComissaoControle.list() });

  // --- LÓGICA DE CÁLCULO (O CORAÇÃO DO SISTEMA) ---
  const comissoesPorRepresentante = useMemo(() => {
    const [ano, mes] = mesAnoSelecionado.split('-').map(Number);
    const inicioMes = startOfMonth(new Date(ano, mes - 1));
    const fimMes = endOfMonth(new Date(ano, mes - 1));
    const mesAtual = format(hoje, 'yyyy-MM');
    const ehMesFuturo = mesAnoSelecionado > mesAtual;

    // Filtra controles deste mês (Rascunhos ou Fechados)
    const controlesDoMes = controles.filter(c => c.referencia === mesAnoSelecionado);

    // 1. Filtragem Inicial: Pedidos que "Naturalmente" pertencem ao mês (Data Pagamento)
    const pedidosDoMes = pedidos.filter(p => {
        // Se já está pago e fechado em definitivo NESTE mês:
        if (p.comissao_paga === true) {
            return p.comissao_referencia_paga === mesAnoSelecionado;
        }
        
        // Se não está pago, e não é previsão futura, ignora
        if (p.status !== 'pago' && !ehMesFuturo) return false;

        // Verifica data
        const dataRef = p.data_referencia_comissao ? new Date(p.data_referencia_comissao) : (p.data_pagamento ? new Date(p.data_pagamento) : null);
        if (!dataRef) return false;
        
        return dataRef >= inicioMes && dataRef <= fimMes;
    });

    const agrupado = {};

    // Função auxiliar para inicializar ou recuperar representante no agrupamento
    const getRepAgrupado = (repCodigo, dadosExtra = {}) => {
        if (!agrupado[repCodigo]) {
            const repOriginal = representantes.find(r => r.codigo === repCodigo);
            const controle = controlesDoMes.find(c => c.representante_codigo === repCodigo);

            agrupado[repCodigo] = {
                codigo: repCodigo,
                nome: repOriginal?.nome || dadosExtra.nome || 'Desconhecido',
                chave_pix: repOriginal?.chave_pix || '',
                porcentagem_padrao: repOriginal?.porcentagem_comissao || 5,
                pedidos: [],
                totalVendas: 0,
                totalComissoes: 0,
                // Dados do Controle (Rascunho)
                vales: controle ? controle.vales : 0,
                outrosDescontos: controle ? controle.outros_descontos : 0,
                observacoes: controle ? controle.observacao : '',
                status: controle ? controle.status : 'aberto',
                controleId: controle?.id,
                pedidos_ajustados: controle?.pedidos_ajustados || []
            };
        }
        return agrupado[repCodigo];
    };

    // Função auxiliar para adicionar/processar um pedido na lista
    const processarPedido = (pedido, percentualForcado = null) => {
        const repData = getRepAgrupado(pedido.representante_codigo, { nome: pedido.representante_nome });
        
        // Evita duplicidade visual se o pedido já foi processado
        if (repData.pedidos.some(p => p.id === pedido.id)) return;

        const valorPedido = parseFloat(pedido.valor_pedido) || 0;
        
        // Definição da Porcentagem:
        // 1. Forçado (vem do loop do rascunho)
        // 2. Salvo no rascunho (pedidos_ajustados)
        // 3. Do pedido original
        // 4. Padrão do representante
        let percentual = percentualForcado;
        
        if (percentual === null) {
            const ajusteSalvo = repData.pedidos_ajustados?.find(a => String(a.pedido_id) === String(pedido.id));
            if (ajusteSalvo) percentual = ajusteSalvo.percentual;
            else percentual = pedido.porcentagem_comissao || repData.porcentagem_padrao;
        }

        const valorComissao = (valorPedido * percentual) / 100;

        repData.pedidos.push({
            ...pedido,
            percentualComissao: percentual,
            valorComissao
        });

        repData.totalVendas += valorPedido;
        repData.totalComissoes += valorComissao;
    };

    // PASSO A: Processar pedidos naturais do mês
    pedidosDoMes.forEach(p => processarPedido(p));

    // PASSO B: Processar pedidos "forçados" (Antecipados/Salvos no Rascunho)
    // Isso resolve o problema de pedidos de outros meses não aparecerem
    controlesDoMes.forEach(controle => {
        if (controle.pedidos_ajustados && Array.isArray(controle.pedidos_ajustados)) {
            controle.pedidos_ajustados.forEach(ajuste => {
                // Busca o pedido na lista global (pode ser de qualquer mês)
                const pedidoOriginal = pedidos.find(p => String(p.id) === String(ajuste.pedido_id));
                
                if (pedidoOriginal) {
                    // Força a inclusão dele na lista deste mês, usando a % salva
                    processarPedido(pedidoOriginal, ajuste.percentual);
                }
            });
        }
    });

    // Finaliza cálculos
    Object.values(agrupado).forEach(rep => {
      rep.saldoAPagar = rep.totalComissoes - rep.vales - rep.outrosDescontos;
    });

    return Object.values(agrupado);
  }, [pedidos, mesAnoSelecionado, representantes, controles, hoje]);

  // Filtros de UI
  const mesesDisponiveis = useMemo(() => {
    const meses = [];
    for (let i = 3; i > 0; i--) { 
      const data = new Date(); data.setMonth(data.getMonth() + i);
      meses.push({ value: format(data, 'yyyy-MM'), label: '📊 ' + format(data, 'MMMM yyyy', { locale: ptBR }) + ' (Previsão)' });
    }
    for (let i = 0; i < 12; i++) { 
      const data = new Date(); data.setMonth(data.getMonth() - i);
      meses.push({ value: format(data, 'yyyy-MM'), label: format(data, 'MMMM yyyy', { locale: ptBR }) });
    }
    return meses;
  }, []);

  const representantesFiltrados = useMemo(() => {
    if (!buscaRepresentante.trim()) return comissoesPorRepresentante;
    const busca = buscaRepresentante.toLowerCase();
    return comissoesPorRepresentante.filter(rep => rep.nome.toLowerCase().includes(busca) || rep.codigo.toLowerCase().includes(busca));
  }, [comissoesPorRepresentante, buscaRepresentante]);

  const totalGeralVendas = comissoesPorRepresentante.reduce((sum, r) => sum + r.totalVendas, 0);
  const totalGeralComissoes = comissoesPorRepresentante.reduce((sum, r) => sum + r.totalComissoes, 0);
  const totalGeralAPagar = comissoesPorRepresentante.reduce((sum, r) => sum + r.saldoAPagar, 0);

  return (
    <PermissionGuard setor="Comissoes">
      <div className="space-y-8 p-6 bg-[#F8FAFC] min-h-screen">
        
        {/* HEADER & FILTROS */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Comissões</h1>
            <p className="text-slate-500">Gestão de fechamentos e pagamentos</p>
          </div>
          <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
             <Calendar className="w-5 h-5 text-slate-400 ml-2" />
             <select 
               value={mesAnoSelecionado} 
               onChange={(e) => setMesAnoSelecionado(e.target.value)} 
               className="bg-transparent border-none text-sm font-bold text-slate-700 focus:ring-0 cursor-pointer outline-none uppercase"
             >
                {mesesDisponiveis.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
             </select>
          </div>
        </div>

        {/* RESUMO GERAL */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <Card className="p-6 bg-emerald-50 border-emerald-100 flex flex-col justify-center shadow-sm">
              <p className="text-emerald-600 font-bold text-xs uppercase flex items-center gap-2"><DollarSign className="w-4 h-4"/> Total Vendas</p>
              <p className="text-3xl font-bold text-emerald-900 mt-1">{formatCurrency(totalGeralVendas)}</p>
           </Card>
           <Card className="p-6 bg-blue-50 border-blue-100 flex flex-col justify-center shadow-sm">
              <p className="text-blue-600 font-bold text-xs uppercase flex items-center gap-2"><FileText className="w-4 h-4"/> Total Comissões</p>
              <p className="text-3xl font-bold text-blue-900 mt-1">{formatCurrency(totalGeralComissoes)}</p>
           </Card>
           <Card className="p-6 bg-purple-50 border-purple-100 flex flex-col justify-center shadow-sm">
              <p className="text-purple-600 font-bold text-xs uppercase flex items-center gap-2"><Wallet className="w-4 h-4"/> A Pagar Líquido</p>
              <p className="text-3xl font-bold text-purple-900 mt-1">{formatCurrency(totalGeralAPagar)}</p>
           </Card>
        </div>

        {/* LISTA DE REPRESENTANTES */}
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2"><Users className="w-5 h-5"/> Por Representante</h2>
                <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input placeholder="Buscar..." value={buscaRepresentante} onChange={e => setBuscaRepresentante(e.target.value)} className="pl-9 bg-white" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {representantesFiltrados.map((rep) => (
                    <RepresentanteCard 
                        key={rep.codigo} 
                        rep={rep} 
                        onClick={() => {
                            setRepresentanteSelecionado(rep);
                            setShowDetalhes(true);
                        }} 
                    />
                ))}
                {representantesFiltrados.length === 0 && (
                    <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                        Nenhuma comissão encontrada para este período.
                    </div>
                )}
            </div>
        </div>

        {/* MODAL DETALHES - IMPORTANTE: KEY ÚNICA */}
        <ModalContainer
          open={showDetalhes}
          onClose={() => { setShowDetalhes(false); setRepresentanteSelecionado(null); }}
          title={`Detalhes - ${representanteSelecionado?.nome || ''}`}
          description={`Fechamento de ${mesesDisponiveis.find(m => m.value === mesAnoSelecionado)?.label}`}
          size="xl"
        >
          {representanteSelecionado && (
            <ComissaoDetalhes 
              key={representanteSelecionado.codigo + mesAnoSelecionado} // Garante reload ao mudar rep ou mês
              representante={representanteSelecionado}
              mesAno={mesAnoSelecionado}
              pedidosTodos={pedidos}
              onClose={() => {
                setShowDetalhes(false);
                setRepresentanteSelecionado(null);
                queryClient.invalidateQueries(['comissaoControle']);
              }}
            />
          )}
        </ModalContainer>

      </div>
    </PermissionGuard>
  );
}