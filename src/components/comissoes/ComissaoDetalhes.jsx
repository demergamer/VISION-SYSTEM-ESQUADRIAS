import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  DollarSign, Save, Lock, Trash2, Download, RefreshCw, Plus, Search, AlertTriangle, X
} from "lucide-react";
import { format } from 'date-fns';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import ModalContainer from "@/components/modals/ModalContainer";

export default function ComissaoDetalhes({ representante, mesAno, pedidosTodos, onClose }) {
  // Estado local dos dados
  const [pedidosEditaveis, setPedidosEditaveis] = useState(representante.pedidos || []);
  const [vales, setVales] = useState(representante.vales || 0);
  const [outrosDescontos, setOutrosDescontos] = useState(representante.outrosDescontos || 0);
  const [observacoes, setObservacoes] = useState(representante.observacoes || '');
  const [bulkPercent, setBulkPercent] = useState(''); 
  const [isFechado, setIsFechado] = useState(representante.status === 'fechado');
  const [loading, setLoading] = useState(false);
  
  // Estado para controle de ID (para saber se cria ou atualiza o rascunho)
  const [controleId, setControleId] = useState(representante.controleId);

  // Modal de Adicionar
  const [showAddModal, setShowAddModal] = useState(false);
  const [buscaPedidoAdd, setBuscaPedidoAdd] = useState('');

  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

  // Totais em tempo real
  const totais = useMemo(() => {
    const totalVendas = pedidosEditaveis.reduce((sum, p) => sum + (parseFloat(p.valor_pedido) || 0), 0);
    const totalComissoes = pedidosEditaveis.reduce((sum, p) => sum + (parseFloat(p.valorComissao) || 0), 0);
    const saldoFinal = totalComissoes - parseFloat(vales || 0) - parseFloat(outrosDescontos || 0);
    return { totalVendas, totalComissoes, saldoFinal };
  }, [pedidosEditaveis, vales, outrosDescontos]);

  // --- LÓGICA CORRIGIDA: PEDIDOS DISPONÍVEIS (ANTECIPAÇÃO) ---
  const pedidosDisponiveisParaAdicao = useMemo(() => {
      if (!pedidosTodos) return [];
      
      const repCodigoAtual = String(representante.rep.codigo);

      return pedidosTodos.filter(p => {
          // 1. Filtro Básico: Mesmo representante e estar PAGO
          if (String(p.representante_codigo) !== repCodigoAtual) return false;
          if (p.status !== 'pago') return false;

          // 2. REGRA DE OURO: A comissão não pode ter sido paga ainda
          // Verifica explicitamente se é true. Se for false, null ou undefined, pode pagar.
          if (p.comissao_paga === true) return false;

          // 3. Não pode estar na lista que já estamos vendo agora (evita duplicação visual)
          const jaNaLista = pedidosEditaveis.some(pe => pe.id === p.id);
          if (jaNaLista) return false;

          // 4. Filtro de Texto (Busca no Modal)
          if (buscaPedidoAdd) {
              const termo = buscaPedidoAdd.toLowerCase();
              return (
                  p.numero_pedido?.toLowerCase().includes(termo) || 
                  p.cliente_nome?.toLowerCase().includes(termo)
              );
          }

          return true;
      });
  }, [pedidosTodos, representante, pedidosEditaveis, buscaPedidoAdd]);

  // --- HANDLERS ---

  const handleEditarPercentual = (pedidoId, novoPercentual) => {
    setPedidosEditaveis(prev => prev.map(p => {
      if (p.id === pedidoId) {
        const pNum = parseFloat(novoPercentual) || 0;
        return { ...p, percentualComissao: pNum, valorComissao: (p.valor_pedido * pNum) / 100 };
      }
      return p;
    }));
  };

  const handleBulkChange = () => {
      if (!bulkPercent) return;
      const pct = parseFloat(bulkPercent);
      if (isNaN(pct)) return toast.error("Valor inválido");

      setPedidosEditaveis(prev => prev.map(p => ({
          ...p,
          percentualComissao: pct,
          valorComissao: (p.valor_pedido * pct) / 100
      })));
      toast.success(`Aplicado ${pct}% em todos os pedidos.`);
  };

  const handleRemoverPedido = (pedidoId) => {
      setPedidosEditaveis(prev => prev.filter(p => p.id !== pedidoId));
  };

  const handleAdicionarPedidoManual = (pedido) => {
      const percentual = pedido.porcentagem_comissao || representante.rep.porcentagem_padrao || 5;
      const novoItem = {
          ...pedido,
          percentualComissao: percentual,
          valorComissao: (pedido.valor_pedido * percentual) / 100,
          adicionado_manualmente: true
      };
      
      setPedidosEditaveis(prev => [...prev, novoItem]);
      toast.success(`Pedido #${pedido.numero_pedido} adicionado!`);
  };

  // --- SALVAR RASCUNHO ---
  const handleSaveDraft = async () => {
      setLoading(true);
      try {
          const pedidosAjustados = pedidosEditaveis.map(p => ({
              pedido_id: p.id,
              percentual: p.percentualComissao
          }));

          const payload = {
              referencia: mesAno,
              representante_codigo: String(representante.rep.codigo),
              representante_nome: representante.rep.nome,
              vales: parseFloat(vales),
              outros_descontos: parseFloat(outrosDescontos),
              observacao: observacoes,
              pedidos_ajustados: pedidosAjustados,
              status: 'aberto',
              total_pago: totais.saldoFinal
          };

          if (controleId) {
              await base44.entities.ComissaoControle.update(controleId, payload);
              toast.success("Alterações salvas no rascunho!");
          } else {
              const novo = await base44.entities.ComissaoControle.create(payload);
              setControleId(novo.id); // Atualiza ID para próximos saves
              toast.success("Rascunho criado com sucesso!");
          }
      } catch (error) {
          console.error(error);
          toast.error("Erro ao salvar: " + error.message);
      } finally {
          setLoading(false);
      }
  };

  // --- FINALIZAR ---
  const handleFinalize = async () => {
      // Trava de PIX
      if (!representante.rep.chave_pix) {
          toast.error("Impossível finalizar: Representante sem Chave PIX cadastrada.");
          return;
      }

      if (!confirm("Deseja realmente finalizar? Isso gerará o Contas a Pagar e bloqueará edições.")) return;
      
      setLoading(true);
      try {
          const dataHoje = new Date().toISOString();

          // 1. Salva o controle como FECHADO
          const pedidosData = pedidosEditaveis.map(p => ({ pedido_id: p.id, percentual: p.percentualComissao }));
          const payload = {
              referencia: mesAno,
              representante_codigo: String(representante.rep.codigo),
              representante_nome: representante.rep.nome,
              vales: parseFloat(vales),
              outros_descontos: parseFloat(outrosDescontos),
              observacao: observacoes,
              pedidos_ajustados: pedidosData,
              status: 'fechado',
              data_fechamento: dataHoje,
              total_pago: totais.saldoFinal
          };

          let idFinal = controleId;
          if (idFinal) {
              await base44.entities.ComissaoControle.update(idFinal, payload);
          } else {
              const novo = await base44.entities.ComissaoControle.create(payload);
              idFinal = novo.id;
          }

          // 2. Atualiza Pedidos (Trava para não pagar de novo)
          // Define comissao_paga = true e vincula ao ID do fechamento
          const updatePromises = pedidosEditaveis.map(p => 
             base44.entities.Pedido.update(p.id, { 
                 comissao_paga: true,
                 comissao_fechamento_id: idFinal,
                 comissao_referencia_paga: mesAno 
             })
          );
          await Promise.all(updatePromises);

          setIsFechado(true);
          toast.success("Comissão finalizada com sucesso!");
          setTimeout(onClose, 1500);

      } catch (error) {
          console.error(error);
          toast.error("Erro ao finalizar.");
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER DE FERRAMENTAS (Se aberto) */}
      {!isFechado && (
          <Card className="p-4 bg-blue-50 border-blue-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-full"><RefreshCw className="w-4 h-4 text-blue-600"/></div>
                  <div>
                      <h4 className="font-bold text-sm text-blue-900">Alteração em Massa</h4>
                      <p className="text-xs text-blue-700">Defina uma % única para todos os pedidos da lista.</p>
                  </div>
              </div>
              <div className="flex items-center gap-2">
                  <Input 
                    type="number" 
                    className="w-24 bg-white border-blue-200 h-9" 
                    placeholder="Ex: 3"
                    value={bulkPercent}
                    onChange={(e) => setBulkPercent(e.target.value)}
                  />
                  <span className="font-bold text-blue-800 text-sm">%</span>
                  <Button size="sm" onClick={handleBulkChange} className="bg-blue-600 hover:bg-blue-700 text-white h-9">Aplicar</Button>
              </div>
          </Card>
      )}

      {/* RESUMO FINANCEIRO */}
      <Card className="p-6 bg-white border-slate-200 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div><p className="text-xs text-slate-500 uppercase font-bold mb-1">Total Vendas</p><p className="font-bold text-emerald-600 text-xl">{formatCurrency(totais.totalVendas)}</p></div>
          <div><p className="text-xs text-slate-500 uppercase font-bold mb-1">Total Comissões</p><p className="font-bold text-blue-600 text-xl">{formatCurrency(totais.totalComissoes)}</p></div>
          <div>
            <p className="text-xs text-slate-500 uppercase font-bold mb-1">(-) Vales / Adiant.</p>
            <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">R$</span>
                <Input type="number" className="pl-8 h-9 font-bold text-red-600" value={vales} onChange={(e) => setVales(e.target.value)} disabled={isFechado}/>
            </div>
          </div>
          <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
            <p className="text-xs text-emerald-700 uppercase font-bold mb-1">Saldo a Pagar</p>
            <p className="font-bold text-emerald-800 text-2xl">{formatCurrency(totais.saldoFinal)}</p>
          </div>
        </div>
      </Card>

      {/* BOTÃO ADICIONAR PEDIDO */}
      {!isFechado && (
          <div className="flex justify-end">
              <Button onClick={() => setShowAddModal(true)} variant="outline" className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50">
                  <Plus className="w-4 h-4"/> Adicionar Pedido (Antecipar)
              </Button>
          </div>
      )}

      {/* TABELA DE PEDIDOS */}
      <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
        <Table>
            <TableHeader className="bg-slate-50">
                <TableRow>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Data Pgto</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Valor Venda</TableHead>
                    <TableHead className="text-center w-[120px]">% Com.</TableHead>
                    <TableHead className="text-right">Comissão</TableHead>
                    {!isFechado && <TableHead className="w-[50px]"></TableHead>}
                </TableRow>
            </TableHeader>
            <TableBody>
                {pedidosEditaveis.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-400">Nenhum pedido nesta lista.</TableCell></TableRow>
                ) : (
                    pedidosEditaveis.map(pedido => (
                        <TableRow key={pedido.id}>
                            <TableCell className="font-medium text-slate-700">#{pedido.numero_pedido}</TableCell>
                            <TableCell className="text-xs text-slate-500">{new Date(pedido.data_pagamento).toLocaleDateString()}</TableCell>
                            <TableCell className="text-sm text-slate-600">{pedido.cliente_nome}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(pedido.valor_pedido)}</TableCell>
                            <TableCell className="text-center p-2">
                                {isFechado ? (
                                    <Badge variant="outline">{pedido.percentualComissao}%</Badge>
                                ) : (
                                    <div className="flex justify-center items-center gap-1">
                                        <Input 
                                            type="number" 
                                            className="h-8 w-16 text-center px-1" 
                                            value={pedido.percentualComissao} 
                                            onChange={(e) => handleEditarPercentual(pedido.id, e.target.value)}
                                        />
                                        <span className="text-xs text-slate-400">%</span>
                                    </div>
                                )}
                            </TableCell>
                            <TableCell className="text-right font-bold text-emerald-600">{formatCurrency(pedido.valorComissao)}</TableCell>
                            
                            {!isFechado && (
                                <TableCell>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                                        onClick={() => handleRemoverPedido(pedido.id)}
                                        title="Remover deste mês"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </TableCell>
                            )}
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>
      </div>

      {/* OUTROS DESCONTOS E OBSERVAÇÕES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Outros Descontos</label>
              <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">R$</span>
                  <Input type="number" className="pl-8" value={outrosDescontos} onChange={(e) => setOutrosDescontos(e.target.value)} disabled={isFechado} />
              </div>
          </div>
          <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Observações</label>
              <Textarea placeholder="Detalhes do fechamento..." value={observacoes} onChange={(e) => setObservacoes(e.target.value)} disabled={isFechado} className="resize-none" />
          </div>
      </div>

      {/* ALERTA PIX (Se não tiver chave e não estiver fechado) */}
      {!isFechado && !representante.rep.chave_pix && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3 text-amber-800">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <div>
                  <p className="font-bold text-sm">Chave PIX não cadastrada</p>
                  <p className="text-xs">Cadastre a chave PIX do representante antes de fechar a comissão.</p>
              </div>
          </div>
      )}

      {/* FOOTER AÇÕES */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t mt-4">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          {!isFechado && (
              <>
                {/* BOTÃO SALVAR AGORA FUNCIONA */}
                <Button onClick={handleSaveDraft} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                    <Save className="w-4 h-4"/> Salvar Alterações
                </Button>
                {/* BOTÃO FINALIZAR COM TRAVA DE PIX */}
                <Button 
                    onClick={handleFinalize} 
                    disabled={loading || !representante.rep.chave_pix} 
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={!representante.rep.chave_pix ? "Necessário chave PIX" : "Finalizar"}
                >
                    <Lock className="w-4 h-4"/> Finalizar Fechamento
                </Button>
              </>
          )}
          {isFechado && (
              <Button variant="outline" className="gap-2"><Download className="w-4 h-4"/> Baixar PDF</Button>
          )}
      </div>

      {/* MODAL PARA ADICIONAR PEDIDO MANUALMENTE */}
      <ModalContainer 
        open={showAddModal} 
        onClose={() => setShowAddModal(false)}
        title="Adicionar Pedido Avulso"
        description="Selecione pedidos pagos deste representante que ainda não foram comissionados."
        size="lg"
      >
          <div className="space-y-4">
              <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    placeholder="Buscar pedido ou cliente..." 
                    value={buscaPedidoAdd} 
                    onChange={(e) => setBuscaPedidoAdd(e.target.value)} 
                    className="pl-9"
                  />
              </div>
              <div className="max-h-[300px] overflow-y-auto border rounded-md">
                  <Table>
                      <TableHeader><TableRow><TableHead>Pedido</TableHead><TableHead>Cliente</TableHead><TableHead>Data Pgto</TableHead><TableHead>Valor</TableHead><TableHead></TableHead></TableRow></TableHeader>
                      <TableBody>
                          {pedidosDisponiveisParaAdicao.length === 0 ? (
                              <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">Nenhum pedido disponível para adicionar.</TableCell></TableRow>
                          ) : (
                              pedidosDisponiveisParaAdicao.map(p => (
                                  <TableRow key={p.id}>
                                      <TableCell>#{p.numero_pedido}</TableCell>
                                      <TableCell>{p.cliente_nome}</TableCell>
                                      <TableCell className="text-xs">{p.data_pagamento ? new Date(p.data_pagamento).toLocaleDateString() : '-'}</TableCell>
                                      <TableCell>{formatCurrency(p.valor_pedido)}</TableCell>
                                      <TableCell>
                                          <Button size="sm" variant="ghost" className="hover:bg-emerald-50 text-emerald-600" onClick={() => handleAdicionarPedidoManual(p)}>
                                              <Plus className="w-4 h-4"/> Adicionar
                                          </Button>
                                      </TableCell>
                                  </TableRow>
                              ))
                          )}
                      </TableBody>
                  </Table>
              </div>
              <div className="flex justify-end">
                  <Button variant="outline" onClick={() => setShowAddModal(false)}>Fechar</Button>
              </div>
          </div>
      </ModalContainer>

    </div>
  );
}