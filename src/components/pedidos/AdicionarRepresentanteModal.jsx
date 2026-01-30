import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function AdicionarRepresentanteModal({ onSave, onCancel }) {
  const [formData, setFormData] = useState({
    codigo: '',
    nome: '',
    email: '',
    regiao: '',
    telefone: '',
    chave_pix: '',
    banco_nome: '',
    agencia: '',
    conta_corrente: '',
    cpf_parcial: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.codigo || !formData.nome) {
      toast.error('Código e nome são obrigatórios');
      return;
    }
    onSave(formData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Código *</Label>
          <Input 
            value={formData.codigo} 
            onChange={(e) => handleChange('codigo', e.target.value)}
            placeholder="REP001"
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Nome *</Label>
          <Input 
            value={formData.nome} 
            onChange={(e) => handleChange('nome', e.target.value)}
            placeholder="Nome do representante"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input 
            type="email"
            value={formData.email} 
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="email@exemplo.com"
          />
        </div>
        <div className="space-y-2">
          <Label>Telefone</Label>
          <Input 
            value={formData.telefone} 
            onChange={(e) => handleChange('telefone', e.target.value)}
            placeholder="(11) 99999-9999"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Região</Label>
        <Input 
          value={formData.regiao} 
          onChange={(e) => handleChange('regiao', e.target.value)}
          placeholder="Zona Sul, Zona Leste, etc."
        />
      </div>

      <div className="space-y-2">
        <Label>Chave PIX</Label>
        <Input 
          value={formData.chave_pix} 
          onChange={(e) => handleChange('chave_pix', e.target.value)}
          placeholder="CPF, email, telefone ou chave aleatória"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Banco</Label>
          <Input 
            value={formData.banco_nome} 
            onChange={(e) => handleChange('banco_nome', e.target.value)}
            placeholder="Banco do Brasil"
          />
        </div>
        <div className="space-y-2">
          <Label>Agência</Label>
          <Input 
            value={formData.agencia} 
            onChange={(e) => handleChange('agencia', e.target.value)}
            placeholder="0001"
          />
        </div>
        <div className="space-y-2">
          <Label>Conta</Label>
          <Input 
            value={formData.conta_corrente} 
            onChange={(e) => handleChange('conta_corrente', e.target.value)}
            placeholder="12345-6"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>CPF Parcial (6 dígitos centrais)</Label>
        <Input 
          value={formData.cpf_parcial} 
          onChange={(e) => handleChange('cpf_parcial', e.target.value)}
          placeholder="123.456"
          maxLength={7}
        />
      </div>

      <div className="flex gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
          Cadastrar
        </Button>
      </div>
    </form>
  );
}