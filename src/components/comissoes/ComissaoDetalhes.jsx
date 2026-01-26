import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  DollarSign, 
  ShoppingCart, 
  Percent, 
  Save,
  Edit2,
  Lock,
  Trash2,
  Plus,
  Download,
  AlertCircle
} from "lucide-react";
import { format } from 'date-fns';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import ModalContainer from "@/components/modals/ModalContainer";

export default function ComissaoDetalhes({ representante, mesAno, pedidosTodos, onClose }) {
  const [pedidosEditaveis, setPedidosEditaveis] = useState(representante.pedidos);
  const [editandoVales, setEditandoVales] = useState(false);
  const [valesTemp, setValesTemp] = useState(representante.vales || 0);
  const [outrosDescontos, setOutrosDescontos] = useState(representante.outrosDescontos || 0);
  const [descricaoDescontos, setDescricaoDescontos] = useState(representante.descricaoOutrosDescontos || '');
  const [observacoes, setObservacoes] = useState(representante.observacoes || '');
  const [isFechado, setIsFechado] = useState(representante.status === 'fechado');
  const [showAdicionarPedido, setShowAdicionarPedido] = useState(false);
  const [loading, setLoading] = useState(false);

  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

  // Recalcular totais com base nos pedidos editáveis
  const totais = useMemo(() => {
    const totalVendas = pedidosEditaveis.reduce((sum, p) => sum + (p.valor_pedido || 0), 0);
    const totalComissoes = pedidosEditaveis.reduce((sum, p) => sum + (p.valorComissao || 0), 0);
    const vales = editandoVales ? valesTemp : representante.vales;
    const saldoFinal = totalComissoes - vales - outrosDescontos;
    
    return { totalVendas, totalComissoes, vales, saldoFinal };
  }, [pedidosEditaveis, valesTemp, editandoVales, representante.vales, outrosDescontos]);

  const handleEditarPercentual = (pedidoId, novoPercentual) => {
    setPedidosEditaveis(prev => prev.map(p => {
      if (p.id === pedidoId) {
        const valorComissao = ((p.valor_pedido || 0) * novoPercentual) / 100;
        return { ...p, percentualComissao: novoPercentual, valorComissao };
      }
      return p;
    }));
  };

  const handlePostergarPedido = async (pedido) => {
    try {
      // Calcular próximo mês
      const [ano, mes] = mesAno.split('-').map(Number);
      const proximoMes = new Date(ano, mes, 1); // Primeiro dia do próximo mês
      
      // Atualizar pedido com nova data de referência
      await base44.entities.Pedido.update(pedido.id, {
        data_referencia_comissao: format(proximoMes, 'yyyy-MM-dd')
      });

      // Remover da lista local
      setPedidosEditaveis(prev => prev.filter(p => p.id !== pedido.id));
      toast.success(`Pedido #${pedido.numero_pedido} postergado para o próximo mês`);
    } catch (error) {
      toast.error('Erro ao postergar pedido');
    }
  };

  const handleSalvarVales = () => {
    representante.vales = valesTemp;
    setEditandoVales(false);
    toast.success('Vales atualizados');
  };

  const handleFecharComissao = async () => {
    if (!representante.chave_pix) {
      toast.error('Chave PIX não cadastrada para este representante');
      return;
    }

    // VALIDAÇÃO DE SEGURANÇA: Verificar se algum pedido já teve comissão paga
    const pedidosJaPagos = pedidosEditaveis.filter(p => p.comissao_paga === true);
    if (pedidosJaPagos.length > 0) {
      toast.error(`Erro: ${pedidosJaPagos.length} pedido(s) já tiveram comissão paga anteriormente`);
      return;
    }

    setLoading(true);
    
    try {
      // 1. Gerar PDF Analítico
      const pdfResponse = await base44.functions.invoke('gerarRelatorioComissoes', {
        tipo: 'analitico',
        mes_ano: mesAno,
        representante: {
          ...representante,
          pedidos: pedidosEditaveis,
          vales: totais.vales,
          outrosDescontos,
          descricaoDescontos,
          observacoes,
          totalVendas: totais.totalVendas,
          totalComissoes: totais.totalComissoes,
          saldoAPagar: totais.saldoFinal
        }
      });

      // Converter response para blob e fazer upload
      const blob = new Blob([pdfResponse.data], { type: 'application/pdf' });
      const file = new File([blob], `Comissao-${representante.codigo}-${mesAno}.pdf`, { type: 'application/pdf' });
      
      const uploadResponse = await base44.integrations.Core.UploadFile({ file });
      const pdfUrl = uploadResponse.file_url;

      // 2. Salvar Fechamento
      const fechamentoData = {
        mes_ano: mesAno,
        representante_codigo: representante.codigo,
        representante_nome: representante.nome,
        representante_chave_pix: representante.chave_pix,
        pedidos_detalhes: pedidosEditaveis.map(p => ({
          pedido_id: p.id,
          numero_pedido: p.numero_pedido,
          cliente_nome: p.cliente_nome,
          data_pagamento: p.data_pagamento,
          valor_pedido: p.valor_pedido,
          percentual_comissao: p.percentualComissao,
          valor_comissao: p.valorComissao
        })),
        total_vendas: totais.totalVendas,
        total_comissoes_bruto: totais.totalComissoes,
        vales_adiantamentos: totais.vales,
        outros_descontos: outrosDescontos,
        descricao_outros_descontos: descricaoDescontos,
        valor_liquido: totais.saldoFinal,
        observacoes,
        pdf_analitico_url: pdfUrl,
        status: 'fechado',
        data_fechamento: new Date().toISOString().split('T')[0]
      };

      let fechamentoId;
      if (representante.fechamentoId) {
        await base44.entities.FechamentoComissao.update(representante.fechamentoId, fechamentoData);
        fechamentoId = representante.fechamentoId;
      } else {
        const novoFechamento = await base44.entities.FechamentoComissao.create(fechamentoData);
        fechamentoId = novoFechamento.id;
      }

      // 3. Criar registro em Pagamentos (ContaPagar)
      const pagamentoData = {
        fornecedor_codigo: representante.codigo,
        fornecedor_nome: `REP: ${representante.nome}`,
        descricao: `Comissão Referente a ${format(new Date(mesAno + '-01'), 'MMMM/yyyy')}`,
        valor: totais.saldoFinal,
        data_vencimento: new Date().toISOString().split('T')[0],
        status: 'pendente',
        forma_pagamento: `PIX (${representante.chave_pix})`,
        observacao: `Fechamento automático do sistema.\nPDF: ${pdfUrl}\n${observacoes || ''}`
      };

      const pagamento = await base44.entities.ContaPagar.create(pagamentoData);

      // 4. Atualizar fechamento com ID do pagamento
      await base44.entities.FechamentoComissao.update(fechamentoId, {
        pagamento_id: pagamento.id
      });

      // 5. MARCAR PEDIDOS COMO COMISSÃO PAGA (TRAVA DE SEGURANÇA)
      for (const pedido of pedidosEditaveis) {
        await base44.entities.Pedido.update(pedido.id, {
          comissao_paga: true,
          comissao_fechamento_id: fechamentoId,
          comissao_mes_ano_pago: mesAno
        });
      }

      setIsFechado(true);
      toast.success('Comissão fechada e registrada em Pagamentos');
      
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      toast.error('Erro ao fechar comissão: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Pedidos disponíveis para adicionar (do mesmo representante, pagos, não incluídos ainda)
  const pedidosDisponiveis = useMemo(() => {
    return pedidosTodos.filter(p => {
      // Mesmo representante
      if (p.representante_codigo !== representante.codigo) return false;
      // TRAVA: Não mostrar pedidos com comissão já paga
      if (p.comissao_paga === true) return false;
      // Pago
      if (p.status !== 'pago' || (p.saldo_restante && p.saldo_restante > 0)) return false;
      // Não incluído
      if (pedidosEditaveis.find(pe => pe.id === p.id)) return false;
      return true;
    });
  }, [pedidosTodos, representante.codigo, pedidosEditaveis]);

  const handleAdicionarPedido = (pedido) => {
    const percentualComissao = pedido.porcentagem_comissao || 5;
    const valorComissao = ((pedido.valor_pedido || 0) * percentualComissao) / 100;
    
    setPedidosEditaveis(prev => [...prev, {
      ...pedido,
      percentualComissao,
      valorComissao
    }]);
    setShowAdicionarPedido(false);
    toast.success('Pedido adicionado');
  };

  return (
    <div className="space-y-6">
      {/* RESUMO FINANCEIRO */}
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-slate-500 mb-1">Total Vendas</p>
            <p className="font-bold text-emerald-600 text-xl">{formatCurrency(totais.totalVendas)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Total Comissões</p>
            <p className="font-bold text-blue-600 text-xl">{formatCurrency(totais.totalComissoes)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">(-) Vales/Adiantamentos</p>
            {editandoVales ? (
              <div className="flex gap-1">
                <Input 
                  type="number"
                  value={valesTemp}
                  onChange={(e) => setValesTemp(parseFloat(e.target.value) || 0)}
                  className="h-8 text-sm"
                  disabled={isFechado}
                />
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={handleSalvarVales}
                  disabled={isFechado}
                >
                  <Save className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="font-bold text-red-600 text-xl">{formatCurrency(totais.vales)}</p>
                {!isFechado && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    onClick={() => setEditandoVales(true)}
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            )}
          </div>
          <div className="bg-white p-4 rounded-xl border-2 border-emerald-400">
            <p className="text-xs text-slate-500 mb-1">Saldo a Pagar</p>
            <p className="font-bold text-emerald-700 text-2xl">{formatCurrency(totais.saldoFinal)}</p>
          </div>
        </div>

        {/* OUTROS DESCONTOS */}
        <div className="mt-4 pt-4 border-t">
          <label className="text-xs text-slate-500 font-medium mb-2 block">(-) Outros Descontos</label>
          <div className="grid grid-cols-2 gap-3">
            <Input 
              type="number"
              placeholder="Valor em R$"
              value={outrosDescontos}
              onChange={(e) => setOutrosDescontos(parseFloat(e.target.value) || 0)}
              disabled={isFechado}
            />
            <Input 
              placeholder="Descrição (ex: Taxa uniforme)"
              value={descricaoDescontos}
              onChange={(e) => setDescricaoDescontos(e.target.value)}
              disabled={isFechado}
            />
          </div>
        </div>
      </Card>

      {/* AÇÕES RÁPIDAS */}
      {!isFechado && (
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => setShowAdicionarPedido(true)}
          >
            <Plus className="w-4 h-4" />
            Adicionar Pedido
          </Button>
        </div>
      )}

      {/* TABELA DE PEDIDOS */}
      <div>
        <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-blue-600" />
          Pedidos Elegíveis ({pedidosEditaveis.length})
        </h3>
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="font-bold">Nº Pedido</TableHead>
                  <TableHead className="font-bold">Cliente</TableHead>
                  <TableHead className="font-bold">Data Pgto</TableHead>
                  <TableHead className="font-bold text-right">Valor Pedido</TableHead>
                  <TableHead className="font-bold text-right w-32">% Com.</TableHead>
                  <TableHead className="font-bold text-right">Comissão</TableHead>
                  {!isFechado && <TableHead className="font-bold text-center w-20">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pedidosEditaveis.map((pedido) => (
                  <TableRow key={pedido.id} className="hover:bg-blue-50">
                    <TableCell className="font-medium">#{pedido.numero_pedido}</TableCell>
                    <TableCell className="text-slate-600 text-sm">{pedido.cliente_nome}</TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {pedido.data_pagamento ? format(new Date(pedido.data_pagamento), 'dd/MM/yyyy') : '-'}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-slate-700">
                      {formatCurrency(pedido.valor_pedido)}
                    </TableCell>
                    <TableCell className="text-right">
                      {isFechado ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          <Percent className="w-3 h-3 mr-1" />
                          {pedido.percentualComissao}%
                        </Badge>
                      ) : (
                        <Input 
                          type="number"
                          value={pedido.percentualComissao}
                          onChange={(e) => handleEditarPercentual(pedido.id, parseFloat(e.target.value) || 0)}
                          className="h-8 text-right w-20"
                          step="0.1"
                        />
                      )}
                    </TableCell>
                    <TableCell className="text-right font-bold text-emerald-600">
                      {formatCurrency(pedido.valorComissao)}
                    </TableCell>
                    {!isFechado && (
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handlePostergarPedido(pedido)}
                          title="Postergar para próximo mês"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* OBSERVAÇÕES */}
      <div>
        <h3 className="font-bold text-slate-800 mb-2">Observações do Fechamento</h3>
        <Textarea 
          placeholder="Adicione observações sobre este fechamento (opcional)..."
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          rows={3}
          className="resize-none"
          disabled={isFechado}
        />
      </div>

      {/* ALERTA PIX */}
      {!isFechado && !representante.chave_pix && (
        <Card className="p-4 bg-amber-50 border-amber-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">Chave PIX não cadastrada</p>
              <p className="text-sm text-amber-600">Cadastre a chave PIX do representante antes de fechar a comissão.</p>
            </div>
          </div>
        </Card>
      )}

      {/* AÇÕES */}
      <div className="flex gap-3 pt-4 border-t">
        <Button variant="outline" className="flex-1" onClick={onClose}>
          {isFechado ? 'Fechar' : 'Cancelar'}
        </Button>
        
        <Button 
          variant="outline"
          className="flex-1 gap-2 bg-blue-50 hover:bg-blue-100"
          onClick={async () => {
            try {
              toast.loading('Gerando PDF analítico...');
              const response = await base44.functions.invoke('gerarRelatorioComissoes', {
                tipo: 'analitico',
                mes_ano: mesAno,
                representante: {
                  ...representante,
                  pedidos: pedidosEditaveis,
                  vales: totais.vales,
                  outrosDescontos,
                  descricaoDescontos,
                  observacoes,
                  totalVendas: totais.totalVendas,
                  totalComissoes: totais.totalComissoes,
                  saldoAPagar: totais.saldoFinal,
                  status: isFechado ? 'fechado' : 'aberto'
                }
              });

              const blob = new Blob([response.data], { type: 'application/pdf' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `Comissao-${representante.codigo}-${mesAno}.pdf`;
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(url);
              a.remove();
              
              toast.dismiss();
              toast.success('PDF analítico gerado!');
            } catch (error) {
              toast.dismiss();
              toast.error('Erro ao gerar PDF');
            }
          }}
        >
          <Download className="w-4 h-4" />
          Gerar PDF Individual
        </Button>

        {!isFechado && (
          <Button 
            className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700"
            onClick={handleFecharComissao}
            disabled={loading || !representante.chave_pix}
          >
            <Lock className="w-4 h-4" />
            {loading ? 'Processando...' : 'Finalizar Fechamento'}
          </Button>
        )}
      </div>

      {/* MODAL ADICIONAR PEDIDO */}
      <ModalContainer
        open={showAdicionarPedido}
        onClose={() => setShowAdicionarPedido(false)}
        title="Adicionar Pedido Avulso"
        description="Selecione pedidos pagos deste representante"
        size="lg"
      >
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {pedidosDisponiveis.length === 0 ? (
            <p className="text-center text-slate-500 py-6">Nenhum pedido disponível para adicionar</p>
          ) : (
            pedidosDisponiveis.map(pedido => (
              <div 
                key={pedido.id}
                className="p-4 bg-slate-50 border border-slate-200 rounded-lg hover:border-blue-300 transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-slate-800">#{pedido.numero_pedido}</p>
                    <p className="text-sm text-slate-500">{pedido.cliente_nome}</p>
                  </div>
                  <p className="font-bold text-emerald-600">{formatCurrency(pedido.valor_pedido)}</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-xs text-slate-400">
                    Pago em: {pedido.data_pagamento ? format(new Date(pedido.data_pagamento), 'dd/MM/yyyy') : '-'}
                  </p>
                  <Button 
                    size="sm"
                    onClick={() => handleAdicionarPedido(pedido)}
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </ModalContainer>
    </div>
  );
}