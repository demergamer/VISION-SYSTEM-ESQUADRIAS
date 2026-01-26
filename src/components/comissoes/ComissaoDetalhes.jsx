import React, { useState } from 'react';
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
  Calculator,
  Save,
  Edit2,
  Lock
} from "lucide-react";
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function ComissaoDetalhes({ representante, mesAno, onClose }) {
  const [editandoVales, setEditandoVales] = useState(false);
  const [valesTemp, setValesTemp] = useState(representante.vales || 0);
  const [observacoes, setObservacoes] = useState('');
  const [isFechado, setIsFechado] = useState(representante.status === 'fechado');

  const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

  const handleSalvarVales = () => {
    // TODO: Salvar vales em entity FechamentoComissao
    representante.vales = valesTemp;
    representante.saldoAPagar = representante.totalComissoes - valesTemp;
    setEditandoVales(false);
    toast.success('Vales atualizados');
  };

  const handleFecharComissao = () => {
    // TODO: Criar registro em FechamentoComissao
    setIsFechado(true);
    toast.success('Comissão fechada com sucesso');
  };

  const saldoFinal = representante.totalComissoes - (editandoVales ? valesTemp : representante.vales);

  return (
    <div className="space-y-6">
      {/* RESUMO FINANCEIRO */}
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-slate-500 mb-1">Total Vendas</p>
            <p className="font-bold text-emerald-600 text-xl">{formatCurrency(representante.totalVendas)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Total Comissões</p>
            <p className="font-bold text-blue-600 text-xl">{formatCurrency(representante.totalComissoes)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">(-) Vales/Adiantamentos</p>
            {editandoVales ? (
              <Input 
                type="number"
                value={valesTemp}
                onChange={(e) => setValesTemp(parseFloat(e.target.value) || 0)}
                className="h-8 text-sm"
              />
            ) : (
              <div className="flex items-center gap-2">
                <p className="font-bold text-red-600 text-xl">{formatCurrency(representante.vales)}</p>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6"
                  onClick={() => setEditandoVales(true)}
                >
                  <Edit2 className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
          <div className="bg-white p-4 rounded-xl border-2 border-emerald-400">
            <p className="text-xs text-slate-500 mb-1">Saldo a Pagar</p>
            <p className="font-bold text-emerald-700 text-2xl">{formatCurrency(saldoFinal)}</p>
          </div>
        </div>

        {editandoVales && (
          <div className="flex gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => { setEditandoVales(false); setValesTemp(representante.vales); }}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSalvarVales} className="gap-2">
              <Save className="w-4 h-4" />
              Salvar Vales
            </Button>
          </div>
        )}
      </Card>

      {/* TABELA DE PEDIDOS */}
      <div>
        <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-blue-600" />
          Pedidos Elegíveis ({representante.pedidos.length})
        </h3>
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="font-bold">Nº Pedido</TableHead>
                <TableHead className="font-bold">Cliente</TableHead>
                <TableHead className="font-bold">Data Pgto</TableHead>
                <TableHead className="font-bold text-right">Valor Pedido</TableHead>
                <TableHead className="font-bold text-right">% Com.</TableHead>
                <TableHead className="font-bold text-right">Comissão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {representante.pedidos.map((pedido) => (
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
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      <Percent className="w-3 h-3 mr-1" />
                      {pedido.porcentagem_comissao || 5}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-bold text-emerald-600">
                    {formatCurrency(pedido.valorComissao)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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

      {/* AÇÕES */}
      <div className="flex gap-3 pt-4 border-t">
        <Button variant="outline" className="flex-1" onClick={onClose}>
          Voltar
        </Button>
        {!isFechado ? (
          <Button 
            className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700"
            onClick={handleFecharComissao}
          >
            <Lock className="w-4 h-4" />
            Fechar Comissão
          </Button>
        ) : (
          <Button 
            className="flex-1 gap-2 bg-slate-400 cursor-not-allowed"
            disabled
          >
            <Lock className="w-4 h-4" />
            Comissão Fechada
          </Button>
        )}
      </div>
    </div>
  );
}