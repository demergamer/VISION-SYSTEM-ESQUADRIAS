import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DollarSign, CheckCircle, X, Wallet, Percent, Loader2 } from "lucide-react";
import ModalContainer from "@/components/modals/ModalContainer";
import AdicionarChequeModal from "@/components/pedidos/AdicionarChequeModal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function LiquidacaoForm({ pedido, onSave, onCancel, isLoading }) {
  const saldoAtual = pedido.saldo_restante || (pedido.valor_pedido - (pedido.total_pago || 0));
  const [tipo, setTipo] = useState('total');
  const [valorPagamento, setValorPagamento] = useState(saldoAtual);
  const [formaPagamento, setFormaPagamento] = useState('dinheiro');
  const [parcelasCreditoQtd, setParcelasCreditoQtd] = useState('1');
  const [dadosCheque, setDadosCheque] = useState({
    numero: '',
    banco: '',
    agencia: ''
  });
  const [showChequeModal, setShowChequeModal] = useState(false);
  const [chequesSalvos, setChequesSalvos] = useState([]);
  const [creditoDisponivelTotal, setCreditoDisponivelTotal] = useState(0);
  const [creditoAUsar, setCreditoAUsar] = useState(0);
  const [descontoTipo, setDescontoTipo] = useState('reais');
  const [descontoValor, setDescontoValor] = useState('');
  const [devolucao, setDevolucao] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Buscar créditos disponíveis do cliente
  const { data: creditos = [] } = useQuery({
    queryKey: ['creditos', pedido.cliente_codigo],
    queryFn: async () => {
      if (!pedido.cliente_codigo) return [];
      const todosCreditos = await base44.entities.Credito.list();
      return todosCreditos.filter(c => 
        c.cliente_codigo === pedido.cliente_codigo && c.status === 'disponivel'
      );
    },
    enabled: !!pedido.cliente_codigo
  });

  useEffect(() => {
    const total = creditos.reduce((sum, c) => sum + (c.valor || 0), 0);
    setCreditoDisponivelTotal(total);
  }, [creditos]);

  const handleSaveCheque = async (chequeData) => {
    try {
      await base44.entities.Cheque.create(chequeData);
      const novosCheques = [...chequesSalvos, chequeData];
      setChequesSalvos(novosCheques);
      
      // Atualizar valor pago com a soma dos cheques
      if (formaPagamento === 'cheque') {
        const totalCheques = novosCheques.reduce((sum, ch) => sum + (parseFloat(ch.valor) || 0), 0);
        setValorPagamento(totalCheques);
      }
      
      setShowChequeModal(false);
      toast.success('Cheque cadastrado!');
    } catch (error) {
      toast.error('Erro ao cadastrar cheque');
    }
  };

  const handleSaveChequeAndAddAnother = async (chequeData) => {
    try {
      await base44.entities.Cheque.create(chequeData);
      const novosCheques = [...chequesSalvos, chequeData];
      setChequesSalvos(novosCheques);
      
      // Atualizar valor pago com a soma dos cheques
      if (formaPagamento === 'cheque') {
        const totalCheques = novosCheques.reduce((sum, ch) => sum + (parseFloat(ch.valor) || 0), 0);
        setValorPagamento(totalCheques);
      }
      
      toast.success('Cheque cadastrado! Adicione outro.');
    } catch (error) {
      toast.error('Erro ao cadastrar cheque');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const calcularDesconto = () => {
    if (!descontoValor) return 0;
    if (descontoTipo === 'porcentagem') {
      return (saldoAtual * parseFloat(descontoValor)) / 100;
    }
    return parseFloat(descontoValor) || 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const desconto = calcularDesconto();
      const devolucaoValor = parseFloat(devolucao) || 0;
      const saldoComAjustes = saldoAtual - desconto - devolucaoValor;
      
      const valorComCredito = valorPagamento + creditoAUsar;
      const novoTotalPago = (pedido.total_pago || 0) + valorPagamento;
      const novoDescontoTotal = (pedido.desconto_dado || 0) + desconto;
      const novoSaldo = pedido.valor_pedido - novoTotalPago - novoDescontoTotal - devolucaoValor;
    
    // Confirmar se valor pago é maior que o saldo (considerando ajustes)
    if (valorComCredito > saldoComAjustes) {
      const excedente = valorComCredito - saldoComAjustes;
      const confirmar = window.confirm(
        `⚠️ ATENÇÃO!\n\n` +
        `Valor a pagar: ${formatCurrency(valorComCredito)}\n` +
        `Saldo em aberto (com ajustes): ${formatCurrency(saldoComAjustes)}\n` +
        `Excedente: ${formatCurrency(excedente)}\n\n` +
        `Um crédito será gerado para o cliente.\n\n` +
        `Deseja continuar?`
      );
      
      if (!confirmar) return;
    }
    
    const mesAtual = new Date().toISOString().slice(0, 7); // YYYY-MM
    
    // Construir string da forma de pagamento
    let formaPagamentoStr = '';
    if (valorPagamento > 0) {
      formaPagamentoStr = `${formaPagamento.toUpperCase()}: ${formatCurrency(valorPagamento)}`;
      
      if (formaPagamento === 'credito' && parcelasCreditoQtd !== '1') {
        formaPagamentoStr += ` (${parcelasCreditoQtd}x)`;
      }
      
      if (formaPagamento === 'cheque' && dadosCheque.numero) {
        formaPagamentoStr += ` | Cheque: ${dadosCheque.numero}`;
        if (dadosCheque.banco) formaPagamentoStr += ` - Banco: ${dadosCheque.banco}`;
        if (dadosCheque.agencia) formaPagamentoStr += ` - Ag: ${dadosCheque.agencia}`;
      }
      
      if (chequesSalvos.length > 0) {
        formaPagamentoStr += ` | ${chequesSalvos.length} cheque(s) cadastrado(s)`;
      }
    }
    
    if (creditoAUsar > 0) {
      if (formaPagamentoStr) formaPagamentoStr += ' | ';
      formaPagamentoStr += `CRÉDITO: ${formatCurrency(creditoAUsar)}`;
    }
    
    // Adicionar forma de pagamento em outras_informacoes
    const outrasInfoAtual = pedido.outras_informacoes || '';
    const novasOutrasInfo = outrasInfoAtual 
      ? `${outrasInfoAtual}\n[${new Date().toLocaleDateString('pt-BR')}] ${formaPagamentoStr}`
      : `[${new Date().toLocaleDateString('pt-BR')}] ${formaPagamentoStr}`;
    
    const dataToSave = {
      total_pago: novoTotalPago,
      saldo_restante: Math.max(0, novoSaldo),
      desconto_dado: novoDescontoTotal,
      status: novoSaldo <= 0 ? 'pago' : 'parcial',
      data_pagamento: novoSaldo <= 0 ? new Date().toISOString().split('T')[0] : pedido.data_pagamento,
      mes_pagamento: novoSaldo <= 0 ? mesAtual : pedido.mes_pagamento,
      outras_informacoes: novasOutrasInfo
    };
    
    // Marcar créditos como usados
    if (creditoAUsar > 0) {
      let valorRestante = creditoAUsar;
      for (const credito of creditos) {
        if (valorRestante <= 0) break;
        
        const valorUsar = Math.min(credito.valor, valorRestante);
        await base44.entities.Credito.update(credito.id, {
          status: 'usado',
          pedido_uso_id: pedido.id,
          data_uso: new Date().toISOString().split('T')[0]
        });
        
        valorRestante -= valorUsar;
      }
    }
    
    // Gerar crédito se pagamento exceder o saldo
    if (novoSaldo < 0) {
      const valorCredito = Math.abs(novoSaldo);
      
      // Buscar próximo número de crédito
      const todosCreditos = await base44.entities.Credito.list();
      const proximoNumero = todosCreditos.length > 0 
        ? Math.max(...todosCreditos.map(c => c.numero_credito || 0)) + 1 
        : 1;
      
      await base44.entities.Credito.create({
        numero_credito: proximoNumero,
        cliente_codigo: pedido.cliente_codigo,
        cliente_nome: pedido.cliente_nome,
        valor: valorCredito,
        origem: `Excedente Pedido ${pedido.numero_pedido}`,
        pedido_origem_id: pedido.id,
        status: 'disponivel'
      });
      
      // Atualizar outras_informacoes do pedido com a informação do crédito gerado
      const outrasInfoCreditoGerado = dataToSave.outras_informacoes + `\nCRÉDITO GERADO POR EXCESSO: #${proximoNumero} - ${formatCurrency(valorCredito)}`;
      dataToSave.outras_informacoes = outrasInfoCreditoGerado;
      
      toast.success(`Crédito #${proximoNumero} de ${formatCurrency(valorCredito)} gerado!`);
    }
    
      await onSave(dataToSave);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Resumo do Pedido */}
      <Card className="p-4 bg-slate-50">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-slate-500">Pedido</p>
            <p className="font-semibold">{pedido.numero_pedido}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Cliente</p>
            <p className="font-semibold">{pedido.cliente_nome}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Valor Total</p>
            <p className="font-semibold text-lg">{formatCurrency(pedido.valor_pedido)}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Já Pago</p>
            <p className="font-semibold text-lg text-emerald-600">{formatCurrency(pedido.total_pago)}</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t">
          <p className="text-sm text-slate-500">Saldo Restante</p>
          <p className="font-bold text-2xl text-amber-600">{formatCurrency(saldoAtual)}</p>
        </div>
      </Card>

      {/* Desconto e Devolução */}
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
            {descontoTipo === 'reais' ? (
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            ) : (
              <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            )}
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder={descontoTipo === 'reais' ? 'Valor em reais' : 'Porcentagem'}
              value={descontoValor}
              onChange={(e) => setDescontoValor(e.target.value)}
              className="pl-10"
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
              placeholder="Valor de devolução"
              value={devolucao}
              onChange={(e) => setDevolucao(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </Card>

      {/* Tipo de Liquidação */}
      <div className="space-y-3">
        <Label>Tipo de Liquidação</Label>
        <RadioGroup value={tipo} onValueChange={(value) => {
          setTipo(value);
          if (value === 'total') {
            setValorPagamento(saldoAtual);
          }
        }}>
          <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-slate-50">
            <RadioGroupItem value="total" id="total" />
            <Label htmlFor="total" className="flex-1 cursor-pointer">
              <span className="font-medium">Pagamento Total</span>
              <p className="text-sm text-slate-500">Quitar todo o saldo restante</p>
            </Label>
          </div>
          <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-slate-50">
            <RadioGroupItem value="parcial" id="parcial" />
            <Label htmlFor="parcial" className="flex-1 cursor-pointer">
              <span className="font-medium">Pagamento Parcial</span>
              <p className="text-sm text-slate-500">Informar valor específico</p>
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Valor do Pagamento */}
      {tipo === 'parcial' && (
        <div className="space-y-2">
          <Label htmlFor="valorPagamento">Valor do Pagamento (R$)</Label>
          <Input
            id="valorPagamento"
            type="number"
            min="0.01"
            max={saldoAtual}
            step="0.01"
            value={valorPagamento}
            onChange={(e) => setValorPagamento(parseFloat(e.target.value) || 0)}
            required
          />
        </div>
      )}

      {/* Crédito Disponível */}
      {creditoDisponivelTotal > 0 && (
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="w-5 h-5 text-green-600" />
            <span className="font-medium text-green-700">Crédito Disponível</span>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-green-600">Total Disponível</p>
              <p className="font-bold text-lg text-green-700">{formatCurrency(creditoDisponivelTotal)}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="creditoAUsar">Quanto usar do crédito? (R$)</Label>
              <Input
                id="creditoAUsar"
                type="number"
                min="0"
                max={Math.min(creditoDisponivelTotal, saldoAtual)}
                step="0.01"
                value={creditoAUsar}
                onChange={(e) => setCreditoAUsar(parseFloat(e.target.value) || 0)}
                className="border-green-300 focus:ring-green-500"
              />
              <p className="text-xs text-green-600">
                Após usar crédito, restará: {formatCurrency(creditoDisponivelTotal - creditoAUsar)}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Forma de Pagamento */}
      <div className="space-y-2">
        <Label>Forma de Pagamento</Label>
        <Select value={formaPagamento} onValueChange={setFormaPagamento}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dinheiro">Dinheiro</SelectItem>
            <SelectItem value="pix">PIX</SelectItem>
            <SelectItem value="cheque">Cheque</SelectItem>
            <SelectItem value="servicos">Serviços</SelectItem>
            <SelectItem value="debito">Débito</SelectItem>
            <SelectItem value="credito">Crédito</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Parcelas (se for crédito) - Até 18x */}
      {formaPagamento === 'credito' && (
        <div className="space-y-2">
          <Label>Parcelamento</Label>
          <Select value={parcelasCreditoQtd} onValueChange={setParcelasCreditoQtd}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({length: 18}, (_, i) => i + 1).map(n => (
                <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Dados do Cheque */}
      {formaPagamento === 'cheque' && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Número do Cheque</Label>
              <Input
                value={dadosCheque.numero}
                onChange={(e) => setDadosCheque({...dadosCheque, numero: e.target.value})}
                placeholder="123456"
              />
            </div>
            <div className="space-y-2">
              <Label>Banco</Label>
              <Input
                value={dadosCheque.banco}
                onChange={(e) => setDadosCheque({...dadosCheque, banco: e.target.value})}
                placeholder="Ex: 001"
              />
            </div>
            <div className="space-y-2">
              <Label>Agência</Label>
              <Input
                value={dadosCheque.agencia}
                onChange={(e) => setDadosCheque({...dadosCheque, agencia: e.target.value})}
                placeholder="1234"
              />
            </div>
          </div>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => setShowChequeModal(true)}
            className="w-full"
          >
            {chequesSalvos.length > 0 
              ? `${chequesSalvos.length} Cheque(s) Cadastrado(s) - Adicionar Mais` 
              : 'Cadastrar Cheque Completo'}
          </Button>
        </div>
      )}

      {/* Preview */}
      <Card className="p-4 bg-emerald-50 border-emerald-200">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          <span className="font-medium text-emerald-700">Após o pagamento:</span>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-emerald-600">Valor em {formaPagamento}</p>
            <p className="font-semibold text-emerald-700">
              {formatCurrency(valorPagamento)}
            </p>
          </div>
          {creditoAUsar > 0 && (
            <div>
              <p className="text-emerald-600">Crédito Usado</p>
              <p className="font-semibold text-emerald-700">
                {formatCurrency(creditoAUsar)}
              </p>
            </div>
          )}
          <div>
            <p className="text-emerald-600">Novo Total Pago</p>
            <p className="font-semibold text-emerald-700">
              {formatCurrency((pedido.total_pago || 0) + valorPagamento + creditoAUsar)}
            </p>
          </div>
          <div>
            <p className="text-emerald-600">Novo Saldo</p>
            <p className="font-semibold text-emerald-700">
              {formatCurrency(Math.max(0, saldoAtual - valorPagamento - creditoAUsar))}
            </p>
          </div>
        </div>
      </Card>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading || isSaving}>
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading || isSaving || (valorPagamento + creditoAUsar) <= 0} className="bg-emerald-600 hover:bg-emerald-700">
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <DollarSign className="w-4 h-4 mr-2" />
              Confirmar Pagamento
            </>
          )}
        </Button>
      </div>

      {/* Overlay de Loading */}
      {isSaving && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-800">Processando Pagamento</h3>
              <p className="text-sm text-slate-500">Atualizando registros...</p>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Adicionar Cheque */}
      <ModalContainer
        open={showChequeModal}
        onClose={() => setShowChequeModal(false)}
        title="Adicionar Cheque"
        description="Preencha os dados do cheque"
        size="lg"
      >
        <AdicionarChequeModal
          clienteInfo={{
            cliente_codigo: pedido.cliente_codigo,
            cliente_nome: pedido.cliente_nome
          }}
          onSave={handleSaveCheque}
          onSaveAndAddAnother={handleSaveChequeAndAddAnother}
          onCancel={() => setShowChequeModal(false)}
        />
      </ModalContainer>
    </form>
  );
}