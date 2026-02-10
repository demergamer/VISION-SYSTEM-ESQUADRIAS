import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, Save, Lock, Trash2, Download, RefreshCw, Plus, Search, AlertTriangle, FileText, Loader2, ArrowLeftRight } from "lucide-react";
import { format } from 'date-fns';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import ModalContainer from "@/components/modals/ModalContainer";

export default function ComissaoDetalhes({ representante, mesAno, pedidosTodos, controles, onClose, onSuccessSave }) {
  const [pedidosEditaveis, setPedidosEditaveis] = useState(representante.pedidos || []);
  const [vales, setVales] = useState(representante.vales || 0);
  const [outrosDescontos, setOutrosDescontos] = useState(representante.outrosDescontos || 0);
  const [observacoes, setObservacoes] = useState(representante.observacoes || '');
  const [bulkPercent, setBulkPercent] = useState(''); 
  const [isFechado, setIsFechado] = useState(representante.status === 'fechado');
  const [controleId, setControleId] = useState(representante.controleId);
  const [loading, setLoading] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [buscaPedidoAdd, setBuscaPedidoAdd] = useState('');

  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

  const totais = useMemo(() => {
    const totalVendas = pedidosEditaveis.reduce((sum, p) => sum + (parseFloat(p.valorBaseComissao) || 0), 0);
    const totalComissoes = pedidosEditaveis.reduce((sum, p) => sum + (parseFloat(p.valorComissao) || 0), 0);
    const saldoFinal = totalComissoes - parseFloat(vales || 0) - parseFloat(outrosDescontos || 0);
    return { totalVendas, totalComissoes, saldoFinal };
  }, [pedidosEditaveis, vales, outrosDescontos]);

  // --- FILTRO DE ADIÇÃO (VISÃO DE TUDO) ---
  const pedidosDisponiveisParaAdicao = useMemo(() => {
      if (!pedidosTodos) return [];
      const codigoAtual = String(representante.codigo);

      // Mapeia onde cada pedido está atualmente
      const mapaPedidos = {};
      if (controles) {
          controles.forEach(c => {
              if (c.status === 'aberto' && c.referencia !== mesAno && c.representante_codigo === codigoAtual) {
                  c.pedidos_ajustados?.forEach(p => mapaPedidos[String(p.pedido_id)] = c.referencia);
              }
          });
      }

      return pedidosTodos.filter(p => {
          if (String(p.representante_codigo) !== codigoAtual) return false;
          if (p.status !== 'pago') return false; 
          if (p.comissao_paga === true) return false; // Se já foi pago em definitivo, sai.
          
          if (pedidosEditaveis.some(pe => pe.id === p.id)) return false; // Já está na lista atual

          if (buscaPedidoAdd) {
              const t = buscaPedidoAdd.toLowerCase();
              return p.numero_pedido?.toLowerCase().includes(t) || p.cliente_nome?.toLowerCase().includes(t);
          }
          
          // Adiciona metadado para saber se está em outro mês
          p.mes_atual_rascunho = mapaPedidos[String(p.id)];
          
          return true;
      });
  }, [pedidosTodos, representante, pedidosEditaveis, buscaPedidoAdd, controles, mesAno]);

  // --- HANDLERS ---
  const handleEditarPercentual = (pedidoId, novoPercentual) => {
    const pct = parseFloat(novoPercentual) || 0;
    setPedidosEditaveis(prev => prev.map(p => p.id === pedidoId ? { ...p, percentualComissao: pct, valorComissao: (parseFloat(p.valorBaseComissao) * pct) / 100 } : p));
  };

  const handleBulkChange = () => {
      const pct = parseFloat(bulkPercent);
      if (isNaN(pct)) return;
      setPedidosEditaveis(prev => prev.map(p => ({ ...p, percentualComissao: pct, valorComissao: (parseFloat(p.valorBaseComissao) * pct) / 100 })));
      toast.success(`Aplicado ${pct}%!`);
  };

  const handleRemoverPedido = (id) => {
      setPedidosEditaveis(prev => prev.filter(p => p.id !== id));
      toast.info("Removido (ficará disponível na data natural ou outros meses após salvar).");
  };

  const handleAdicionarPedidoManual = (pedido) => {
      const pct = pedido.porcentagem_comissao || representante.porcentagem_padrao || 5;
      const valorBase = parseFloat(pedido.total_pago) || 0;
      setPedidosEditaveis(prev => [...prev, { 
          ...pedido, 
          valorBaseComissao: valorBase, 
          percentualComissao: pct, 
          valorComissao: (valorBase * pct) / 100,
          // Flag para saber que precisamos remover do outro mês se ele tiver dono
          veio_de_outro_mes: pedido.mes_atual_rascunho
      }]);
      toast.success('Adicionado! (Salve para confirmar a transferência)');
  };

  // --- SALVAR RASCUNHO (COM ROUBO DE PEDIDOS) ---
  const handleSaveDraft = async () => {
      setLoading(true);
      try {
          // 1. Limpeza de outros rascunhos ("Roubo")
          // Identifica pedidos que vieram de outros meses
          const pedidosRoubados = pedidosEditaveis.filter(p => p.veio_de_outro_mes);
          
          if (pedidosRoubados.length > 0 && controles) {
              const idsRoubados = pedidosRoubados.map(p => String(p.id));
              
              // Para cada controle aberto de outro mês
              const controlesAfetados = controles.filter(c => c.status === 'aberto' && c.referencia !== mesAno && c.representante_codigo === String(representante.codigo));
              
              for (const controleOutro of controlesAfetados) {
                  // Filtra para manter apenas o que NÃO foi roubado
                  const novaLista = controleOutro.pedidos_ajustados.filter(p => !idsRoubados.includes(String(p.pedido_id)));
                  
                  // Se houve mudança, atualiza o outro controle
                  if (novaLista.length !== controleOutro.pedidos_ajustados.length) {
                      await base44.entities.ComissaoControle.update(controleOutro.id, {
                          pedidos_ajustados: novaLista
                      });
                  }
              }
          }

          // 2. Salvar o rascunho atual
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
              if (res && res.id) setControleId(res.id);
          }
          
          toast.success("Salvo! Dados atualizados.");
          if (onSuccessSave) onSuccessSave(); // Chama refresh no pai
      } catch (error) {
          toast.error("Erro ao salvar: " + error.message);
      } finally {
          setLoading(false);
      }
  };

  const handleGerarPDF = async () => {
      setGeneratingPdf(true);
      try {
          toast.loading("Gerando PDF...");
          const dadosParaPDF = {
              ...representante,
              pedidos: pedidosEditaveis,
              vales: parseFloat(vales),
              outrosDescontos: parseFloat(outrosDescontos),
              observacoes: observacoes,
              totalVendas: totais.totalVendas,
              totalComissoes: totais.totalComissoes,
              saldoAPagar: totais.saldoFinal,
              status: isFechado ? 'fechado' : 'aberto'
          };
          const response = await base44.functions.invoke('gerarRelatorioComissoes', { tipo: 'analitico', mes_ano: mesAno, representante: dadosParaPDF });
          const blob = new Blob([response.data], { type: 'application/pdf' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a'); a.href = url; a.download = `Comissao-${representante.nome}-${mesAno}.pdf`; document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url); a.remove();
          toast.dismiss(); toast.success("PDF gerado!");
      } catch (error) { toast.dismiss(); toast.error("Erro ao gerar PDF."); } finally { setGeneratingPdf(false); }
  };

  const handleFinalize = async () => {
      if (!representante.chave_pix) return toast.error("Sem Chave PIX.");
      if (!confirm("Finalizar?")) return;
      setLoading(true);
      try {
          // Mesma lógica de limpeza de roubo antes de finalizar
          const pedidosRoubados = pedidosEditaveis.filter(p => p.veio_de_outro_mes);
          if (pedidosRoubados.length > 0 && controles) {
              const idsRoubados = pedidosRoubados.map(p => String(p.id));
              const controlesAfetados = controles.filter(c => c.status === 'aberto' && c.referencia !== mesAno && c.representante_codigo === String(representante.codigo));
              for (const controleOutro of controlesAfetados) {
                  const novaLista = controleOutro.pedidos_ajustados.filter(p => !idsRoubados.includes(String(p.pedido_id)));
                  if (novaLista.length !== controleOutro.pedidos_ajustados.length) {
                      await base44.entities.ComissaoControle.update(controleOutro.id, { pedidos_ajustados: novaLista });
                  }
              }
          }

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
          let idF = controleId;
          if (idF) await base44.entities.ComissaoControle.update(idF, payload);
          else { const res = await base44.entities.ComissaoControle.create(payload); idF = res.id; }

          await Promise.all(pedidosEditaveis.map(p => 
             base44.entities.Pedido.update(p.id, { 
                 comissao_paga: true, 
                 comissao_fechamento_id: idF, 
                 comissao_referencia_paga: mesAno,
                 comissao_valor_base: parseFloat(p.valorBaseComissao)
             })
          ));
          setIsFechado(true); toast.success("Finalizado!"); 
          if (onSuccessSave) onSuccessSave();
          setTimeout(onClose, 1500);
      } catch (error) { toast.error("Erro."); } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      {!isFechado && (
          <Card className="p-4 bg-blue-50 border-blue-100 flex items-center justify-between">
              <div className="flex items-center gap-3"><div className="p-2 bg-blue-100 rounded-full"><RefreshCw className="w-4 h-4 text-blue-600"/></div><div><h4 className="font-bold text-sm text-blue-900">Alteração em Massa</h4><p className="text-xs text-blue-700">Defina uma % única.</p></div></div>
              <div className="flex items-center gap-2"><Input type="number" className="w-24 bg-white border-blue-200 h-9" placeholder="Ex: 3" value={bulkPercent} onChange={(e) => setBulkPercent(e.target.value)} /><Button size="sm" onClick={handleBulkChange} className="bg-blue-600 hover:bg-blue-700 text-white h-9">Aplicar</Button></div>
          </Card>
      )}

      <Card className="p-6 bg-white border-slate-200 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div><p className="text-xs text-slate-500 font-bold mb-1">Total Vendas (Pagas)</p><p className="font-bold text-emerald-600 text-xl">{formatCurrency(totais.totalVendas)}</p></div>
          <div><p className="text-xs text-slate-500 font-bold mb-1">Total Comissões</p><p className="font-bold text-blue-600 text-xl">{formatCurrency(totais.totalComissoes)}</p></div>
          <div><p className="text-xs text-slate-500 font-bold mb-1">(-) Vales / Adiant.</p><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">R$</span><Input type="number" className="pl-8 h-9 font-bold text-red-600" value={vales} onChange={(e) => setVales(e.target.value)} disabled={isFechado}/></div></div>
          <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100"><p className="text-xs text-emerald-700 font-bold mb-1">Saldo a Pagar</p><p className="font-bold text-emerald-800 text-2xl">{formatCurrency(totais.saldoFinal)}</p></div>
        </div>
      </Card>

      {!isFechado && <div className="flex justify-end"><Button onClick={() => setShowAddModal(true)} variant="outline" className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"><Plus className="w-4 h-4"/> Adicionar Pedido (Antecipar/Mover)</Button></div>}

      <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
        <Table>
            <TableHeader className="bg-slate-50">
                <TableRow>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Data Pgto</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right text-blue-600">Base Calc. (Pago)</TableHead>
                    <TableHead className="text-center w-[120px]">% Com.</TableHead>
                    <TableHead className="text-right">Comissão</TableHead>
                    {!isFechado && <TableHead className="w-[50px]"></TableHead>}
                </TableRow>
            </TableHeader>
            <TableBody>
                {pedidosEditaveis.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-slate-400">Nenhum pedido.</TableCell></TableRow> : 
                    pedidosEditaveis.map(p => (
                        <TableRow key={p.id}>
                            <TableCell className="font-medium text-slate-700">#{p.numero_pedido}</TableCell>
                            <TableCell className="text-xs text-slate-500">{new Date(p.data_pagamento).toLocaleDateString()}</TableCell>
                            <TableCell className="text-sm text-slate-600">{p.cliente_nome}</TableCell>
                            <TableCell className="text-right font-medium text-blue-700">{formatCurrency(p.valorBaseComissao)}</TableCell>
                            <TableCell className="text-center p-2">
                                {isFechado ? <Badge variant="outline">{p.percentualComissao}%</Badge> : <div className="flex justify-center items-center gap-1"><Input type="number" className="h-8 w-16 text-center px-1" value={p.percentualComissao} onChange={(e) => handleEditarPercentual(p.id, e.target.value)}/><span className="text-xs text-slate-400">%</span></div>}
                            </TableCell>
                            <TableCell className="text-right font-bold text-emerald-600">{formatCurrency(p.valorComissao)}</TableCell>
                            {!isFechado && <TableCell><Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleRemoverPedido(p.id)}><Trash2 className="w-4 h-4" /></Button></TableCell>}
                        </TableRow>
                    ))
                }
            </TableBody>
        </Table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2"><label className="text-sm font-bold text-slate-700">Outros Descontos</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">R$</span><Input type="number" className="pl-8" value={outrosDescontos} onChange={(e) => setOutrosDescontos(e.target.value)} disabled={isFechado} /></div></div>
          <div className="space-y-2"><label className="text-sm font-bold text-slate-700">Observações</label><Textarea placeholder="Detalhes..." value={observacoes} onChange={(e) => setObservacoes(e.target.value)} disabled={isFechado} className="resize-none" /></div>
      </div>

      <div className="flex items-center justify-between gap-3 pt-4 border-t mt-4">
          <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} disabled={loading}>Fechar/Cancelar</Button>
              <Button variant="outline" onClick={handleGerarPDF} disabled={generatingPdf} className="gap-2 border-purple-200 text-purple-700 hover:bg-purple-50">
                {generatingPdf ? <Loader2 className="w-4 h-4 animate-spin"/> : <FileText className="w-4 h-4"/>}
                {isFechado ? "Baixar Relatório" : "Prévia PDF"}
              </Button>
          </div>
          {!isFechado && (
              <div className="flex gap-2">
                <Button onClick={handleSaveDraft} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 min-w-[140px]">{loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} Salvar</Button>
                <Button onClick={handleFinalize} disabled={loading || !representante.chave_pix} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 min-w-[140px] disabled:opacity-50" title={!representante.chave_pix ? "Necessário PIX" : ""}><Lock className="w-4 h-4"/> Finalizar</Button>
              </div>
          )}
      </div>

      <ModalContainer open={showAddModal} onClose={() => setShowAddModal(false)} title="Adicionar Pedido Avulso" description="Pedidos pagos disponíveis." size="lg">
          <div className="space-y-4">
              <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input placeholder="Buscar..." value={buscaPedidoAdd} onChange={(e) => setBuscaPedidoAdd(e.target.value)} className="pl-9"/></div>
              <div className="max-h-[300px] overflow-y-auto border rounded-md">
                  <Table>
                      <TableHeader><TableRow><TableHead>Pedido</TableHead><TableHead>Cliente</TableHead><TableHead>Data Pgto</TableHead><TableHead>Vlr Pago</TableHead><TableHead></TableHead></TableRow></TableHeader>
                      <TableBody>
                          {pedidosDisponiveisParaAdicao.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">Nada encontrado.</TableCell></TableRow> : 
                              pedidosDisponiveisParaAdicao.map(p => (
                                  <TableRow key={p.id}>
                                      <TableCell>#{p.numero_pedido}</TableCell>
                                      <TableCell>
                                          <div>{p.cliente_nome}</div>
                                          {p.mes_atual_rascunho && <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-200 mt-1">Em {p.mes_atual_rascunho}</Badge>}
                                      </TableCell>
                                      <TableCell className="text-xs">{p.data_pagamento ? new Date(p.data_pagamento).toLocaleDateString() : '-'}</TableCell>
                                      <TableCell className="font-bold text-emerald-600">{formatCurrency(p.total_pago)}</TableCell>
                                      <TableCell>
                                          <Button size="sm" variant="ghost" className="hover:bg-emerald-50 text-emerald-600" onClick={() => handleAdicionarPedidoManual(p)}>
                                              {p.mes_atual_rascunho ? <ArrowLeftRight className="w-4 h-4 text-amber-600"/> : <Plus className="w-4 h-4"/>}
                                          </Button>
                                      </TableCell>
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