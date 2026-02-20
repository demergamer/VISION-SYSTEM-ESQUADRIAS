import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { base44 } from '@/api/base44Client';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button"; 
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Wallet, Users, Calendar, DollarSign, FileText, Search, ArrowRight, Download, Loader2, Plus, CheckCircle2, Clock, Lock, RefreshCw } from "lucide-react";
import jsPDF from 'jspdf';
import PermissionGuard from "@/components/PermissionGuard";
import ModalContainer from "@/components/modals/ModalContainer";
import ComissaoDetalhes from "@/components/comissoes/ComissaoDetalhes";
import { format, addMonths } from 'date-fns';
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
  const [showModalAntecipar, setShowModalAntecipar] = useState(false);
  const [comissoesSelecionadas, setComissoesSelecionadas] = useState([]);
  const [modoVisualizacao, setModoVisualizacao] = useState('representantes'); // 'representantes' | 'competencia'
  const [sincronizando, setSincronizando] = useState(false);

  // 1. Busca Representantes
  const { data: representantes = [] } = useQuery({ 
      queryKey: ['representantes'], 
      queryFn: () => base44.entities.Representante.list() 
  });

  // 1B. Busca CommissionEntry do mês (NOVA LÓGICA)
  const { data: comissoesDoMes = [], isLoading: loadingComissoes } = useQuery({
    queryKey: ['commissionEntries', mesAnoSelecionado],
    queryFn: async () => {
      const todas = await base44.entities.CommissionEntry.list();
      return todas.filter(c => c.mes_competencia === mesAnoSelecionado);
    },
    enabled: modoVisualizacao === 'competencia'
  });

  // 1C. Verifica status do mês
  // mesFechado = true quando TODAS as entradas do mês são 'fechado' (não há mais abertas)
  const mesFechado = useMemo(() => {
    if (comissoesDoMes.length === 0) return false;
    return comissoesDoMes.every(c => c.status === 'fechado');
  }, [comissoesDoMes]);

  // Pega a data de fechamento da primeira entrada fechada encontrada
  const dataFechamento = useMemo(() => {
    const fechada = comissoesDoMes.find(c => c.status === 'fechado' && c.data_fechamento);
    return fechada?.data_fechamento || null;
  }, [comissoesDoMes]);

  // 1D. Busca comissões disponíveis para antecipação:
  //   - Outras competências com status 'aberto' (futuras ou passadas esquecidas)
  //   - A chave inclui mesAnoSelecionado para re-fetch ao trocar de mês
  const { data: comissoesOutrosMeses = [], isLoading: loadingOutrosMeses } = useQuery({
    queryKey: ['commissionEntries', 'outros', mesAnoSelecionado],
    queryFn: async () => {
      const todas = await base44.entities.CommissionEntry.list();
      // Inclui: diferente do mês atual E status aberto (passados ou futuros)
      return todas
        .filter(c => c.mes_competencia !== mesAnoSelecionado && c.status === 'aberto')
        .sort((a, b) => a.mes_competencia.localeCompare(b.mes_competencia));
    },
    enabled: showModalAntecipar,
    staleTime: 0 // Sempre busca dados frescos ao abrir o modal
  });

  // 2. Busca Fechamentos (Rascunhos ou Fechados) do Mês
  const { data: fechamentos = [], isLoading: loadingFechamentos } = useQuery({ 
      queryKey: ['fechamentoComissao', mesAnoSelecionado], 
      staleTime: 0,
      queryFn: async () => {
          const todos = await base44.entities.FechamentoComissao.list();
          return todos.filter(f => f.mes_ano === mesAnoSelecionado);
      }
  });

  // 3. Busca Pedidos "Soltos" do Mês (Para calcular previsão de quem não tem rascunho)
  // Inclui pedidos vinculados a rascunhos ABERTOS para não sumir dos cards ao salvar rascunho
  const { data: pedidosSoltos = [], isLoading: loadingPedidos } = useQuery({
      queryKey: ['pedidos', 'soltos', mesAnoSelecionado],
      staleTime: 0,
      queryFn: async () => {
          const [todosPedidos, todosFechamentos] = await Promise.all([
              base44.entities.Pedido.list(),
              base44.entities.FechamentoComissao.list(),
          ]);
          // IDs de fechamentos ABERTOS (rascunhos) do mês — pedidos vinculados a eles ainda contam como "soltos"
          const idsRascunhosAbertos = new Set(
              todosFechamentos
                  .filter(f => f.mes_ano === mesAnoSelecionado && f.status === 'aberto')
                  .map(f => f.id)
          );
          return todosPedidos.filter(p => {
             if (p.status !== 'pago') return false;
             // Considera "solto" se: não tem fechamento_id, OU está vinculado a um rascunho aberto
             const estaEmRascunhoAberto = p.comissao_fechamento_id && idsRascunhosAbertos.has(p.comissao_fechamento_id);
             if (p.comissao_fechamento_id && !estaEmRascunhoAberto) return false;
             const dataRef = p.data_referencia_comissao || p.data_pagamento;
             if (!dataRef) return false;
             return String(dataRef).substring(0, 7) === mesAnoSelecionado;
          });
      }
  });

  // --- MOTE DE CÁLCULO ---
  const dadosConsolidados = useMemo(() => {
    // Deduplicação defensiva: se o banco retornar múltiplos fechamentos para o mesmo
    // representante (ex: bug de gravação dupla), pega apenas o mais recente.
    const mapaFechamentos = {};
    fechamentos.forEach(f => {
      const cod = String(f.representante_codigo || '').trim();
      const existing = mapaFechamentos[cod];
      // Prefere o fechado sobre o rascunho; entre iguais, o mais recente (maior updated_date)
      if (!existing) {
        mapaFechamentos[cod] = f;
      } else if (f.status === 'fechado' && existing.status !== 'fechado') {
        mapaFechamentos[cod] = f;
      } else if (f.status === existing.status && f.updated_date > existing.updated_date) {
        mapaFechamentos[cod] = f;
      }
    });

    // Deduplicação dos representantes também (evita cards duplicados se a lista vier suja)
    const representantesUnicos = Array.from(
      new Map(representantes.map(r => [String(r.codigo).trim(), r])).values()
    );

    return representantesUnicos.map(rep => {
        const fechamento = mapaFechamentos[String(rep.codigo).trim()];

        // CENÁRIO A: Já tem fechamento (Rascunho ou Final) -> Usa dados do banco
        if (fechamento) {
            // Para rascunhos abertos, recalcula do snapshot se total_vendas estiver zerado
            let totalVendas = fechamento.total_vendas || 0;
            let saldoAPagar = fechamento.valor_liquido || 0;

            if (fechamento.status === 'aberto' && totalVendas === 0 && Array.isArray(fechamento.pedidos_detalhes) && fechamento.pedidos_detalhes.length > 0) {
                totalVendas = fechamento.pedidos_detalhes.reduce((acc, d) => acc + (Number(d.valor_pedido) || 0), 0);
                const totalComissaoBruta = fechamento.pedidos_detalhes.reduce((acc, d) => acc + (Number(d.valor_comissao) || 0), 0);
                saldoAPagar = totalComissaoBruta - (Number(fechamento.vales_adiantamentos) || 0) - (Number(fechamento.outros_descontos) || 0);
            }

            // Se ainda zerado (rascunho sem snapshot), cai para previsão com pedidos soltos
            if (fechamento.status === 'aberto' && totalVendas === 0) {
                const meusPedidos = pedidosSoltos.filter(p => String(p.representante_codigo) === String(rep.codigo));
                totalVendas = meusPedidos.reduce((sum, p) => sum + (parseFloat(p.total_pago) || 0), 0);
                const totalComissao = meusPedidos.reduce((sum, p) => sum + ((parseFloat(p.total_pago) || 0) * (p.porcentagem_comissao || rep.porcentagem_comissao || 5) / 100), 0);
                saldoAPagar = totalComissao - (rep.vales || 0);
            }

            return {
                ...rep,
                status: fechamento.status === 'fechado' ? 'fechado' : 'rascunho',
                totalVendas,
                saldoAPagar,
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

  // Totais Gerais (Modo Representantes)
  const totalGeral = dadosConsolidados.reduce((acc, curr) => ({
      vendas: acc.vendas + curr.totalVendas,
      pagar: acc.pagar + curr.saldoAPagar
  }), { vendas: 0, pagar: 0 });

  // Totais (Modo Competência)
  const totaisCompetencia = useMemo(() => {
    const vendas = comissoesDoMes.reduce((acc, c) => acc + (c.valor_base || 0), 0);
    const comissoes = comissoesDoMes.reduce((acc, c) => acc + (c.valor_comissao || 0), 0);
    return { vendas, comissoes };
  }, [comissoesDoMes]);

  // Postergar para o próximo mês
  const postergarMutation = useMutation({
    mutationFn: async (comissaoId) => {
      const comissao = await base44.entities.CommissionEntry.get(comissaoId);
      const proximoMes = format(addMonths(new Date(mesAnoSelecionado + '-01'), 1), 'yyyy-MM');
      const novaDataCompetencia = format(new Date(proximoMes + '-01'), 'yyyy-MM-dd');
      
      const movimentacao = {
        data: new Date().toISOString(),
        mes_origem: mesAnoSelecionado,
        mes_destino: proximoMes,
        usuario: 'admin',
        motivo: 'Postergado manualmente'
      };

      await base44.entities.CommissionEntry.update(comissaoId, {
        data_competencia: novaDataCompetencia,
        mes_competencia: proximoMes,
        movimentacoes: [...(comissao.movimentacoes || []), movimentacao]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['commissionEntries']);
      toast.success('Comissão postergada para o próximo mês!');
    }
  });

  // Antecipar comissões selecionadas
  const anteciparMutation = useMutation({
    mutationFn: async (idsComissoes) => {
      const ultimoDiaDoMes = format(new Date(mesAnoSelecionado + '-01'), 'yyyy-MM') + '-' + 
                             new Date(new Date(mesAnoSelecionado + '-01').getFullYear(), 
                                     new Date(mesAnoSelecionado + '-01').getMonth() + 1, 0).getDate();
      
      const promises = idsComissoes.map(async id => {
        const comissao = await base44.entities.CommissionEntry.get(id);
        const movimentacao = {
          data: new Date().toISOString(),
          mes_origem: comissao.mes_competencia,
          mes_destino: mesAnoSelecionado,
          usuario: 'admin',
          motivo: 'Antecipado manualmente'
        };

        return base44.entities.CommissionEntry.update(id, {
          data_competencia: ultimoDiaDoMes,
          mes_competencia: mesAnoSelecionado,
          movimentacoes: [...(comissao.movimentacoes || []), movimentacao]
        });
      });

      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['commissionEntries']);
      setShowModalAntecipar(false);
      setComissoesSelecionadas([]);
      toast.success('Comissões antecipadas com sucesso!');
    }
  });

  const handleExportarPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const mesLabel = format(new Date(mesAnoSelecionado + '-01'), 'MMMM yyyy', { locale: ptBR });
    const dataHoje = new Date().toLocaleDateString('pt-BR');

    // Cabeçalho
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório Geral de Comissões', 14, 20);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Período: ${mesLabel.toUpperCase()}`, 14, 28);
    doc.text(`Gerado em: ${dataHoje}`, 14, 34);

    // Agrupar dadosConsolidados por representante
    const linhas = dadosConsolidados.map(rep => {
      const meusPedidos = pedidosSoltos.filter(p => String(p.representante_codigo) === String(rep.codigo));
      const qtPedidos = meusPedidos.length;
      const chavePix = representantes.find(r => String(r.codigo) === String(rep.codigo))?.chave_pix || '-';
      return [
        rep.nome,
        qtPedidos,
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(rep.totalVendas),
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(rep.saldoAPagar),
        chavePix
      ];
    });

    // Linha de totais
    const totalVendas = dadosConsolidados.reduce((a, r) => a + r.totalVendas, 0);
    const totalComissoes = dadosConsolidados.reduce((a, r) => a + r.saldoAPagar, 0);
    const totalPedidos = dadosConsolidados.reduce((a, r) => {
      return a + pedidosSoltos.filter(p => String(p.representante_codigo) === String(r.codigo)).length;
    }, 0);

    // Manual table drawing using jsPDF (no autotable plugin needed)
    const cols = ['REPRESENTANTE', 'QT PEDIDOS', 'R$ VENDAS', 'COMISSÃO', 'CHAVE PIX'];
    const colWidths = [60, 25, 45, 45, 60];
    const startX = 14;
    let y = 42;
    const rowH = 8;

    // Header row
    doc.setFillColor(37, 99, 235);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    let x = startX;
    cols.forEach((col, i) => {
      doc.rect(x, y, colWidths[i], rowH, 'F');
      doc.text(col, x + 2, y + 5.5);
      x += colWidths[i];
    });
    y += rowH;

    // Data rows
    doc.setFont('helvetica', 'normal');
    linhas.forEach((row, ri) => {
      doc.setFillColor(ri % 2 === 0 ? 248 : 255, ri % 2 === 0 ? 250 : 255, ri % 2 === 0 ? 252 : 255);
      doc.setTextColor(30, 41, 59);
      x = startX;
      row.forEach((cell, i) => {
        doc.rect(x, y, colWidths[i], rowH, 'F');
        doc.text(String(cell), x + 2, y + 5.5);
        x += colWidths[i];
      });
      y += rowH;
    });

    // Footer row
    doc.setFillColor(15, 23, 42);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    const footRow = ['TOTAL GERAL', String(totalPedidos),
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalVendas),
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalComissoes),
      ''
    ];
    x = startX;
    footRow.forEach((cell, i) => {
      doc.rect(x, y, colWidths[i], rowH, 'F');
      doc.text(String(cell), x + 2, y + 5.5);
      x += colWidths[i];
    });

    const fakeAutoTable = {
      startY: 42,
      head: [['REPRESENTANTE', 'QT DE PEDIDOS', 'R$ DE VENDAS', 'COMISSÃO DAS VENDAS', 'CHAVE PIX']],
      body: linhas,
      foot: [['TOTAL GERAL', totalPedidos,
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalVendas),
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalComissoes),
        ''
      ]],
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 55 },
        1: { halign: 'center' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { cellWidth: 55 }
      }
    });

    doc.save(`comissoes-${mesAnoSelecionado}.pdf`);
  };

  const handleSincronizar = async () => {
    setSincronizando(true);
    try {
      await base44.functions.invoke('sincronizarComissoes', {});
      queryClient.invalidateQueries(['commissionEntries']);
      queryClient.invalidateQueries(['pedidos', 'soltos']);
      queryClient.invalidateQueries(['fechamentoComissao']);
      toast.success('Sincronização concluída!');
    } catch (err) {
      toast.error('Erro na sincronização: ' + (err.message || ''));
    } finally {
      setSincronizando(false);
    }
  };

  // Fechar comissão do mês
  const fecharMutation = useMutation({
    mutationFn: async () => {
      const comissoesAbertas = comissoesDoMes.filter(c => c.status === 'aberto');
      if (comissoesAbertas.length === 0) {
        throw new Error('Nenhuma comissão aberta para fechar');
      }

      const dataFechamento = new Date().toISOString();
      
      const promises = comissoesAbertas.map(c => 
        base44.entities.CommissionEntry.update(c.id, {
          status: 'fechado',
          data_fechamento: dataFechamento
        })
      );
      await Promise.all(promises);

      return { total: comissoesAbertas.length, data: dataFechamento };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries(['commissionEntries']);
      toast.success(`${result.total} comissões fechadas em ${new Date(result.data).toLocaleDateString('pt-BR')}!`);
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao fechar comissões');
    }
  });

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
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Comissões</h1>
            <p className="text-sm text-slate-500 mt-1">Gestão de comissões por representante ou competência</p>
          </div>
          <div className="flex items-center gap-3">
             <div className="bg-white rounded-xl border shadow-sm overflow-hidden flex">
                <button 
                  onClick={() => setModoVisualizacao('representantes')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    modoVisualizacao === 'representantes' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Users className="w-4 h-4 inline mr-2"/>Por Representante
                </button>
                <button 
                  onClick={() => setModoVisualizacao('competencia')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    modoVisualizacao === 'competencia' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Calendar className="w-4 h-4 inline mr-2"/>Por Competência
                </button>
             </div>
             <div className="bg-white p-2 rounded-xl border shadow-sm flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600 ml-1" />
                <select value={mesAnoSelecionado} onChange={(e) => setMesAnoSelecionado(e.target.value)} className="bg-transparent font-bold text-slate-700 outline-none uppercase">
                    {mesesDisponiveis.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
             </div>
             <Button
               variant="outline"
               onClick={handleSincronizar}
               disabled={sincronizando}
               className="gap-2 bg-white"
             >
               {sincronizando ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
               {sincronizando ? 'Sincronizando...' : 'Sincronizar'}
             </Button>
             <Button
               variant="outline"
               onClick={handleExportarPDF}
               className="gap-2 bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50"
             >
               <Download className="w-4 h-4" />
               Exportar PDF
             </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {modoVisualizacao === 'representantes' ? (
             <>
               <Card className="p-6 bg-emerald-50 border-emerald-100">
                 <p className="text-emerald-600 font-bold text-xs uppercase">Total Vendas</p>
                 <p className="text-3xl font-bold text-emerald-900">{formatCurrency(totalGeral.vendas)}</p>
               </Card>
               <Card className="p-6 bg-purple-50 border-purple-100">
                 <p className="text-purple-600 font-bold text-xs uppercase">Total a Pagar</p>
                 <p className="text-3xl font-bold text-purple-900">{formatCurrency(totalGeral.pagar)}</p>
               </Card>
             </>
           ) : (
             <>
               <Card className="p-6 bg-blue-50 border-blue-100">
                 <p className="text-blue-600 font-bold text-xs uppercase flex items-center gap-2">
                   <DollarSign className="w-4 h-4"/> Total Vendas Base
                 </p>
                 <p className="text-3xl font-bold text-blue-900 mt-1">{formatCurrency(totaisCompetencia.vendas)}</p>
               </Card>
               <Card className="p-6 bg-emerald-50 border-emerald-100">
                 <p className="text-emerald-600 font-bold text-xs uppercase flex items-center gap-2">
                   <DollarSign className="w-4 h-4"/> Total Comissões
                 </p>
                 <p className="text-3xl font-bold text-emerald-900 mt-1">{formatCurrency(totaisCompetencia.comissoes)}</p>
               </Card>
               <Card className="p-6 bg-purple-50 border-purple-100">
                 <p className="text-purple-600 font-bold text-xs uppercase flex items-center gap-2">
                   <Clock className="w-4 h-4"/> Lançamentos
                 </p>
                 <p className="text-3xl font-bold text-purple-900 mt-1">{comissoesDoMes.length}</p>
               </Card>
             </>
           )}
        </div>

        {modoVisualizacao === 'representantes' ? (
          <div className="space-y-4">
            <div className="relative w-full md:w-64"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" /><Input placeholder="Buscar representante..." value={buscaRepresentante} onChange={e => setBuscaRepresentante(e.target.value)} className="pl-9 bg-white" /></div>
            
            {loadingFechamentos || loadingPedidos ? <div className="text-center py-10"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500"/></div> : 
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {dadosConsolidados.map((rep) => (
                    <RepresentanteCard key={rep.codigo} rep={rep} onClick={() => { setRepresentanteSelecionado(rep); setShowDetalhes(true); }} />
                ))}
            </div>}
          </div>
        ) : (
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-slate-700">
                  Comissões {mesFechado ? 'Pagas' : 'a Pagar'} em {format(new Date(mesAnoSelecionado + '-01'), 'MMMM', { locale: ptBR }).toUpperCase()}
                </h2>
                {mesFechado && dataFechamento && (
                  <Badge className="bg-emerald-600 text-white flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3"/> Fechado em {new Date(dataFechamento).toLocaleDateString('pt-BR')}
                  </Badge>
                )}
              </div>
              {!mesFechado && (
                <Button onClick={() => setShowModalAntecipar(true)} size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4"/> Adicionar/Antecipar
                </Button>
              )}
            </div>

            {loadingComissoes ? (
              <div className="text-center py-10">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500"/>
              </div>
            ) : comissoesDoMes.length === 0 ? (
              <div className="text-center py-16 text-slate-400 border border-dashed rounded-lg">
                Nenhuma comissão neste período.
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead>Venda Real</TableHead>
                      <TableHead>Pedido</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Representante</TableHead>
                      <TableHead className="text-right">Valor Base</TableHead>
                      <TableHead className="text-center">%</TableHead>
                      <TableHead className="text-right">Comissão</TableHead>
                      <TableHead className="w-[120px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comissoesDoMes.map(comissao => {
                      const isFechado = comissao.status === 'fechado';
                      const tooltipFechamento = isFechado && comissao.data_fechamento
                        ? `Comissão paga no fechamento de ${new Date(comissao.data_fechamento).toLocaleDateString('pt-BR')}`
                        : undefined;

                      return (
                        <TableRow
                          key={comissao.id}
                          className={isFechado ? 'bg-slate-50 opacity-80' : ''}
                          title={tooltipFechamento}
                        >
                          <TableCell className="text-sm text-slate-500">
                            {comissao.data_pagamento_real ? 
                              new Date(comissao.data_pagamento_real).toLocaleDateString('pt-BR') : '-'}
                          </TableCell>
                          <TableCell className="font-mono font-bold text-sm">
                            #{comissao.pedido_numero}
                          </TableCell>
                          <TableCell className="text-sm">{comissao.cliente_nome}</TableCell>
                          <TableCell className="text-sm text-slate-600">{comissao.representante_nome}</TableCell>
                          <TableCell className="text-right font-medium text-blue-700">
                            {formatCurrency(comissao.valor_base)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{comissao.percentual}%</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isFechado && (
                                <Lock className="w-3 h-3 text-slate-400" title={tooltipFechamento} />
                              )}
                              <span className={`font-bold ${isFechado ? 'text-slate-500' : 'text-emerald-600'}`}>
                                {formatCurrency(comissao.valor_comissao)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {isFechado ? (
                              <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-200 text-xs gap-1">
                                <CheckCircle2 className="w-3 h-3"/> Pago
                              </Badge>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => postergarMutation.mutate(comissao.id)}
                                disabled={postergarMutation.isPending}
                                className="gap-1 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                              >
                                <ArrowRight className="w-4 h-4"/> Próximo Mês
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {comissoesDoMes.length > 0 && (
              <div className="mt-6 pt-6 border-t flex justify-between items-center">
                <div className="space-y-1">
                  <p className="text-sm text-slate-500">
                    {mesFechado ? 'Total pago neste mês:' : 'Total a pagar neste mês:'}
                  </p>
                  <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totaisCompetencia.comissoes)}</p>
                </div>
                {!mesFechado ? (
                  <Button 
                    onClick={() => {
                      const comissoesAbertas = comissoesDoMes.filter(c => c.status === 'aberto');
                      if (comissoesAbertas.length === 0) {
                        toast.error('Nenhuma comissão aberta para fechar');
                        return;
                      }
                      if (confirm(`Confirma o fechamento de ${comissoesAbertas.length} comissões?\n\nApós o fechamento, não será possível mover estas comissões para outros meses.`)) {
                        fecharMutation.mutate();
                      }
                    }}
                    disabled={fecharMutation.isPending}
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                  >
                    {fecharMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin"/> : <CheckCircle2 className="w-4 h-4"/>}
                    Fechar Comissão de {format(new Date(mesAnoSelecionado + '-01'), 'MMMM', { locale: ptBR })}
                  </Button>
                ) : (
                  <Badge className="bg-slate-100 text-slate-600 px-4 py-2 text-sm">
                    🔒 Período Bloqueado para Edição
                  </Badge>
                )}
              </div>
            )}
          </Card>
        )}

        <ModalContainer open={showDetalhes} onClose={() => { setShowDetalhes(false); setRepresentanteSelecionado(null); }} title={`Detalhes - ${representanteSelecionado?.nome}`} size="xl">
          {representanteSelecionado && (
            <ComissaoDetalhes 
              key={`${representanteSelecionado.codigo}-${mesAnoSelecionado}`}
              representante={representanteSelecionado}
              mesAno={mesAnoSelecionado}
              onClose={() => { setShowDetalhes(false); setRepresentanteSelecionado(null); }}
              onSuccessSave={() => {
                  queryClient.invalidateQueries(['fechamentoComissao']);
                  queryClient.invalidateQueries(['pedidos']);
                  queryClient.invalidateQueries(['commissionEntries']);
                  // Invalida a query de pedidos soltos do mês para atualizar cards de totais
                  queryClient.invalidateQueries(['pedidos', 'soltos']);
              }}
            />
          )}
        </ModalContainer>

        <ModalContainer 
          open={showModalAntecipar} 
          onClose={() => {
            setShowModalAntecipar(false);
            setComissoesSelecionadas([]);
          }}
          title="Comissões de Outros Períodos"
          description="Selecione as comissões que deseja trazer para o mês atual"
          size="xl"
        >
          <div className="space-y-4">
            {loadingOutrosMeses ? (
              <div className="text-center py-10">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500"/>
                <p className="text-sm text-slate-400 mt-2">Buscando comissões disponíveis...</p>
              </div>
            ) : comissoesOutrosMeses.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <p className="font-medium">Nenhuma comissão disponível em outros períodos.</p>
                <p className="text-xs mt-1">Pedidos removidos de meses fechados aparecem aqui automaticamente.</p>
              </div>
            ) : (
              <>
                <div className="border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-slate-50 sticky top-0">
                      <TableRow>
                        <TableHead className="w-[50px]"></TableHead>
                        <TableHead>Competência</TableHead>
                        <TableHead>Pedido</TableHead>
                        <TableHead>Representante</TableHead>
                        <TableHead className="text-right">Comissão</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comissoesOutrosMeses.map(comissao => (
                        <TableRow key={comissao.id} className="cursor-pointer hover:bg-slate-50"
                          onClick={() => {
                            setComissoesSelecionadas(prev => 
                              prev.includes(comissao.id) 
                                ? prev.filter(id => id !== comissao.id)
                                : [...prev, comissao.id]
                            );
                          }}
                        >
                          <TableCell>
                            <Checkbox 
                              checked={comissoesSelecionadas.includes(comissao.id)}
                              onCheckedChange={() => {}}
                            />
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-blue-100 text-blue-700">
                              {format(new Date(comissao.mes_competencia + '-01'), 'MMM/yyyy', { locale: ptBR }).toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono">#{comissao.pedido_numero}</TableCell>
                          <TableCell className="text-sm">{comissao.representante_nome}</TableCell>
                          <TableCell className="text-right font-bold text-emerald-600">
                            {formatCurrency(comissao.valor_comissao)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-between items-center pt-4 border-t">
                  <p className="text-sm text-slate-600">
                    {comissoesSelecionadas.length} comissão(ões) selecionada(s)
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => {
                      setShowModalAntecipar(false);
                      setComissoesSelecionadas([]);
                    }}>
                      Cancelar
                    </Button>
                    <Button 
                      onClick={() => anteciparMutation.mutate(comissoesSelecionadas)}
                      disabled={comissoesSelecionadas.length === 0 || anteciparMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {anteciparMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : null}
                      Trazer para {format(new Date(mesAnoSelecionado + '-01'), 'MMMM', { locale: ptBR })}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </ModalContainer>
      </div>


    </PermissionGuard>
  );
}