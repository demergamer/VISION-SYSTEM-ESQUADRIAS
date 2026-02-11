import React, { useState, useMemo, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, Save, Lock, Trash2, Download, RefreshCw, Plus, Search, AlertTriangle, FileText, Loader2, Calendar, ChevronLeft, ChevronRight, ArrowLeftRight, RotateCcw } from "lucide-react";
import { format, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import ModalContainer from "@/components/modals/ModalContainer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ComissaoDetalhes({ 
  representante, 
  mesAno, 
  pedidosTodos = [], 
  controles, 
  onClose, 
  onSuccessSave,
  isPortal = false, 
  onChangeMonth 
}) {
  const [pedidosEditaveis, setPedidosEditaveis] = useState([]);
  const [vales, setVales] = useState(0);
  const [outrosDescontos, setOutrosDescontos] = useState(0);
  const [observacoes, setObservacoes] = useState('');
  const [bulkPercent, setBulkPercent] = useState(''); 
  const [isFechado, setIsFechado] = useState(false);
  const [controleId, setControleId] = useState(null); // ID do FechamentoComissao
  
  const [loading, setLoading] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [buscaPedidoAdd, setBuscaPedidoAdd] = useState('');

  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

  // --- BUSCA INICIAL DE DADOS (CRUCIAL PARA CORRIGIR O STATUS) ---
  useEffect(() => {
      const carregarDadosReais = async () => {
          try {
              // 1. Tenta achar um fechamento existente no banco para garantir o ID e Status corretos
              const fechamentos = await base44.entities.FechamentoComissao.list({
                  filters: {
                      representante_codigo: representante.codigo,
                      mes_ano: mesAno
                  }
              });

              const fechamentoExistente = fechamentos && fechamentos.length > 0 ? fechamentos[0] : null;

              if (fechamentoExistente) {
                  console.log("Fechamento encontrado:", fechamentoExistente);
                  setControleId(fechamentoExistente.id);
                  setIsFechado(fechamentoExistente.status === 'fechado');
                  
                  // Preenche valores salvos
                  setVales(fechamentoExistente.vales_adiantamentos || 0);
                  setOutrosDescontos(fechamentoExistente.outros_descontos || 0);
                  setObservacoes(fechamentoExistente.observacoes || '');

                  // Se tiver pedidos salvos (snapshot), usa eles.
                  if (fechamentoExistente.pedidos_detalhes && fechamentoExistente.pedidos_detalhes.length > 0) {
                      setPedidosEditaveis(fechamentoExistente.pedidos_detalhes.map(p => ({
                          id: p.pedido_id,
                          numero_pedido: p.numero_pedido,
                          cliente_nome: p.cliente_nome,
                          data_pagamento: p.data_pagamento,
                          valorBaseComissao: parseFloat(p.valor_pedido || 0),
                          percentualComissao: parseFloat(p.percentual_comissao || 0),
                          valorComissao: parseFloat(p.valor_comissao || 0),
                          veio_do_snapshot: true
                      })));
                      return; // Sai daqui pois já carregou tudo
                  }
              } else {
                  console.log("Nenhum fechamento salvo. Iniciando modo rascunho.");
                  setControleId(null);
                  setIsFechado(false);
                  setVales(representante.vales || 0);
                  setOutrosDescontos(representante.outrosDescontos || 0);
                  setObservacoes(representante.observacoes || '');
              }

              // 2. Se não carregou do snapshot (é novo ou rascunho sem detalhes), calcula os pedidos elegíveis
              if (pedidosTodos.length > 0) {
                  const codigoRep = String(representante.codigo);
                  const listaInicial = pedidosTodos.filter(p => {
                      const mesmoRep = String(p.representante_codigo) === codigoRep;
                      const estaPago = p.status === 'pago'; 
                      // Se já existe fechamento (mesmo aberto), e o pedido está nele, ok. 
                      // Se não, só pega os que não tem comissão paga.
                      const semComissao = !p.comissao_paga || (fechamentoExistente && p.comissao_fechamento_id === fechamentoExistente.id); 
                      return mesmoRep && estaPago && semComissao;
                  }).map(p => ({
                      ...p,
                      valorBaseComissao: parseFloat(p.total_pago || 0),
                      percentualComissao: p.porcentagem_comissao || representante.porcentagem_padrao || 5,
                      valorComissao: (parseFloat(p.total_pago || 0) * (p.porcentagem_comissao || representante.porcentagem_padrao || 5)) / 100
                  }));
                  setPedidosEditaveis(listaInicial);
              } else {
                  setPedidosEditaveis([]);
              }

          } catch (error) {
              console.error("Erro ao carregar comissão:", error);
              toast.error("Erro ao carregar dados.");
          }
      };

      carregarDadosReais();
  }, [representante, mesAno, pedidosTodos]);

  // Totais
  const totais = useMemo(() => {
    // Se fechado, confia nos totais do banco se disponíveis, senão recalcula
    if (isFechado) {
        // Lógica simplificada: sempre recalcula visualmente para bater com a tabela
        // mas em produção, usar os valores fixos é mais seguro. 
        // Vamos recalcular aqui para garantir que o visual "R$ 0,00" do Adriano suma.
    }
    const totalVendas = pedidosEditaveis.reduce((sum, p) => sum + (parseFloat(p.valorBaseComissao) || 0), 0);
    const totalComissoes = pedidosEditaveis.reduce((sum, p) => sum + (parseFloat(p.valorComissao) || 0), 0);
    const saldoFinal = totalComissoes - parseFloat(vales || 0) - parseFloat(outrosDescontos || 0);
    return { totalVendas, totalComissoes, saldoFinal };
  }, [pedidosEditaveis, vales, outrosDescontos, isFechado]);

  // Filtro Modal Adicionar
  const pedidosDisponiveisParaAdicao = useMemo(() => {
      if (isPortal || !pedidosTodos || isFechado) return []; 
      const codigoAtual = String(representante.codigo);
      return pedidosTodos.filter(p => {
          if (String(p.representante_codigo) !== codigoAtual) return false;
          if (p.status !== 'pago') return false; 
          if (p.comissao_paga === true) return false; 
          if (pedidosEditaveis.some(pe => String(pe.id) === String(p.id))) return false; 
          if (buscaPedidoAdd) {
              const t = buscaPedidoAdd.toLowerCase();
              return p.numero_pedido?.toLowerCase().includes(t) || p.cliente_nome?.toLowerCase().includes(t);
          }
          return true;
      });
  }, [pedidosTodos, representante, pedidosEditaveis, buscaPedidoAdd, isFechado, isPortal]);

  // Handlers
  const handleEditarPercentual = (pedidoId, novoPercentual) => {
    if (isPortal || isFechado) return;
    const pct = parseFloat(novoPercentual) || 0;
    setPedidosEditaveis(prev => prev.map(p => p.id === pedidoId ? { ...p, percentualComissao: pct, valorComissao: (parseFloat(p.valorBaseComissao) * pct) / 100 } : p));
  };

  const handleBulkChange = () => {
      if (isPortal || isFechado) return;
      const pct = parseFloat(bulkPercent);
      if (isNaN(pct)) return;
      setPedidosEditaveis(prev => prev.map(p => ({ ...p, percentualComissao: pct, valorComissao: (parseFloat(p.valorBaseComissao) * pct) / 100 })));
      toast.success(`Aplicado ${pct}%!`);
  };

  const handleRemoverPedido = (id) => {
      if (isPortal || isFechado) return;
      setPedidosEditaveis(prev => prev.filter(p => p.id !== id));
  };

  const handleAdicionarPedidoManual = (pedido) => {
      if (isPortal || isFechado) return;
      const pct = pedido.porcentagem_comissao || representante.porcentagem_padrao || 5;
      const valorBase = parseFloat(pedido.total_pago) || 0;
      setPedidosEditaveis(prev => [...prev, { 
          ...pedido, 
          valorBaseComissao: valorBase, 
          percentualComissao: pct, 
          valorComissao: (valorBase * pct) / 100,
          veio_de_outro_mes: pedido.mes_atual_rascunho
      }]);
      toast.success('Adicionado!');
  };

  // ACTIONS

  const handleSaveDraft = async () => {
      if (isPortal) return;
      setLoading(true);
      try {
          const payload = {
              mes_ano: String(mesAno),
              representante_codigo: String(representante.codigo),
              representante_nome: String(representante.nome),
              representante_chave_pix: representante.chave_pix || '',
              status: 'aberto',
              vales_adiantamentos: parseFloat(vales || 0),
              outros_descontos: parseFloat(outrosDescontos || 0),
              observacoes: String(observacoes || ''),
              total_vendas: totais.totalVendas,
              total_comissoes_bruto: totais.totalComissoes,
              valor_liquido: totais.saldoFinal,
              pedidos_detalhes: pedidosEditaveis.map(p => ({
                  pedido_id: String(p.id),
                  numero_pedido: p.numero_pedido,
                  cliente_nome: p.cliente_nome,
                  data_pagamento: p.data_pagamento,
                  valor_pedido: parseFloat(p.valorBaseComissao),
                  percentual_comissao: parseFloat(p.percentualComissao),
                  valor_comissao: parseFloat(p.valorComissao)
              }))
          };

          if (controleId) {
              await base44.entities.FechamentoComissao.update(controleId, payload);
          } else { 
              const res = await base44.entities.FechamentoComissao.create(payload); 
              if(res?.id) setControleId(res.id); 
          }
          
          toast.success("Rascunho salvo!");
          if (onSuccessSave) onSuccessSave();
      } catch (error) { toast.error("Erro ao salvar."); } finally { setLoading(false); }
  };

  const handleFinalize = async () => {
      if (isPortal) return;
      if (!representante.chave_pix) { toast.error("Representante sem Chave PIX."); return; }
      if (!confirm(`Confirma fechamento de ${formatCurrency(totais.saldoFinal)}?`)) return;
      
      setLoading(true);
      try {
          // 1. Snapshot
          const snapshotPedidos = pedidosEditaveis.map(p => ({
              pedido_id: String(p.id),
              numero_pedido: p.numero_pedido,
              cliente_nome: p.cliente_nome,
              data_pagamento: p.data_pagamento,
              valor_pedido: parseFloat(p.valorBaseComissao),
              percentual_comissao: parseFloat(p.percentualComissao),
              valor_comissao: parseFloat(p.valorComissao)
          }));

          const payloadFechamento = {
              mes_ano: String(mesAno),
              representante_codigo: String(representante.codigo),
              representante_nome: String(representante.nome),
              representante_chave_pix: representante.chave_pix || '',
              status: 'fechado', // IMPORTANTE
              data_fechamento: new Date().toISOString(),
              vales_adiantamentos: parseFloat(vales || 0),
              outros_descontos: parseFloat(outrosDescontos || 0),
              observacoes: String(observacoes || ''),
              total_vendas: totais.totalVendas,
              total_comissoes_bruto: totais.totalComissoes,
              valor_liquido: totais.saldoFinal,
              pedidos_detalhes: snapshotPedidos,
              fechado_por: 'sistema'
          };

          // 2. Salva/Cria Fechamento
          let finalId = controleId;
          if (finalId) {
             await base44.entities.FechamentoComissao.update(finalId, payloadFechamento);
          } else {
             const res = await base44.entities.FechamentoComissao.create(payloadFechamento);
             finalId = res.id;
          }

          // 3. Cria Conta a Pagar
          const contaPagar = await base44.entities.ContaPagar.create({
              fornecedor_codigo: representante.codigo,
              fornecedor_nome: representante.nome,
              descricao: `Comissão Ref: ${mesAno} - ${representante.nome}`,
              valor: parseFloat(totais.saldoFinal),
              data_vencimento: new Date().toISOString(),
              status: 'pendente',
              categoria_financeira: 'comissoes',
              tipo_lancamento: 'unica',
              observacao: `Fechamento #${finalId}. PIX: ${representante.chave_pix}`,
              origem_id: finalId,
              origem_tipo: 'fechamento_comissao'
          });

          // 4. Vínculo Reverso (REFORÇANDO STATUS FECHADO)
          await base44.entities.FechamentoComissao.update(finalId, { 
              pagamento_id: contaPagar.id,
              status: 'fechado' // Força novamente para garantir
          });

          // 5. Baixa nos Pedidos
          const promisesPedidos = pedidosEditaveis.map(p => 
              base44.entities.Pedido.update(p.id, { 
                  comissao_paga: true, 
                  comissao_mes_ano_pago: mesAno,
                  comissao_fechamento_id: finalId
              })
          );
          await Promise.all(promisesPedidos);

          setIsFechado(true);
          setControleId(finalId);
          toast.success("Finalizado com sucesso!");
          
          if (onSuccessSave) onSuccessSave();

      } catch (error) {
          console.error(error);
          toast.error("Erro ao finalizar.");
      } finally {
          setLoading(false);
      }
  };

  const handleReopen = async () => {
      if (isPortal || !isFechado || !controleId) return;
      if (!confirm("Deseja reabrir? A conta a pagar será excluída.")) return;

      setReopening(true);
      try {
          const fechamentoAtual = await base44.entities.FechamentoComissao.getById(controleId);
          if (fechamentoAtual.pagamento_id) {
              const conta = await base44.entities.ContaPagar.getById(fechamentoAtual.pagamento_id);
              if (conta && (conta.status === 'pago' || conta.status === 'parcial')) {
                  toast.error("Bloqueado: Conta já paga.");
                  setReopening(false);
                  return;
              }
              if (conta) await base44.entities.ContaPagar.delete(conta.id);
          }

          const promisesPedidos = pedidosEditaveis.map(p => 
              base44.entities.Pedido.update(p.id, { comissao_paga: false, comissao_mes_ano_pago: null, comissao_fechamento_id: null })
          );
          await Promise.all(promisesPedidos);

          await base44.entities.FechamentoComissao.update(controleId, { status: 'aberto', pagamento_id: null, data_fechamento: null });

          toast.success("Reaberto!");
          setIsFechado(false);
          if (onSuccessSave) onSuccessSave();

      } catch (error) { toast.error("Erro ao reabrir."); } finally { setReopening(false); }
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
          const a = document.createElement('a'); a.href = url; a.download = `Comissao-${representante.nome}.pdf`; document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url); a.remove();
          toast.dismiss(); toast.success("PDF gerado!");
      } catch (error) { toast.dismiss(); toast.error("Erro PDF."); } finally { setGeneratingPdf(false); }
  };

  const mesesNavegacao = useMemo(() => {
      const lista = []; const dataAtual = new Date();
      lista.push(addMonths(dataAtual, 1)); lista.push(dataAtual);
      for (let i = 1; i <= 11; i++) lista.push(subMonths(dataAtual, i));
      return lista.map(d => ({ value: format(d, 'yyyy-MM'), label: format(d, 'MMMM yyyy', { locale: ptBR }).toUpperCase(), isFuture: d > dataAtual }));
  }, []);

  return (
    <div className="space-y-6">
      {isPortal && (
          <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4 mb-2">
              <div className="flex items-center gap-2"><Calendar className="w-5 h-5 text-purple-600" /><span className="font-bold text-slate-700">Período:</span></div>
              <div className="w-full md:w-64"><Select value={mesAno} onValueChange={onChangeMonth}><SelectTrigger className="bg-white"><SelectValue /></SelectTrigger><SelectContent>{mesesNavegacao.map(m => (<SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>))}</SelectContent></Select></div>
          </div>
      )}

      {!isPortal && !isFechado && (
          <Card className="p-4 bg-blue-50 border-blue-100 flex items-center justify-between">
              <div className="flex items-center gap-3"><div className="p-2 bg-blue-100 rounded-full"><RefreshCw className="w-4 h-4 text-blue-600"/></div><div><h4 className="font-bold text-sm text-blue-900">Alteração em Massa</h4><p className="text-xs text-blue-700">Defina uma % única.</p></div></div>
              <div className="flex items-center gap-2"><Input type="number" className="w-24 bg-white border-blue-200 h-9" placeholder="Ex: 3" value={bulkPercent} onChange={(e) => setBulkPercent(e.target.value)} /><Button size="sm" onClick={handleBulkChange} className="bg-blue-600 hover:bg-blue-700 text-white h-9">Aplicar</Button></div>
          </Card>
      )}

      <Card className="p-6 bg-white border-slate-200 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div><p className="text-xs text-slate-500 font-bold mb-1">Total Vendas (Pagas)</p><p className="font-bold text-emerald-600 text-xl">{formatCurrency(totais.totalVendas)}</p></div>
          <div><p className="text-xs text-slate-500 font-bold mb-1">Total Comissões</p><p className="font-bold text-blue-600 text-xl">{formatCurrency(totais.totalComissoes)}</p></div>
          <div><p className="text-xs text-slate-500 font-bold mb-1">(-) Vales / Adiant.</p>
            <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">R$</span><Input type="number" className="pl-8 h-9 font-bold text-red-600" value={vales} onChange={(e) => setVales(e.target.value)} disabled={isFechado || isPortal}/></div>
          </div>
          <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100"><p className="text-xs text-emerald-700 font-bold mb-1">Saldo a Pagar</p><p className="font-bold text-emerald-800 text-2xl">{formatCurrency(totais.saldoFinal)}</p></div>
        </div>
      </Card>

      {!isPortal && !isFechado && <div className="flex justify-end"><Button onClick={() => setShowAddModal(true)} variant="outline" className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"><Plus className="w-4 h-4"/> Adicionar Pedido (Antecipar)</Button></div>}

      <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
        <Table>
            <TableHeader className="bg-slate-50">
                <TableRow>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Data Pgto</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right text-blue-600">Base Calc.</TableHead>
                    <TableHead className="text-center w-[120px]">% Com.</TableHead>
                    <TableHead className="text-right">Comissão</TableHead>
                    {!isPortal && !isFechado && <TableHead className="w-[50px]"></TableHead>}
                </TableRow>
            </TableHeader>
            <TableBody>
                {pedidosEditaveis.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-400">Nenhum pedido neste fechamento.</TableCell></TableRow> : 
                    pedidosEditaveis.map(p => (
                        <TableRow key={p.id}>
                            <TableCell className="font-medium text-slate-700">#{p.numero_pedido}</TableCell>
                            <TableCell className="text-xs text-slate-500">{p.data_pagamento ? new Date(p.data_pagamento).toLocaleDateString() : '-'}</TableCell>
                            <TableCell className="text-sm text-slate-600">{p.cliente_nome}</TableCell>
                            <TableCell className="text-right font-medium text-blue-700">{formatCurrency(p.valorBaseComissao)}</TableCell>
                            <TableCell className="text-center p-2">
                                {isFechado || isPortal ? <Badge variant="outline">{p.percentualComissao}%</Badge> : <div className="flex justify-center items-center gap-1"><Input type="number" className="h-8 w-16 text-center px-1" value={p.percentualComissao} onChange={(e) => handleEditarPercentual(p.id, e.target.value)}/><span className="text-xs text-slate-400">%</span></div>}
                            </TableCell>
                            <TableCell className="text-right font-bold text-emerald-600">{formatCurrency(p.valorComissao)}</TableCell>
                            {!isPortal && !isFechado && <TableCell><Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleRemoverPedido(p.id)}><Trash2 className="w-4 h-4" /></Button></TableCell>}
                        </TableRow>
                    ))
                }
            </TableBody>
        </Table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2"><label className="text-sm font-bold text-slate-700">Outros Descontos</label><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">R$</span><Input type="number" className="pl-8" value={outrosDescontos} onChange={(e) => setOutrosDescontos(e.target.value)} disabled={isFechado || isPortal} /></div></div>
          <div className="space-y-2"><label className="text-sm font-bold text-slate-700">Observações</label><Textarea placeholder="Detalhes..." value={observacoes} onChange={(e) => setObservacoes(e.target.value)} disabled={isFechado || isPortal} className="resize-none" /></div>
      </div>

      <div className="flex items-center justify-between gap-3 pt-4 border-t mt-4">
          <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} disabled={loading}>{isPortal ? 'Voltar' : 'Fechar/Cancelar'}</Button>
              <Button variant="outline" onClick={handleGerarPDF} disabled={generatingPdf} className="gap-2 border-purple-200 text-purple-700 hover:bg-purple-50">{generatingPdf ? <Loader2 className="w-4 h-4 animate-spin"/> : <FileText className="w-4 h-4"/>} Baixar Relatório</Button>
          </div>
          
          {!isPortal && (
              <div className="flex gap-2">
                {!isFechado ? (
                    <>
                        <Button onClick={handleSaveDraft} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 min-w-[140px]">{loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>} Salvar</Button>
                        <Button onClick={handleFinalize} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 min-w-[140px]"><Lock className="w-4 h-4"/> Finalizar</Button>
                    </>
                ) : (
                    <Button onClick={handleReopen} disabled={reopening} variant="destructive" className="gap-2 bg-red-100 text-red-700 hover:bg-red-200 border-red-200">
                        {reopening ? <Loader2 className="w-4 h-4 animate-spin"/> : <RotateCcw className="w-4 h-4"/>} Reabrir Fechamento
                    </Button>
                )}
              </div>
          )}
      </div>

      {!isPortal && (
        <ModalContainer open={showAddModal} onClose={() => setShowAddModal(false)} title="Adicionar Pedido Avulso" description="Pedidos pagos não comissionados." size="lg">
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
                                      <TableCell><div>{p.cliente_nome}</div>{p.mes_atual_rascunho && <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-200 mt-1">Em {p.mes_atual_rascunho}</Badge>}</TableCell>
                                      <TableCell className="text-xs">{p.data_pagamento ? new Date(p.data_pagamento).toLocaleDateString() : '-'}</TableCell>
                                      <TableCell className="font-bold text-emerald-600">{formatCurrency(p.total_pago)}</TableCell>
                                      <TableCell><Button size="sm" variant="ghost" className="hover:bg-emerald-50 text-emerald-600" onClick={() => handleAdicionarPedidoManual(p)}>{p.mes_atual_rascunho ? <ArrowLeftRight className="w-4 h-4 text-amber-600"/> : <Plus className="w-4 h-4"/>}</Button></TableCell>
                                  </TableRow>
                              ))
                          }
                      </TableBody>
                  </Table>
              </div>
              <div className="flex justify-end"><Button variant="outline" onClick={() => setShowAddModal(false)}>Fechar</Button></div>
            </div>
        </ModalContainer>
      )}
    </div>
  );
}