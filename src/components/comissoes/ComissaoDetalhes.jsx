import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  DollarSign, Percent, Save, Lock, Trash2, Download, AlertCircle, RefreshCw
} from "lucide-react";
import { format } from 'date-fns';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

export default function ComissaoDetalhes({ representante, mesAno, onClose }) {
  const [pedidosEditaveis, setPedidosEditaveis] = useState(representante.pedidos);
  const [vales, setVales] = useState(representante.vales || 0);
  const [outrosDescontos, setOutrosDescontos] = useState(representante.outrosDescontos || 0);
  const [observacoes, setObservacoes] = useState(representante.observacoes || '');
  const [bulkPercent, setBulkPercent] = useState(''); // Estado para alteração em massa
  const [isFechado, setIsFechado] = useState(representante.status === 'fechado');
  const [loading, setLoading] = useState(false);

  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

  // Totais calculados em tempo real
  const totais = useMemo(() => {
    const totalVendas = pedidosEditaveis.reduce((sum, p) => sum + (p.valor_pedido || 0), 0);
    const totalComissoes = pedidosEditaveis.reduce((sum, p) => sum + (p.valorComissao || 0), 0);
    const saldoFinal = totalComissoes - parseFloat(vales || 0) - parseFloat(outrosDescontos || 0);
    return { totalVendas, totalComissoes, saldoFinal };
  }, [pedidosEditaveis, vales, outrosDescontos]);

  // Handler: Alterar % de um pedido
  const handleEditarPercentual = (pedidoId, novoPercentual) => {
    setPedidosEditaveis(prev => prev.map(p => {
      if (p.id === pedidoId) {
        const pNum = parseFloat(novoPercentual) || 0;
        return { ...p, percentualComissao: pNum, valorComissao: (p.valor_pedido * pNum) / 100 };
      }
      return p;
    }));
  };

  // Handler: Alteração em Massa
  const handleBulkChange = () => {
      if (!bulkPercent) return;
      const pct = parseFloat(bulkPercent);
      if (isNaN(pct)) return toast.error("Valor inválido");

      setPedidosEditaveis(prev => prev.map(p => ({
          ...p,
          percentualComissao: pct,
          valorComissao: (p.valor_pedido * pct) / 100
      })));
      toast.success(`Todos os pedidos atualizados para ${pct}%`);
  };

  // Handler: Salvar Rascunho (Botão Azul)
  const handleSaveDraft = async () => {
      setLoading(true);
      try {
          const pedidosAjustados = pedidosEditaveis.map(p => ({
              pedido_id: p.id,
              percentual: p.percentualComissao
          }));

          const payload = {
              referencia: mesAno,
              representante_codigo: representante.codigo,
              representante_nome: representante.nome,
              vales: parseFloat(vales),
              outros_descontos: parseFloat(outrosDescontos),
              observacao: observacoes,
              pedidos_ajustados: pedidosAjustados,
              status: 'aberto' // Mantém aberto
          };

          if (representante.controleId) {
              await base44.entities.ComissaoControle.update(representante.controleId, payload);
          } else {
              await base44.entities.ComissaoControle.create(payload);
          }
          
          toast.success("Alterações salvas com sucesso!");
      } catch (error) {
          toast.error("Erro ao salvar.");
      } finally {
          setLoading(false);
      }
  };

  // Handler: Finalizar Fechamento (Botão Verde)
  const handleFinalize = async () => {
      if (!confirm("Confirmar fechamento? Isso pode gerar contas a pagar.")) return;
      setLoading(true);
      try {
          const pedidosAjustados = pedidosEditaveis.map(p => ({ pedido_id: p.id, percentual: p.percentualComissao }));
          const payload = {
              referencia: mesAno,
              representante_codigo: representante.codigo,
              representante_nome: representante.nome,
              vales: parseFloat(vales),
              outros_descontos: parseFloat(outrosDescontos),
              observacao: observacoes,
              pedidos_ajustados: pedidosAjustados,
              status: 'fechado',
              data_fechamento: new Date().toISOString()
          };

          if (representante.controleId) {
              await base44.entities.ComissaoControle.update(representante.controleId, payload);
          } else {
              await base44.entities.ComissaoControle.create(payload);
          }

          // AQUI VOCÊ PODERIA GERAR O PDF E SALVAR O LINK, SE JÁ TIVER A FUNÇÃO NO BACKEND
          
          setIsFechado(true);
          toast.success("Comissão fechada!");
          setTimeout(onClose, 1000);
      } catch (error) {
          toast.error("Erro ao finalizar.");
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="space-y-6">
      
      {/* CARD DE FERRAMENTAS EM MASSA (Só se estiver aberto) */}
      {!isFechado && (
          <Card className="p-4 bg-blue-50 border-blue-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-full"><RefreshCw className="w-4 h-4 text-blue-600"/></div>
                  <div>
                      <h4 className="font-bold text-sm text-blue-900">Alteração em Massa</h4>
                      <p className="text-xs text-blue-700">Aplique uma porcentagem única para todos os pedidos.</p>
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

      {/* TABELA DE PEDIDOS */}
      <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
        <Table>
            <TableHeader className="bg-slate-50">
                <TableRow>
                    <TableHead className="w-[100px]">Data</TableHead>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Valor Venda</TableHead>
                    <TableHead className="text-center w-[120px]">% Com.</TableHead>
                    <TableHead className="text-right">Comissão</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {pedidosEditaveis.map(pedido => (
                    <TableRow key={pedido.id}>
                        <TableCell className="text-xs text-slate-500">{new Date(pedido.data_pagamento).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium">#{pedido.numero_pedido}</TableCell>
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
                    </TableRow>
                ))}
            </TableBody>
        </Table>
      </div>

      {/* DESCONTOS E OBS */}
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

      {/* FOOTER DE AÇÕES */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t mt-4">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          
          {!isFechado && (
              <>
                <Button onClick={handleSaveDraft} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                    <Save className="w-4 h-4"/> Salvar Alterações
                </Button>
                <Button onClick={handleFinalize} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                    <Lock className="w-4 h-4"/> Finalizar Fechamento
                </Button>
              </>
          )}
          
          {isFechado && (
              <Button variant="outline" className="gap-2">
                  <Download className="w-4 h-4"/> Baixar PDF
              </Button>
          )}
      </div>
    </div>
  );
}