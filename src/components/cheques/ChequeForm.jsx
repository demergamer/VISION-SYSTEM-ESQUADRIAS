import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

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
    observacao: '',
    cheque_substituto_numero: '',
    cheque_substituido_numero: '',
    valor_pago: '',
    forma_pagamento: 'pix',
    data_pagamento: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cores dos bancos
  const bancoCores = {
    'ITAÚ': { from: 'from-orange-100', to: 'to-orange-50', border: 'border-orange-300', text: 'text-orange-900' },
    'ITAU': { from: 'from-orange-100', to: 'to-orange-50', border: 'border-orange-300', text: 'text-orange-900' },
    'BRADESCO': { from: 'from-red-100', to: 'to-red-50', border: 'border-red-300', text: 'text-red-900' },
    'SANTANDER': { from: 'from-red-100', to: 'to-red-50', border: 'border-red-300', text: 'text-red-900' },
    'BANCO DO BRASIL': { from: 'from-yellow-100', to: 'to-yellow-50', border: 'border-yellow-400', text: 'text-yellow-900' },
    'BB': { from: 'from-yellow-100', to: 'to-yellow-50', border: 'border-yellow-400', text: 'text-yellow-900' },
    'CAIXA': { from: 'from-blue-100', to: 'to-cyan-50', border: 'border-blue-300', text: 'text-blue-900' },
    'CAIXA ECONÔMICA': { from: 'from-blue-100', to: 'to-cyan-50', border: 'border-blue-300', text: 'text-blue-900' },
    'CAIXA ECONOMICA': { from: 'from-blue-100', to: 'to-cyan-50', border: 'border-blue-300', text: 'text-blue-900' },
    'NUBANK': { from: 'from-purple-100', to: 'to-purple-50', border: 'border-purple-300', text: 'text-purple-900' },
    'INTER': { from: 'from-orange-100', to: 'to-orange-50', border: 'border-orange-300', text: 'text-orange-900' },
    'C6': { from: 'from-slate-200', to: 'to-slate-100', border: 'border-slate-400', text: 'text-slate-900' },
    'C6 BANK': { from: 'from-slate-200', to: 'to-slate-100', border: 'border-slate-400', text: 'text-slate-900' }
  };

  const getBancoCor = () => {
    const bancoUpper = (formData.banco || '').toUpperCase().trim();
    for (const [key, cor] of Object.entries(bancoCores)) {
      if (bancoUpper.includes(key)) {
        return cor;
      }
    }
    return { from: 'from-blue-50', to: 'to-cyan-50', border: 'border-blue-200', text: 'text-slate-900' };
  };

  const corCheque = getBancoCor();

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // Se status for pago e valor pago exceder o valor do cheque, gerar crédito
      if (formData.status === 'pago' && formData.valor_pago > formData.valor) {
        const excedente = formData.valor_pago - formData.valor;
        const confirmar = window.confirm(
          `⚠️ ATENÇÃO!\n\n` +
          `Valor pago: ${formatCurrency(formData.valor_pago)}\n` +
          `Valor do cheque: ${formatCurrency(formData.valor)}\n` +
          `Excedente: ${formatCurrency(excedente)}\n\n` +
          `Um crédito de ${formatCurrency(excedente)} será gerado para o cliente.\n\n` +
          `Deseja continuar?`
        );
        
        if (!confirmar) {
          setIsSubmitting(false);
          return;
        }
        
        // Buscar próximo número de crédito
        const todosCreditos = await base44.entities.Credito.list();
        const proximoNumero = todosCreditos.length > 0 
          ? Math.max(...todosCreditos.map(c => c.numero_credito || 0)) + 1 
          : 1;
        
        // Criar crédito
        await base44.entities.Credito.create({
          numero_credito: proximoNumero,
          cliente_codigo: formData.cliente_codigo,
          cliente_nome: formData.cliente_nome || formData.emitente,
          valor: excedente,
          origem: `Excedente Cheque ${formData.numero_cheque}`,
          status: 'disponivel'
        });
        
        // Atualizar formData com o número do crédito gerado
        formData.credito_gerado_numero = proximoNumero;
        
        toast.success(`Crédito #${proximoNumero} de ${formatCurrency(excedente)} gerado!`);
      }
      
      await onSave(formData);
    } catch (error) {
      toast.error('Erro ao salvar cheque: ' + (error.message || 'Tente novamente'));
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Visual do Cheque */}
      <Card className={`p-6 bg-gradient-to-br ${corCheque.from} ${corCheque.to} border-2 ${corCheque.border}`}>
        <div className="space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-slate-500">BANCO</p>
              <p className={`font-bold text-lg ${corCheque.text}`}>{formData.banco || '___________'}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Nº DO CHEQUE</p>
              <p className={`font-mono font-bold text-lg ${corCheque.text}`}>{formData.numero_cheque || '___________'}</p>
            </div>
          </div>
          
          <div className={`border-t ${corCheque.border} pt-3`}>
            <p className="text-xs text-slate-500">PAGUE POR ESTE CHEQUE A QUANTIA DE</p>
            <p className="font-bold text-2xl text-green-700">
              {formData.valor ? `R$ ${parseFloat(formData.valor).toFixed(2)}` : 'R$ ____,__'}
            </p>
          </div>

          <div className={`grid grid-cols-2 gap-4 border-t ${corCheque.border} pt-3`}>
            <div>
              <p className="text-xs text-slate-500">A</p>
              <p className={`font-medium ${corCheque.text}`}>{formData.emitente || '__________________'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">DATA</p>
              <p className={`font-medium ${corCheque.text}`}>
                {formData.data_emissao ? new Date(formData.data_emissao).toLocaleDateString('pt-BR') : '__/__/____'}
              </p>
            </div>
          </div>

          <div className={`text-xs text-slate-500 border-t ${corCheque.border} pt-2`}>
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
              <SelectItem value="SICOOB">Sicoob</SelectItem>
              <SelectItem value="SICREDI">Sicredi</SelectItem>
              <SelectItem value="ORIGINAL">Banco Original</SelectItem>
              <SelectItem value="SAFRA">Banco Safra</SelectItem>
              <SelectItem value="BTG PACTUAL">BTG Pactual</SelectItem>
              <SelectItem value="OUTROS">Outros</SelectItem>
            </SelectContent>
          </Select>
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
        <Label htmlFor="cliente">Cliente *</Label>
        <Select value={formData.cliente_codigo} onValueChange={handleClienteChange} required>
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
        <Label htmlFor="emitente">Emitente (opcional)</Label>
        <Input
          id="emitente"
          value={formData.emitente}
          onChange={(e) => setFormData({ ...formData, emitente: e.target.value })}
          placeholder="Deixe em branco para usar dados do cliente"
        />
        <p className="text-xs text-slate-500 mt-1">Preencha apenas se for diferente do cliente</p>
      </div>

      <div>
        <Label htmlFor="emitente_cpf_cnpj">CPF/CNPJ do Emitente (opcional)</Label>
        <Input
          id="emitente_cpf_cnpj"
          value={formData.emitente_cpf_cnpj}
          onChange={(e) => setFormData({ ...formData, emitente_cpf_cnpj: e.target.value })}
          placeholder="Deixe em branco para usar dados do cliente"
        />
        <p className="text-xs text-slate-500 mt-1">Preencha apenas se o emitente for diferente do cliente</p>
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

      {formData.cheque_substituido_numero && (
        <div>
          <Label htmlFor="cheque_substituido_numero">Este Cheque é Substituição de</Label>
          <Input
            id="cheque_substituido_numero"
            value={formData.cheque_substituido_numero}
            onChange={(e) => setFormData({ ...formData, cheque_substituido_numero: e.target.value })}
            placeholder="Número do cheque substituído"
          />
        </div>
      )}

      {formData.status === 'pago' && (
        <>
          <Card className="p-4 bg-green-50 border-green-200">
            <h3 className="font-semibold mb-3 text-green-700">Informações de Pagamento</h3>
            
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <Label htmlFor="valor_pago">Valor Pago *</Label>
                <Input
                  id="valor_pago"
                  type="number"
                  step="0.01"
                  value={formData.valor_pago}
                  onChange={(e) => setFormData({ ...formData, valor_pago: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="forma_pagamento">Forma de Pagamento *</Label>
                <Select 
                  value={formData.forma_pagamento} 
                  onValueChange={(v) => setFormData({ ...formData, forma_pagamento: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="debito">Débito</SelectItem>
                    <SelectItem value="credito">Crédito</SelectItem>
                    <SelectItem value="cheque">Outro Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="data_pagamento">Data Pagamento</Label>
                <Input
                  id="data_pagamento"
                  type="date"
                  value={formData.data_pagamento}
                  onChange={(e) => setFormData({ ...formData, data_pagamento: e.target.value })}
                />
              </div>
            </div>

            {formData.forma_pagamento === 'cheque' && (
              <div>
                <Label htmlFor="cheque_substituido_numero">Número do Novo Cheque</Label>
                <Input
                  id="cheque_substituido_numero"
                  value={formData.cheque_substituido_numero}
                  onChange={(e) => setFormData({ ...formData, cheque_substituido_numero: e.target.value })}
                  placeholder="Número do cheque usado no pagamento"
                />
              </div>
            )}

            {formData.valor_pago > formData.valor && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm text-blue-700">
                  💡 Excedente de {formatCurrency(formData.valor_pago - formData.valor)} será convertido em crédito
                </p>
              </div>
            )}
          </Card>
        </>
      )}

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
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : (cheque ? 'Atualizar' : 'Cadastrar')} Cheque
        </Button>
      </div>
    </form>
  );
}