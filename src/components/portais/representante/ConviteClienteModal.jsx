import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";
import { Mail, Copy, AlertCircle } from "lucide-react";

export default function ConviteClienteModal({ cliente, open, onClose, onSuccess }) {
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);

  const linkCadastro = `${window.location.origin}?convite_cliente=${cliente?.codigo}`;

  const handleCadastrarEmail = async () => {
    if (!email.trim()) {
      toast.error('Digite um email válido');
      return;
    }

    setEnviando(true);
    try {
      await base44.entities.Cliente.update(cliente.id, { email: email.trim() });
      await base44.users.inviteUser(email.trim(), 'user');
      toast.success('Email cadastrado e convite enviado!');
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao enviar convite');
    } finally {
      setEnviando(false);
    }
  };

  const handleCopiarLink = () => {
    navigator.clipboard.writeText(linkCadastro);
    toast.success('Link copiado! Envie pelo WhatsApp.');
  };

  if (!cliente) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            Cliente Não Localizado
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 p-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800 font-medium">
              O cliente <strong>{cliente.nome}</strong> não possui email cadastrado.
            </p>
            <p className="text-xs text-red-600 mt-2">
              Cadastre o email para enviar o convite automático ou copie o link para compartilhar.
            </p>
          </div>

          <div className="border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-blue-600 font-bold">
              <Mail className="w-4 h-4" />
              <span className="text-sm">OPÇÃO 1: Cadastrar Email</span>
            </div>
            <div>
              <Label>Email do Cliente</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cliente@exemplo.com"
              />
            </div>
            <Button
              onClick={handleCadastrarEmail}
              disabled={enviando}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {enviando ? 'Enviando...' : 'Cadastrar e Enviar Convite'}
            </Button>
          </div>

          <div className="border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-emerald-600 font-bold">
              <Copy className="w-4 h-4" />
              <span className="text-sm">OPÇÃO 2: Copiar Link</span>
            </div>
            <p className="text-xs text-slate-600">
              Copie o link e envie diretamente no WhatsApp do cliente.
            </p>
            <div className="bg-slate-100 rounded border p-2 text-xs font-mono break-all">
              {linkCadastro}
            </div>
            <Button onClick={handleCopiarLink} variant="outline" className="w-full">
              <Copy className="w-4 h-4 mr-2" />
              Copiar Link
            </Button>
          </div>

          <div className="flex justify-end pt-2 border-t">
            <Button variant="ghost" onClick={onClose}>Fechar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}