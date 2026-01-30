import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Split, Truck, AlertTriangle, CheckCircle } from "lucide-react";
import { format } from "date-fns";

export default function DividirRotaModal({ 
  rotaOriginal, 
  pedidos, 
  onSave, 
  onCancel, 
  isLoading 
}) {
  const [novaRotaInfo, setNovaRotaInfo] = useState({
    codigo_rota: '',
    motorista_codigo: '',
    motorista_nome: ''
  });
  const [pedidosSelecionados, setPedidosSelecionados] = useState([]);

  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL' 
  }).format(value || 0);

  const handleTogglePedido = (pedidoId) => {
    setPedidosSelecionados(prev => 
      prev.includes(pedidoId) 
        ? prev.filter(id => id !== pedidoId) 
        : [...prev, pedidoId]
    );
  };

  const handleToggleAll = () => {
    if (pedidosSelecionados.length === pedidos.length) {
      setPedidosSelecionados([]);
    } else {
      setPedidosSelecionados(pedidos.map(p => p.id));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!novaRotaInfo.codigo_rota) {
      alert('Informe o código da nova rota');
      return;
    }
    if (pedidosSelecionados.length === 0) {
      alert('Selecione pelo menos um pedido para mover');
      return;
    }
    if (pedidosSelecionados.length === pedidos.length) {
      alert('Você não pode mover todos os pedidos. Deixe pelo menos 1 na rota original.');
      return;
    }
    onSave(novaRotaInfo, pedidosSelecionados);
  };

  const pedidosMovendo = pedidos.filter(p => pedidosSelecionados.includes(p.id));
  const valorMovendo = pedidosMovendo.reduce((sum, p) => sum + (p.valor_pedido || 0), 0);
  const pedidosFicando = pedidos.length - pedidosSelecionados.length;
  const valorFicando = pedidos.reduce((sum, p) => sum + (p.valor_pedido || 0), 0) - valorMovendo;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      
      {/* Info da Rota Original */}
      <Alert className="bg-blue-50 border-blue-200">
        <Truck className="w-4 h-4 text-blue-600" />
        <AlertDescription>
          <div className="flex justify-between items-center">
            <div>
              <span className="font-bold text-blue-800">Rota Original: {rotaOriginal.codigo_rota}</span>
              <p className="text-sm text-blue-600 mt-1">
                {pedidos.length} pedidos · {formatCurrency(pedidos.reduce((sum, p) => sum + (p.valor_pedido || 0), 0))}
              </p>
            </div>
            <Badge variant="outline" className="bg-white border-blue-300 text-blue-700">
              {rotaOriginal.motorista_nome || 'Sem motorista'}
            </Badge>
          </div>
        </AlertDescription>
      </Alert>

      {/* Informações da Nova Rota */}
      <div className="bg-slate-50 rounded-xl p-4 space-y-4 border border-slate-200">
        <div className="flex items-center gap-2 mb-3">
          <Split className="w-5 h-5 text-slate-600" />
          <h3 className="font-bold text-slate-800">Nova Rota</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="codigo">Código da Rota *</Label>
            <Input
              id="codigo"
              value={novaRotaInfo.codigo_rota}
              onChange={(e) => setNovaRotaInfo({ ...novaRotaInfo, codigo_rota: e.target.value })}
              placeholder="Ex: R-015"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="motorista_codigo">Código Motorista</Label>
            <Input
              id="motorista_codigo"
              value={novaRotaInfo.motorista_codigo}
              onChange={(e) => setNovaRotaInfo({ ...novaRotaInfo, motorista_codigo: e.target.value })}
              placeholder="Ex: MOT001"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="motorista_nome">Nome Motorista</Label>
            <Input
              id="motorista_nome"
              value={novaRotaInfo.motorista_nome}
              onChange={(e) => setNovaRotaInfo({ ...novaRotaInfo, motorista_nome: e.target.value })}
              placeholder="Nome completo"
            />
          </div>
        </div>
      </div>

      {/* Seleção de Pedidos */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <Label className="font-bold text-slate-700">Selecione os Pedidos para Mover</Label>
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={handleToggleAll}
            className="h-8 text-xs"
          >
            {pedidosSelecionados.length === pedidos.length ? 'Desmarcar Todos' : 'Marcar Todos'}
          </Button>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto bg-white">
          {pedidos.map(pedido => (
            <div 
              key={pedido.id} 
              className="flex items-center gap-3 p-3 hover:bg-slate-50 border-b last:border-0 transition-colors cursor-pointer"
              onClick={() => handleTogglePedido(pedido.id)}
            >
              <Checkbox
                checked={pedidosSelecionados.includes(pedido.id)}
                onCheckedChange={() => handleTogglePedido(pedido.id)}
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 truncate">{pedido.cliente_nome}</p>
                <p className="text-xs text-slate-500 font-mono">#{pedido.numero_pedido}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-700">{formatCurrency(pedido.valor_pedido)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Preview da Divisão */}
      {pedidosSelecionados.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <Alert className="bg-amber-50 border-amber-200">
            <AlertDescription>
              <div className="text-center">
                <p className="text-xs font-bold text-amber-600 uppercase mb-1">Ficam na Rota Original</p>
                <p className="text-2xl font-bold text-slate-800">{pedidosFicando}</p>
                <p className="text-sm text-amber-700 mt-1">{formatCurrency(valorFicando)}</p>
              </div>
            </AlertDescription>
          </Alert>

          <Alert className="bg-emerald-50 border-emerald-200">
            <AlertDescription>
              <div className="text-center">
                <p className="text-xs font-bold text-emerald-600 uppercase mb-1">Vão para Nova Rota</p>
                <p className="text-2xl font-bold text-slate-800">{pedidosSelecionados.length}</p>
                <p className="text-sm text-emerald-700 mt-1">{formatCurrency(valorMovendo)}</p>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Validações */}
      {pedidosSelecionados.length === pedidos.length && (
        <Alert className="bg-red-50 border-red-200">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-700 text-sm">
            Não é possível mover todos os pedidos. A rota original ficaria vazia.
          </AlertDescription>
        </Alert>
      )}

      {pedidosSelecionados.length > 0 && pedidosSelecionados.length < pedidos.length && (
        <Alert className="bg-emerald-50 border-emerald-200">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <AlertDescription className="text-emerald-700 text-sm">
            Pronto para dividir! A rota original será atualizada e uma nova rota será criada.
          </AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancelar
        </Button>
        <Button 
          type="submit" 
          disabled={isLoading || pedidosSelecionados.length === 0 || pedidosSelecionados.length === pedidos.length}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isLoading ? 'Processando...' : `Dividir Rota (${pedidosSelecionados.length} pedidos)`}
        </Button>
      </div>
    </form>
  );
}