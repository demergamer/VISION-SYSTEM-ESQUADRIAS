import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from '@/api/base44Client';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button"; 
import { Wallet, Users, Calendar, DollarSign, FileText, Search, ArrowRight, Download } from "lucide-react";
import PermissionGuard from "@/components/PermissionGuard";
import ModalContainer from "@/components/modals/ModalContainer";
import ComissaoDetalhes from "@/components/comissoes/ComissaoDetalhes";
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

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
          <p className="text-slate-500 text-xs uppercase font-bold">Vendas (Base)</p>
          <p className="text-slate-700 font-bold">{formatCurrency(rep.totalVendas)}</p>
        </div>
        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
          <p className="text-slate-500 text-xs uppercase font-bold">A Pagar</p>
          <p className="text-emerald-600 font-bold text-lg">{formatCurrency(rep.saldoAPagar)}</p>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
        <span>{rep.pedidos.length} pedidos vinculados</span>
        <span className="group-hover:translate-x-1 transition-transform flex items-center text-blue-600 font-medium">
          Ver Detalhes <ArrowRight className="w-3 h-3 ml-1" />
        </span>
      </div>
    </div>
  );
};

export default function Comissoes() {
  const queryClient = useQueryClient();
  
  // --- INICIALIZAÇÃO DE DATA (LÓGICA DIA 10) ---
  const [mesAnoSelecionado, setMesAnoSelecionado] = useState(() => {
      const hoje = new Date();
      // Se for dia 10 ou menos, seleciona o mês anterior por padrão
      if (hoje.getDate() <= 10) {
          return format(subMonths(hoje, 1), 'yyyy-MM');
      }
      return format(hoje, 'yyyy-MM');
  });

  const [representanteSelecionado, setRepresentanteSelecionado] = useState(null);
  const [showDetalhes, setShowDetalhes] = useState(false);
  const [buscaRepresentante, setBuscaRepresentante] = useState('');

  // Queries
  const { data: pedidos = [] } = useQuery({ queryKey: ['pedidos'], queryFn: () => base44.entities.Pedido.list() });
  const { data: representantes = [] } = useQuery({ queryKey: ['representantes'], queryFn: () => base44.entities.Representante.list() });
  const { data: controles = [] } = useQuery({ queryKey: ['comissaoControle'], queryFn: () => base44.entities.ComissaoControle.list() });

  // --- LÓGICA MESTRA DE CÁLCULO ---
  const comissoesPorRepresentante = useMemo(() => {
    const [ano, mes] = mesAnoSelecionado.split('-').map(Number);
    const inicioMes = startOfMonth(new Date(ano, mes - 1));
    const fimMes = endOfMonth(new Date(ano, mes - 1));
    
    // 1. MAPA DE "SEQUESTROS" (PEDIDOS EM RASCUNHOS DE OUTROS MESES)
    const mapaPedidoParaMes = {}; 
    controles.forEach(c => {
        if (c.status === 'aberto' && c.pedidos_ajustados) {
            c.pedidos_ajustados.forEach(p => {
                mapaPedidoParaMes[String(p.pedido_id)] = c.referencia;
            });
        }
    });

    const controlesDoMesAtual = controles.filter(c => c.referencia === mesAnoSelecionado);

    // 2. FILTRAGEM UNIFICADA (IMÃ + GRAVIDADE)
    const pedidosDesteMes = pedidos.filter(p => {
        const idStr = String(p.id);

        // A. Se já pago (Finalizado Definitivo)
        if (p.comissao_paga === true) {
            return p.comissao_referencia_paga === mesAnoSelecionado;
        }

        // B. Se não pago (Status do Pedido)
        if (p.status !== 'pago') return false;

        // C. REGRA DO IMÃ (Prioridade Máxima)
        if (mapaPedidoParaMes[idStr]) {
            // Se está mapeado para ESTE mês, mostra aqui.
            // Se está mapeado para OUTRO mês, esconde daqui.
            return mapaPedidoParaMes[idStr] === mesAnoSelecionado;
        }

        // D. REGRA DA GRAVIDADE (Data Natural)
        const dataRef = p.data_referencia_comissao ? new Date(p.data_referencia_comissao) : (p.data_pagamento ? new Date(p.data_pagamento) : null);
        if (!dataRef) return false;
        
        return dataRef >= inicioMes && dataRef <= fimMes;
    });

    const agrupado = {};

    // 3. INICIALIZAÇÃO DE TODOS OS REPRESENTANTES
    representantes.forEach(rep => {
        const controle = controlesDoMesAtual.find(c => c.representante_codigo === rep.codigo);
        agrupado[rep.codigo] = {
            codigo: rep.codigo,
            nome: rep.nome,
            chave_pix: rep.chave_pix || '',
            porcentagem_padrao: rep.porcentagem_comissao || 5,
            pedidos: [],
            totalVendas: 0,
            totalComissoes: 0,
            vales: controle ? controle.vales : 0,
            outrosDescontos: controle ? controle.outros_descontos : 0,
            observacoes: controle ? controle.observacao : '',
            status: controle ? controle.status : 'aberto',
            controleId: controle?.id,
            pedidos_ajustados: controle?.pedidos_ajustados || []
        };
    });

    // Função auxiliar segura
    const getRepAgrupado = (repCodigo, dadosExtra = {}) => {
        if (!agrupado[repCodigo]) {
            const controle = controlesDoMesAtual.find(c => c.representante_codigo === repCodigo);
            agrupado[repCodigo] = {
                codigo: repCodigo,
                nome: dadosExtra.nome || 'Desconhecido',
                chave_pix: '',
                porcentagem_padrao: 5,
                pedidos: [],
                totalVendas: 0,
                totalComissoes: 0,
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

    // 4. DISTRIBUIÇÃO
    pedidosDesteMes.forEach(pedido => {
        const repData = getRepAgrupado(pedido.representante_codigo, { nome: pedido.representante_nome });
        
        let percentual = pedido.porcentagem_comissao || repData.porcentagem_padrao;
        
        // Se existe no rascunho deste mês, usa a % salva
        if (mapaPedidoParaMes[String(pedido.id)] === mesAnoSelecionado) {
             const ajuste = repData.pedidos_ajustados?.find(a => String(a.pedido_id) === String(pedido.id));
             if (ajuste) percentual = ajuste.percentual;
        }

        const valorBase = parseFloat(pedido.total_pago) || 0;
        const valorComissao = (valorBase * percentual) / 100;

        repData.pedidos.push({
            ...pedido,
            valorBaseComissao: valorBase,
            percentualComissao: percentual,
            valorComissao
        });

        repData.totalVendas += valorBase;
        repData.totalComissoes += valorComissao;
    });

    // 5. SALDO
    Object.values(agrupado).forEach(rep => {
      rep.saldoAPagar = rep.totalComissoes - rep.vales - rep.outrosDescontos;
    });

    return Object.values(agrupado);
  }, [pedidos, mesAnoSelecionado, representantes, controles]);

  const handleGerarRelatorioGeral = async () => {
    try {
      toast.loading('Gerando relatório...');
      const response = await base44.functions.invoke('gerarRelatorioComissoes', {
        tipo: 'geral',
        mes_ano: mesAnoSelecionado,
        representantes: comissoesPorRepresentante
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `Comissoes-Geral-${mesAnoSelecionado}.pdf`; document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url); a.remove();
      toast.dismiss(); toast.success('Relatório gerado!');
    } catch (error) { toast.dismiss(); toast.error('Erro ao gerar relatório'); }
  };

  const mesesDisponiveis = useMemo(() => {
    const meses = [];
    for (let i = 3; i > 0; i--) { const d = new Date(); d.setMonth(d.getMonth() + i); meses.push({ value: format(d, 'yyyy-MM'), label: '📊 ' + format(d, 'MMMM yyyy', { locale: ptBR }) + ' (Previsão)' }); }
    for (let i = 0; i < 12; i++) { const d = new Date(); d.setMonth(d.getMonth() - i); meses.push({ value: format(d, 'yyyy-MM'), label: format(d, 'MMMM yyyy', { locale: ptBR }) }); }
    return meses;
  }, []);

  const representantesFiltrados = useMemo(() => {
    if (!buscaRepresentante.trim()) return comissoesPorRepresentante;
    return comissoesPorRepresentante.filter(rep => rep.nome.toLowerCase().includes(buscaRepresentante.toLowerCase()));
  }, [comissoesPorRepresentante, buscaRepresentante]);

  const totalGeralVendas = comissoesPorRepresentante.reduce((sum, r) => sum + r.totalVendas, 0);
  const totalGeralComissoes = comissoesPorRepresentante.reduce((sum, r) => sum + r.totalComissoes, 0);
  const totalGeralAPagar = comissoesPorRepresentante.reduce((sum, r) => sum + r.saldoAPagar, 0);

  return (
    <PermissionGuard setor="Comissoes">
      <div className="space-y-8 p-6 bg-[#F8FAFC] min-h-screen">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Comissões</h1>
            <p className="text-slate-500">Gestão de fechamentos e pagamentos</p>
          </div>
          <div className="flex items-center gap-3">
              <Button onClick={handleGerarRelatorioGeral} className="gap-2 bg-purple-600 hover:bg-purple-700 text-white shadow-sm" disabled={comissoesPorRepresentante.length === 0}><Download className="w-4 h-4" /> Relatório Geral (PIX)</Button>
              <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                <Calendar className="w-5 h-5 text-slate-400 ml-2" />
                <select value={mesAnoSelecionado} onChange={(e) => setMesAnoSelecionado(e.target.value)} className="bg-transparent border-none text-sm font-bold text-slate-700 focus:ring-0 cursor-pointer outline-none uppercase">{mesesDisponiveis.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}</select>
              </div>
          </div>
        </div>

        {/* CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <Card className="p-6 bg-emerald-50 border-emerald-100 flex flex-col justify-center shadow-sm"><p className="text-emerald-600 font-bold text-xs uppercase flex items-center gap-2"><DollarSign className="w-4 h-4"/> Total Vendas (Pagas)</p><p className="text-3xl font-bold text-emerald-900 mt-1">{formatCurrency(totalGeralVendas)}</p></Card>
           <Card className="p-6 bg-blue-50 border-blue-100 flex flex-col justify-center shadow-sm"><p className="text-blue-600 font-bold text-xs uppercase flex items-center gap-2"><FileText className="w-4 h-4"/> Total Comissões</p><p className="text-3xl font-bold text-blue-900 mt-1">{formatCurrency(totalGeralComissoes)}</p></Card>
           <Card className="p-6 bg-purple-50 border-purple-100 flex flex-col justify-center shadow-sm"><p className="text-purple-600 font-bold text-xs uppercase flex items-center gap-2"><Wallet className="w-4 h-4"/> A Pagar Líquido</p><p className="text-3xl font-bold text-purple-900 mt-1">{formatCurrency(totalGeralAPagar)}</p></Card>
        </div>

        {/* LISTA */}
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2"><Users className="w-5 h-5"/> Por Representante</h2>
                <div className="relative w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input placeholder="Buscar..." value={buscaRepresentante} onChange={e => setBuscaRepresentante(e.target.value)} className="pl-9 bg-white" /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {representantesFiltrados.map((rep) => (
                    <RepresentanteCard key={rep.codigo} rep={rep} onClick={() => { setRepresentanteSelecionado(rep); setShowDetalhes(true); }} />
                ))}
                {representantesFiltrados.length === 0 && <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">Nenhum representante encontrado.</div>}
            </div>
        </div>

        {/* MODAL */}
        <ModalContainer open={showDetalhes} onClose={() => { setShowDetalhes(false); setRepresentanteSelecionado(null); }} title={`Detalhes - ${representanteSelecionado?.nome || ''}`} description={`Fechamento de ${mesesDisponiveis.find(m => m.value === mesAnoSelecionado)?.label}`} size="xl">
          {representanteSelecionado && (
            <ComissaoDetalhes 
              key={representanteSelecionado.codigo + mesAnoSelecionado + controles.length} 
              representante={representanteSelecionado}
              mesAno={mesAnoSelecionado}
              pedidosTodos={pedidos}
              controles={controles} 
              onClose={() => { setShowDetalhes(false); setRepresentanteSelecionado(null); }}
              onSuccessSave={() => {
                  queryClient.invalidateQueries(['comissaoControle']);
                  queryClient.invalidateQueries(['pedidos']);
              }}
            />
          )}
        </ModalContainer>
      </div>
    </PermissionGuard>
  );
}