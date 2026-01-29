import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Search, DollarSign, Percent, Wallet, Loader2, Plus, X, Upload, 
  FileText, Trash2, ShoppingCart, AlertTriangle, CheckCircle, Truck 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";

const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

export default function AprovarLiquidacaoModal({ 
  autorizacao, 
  todosPedidos, 
  onAprovar, 
  onRejeitar, 
  onCancel, 
  isProcessing 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [pedidosSelecionados, setPedidosSelecionados] = useState(
    autorizacao?.pedidos_ids?.map(pid => todosPedidos.find(p => p?.id === pid)).filter(Boolean) || []
  );
  const [descontoTipo, setDescontoTipo] = useState('reais');
  const [descontoValor, setDescontoValor] = useState('');
  const [devolucao, setDevolucao] = useState('');
  const [formasPagamento, setFormasPagamento] = useState([
    { tipo: 'dinheiro', valor: autorizacao?.valor_final_proposto || '', parcelas: '1' }
  ]);
  const [comprovantes, setComprovantes] = useState(
    autorizacao?.comprovantes_urls || (autorizacao?.comprovante_url ? [autorizacao.comprovante_url] : [])
  );
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showRejeicaoForm, setShowRejeicaoForm] = useState(false);
  const [motivoRejeicao, setMotivoRejeicao] = useState('');

  // Carregar anexos quando autorizacao mudar
  useEffect(() => {
    if (autorizacao) {
      let anexosExistentes = autorizacao?.comprovantes_urls || 
                             (autorizacao?.comprovante_url ? [autorizacao.comprovante_url] : []);
      
      // Filtrar valores vazios/null
      anexosExistentes = anexosExistentes.filter(url => url && url.trim());
      
      setComprovantes(anexosExistentes);
    }
  }, [autorizacao]);

  // Pedidos disponíveis para adicionar (abertos/parciais/em trânsito do mesmo cliente)
  const pedidosDisponiveis = useMemo(() => {
    const clienteCodigo = autorizacao?.cliente_codigo;
    if (!clienteCodigo) return [];
    
    const idsJaSelecionados = pedidosSelecionados.map(p => p?.id);
    return todosPedidos.filter(p => 
      p?.cliente_codigo === clienteCodigo &&
      ['aberto', 'parcial', 'aguardando'].includes(p?.status) &&
      !idsJaSelecionados.includes(p?.id) &&
      (p?.numero_pedido?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       p?.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [todosPedidos, autorizacao, pedidosSelecionados, searchTerm]);

  const adicionarPedido = (pedido) => {
    setPedidosSelecionados(prev => [...prev, pedido]);
    setSearchTerm('');
  };

  const removerPedido = (pedidoId) => {
    setPedidosSelecionados(prev => prev.filter(p => p?.id !== pedidoId));
  };

  const adicionarFormaPagamento = () => {
    setFormasPagamento([...formasPagamento, { tipo: 'dinheiro', valor: '', parcelas: '1' }]);
  };

  const removerFormaPagamento = (index) => {
    if (formasPagamento.length > 1) {
      setFormasPagamento(formasPagamento.filter((_, i) => i !== index));
    }
  };

  const atualizarFormaPagamento = (index, campo, valor) => {
    const novasFormas = [...formasPagamento];
    novasFormas[index][campo] = valor;
    setFormasPagamento(novasFormas);
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingFile(true);
    try {
      const uploadPromises = files.map(file => base44.integrations.Core.UploadFile({ file }));
      const results = await Promise.all(uploadPromises);
      const urls = results.map(r => r?.file_url).filter(Boolean);
      setComprovantes(prev => [...prev, ...urls]);
      toast.success(`${files.length} arquivo(s) anexado(s)!`);
    } catch (error) {
      toast.error('Erro ao enviar arquivo(s)');
    } finally {
      setUploadingFile(false);
    }
  };

  const removerComprovante = (index) => {
    setComprovantes(prev => prev.filter((_, i) => i !== index));
    toast.success('Arquivo removido');
  };

  const calcularTotais = () => {
    const totalOriginal = pedidosSelecionados.reduce((sum, p) => 
      sum + (p?.saldo_restante || ((p?.valor_pedido || 0) - (p?.total_pago || 0))), 0
    );
    
    let desconto = 0;
    if (descontoValor) {
      if (descontoTipo === 'reais') {
        desconto = parseFloat(descontoValor) || 0;
      } else {
        desconto = (totalOriginal * (parseFloat(descontoValor) || 0)) / 100;
      }
    }
    
    const devolucaoValor = parseFloat(devolucao) || 0;
    const totalComDesconto = totalOriginal - desconto - devolucaoValor;
    const totalPago = formasPagamento.reduce((sum, fp) => sum + (parseFloat(fp?.valor) || 0), 0);
    
    return { totalOriginal, desconto, devolucaoValor, totalComDesconto, totalPago };
  };

  const handleRejeitar = () => {
    if (!motivoRejeicao.trim()) {
      toast.error('Informe o motivo da rejeição');
      return;
    }
    onRejeitar(motivoRejeicao);
  };

  const handleAprovar = () => {
    if (pedidosSelecionados.length === 0) {
      toast.error('Selecione pelo menos um pedido');
      return;
    }

    const totais = calcularTotais();
    if (totais.totalPago <= 0) {
      toast.error('Informe pelo menos uma forma de pagamento');
      return;
    }

    const dadosAprovacao = {
      pedidosSelecionados,
      descontoTipo,
      descontoValor: parseFloat(descontoValor) || 0,
      devolucao: parseFloat(devolucao) || 0,
      formasPagamento: formasPagamento.filter(fp => parseFloat(fp?.valor) > 0),
      comprovantes,
      totais
    };

    onAprovar(dadosAprovacao);
  };

  const totais = calcularTotais();

  return (
    <div className="space-y-6">
      {/* INFORMAÇÕES DA SOLICITAÇÃO */}
      <div className="grid grid-cols-2 gap-4 p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border border-orange-200">
        <div>
          <p className="text-xs text-orange-600 font-bold uppercase">Solicitação</p>
          <p className="text-2xl font-bold text-slate-800">#{autorizacao?.numero_solicitacao}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 font-bold uppercase">Solicitante</p>
          <p className="text-sm font-medium text-slate-700">
            {autorizacao?.solicitante_tipo === 'cliente' ? '👤 Cliente' : '🤝 Representante'}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500 font-bold uppercase">Cliente</p>
          <p className="text-sm font-semibold text-slate-800">{autorizacao?.cliente_nome}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 font-bold uppercase">Data</p>
          <p className="text-sm text-slate-700">
            {autorizacao?.created_date ? format(new Date(autorizacao.created_date), 'dd/MM/yyyy HH:mm') : '-'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* COLUNA ESQUERDA: PEDIDOS */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
              Pedidos Selecionados ({pedidosSelecionados.length})
            </h3>
          </div>

          {/* Busca e Adicionar Pedidos */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar e adicionar pedido..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {searchTerm && pedidosDisponiveis.length > 0 && (
            <Card className="p-2 space-y-1 max-h-48 overflow-y-auto">
              {pedidosDisponiveis.slice(0, 5).map(pedido => (
                <div
                  key={pedido?.id}
                  onClick={() => adicionarPedido(pedido)}
                  className="flex items-center justify-between p-2 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors"
                >
                  <div>
                    <p className="font-mono text-sm font-medium">#{pedido?.numero_pedido}</p>
                    <p className="text-xs text-slate-500">{pedido?.cliente_nome}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {pedido?.status === 'aguardando' && (
                      <Badge className="bg-amber-100 text-amber-700 text-xs">🚚</Badge>
                    )}
                    <span className="text-sm font-bold text-blue-600">
                      {formatCurrency(pedido?.saldo_restante || 0)}
                    </span>
                    <Plus className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
              ))}
            </Card>
          )}

          {/* Lista de Pedidos Selecionados */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {pedidosSelecionados.map((pedido) => {
              const saldo = pedido?.saldo_restante || ((pedido?.valor_pedido || 0) - (pedido?.total_pago || 0));
              return (
                <Card key={pedido?.id} className="p-4 relative">
                  {pedido?.status === 'aguardando' && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-amber-100 text-amber-700 text-xs">🚚 Em Trânsito</Badge>
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-mono font-medium text-sm">#{pedido?.numero_pedido}</p>
                      <p className="text-xs text-slate-500">{pedido?.cliente_nome}</p>
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removerPedido(pedido?.id)}
                      className="text-red-600 hover:bg-red-50 h-8 w-8"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500">Valor Total:</span>
                      <span className="ml-2 font-medium">{formatCurrency(pedido?.valor_pedido)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Saldo:</span>
                      <span className="ml-2 font-bold text-red-600">{formatCurrency(saldo)}</span>
                    </div>
                    {pedido?.data_entrega && (
                      <div className="col-span-2">
                        <span className="text-slate-500">Entrega:</span>
                        <span className="ml-2 font-medium">
                          {format(new Date(pedido.data_entrega), 'dd/MM/yyyy')}
                        </span>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {pedidosSelecionados.length === 0 && (
            <div className="text-center py-8 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
              <ShoppingCart className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Nenhum pedido selecionado</p>
            </div>
          )}
        </div>

        {/* COLUNA DIREITA: FINANCEIRO */}
        <div className="space-y-4">
          {/* Ajustes */}
          <Card className="p-4 bg-slate-50 space-y-4">
            <h3 className="font-semibold text-slate-800">Ajustes de Pagamento</h3>
            
            <div className="space-y-2">
              <Label>Desconto</Label>
              <RadioGroup value={descontoTipo} onValueChange={setDescontoTipo} className="flex gap-4">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="reais" id="desc-reais" />
                  <Label htmlFor="desc-reais" className="cursor-pointer">Em Reais (R$)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="porcentagem" id="desc-porc" />
                  <Label htmlFor="desc-porc" className="cursor-pointer">Em Porcentagem (%)</Label>
                </div>
              </RadioGroup>
              <div className="relative">
                {descontoTipo === 'reais' ? 
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /> : 
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                }
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={descontoValor}
                  onChange={(e) => setDescontoValor(e.target.value)}
                  className="pl-10"
                  placeholder="0,00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Devolução (R$)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={devolucao}
                  onChange={(e) => setDevolucao(e.target.value)}
                  className="pl-10"
                  placeholder="0,00"
                />
              </div>
            </div>

            {/* Formas de Pagamento */}
            <div className="space-y-3 pt-3 border-t">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Formas de Pagamento</Label>
                <Button type="button" size="sm" variant="outline" onClick={adicionarFormaPagamento}>
                  <Plus className="w-4 h-4 mr-2" />Adicionar
                </Button>
              </div>

              {formasPagamento.map((fp, index) => (
                <Card key={index} className="p-3 bg-white">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Forma {index + 1}</span>
                      {formasPagamento.length > 1 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => removerFormaPagamento(index)}
                          className="text-red-600 h-6"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Tipo *</Label>
                        <Select value={fp.tipo} onValueChange={(v) => atualizarFormaPagamento(index, 'tipo', v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="dinheiro">Dinheiro</SelectItem>
                            <SelectItem value="pix">PIX</SelectItem>
                            <SelectItem value="cheque">Cheque</SelectItem>
                            <SelectItem value="debito">Débito</SelectItem>
                            <SelectItem value="credito">Crédito</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Valor (R$) *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={fp.valor}
                          onChange={(e) => atualizarFormaPagamento(index, 'valor', e.target.value)}
                        />
                      </div>
                    </div>

                    {fp.tipo === 'credito' && (
                      <div className="space-y-2">
                        <Label>Parcelas</Label>
                        <Select value={fp.parcelas} onValueChange={(v) => atualizarFormaPagamento(index, 'parcelas', v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Array.from({length: 18}, (_, i) => i + 1).map(n => (
                              <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>

            {/* Totalizadores */}
            <div className="pt-4 border-t space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total Original:</span>
                <span className="font-medium">{formatCurrency(totais.totalOriginal)}</span>
              </div>
              {totais.desconto > 0 && (
                <div className="flex justify-between text-sm text-red-600">
                  <span>Desconto:</span>
                  <span>- {formatCurrency(totais.desconto)}</span>
                </div>
              )}
              {totais.devolucaoValor > 0 && (
                <div className="flex justify-between text-sm text-orange-600">
                  <span>Devolução:</span>
                  <span>- {formatCurrency(totais.devolucaoValor)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg text-blue-700 border-t pt-2">
                <span>Total a Pagar:</span>
                <span>{formatCurrency(totais.totalComDesconto)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg text-emerald-700">
                <span>Total Informado:</span>
                <span>{formatCurrency(totais.totalPago)}</span>
              </div>
              {Math.abs(totais.totalPago - totais.totalComDesconto) > 0.01 && (
                <div className={cn(
                  "flex justify-between font-bold text-base border-t pt-2",
                  totais.totalPago > totais.totalComDesconto ? "text-amber-600" : "text-red-600"
                )}>
                  <span>{totais.totalPago > totais.totalComDesconto ? 'Excedente (Crédito):' : 'Falta Pagar:'}</span>
                  <span>{formatCurrency(Math.abs(totais.totalPago - totais.totalComDesconto))}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Comprovantes */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                Comprovantes ({comprovantes.length})
              </h3>
              <label className="cursor-pointer">
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  disabled={uploadingFile}
                  className="hidden"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={uploadingFile}
                  className="gap-2"
                  onClick={(e) => e.preventDefault()}
                >
                  {uploadingFile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploadingFile ? 'Enviando...' : 'Anexar'}
                </Button>
              </label>
            </div>

            {comprovantes.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {comprovantes.map((url, index) => {
                  const isPdf = url.toLowerCase().endsWith('.pdf');
                  return (
                    <div key={index} className="relative group">
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block aspect-square rounded-lg border-2 border-slate-200 overflow-hidden hover:border-blue-400 transition-all"
                      >
                        {isPdf ? (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-red-50">
                            <FileText className="w-12 h-12 text-red-600 mb-2" />
                            <span className="text-xs text-slate-600 font-medium">PDF {index + 1}</span>
                          </div>
                        ) : (
                          <img
                            src={url}
                            alt={`Comprovante ${index + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.parentElement.innerHTML = `
                                <div class="w-full h-full flex flex-col items-center justify-center bg-slate-100">
                                  <svg class="w-12 h-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  <span class="text-xs text-slate-500 mt-2">Arquivo ${index + 1}</span>
                                </div>
                              `;
                            }}
                          />
                        )}
                      </a>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removerComprovante(index)}
                        className="absolute top-1 right-1 h-6 w-6 bg-red-600 text-white hover:bg-red-700 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4 border-2 border-dashed border-slate-200 rounded-lg">
                <Upload className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                <p className="text-xs text-slate-400">Nenhum arquivo anexado</p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* FORMULÁRIO DE REJEIÇÃO */}
      {showRejeicaoForm && (
        <Card className="p-4 bg-red-50 border-red-200 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h3 className="font-bold text-red-700">Motivo da Rejeição</h3>
          </div>
          <Textarea
            placeholder="Explique o que precisa ser corrigido..."
            value={motivoRejeicao}
            onChange={(e) => setMotivoRejeicao(e.target.value)}
            rows={3}
            className="bg-white"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowRejeicaoForm(false);
                setMotivoRejeicao('');
              }}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleRejeitar}
              disabled={isProcessing || !motivoRejeicao.trim()}
              className="flex-1"
            >
              Confirmar Rejeição
            </Button>
          </div>
        </Card>
      )}

      {/* AÇÕES FINAIS */}
      {!showRejeicaoForm && (
        <div className="flex gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isProcessing}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => setShowRejeicaoForm(true)}
            disabled={isProcessing}
            className="flex-1"
          >
            Rejeitar
          </Button>
          <Button
            type="button"
            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            onClick={handleAprovar}
            disabled={isProcessing || pedidosSelecionados.length === 0}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Aprovar & Liquidar
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}