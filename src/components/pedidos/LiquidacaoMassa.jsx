import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Search, DollarSign, Percent } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LiquidacaoMassa({ pedidos, onSave, onCancel, isLoading }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPedidos, setSelectedPedidos] = useState([]);
  const [descontoTipo, setDescontoTipo] = useState('reais'); // 'reais' ou 'porcentagem'
  const [descontoValor, setDescontoValor] = useState('');
  const [devolucao, setDevolucao] = useState('');

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

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
      if (exists) {
        return prev.filter(p => p.id !== pedido.id);
      } else {
        return [...prev, pedido];
      }
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
    
    return {
      totalOriginal,
      desconto,
      devolucaoValor,
      totalComDesconto
    };
  };

  const handleLiquidar = () => {
    if (selectedPedidos.length === 0) {
      alert('Selecione pelo menos um pedido');
      return;
    }

    const totais = calcularTotais();
    
    // Se o total com desconto for negativo, será um crédito
    const credito = totais.totalComDesconto < 0 ? Math.abs(totais.totalComDesconto) : 0;
    
    onSave({
      pedidos: selectedPedidos.map(p => ({
        id: p.id,
        saldo_original: p.saldo_restante || (p.valor_pedido - (p.total_pago || 0))
      })),
      desconto: totais.desconto,
      devolucao: totais.devolucaoValor,
      credito,
      totalPago: Math.max(0, totais.totalComDesconto)
    });
  };

  const totais = calcularTotais();

  return (
    <div className="space-y-6">
      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Buscar por cliente, código ou número do pedido..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Selecionar Todos */}
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

      {/* Lista de Pedidos */}
      <div className="max-h-96 overflow-y-auto space-y-2">
        {filteredPedidos.map((pedido) => {
          const saldo = pedido.saldo_restante || (pedido.valor_pedido - (pedido.total_pago || 0));
          const isSelected = selectedPedidos.find(p => p.id === pedido.id);
          
          return (
            <Card
              key={pedido.id}
              className={cn(
                "p-4 cursor-pointer transition-all",
                isSelected ? "bg-blue-50 border-blue-300" : "hover:bg-slate-50"
              )}
              onClick={() => togglePedido(pedido)}
            >
              <div className="flex items-center gap-4">
                <Checkbox checked={!!isSelected} />
                <div className="flex-1 grid grid-cols-5 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Nº Pedido</p>
                    <p className="font-mono text-sm font-medium">{pedido.numero_pedido}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Cliente</p>
                    <p className="font-medium text-sm truncate">{pedido.cliente_nome}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Código</p>
                    <p className="text-sm">{pedido.cliente_codigo}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Data Entrega</p>
                    <p className="text-sm">
                      {pedido.data_entrega ? new Date(pedido.data_entrega).toLocaleDateString('pt-BR') : '-'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Saldo</p>
                    <p className="font-bold text-sm">{formatCurrency(saldo)}</p>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
        {filteredPedidos.length === 0 && (
          <p className="text-center text-slate-500 py-8">Nenhum pedido encontrado</p>
        )}
      </div>

      {/* Desconto e Devolução */}
      {selectedPedidos.length > 0 && (
        <Card className="p-4 bg-slate-50 space-y-4">
          <h3 className="font-semibold">Ajustes de Pagamento</h3>
          
          {/* Tipo de Desconto */}
          <div className="space-y-2">
            <Label>Desconto</Label>
            <RadioGroup value={descontoTipo} onValueChange={setDescontoTipo} className="flex gap-4">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="reais" id="reais" />
                <Label htmlFor="reais" className="cursor-pointer">Em Reais (R$)</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="porcentagem" id="porcentagem" />
                <Label htmlFor="porcentagem" className="cursor-pointer">Em Porcentagem (%)</Label>
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

          {/* Devolução */}
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

          {/* Resumo */}
          <div className="pt-4 border-t space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Total Original:</span>
              <span className="font-semibold">{formatCurrency(totais.totalOriginal)}</span>
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
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>Total a Pagar:</span>
              <span className={totais.totalComDesconto < 0 ? 'text-green-600' : ''}>
                {formatCurrency(Math.abs(totais.totalComDesconto))}
              </span>
            </div>
            {totais.totalComDesconto < 0 && (
              <p className="text-sm text-green-600 text-center">
                ⚠️ Crédito a pagar ao cliente: {formatCurrency(Math.abs(totais.totalComDesconto))}
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Ações */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancelar
        </Button>
        <Button 
          onClick={handleLiquidar} 
          disabled={isLoading || selectedPedidos.length === 0}
        >
          Liquidar {selectedPedidos.length} Pedido{selectedPedidos.length !== 1 ? 's' : ''}
        </Button>
      </div>
    </div>
  );
}