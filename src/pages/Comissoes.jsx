import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  DollarSign, Save, Lock, Trash2, Download, RefreshCw, Plus, Search, AlertCircle, X, Loader2
} from "lucide-react";
import { format } from 'date-fns';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import ModalContainer from "@/components/modals/ModalContainer";

export default function ComissaoDetalhes({ representante, mesAno, pedidosTodos, onClose }) {
  // Inicialização Segura dos Estados
  const [pedidosEditaveis, setPedidosEditaveis] = useState(representante.pedidos || []);
  const [vales, setVales] = useState(representante.vales || 0);
  const [outrosDescontos, setOutrosDescontos] = useState(representante.outrosDescontos || 0);
  const [observacoes, setObservacoes] = useState(representante.observacoes || '');
  const [bulkPercent, setBulkPercent] = useState(''); 
  const [isFechado, setIsFechado] = useState(representante.status === 'fechado');
  
  // Estado do ID de Controle (Criar vs Atualizar)
  const [controleId, setControleId] = useState(representante.controleId);
  const [loading, setLoading] = useState(false);
  
  // Modal Adicionar
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

  // --- BUSCA PEDIDOS PARA ADICIONAR ---
  const pedidosDisponiveisParaAdicao = useMemo(() => {
      if (!pedidosTodos) return [];
      const codigoAtual = String(representante.codigo);

      return pedidosTodos.filter(p => {
          // Filtros Básicos
          if (String(p.representante_codigo) !== codigoAtual) return false;
          if (p.status !== 'pago') return false;
          
          // Filtro de Segurança: Já foi pago?
          if (p.comissao_paga === true) return false;

          // Filtro Visual: Já está na lista?
          if (pedidosEditaveis.some(pe => pe.id === p.id)) return false;

          // Busca Texto
          if (buscaPedidoAdd) {
              const t = buscaPedidoAdd.toLowerCase();
              return p.numero_pedido?.toLowerCase().includes(t) || p.cliente_nome?.toLowerCase().includes(t);
          }
          return true;
      });
  }, [pedidosTodos, representante, pedidosEditaveis, buscaPedidoAdd]);

  // --- HANDLERS ---
  const handleEditarPercentual = (pedidoId, novoPercentual) => {
    const pct = parseFloat(novoPercentual);
    const valorPct = isNaN(pct) ? 0 : pct;
    setPedidosEditaveis(prev => prev.map(p => p.id === pedidoId ? { ...p, percentualComissao: valorPct, valorComissao: (parseFloat(p.valor_pedido) * valorPct) / 100 } : p));
  };

  const handleBulkChange = () => {
      const pct = parseFloat(bulkPercent);
      if (isNaN(pct)) return;
      setPedidosEditaveis(prev => prev.map(p => ({ ...p, percentualComissao: pct, valorComissao: (parseFloat(p.valor_pedido) * pct) / 100 })));
      toast.success(`Aplicado ${pct}% para todos!`);
  };

  const handleRemoverPedido = (id) => setPedidosEditaveis(prev => prev.filter(p => p.id !== id));

  const handleAdicionarPedidoManual = (pedido) => {
      const pct = pedido.porcentagem_comissao || representante.porcentagem_padrao || 5;
      setPedidosEditaveis(prev => [...prev, { ...pedido, percentualComissao: pct, valorComissao: (parseFloat(pedido.valor_pedido) * pct) / 100 }]);
      toast.success('Pedido adicionado!');
  };

  // --- SALVAR (CORRIGIDO) ---
  const handleSaveDraft = async () => {
      setLoading(true);
      try {
          const payload = {
              referencia: String(mesAno),
              representante_codigo: String(representante.codigo),
              representante_nome: String(representante.nome),
              vales: parseFloat(vales || 0),
              outros_descontos: parseFloat(outrosDescontos || 0),
              observacao: String(observacoes || ''),
              status: 'aberto',
              total_pago: parseFloat(totais.saldoFinal),
              pedidos_ajustados: pedidosEditaveis.map(p => ({
                  pedido_id: String(p.id),
                  percentual: parseFloat(p.percentualComissao || 0)
              }))
          };

          if (controleId) {
              await base44.entities.ComissaoControle.update(controleId, payload);
          } else {
              const res = await base44.entities.ComissaoControle.create(payload);
              if (res && res.id) setControleId(res.id); // Salva ID para próximo update
          }
          toast.success("Rascunho salvo com sucesso!");
      } catch (error) {
          console.error(error);
          toast.error("Erro ao salvar: " + error.message);
      } finally {
          setLoading(false);
      }
  };

  // --- FINALIZAR ---
  const handleFinalize = async () => {
      if (!representante.chave_pix) {
          return toast.error("Representante sem Chave PIX cadastrada.");
      }
      if (!confirm("Deseja realmente finalizar? Isso gerará o Contas a Pagar.")) return;
      
      setLoading(true);
      try {
          const payload = {
              referencia: String(mesAno),
              representante_codigo: String(representante.codigo),
              representante_nome: String(representante.nome),
              vales: parseFloat(vales || 0),
              outros_descontos: parseFloat(outrosDescontos || 0),
              observacao: String(observacoes || ''),
              status: 'fechado',
              data_fechamento: new Date().toISOString(),
              total_pago: parseFloat(totais.saldoFinal),
              pedidos_ajustados: pedidosEditaveis.map(p => ({ pedido_id: String(p.id), percentual: parseFloat(p.percentualComissao || 0) }))
          };

          let finalId = controleId;
          if (finalId) {
              await base44.entities.ComissaoControle.update(finalId, payload);
          } else {
              const res = await base44.entities.ComissaoControle.create(payload);
              finalId = res.id;
          }

          // Travar pedidos
          await Promise.all(pedidosEditaveis.map(p => 
             base44.entities.Pedido.update(p.id, { 
                 comissao_paga: true, 
                 comissao_fechamento_id: finalId, 
                 comissao_referencia_paga: mesAno 
             })
          ));

          setIsFechado(true);
          toast.success("Comissão Finalizada!");
          setTimeout(onClose, 1500);
      } catch (error) {
          toast.error("Erro ao finalizar.");
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER DE FERRAMENTAS */}
      {!isFechado && (
          <Card className="p-4 bg-blue-50 border-blue-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-full"><RefreshCw className="w-4 h-4 text-blue-600"/></div>
                  <div><h4 className="font-bold text-sm text-blue-900">Alteração em Massa</h4><p className="text-xs text-blue-700">Defina uma % única para a lista.</p></div>
              </div>
              <div className="flex items-center gap-2">
                  <Input type="number" className="w-24 bg-white border-blue-200 h-9" placeholder="Ex: 3" value={bulkPercent} onChange={(e) => setBulkPercent(e.target.value)} />
                  <Button size="sm" onClick={handleBulkChange} className="bg-blue-600 hover:bg-blue-700 text-white h-9">Aplicar</Button>
              </div>
          </Card>
      )}

      {/* RESUMO */}
      <Card className="p-6 bg-white border-slate-200 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div><p className="text-xs text-slate-500 font-bold mb-1">Total Vendas</p><p className="font-bold text-emerald-600 text-xl">{formatCurrency(totais.totalVendas)}</p></div>
          <div><p className="text-xs text-slate-500 font-bold mb-1">Total Comissões</p><p className="font-bold text-blue-600 text-xl">{formatCurrency(totais.totalComissoes)}</p></div>
          <div>
            <p className="text-xs text-slate-500 font-bold mb-1">(-) Vales / Adiant.</p>
            <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">R$</span><Input type="number" className="pl-8 h-9 font-bold text-red-600" value={vales} onChange={(e) => setVales(e.target.value)} disabled={isFechado}/></div>
          </div>
          <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
            <p className="text-xs text-emerald-700 font-bold mb-1">Saldo a Pagar</p>
            <p className="font-bold text-emerald-800 text-2xl">{formatCurrency(totais.saldoFinal)}</p>
          </div>
        </div>
      </Card>

      {/* BOTÃO ADICIONAR */}
      {!isFechado && (
          <div className="flex justify-end">
              <Button onClick={() => setShowAddModal(true)} variant="outline" className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"><Plus className="w-4 h-4"/> Adicionar Pedido (Antecipar)</Button>
          </div>
      )}

      {/* TABELA */}
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
                {pedidosEditaveis.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-400">Nenhum pedido nesta lista.</TableCell></TableRow> : 
                    pedidosEditaveis.map(pedido => (
                        <TableRow key={pedido.id}>
                            <TableCell className="font-medium text-slate-700">#{pedido.numero_pedido}</TableCell>
                            <TableCell className="text-xs text-slate-500">{new Date(pedido.data_pagamento).toLocaleDateString()}</TableCell>
                            <TableCell className="text-sm text-slate-600">{pedido.cliente_nome}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(pedido.valor_pedido)}</TableCell>
                            <TableCell className="text-center p-2">
                                {isFechado ? <Badge variant="outline">{pedido.percentualComissao}%</Badge> : 
                                    <div className="flex justify-center items-center gap-1">
                                        <Input type="number" className="h-8 w-16 text-center px-1" value={pedido.percentualComissao} onChange={(e) => handleEditarPercentual(pedido.id, e.target.value)}/>
                                        <span className="text-xs text-slate-400">%</span>
                                    </div>
                                }
                            </TableCell>
                            <TableCell className="text-right font-bold text-emerald-600">{formatCurrency(pedido.valorComissao)}</TableCell>
                            {!isFechado && <TableCell><Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleRemoverPedido(pedido.id)}><Trash2 className="w-4 h-4" /></Button></TableCell>}
                        </TableRow>
                    ))
                }
            </TableBody>
        </Table>
      </div>

      {/* OUTROS CAMPOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Outros Descontos</label>
              <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">R$</span><Input type="number" className="pl-8" value={outrosDescontos} onChange={(e) => setOutrosDescontos(e.target.value)} disabled={isFechado} /></div>
          </div>
          <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Observações</label>
              <Textarea placeholder="Detalhes..." value={observacoes} onChange={(e) => setObservacoes(e.target.value)} disabled={isFechado} className="resize-none" />
          </div>
      </div>

      {/* FOOTER */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t mt-4">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          {!isFechado ? (
              <>
                <Button onClick={handleSaveDraft} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 min-w-[140px]">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} Salvar Alterações
                </Button>
                <Button onClick={handleFinalize} disabled={loading || !representante.chave_pix} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 min-w-[140px] disabled:opacity-50" title={!representante.chave_pix ? "Necessário PIX" : ""}>
                    <Lock className="w-4 h-4"/> Finalizar
                </Button>
              </>
          ) : (
              <Button variant="outline" className="gap-2"><Download className="w-4 h-4"/> Baixar PDF</Button>
          )}
      </div>

      {/* MODAL ADICIONAR */}
      <ModalContainer open={showAddModal} onClose={() => setShowAddModal(false)} title="Adicionar Pedido Avulso" description="Pedidos pagos não comissionados." size="lg">
          <div className="space-y-4">
              <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input placeholder="Buscar..." value={buscaPedidoAdd} onChange={(e) => setBuscaPedidoAdd(e.target.value)} className="pl-9"/></div>
              <div className="max-h-[300px] overflow-y-auto border rounded-md">
                  <Table>
                      <TableHeader><TableRow><TableHead>Pedido</TableHead><TableHead>Cliente</TableHead><TableHead>Data Pgto</TableHead><TableHead>Valor</TableHead><TableHead></TableHead></TableRow></TableHeader>
                      <TableBody>
                          {pedidosDisponiveisParaAdicao.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">Nada encontrado.</TableCell></TableRow> : 
                              pedidosDisponiveisParaAdicao.map(p => (
                                  <TableRow key={p.id}>
                                      <TableCell>#{p.numero_pedido}</TableCell>
                                      <TableCell>{p.cliente_nome}</TableCell>
                                      <TableCell className="text-xs">{p.data_pagamento ? new Date(p.data_pagamento).toLocaleDateString() : '-'}</TableCell>
                                      <TableCell>{formatCurrency(p.valor_pedido)}</TableCell>
                                      <TableCell><Button size="sm" variant="ghost" className="hover:bg-emerald-50 text-emerald-600" onClick={() => handleAdicionarPedidoManual(p)}><Plus className="w-4 h-4"/> Adicionar</Button></TableCell>
                                  </TableRow>
                              ))
                          }
                      </TableBody>
                  </Table>
              </div>
              <div className="flex justify-end"><Button variant="outline" onClick={() => setShowAddModal(false)}>Fechar</Button></div>
          </div>
      </ModalContainer>
    </div>
  );
}