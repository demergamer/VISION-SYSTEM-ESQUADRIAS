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
  const [transferindoId, setTransferindoId] = useState(null); // ID do pedido sendo transferido
  const [representantes, setRepresentantes] = useState([]);
  const [repDestino, setRepDestino] = useState('');
  const [salvandoTransfer, setSalvandoTransfer] = useState(false);
  const [moverTodos, setMoverTodos] = useState(false);

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  // --- 1. NORMALIZADOR DE DADOS ---
  // Transforma qualquer formato (banco ou snapshot) em um objeto padrão para a tela
  const prepararPedidoParaTela = (p, origem) => {
      // Valor Base: Tenta 'valor_pedido' (snapshot) ou 'total_pago' (banco)
      const valorBaseRaw = p.valor_pedido !== undefined ? p.valor_pedido : (p.total_pago || 0);
      
      // Percentual: Tenta 'percentual_comissao' (snapshot), 'porcentagem_comissao' (banco) ou padrão do rep
      const percentualRaw = p.percentual_comissao ?? p.porcentagem_comissao ?? representante.porcentagem_padrao ?? 5;
      
      // Valor Comissão: Usa o salvo ou calcula na hora
      const valorComissaoCalculado = (parseFloat(valorBaseRaw) * parseFloat(percentualRaw)) / 100;
      const valorComissaoFinal = p.valor_comissao !== undefined ? p.valor_comissao : valorComissaoCalculado;

      return {
          ...p,
          id: p.id || p.pedido_id, // Unifica ID
          numero_pedido: p.numero_pedido,
          cliente_nome: p.cliente_nome,
          data_pagamento: p.data_pagamento,
          valorBase: parseFloat(valorBaseRaw),
          percentual: parseFloat(percentualRaw),
          valorComissao: parseFloat(valorComissaoFinal),
          origem_dado: origem
      };
  };

  // --- 2. CARREGAMENTO ABRASIVO (FORÇA BRUTA) ---
  useEffect(() => {
    const carregar = async () => {
      setLoading(true);
      try {
        console.log(`--- INICIANDO CARGA PARA ${representante.nome} (${representante.codigo}) EM ${mesAno} ---`);

        // A. Busca Fechamento Salvo (Se houver)
        const todosFechamentos = await base44.entities.FechamentoComissao.list();
        const fechamentoAtual = todosFechamentos.find(f => 
          String(f.representante_codigo).trim().toUpperCase() === String(representante.codigo).trim().toUpperCase() && 
          f.mes_ano === mesAno
        );

        if (fechamentoAtual) {
           console.log("FECHAMENTO ENCONTRADO (MODO EDIÇÃO):", fechamentoAtual);
           setControleId(fechamentoAtual.id);
           setStatusFechamento(fechamentoAtual.status);
           setVales(fechamentoAtual.vales_adiantamentos || 0);
           setOutrosDescontos(fechamentoAtual.outros_descontos || 0);
           setObservacoes(fechamentoAtual.observacoes || '');

           // Prioriza snapshot, mas também busca pedidos vinculados
           if (fechamentoAtual.pedidos_detalhes && fechamentoAtual.pedidos_detalhes.length > 0) {
               console.log("Usando SNAPSHOT:", fechamentoAtual.pedidos_detalhes.length, "pedidos");
               setPedidosDaComissao(fechamentoAtual.pedidos_detalhes.map(p => prepararPedidoParaTela(p, 'snapshot')));
           } else {
               // Busca pedidos vinculados (mesmo que snapshot vazio)
               console.log("Snapshot vazio. Buscando pedidos vinculados...");
               const todosPedidos = await base44.entities.Pedido.list();
               const pedidosVinculados = todosPedidos.filter(p => 
                 String(p.comissao_fechamento_id) === String(fechamentoAtual.id)
               );
               console.log("Pedidos vinculados encontrados:", pedidosVinculados.length);
               setPedidosDaComissao(pedidosVinculados.map(p => prepararPedidoParaTela(p, 'vinculado')));
           }

        } else {
           // --- MODO PREVISÃO ---
           console.log("NENHUM FECHAMENTO SALVO. CALCULANDO PREVISÃO...");
           setControleId(null);
           setStatusFechamento('aberto');
           setVales(representante.vales || 0);
           setOutrosDescontos(0);
           setObservacoes('');
           
           // Busca todos pedidos pagos e filtra manualmente
           const todosPagos = await base44.entities.Pedido.list();
           
           console.log(`TOTAL PEDIDOS BAIXADOS: ${todosPagos.length}`);

           const pedidosDoMes = todosPagos.filter(p => {
              // Status pago
              if (p.status !== 'pago') return false;
              
              // Representante (normalizado)
              const repPedido = String(p.representante_codigo || '').trim().toUpperCase();
              const repAtual = String(representante.codigo || '').trim().toUpperCase();
              if (repPedido !== repAtual) return false;

              // Não pode ter comissão já fechada/paga
              if (p.comissao_fechamento_id) return false;
              if (p.comissao_paga === true) return false;

              // Data do mês
              const dataRef = p.data_referencia_comissao || p.data_pagamento;
              if (!dataRef) return false;
              
              const pertenceAoMes = String(dataRef).substring(0, 7) === mesAno;
              return pertenceAoMes;
           });

           console.log(`PEDIDOS FILTRADOS PARA TELA: ${pedidosDoMes.length}`, pedidosDoMes);
           setPedidosDaComissao(pedidosDoMes.map(p => prepararPedidoParaTela(p, 'previsao')));
        }
      } catch (err) {
        console.error("ERRO CRÍTICO NO MODAL:", err);
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

  // --- 4. AÇÕES ---
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
    // Registra o ID para processar no save (mover para próximo mês)
    setPedidosRemovidosIds(prev => [...prev, String(id)]);
  };

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
      // Chama backend para transferência atômica (Pedido + CommissionEntry se houver)
      const pedido = pedidosDaComissao.find(p => String(p.id) === String(transferindoId));
      await base44.functions.invoke('atualizarComissao', {
        action: 'transferir',
        pedido_id: transferindoId,
        entry_id: pedido?._entry_id || null,
        novo_representante_codigo: repDestino,
      });
      // Remove da lista local
      setPedidosDaComissao(prev => prev.filter(p => String(p.id) !== String(transferindoId)));
      setTransferindoId(null);
      toast.success(`Pedido transferido para ${repEncontrado.nome}!`);
    } catch (e) {
      toast.error('Erro ao transferir: ' + e.message);
    } finally {
      setSalvandoTransfer(false);
    }
  };

  // --- 5. SALVAR ---
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

        // Vínculo no Banco (Crucial para persistência)
        const pedidosNoBanco = await base44.entities.Pedido.list({ filters: { comissao_fechamento_id: currentId } });
        const idsNaTela = new Set(pedidosDaComissao.map(p => String(p.id)));
        
        // Solta removidos → move data_referencia_comissao para o 1º dia do mês seguinte
        const [anoAtual, mesAtual] = mesAno.split('-').map(Number);
        const proximoMesDate = new Date(anoAtual, mesAtual, 1); // JS: mês é 0-based, então mesAtual já é o próximo
        const proximoMesStr = `${proximoMesDate.getFullYear()}-${String(proximoMesDate.getMonth() + 1).padStart(2, '0')}-01`;

        const soltar = pedidosNoBanco.filter(p => !idsNaTela.has(String(p.id)));

        // Também inclui pedidos removidos que não estavam no banco ainda (previsão/snapshot)
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
            // Move para o próximo mês para não "sumir"
            data_referencia_comissao: proximoMesStr,
            mes_pagamento: `${proximoMesDate.getFullYear()}-${String(proximoMesDate.getMonth() + 1).padStart(2, '0')}`
          })
        ));
        setPedidosRemovidosIds([]); // Limpa após save

        // Vincula atuais
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
        console.error(error);
        toast.error("Erro ao salvar.");
    } finally {
        setLoading(false);
    }
  };

  // --- 6. ADICIONAR (ANTECIPAR / PUXAR DE OUTROS MESES) ---
  const carregarParaAdicionar = async () => {
      const repAtual = String(representante.codigo || '').trim().toUpperCase();
      const idsDaTelaAtual = new Set(pedidosDaComissao.map(p => String(p.id)));

      // Fonte 1: CommissionEntries abertas deste representante em QUALQUER mês ≠ atual
      // (inclui futuras e passadas atrasadas)
      const todasEntries = await base44.entities.CommissionEntry.list();
      const entriesDisponiveis = todasEntries.filter(c => {
          if (c.status !== 'aberto') return false;
          if (c.mes_competencia === mesAno) return false; // Já está no mês atual
          const repEntry = String(c.representante_codigo || '').trim().toUpperCase();
          if (repEntry !== repAtual) return false;
          if (idsDaTelaAtual.has(String(c.pedido_id))) return false; // Já na lista
          return true;
      });

      // Fonte 2: Pedidos pagos sem nenhuma CommissionEntry ainda (sem comissao_fechamento_id, em mês ≠ atual)
      const todosPedidos = await base44.entities.Pedido.list();
      const idsComEntry = new Set(todasEntries.map(c => String(c.pedido_id)));
      const pedidosSemEntry = todosPedidos.filter(p => {
          if (p.status !== 'pago') return false;
          if (p.comissao_paga === true) return false;
          if (p.comissao_fechamento_id) return false;
          const repPedido = String(p.representante_codigo || '').trim().toUpperCase();
          if (repPedido !== repAtual) return false;
          if (idsDaTelaAtual.has(String(p.id))) return false;
          if (idsComEntry.has(String(p.id))) return false; // Já tem entry (tratado acima)
          const dataRef = p.data_referencia_comissao || p.data_pagamento;
          if (!dataRef) return false;
          // Deve estar em mês DIFERENTE do atual
          return String(dataRef).substring(0, 7) !== mesAno;
      });

      // Normaliza entradas de CommissionEntry para o mesmo formato do modal
      const entriesNormalizadas = entriesDisponiveis.map(c => ({
          id: c.pedido_id, // ID do pedido original para adicionar à lista
          _entry_id: c.id,
          numero_pedido: c.pedido_numero,
          cliente_nome: c.cliente_nome,
          data_pagamento: c.data_pagamento_real,
          total_pago: c.valor_base,
          porcentagem_comissao: c.percentual,
          valor_comissao: c.valor_comissao,
          _mes_competencia: c.mes_competencia,
          _origem: c.mes_competencia > mesAno ? 'futuro' : 'passado',
      }));

      const pedidosNormalizados = pedidosSemEntry.map(p => ({
          ...p,
          _mes_competencia: String(p.data_referencia_comissao || p.data_pagamento || '').substring(0, 7),
          _origem: String(p.data_referencia_comissao || p.data_pagamento || '').substring(0, 7) > mesAno ? 'futuro' : 'passado',
      }));

      // Ordena: passados primeiro, depois futuros; dentro de cada grupo por mês
      const todos = [...entriesNormalizadas, ...pedidosNormalizados].sort((a, b) => {
          if (a._origem !== b._origem) return a._origem === 'passado' ? -1 : 1;
          return (a._mes_competencia || '').localeCompare(b._mes_competencia || '');
      });

      setPedidosDisponiveis(todos);
      setShowAddModal(true);
  };

  const adicionarManual = async (pedido) => {
      // Se veio de uma CommissionEntry, atualiza a competência dela para o mês atual
      if (pedido._entry_id) {
          try {
              await base44.entities.CommissionEntry.update(pedido._entry_id, {
                  data_competencia: `${mesAno}-01`,
                  mes_competencia: mesAno,
                  movimentacoes: [] // Limpa histórico de movimentação ao trazer de volta
              });
          } catch (e) {
              console.warn('Não foi possível atualizar CommissionEntry:', e);
          }
      }
      setPedidosDaComissao(prev => [...prev, prepararPedidoParaTela(pedido, 'manual')]);
      setShowAddModal(false);
      toast.success("Adicionado!");
  };

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center bg-slate-50 p-4 rounded-lg border">
           <div className="text-sm">Status: <Badge className={statusFechamento === 'fechado' ? 'bg-emerald-600' : 'bg-amber-500'}>{statusFechamento.toUpperCase()}</Badge></div>
           {statusFechamento !== 'fechado' && (<Button variant="outline" size="sm" onClick={carregarParaAdicionar}><Plus className="w-4 h-4 mr-2"/> Antecipar Pedidos</Button>)}
       </div>

       <div className="border rounded-md overflow-hidden bg-white">
          {/* Campo de pesquisa local */}
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
       
       {/* Modal de Transferência de Representante */}
       <ModalContainer open={!!transferindoId} onClose={() => setTransferindoId(null)} title="Transferir para outro Representante">
         <div className="space-y-4 py-2">
           <p className="text-sm text-slate-600">Selecione o representante de destino. O pedido será removido desta lista imediatamente.</p>
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
               <p className="text-xs text-slate-500">Pedidos deste representante em outros meses (passados atrasados ou futuros agendados).</p>
               <Input placeholder="Buscar por pedido ou cliente..." value={buscaPedido} onChange={e => setBuscaPedido(e.target.value)} />
               <div className="max-h-72 overflow-y-auto border rounded divide-y">
                   {pedidosDisponiveis.length === 0 ? (
                       <p className="text-center text-slate-400 py-8 text-sm">Nenhum pedido disponível em outros meses.</p>
                   ) : pedidosDisponiveis
                       .filter(p => !buscaPedido || String(p.numero_pedido).includes(buscaPedido) || String(p.cliente_nome || '').toLowerCase().includes(buscaPedido.toLowerCase()))
                       .map(p => (
                           <div key={`${p.id}-${p._entry_id || ''}`} className="flex justify-between items-center p-3 hover:bg-slate-50 cursor-pointer" onClick={() => adicionarManual(p)}>
                               <div className="flex items-center gap-3">
                                   <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p._origem === 'futuro' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                                       {p._origem === 'futuro' ? `▶ ${p._mes_competencia}` : `◀ ${p._mes_competencia}`}
                                   </span>
                                   <div>
                                       <p className="font-bold text-sm">#{p.numero_pedido} — {p.cliente_nome}</p>
                                       <p className="text-xs text-slate-500">{p.data_pagamento ? new Date(p.data_pagamento).toLocaleDateString('pt-BR') : '?'}</p>
                                   </div>
                               </div>
                               <p className="font-bold text-emerald-600 text-sm">{formatCurrency(p.total_pago || p.valor_comissao)}</p>
                           </div>
                       ))
                   }
               </div>
           </div>
       </ModalContainer>
    </div>
  );
}