import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from '@/api/base44Client';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Wallet, Users, Calendar, DollarSign, FileText, Search, ArrowRight } from "lucide-react";
import PermissionGuard from "@/components/PermissionGuard";
import ModalContainer from "@/components/modals/ModalContainer";
import ComissaoDetalhes from "@/components/comissoes/ComissaoDetalhes";
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

// --- CARD DE REPRESENTANTE ---
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
  // IMPORTANTE: Garantir que esta entidade existe no banco
  const { data: controles = [] } = useQuery({ queryKey: ['comissaoControle'], queryFn: () => base44.entities.ComissaoControle.list() });

  // --- LÓGICA DE CÁLCULO ---
  const comissoesPorRepresentante = useMemo(() => {
    const [ano, mes] = mesAnoSelecionado.split('-').map(Number);
    const inicioMes = startOfMonth(new Date(ano, mes - 1));
    const fimMes = endOfMonth(new Date(ano, mes - 1));
    
    // Filtra controles deste mês
    const controlesDoMes = controles.filter(c => c.referencia === mesAnoSelecionado);

    // 1. Filtra Pedidos Elegíveis (Pagos no período OU Antecipados)
    const pedidosElegiveis = pedidos.filter(p => {
        // Se já tem comissão paga, verificamos se pertence a ESTE fechamento específico
        if (p.comissao_paga === true) {
            // Se o pedido foi marcado como pago neste mês/ano, ele DEVE aparecer para consulta
            return p.comissao_referencia_paga === mesAnoSelecionado;
        }
        
        // Se não está pago, ignora
        if (p.status !== 'pago') return false;

        // Verifica data do pagamento (regra padrão)
        const dataPagamento = p.data_pagamento ? new Date(p.data_pagamento) : null;
        if (!dataPagamento) return false;
        
        return dataPagamento >= inicioMes && dataPagamento <= fimMes;
    });

    // 2. Agrupamento
    const agrupado = {};
    
    pedidosElegiveis.forEach(pedido => {
      const repCodigo = pedido.representante_codigo;
      if (!repCodigo) return;

      if (!agrupado[repCodigo]) {
        const repOriginal = representantes.find(r => r.codigo === repCodigo);
        const controle = controlesDoMes.find(c => c.representante_codigo === repCodigo);

        agrupado[repCodigo] = {
          // Normaliza os dados para o componente filho não se perder
          codigo: repCodigo,
          nome: repOriginal?.nome || pedido.representante_nome || 'Desconhecido',
          chave_pix: repOriginal?.chave_pix || '', // Garante que a chave PIX venha do cadastro original
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

      const valorPedido = parseFloat(pedido.valor_pedido) || 0;
      
      // Define a %: 1º Verifica se tem ajuste salvo, 2º Usa a do pedido, 3º Usa a padrão do Rep
      let percentual = pedido.porcentagem_comissao || agrupado[repCodigo].porcentagem_padrao;
      
      // Sobrescreve com o que foi salvo no rascunho, se houver
      const ajusteSalvo = agrupado[repCodigo].pedidos_ajustados.find(a => a.pedido_id === pedido.id);
      if (ajusteSalvo) {
          percentual = ajusteSalvo.percentual;
      }

      const valorComissao = (valorPedido * percentual) / 100;

      agrupado[repCodigo].pedidos.push({
        ...pedido,
        percentualComissao: percentual,
        valorComissao
      });
      
      agrupado[repCodigo].totalVendas += valorPedido;
      agrupado[repCodigo].totalComissoes += valorComissao;
    });

    // Calcula saldo final
    Object.values(agrupado).forEach(rep => {
      rep.saldoAPagar = rep.totalComissoes - rep.vales - rep.outrosDescontos;
    });

    return Object.values(agrupado);
  }, [pedidos, mesAnoSelecionado, representantes, controles]);

  const mesesDisponiveis = useMemo(() => {
    const meses = [];
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
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Comissões</h1>
            <p className="text-slate-500">Fechamento mensal e gestão de pagamentos</p>
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

        {/* CARDS TOTAIS */}
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

        {/* LISTA */}
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2"><Users className="w-5 h-5"/> Por Representante</h2>
                <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input placeholder="Buscar representante..." value={buscaRepresentante} onChange={e => setBuscaRepresentante(e.target.value)} className="pl-9 bg-white" />
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

        {/* MODAL DETALHES - IMPORTANTE: A KEY FORÇA O REACT A RECARREGAR O MODAL QUANDO MUDA O REP */}
        <ModalContainer
          open={showDetalhes}
          onClose={() => { setShowDetalhes(false); setRepresentanteSelecionado(null); }}
          title={`Detalhes - ${representanteSelecionado?.nome || ''}`}
          description={`Fechamento de ${mesesDisponiveis.find(m => m.value === mesAnoSelecionado)?.label}`}
          size="xl"
        >
          {representanteSelecionado && (
            <ComissaoDetalhes 
              key={representanteSelecionado.codigo} // <--- ESTA É A CORREÇÃO DE OURO PARA O ERRO DE NÃO ATUALIZAR
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