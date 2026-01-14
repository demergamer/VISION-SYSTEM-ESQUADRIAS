import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";

export default function ChequeForm({ cheque, clientes, onSave, onCancel }) {
  const [formData, setFormData] = useState(cheque || {
    numero_cheque: '',
    banco: '',
    agencia: '',
    conta: '',
    emitente: '',
    cliente_codigo: '',
    cliente_nome: '',
    valor: '',
    data_emissao: '',
    data_vencimento: '',
    status: 'normal',
    observacao: '',
    cheque_substituto_numero: '',
    cheque_substituido_numero: ''
  });

  const handleClienteChange = (codigoCliente) => {
    const cliente = clientes.find(c => c.codigo === codigoCliente);
    setFormData({
      ...formData,
      cliente_codigo: codigoCliente,
      cliente_nome: cliente?.nome || '',
      emitente: cliente?.nome || formData.emitente
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Visual do Cheque */}
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200">
        <div className="space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-slate-500">BANCO</p>
              <p className="font-bold text-lg">{formData.banco || '___________'}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Nº DO CHEQUE</p>
              <p className="font-mono font-bold text-lg">{formData.numero_cheque || '___________'}</p>
            </div>
          </div>
          
          <div className="border-t border-blue-300 pt-3">
            <p className="text-xs text-slate-500">PAGUE POR ESTE CHEQUE A QUANTIA DE</p>
            <p className="font-bold text-2xl text-green-700">
              {formData.valor ? `R$ ${parseFloat(formData.valor).toFixed(2)}` : 'R$ ____,__'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-blue-300 pt-3">
            <div>
              <p className="text-xs text-slate-500">A</p>
              <p className="font-medium">{formData.emitente || '__________________'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">DATA</p>
              <p className="font-medium">
                {formData.data_emissao ? new Date(formData.data_emissao).toLocaleDateString('pt-BR') : '__/__/____'}
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-500 border-t border-blue-300 pt-2">
            <p>AG: {formData.agencia || '____'} / CONTA: {formData.conta || '____________'}</p>
          </div>
        </div>
      </Card>

      {/* Formulário */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="numero_cheque">Número do Cheque *</Label>
          <Input
            id="numero_cheque"
            value={formData.numero_cheque}
            onChange={(e) => setFormData({ ...formData, numero_cheque: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="banco">Banco *</Label>
          <Input
            id="banco"
            value={formData.banco}
            onChange={(e) => setFormData({ ...formData, banco: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="agencia">Agência</Label>
          <Input
            id="agencia"
            value={formData.agencia}
            onChange={(e) => setFormData({ ...formData, agencia: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="conta">Conta</Label>
          <Input
            id="conta"
            value={formData.conta}
            onChange={(e) => setFormData({ ...formData, conta: e.target.value })}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="cliente">Cliente (opcional)</Label>
        <Select value={formData.cliente_codigo} onValueChange={handleClienteChange}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o cliente" />
          </SelectTrigger>
          <SelectContent>
            {clientes.map(c => (
              <SelectItem key={c.id} value={c.codigo}>
                {c.nome} ({c.codigo})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="emitente">Emitente *</Label>
        <Input
          id="emitente"
          value={formData.emitente}
          onChange={(e) => setFormData({ ...formData, emitente: e.target.value })}
          required
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="valor">Valor *</Label>
          <Input
            id="valor"
            type="number"
            step="0.01"
            value={formData.valor}
            onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="data_emissao">Data Emissão</Label>
          <Input
            id="data_emissao"
            type="date"
            value={formData.data_emissao}
            onChange={(e) => setFormData({ ...formData, data_emissao: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="data_vencimento">Vencimento *</Label>
          <Input
            id="data_vencimento"
            type="date"
            value={formData.data_vencimento}
            onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="status">Status</Label>
        <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="devolvido">Devolvido</SelectItem>
            <SelectItem value="pago">Pago</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {formData.status === 'devolvido' && (
        <div>
          <Label htmlFor="cheque_substituto_numero">Substituído por Cheque Nº</Label>
          <Input
            id="cheque_substituto_numero"
            value={formData.cheque_substituto_numero}
            onChange={(e) => setFormData({ ...formData, cheque_substituto_numero: e.target.value })}
            placeholder="Número do cheque que substituiu este"
          />
        </div>
      )}

      <div>
        <Label htmlFor="cheque_substituido_numero">Este Cheque é Substituição de</Label>
        <Input
          id="cheque_substituido_numero"
          value={formData.cheque_substituido_numero}
          onChange={(e) => setFormData({ ...formData, cheque_substituido_numero: e.target.value })}
          placeholder="Número do cheque substituído"
        />
      </div>

      <div>
        <Label htmlFor="observacao">Observações</Label>
        <Textarea
          id="observacao"
          value={formData.observacao}
          onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">
          {cheque ? 'Atualizar' : 'Cadastrar'} Cheque
        </Button>
      </div>
    </form>
  );
}