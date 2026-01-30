import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Split, Truck, ArrowRight, Save, X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DividirRotaModal({ rotaOriginal, pedidos, onSave, onCancel, isLoading }) {
  const [selectedPedidos, setSelectedPedidos] = useState([]);
  const [novaRotaInfo, setNovaRotaInfo] = useState({
    codigo_rota: `${rotaOriginal.codigo_rota}-B`, // Sugestão automática
    motorista_nome: '',
    motorista_codigo: ''
  });

  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

  const togglePedido = (id) => {
    setSelectedPedidos(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    if (selectedPedidos.length === 0) {
      alert("Selecione ao menos um pedido para mover.");
      return;
    }
    if (!novaRotaInfo.codigo_rota) {
      alert("Defina um código para a nova rota.");
      return;
    }
    onSave(novaRotaInfo, selectedPedidos);
  };

  // Cálculos de previsão
  const pedidosSelecionadosObj = pedidos.filter(p => selectedPedidos.includes(p.id));
  const valorMovido = pedidosSelecionadosObj.reduce((acc, p) => acc + (p.valor_pedido || 0), 0);
  const valorRestante = (rotaOriginal.valor_total || 0) - valorMovido;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* Rota Original */}
        <Card className="p-4 bg-slate-50 border-slate-200 opacity-70">
          <div className="flex items-center gap-2 mb-2">
            <Truck className="w-4 h-4 text-slate-500" />
            <span className="font-bold text-slate-700">Origem: {rotaOriginal.codigo_rota}</span>
          </div>
          <p className="text-xs text-slate-500">Motorista: {rotaOriginal.motorista_nome}</p>
          <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between text-sm">
            <span>Restarão:</span>
            <span className="font-bold">{pedidos.length - selectedPedidos.length} pedidos</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Valor Est.:</span>
            <span className="font-bold">{formatCurrency(valorRestante)}</span>
          </div>
        </Card>

        {/* Ícone de Transferência */}
        <div className="flex justify-center md:rotate-0 rotate-90">
          <div className="bg-blue-100 p-2 rounded-full">
            <ArrowRight className="w-6 h-6 text-blue-600" />
          </div>
        </div>

        {/* Nova Rota */}
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Código Nova Rota</Label>
              <Input 
                value={novaRotaInfo.codigo_rota} 
                onChange={e => setNovaRotaInfo({...novaRotaInfo, codigo_rota: e.target.value})}
                className="h-8 bg-white"
              />
            </div>
            <div>
              <Label className="text-xs">Novo Motorista</Label>
              <Input 
                value={novaRotaInfo.motorista_nome} 
                onChange={e => setNovaRotaInfo({...novaRotaInfo, motorista_nome: e.target.value})}
                placeholder="Nome do motorista"
                className="h-8 bg-white"
              />
            </div>
            <div className="mt-2 pt-2 border-t border-blue-200 flex justify-between text-sm text-blue-800">
              <span>Mover:</span>
              <span className="font-bold">{selectedPedidos.length} pedidos</span>
            </div>
            <div className="flex justify-between text-sm text-blue-800">
              <span>Valor:</span>
              <span className="font-bold">{formatCurrency(valorMovido)}</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="bg-slate-100 p-2 text-sm font-bold text-slate-700">Selecione os pedidos para mover:</div>
        <div className="max-h-60 overflow-y-auto bg-white p-2 space-y-2">
          {pedidos.map(pedido => (
            <div key={pedido.id} className={cn(
              "flex items-center gap-3 p-2 rounded border cursor-pointer hover:bg-slate-50",
              selectedPedidos.includes(pedido.id) ? "border-blue-400 bg-blue-50" : "border-slate-100"
            )} onClick={() => togglePedido(pedido.id)}>
              <Checkbox checked={selectedPedidos.includes(pedido.id)} />
              <div className="flex-1 text-sm">
                <span className="font-mono font-bold mr-2">{pedido.numero_pedido}</span>
                <span>{pedido.cliente_nome}</span>
              </div>
              <div className="text-sm font-semibold text-slate-600">
                {formatCurrency(pedido.valor_pedido)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>
          <X className="w-4 h-4 mr-2" /> Cancelar
        </Button>
        <Button onClick={handleSave} disabled={isLoading || selectedPedidos.length === 0} className="bg-blue-600 hover:bg-blue-700">
          {isLoading ? "Processando..." : (
            <>
              <Split className="w-4 h-4 mr-2" /> Dividir e Criar Rota
            </>
          )}
        </Button>
      </div>
    </div>
  );
}