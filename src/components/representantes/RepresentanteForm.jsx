import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Save, X, Loader2, CreditCard, Wallet, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export default function RepresentanteForm({ representante, onSave, onCancel, isLoading, isSelfEditMode = false }) {
  const [isSaving, setIsSaving] = React.useState(false);
  const [form, setForm] = useState({
    codigo: '',
    nome: '',
    nome_social: '',
    email: '',
    regiao: '',
    telefone: '',
    chave_pix: '',
    banco_nome: '',
    agencia: '',
    conta_corrente: '',
    cpf_parcial: '',
    bloqueado: false
  });

  useEffect(() => {
    if (representante) {
      setForm({
        codigo: representante.codigo || '',
        nome: representante.nome || '',
        nome_social: representante.nome_social || '',
        email: representante.email || '',
        regiao: representante.regiao || '',
        telefone: representante.telefone || '',
        chave_pix: representante.chave_pix || '',
        banco_nome: representante.banco_nome || '',
        agencia: representante.agencia || '',
        conta_corrente: representante.conta_corrente || '',
        cpf_parcial: representante.cpf_parcial || '',
        bloqueado: representante.bloqueado || false
      });
    }
  }, [representante]);

  const readonlyClass = "bg-slate-100 cursor-not-allowed opacity-70";

  return (
    <div className="space-y-6">
      {isSelfEditMode && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 shrink-0" /> Código, Email e Região só podem ser alterados pelo administrador.
        </p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="codigo">Código *</Label>
          <Input
            id="codigo"
            value={form.codigo}
            onChange={(e) => setForm({ ...form, codigo: e.target.value })}
            placeholder="Ex: REP001"
            disabled={!!representante || isSelfEditMode}
            className={cn((!representante || isSelfEditMode) && readonlyClass)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="nome">Nome Completo *</Label>
          <Input
            id="nome"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            placeholder="Nome do representante"
            disabled={isSelfEditMode}
            className={cn(isSelfEditMode && readonlyClass)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="nome_social">Nome Social <span className="text-blue-500 font-normal text-xs">(editável)</span></Label>
          <Input
            id="nome_social"
            value={form.nome_social}
            onChange={(e) => setForm({ ...form, nome_social: e.target.value })}
            placeholder="Como prefere ser chamado"
          />
        </div>

        {/* --- CAMPO EMAIL --- */}
        <div className="space-y-2">
          <Label htmlFor="email">Email de Acesso *</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="email@exemplo.com"
            disabled={isSelfEditMode}
            className={cn(isSelfEditMode && readonlyClass)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="regiao">Região de Serviço</Label>
          <Input
            id="regiao"
            value={form.regiao}
            onChange={(e) => setForm({ ...form, regiao: e.target.value })}
            placeholder="Ex: Sul, Sudeste, Norte"
            disabled={isSelfEditMode}
            className={cn(isSelfEditMode && readonlyClass)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="telefone">Telefone <span className="text-blue-500 font-normal text-xs">(editável)</span></Label>
          <Input
            id="telefone"
            value={form.telefone}
            onChange={(e) => setForm({ ...form, telefone: e.target.value })}
            placeholder="(00) 00000-0000"
          />
        </div>
      </div>

      {/* SEÇÃO: DADOS BANCÁRIOS & PAGAMENTO */}
      <Card className="p-6 bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
        <div className="flex items-center gap-2 mb-4">
          <Wallet className="w-5 h-5 text-emerald-600" />
          <h3 className="font-bold text-slate-800">Dados Bancários & Pagamento</h3>
        </div>

        <div className="space-y-4">
          {/* Chave PIX (Destaque) */}
          <div className="space-y-2">
            <Label htmlFor="chave_pix" className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              Chave PIX *
            </Label>
            <Input
              id="chave_pix"
              value={form.chave_pix}
              onChange={(e) => setForm({ ...form, chave_pix: e.target.value })}
              placeholder="email@exemplo.com, telefone ou chave aleatória"
              className="border-emerald-300 focus:border-emerald-500"
            />
          </div>

          {/* Dados Bancários Tradicionais */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="banco_nome">Banco</Label>
              <Input
                id="banco_nome"
                value={form.banco_nome}
                onChange={(e) => setForm({ ...form, banco_nome: e.target.value })}
                placeholder="Ex: 001 - Banco do Brasil"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agencia">Agência</Label>
              <Input
                id="agencia"
                value={form.agencia}
                onChange={(e) => setForm({ ...form, agencia: e.target.value })}
                placeholder="Ex: 1234-5"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="conta_corrente">Conta Corrente</Label>
              <Input
                id="conta_corrente"
                value={form.conta_corrente}
                onChange={(e) => setForm({ ...form, conta_corrente: e.target.value })}
                placeholder="Ex: 12345-6"
              />
            </div>
          </div>

          {/* Dica CPF (Segurança) */}
          <div className="space-y-2">
            <Label htmlFor="cpf_parcial">Dica de Segurança - CPF (6 dígitos centrais)</Label>
            <Input
              id="cpf_parcial"
              value={form.cpf_parcial}
              onChange={(e) => setForm({ ...form, cpf_parcial: e.target.value })}
              placeholder="123.456"
              maxLength={7}
              className="w-40"
            />
            <p className="text-xs text-slate-500">Para conferência visual no momento do pagamento</p>
          </div>
        </div>
      </Card>

      {!isSelfEditMode && (
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
          <div>
            <Label htmlFor="bloqueado" className="font-medium">Bloquear Representante</Label>
            <p className="text-sm text-slate-500">Impede o acesso ao portal</p>
          </div>
          <Switch
            id="bloqueado"
            checked={form.bloqueado}
            onCheckedChange={(checked) => setForm({ ...form, bloqueado: checked })}
          />
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading || isSaving}>
          <X className="w-4 h-4 mr-2" />
          Cancelar
        </Button>
        <Button type="button" onClick={async () => {
          setIsSaving(true);
          try {
            await onSave(form);
          } finally {
            setIsSaving(false);
          }
        }} disabled={isLoading || isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              {representante ? 'Atualizar' : 'Cadastrar'}
            </>
          )}
        </Button>
      </div>

      {/* Overlay de Loading */}
      {isSaving && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-800">Salvando Representante</h3>
              <p className="text-sm text-slate-500">Aguarde um momento...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}