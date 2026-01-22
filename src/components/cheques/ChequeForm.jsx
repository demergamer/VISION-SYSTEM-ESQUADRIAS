import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ChequeForm({ cheque, clientes, onSave, onCancel }) {
  const [formData, setFormData] = useState(cheque || {
    numero_cheque: '',
    banco: '',
    agencia: '',
    conta: '',
    emitente: '',
    emitente_cpf_cnpj: '',
    cliente_codigo: '',
    cliente_nome: '',
    valor: '',
    data_emissao: '',
    data_vencimento: '',
    status: 'normal',
    observacao: ''
  });

  const handleClienteChange = (codigoCliente) => {
    const cliente = clientes.find(c => c.codigo === codigoCliente);
    setFormData({
      ...formData,
      cliente_codigo: codigoCliente,
      cliente_nome: cliente?.nome || '',
      emitente: formData.emitente || cliente?.nome || '',
      emitente_cpf_cnpj: formData.emitente_cpf_cnpj || cliente?.cnpj || ''
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Número do Cheque *</Label>
          <Input
            value={formData.numero_cheque}
            onChange={(e) => setFormData({ ...formData, numero_cheque: e.target.value })}
          />
        </div>
        <div>
          <Label>Banco *</Label>
          <Select 
            value={formData.banco} 
            onValueChange={(v) => setFormData({ ...formData, banco: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o banco" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ITAÚ">Itaú</SelectItem>
              <SelectItem value="BRADESCO">Bradesco</SelectItem>
              <SelectItem value="SANTANDER">Santander</SelectItem>
              <SelectItem value="BANCO DO BRASIL">Banco do Brasil</SelectItem>
              <SelectItem value="CAIXA ECONÔMICA">Caixa Econômica Federal</SelectItem>
              <SelectItem value="NUBANK">Nubank</SelectItem>
              <SelectItem value="INTER">Banco Inter</SelectItem>
              <SelectItem value="C6 BANK">C6 Bank</SelectItem>
              <SelectItem value="OUTROS">Outros</SelectItem>
            </SelectContent>
          </Select>
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

      <div>
        <Label>Cliente *</Label>
        <Select value={formData.cliente_codigo} onValueChange={handleClienteChange}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o cliente" />
          </SelectTrigger>
          <SelectContent>
            {clientes.map(c => (
              <SelectItem key={c.id} value={c.codigo}>
                {c.nome} ({c.codigo}) {c.cnpj ? `- ${c.cnpj}` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-slate-500 mt-1">Selecione o cliente que emitiu o cheque</p>
      </div>

      <div>
        <Label>Emitente (opcional)</Label>
        <Input
          value={formData.emitente}
          onChange={(e) => setFormData({ ...formData, emitente: e.target.value })}
          placeholder="MEGA OPÇÃO"
        />
        <p className="text-xs text-slate-500 mt-1">Preencha apenas se for diferente do cliente</p>
      </div>

      <div>
        <Label>CPF/CNPJ do Emitente (opcional)</Label>
        <Input
          value={formData.emitente_cpf_cnpj}
          onChange={(e) => setFormData({ ...formData, emitente_cpf_cnpj: e.target.value })}
          placeholder="51.587.485/0001-00"
        />
        <p className="text-xs text-slate-500 mt-1">Preencha apenas se o emitente for diferente do cliente</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label>Valor *</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.valor}
            onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
          />
        </div>
        <div>
          <Label>Data Emissão</Label>
          <Input
            type="date"
            value={formData.data_emissao}
            onChange={(e) => setFormData({ ...formData, data_emissao: e.target.value })}
          />
        </div>
        <div>
          <Label>Vencimento *</Label>
          <Input
            type="date"
            value={formData.data_vencimento}
            onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
          />
        </div>
      </div>

      <div>
        <Label>Status</Label>
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

      <div>
        <Label>Observações</Label>
        <Textarea
          value={formData.observacao}
          onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="button" onClick={() => {
          // Validação de duplicidade
          if (!cheque) {
            const duplicado = todosCheques.find(c => 
              c.banco === formData.banco && 
              c.agencia === formData.agencia && 
              c.conta === formData.conta && 
              c.numero_cheque === formData.numero_cheque
            );

            if (duplicado) {
              toast.error('Cheque já cadastrado com estes dados!');
              return;
            }
          }
          onSave(formData);
        }}>
          {cheque ? 'Atualizar' : 'Cadastrar'} Cheque
        </Button>
      </div>
    </div>
  );
}