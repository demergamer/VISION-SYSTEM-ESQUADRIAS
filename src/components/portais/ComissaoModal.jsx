import React, { useState, useMemo, useEffect } from 'react';
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
      // Se for dia 10 ou menos, mostra o mês anterior por padrão
      if (hoje.getDate() <= 10) {
          return format(subMonths(hoje, 1), 'yyyy-MM');
      }
      return format(hoje, 'yyyy-MM');
  });

  const { data: pedidos = [], isLoading: loadingPedidos } = useQuery({ queryKey: ['pedidos_portal_comissao'], queryFn: () => base44.entities.Pedido.list(), enabled: open });
  const { data: controles = [], isLoading: loadingControles } = useQuery({ queryKey: ['controles_portal_comissao'], queryFn: () => base44.entities.ComissaoControle.list(), enabled: open });

  const dadosComissao = useMemo(() => {
    if (!representante || !pedidos.length) return null;
    const [ano, mes] = mesAno.split('-').map(Number);
    const inicioMes = startOfMonth(new Date(ano, mes - 1));
    const fimMes = endOfMonth(new Date(ano, mes - 1));

    const mapaPedidoParaMes = {};
    controles.forEach(c => {
        if (c.status === 'aberto' && c.referencia !== mesAno && c.representante_codigo === representante.codigo) {
            c.pedidos_ajustados?.forEach(p => mapaPedidoParaMes[String(p.pedido_id)] = c.referencia);
        }
    });

    const meuControleAtual = controles.find(c => c.referencia === mesAno && c.representante_codigo === representante.codigo);

    const meusPedidos = pedidos.filter(p => {
        if (String(p.representante_codigo) !== String(representante.codigo)) return false;
        
        const idStr = String(p.id);

        // Se já pago definitivo
        if (p.comissao_paga === true) return p.comissao_referencia_paga === mesAno;
        
        // Se não pago
        if (p.status !== 'pago') return false;

        // Regra do Imã
        if (mapaPedidoParaMes[idStr]) return mapaPedidoParaMes[idStr] === mesAno;

        // Regra da Gravidade
        const dataRef = p.data_referencia_comissao ? new Date(p.data_referencia_comissao) : (p.data_pagamento ? new Date(p.data_pagamento) : null);
        if (!dataRef) return false;
        
        return dataRef >= inicioMes && dataRef <= fimMes;
    });

    const dadosFinais = {
        codigo: representante.codigo, nome: representante.nome, chave_pix: representante.chave_pix, porcentagem_padrao: representante.porcentagem_comissao || 5,
        pedidos: [],
        vales: meuControleAtual ? meuControleAtual.vales : 0, outrosDescontos: meuControleAtual ? meuControleAtual.outros_descontos : 0, observacoes: meuControleAtual ? meuControleAtual.observacao : '',
        status: meuControleAtual ? meuControleAtual.status : 'aberto', controleId: meuControleAtual?.id
    };

    meusPedidos.forEach(pedido => {
        let percentual = pedido.porcentagem_comissao || dadosFinais.porcentagem_padrao;
        
        if (meuControleAtual?.pedidos_ajustados) {
            const ajuste = meuControleAtual.pedidos_ajustados.find(a => String(a.pedido_id) === String(pedido.id));
            if (ajuste) percentual = ajuste.percentual;
        }

        const valorBase = parseFloat(pedido.total_pago) || 0;
        const valorComissao = (valorBase * percentual) / 100;

        dadosFinais.pedidos.push({
            ...pedido,
            valorBaseComissao: valorBase,
            percentualComissao: percentual,
            valorComissao: valorComissao
        });
    });

    return dadosFinais;

  }, [pedidos, controles, mesAno, representante]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[95vh] p-0 flex flex-col bg-[#F8FAFC]">
        <DialogHeader className="px-6 py-4 border-b bg-white">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-800">📊 Minhas Comissões</DialogTitle>
          <DialogDescription>Histórico e previsões de pagamentos.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-6">
            {(loadingPedidos || loadingControles) ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500"><Loader2 className="w-10 h-10 animate-spin mb-2 text-indigo-600" /><p>Carregando dados financeiros...</p></div>
            ) : !representante ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 bg-amber-50 rounded-xl border border-amber-200 m-4 p-8"><AlertCircle className="w-10 h-10 mb-2 text-amber-600" /><p>Erro: Dados do representante não identificados.</p></div>
            ) : (
                <ComissaoDetalhes 
                    key={mesAno} 
                    representante={dadosComissao} mesAno={mesAno} pedidosTodos={[]} controles={null} onClose={onClose}
                    isPortal={true} onChangeMonth={(novoMes) => setMesAno(novoMes)} 
                />
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}