import React, { useState, useMemo, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Save, Lock, Trash2, Plus, Loader2, Search, ArrowLeftRight, Check } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import ModalContainer from "@/components/modals/ModalContainer";

export default function ComissaoDetalhes({ representante, mesAno, onClose, onSuccessSave }) {
  const [pedidosDaComissao, setPedidosDaComissao] = useState([]); 
  const [loading, setLoading] = useState(true);
  
  // Controle de Fechamento
  const [controleId, setControleId] = useState(null); 
  const [statusFechamento, setStatusFechamento] = useState('aberto'); 
  const [vales, setVales] = useState(0);
  const [outrosDescontos, setOutrosDescontos] = useState(0);
  const [observacoes, setObservacoes] = useState('');

  // Rastreia pedidos removidos da tela para mover ao próximo mês no save
  const [pedidosRemovidosIds, setPedidosRemovidosIds] = useState([]);

  // Adicionar Manual
  const [showAddModal, setShowAddModal] = useState(false);
  const [pedidosDisponiveis, setPedidosDisponiveis] = useState([]);
  const [buscaPedido, setBuscaPedido] = useState('');

  // Pesquisa local na tabela
  const [searchTerm, setSearchTerm] = useState('');

  // Transferir representante
  const [transferindoId, setTransferindoId] = useState(null);
  const [representantes, setRepresentantes] = useState([]);
  const [repDestino, setRepDestino] = useState('');
  const [salvandoTransfer, setSalvandoTransfer] = useState(false);
  const [moverTodos, setMoverTodos] = useState(false);

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  // --- 1. NORMALIZADOR DE DADOS ---
  const prepararPedidoParaTela = (p, origem) => {
      const valorBaseRaw = p.valor_pedido !== undefined ? p.valor_pedido : (p.total_pago || 0);
      const percentualRaw = p.percentual_comissao ?? p.porcentagem_comissao ?? representante.porcentagem_padrao ?? 5;
      const valorComissaoCalculado = (parseFloat(valorBaseRaw) * parseFloat(percentualRaw)) / 100;
      const valorComissaoFinal = p.valor_comissao !== undefined ? p.valor_comissao : valorComissaoCalculado;

      return {
          ...p,
          id: p.id || p.pedido_id,
          numero_pedido: p.numero_pedido,
          cliente_nome: p.cliente_nome,
          data_pagamento: p.data_pagamento,
          valorBase: parseFloat(valorBaseRaw),
          percentual: parseFloat(percentualRaw),
          valorComissao: parseFloat(valorComissaoFinal),
          origem_dado: origem
      };
  };

  // --- 2. CARREGAMENTO ---
  useEffect(() => {
    const carregar = async () => {
      setLoading(true);
      try {
        const todosFechamentos = await base44.entities.FechamentoComissao.list();
        const fechamentoAtual = todosFechamentos.find(f => 
          String(f.representante_codigo).trim().toUpperCase() === String(representante.codigo).trim().toUpperCase() && 
          f.mes_ano === mesAno
        );

        if (fechamentoAtual) {
           setControleId(fechamentoAtual.id);
           setStatusFechamento(fechamentoAtual.status);
           setVales(fechamentoAtual.vales_adiantamentos || 0);
           setOutrosDescontos(fechamentoAtual.outros_descontos || 0);
           setObservacoes(fechamentoAtual.observacoes || '');

           if (fechamentoAtual.pedidos_detalhes && fechamentoAtual.pedidos_detalhes.length > 0) {
               setPedidosDaComissao(fechamentoAtual.pedidos_detalhes.map(p => prepararPedidoParaTela(p, 'snapshot')));
           } else {
               const todosPedidos = await base44.entities.Pedido.list();
               const pedidosVinculados = todosPedidos.filter(p => 
                 String(p.comissao_fechamento_id) === String(fechamentoAtual.id)
               );
               setPedidosDaComissao(pedidosVinculados.map(p => prepararPedidoParaTela(p, 'vinculado')));
           }
        } else {
           setControleId(null);
           setStatusFechamento('aberto');
           setVales(representante.vales || 0);
           setOutrosDescontos(0);
           setObservacoes('');
           
           const todosPagos = await base44.entities.Pedido.list();
           const pedidosDoMes = todosPagos.filter(p => {
              if (p.status !== 'pago') return false;
              const repPedido = String(p.representante_codigo || '').trim().toUpperCase();
              const repAtual = String(representante.codigo || '').trim().toUpperCase();
              if (repPedido !== repAtual) return false;
              if (p.comissao_fechamento_id) return false;
              if (p.comissao_paga === true) return false;
              const dataRef = p.data_referencia_comissao || p.data_pagamento;
              if (!dataRef) return false;
              return String(dataRef).substring(0, 7) === mesAno;
           });

           setPedidosDaComissao(pedidosDoMes.map(p => prepararPedidoParaTela(p, 'previsao')));
        }
      } catch (err) {
        toast.error("Erro ao carregar dados. Verifique o console.");
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
  const pedidosFiltrados = useMemo(() => {
    if (!searchTerm.trim()) return pedidosDaComissao;
    const s = searchTerm.toLowerCase();
    return pedidosDaComissao.filter(p =>
      String(p.numero_pedido || '').toLowerCase().includes(s) ||
      String(p.cliente_nome || '').toLowerCase().includes(s)
    );
  }, [pedidosDaComissao, searchTerm]);

  const handleUpdatePercentual = (id, novoPct) => {
    if (statusFechamento === 'fechado') return;
    setPedidosDaComissao(prev => prev.map(p => p.id === id ? { ...p, percentual: novoPct, valorComissao: (p.valorBase * novoPct) / 100 } : p));
  };

  const handleUpdateBase = (id, novaBase) => {
    if (statusFechamento === 'fechado') return;
    setPedidosDaComissao(prev => prev.map(p => {
      if (p.id !== id) return p;
      const base = parseFloat(novaBase) || 0;
      return { ...p, valorBase: base, valorComissao: (base * p.percentual) / 100 };
    }));
  };

  const handleRemoverPedido = (id) => {
    if (statusFechamento === 'fechado') return;
    setPedidosDaComissao(prev => prev.filter(p => p.id !== id));
    setPedidosRemovidosIds(prev => [...prev, String(id)]);
  };

  // --- 5. LÓGICA DE TRANSFERÊNCIA 100% FRONTEND ---
  const abrirTransferencia = async (pedidoId) => {
    if (representantes.length === 0) {
      const reps = await base44.entities.Representante.list();
      setRepresentantes(reps.filter(r => !r.bloqueado && String(r.codigo) !== String(representante.codigo)));
    }
    setRepDestino('');
    setMoverTodos(false);
    setTransferindoId(pedidoId);
  };

  const confirmarTransferencia = async () => {
    if (!repDestino) return;
    setSalvandoTransfer(true);
    
    try {
      const repEncontrado = representantes.find(r => String(r.codigo) === String(repDestino));
      const pedidoNaTela = pedidosDaComissao.find(p => String(p.id) === String(transferindoId));
      
      if (!pedidoNaTela) throw new Error("Pedido não encontrado na tela.");

      // PASSO 1: Atualizar Pedido e Cliente
      await base44.entities.Pedido.update(pedidoNaTela.id, {
         representante_codigo: repEncontrado.codigo,
         representante_nome: repEncontrado.nome,
         comissao_fechamento_id: null,
         comissao_mes_ano_pago: null
      });

      try {
         const clientes = await base44.entities.Cliente.list();
         const clienteAlvo = clientes.find(c => c.nome === pedidoNaTela.cliente_nome);
         if (clienteAlvo) {
            await base44.entities.Cliente.update(clienteAlvo.id, {
               representante_codigo: repEncontrado.codigo,
               representante_nome: repEncontrado.nome
            });
         }
      } catch(errCli) { console.warn("Cliente não atualizado", errCli); }

      // PASSO 2: Remover do Rascunho Atual (JSON)
      if (controleId) {
         const fechamentoOrigem = await base44.entities.FechamentoComissao.get(controleId);
         let detalhesOrigem = Array.isArray(fechamentoOrigem.pedidos_detalhes) ? fechamentoOrigem.pedidos_detalhes : [];
         
         detalhesOrigem = detalhesOrigem.filter(d => String(d.pedido_id) !== String(pedidoNaTela.id));
         
         const nvVendasOrigem = detalhesOrigem.reduce((acc, d) => acc + (Number(d.valor_pedido) || 0), 0);
         const nvComissaoOrigem = detalhesOrigem.reduce((acc, d) => acc + (Number(d.valor_comissao) || 0), 0);
         const valesOrigem = Number(fechamentoOrigem.vales_adiantamentos) || 0;
         const outrosOrigem = Number(fechamentoOrigem.outros_descontos) || 0;
         const nvLiquidoOrigem = nvComissaoOrigem - valesOrigem - outrosOrigem;

         await base44.entities.FechamentoComissao.update(controleId, {
             pedidos_detalhes: detalhesOrigem,
             total_vendas: parseFloat(nvVendasOrigem.toFixed(2)),
             total_comissoes_bruto: parseFloat(nvComissaoOrigem.toFixed(2)),
             valor_liquido: parseFloat(nvLiquidoOrigem.toFixed(2))
         });
      }

      // PASSO 3: Adicionar no Rascunho do Destino (se ele já tiver criado um no mês)
      const fechamentosGeral = await base44.entities.FechamentoComissao.list();
      const fechamentoDestino = fechamentosGeral.find(f => 
          String(f.representante_codigo) === String(repEncontrado.codigo) && 
          f.mes_ano === mesAno && 
          f.status === 'aberto'
      );
      
      if (fechamentoDestino) {
          let detalhesDestino = Array.isArray(fechamentoDestino.pedidos_detalhes) ? fechamentoDestino.pedidos_detalhes : [];
          detalhesDestino.push({
              pedido_id: String(pedidoNaTela.id),
              numero_pedido: String(pedidoNaTela.numero_pedido),
              cliente_nome: pedidoNaTela.cliente_nome,
              data_pagamento: pedidoNaTela.data_pagamento,
              valor_pedido: parseFloat(pedidoNaTela.valorBase),
              percentual_comissao: parseFloat(pedidoNaTela.percentual),
              valor_comissao: parseFloat(pedidoNaTela.valorComissao)
          });
          
          const nvVendasDest = detalhesDestino.reduce((acc, d) => acc + (Number(d.valor_pedido) || 0), 0);
          const nvComissaoDest = detalhesDestino.reduce((acc, d) => acc + (Number(d.valor_comissao) || 0), 0);
          const valesDest = Number(fechamentoDestino.vales_adiantamentos) || 0;
          const outrosDest = Number(fechamentoDestino.outros_descontos) || 0;
          const nvLiquidoDest = nvComissaoDest - valesDest - outrosDest;

          await base44.entities.FechamentoComissao.update(fechamentoDestino.id, {
              pedidos_detalhes: detalhesDestino,
              total_vendas: parseFloat(nvVendasDest.toFixed(2)),
              total_comissoes_bruto: parseFloat(nvComissaoDest.toFixed(2)),
              valor_liquido: parseFloat(nvLiquidoDest.toFixed(2))
          });
      }

      // PASSO 4: Atualiza Tela
      setPedidosDaComissao(prev => prev.filter(p => String(p.id) !== String(transferindoId)));
      setTransferindoId(null);
      toast.success(`Pedido transferido com sucesso para ${repEncontrado.nome}!`);
      
      // Força os cards do painel principal (verde/roxo) a atualizar
      if (onSuccessSave) onSuccessSave();

    } catch (e) {
      toast.error('Erro ao transferir: ' + e.message);
    } finally {
      setSalvandoTransfer(false);
    }
  };

  // --- 6. SALVAR RASCUNHO / FINALIZAR ---
  const handleSave = async (isFinalizing = false) => {
    setLoading(true);
    try {
        const snapshot = pedidosDaComissao.map(p => ({
            pedido_id: String(p.id),
            numero_pedido: p.numero_pedido,
            cliente_nome: p.cliente_nome,
            data_pagamento: p.data_pagamento,
            valor_pedido: parseFloat(p.valorBase),
            percentual_comissao: parseFloat(p.percentual),
            valor_comissao: parseFloat(p.valorComissao)
        }));

        const payload = {
            mes_ano: mesAno,
            representante_codigo: String(representante.codigo),
            representante_nome: representante.nome,
            representante_chave_pix: representante.chave_pix || '',
            status: isFinalizing ? 'fechado' : 'aberto',
            vales_adiantamentos: parseFloat(vales),
            outros_descontos: parseFloat(outrosDescontos),
            observacoes: observacoes,
            total_vendas: totais.vendas,
            total_comissoes_bruto: totais.comissaoBruta,
            valor_liquido: totais.liquido,
            pedidos_detalhes: snapshot
        };

        if (isFinalizing) {
            payload.data_fechamento = new Date().toISOString();
            payload.fechado_por = 'sistema';
        }

        let currentId = controleId;
        if (currentId) {
            await base44.entities.FechamentoComissao.update(currentId, payload);
        } else {
            const res = await base44.entities.FechamentoComissao.create(payload);
            currentId = res.id;
            setControleId(res.id);
        }

        const pedidosNoBanco = await base44.entities.Pedido.list({ filters: { comissao_fechamento_id: currentId } });
        const idsNaTela = new Set(pedidosDaComissao.map(p => String(p.id)));
        
        const [anoAtual, mesAtual] = mesAno.split('-').map(Number);
        const proximoMesDate = new Date(anoAtual, mesAtual, 1);
        const proximoMesStr = `${proximoMesDate.getFullYear()}-${String(proximoMesDate.getMonth() + 1).padStart(2, '0')}-01`;

        const soltar = pedidosNoBanco.filter(p => !idsNaTela.has(String(p.id)));
        const idsJaSoltos = new Set(soltar.map(p => String(p.id)));
        const removerExtras = pedidosRemovidosIds.filter(id => !idsJaSoltos.has(id));
        const pedidosExtra = removerExtras.length > 0
          ? await base44.entities.Pedido.list().then(todos => todos.filter(p => removerExtras.includes(String(p.id))))
          : [];

        const todosParaSoltar = [...soltar, ...pedidosExtra];

        await Promise.all(todosParaSoltar.map(p =>
          base44.entities.Pedido.update(p.id, {
            comissao_fechamento_id: null,
            comissao_mes_ano_pago: null,
            comissao_paga: false,
            data_referencia_comissao: proximoMesStr,
            mes_pagamento: `${proximoMesDate.getFullYear()}-${String(proximoMesDate.getMonth() + 1).padStart(2, '0')}`
          })
        ));
        setPedidosRemovidosIds([]); 

        await Promise.all(pedidosDaComissao.map(p => base44.entities.Pedido.update(p.id, {
            comissao_fechamento_id: currentId,
            comissao_mes_ano_pago: mesAno,
            comissao_paga: isFinalizing,
            porcentagem_comissao: parseFloat(p.percentual)
        })));

        if (isFinalizing) {
            const conta = await base44.entities.ContaPagar.create({
                fornecedor_codigo: representante.codigo,
                fornecedor_nome: representante.nome,
                descricao: `Comissão Ref: ${mesAno}`,
                valor: parseFloat(totais.liquido),
                data_vencimento: new Date().toISOString(),
                status: 'pendente',
                categoria_financeira: 'comissoes',
                origem_id: currentId,
                origem_tipo: 'fechamento_comissao'
            });
            await base44.entities.FechamentoComissao.update(currentId, { pagamento_id: conta.id });
            setStatusFechamento('fechado');
            toast.success("Finalizado com sucesso!");
        } else {
            toast.success("Salvo!");
        }
        if (onSuccessSave) onSuccessSave();

    } catch (error) {
        toast.error("Erro ao salvar.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center bg-slate-50 p-4 rounded-lg border">
           <div className="text-sm">Status: <Badge className={statusFechamento === 'fechado' ? 'bg-emerald-600' : 'bg-amber-500'}>{statusFechamento.toUpperCase()}</Badge></div>
       </div>

       <div className="border rounded-md overflow-hidden bg-white">
          <div className="p-2 border-b bg-slate-50 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <Input
              placeholder="Buscar pedido ou cliente..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="h-8 border-0 bg-transparent focus-visible:ring-0 shadow-none"
            />
            {searchTerm && (
              <span className="text-xs text-slate-400 shrink-0">{pedidosFiltrados.length} resultado(s)</span>
            )}
          </div>

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
                  {pedidosFiltrados.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-slate-400 py-8">
                      {searchTerm ? 'Nenhum resultado para a busca.' : 'Nenhum pedido vinculado.'}
                    </TableCell></TableRow>
                  ) : pedidosFiltrados.map(p => (
                      <TableRow key={p.id}>
                          <TableCell className="font-bold">#{p.numero_pedido}</TableCell>
                          <TableCell>{p.data_pagamento ? new Date(p.data_pagamento).toLocaleDateString() : '-'}</TableCell>
                          <TableCell className="text-xs">{p.cliente_nome}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              className="w-28 h-8"
                              value={p.valorBase}
                              onChange={e => handleUpdateBase(p.id, e.target.value)}
                              disabled={statusFechamento === 'fechado'}
                            />
                          </TableCell>
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
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm" title="Transferir para outro representante" onClick={() => abrirTransferencia(p.id)}>
                                  <ArrowLeftRight className="w-4 h-4 text-blue-500"/>
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleRemoverPedido(p.id)}>
                                  <Trash2 className="w-4 h-4 text-red-500"/>
                                </Button>
                              </div>
                            )}
                          </TableCell>
                      </TableRow>
                  ))}
              </TableBody>
          </Table>
       </div>

       <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl">
           <div><label className="text-xs font-bold text-slate-500">Vales</label><Input type="number" value={vales} onChange={e => setVales(e.target.value)} disabled={statusFechamento === 'fechado'} className="bg-white"/></div>
           <div className="text-right"><p className="text-sm font-bold text-slate-500">A Pagar</p><p className="text-3xl font-bold text-emerald-600">{formatCurrency(totais.liquido)}</p></div>
       </div>

       <div className="flex justify-end gap-2 pt-4 border-t">
           <Button variant="outline" onClick={onClose}>Fechar</Button>
           {statusFechamento !== 'fechado' ? (
               <>
                   <Button onClick={() => handleSave(false)} disabled={loading} className="bg-blue-600 hover:bg-blue-700">{loading ? <Loader2 className="animate-spin w-4 h-4"/> : <Save className="w-4 h-4 mr-2"/>} Salvar Rascunho</Button>
                   <Button onClick={() => handleSave(true)} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700"><Lock className="w-4 h-4 mr-2"/> Finalizar</Button>
               </>
           ) : (<Button variant="destructive" onClick={() => alert("Reabrir não disponível.")}>Reabrir</Button>)}
       </div>
       
       <ModalContainer open={!!transferindoId} onClose={() => setTransferindoId(null)} title="Transferir para outro Representante">
         <div className="space-y-4 py-2">
           <p className="text-sm text-slate-600">Selecione o representante de destino. O pedido será movido e os rascunhos atualizados.</p>

           <Select value={repDestino} onValueChange={setRepDestino}>
             <SelectTrigger>
               <SelectValue placeholder="Selecionar representante..." />
             </SelectTrigger>
             <SelectContent>
               {representantes.map(r => (
                 <SelectItem key={r.codigo} value={String(r.codigo)}>
                   {r.nome} <span className="text-slate-400 text-xs ml-1">({r.codigo})</span>
                 </SelectItem>
               ))}
             </SelectContent>
           </Select>

           <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-700">
             <span className="shrink-0 mt-0.5">💡</span>
             <span>O cadastro deste cliente será atualizado automaticamente para o novo representante.</span>
           </div>

           <div className="flex justify-end gap-2 pt-2">
             <Button variant="outline" onClick={() => setTransferindoId(null)}>Cancelar</Button>
             <Button
               onClick={confirmarTransferencia}
               disabled={!repDestino || salvandoTransfer}
               className="bg-blue-600 hover:bg-blue-700 gap-2"
             >
               {salvandoTransfer ? <Loader2 className="w-4 h-4 animate-spin"/> : <Check className="w-4 h-4"/>}
               Confirmar Transferência
             </Button>
           </div>
         </div>
       </ModalContainer>

    </div>
  );
}