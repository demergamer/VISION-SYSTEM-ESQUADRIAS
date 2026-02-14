import React, { useState, useMemo, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Save, Lock, Trash2, Plus, Search, FileText, Loader2, ArrowLeftRight, RotateCcw } from "lucide-react";
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import ModalContainer from "@/components/modals/ModalContainer";

export default function ComissaoDetalhes({ representante, mesAno, onClose, onSuccessSave }) {
  // Estados principais
  const [pedidosDaComissao, setPedidosDaComissao] = useState([]); // Lista principal da tela
  const [loading, setLoading] = useState(true);
  
  // Estados do Fechamento
  const [controleId, setControleId] = useState(null); // ID do FechamentoComissao
  const [statusFechamento, setStatusFechamento] = useState('aberto'); // aberto | fechado
  const [vales, setVales] = useState(0);
  const [outrosDescontos, setOutrosDescontos] = useState(0);
  const [observacoes, setObservacoes] = useState('');

  // Modal Adicionar
  const [showAddModal, setShowAddModal] = useState(false);
  const [pedidosDisponiveis, setPedidosDisponiveis] = useState([]);
  const [buscaPedido, setBuscaPedido] = useState('');

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  // --- 1. CARREGAMENTO INTELIGENTE ---
  useEffect(() => {
    const carregar = async () => {
      setLoading(true);
      try {
        // A. Verifica se JÁ EXISTE um fechamento (Rascunho ou Fechado)
        const fechamentos = await base44.entities.FechamentoComissao.list({
           filters: { representante_codigo: representante.codigo, mes_ano: mesAno }
        });
        const fechamentoAtual = fechamentos?.[0];

        if (fechamentoAtual) {
           // MODO EDIÇÃO: Carrega o que está salvo no banco
           setControleId(fechamentoAtual.id);
           setStatusFechamento(fechamentoAtual.status);
           setVales(fechamentoAtual.vales_adiantamentos || 0);
           setOutrosDescontos(fechamentoAtual.outros_descontos || 0);
           setObservacoes(fechamentoAtual.observacoes || '');

           // Busca os pedidos que estão VINCULADOS a este ID (AQUI ESTÁ A CORREÇÃO DE VISUALIZAÇÃO)
           const pedidosVinculados = await base44.entities.Pedido.list({
              filters: { comissao_fechamento_id: fechamentoAtual.id }
           });
           
           setPedidosDaComissao(pedidosVinculados.map(prepararPedidoParaTela));

        } else {
           // MODO CRIAÇÃO: Busca pedidos soltos do mês
           setControleId(null);
           setStatusFechamento('aberto');
           setVales(representante.vales || 0);
           
           const [ano, mes] = mesAno.split('-').map(Number);
           const inicio = startOfMonth(new Date(ano, mes - 1)).toISOString();
           const fim = endOfMonth(new Date(ano, mes - 1)).toISOString();

           const todosPedidos = await base44.entities.Pedido.list({ filters: { representante_codigo: representante.codigo, status: 'pago' } });
           
           const pedidosDoMes = todosPedidos.filter(p => {
              if (p.comissao_fechamento_id) return false; // Já tem dono, ignora
              const dataRef = p.data_referencia_comissao || p.data_pagamento;
              return dataRef >= inicio && dataRef <= fim;
           });

           setPedidosDaComissao(pedidosDoMes.map(prepararPedidoParaTela));
        }
      } catch (err) {
        console.error(err);
        toast.error("Erro ao carregar.");
      } finally {
        setLoading(false);
      }
    };
    carregar();
  }, [representante, mesAno]);

  const prepararPedidoParaTela = (p) => ({
      ...p,
      valorBase: parseFloat(p.total_pago || 0),
      percentual: p.porcentagem_comissao || representante.porcentagem_padrao || 5,
      // Se já estava salvo com valor fixo no banco, considere recalcular ou usar salvo se tiver snapshots
      // Aqui vamos recalcular dinamicamente para garantir consistência
      valorComissao: (parseFloat(p.total_pago || 0) * (p.porcentagem_comissao || representante.porcentagem_padrao || 5)) / 100
  });

  // --- 2. CÁLCULOS ---
  const totais = useMemo(() => {
    const vendas = pedidosDaComissao.reduce((acc, p) => acc + p.valorBase, 0);
    const comissaoBruta = pedidosDaComissao.reduce((acc, p) => acc + p.valorComissao, 0);
    const liquido = comissaoBruta - parseFloat(vales || 0) - parseFloat(outrosDescontos || 0);
    return { vendas, comissaoBruta, liquido };
  }, [pedidosDaComissao, vales, outrosDescontos]);

  // --- 3. AÇÕES LOCAIS ---
  const handleUpdatePercentual = (id, novoPct) => {
    if (statusFechamento === 'fechado') return;
    setPedidosDaComissao(prev => prev.map(p => 
       p.id === id ? { ...p, percentual: novoPct, valorComissao: (p.valorBase * novoPct) / 100 } : p
    ));
  };

  const handleRemoverPedido = (id) => {
    if (statusFechamento === 'fechado') return;
    // Apenas remove visualmente. A persistência acontece no Salvar.
    setPedidosDaComissao(prev => prev.filter(p => p.id !== id));
  };

  // --- 4. SALVAR RASCUNHO (A MÁGICA DA PERSISTÊNCIA) ---
  const handleSave = async (isFinalizing = false) => {
    setLoading(true);
    try {
        // A. Cria/Atualiza o Fechamento
        const payloadFechamento = {
            mes_ano: mesAno,
            representante_codigo: String(representante.codigo),
            representante_nome: representante.nome,
            status: isFinalizing ? 'fechado' : 'aberto', // Rascunho
            vales_adiantamentos: parseFloat(vales),
            outros_descontos: parseFloat(outrosDescontos),
            observacoes: observacoes,
            total_vendas: totais.vendas,
            valor_liquido: totais.liquido,
            // Importante: Snapshot para histórico
            pedidos_detalhes: pedidosDaComissao.map(p => ({
                pedido_id: p.id,
                numero_pedido: p.numero_pedido,
                valor_comissao: p.valorComissao
            }))
        };

        let currentId = controleId;
        if (currentId) {
            await base44.entities.FechamentoComissao.update(currentId, payloadFechamento);
        } else {
            const res = await base44.entities.FechamentoComissao.create(payloadFechamento);
            currentId = res.id;
            setControleId(res.id);
        }

        // B. ATUALIZAÇÃO DOS PEDIDOS (VÍNCULO NO BANCO)
        
        // 1. "Soltar" pedidos que foram removidos da tela (estavam vinculados a este ID, mas não estão mais na lista local)
        // Isso resolve o problema de remover um pedido antecipado e ele continuar preso.
        const pedidosNoBanco = await base44.entities.Pedido.list({ filters: { comissao_fechamento_id: currentId } });
        const idsNaTela = new Set(pedidosDaComissao.map(p => String(p.id)));
        
        const pedidosParaSoltar = pedidosNoBanco.filter(p => !idsNaTela.has(String(p.id)));
        await Promise.all(pedidosParaSoltar.map(p => 
            base44.entities.Pedido.update(p.id, { comissao_fechamento_id: null, comissao_mes_ano_pago: null })
        ));

        // 2. "Vincular" pedidos que estão na tela
        // Isso resolve o problema de antecipação: força o pedido a pertencer a este fechamento
        await Promise.all(pedidosDaComissao.map(p => 
            base44.entities.Pedido.update(p.id, {
                comissao_fechamento_id: currentId,
                comissao_mes_ano_pago: mesAno, // Força a data visual
                comissao_paga: isFinalizing, // Se finalizando, marca pago. Se rascunho, FALSE.
                porcentagem_comissao: parseFloat(p.percentual) // Salva a % editada no pedido também
            })
        ));

        if (isFinalizing) {
             // Lógica de Conta a Pagar aqui (omitida para brevidade, igual anterior)
             toast.success("Comissão Finalizada!");
             setStatusFechamento('fechado');
        } else {
             toast.success("Rascunho Salvo! Pedidos vinculados.");
        }
        
        if (onSuccessSave) onSuccessSave();

    } catch (error) {
        console.error(error);
        toast.error("Erro ao salvar.");
    } finally {
        setLoading(false);
    }
  };

  // --- 5. ADICIONAR PEDIDO (ANTECIPAÇÃO) ---
  const carregarParaAdicionar = async () => {
      // Busca TODOS os pedidos pagos do representante que NÃO têm comissão paga e NÃO têm fechamento ID
      const todos = await base44.entities.Pedido.list({ filters: { representante_codigo: representante.codigo, status: 'pago' } });
      const disponiveis = todos.filter(p => 
          !p.comissao_fechamento_id && // Sem dono
          !p.comissao_paga && 
          !pedidosDaComissao.some(pc => pc.id === p.id) // Não está na tela
      );
      setPedidosDisponiveis(disponiveis);
      setShowAddModal(true);
  };

  const adicionarManual = (pedido) => {
      setPedidosDaComissao(prev => [...prev, prepararPedidoParaTela(pedido)]);
      setShowAddModal(false);
      toast.success("Pedido adicionado à lista. Clique em SALVAR para confirmar.");
  };

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center bg-slate-50 p-4 rounded-lg border">
           <div className="text-sm">
               Status: <Badge className={statusFechamento === 'fechado' ? 'bg-emerald-600' : 'bg-amber-500'}>{statusFechamento.toUpperCase()}</Badge>
           </div>
           {statusFechamento !== 'fechado' && (
               <Button variant="outline" size="sm" onClick={carregarParaAdicionar}><Plus className="w-4 h-4 mr-2"/> Buscar Pedidos (Antecipar)</Button>
           )}
       </div>

       <div className="border rounded-md overflow-hidden">
          <Table>
              <TableHeader className="bg-slate-100">
                  <TableRow>
                      <TableHead>Pedido</TableHead>
                      <TableHead>Data Pgto</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>%</TableHead>
                      <TableHead className="text-right">Comissão</TableHead>
                      <TableHead></TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                  {pedidosDaComissao.map(p => (
                      <TableRow key={p.id}>
                          <TableCell className="font-bold">{p.numero_pedido}</TableCell>
                          <TableCell>{p.data_pagamento ? new Date(p.data_pagamento).toLocaleDateString() : '-'}</TableCell>
                          <TableCell className="text-xs">{p.cliente_nome}</TableCell>
                          <TableCell>{formatCurrency(p.valorBase)}</TableCell>
                          <TableCell>
                              <Input 
                                type="number" 
                                className="w-16 h-8" 
                                value={p.percentual} 
                                onChange={e => handleUpdatePercentual(p.id, e.target.value)}
                                disabled={statusFechamento === 'fechado'}
                              />
                          </TableCell>
                          <TableCell className="text-right font-bold text-emerald-600">{formatCurrency(p.valorComissao)}</TableCell>
                          <TableCell>
                             {statusFechamento !== 'fechado' && (
                                 <Button variant="ghost" size="sm" onClick={() => handleRemoverPedido(p.id)}><Trash2 className="w-4 h-4 text-red-500"/></Button>
                             )}
                          </TableCell>
                      </TableRow>
                  ))}
              </TableBody>
          </Table>
       </div>

       <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl">
           <div>
               <label className="text-xs font-bold text-slate-500">Vales / Adiantamentos</label>
               <Input type="number" value={vales} onChange={e => setVales(e.target.value)} disabled={statusFechamento === 'fechado'} className="bg-white"/>
           </div>
           <div className="text-right">
               <p className="text-sm font-bold text-slate-500">Total Líquido a Pagar</p>
               <p className="text-3xl font-bold text-emerald-600">{formatCurrency(totais.liquido)}</p>
           </div>
       </div>

       <div className="flex justify-end gap-2 pt-4 border-t">
           <Button variant="outline" onClick={onClose}>Fechar</Button>
           {statusFechamento !== 'fechado' ? (
               <>
                   <Button onClick={() => handleSave(false)} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                       {loading ? <Loader2 className="animate-spin w-4 h-4"/> : <Save className="w-4 h-4 mr-2"/>} Salvar Rascunho
                   </Button>
                   <Button onClick={() => handleSave(true)} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
                       <Lock className="w-4 h-4 mr-2"/> Finalizar e Pagar
                   </Button>
               </>
           ) : (
               <Button variant="destructive" onClick={() => { /* Lógica reabrir igual anterior */ }}>Reabrir</Button>
           )}
       </div>
       
       {/* Modal Adicionar Simplificado */}
       <ModalContainer open={showAddModal} onClose={() => setShowAddModal(false)} title="Adicionar Pedido">
           <div className="space-y-2">
               <Input placeholder="Buscar..." value={buscaPedido} onChange={e => setBuscaPedido(e.target.value)} />
               <div className="h-64 overflow-y-auto border rounded">
                   {pedidosDisponiveis
                     .filter(p => !buscaPedido || p.numero_pedido.includes(buscaPedido) || p.cliente_nome.toLowerCase().includes(buscaPedido.toLowerCase()))
                     .map(p => (
                       <div key={p.id} className="flex justify-between p-2 border-b hover:bg-slate-50 cursor-pointer" onClick={() => adicionarManual(p)}>
                           <div>
                               <p className="font-bold">#{p.numero_pedido} - {p.cliente_nome}</p>
                               <p className="text-xs text-slate-500">{new Date(p.data_pagamento).toLocaleDateString()}</p>
                           </div>
                           <p className="font-bold text-emerald-600">{formatCurrency(p.total_pago)}</p>
                       </div>
                   ))}
               </div>
           </div>
       </ModalContainer>
    </div>
  );
}