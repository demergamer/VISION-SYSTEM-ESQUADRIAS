import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { XCircle, AlertTriangle, Save } from "lucide-react";
import { format } from 'date-fns';

export default function CancelarPedidoModal({ pedido, onSave, onCancel }) {
  const [motivo, setMotivo] = useState('');

  const handleSalvar = () => {
    if (!motivo.trim()) {
      alert('Informe o motivo do cancelamento');
      return;
    }

    onSave({
      status: 'cancelado',
      confirmado_entrega: true,
      observacao: `${pedido.observacao || ''}\n[CANCELADO em ${format(new Date(), 'dd/MM/yyyy')}] Motivo: ${motivo}`.trim(),
      data_cancelamento: format(new Date(), 'yyyy-MM-dd')
    });
  };

  return (
    <div className="space-y-4">
      {/* Informações do Pedido */}
      <Alert className="bg-red-50 border-red-200">
        <XCircle className="w-4 h-4 text-red-600" />
        <AlertDescription>
          <p className="font-medium text-red-800 mb-2">Cancelar Pedido</p>
          <div className="text-sm text-red-700 space-y-1">
            <p>• Nº Pedido: <strong>{pedido.numero_pedido}</strong></p>
            <p>• Cliente: <strong>{pedido.cliente_nome}</strong></p>
            <p>• Valor: <strong>R$ {pedido.valor_pedido?.toFixed(2)}</strong></p>
            <p>• Data: <strong>{format(new Date(), 'dd/MM/yyyy')}</strong></p>
          </div>
        </AlertDescription>
      </Alert>

      {/* Motivo */}
      <div className="space-y-2">
        <Label htmlFor="motivo">Motivo do Cancelamento *</Label>
        <Textarea
          id="motivo"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ex: Pedido não foi entregue, produto incorreto, etc."
          rows={4}
          className="resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          Voltar
        </Button>
        <Button 
          onClick={handleSalvar}
          disabled={!motivo.trim()}
          className="bg-red-600 hover:bg-red-700"
        >
          <Save className="w-4 h-4 mr-2" />
          Confirmar Cancelamento
        </Button>
      </div>
    </div>
  );
}