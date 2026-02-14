import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from '@/api/base44Client';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button"; 
import { Wallet, Users, Calendar, DollarSign, FileText, Search, ArrowRight, Download, Loader2 } from "lucide-react";
import PermissionGuard from "@/components/PermissionGuard";
import ModalContainer from "@/components/modals/ModalContainer";
import ComissaoDetalhes from "@/components/comissoes/ComissaoDetalhes";
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const RepresentanteCard = ({ rep, onClick }) => {
  const statusColor = rep.status === 'fechado' 
    ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
    : (rep.status === 'rascunho' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200');
  
  const statusLabel = rep.status === 'fechado' ? 'Fechado' : (rep.status === 'rascunho' ? 'Em Aberto (Salvo)' : 'Aberto (Previsão)');

  return (
    <div onClick={onClick} className="group bg-white rounded-xl border border-slate-200 p-5 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all relative overflow-hidden">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" /> {rep.nome}
          </h3>
          <p className="text-xs text-slate-500 font-mono mt-1">Cód: {rep.codigo}</p>
        </div>
        <Badge variant="outline" className={statusColor}>{statusLabel}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
          <p className="text-slate-500 text-xs uppercase font-bold">Vendas Base</p>
          <p className="text-slate-700 font-bold">{formatCurrency(rep.totalVendas)}</p>
        </div>
        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
          <p className="text-slate-500 text-xs uppercase font-bold">A Pagar</p>
          <p className="text-emerald-600 font-bold text-lg">{formatCurrency(rep.saldoAPagar)}</p>
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
        <span className="group-hover:translate-x-1 transition-transform flex items-center text-blue-600 font-medium">Ver Detalhes <ArrowRight className="w-3 h-3 ml-1" /></span>
      </div>
    </div>
  );
};

export default function Comissoes() {
  const queryClient = useQueryClient();
  const [mesAnoSelecionado, setMesAnoSelecionado] = useState(format(new Date(), 'yyyy-MM'));
  const [representanteSelecionado, setRepresentanteSelecionado] = useState(null);
  const [showDetalhes, setShowDetalhes] = useState(false);
  const [buscaRepresentante, setBuscaRepresentante] = useState('');

  // 1. Busca Representantes
  const { data: representantes = [] } = useQuery({ 
      queryKey: ['representantes'], 
      queryFn: () => base44.entities.Representante.list() 
  });

  // 2. Busca Fechamentos (Rascunhos ou Fechados) do Mês
  const { data: fechamentos = [], isLoading: loadingFechamentos } = useQuery({ 
      queryKey: ['fechamentoComissao', mesAnoSelecionado], 
      queryFn: () => base44.entities.FechamentoComissao.list({ filters: { mes_ano: mesAnoSelecionado } })
  });

  // 3. Busca Pedidos "Soltos" do Mês (Para calcular previsão de quem não tem rascunho)
  const { data: pedidosSoltos = [], isLoading: loadingPedidos } = useQuery({
      queryKey: ['pedidos', 'soltos', mesAnoSelecionado],
      queryFn: async () => {
          const [ano, mes] = mesAnoSelecionado.split('-').map(Number);
          const inicio = startOfMonth(new Date(ano, mes - 1)).toISOString();
          const fim = endOfMonth(new Date(ano, mes - 1)).toISOString();
          
          // Busca pedidos pagos no mês que NÃO têm dono (comissao_fechamento_id IS NULL)
          // Nota: Filtros complexos idealmente via RPC, mas aqui simulamos com listagem
          const todos = await base44.entities.Pedido.list(); 
          return todos.filter(p => {
             if (p.status !== 'pago') return false;
             if (p.comissao_fechamento_id) return false; // Se tem ID, pertence a um rascunho (já tratado no passo 2)
             const dataRef = p.data_referencia_comissao || p.data_pagamento;
             if (!dataRef) return false;
             return dataRef >= inicio && dataRef <= fim;
          });
      }
  });

  // --- MOTE DE CÁLCULO ---
  const dadosConsolidados = useMemo(() => {
    const mapaFechamentos = {};
    fechamentos.forEach(f => mapaFechamentos[f.representante_codigo] = f);

    return representantes.map(rep => {
        const fechamento = mapaFechamentos[rep.codigo];

        // CENÁRIO A: Já tem fechamento (Rascunho ou Final) -> Usa dados do banco
        if (fechamento) {
            return {
                ...rep,
                status: fechamento.status === 'fechado' ? 'fechado' : 'rascunho',
                totalVendas: fechamento.total_vendas || 0,
                saldoAPagar: fechamento.valor_liquido || 0,
                fechamentoId: fechamento.id
            };
        }

        // CENÁRIO B: Não tem nada -> Calcula Previsão em tempo real
        const meusPedidos = pedidosSoltos.filter(p => String(p.representante_codigo) === String(rep.codigo));
        const totalVendas = meusPedidos.reduce((sum, p) => sum + (parseFloat(p.total_pago) || 0), 0);
        const totalComissao = meusPedidos.reduce((sum, p) => sum + ((parseFloat(p.total_pago) || 0) * (p.porcentagem_comissao || rep.porcentagem_comissao || 5) / 100), 0);
        
        return {
            ...rep,
            status: 'aberto',
            totalVendas,
            saldoAPagar: totalComissao - (rep.vales || 0), // Previsão simples
            fechamentoId: null
        };
    }).filter(r => 
        // Filtro de busca local
        !buscaRepresentante || r.nome.toLowerCase().includes(buscaRepresentante.toLowerCase())
    );
  }, [representantes, fechamentos, pedidosSoltos, buscaRepresentante]);

  // Totais Gerais
  const totalGeral = dadosConsolidados.reduce((acc, curr) => ({
      vendas: acc.vendas + curr.totalVendas,
      pagar: acc.pagar + curr.saldoAPagar
  }), { vendas: 0, pagar: 0 });

  const mesesDisponiveis = useMemo(() => {
    const meses = []; const hoje = new Date();
    for (let i = 2; i > -12; i--) { // De 2 meses futuro até 1 ano atrás
        const d = addMonths(hoje, i);
        meses.push({ value: format(d, 'yyyy-MM'), label: format(d, 'MMMM yyyy', { locale: ptBR }) });
    }
    return meses;
  }, []);

  return (
    <PermissionGuard setor="Comissoes">
      <div className="space-y-8 p-6 bg-[#F8FAFC] min-h-screen">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div><h1 className="text-3xl font-bold text-slate-800">Comissões</h1></div>
          <div className="flex items-center gap-3">
             <div className="bg-white p-2 rounded-xl border shadow-sm">
                <select value={mesAnoSelecionado} onChange={(e) => setMesAnoSelecionado(e.target.value)} className="bg-transparent font-bold text-slate-700 outline-none uppercase">
                    {mesesDisponiveis.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <Card className="p-6 bg-emerald-50 border-emerald-100"><p className="text-emerald-600 font-bold text-xs uppercase">Total Vendas</p><p className="text-3xl font-bold text-emerald-900">{formatCurrency(totalGeral.vendas)}</p></Card>
           <Card className="p-6 bg-purple-50 border-purple-100"><p className="text-purple-600 font-bold text-xs uppercase">Total a Pagar</p><p className="text-3xl font-bold text-purple-900">{formatCurrency(totalGeral.pagar)}</p></Card>
        </div>

        <div className="space-y-4">
            <div className="relative w-full md:w-64"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" /><Input placeholder="Buscar representante..." value={buscaRepresentante} onChange={e => setBuscaRepresentante(e.target.value)} className="pl-9 bg-white" /></div>
            
            {loadingFechamentos || loadingPedidos ? <div className="text-center py-10"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500"/></div> : 
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {dadosConsolidados.map((rep) => (
                    <RepresentanteCard key={rep.codigo} rep={rep} onClick={() => { setRepresentanteSelecionado(rep); setShowDetalhes(true); }} />
                ))}
            </div>}
        </div>

        <ModalContainer open={showDetalhes} onClose={() => { setShowDetalhes(false); setRepresentanteSelecionado(null); }} title={`Detalhes - ${representanteSelecionado?.nome}`} size="xl">
          {representanteSelecionado && (
            <ComissaoDetalhes 
              key={`${representanteSelecionado.codigo}-${mesAnoSelecionado}`} // Força reset ao trocar
              representante={representanteSelecionado}
              mesAno={mesAnoSelecionado}
              onClose={() => { setShowDetalhes(false); setRepresentanteSelecionado(null); }}
              onSuccessSave={() => {
                  queryClient.invalidateQueries(['fechamentoComissao']);
                  queryClient.invalidateQueries(['pedidos']);
              }}
            />
          )}
        </ModalContainer>
      </div>
    </PermissionGuard>
  );
}