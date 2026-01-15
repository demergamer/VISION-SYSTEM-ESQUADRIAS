import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export default function AdicionarChequeModal({ clienteInfo, onSave, onCancel, onSaveAndAddAnother }) {
  const [formData, setFormData] = useState({
    numero_cheque: '',
    banco: '',
    agencia: '',
    conta: '',
    emitente: clienteInfo?.cliente_nome || '',
    emitente_cpf_cnpj: '',
    cliente_codigo: clienteInfo?.cliente_codigo || '',
    cliente_nome: clienteInfo?.cliente_nome || '',
    valor: '',
    data_emissao: new Date().toISOString().split('T')[0],
    data_vencimento: '',
    status: 'normal'
  });

  const handleSubmit = (addAnother = false) => {
    if (addAnother) {
      onSaveAndAddAnother(formData);
      // Resetar apenas campos específicos
      setFormData({
        ...formData,
        numero_cheque: '',
        valor: '',
        data_vencimento: ''
      });
    } else {
      onSave(formData);
    }
  };

  return (
    <div className="space-y-4">
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
          <Label>Número do Cheque *</Label>
          <Input
            value={formData.numero_cheque}
            onChange={(e) => setFormData({ ...formData, numero_cheque: e.target.value })}
            required
          />
        </div>
        <div>
          <Label>Banco *</Label>
          <Input
            value={formData.banco}
            onChange={(e) => setFormData({ ...formData, banco: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Agência</Label>
          <Input
            value={formData.agencia}
            onChange={(e) => setFormData({ ...formData, agencia: e.target.value })}
          />
        </div>
        <div>
          <Label>Conta</Label>
          <Input
            value={formData.conta}
            onChange={(e) => setFormData({ ...formData, conta: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Emitente *</Label>
          <Input
            value={formData.emitente}
            onChange={(e) => setFormData({ ...formData, emitente: e.target.value })}
            required
          />
        </div>
        <div>
          <Label>CPF/CNPJ do Emitente</Label>
          <Input
            value={formData.emitente_cpf_cnpj}
            onChange={(e) => setFormData({ ...formData, emitente_cpf_cnpj: e.target.value })}
            placeholder="000.000.000-00"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Valor *</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.valor}
            onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
            required
          />
        </div>
        <div>
          <Label>Vencimento *</Label>
          <Input
            type="date"
            value={formData.data_vencimento}
            onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button 
          type="button" 
          variant="outline"
          onClick={() => handleSubmit(true)}
        >
          Salvar e Adicionar Outro
        </Button>
        <Button 
          type="button"
          onClick={() => handleSubmit(false)}
        >
          Salvar e Concluir
        </Button>
      </div>
    </div>
  );
}