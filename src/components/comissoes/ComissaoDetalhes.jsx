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

export default function ComissaoDetalhes({ representante, mesAno, onClose, onSuccessSave, isPortal = false }) {
  const [pedidosDaComissao, setPedidosDaComissao] = useState([]); 
  const [loading, setLoading] = useState(true);
  
  // Controle de Fechamento
  const [controleId, setControleId] = useState(null); 
  const [statusFechamento, setStatusFechamento] = useState('aberto'); 
  const [vales, setVales] = useState(0);
  const [outrosDescontos, setOutrosDescontos] = useState(0);
  const [observacoes, setObservacoes] = useState('');

  // Rastreia pedidos explicitamente removidos na lixeira (para jogar pro próximo mês)
  const [pedidosRemovidosIds, setPedidosRemovidosIds] = useState([]);

  // Adicionar Manual (Antecipar)
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
               const pedidosVinculados = todosPedidos.filter(p => String(p.comissao_fechamento_id) === String(fechamentoAtual.id));
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

  // --- 4. AÇÕES LOCAIS DA TABELA ---
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
    // Só entra aqui se o usuário clicar explicitamente na lixeira
    setPedidosRemovidosIds(prev => [...prev, String(id)]);
  };

  // --- 5. LÓGICA DE TRANSFERÊNCIA BLINDADA ---
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

      // Identifica os pedidos a mover (suporta moverTodos)
      const todosPedidos = await base44.entities.Pedido.list();
      let pedidosParaMover = [];
      if (moverTodos && pedidoNaTela.cliente_nome) {
          pedidosParaMover = todosPedidos.filter(p => p.cliente_nome === pedidoNaTela.cliente_nome && !p.comissao_paga);
      } else {
          const found = todosPedidos.find(p => String(p.id) === String(pedidoNaTela.id));
          if (found) pedidosParaMover = [found];
      }

      const idsMovidos = pedidosParaMover.map(p => String(p.id));

      // 1. Atualizar Pedidos no BD
      await Promise.all(pedidosParaMover.map(p => 
          base44.entities.Pedido.update(p.id, {
             representante_codigo: String(repEncontrado.codigo),
             representante_nome: repEncontrado.nome,
             comissao_fechamento_id: null,
             comissao_mes_ano_pago: null
          })
      ));

      // 2. Atualizar Cliente no BD
      try {
         const clientes = await base44.entities.Cliente.list();
         const clienteAlvo = clientes.find(c => c.nome === pedidoNaTela.cliente_nome);
         if (clienteAlvo) {
            await base44.entities.Cliente.update(clienteAlvo.id, {
               representante_codigo: String(repEncontrado.codigo),
               representante_nome: repEncontrado.nome
            });
         }
      } catch(errCli) { console.warn("Cliente não atualizado", errCli); }

      // 3. Remover de TODOS os Rascunhos do antigo dono (Elimina o Fantasma de Múltiplos Meses)
      const todosFechamentos = await base44.entities.FechamentoComissao.list();
      const fechamentosAntigos = todosFechamentos.filter(f => 
          String(f.representante_codigo) === String(representante.codigo) && 
          f.status === 'aberto'
      );

      for (const f of fechamentosAntigos) {
          let detalhes = Array.isArray(f.pedidos_detalhes) ? f.pedidos_detalhes : [];
          const contemAlgum = detalhes.some(d => idsMovidos.includes(String(d.pedido_id)));
          
          if (contemAlgum) {
              detalhes = detalhes.filter(d => !idsMovidos.includes(String(d.pedido_id)));
              
              const nvVendas = detalhes.reduce((acc, d) => acc + (Number(d.valor_pedido) || 0), 0);
              const nvComissao = detalhes.reduce((acc, d) => acc + (Number(d.valor_comissao) || 0), 0);
              const vales = Number(f.vales_adiantamentos) || 0;
              const outros = Number(f.outros_descontos) || 0;
              const nvLiquido = nvComissao - vales - outros;

              await base44.entities.FechamentoComissao.update(f.id, {
                  pedidos_detalhes: detalhes,
                  total_vendas: parseFloat(nvVendas.toFixed(2)),
                  total_comissoes_bruto: parseFloat(nvComissao.toFixed(2)),
                  valor_liquido: parseFloat(nvLiquido.toFixed(2))
              });
          }
      }

      // 4. Inserir no Rascunho do novo dono (se ele já tiver um rascunho criado neste mês)
      const fechamentoDestino = todosFechamentos.find(f => 
          String(f.representante_codigo) === String(repEncontrado.codigo) && 
          f.mes_ano === mesAno && 
          f.status === 'aberto'
      );
      
      if (fechamentoDestino) {
          let detalhesDest = Array.isArray(fechamentoDestino.pedidos_detalhes) ? fechamentoDestino.pedidos_detalhes : [];
          
          pedidosParaMover.forEach(pMover => {
              if (!detalhesDest.some(d => String(d.pedido_id) === String(pMover.id))) {
                  detalhesDest.push({
                      pedido_id: String(pMover.id),
                      numero_pedido: String(pMover.numero_pedido),
                      cliente_nome: pMover.cliente_nome,
                      data_pagamento: pMover.data_pagamento,
                      valor_pedido: parseFloat(pMover.total_pago || pMover.valor_pedido || 0),
                      percentual_comissao: parseFloat(pMover.porcentagem_comissao || repEncontrado.porcentagem_padrao || 5),
                      valor_comissao: (parseFloat(pMover.total_pago || pMover.valor_pedido || 0) * parseFloat(pMover.porcentagem_comissao || 5)) / 100
                  });
              }
          });
          
          const nvVendasDest = detalhesDest.reduce((acc, d) => acc + (Number(d.valor_pedido) || 0), 0);
          const nvComissaoDest = detalhesDest.reduce((acc, d) => acc + (Number(d.valor_comissao) || 0), 0);
          const valesDest = Number(fechamentoDestino.vales_adiantamentos) || 0;
          const outrosDest = Number(fechamentoDestino.outros_descontos) || 0;
          const nvLiquidoDest = nvComissaoDest - valesDest - outrosDest;

          await base44.entities.FechamentoComissao.update(fechamentoDestino.id, {
              pedidos_detalhes: detalhesDest,
              total_vendas: parseFloat(nvVendasDest.toFixed(2)),
              total_comissoes_bruto: parseFloat(nvComissaoDest.toFixed(2)),
              valor_liquido: parseFloat(nvLiquidoDest.toFixed(2))
          });
      }

      // 5. Atualiza Tela e Feedback
      setPedidosDaComissao(prev => prev.filter(p => !idsMovidos.includes(String(p.id))));
      setTransferindoId(null);
      toast.success(`Pedido(s) transferido(s) com sucesso para ${repEncontrado.nome}!`);
      
      if (onSuccessSave) onSuccessSave();

    } catch (e) {
      toast.error('Erro ao transferir: ' + e.message);
    } finally {
      setSalvandoTransfer(false);
    }
  };

  // --- 6. ANTECIPAR / PUXAR PEDIDO ---
  const carregarParaAdicionar = async () => {
      const repAtual = String(representante.codigo || '').trim().toUpperCase();
      const idsDaTelaAtual = new Set(pedidosDaComissao.map(p => String(p.id)));

      const todosPedidos = await base44.entities.Pedido.list();
      const pedidosSemEntry = todosPedidos.filter(p => {
          if (p.status !== 'pago') return false;
          if (p.comissao_paga === true) return false;
          if (p.comissao_fechamento_id) return false;
          const repPedido = String(p.representante_codigo || '').trim().toUpperCase();
          if (repPedido !== repAtual) return false;
          if (idsDaTelaAtual.has(String(p.id))) return false;
          const dataRef = p.data_referencia_comissao || p.data_pagamento;
          if (!dataRef) return false;
          // Deve estar em mês DIFERENTE do atual para aparecer aqui
          return String(dataRef).substring(0, 7) !== mesAno;
      });

      const pedidosNormalizados = pedidosSemEntry.map(p => ({
          ...p,
          _mes_competencia: String(p.data_referencia_comissao || p.data_pagamento || '').substring(0, 7),
          _origem: String(p.data_referencia_comissao || p.data_pagamento || '').substring(0, 7) > mesAno ? 'futuro' : 'passado',
      }));

      const todos = [...pedidosNormalizados].sort((a, b) => {
          if (a._origem !== b._origem) return a._origem === 'passado' ? -1 : 1;
          return (a._mes_competencia || '').localeCompare(b._mes_competencia || '');
      });

      setPedidosDisponiveis(todos);
      setShowAddModal(true);
  };

  const adicionarManual = async (pedido) => {
      setPedidosDaComissao(prev => [...prev, prepararPedidoParaTela(pedido, 'manual')]);
      setShowAddModal(false);
      toast.success("Adicionado à lista local! Clique em salvar para confirmar.");
  };

  // --- 7. SALVAR RASCUNHO / FINALIZAR (BUG CORRIGIDO) ---
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
            total_vendas: parseFloat(totais.vendas.toFixed(2)),
            total_comissoes_bruto: parseFloat(totais.comissaoBruta.toFixed(2)),
            valor_liquido: parseFloat(totais.liquido.toFixed(2)),
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

        // 1. Processa SOMENTE os pedidos que foram movidos pra lixeira
        if (pedidosRemovidosIds.length > 0) {
            const [anoAtual, mesAtual] = mesAno.split('-').map(Number);
            const proximoMesDate = new Date(anoAtual, mesAtual, 1);
            const proximoMesStr = `${proximoMesDate.getFullYear()}-${String(proximoMesDate.getMonth() + 1).padStart(2, '0')}-01`;

            await Promise.all(pedidosRemovidosIds.map(id => 
                base44.entities.Pedido.update(id, {
                    comissao_fechamento_id: null,
                    comissao_mes_ano_pago: null,
                    comissao_paga: false,
                    data_referencia_comissao: proximoMesStr, // Joga pro próximo mês
                    mes_pagamento: `${proximoMesDate.getFullYear()}-${String(proximoMesDate.getMonth() + 1).padStart(2, '0')}`
                })
            ));
            setPedidosRemovidosIds([]); 
        }

        // 2. Vincula e atualiza SOMENTE os pedidos ativos na tela
        await Promise.all(pedidosDaComissao.map(p => base44.entities.Pedido.update(p.id, {
            comissao_fechamento_id: currentId,
            comissao_mes_ano_pago: isFinalizing ? mesAno : null, 
            comissao_paga: isFinalizing,
            porcentagem_comissao: parseFloat(p.percentual),
            data_referencia_comissao: `${mesAno}-01` // Alinha com o mês do rascunho
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
            toast.success("Finalizado com sucesso! Lançamento gerado no Contas a Pagar.");
        } else {
            toast.success("Rascunho Salvo!");
        }
        
        if (onSuccessSave) onSuccessSave();

    } catch (error) {
        toast.error("Erro ao salvar o rascunho.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center bg-slate-50 p-4 rounded-lg border">
           <div className="text-sm">Status: <Badge className={statusFechamento === 'fechado' ? 'bg-emerald-600' : 'bg-amber-500'}>{statusFechamento.toUpperCase()}</Badge></div>
           {statusFechamento !== 'fechado' && !isPortal && (
             <Button variant="outline" size="sm" onClick={carregarParaAdicionar}>
               <Plus className="w-4 h-4 mr-2"/> Antecipar / Puxar Pedidos
             </Button>
           )}
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
                              disabled={statusFechamento === 'fechado' || isPortal}
                            />
                            </TableCell>
                            <TableCell>
                            <Input
                              type="number"
                              className="w-16 h-8"
                              value={p.percentual}
                              onChange={e => handleUpdatePercentual(p.id, e.target.value)}
                              disabled={statusFechamento === 'fechado' || isPortal}
                            />
                          </TableCell>
                          <TableCell className="text-right font-bold text-emerald-600">{formatCurrency(p.valorComissao)}</TableCell>
                          <TableCell>
                            {statusFechamento !== 'fechado' && !isPortal && (
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
           {!isPortal && statusFechamento !== 'fechado' && (
               <>
                   <Button onClick={() => handleSave(false)} disabled={loading} className="bg-blue-600 hover:bg-blue-700">{loading ? <Loader2 className="animate-spin w-4 h-4"/> : <Save className="w-4 h-4 mr-2"/>} Salvar Rascunho</Button>
                   <Button onClick={() => handleSave(true)} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700"><Lock className="w-4 h-4 mr-2"/> Finalizar</Button>
               </>
           )}
           {!isPortal && statusFechamento === 'fechado' && (
               <Button variant="destructive" onClick={() => alert("Reabrir não disponível.")}>Reabrir</Button>
           )}
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

           <label className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-lg cursor-pointer hover:bg-amber-100 transition-colors">
             <input
               type="checkbox"
               checked={moverTodos}
               onChange={e => setMoverTodos(e.target.checked)}
               className="mt-0.5 w-4 h-4 accent-amber-600 shrink-0 cursor-pointer"
             />
             <span className="text-sm text-amber-800">
               🔄 Mover também todos os outros pedidos em aberto/futuros deste cliente para o novo representante.
             </span>
           </label>

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

       <ModalContainer open={showAddModal} onClose={() => setShowAddModal(false)} title="Antecipar / Puxar Pedido">
           <div className="space-y-3">
               <p className="text-xs text-slate-500">Pedidos deste representante que não estão no rascunho (pagos atrasados ou futuros agendados).</p>
               <Input placeholder="Buscar por pedido ou cliente..." value={buscaPedido} onChange={e => setBuscaPedido(e.target.value)} />
               <div className="max-h-72 overflow-y-auto border rounded divide-y">
                   {pedidosDisponiveis.length === 0 ? (
                       <p className="text-center text-slate-400 py-8 text-sm">Nenhum pedido disponível.</p>
                   ) : pedidosDisponiveis
                       .filter(p => !buscaPedido || String(p.numero_pedido).includes(buscaPedido) || String(p.cliente_nome || '').toLowerCase().includes(buscaPedido.toLowerCase()))
                       .map(p => (
                           <div key={p.id} className="flex justify-between items-center p-3 hover:bg-slate-50 cursor-pointer" onClick={() => adicionarManual(p)}>
                               <div className="flex items-center gap-3">
                                   <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p._origem === 'futuro' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                                       {p._origem === 'futuro' ? `▶ ${p._mes_competencia}` : `◀ ${p._mes_competencia}`}
                                   </span>
                                   <div>
                                       <p className="font-bold text-sm">#{p.numero_pedido} — {p.cliente_nome}</p>
                                       <p className="text-xs text-slate-500">{p.data_pagamento ? new Date(p.data_pagamento).toLocaleDateString('pt-BR') : '?'}</p>
                                   </div>
                               </div>
                               <p className="font-bold text-emerald-600 text-sm">{formatCurrency(p.total_pago || p.valor_pedido)}</p>
                           </div>
                       ))
                   }
               </div>
           </div>
       </ModalContainer>

    </div>
  );
}