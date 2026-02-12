import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { Loader2, AlertCircle } from "lucide-react";
import ComissaoDetalhes from "@/components/comissoes/ComissaoDetalhes";

export default function ComissaoModal({ open, onClose, representante }) {
  // --- INICIALIZAÇÃO DE DATA (LÓGICA DIA 10) ---
  const [mesAno, setMesAno] = useState(() => {
      const hoje = new Date();
      if (hoje.getDate() <= 10) {
          return format(subMonths(hoje, 1), 'yyyy-MM');
      }
      return format(hoje, 'yyyy-MM');
  });

  // --- QUERIES CORRIGIDAS ---
  // 1. Busca Fechamento Oficial (Aberto ou Fechado)
  const { data: fechamentos = [], isLoading: loadingFechamento } = useQuery({ 
      queryKey: ['fechamento_portal', mesAno, representante?.codigo], 
      queryFn: () => base44.entities.FechamentoComissao.list({
          filters: { 
              mes_ano: mesAno,
              representante_codigo: representante?.codigo 
          }
      }), 
      enabled: open && !!representante 
  });

  // 2. Busca Pedidos (Apenas se não tiver fechamento fechado, para calcular previsão)
  const { data: pedidos = [], isLoading: loadingPedidos } = useQuery({ 
      queryKey: ['pedidos_portal', mesAno], 
      queryFn: () => base44.entities.Pedido.list(), 
      enabled: open && !!representante 
  });

  const dadosComissao = useMemo(() => {
    if (!representante) return null;

    // A. SE JÁ EXISTE FECHAMENTO (Rascunho ou Finalizado)
    // Usamos ele como fonte da verdade absoluta
    if (fechamentos && fechamentos.length > 0) {
        const fechamento = fechamentos[0];
        return {
            codigo: representante.codigo,
            nome: representante.nome,
            chave_pix: representante.chave_pix,
            porcentagem_padrao: representante.porcentagem_comissao || 5,
            
            // Dados vindos do fechamento
            id: fechamento.id,
            status: fechamento.status,
            vales: fechamento.vales_adiantamentos || 0,
            outrosDescontos: fechamento.outros_descontos || 0,
            observacoes: fechamento.observacoes || '',
            
            // Se estiver fechado, já tem o snapshot
            pedidos_detalhes: fechamento.pedidos_detalhes || [],
            
            // Totais
            totalVendas: fechamento.total_vendas,
            totalComissoes: fechamento.total_comissoes_bruto,
            saldoAPagar: fechamento.valor_liquido
        };
    }

    // B. SE NÃO EXISTE FECHAMENTO (Modo Previsão / Aberto)
    // Calculamos com base nos pedidos do mês
    const [ano, mes] = mesAno.split('-').map(Number);
    const inicioMes = startOfMonth(new Date(ano, mes - 1));
    const fimMes = endOfMonth(new Date(ano, mes - 1));

    const meusPedidos = pedidos.filter(p => {
        // Filtra meu código
        if (String(p.representante_codigo) !== String(representante.codigo)) return false;
        
        // Se já pago definitivo (mas não tem fechamento vinculado? Estranho, mas ok)
        if (p.comissao_paga === true) return p.comissao_mes_ano_pago === mesAno;
        
        // Se não pago (comissão), precisa estar pago pelo cliente
        if (p.status !== 'pago') return false;

        // Data de referência
        const dataRef = p.data_referencia_comissao ? new Date(p.data_referencia_comissao) : (p.data_pagamento ? new Date(p.data_pagamento) : null);
        if (!dataRef) return false;
        
        return dataRef >= inicioMes && dataRef <= fimMes;
    });

    // Monta estrutura "Fake" de fechamento para o componente
    const pedidosFormatados = meusPedidos.map(p => {
        const percentual = p.porcentagem_comissao || representante.porcentagem_comissao || 5;
        const valorBase = parseFloat(p.total_pago) || 0;
        return {
            ...p,
            valorBaseComissao: valorBase,
            percentualComissao: percentual,
            valorComissao: (valorBase * percentual) / 100
        };
    });

    return {
        codigo: representante.codigo,
        nome: representante.nome,
        chave_pix: representante.chave_pix,
        porcentagem_padrao: representante.porcentagem_comissao || 5,
        status: 'aberto',
        id: null,
        vales: 0,
        outrosDescontos: 0,
        observacoes: '',
        pedidos: pedidosFormatados, // Passamos como lista dinâmica
        // Totais calculados na hora
        totalVendas: pedidosFormatados.reduce((acc, p) => acc + p.valorBaseComissao, 0),
        totalComissoes: pedidosFormatados.reduce((acc, p) => acc + p.valorComissao, 0),
        saldoAPagar: pedidosFormatados.reduce((acc, p) => acc + p.valorComissao, 0)
    };

  }, [pedidos, fechamentos, mesAno, representante]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[95vh] p-0 flex flex-col bg-[#F8FAFC]">
        <DialogHeader className="px-6 py-4 border-b bg-white">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-800">📊 Minhas Comissões</DialogTitle>
          <DialogDescription>Histórico e previsões de pagamentos.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-6">
            {(loadingPedidos || loadingFechamento) ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500"><Loader2 className="w-10 h-10 animate-spin mb-2 text-indigo-600" /><p>Carregando dados financeiros...</p></div>
            ) : !representante ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 bg-amber-50 rounded-xl border border-amber-200 m-4 p-8"><AlertCircle className="w-10 h-10 mb-2 text-amber-600" /><p>Erro: Dados do representante não identificados.</p></div>
            ) : (
                <ComissaoDetalhes 
                    // KEY IMPORTANTE: Força recarregar se mudar mês ou status
                    key={`${mesAno}-${dadosComissao?.status}`}
                    representante={dadosComissao} 
                    mesAno={mesAno} 
                    pedidosTodos={pedidos} // Passa todos para o filtro interno funcionar se precisar
                    controles={null} 
                    onClose={onClose}
                    isPortal={true} 
                    onChangeMonth={(novoMes) => setMesAno(novoMes)} 
                />
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}