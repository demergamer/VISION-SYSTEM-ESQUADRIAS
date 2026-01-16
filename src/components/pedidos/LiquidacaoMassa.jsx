import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, DollarSign, Percent, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import ModalContainer from "@/components/modals/ModalContainer";
import AdicionarChequeModal from "@/components/pedidos/AdicionarChequeModal";
import { toast } from "sonner";

export default function LiquidacaoMassa({ pedidos, onSave, onCancel, isLoading }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPedidos, setSelectedPedidos] = useState([]);
  const [descontoTipo, setDescontoTipo] = useState('reais');
  const [descontoValor, setDescontoValor] = useState('');
  const [devolucao, setDevolucao] = useState('');
  const [formasPagamento, setFormasPagamento] = useState([{
    tipo: 'dinheiro',
    valor: '',
    parcelas: '1',
    dadosCheque: { numero: '', banco: '', agencia: '', conta: '' },
    chequesSalvos: []
  }]);
  const [showChequeModal, setShowChequeModal] = useState(false);
  const [chequeModalIndex, setChequeModalIndex] = useState(0);
  const [creditoDisponivelTotal, setCreditoDisponivelTotal] = useState(0);
  const [creditoAUsar, setCreditoAUsar] = useState(0);

  const { data: creditos = [] } = useQuery({
    queryKey: ['creditos', selectedPedidos[0]?.cliente_codigo],
    queryFn: async () => {
      if (!selectedPedidos[0]?.cliente_codigo) return [];
      const todosCreditos = await base44.entities.Credito.list();
      return todosCreditos.filter(c => 
        c.cliente_codigo === selectedPedidos[0].cliente_codigo && c.status === 'disponivel'
      );
    },
    enabled: selectedPedidos.length > 0 && !!selectedPedidos[0]?.cliente_codigo
  });

  React.useEffect(() => {
    const total = creditos.reduce((sum, c) => sum + (c.valor || 0), 0);
    setCreditoDisponivelTotal(total);
  }, [creditos]);

  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

  const filteredPedidos = useMemo(() => {
    return pedidos.filter(p => 
      (p.status === 'aberto' || p.status === 'parcial') &&
      (p.cliente_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       p.cliente_codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       p.numero_pedido?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [pedidos, searchTerm]);

  const togglePedido = (pedido) => {
    setSelectedPedidos(prev => {
      const exists = prev.find(p => p.id === pedido.id);
      if (exists) return prev.filter(p => p.id !== pedido.id);
      return [...prev, pedido];
    });
  };

  const toggleAll = () => {
    if (selectedPedidos.length === filteredPedidos.length) {
      setSelectedPedidos([]);
    } else {
      setSelectedPedidos(filteredPedidos);
    }
  };

  const calcularTotais = () => {
    const totalOriginal = selectedPedidos.reduce((sum, p) => 
      sum + (p.saldo_restante || (p.valor_pedido - (p.total_pago || 0))), 0
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
    
    const totalPago = formasPagamento.reduce((sum, fp) => 
      sum + (parseFloat(fp.valor) || 0), 0
    ) + creditoAUsar;
    
    return { totalOriginal, desconto, devolucaoValor, totalComDesconto, totalPago };
  };

  const handleSaveCheque = async (chequeData) => {
    try {
      const novoCheque = await base44.entities.Cheque.create(chequeData);
      const novasFormas = [...formasPagamento];
      novasFormas[chequeModalIndex].chequesSalvos.push(novoCheque);
      
      const totalCheques = novasFormas[chequeModalIndex].chequesSalvos.reduce(
        (sum, ch) => sum + (parseFloat(ch.valor) || 0), 0
      );
      novasFormas[chequeModalIndex].valor = String(totalCheques);
      
      setFormasPagamento(novasFormas);
      setShowChequeModal(false);
      toast.success('Cheque cadastrado!');
    } catch (error) {
      toast.error('Erro ao cadastrar cheque');
    }
  };

  const handleSaveChequeAndAddAnother = async (chequeData) => {
    try {
      const novoCheque = await base44.entities.Cheque.create(chequeData);
      const novasFormas = [...formasPagamento];
      novasFormas[chequeModalIndex].chequesSalvos.push(novoCheque);
      
      const totalCheques = novasFormas[chequeModalIndex].chequesSalvos.reduce(
        (sum, ch) => sum + (parseFloat(ch.valor) || 0), 0
      );
      novasFormas[chequeModalIndex].valor = String(totalCheques);
      
      setFormasPagamento(novasFormas);
      toast.success('Cheque cadastrado! Adicione outro.');
    } catch (error) {
      toast.error('Erro ao cadastrar cheque');
    }
  };

  const adicionarFormaPagamento = () => {
    setFormasPagamento([...formasPagamento, {
      tipo: 'dinheiro',
      valor: '',
      parcelas: '1',
      dadosCheque: { numero: '', banco: '', agencia: '', conta: '' },
      chequesSalvos: []
    }]);
  };

  const removerFormaPagamento = (index) => {
    if (formasPagamento.length > 1) {
      setFormasPagamento(formasPagamento.filter((_, i) => i !== index));
    }
  };

  const atualizarFormaPagamento = (index, campo, valor) => {
    const novasFormas = [...formasPagamento];
    if (campo.includes('.')) {
      const [obj, prop] = campo.split('.');
      novasFormas[index][obj][prop] = valor;
    } else {
      novasFormas[index][campo] = valor;
    }
    setFormasPagamento(novasFormas);
  };

  const handleLiquidar = () => {
    if (selectedPedidos.length === 0) {
      alert('Selecione pelo menos um pedido');
      return;
    }

    const totais = calcularTotais();
    if (totais.totalPago <= 0) {
      alert('Informe o valor pago');
      return;
    }
    
    // Alerta de Excedente (Crédito)
    if (totais.totalPago > totais.totalComDesconto) {
      const excedente = totais.totalPago - totais.totalComDesconto;
      const confirmar = window.confirm(
        `⚠️ ATENÇÃO! Crédito será gerado: ${formatCurrency(excedente)}\n\nDeseja continuar?`
      );
      if (!confirmar) return;
    }
    
    // Alerta de Pagamento Parcial
    if (totais.totalPago < totais.totalComDesconto) {
        const restante = totais.totalComDesconto - totais.totalPago;
        const confirmar = window.confirm(
            `⚠️ ATENÇÃO! Pagamento PARCIAL.\n\n` +
            `Total da dívida: ${formatCurrency(totais.totalComDesconto)}\n` +
            `Valor pago: ${formatCurrency(totais.totalPago)}\n` +
            `Saldo restante: ${formatCurrency(restante)}\n\n` +
            `Os pedidos ficarão com status "PARCIAL". Deseja continuar?`
        );
        if (!confirmar) return;
    }
    
    const creditoGerado = Math.max(0, totais.totalPago - totais.totalComDesconto);

    let todosChequesUsados = [];
    
    const formasPagamentoStr = formasPagamento
      .filter(fp => parseFloat(fp.valor) > 0)
      .map(fp => {
        let str = `${fp.tipo.toUpperCase()}: ${formatCurrency(parseFloat(fp.valor))}`;
        if (fp.tipo === 'credito' && fp.parcelas !== '1') str += ` (${fp.parcelas}x)`;
        
        if (fp.tipo === 'cheque' && fp.dadosCheque.numero) {
           str += ` | Cheque: ${fp.dadosCheque.numero} - ${fp.dadosCheque.banco}`;
        }
        
        if (fp.chequesSalvos.length > 0) {
          str += ` | ${fp.chequesSalvos.length} cheque(s)`;
          todosChequesUsados = [...todosChequesUsados, ...fp.chequesSalvos];
        }
        return str;
      })
      .join(' | ');
    
    const formasFinal = formasPagamentoStr + (creditoAUsar > 0 ? ` | CRÉDITO: ${formatCurrency(creditoAUsar)}` : '');
    
    onSave({
      pedidos: selectedPedidos.map(p => ({
        id: p.id,
        numero_pedido: p.numero_pedido,
        saldo_original: p.saldo_restante || (p.valor_pedido - (p.total_pago || 0)),
        cliente_codigo: p.cliente_codigo,
        cliente_nome: p.cliente_nome,
        valor_total_pedido: p.valor_pedido
      })),
      desconto: totais.desconto,
      devolucao: totais.devolucaoValor,
      credito: creditoGerado,
      creditoUsado: creditoAUsar,
      totalPago: totais.totalPago - creditoAUsar,
      formaPagamento: formasFinal,
      cheques: todosChequesUsados,
      totalDivida: totais.totalComDesconto // Necessário para cálculo proporcional
    });
  };

  const totais = calcularTotais();

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Buscar por cliente, código ou número do pedido..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="selectAll"
          checked={selectedPedidos.length === filteredPedidos.length && filteredPedidos.length > 0}
          onCheckedChange={toggleAll}
        />
        <Label htmlFor="selectAll" className="cursor-pointer">
          Selecionar todos ({selectedPedidos.length}/{filteredPedidos.length})
        </Label>
      </div>

      <div className="max-h-96 overflow-y-auto space-y-2">
        {filteredPedidos.map((pedido) => {
          const saldo = pedido.saldo_restante || (pedido.valor_pedido - (pedido.total_pago || 0));
          const isSelected = selectedPedidos.find(p => p.id === pedido.id);
          
          return (
            <Card
              key={pedido.id}
              className={cn("p-4 cursor-pointer transition-all", isSelected ? "bg-blue-50 border-blue-300" : "hover:bg-slate-50")}
              onClick={() => togglePedido(pedido)}
            >
              <div className="flex items-center gap-4">
                <Checkbox checked={!!isSelected} />
                <div className="flex-1 grid grid-cols-5 gap-4">
                  <div><p className="text-xs text-slate-500">Nº Pedido</p><p className="font-mono text-sm font-medium">{pedido.numero_pedido}</p></div>
                  <div><p className="text-xs text-slate-500">Cliente</p><p className="font-medium text-sm truncate">{pedido.cliente_nome}</p></div>
                  <div><p className="text-xs text-slate-500">Código</p><p className="text-sm">{pedido.cliente_codigo}</p></div>
                  <div><p className="text-xs text-slate-500">Data Entrega</p><p className="text-sm">{pedido.data_entrega ? new Date(pedido.data_entrega).toLocaleDateString('pt-BR') : '-'}</p></div>
                  <div className="text-right"><p className="text-xs text-slate-500">Saldo</p><p className="font-bold text-sm">{formatCurrency(saldo)}</p></div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {selectedPedidos.length > 0 && (
        <Card className="p-4 bg-slate-50 space-y-4">
          <h3 className="font-semibold">Ajustes de Pagamento</h3>
          
          <div className="space-y-2">
            <Label>Desconto</Label>
            <RadioGroup value={descontoTipo} onValueChange={setDescontoTipo} className="flex gap-4">
              <div className="flex items-center gap-2"><RadioGroupItem value="reais" id="reais" /><Label htmlFor="reais">Em Reais (R$)</Label></div>
              <div className="flex items-center gap-2"><RadioGroupItem value="porcentagem" id="porcentagem" /><Label htmlFor="porcentagem">Em Porcentagem (%)</Label></div>
            </RadioGroup>
            <div className="relative">
              {descontoTipo === 'reais' ? <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /> : <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />}
              <Input type="number" step="0.01" min="0" value={descontoValor} onChange={(e) => setDescontoValor(e.target.value)} className="pl-10" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Devolução (R$)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input type="number" step="0.01" min="0" value={devolucao} onChange={(e) => setDevolucao(e.target.value)} className="pl-10" />
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Formas de Pagamento</Label>
              <Button type="button" size="sm" variant="outline" onClick={adicionarFormaPagamento}>+ Adicionar Forma</Button>
            </div>

            {formasPagamento.map((fp, index) => (
              <Card key={index} className="p-3 bg-white">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Forma {index + 1}</span>
                    {formasPagamento.length > 1 && (
                      <Button type="button" size="sm" variant="ghost" onClick={() => removerFormaPagamento(index)} className="text-red-600 h-6">Remover</Button>
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
                          <SelectItem value="servicos">Serviços</SelectItem>
                          <SelectItem value="debito">Débito</SelectItem>
                          <SelectItem value="credito">Crédito</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Valor (R$) *</Label>
                      <Input type="number" step="0.01" value={fp.valor} onChange={(e) => atualizarFormaPagamento(index, 'valor', e.target.value)} disabled={fp.tipo === 'cheque' && fp.chequesSalvos.length > 0} />
                    </div>
                  </div>

                  {fp.tipo === 'cheque' && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                         <div><Label className="text-xs">Nº Cheque</Label><Input value={fp.dadosCheque.numero} onChange={(e) => atualizarFormaPagamento(index, 'dadosCheque.numero', e.target.value)} /></div>
                         <div><Label className="text-xs">Banco</Label><Input value={fp.dadosCheque.banco} onChange={(e) => atualizarFormaPagamento(index, 'dadosCheque.banco', e.target.value)} /></div>
                         <div><Label className="text-xs">Agência</Label><Input value={fp.dadosCheque.agencia} onChange={(e) => atualizarFormaPagamento(index, 'dadosCheque.agencia', e.target.value)} /></div>
                      </div>
                      <Button type="button" variant="outline" onClick={() => { setChequeModalIndex(index); setShowChequeModal(true); }} className="w-full">
                        {fp.chequesSalvos.length > 0 ? `${fp.chequesSalvos.length} Cheque(s) Salvos - Adicionar Mais` : 'Cadastrar Cheque Completo'}
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {creditoDisponivelTotal > 0 && (
            <Card className="p-4 bg-green-50 border-green-200">
               <div className="flex items-center gap-2 mb-2"><Wallet className="w-4 h-4 text-green-700"/><span className="font-bold text-green-700">Crédito Disponível: {formatCurrency(creditoDisponivelTotal)}</span></div>
               <div className="flex items-center gap-2">
                 <Label>Usar:</Label>
                 <Input type="number" className="w-32 h-8" value={creditoAUsar} onChange={(e) => setCreditoAUsar(parseFloat(e.target.value)||0)} max={creditoDisponivelTotal} />
               </div>
            </Card>
          )}

          <div className="pt-4 border-t space-y-2">
            <div className="flex justify-between font-bold text-lg text-blue-700">
              <span>Total Pago:</span>
              <span>{formatCurrency(totais.totalPago)}</span>
            </div>
            <div className="flex justify-between font-bold text-base text-slate-800">
              <span>Total a Pagar:</span>
              <span>{formatCurrency(totais.totalComDesconto)}</span>
            </div>
            {totais.totalPago < totais.totalComDesconto && (
                <div className="flex justify-between font-bold text-base text-red-600 border-t pt-2 border-red-100">
                    <span>Faltam Pagar (Ficará Parcial):</span>
                    <span>{formatCurrency(totais.totalComDesconto - totais.totalPago)}</span>
                </div>
            )}
          </div>
        </Card>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>Cancelar</Button>
        <Button onClick={handleLiquidar} disabled={isLoading || selectedPedidos.length === 0}>Liquidar</Button>
      </div>

      <ModalContainer open={showChequeModal} onClose={() => setShowChequeModal(false)} title="Adicionar Cheque" size="lg">
        <AdicionarChequeModal
          clienteInfo={selectedPedidos[0] ? { cliente_codigo: selectedPedidos[0].cliente_codigo, cliente_nome: selectedPedidos[0].cliente_nome } : null}
          onSave={handleSaveCheque}
          onSaveAndAddAnother={handleSaveChequeAndAddAnother}
          onCancel={() => setShowChequeModal(false)}
        />
      </ModalContainer>
    </div>
  );
}