import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  DollarSign, Plus, Trash2, Loader2, CheckCircle, AlertTriangle, 
  Wallet, CreditCard, FileText, Search, X
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { jsPDF } from "jspdf";

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

export default function LiquidarContaModal({ conta, saldoCaixa, cheques, onConfirm, onCancel, isLoading }) {
  const [dataPagamento, setDataPagamento] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [jurosMulta, setJurosMulta] = useState('');
  const [desconto, setDesconto] = useState('');
  const [formasPagamento, setFormasPagamento] = useState([
    { tipo: 'dinheiro', valor: '', detalhes: '', cheque_id: null }
  ]);
  const [searchCheque, setSearchCheque] = useState('');
  const [observacao, setObservacao] = useState('');
  const [gerando, setGerando] = useState(false);

  const valorOriginal = conta?.valor || 0;
  const jurosMultaNum = parseFloat(jurosMulta) || 0;
  const descontoNum = parseFloat(desconto) || 0;
  const valorFinal = valorOriginal + jurosMultaNum - descontoNum;
  const totalPago = formasPagamento.reduce((sum, fp) => sum + (parseFloat(fp.valor) || 0), 0);
  const diferenca = valorFinal - totalPago;

  const chequesDisponiveis = useMemo(() => {
    return cheques.filter(c => 
      c?.status === 'normal' &&
      (c?.numero_cheque?.toLowerCase().includes(searchCheque.toLowerCase()) ||
       c?.banco?.toLowerCase().includes(searchCheque.toLowerCase()) ||
       c?.emitente?.toLowerCase().includes(searchCheque.toLowerCase()))
    );
  }, [cheques, searchCheque]);

  const adicionarFormaPagamento = () => {
    setFormasPagamento([...formasPagamento, { tipo: 'dinheiro', valor: '', detalhes: '', cheque_id: null }]);
  };

  const removerFormaPagamento = (index) => {
    if (formasPagamento.length > 1) {
      setFormasPagamento(formasPagamento.filter((_, i) => i !== index));
    }
  };

  const atualizarFormaPagamento = (index, campo, valor) => {
    const novasFormas = [...formasPagamento];
    novasFormas[index][campo] = valor;
    
    // Se mudou o tipo, limpa campos relacionados
    if (campo === 'tipo') {
      novasFormas[index].detalhes = '';
      novasFormas[index].cheque_id = null;
    }
    
    setFormasPagamento(novasFormas);
  };

  const selecionarCheque = (index, cheque) => {
    const novasFormas = [...formasPagamento];
    novasFormas[index].cheque_id = cheque.id;
    novasFormas[index].valor = cheque.valor;
    novasFormas[index].detalhes = `Cheque ${cheque.banco} Nº ${cheque.numero_cheque} - Emitente: ${cheque.emitente}`;
    setFormasPagamento(novasFormas);
    setSearchCheque('');
  };

  const gerarReciboPDF = async () => {
    setGerando(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      
      // Cabeçalho
      doc.setFontSize(18);
      doc.setFont(undefined, 'bold');
      doc.text('RECIBO DE PAGAMENTO', pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Emitido em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth / 2, 28, { align: 'center' });
      
      // Linha separadora
      doc.setLineWidth(0.5);
      doc.line(15, 35, pageWidth - 15, 35);
      
      // Pagador
      let y = 45;
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('PAGADOR (Empresa):', 15, y);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);
      y += 7;
      doc.text('J&C Esquadrias', 15, y);
      y += 5;
      doc.text('CNPJ: XX.XXX.XXX/XXXX-XX', 15, y);
      
      // Recebedor
      y += 10;
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('RECEBEDOR (Fornecedor):', 15, y);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);
      y += 7;
      doc.text(conta.fornecedor_nome || 'Não informado', 15, y);
      y += 5;
      doc.text(`Código: ${conta.fornecedor_codigo}`, 15, y);
      
      // Detalhes do Pagamento
      y += 15;
      doc.setLineWidth(0.5);
      doc.line(15, y, pageWidth - 15, y);
      y += 10;
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('DETALHAMENTO DO PAGAMENTO', 15, y);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);
      
      y += 10;
      doc.text(`Referente a: ${conta.descricao}`, 15, y);
      y += 7;
      doc.text(`Data de Pagamento: ${format(new Date(dataPagamento), 'dd/MM/yyyy')}`, 15, y);
      
      y += 10;
      doc.text(`Valor Original: ${formatCurrency(valorOriginal)}`, 15, y);
      if (jurosMultaNum > 0) {
        y += 7;
        doc.text(`(+) Juros/Multa: ${formatCurrency(jurosMultaNum)}`, 15, y);
      }
      if (descontoNum > 0) {
        y += 7;
        doc.text(`(-) Desconto: ${formatCurrency(descontoNum)}`, 15, y);
      }
      y += 7;
      doc.setFont(undefined, 'bold');
      doc.text(`Valor Total: ${formatCurrency(valorFinal)}`, 15, y);
      doc.setFont(undefined, 'normal');
      
      // Formas de Pagamento
      y += 15;
      doc.setFont(undefined, 'bold');
      doc.text('FORMAS DE PAGAMENTO:', 15, y);
      doc.setFont(undefined, 'normal');
      
      formasPagamento.forEach((fp, idx) => {
        if (parseFloat(fp.valor) > 0) {
          y += 7;
          let tipoLabel = fp.tipo === 'dinheiro' ? '💵 Dinheiro' :
                         fp.tipo === 'cheque_terceiro' ? '🎫 Cheque de Terceiro' :
                         fp.tipo === 'pecas' ? '⚙️ Peças/Permuta' :
                         fp.tipo === 'pix' ? '🏦 PIX' :
                         fp.tipo === 'transferencia' ? '🏦 Transferência' :
                         fp.tipo === 'credito' ? '💳 Cartão Crédito' : fp.tipo;
          
          doc.text(`${idx + 1}. ${tipoLabel}: ${formatCurrency(fp.valor)}`, 20, y);
          if (fp.detalhes) {
            y += 5;
            doc.setFontSize(9);
            doc.text(`   ${fp.detalhes}`, 23, y);
            doc.setFontSize(10);
          }
        }
      });
      
      y += 10;
      doc.setFont(undefined, 'bold');
      doc.text(`TOTAL PAGO: ${formatCurrency(totalPago)}`, 15, y);
      doc.setFont(undefined, 'normal');
      
      // Assinaturas
      y += 30;
      doc.setLineWidth(0.5);
      doc.line(15, y, 90, y);
      doc.line(110, y, 185, y);
      y += 5;
      doc.setFontSize(9);
      doc.text('Assinatura do Pagador', 15, y);
      doc.text('Assinatura do Recebedor', 110, y);
      
      // Rodapé
      y += 20;
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text('Este recibo foi gerado eletronicamente pelo sistema J&C System.', pageWidth / 2, y, { align: 'center' });
      doc.text('Via 1 - Fornecedor | Via 2 - Empresa', pageWidth / 2, y + 5, { align: 'center' });
      
      // Salvar PDF
      const pdfBlob = doc.output('blob');
      const file = new File([pdfBlob], `recibo_${conta.id}_${Date.now()}.pdf`, { type: 'application/pdf' });
      
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      return file_url;
    } catch (error) {
      toast.error('Erro ao gerar PDF do recibo');
      throw error;
    } finally {
      setGerando(false);
    }
  };

  const handleConfirmar = async () => {
    // Validações
    if (totalPago <= 0) {
      toast.error('Informe pelo menos uma forma de pagamento');
      return;
    }

    const dinheiroUsado = formasPagamento
      .filter(fp => fp.tipo === 'dinheiro')
      .reduce((sum, fp) => sum + (parseFloat(fp.valor) || 0), 0);

    if (dinheiroUsado > saldoCaixa) {
      toast.error(`Saldo insuficiente no caixa! Disponível: ${formatCurrency(saldoCaixa)}`);
      return;
    }

    if (Math.abs(diferenca) > 0.01) {
      const confirmar = window.confirm(
        diferenca > 0 
          ? `Falta pagar ${formatCurrency(diferenca)}. Deseja registrar como pagamento parcial?`
          : `O valor pago excede em ${formatCurrency(Math.abs(diferenca))}. Confirmar mesmo assim?`
      );
      if (!confirmar) return;
    }

    // Gerar PDF do recibo
    setGerando(true);
    try {
      const reciboUrl = await gerarReciboPDF();
      
      const dadosPagamento = {
        data_pagamento: dataPagamento,
        juros_multa: jurosMultaNum,
        desconto: descontoNum,
        valor_pago: totalPago,
        saldo_restante: Math.max(0, diferenca),
        formas_pagamento: formasPagamento.filter(fp => parseFloat(fp.valor) > 0),
        status: diferenca > 0.01 ? 'parcial' : 'pago',
        observacao,
        recibo_url: reciboUrl
      };

      onConfirm(dadosPagamento);
    } catch (error) {
      setGerando(false);
    }
  };

  return (
    <div className="space-y-4 max-h-[80vh] overflow-y-auto">
      {/* Resumo da Conta */}
      <Card className="p-4 bg-blue-50">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-slate-600">Fornecedor</p>
            <p className="font-semibold text-slate-800">{conta?.fornecedor_nome}</p>
          </div>
          <div>
            <p className="text-xs text-slate-600">Vencimento</p>
            <p className="font-medium">
              {conta?.data_vencimento ? format(new Date(conta.data_vencimento), 'dd/MM/yyyy') : '-'}
            </p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-slate-600">Descrição</p>
            <p className="text-sm">{conta?.descricao}</p>
          </div>
        </div>
      </Card>

      {/* Data de Pagamento */}
      <div className="space-y-2">
        <Label>Data do Pagamento *</Label>
        <Input
          type="date"
          value={dataPagamento}
          onChange={(e) => setDataPagamento(e.target.value)}
          required
        />
      </div>

      {/* Ajustes */}
      <Card className="p-4 space-y-3">
        <h3 className="font-semibold text-slate-800">Ajustes de Valor</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>(+) Juros/Multa</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={jurosMulta}
              onChange={(e) => setJurosMulta(e.target.value)}
              placeholder="0,00"
            />
          </div>
          <div className="space-y-2">
            <Label>(-) Desconto</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={desconto}
              onChange={(e) => setDesconto(e.target.value)}
              placeholder="0,00"
            />
          </div>
        </div>
        <div className="pt-3 border-t space-y-1">
          <div className="flex justify-between text-sm">
            <span>Valor Original:</span>
            <span className="font-medium">{formatCurrency(valorOriginal)}</span>
          </div>
          {jurosMultaNum > 0 && (
            <div className="flex justify-between text-sm text-red-600">
              <span>Juros/Multa:</span>
              <span>+ {formatCurrency(jurosMultaNum)}</span>
            </div>
          )}
          {descontoNum > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Desconto:</span>
              <span>- {formatCurrency(descontoNum)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg border-t pt-2">
            <span>Total a Pagar:</span>
            <span className="text-blue-700">{formatCurrency(valorFinal)}</span>
          </div>
        </div>
      </Card>

      {/* Formas de Pagamento */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">Formas de Pagamento</h3>
          <Button type="button" size="sm" variant="outline" onClick={adicionarFormaPagamento}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar
          </Button>
        </div>

        <div className="space-y-3">
          {formasPagamento.map((fp, index) => (
            <Card key={index} className="p-3 bg-slate-50">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Forma {index + 1}</span>
                  {formasPagamento.length > 1 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => removerFormaPagamento(index)}
                      className="h-6 text-red-600"
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
                        <SelectItem value="dinheiro">💵 Dinheiro</SelectItem>
                        <SelectItem value="cheque_terceiro">🎫 Cheque Terceiro</SelectItem>
                        <SelectItem value="pecas">⚙️ Peças/Permuta</SelectItem>
                        <SelectItem value="pix">🏦 PIX</SelectItem>
                        <SelectItem value="transferencia">🏦 Transferência</SelectItem>
                        <SelectItem value="credito">💳 Cartão Crédito</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Valor (R$) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={fp.valor}
                      onChange={(e) => atualizarFormaPagamento(index, 'valor', e.target.value)}
                    />
                  </div>
                </div>

                {fp.tipo === 'dinheiro' && (
                  <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <p className="text-xs text-emerald-700">
                      💰 Saldo disponível no caixa: {formatCurrency(saldoCaixa)}
                    </p>
                  </div>
                )}

                {fp.tipo === 'cheque_terceiro' && (
                  <div className="space-y-2">
                    <Label>Buscar Cheque em Carteira</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Buscar por número, banco ou titular..."
                        value={searchCheque}
                        onChange={(e) => setSearchCheque(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    {searchCheque && chequesDisponiveis.length > 0 && (
                      <div className="max-h-48 overflow-y-auto space-y-2 p-2 bg-white rounded-lg border">
                        {chequesDisponiveis.map((cheque) => (
                          <div
                            key={cheque.id}
                            onClick={() => selecionarCheque(index, cheque)}
                            className="p-2 hover:bg-blue-50 rounded-lg cursor-pointer border"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-mono text-sm font-medium">
                                  {cheque.banco} Nº {cheque.numero_cheque}
                                </p>
                                <p className="text-xs text-slate-500">{cheque.emitente}</p>
                              </div>
                              <span className="font-bold text-blue-600">{formatCurrency(cheque.valor)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {fp.cheque_id && (
                      <div className="p-2 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-xs text-green-700 font-medium">✓ Cheque selecionado</p>
                      </div>
                    )}
                  </div>
                )}

                {fp.tipo === 'pecas' && (
                  <div className="space-y-2">
                    <Label>Descrição da Permuta</Label>
                    <Textarea
                      value={fp.detalhes}
                      onChange={(e) => atualizarFormaPagamento(index, 'detalhes', e.target.value)}
                      placeholder="Ex: Troca por mercadoria do Pedido #12345"
                      rows={2}
                    />
                  </div>
                )}

                {fp.tipo === 'credito' && (
                  <div className="space-y-2">
                    <Label>Número de Parcelas</Label>
                    <Select 
                      value={fp.detalhes} 
                      onValueChange={(v) => atualizarFormaPagamento(index, 'detalhes', v)}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
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

        <div className="pt-3 border-t">
          <div className="flex justify-between items-center">
            <span className="font-bold text-lg">Total Pago:</span>
            <span className="font-bold text-2xl text-emerald-600">{formatCurrency(totalPago)}</span>
          </div>
          {Math.abs(diferenca) > 0.01 && (
            <div className={cn(
              "flex justify-between items-center mt-2 p-2 rounded-lg",
              diferenca > 0 ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
            )}>
              <span className="text-sm font-semibold">
                {diferenca > 0 ? 'Falta Pagar:' : 'Excedente:'}
              </span>
              <span className="font-bold">{formatCurrency(Math.abs(diferenca))}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Observações */}
      <div className="space-y-2">
        <Label>Observações</Label>
        <Textarea
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          placeholder="Anotações sobre o pagamento..."
          rows={2}
        />
      </div>

      {/* Ações */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading || gerando}>
          Cancelar
        </Button>
        <Button 
          type="button" 
          onClick={handleConfirmar} 
          disabled={isLoading || gerando}
          className={cn("gap-2", (isLoading || gerando) && "cursor-not-allowed opacity-70")}
        >
          {gerando ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Gerando Recibo...
            </>
          ) : isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              Confirmar Pagamento
            </>
          )}
        </Button>
      </div>
    </div>
  );
}