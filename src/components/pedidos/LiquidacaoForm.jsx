import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, CheckCircle, X, Wallet, Percent, Loader2, Upload, FileText, Trash2 } from "lucide-react";
import ModalContainer from "@/components/modals/ModalContainer";
import AdicionarChequeModal from "@/components/pedidos/AdicionarChequeModal";
import { toast } from "sonner";

export default function LiquidacaoForm({ pedido, onSave, onCancel, isLoading }) {
  const saldoAtual = pedido.saldo_restante || (pedido.valor_pedido - (pedido.total_pago || 0));
  const [tipo, setTipo] = useState('total');
  const [valorPagamento, setValorPagamento] = useState(saldoAtual);
  const [formaPagamento, setFormaPagamento] = useState('dinheiro');
  const [parcelasCreditoQtd, setParcelasCreditoQtd] = useState('1');
  const [dadosCheque, setDadosCheque] = useState({ numero: '', banco: '', agencia: '' });
  const [showChequeModal, setShowChequeModal] = useState(false);
  const [chequesSalvos, setChequesSalvos] = useState([]);
  const [creditoDisponivelTotal, setCreditoDisponivelTotal] = useState(0);
  const [creditoAUsar, setCreditoAUsar] = useState(0);
  const [descontoTipo, setDescontoTipo] = useState('reais');
  const [descontoValor, setDescontoValor] = useState('');
  const [devolucao, setDevolucao] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [comprovantes, setComprovantes] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);

  const { data: creditos = [] } = useQuery({
    queryKey: ['creditos', pedido.cliente_codigo],
    queryFn: async () => {
      if (!pedido.cliente_codigo) return [];
      const todosCreditos = await base44.entities.Credito.list();
      return todosCreditos.filter(c => c.cliente_codigo === pedido.cliente_codigo && c.status === 'disponivel');
    },
    enabled: !!pedido.cliente_codigo
  });

  const { data: portsDisponiveis = [] } = useQuery({
    queryKey: ['ports-disponiveis', pedido.id],
    queryFn: async () => {
      const allPorts = await base44.entities.Port.list();
      return allPorts.filter(port => 
        port.pedidos_ids?.includes(pedido.id) && 
        port.saldo_disponivel > 0 &&
        !['devolvido', 'finalizado'].includes(port.status)
      );
    },
    enabled: !!pedido.id
  });

  const [portSelecionado, setPortSelecionado] = useState(null);
  const [valorPortAUsar, setValorPortAUsar] = useState(0);

  useEffect(() => {
    const total = creditos.reduce((sum, c) => sum + (c.valor || 0), 0);
    setCreditoDisponivelTotal(total);
  }, [creditos]);

  useEffect(() => {
    if (portsDisponiveis.length > 0 && !portSelecionado) {
      setPortSelecionado(portsDisponiveis[0]);
      setValorPortAUsar(Math.min(portsDisponiveis[0].saldo_disponivel, saldoAtual));
    }
  }, [portsDisponiveis]);

  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

  const calcularDesconto = () => {
    if (!descontoValor) return 0;
    if (descontoTipo === 'porcentagem') return (saldoAtual * parseFloat(descontoValor)) / 100;
    return parseFloat(descontoValor) || 0;
  };

  const handleSaveCheque = async (chequeData) => {
    await base44.entities.Cheque.create(chequeData);
    const novosCheques = [...chequesSalvos, chequeData];
    setChequesSalvos(novosCheques);
    if (formaPagamento === 'cheque') {
      const totalCheques = novosCheques.reduce((sum, ch) => sum + (parseFloat(ch.valor) || 0), 0);
      setValorPagamento(totalCheques);
    }
    setShowChequeModal(false);
    toast.success('Cheque cadastrado!');
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingFile(true);
    try {
      const uploadPromises = files.map(file => base44.integrations.Core.UploadFile({ file }));
      const results = await Promise.all(uploadPromises);
      const urls = results.map(r => r.file_url);
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

  const handleSaveChequeAndAddAnother = async (chequeData) => {
    await base44.entities.Cheque.create(chequeData);
    const novosCheques = [...chequesSalvos, chequeData];
    setChequesSalvos(novosCheques);
    if (formaPagamento === 'cheque') {
      const totalCheques = novosCheques.reduce((sum, ch) => sum + (parseFloat(ch.valor) || 0), 0);
      setValorPagamento(totalCheques);
    }
    toast.success('Cheque cadastrado! Adicione outro.');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const user = await base44.auth.me();
      const desconto = calcularDesconto();
      const devolucaoValor = parseFloat(devolucao) || 0;
      const saldoComAjustes = saldoAtual - desconto - devolucaoValor;
      const valorComCredito = valorPagamento + creditoAUsar + valorPortAUsar;
      const novoTotalPago = (pedido.total_pago || 0) + valorPagamento + valorPortAUsar;
      const novoDescontoTotal = (pedido.desconto_dado || 0) + desconto;
      const novoSaldo = pedido.valor_pedido - novoTotalPago - novoDescontoTotal - devolucaoValor;

      if (valorComCredito > saldoComAjustes) {
        const excedente = valorComCredito - saldoComAjustes;
        const confirmar = window.confirm(`⚠️ ATENÇÃO!\n\nValor a pagar: ${formatCurrency(valorComCredito)}\nSaldo em aberto: ${formatCurrency(saldoComAjustes)}\nExcedente: ${formatCurrency(excedente)}\n\nUm crédito será gerado.\n\nContinuar?`);
        if (!confirmar) {
          setIsSaving(false);
          return;
        }
      }

      // **CRIAR BORDERÔ**
      const todosBorderos = await base44.entities.Bordero.list();
      const proximoNumeroBordero = todosBorderos.length > 0 ? Math.max(...todosBorderos.map(b => b.numero_bordero || 0)) + 1 : 1;

      let formaPagamentoStr = `${formaPagamento.toUpperCase()}: ${formatCurrency(valorPagamento)}`;
      if (formaPagamento === 'credito' && parcelasCreditoQtd !== '1') formaPagamentoStr += ` (${parcelasCreditoQtd}x)`;
      if (formaPagamento === 'cheque' && dadosCheque.numero) formaPagamentoStr += ` | Cheque: ${dadosCheque.numero}`;
      if (chequesSalvos.length > 0) formaPagamentoStr += ` | ${chequesSalvos.length} cheque(s)`;
      if (creditoAUsar > 0) formaPagamentoStr += ` | CRÉDITO: ${formatCurrency(creditoAUsar)}`;
      if (valorPortAUsar > 0) formaPagamentoStr += ` | SINAL (PORT #${portSelecionado.numero_port}): ${formatCurrency(valorPortAUsar)}`;

      const chequesAnexos = chequesSalvos.map(ch => ({
        numero: ch.numero_cheque,
        banco: ch.banco,
        agencia: ch.agencia,
        conta: ch.conta,
        emitente: ch.emitente,
        valor: ch.valor,
        data_vencimento: ch.data_vencimento,
        anexo_foto_url: ch.anexo_foto_url,
        anexo_video_url: ch.anexo_video_url
      }));

      // Copiar comprovantes do PORT se estiver usando sinal
      let comprovantesFinais = [...comprovantes];
      if (valorPortAUsar > 0 && portSelecionado?.comprovantes_urls) {
        comprovantesFinais = [...comprovantesFinais, ...portSelecionado.comprovantes_urls];
      }

      await base44.entities.Bordero.create({
        numero_bordero: proximoNumeroBordero,
        tipo_liquidacao: 'individual',
        cliente_codigo: pedido.cliente_codigo,
        cliente_nome: pedido.cliente_nome,
        pedidos_ids: [pedido.id],
        valor_total: valorPagamento + creditoAUsar + valorPortAUsar,
        forma_pagamento: formaPagamentoStr,
        comprovantes_urls: comprovantesFinais,
        cheques_anexos: chequesAnexos,
        observacao: desconto > 0 ? `Desconto: ${formatCurrency(desconto)}` : '',
        liquidado_por: user.email
      });

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
        mes_pagamento: novoSaldo <= 0 ? new Date().toISOString().slice(0, 7) : pedido.mes_pagamento,
        outras_informacoes: novasOutrasInfo,
        bordero_numero: proximoNumeroBordero
      };

      // Atualizar PORT se foi usado
      if (valorPortAUsar > 0 && portSelecionado) {
        const novoSaldoPort = portSelecionado.saldo_disponivel - valorPortAUsar;
        const novoStatusPort = novoSaldoPort <= 0 ? 'finalizado' : 'parcialmente_usado';
        
        await base44.entities.Port.update(portSelecionado.id, {
          saldo_disponivel: novoSaldoPort,
          status: novoStatusPort,
          observacao: `${portSelecionado.observacao || ''}\n[${new Date().toLocaleDateString('pt-BR')}] Usado ${formatCurrency(valorPortAUsar)} no Borderô #${proximoNumeroBordero}`.trim()
        });
      }

      if (creditoAUsar > 0) {
        let valorRestante = creditoAUsar;
        for (const credito of creditos) {
          if (valorRestante <= 0) break;
          await base44.entities.Credito.update(credito.id, {
            status: 'usado',
            pedido_uso_id: pedido.id,
            data_uso: new Date().toISOString().split('T')[0]
          });
          valorRestante -= credito.valor;
        }
      }

      if (novoSaldo < 0) {
        const valorCredito = Math.abs(novoSaldo);
        const todosCreditos = await base44.entities.Credito.list();
        const proximoNumero = todosCreditos.length > 0 ? Math.max(...todosCreditos.map(c => c.numero_credito || 0)) + 1 : 1;
        
        await base44.entities.Credito.create({
          numero_credito: proximoNumero,
          cliente_codigo: pedido.cliente_codigo,
          cliente_nome: pedido.cliente_nome,
          valor: valorCredito,
          origem: `Excedente Pedido ${pedido.numero_pedido}`,
          pedido_origem_id: pedido.id,
          status: 'disponivel'
        });
        
        dataToSave.outras_informacoes += `\nCRÉDITO GERADO: #${proximoNumero} - ${formatCurrency(valorCredito)}`;
        toast.success(`Crédito #${proximoNumero} de ${formatCurrency(valorCredito)} gerado!`);
      }

      await onSave(dataToSave);
      toast.success(`Borderô #${proximoNumeroBordero} criado com sucesso!`);
    } catch (error) {
      toast.error('Erro ao processar: ' + error.message);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="p-4 bg-slate-50">
        <div className="grid grid-cols-2 gap-4">
          <div><p className="text-sm text-slate-500">Pedido</p><p className="font-semibold">{pedido.numero_pedido}</p></div>
          <div><p className="text-sm text-slate-500">Cliente</p><p className="font-semibold">{pedido.cliente_nome}</p></div>
          <div><p className="text-sm text-slate-500">Valor Total</p><p className="font-semibold text-lg">{formatCurrency(pedido.valor_pedido)}</p></div>
          <div><p className="text-sm text-slate-500">Já Pago</p><p className="font-semibold text-lg text-emerald-600">{formatCurrency(pedido.total_pago)}</p></div>
        </div>
        <div className="mt-4 pt-4 border-t">
          <p className="text-sm text-slate-500">Saldo Restante</p>
          <p className="font-bold text-2xl text-amber-600">{formatCurrency(saldoAtual)}</p>
        </div>
      </Card>

      <Card className="p-4 bg-slate-50 space-y-4">
        <h3 className="font-semibold text-slate-800">Ajustes de Pagamento</h3>
        <div className="space-y-2">
          <Label>Desconto</Label>
          <RadioGroup value={descontoTipo} onValueChange={setDescontoTipo} className="flex gap-4">
            <div className="flex items-center gap-2"><RadioGroupItem value="reais" id="desc-reais" /><Label htmlFor="desc-reais" className="cursor-pointer">Em Reais (R$)</Label></div>
            <div className="flex items-center gap-2"><RadioGroupItem value="porcentagem" id="desc-porc" /><Label htmlFor="desc-porc" className="cursor-pointer">Em Porcentagem (%)</Label></div>
          </RadioGroup>
          <div className="relative">
            {descontoTipo === 'reais' ? <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /> : <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />}
            <Input type="number" step="0.01" min="0" placeholder={descontoTipo === 'reais' ? 'Valor em reais' : 'Porcentagem'} value={descontoValor} onChange={(e) => setDescontoValor(e.target.value)} className="pl-10" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Devolução (R$)</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input type="number" step="0.01" min="0" placeholder="Valor de devolução" value={devolucao} onChange={(e) => setDevolucao(e.target.value)} className="pl-10" />
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        <Label>Tipo de Liquidação</Label>
        <RadioGroup value={tipo} onValueChange={(value) => { setTipo(value); if (value === 'total') setValorPagamento(saldoAtual); }}>
          <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-slate-50">
            <RadioGroupItem value="total" id="total" />
            <Label htmlFor="total" className="flex-1 cursor-pointer"><span className="font-medium">Pagamento Total</span><p className="text-sm text-slate-500">Quitar todo o saldo restante</p></Label>
          </div>
          <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-slate-50">
            <RadioGroupItem value="parcial" id="parcial" />
            <Label htmlFor="parcial" className="flex-1 cursor-pointer"><span className="font-medium">Pagamento Parcial</span><p className="text-sm text-slate-500">Informar valor específico</p></Label>
          </div>
        </RadioGroup>
      </div>

      {tipo === 'parcial' && (
        <div className="space-y-2">
          <Label htmlFor="valorPagamento">Valor do Pagamento (R$)</Label>
          <Input id="valorPagamento" type="number" min="0.01" max={saldoAtual} step="0.01" value={valorPagamento} onChange={(e) => setValorPagamento(parseFloat(e.target.value) || 0)} required />
        </div>
      )}

      {portsDisponiveis.length > 0 && (
        <Card className="p-4 bg-amber-50 border-amber-200">
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="w-5 h-5 text-amber-600" />
            <span className="font-bold text-amber-700">💰 Sinal Disponível (PORT)</span>
          </div>
          <div className="space-y-3">
            {portsDisponiveis.map(port => (
              <div key={port.id} className="p-3 bg-white border border-amber-300 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-700">PORT #{port.numero_port}</span>
                  <Badge className="bg-amber-100 text-amber-700">
                    Saldo: {formatCurrency(port.saldo_disponivel)}
                  </Badge>
                </div>
                {portSelecionado?.id === port.id && (
                  <div className="space-y-2">
                    <Label htmlFor="valorPortAUsar">Quanto usar do sinal? (R$)</Label>
                    <Input
                      id="valorPortAUsar"
                      type="number"
                      min="0"
                      max={Math.min(port.saldo_disponivel, saldoAtual)}
                      step="0.01"
                      value={valorPortAUsar}
                      onChange={(e) => setValorPortAUsar(parseFloat(e.target.value) || 0)}
                      className="border-amber-300 focus:ring-amber-500"
                    />
                    <p className="text-xs text-amber-600">
                      Após usar, restará: {formatCurrency(port.saldo_disponivel - valorPortAUsar)}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {creditoDisponivelTotal > 0 && (
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-center gap-2 mb-3"><Wallet className="w-5 h-5 text-green-600" /><span className="font-medium text-green-700">Crédito Disponível</span></div>
          <div className="space-y-3">
            <div><p className="text-sm text-green-600">Total Disponível</p><p className="font-bold text-lg text-green-700">{formatCurrency(creditoDisponivelTotal)}</p></div>
            <div className="space-y-2">
              <Label htmlFor="creditoAUsar">Quanto usar do crédito? (R$)</Label>
              <Input id="creditoAUsar" type="number" min="0" max={Math.min(creditoDisponivelTotal, saldoAtual)} step="0.01" value={creditoAUsar} onChange={(e) => setCreditoAUsar(parseFloat(e.target.value) || 0)} className="border-green-300 focus:ring-green-500" />
              <p className="text-xs text-green-600">Após usar crédito, restará: {formatCurrency(creditoDisponivelTotal - creditoAUsar)}</p>
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-2">
        <Label>Forma de Pagamento</Label>
        <Select value={formaPagamento} onValueChange={setFormaPagamento}>
          <SelectTrigger><SelectValue /></SelectTrigger>
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

      {formaPagamento === 'credito' && (
        <div className="space-y-2">
          <Label>Parcelamento</Label>
          <Select value={parcelasCreditoQtd} onValueChange={setParcelasCreditoQtd}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{Array.from({length: 18}, (_, i) => i + 1).map(n => (<SelectItem key={n} value={String(n)}>{n}x</SelectItem>))}</SelectContent>
          </Select>
        </div>
      )}

      {formaPagamento === 'cheque' && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2"><Label>Número do Cheque</Label><Input value={dadosCheque.numero} onChange={(e) => setDadosCheque({...dadosCheque, numero: e.target.value})} placeholder="123456" /></div>
            <div className="space-y-2"><Label>Banco</Label><Input value={dadosCheque.banco} onChange={(e) => setDadosCheque({...dadosCheque, banco: e.target.value})} placeholder="Ex: 001" /></div>
            <div className="space-y-2"><Label>Agência</Label><Input value={dadosCheque.agencia} onChange={(e) => setDadosCheque({...dadosCheque, agencia: e.target.value})} placeholder="1234" /></div>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setShowChequeModal(true)} className="flex-1">{chequesSalvos.length > 0 ? `${chequesSalvos.length} Cheque(s) Cadastrado(s)` : 'Cadastrar Cheque Completo'}</Button>
            {chequesSalvos.length > 0 && <Button type="button" variant="secondary" onClick={() => setShowChequeModal(true)} className="gap-2">Consultar/Editar</Button>}
          </div>
        </div>
      )}

      <Card className="p-4 bg-emerald-50 border-emerald-200">
        <div className="flex items-center gap-2 mb-3"><CheckCircle className="w-5 h-5 text-emerald-600" /><span className="font-medium text-emerald-700">Totalizadores</span></div>
        <div className="space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-slate-600">Saldo Original:</span><span className="font-medium">{formatCurrency(saldoAtual)}</span></div>
        {descontoValor && <div className="flex justify-between text-red-600"><span>Desconto ({descontoTipo === 'porcentagem' ? `${descontoValor}%` : 'R$'}):</span><span className="font-medium">- {formatCurrency(calcularDesconto())}</span></div>}
        {devolucao && <div className="flex justify-between text-orange-600"><span>Devolução:</span><span className="font-medium">- {formatCurrency(parseFloat(devolucao) || 0)}</span></div>}
        <div className="flex justify-between border-t pt-2"><span className="text-slate-600">Saldo Ajustado:</span><span className="font-semibold">{formatCurrency(saldoAtual - calcularDesconto() - (parseFloat(devolucao) || 0))}</span></div>
        {valorPortAUsar > 0 && <div className="flex justify-between text-amber-600"><span>Sinal PORT #{portSelecionado?.numero_port}:</span><span className="font-semibold">{formatCurrency(valorPortAUsar)}</span></div>}
        <div className="flex justify-between text-blue-600"><span>Pagamento em {formaPagamento}:</span><span className="font-semibold">{formatCurrency(valorPagamento)}</span></div>
        {creditoAUsar > 0 && <div className="flex justify-between text-green-600"><span>Crédito Usado:</span><span className="font-semibold">{formatCurrency(creditoAUsar)}</span></div>}
        <div className="flex justify-between border-t pt-2 text-lg"><span className="font-bold text-slate-800">Novo Saldo:</span><span className="font-bold text-emerald-700">{formatCurrency(Math.max(0, saldoAtual - calcularDesconto() - (parseFloat(devolucao) || 0) - valorPagamento - creditoAUsar - valorPortAUsar))}</span></div>
        </div>
      </Card>

      {/* SEÇÃO DE ANEXOS */}
      <Card className="p-6 space-y-4 bg-gradient-to-br from-slate-50 to-white border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Anexos do Pagamento
            </h3>
            <p className="text-xs text-slate-500 mt-1">Comprovantes, notas fiscais, recibos, etc.</p>
          </div>
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
              {uploadingFile ? 'Enviando...' : 'Anexar Arquivos'}
            </Button>
          </label>
        </div>

        {comprovantes.length > 0 && (
          <div className="space-y-2">
            {comprovantes.map((url, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:border-blue-300 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">Comprovante {index + 1}</p>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                      Ver arquivo
                    </a>
                  </div>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => removerComprovante(index)}
                  className="text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {comprovantes.length === 0 && !uploadingFile && (
          <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-lg">
            <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Nenhum arquivo anexado</p>
          </div>
        )}
      </Card>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading || isSaving}><X className="w-4 h-4 mr-2" />Cancelar</Button>
        <Button type="submit" disabled={isLoading || isSaving || (valorPagamento + creditoAUsar) <= 0} className="bg-emerald-600 hover:bg-emerald-700">
          {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processando...</> : <><DollarSign className="w-4 h-4 mr-2" />Confirmar Pagamento</>}
        </Button>
      </div>

      {isSaving && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
            <div className="text-center"><h3 className="text-lg font-bold text-slate-800">Processando Pagamento</h3><p className="text-sm text-slate-500">Gerando Borderô #{proximoNumeroBordero}...</p></div>
          </div>
        </div>
      )}

      <ModalContainer open={showChequeModal} onClose={() => setShowChequeModal(false)} title="Adicionar Cheque" description="Preencha os dados do cheque" size="lg">
        <AdicionarChequeModal clienteInfo={{ cliente_codigo: pedido.cliente_codigo, cliente_nome: pedido.cliente_nome }} onSave={handleSaveCheque} onSaveAndAddAnother={handleSaveChequeAndAddAnother} onCancel={() => setShowChequeModal(false)} />
      </ModalContainer>
    </form>
  );
}