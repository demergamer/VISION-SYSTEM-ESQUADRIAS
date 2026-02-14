import React, { useState, useMemo, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Save, Lock, Trash2, Plus, Search, Loader2 } from "lucide-react";
import { startOfMonth, endOfMonth } from 'date-fns';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import ModalContainer from "@/components/modals/ModalContainer";

export default function ComissaoDetalhes({ representante, mesAno, onClose, onSuccessSave }) {
  // Estados principais
  const [pedidosDaComissao, setPedidosDaComissao] = useState([]); 
  const [loading, setLoading] = useState(true);
  
  // Estados do Fechamento
  const [controleId, setControleId] = useState(null); 
  const [statusFechamento, setStatusFechamento] = useState('aberto'); 
  const [vales, setVales] = useState(0);
  const [outrosDescontos, setOutrosDescontos] = useState(0);
  const [observacoes, setObservacoes] = useState('');

  // Modal Adicionar
  const [showAddModal, setShowAddModal] = useState(false);
  const [pedidosDisponiveis, setPedidosDisponiveis] = useState([]);
  const [buscaPedido, setBuscaPedido] = useState('');

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  // --- 1. FUNÇÃO DE NORMALIZAÇÃO (O SEGREDO DA CORREÇÃO) ---
  // Esta função sabe ler tanto o Pedido original quanto o Snapshot do Fechamento
  const prepararPedidoParaTela = (p, origem = 'auto') => {
      // 1. Tenta pegar o valor pago. 
      // Se vier do Banco (Pedido), é 'total_pago'. 
      // Se vier do Snapshot (Fechamento), foi salvo como 'valor_pedido'.
      // Fallback para 'valor_pedido' do banco se total_pago for zero.
      const valorBaseRaw = p.total_pago || p.valor_pedido || 0;
      
      // 2. Tenta pegar o percentual.
      // Banco: 'porcentagem_comissao'. Snapshot: 'percentual_comissao'.
      const percentualRaw = p.porcentagem_comissao ?? p.percentual_comissao ?? representante.porcentagem_padrao ?? 5;

      // 3. Tenta pegar o valor da comissão já calculado (snapshot) ou calcula agora
      const valorComissaoCalculado = (parseFloat(valorBaseRaw) * parseFloat(percentualRaw)) / 100;
      const valorComissaoFinal = p.valor_comissao ?? valorComissaoCalculado;

      return {
          ...p,
          // Normalizamos para uso interno na tela
          id: p.id || p.pedido_id, // Snapshot usa pedido_id, Banco usa id
          numero_pedido: p.numero_pedido,
          cliente_nome: p.cliente_nome,
          data_pagamento: p.data_pagamento,
          valorBase: parseFloat(valorBaseRaw),
          percentual: parseFloat(percentualRaw),
          valorComissao: parseFloat(valorComissaoFinal),
          origem_dado: origem // apenas para debug se precisar
      };
  };

  // --- 2. CARREGAMENTO ---
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
           // --- MODO EDIÇÃO (Lê do Snapshot salvo) ---
           setControleId(fechamentoAtual.id);
           setStatusFechamento(fechamentoAtual.status);
           setVales(fechamentoAtual.vales_adiantamentos || 0);
           setOutrosDescontos(fechamentoAtual.outros_descontos || 0);
           setObservacoes(fechamentoAtual.observacoes || '');

           // Se tem detalhes salvos (snapshot), usa eles pois são a verdade absoluta do fechamento
           if (fechamentoAtual.pedidos_detalhes && fechamentoAtual.pedidos_detalhes.length > 0) {
               console.log("Carregando do Snapshot:", fechamentoAtual.pedidos_detalhes);
               setPedidosDaComissao(fechamentoAtual.pedidos_detalhes.map(p => prepararPedidoParaTela(p, 'snapshot')));
           } else {
               // Fallback: Se o fechamento existe mas o snapshot está vazio (ex: migração), busca pelo ID
               const pedidosVinculados = await base44.entities.Pedido.list({
                  filters: { comissao_fechamento_id: fechamentoAtual.id }
               });
               setPedidosDaComissao(pedidosVinculados.map(p => prepararPedidoParaTela(p, 'banco_vinculado')));
           }

        } else {
           // --- MODO CRIAÇÃO (Busca Pedidos Soltos) ---
           setControleId(null);
           setStatusFechamento('aberto');
           setVales(representante.vales || 0);
           
           const [ano, mes] = mesAno.split('-').map(Number);
           const inicio = startOfMonth(new Date(ano, mes - 1)).toISOString();
           const fim = endOfMonth(new Date(ano, mes - 1)).toISOString();

           // Busca pedidos pagos deste representante
           const todosPedidos = await base44.entities.Pedido.list({ 
               filters: { representante_codigo: representante.codigo, status: 'pago' } 
           });
           
           // Filtra: Data bate? Sem dono?
           const pedidosDoMes = todosPedidos.filter(p => {
              if (p.comissao_fechamento_id) return false; // Já tem dono
              if (p.comissao_paga) return false; // Já pago
              
              const dataRef = p.data_referencia_comissao || p.data_pagamento;
              return dataRef >= inicio && dataRef <= fim;
           });

           console.log("Pedidos Soltos Encontrados:", pedidosDoMes);
           setPedidosDaComissao(pedidosDoMes.map(p => prepararPedidoParaTela(p, 'banco_solto')));
        }
      } catch (err) {
        console.error(err);
        toast.error("Erro ao carregar dados.");
      } finally {
        setLoading(false);
      }
    };
    carregar();
  }, [representante, mesAno]);

  // --- 3. CÁLCULOS ---
  const totais = useMemo(() => {
    const vendas = pedidosDaComissao.reduce((acc, p) => acc + (p.valorBase || 0), 0);
    const comissaoBruta = pedidosDaComissao.reduce((acc, p) => acc + (p.valorComissao || 0), 0);
    const liquido = comissaoBruta - parseFloat(vales || 0) - parseFloat(outrosDescontos || 0);
    return { vendas, comissaoBruta, liquido };
  }, [pedidosDaComissao, vales, outrosDescontos]);

  // --- 4. AÇÕES LOCAIS ---
  const handleUpdatePercentual = (id, novoPct) => {
    if (statusFechamento === 'fechado') return;
    setPedidosDaComissao(prev => prev.map(p => 
       p.id === id ? { ...p, percentual: novoPct, valorComissao: (p.valorBase * novoPct) / 100 } : p
    ));
  };

  const handleRemoverPedido = (id) => {
    if (statusFechamento === 'fechado') return;
    setPedidosDaComissao(prev => prev.filter(p => p.id !== id));
  };

  // --- 5. SALVAR RASCUNHO/FINALIZAR ---
  const handleSave = async (isFinalizing = false) => {
    setLoading(true);
    try {
        // A. Prepara o Snapshot (Mapeando para o Schema FechamentoComissao)
        const snapshotParaSalvar = pedidosDaComissao.map(p => ({
            pedido_id: String(p.id),
            numero_pedido: p.numero_pedido,
            cliente_nome: p.cliente_nome,
            data_pagamento: p.data_pagamento,
            valor_pedido: parseFloat(p.valorBase), // Aqui salvamos o valor base usado (total_pago)
            percentual_comissao: parseFloat(p.percentual),
            valor_comissao: parseFloat(p.valorComissao)
        }));

        const payloadFechamento = {
            mes_ano: mesAno,
            representante_codigo: String(representante.codigo),
            representante_nome: representante.nome,
            representante_chave_pix: representante.chave_pix || '',
            status: isFinalizing ? 'fechado' : 'aberto',
            vales_adiantamentos: parseFloat(vales),
            outros_descontos: parseFloat(outrosDescontos),
            observacoes: observacoes,
            total_vendas: totais.vendas,
            total_comissoes_bruto: totais.comissaoBruta, // Adicionado conforme schema
            valor_liquido: totais.liquido,
            pedidos_detalhes: snapshotParaSalvar
        };

        if (isFinalizing) {
            payloadFechamento.data_fechamento = new Date().toISOString();
            payloadFechamento.fechado_por = 'sistema'; // Ou email do usuario logado
        }

        let currentId = controleId;
        if (currentId) {
            await base44.entities.FechamentoComissao.update(currentId, payloadFechamento);
        } else {
            const res = await base44.entities.FechamentoComissao.create(payloadFechamento);
            currentId = res.id;
            setControleId(res.id);
        }

        // B. VINCULAÇÃO NOS PEDIDOS (Mapeando para o Schema Pedido)
        
        // 1. Solta os removidos
        const pedidosNoBanco = await base44.entities.Pedido.list({ filters: { comissao_fechamento_id: currentId } });
        const idsNaTela = new Set(pedidosDaComissao.map(p => String(p.id)));
        const pedidosParaSoltar = pedidosNoBanco.filter(p => !idsNaTela.has(String(p.id)));
        
        await Promise.all(pedidosParaSoltar.map(p => 
            base44.entities.Pedido.update(p.id, { comissao_fechamento_id: null, comissao_mes_ano_pago: null, comissao_paga: false })
        ));

        // 2. Vincula os atuais
        await Promise.all(pedidosDaComissao.map(p => 
            base44.entities.Pedido.update(p.id, {
                comissao_fechamento_id: currentId,
                comissao_mes_ano_pago: mesAno,
                comissao_paga: isFinalizing,
                porcentagem_comissao: parseFloat(p.percentual) // Atualiza a % no pedido original também
            })
        ));

        // C. GERAÇÃO DE CONTA A PAGAR (Se Finalizar)
        if (isFinalizing) {
            const contaPagar = await base44.entities.ContaPagar.create({
                fornecedor_codigo: representante.codigo,
                fornecedor_nome: representante.nome,
                descricao: `Comissão Ref: ${mesAno} - ${representante.nome}`,
                valor: parseFloat(totais.liquido),
                data_vencimento: new Date().toISOString(),
                status: 'pendente',
                categoria_financeira: 'comissoes',
                tipo_lancamento: 'unica',
                observacao: `Fechamento #${currentId}. PIX: ${representante.chave_pix}`,
                origem_id: currentId,
                origem_tipo: 'fechamento_comissao'
            });
            
            await base44.entities.FechamentoComissao.update(currentId, { pagamento_id: contaPagar.id });
            setStatusFechamento('fechado');
            toast.success("Finalizado e Conta a Pagar gerada!");
        } else {
            toast.success("Rascunho salvo!");
        }
        
        if (onSuccessSave) onSuccessSave();

    } catch (error) {
        console.error(error);
        toast.error("Erro ao salvar.");
    } finally {
        setLoading(false);
    }
  };

  // --- 6. ADICIONAR PEDIDO ---
  const carregarParaAdicionar = async () => {
      const todos = await base44.entities.Pedido.list({ filters: { representante_codigo: representante.codigo, status: 'pago' } });
      const disponiveis = todos.filter(p => 
          !p.comissao_fechamento_id && // Sem dono
          !p.comissao_paga && 
          !pedidosDaComissao.some(pc => pc.id === p.id) 
      );
      setPedidosDisponiveis(disponiveis);
      setShowAddModal(true);
  };

  const adicionarManual = (pedido) => {
      setPedidosDaComissao(prev => [...prev, prepararPedidoParaTela(pedido, 'manual')]);
      setShowAddModal(false);
      toast.success("Pedido adicionado.");
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

       <div className="border rounded-md overflow-hidden bg-white">
          <Table>
              <TableHeader className="bg-slate-100">
                  <TableRow>
                      <TableHead>Pedido</TableHead>
                      <TableHead>Data Pgto</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Base Calc.</TableHead>
                      <TableHead>%</TableHead>
                      <TableHead className="text-right">Comissão</TableHead>
                      <TableHead></TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                  {pedidosDaComissao.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center text-slate-400 py-8">Nenhum pedido vinculado.</TableCell></TableRow> :
                  pedidosDaComissao.map(p => (
                      <TableRow key={p.id}>
                          <TableCell className="font-bold">#{p.numero_pedido}</TableCell>
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
               <Button variant="destructive" onClick={() => alert('Função reabrir deve ser implementada')}>Reabrir</Button>
           )}
       </div>
       
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
                               <p className="text-xs text-slate-500">{p.data_pagamento ? new Date(p.data_pagamento).toLocaleDateString() : 'Sem data'}</p>
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