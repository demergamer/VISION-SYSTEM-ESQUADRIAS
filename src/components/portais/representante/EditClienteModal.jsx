import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";
import { Edit, Lock } from "lucide-react";

export default function EditClienteModal({ cliente, open, onClose, onSuccess }) {
  const [telefone, setTelefone] = useState(cliente?.telefone || '');
  const [email, setEmail] = useState(cliente?.email || '');
  const [salvando, setSalvando] = useState(false);

  const handleSalvar = async () => {
    setSalvando(true);
    try {
      await base44.entities.Cliente.update(cliente.id, {
        telefone: telefone.trim(),
        email: email.trim()
      });
      toast.success('Dados do cliente atualizados!');
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao atualizar cliente');
    } finally {
      setSalvando(false);
    }
  };

  if (!cliente) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5 text-blue-600" />
            Editar Cliente
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 p-4">
          <div>
            <Label className="text-xs text-slate-500 flex items-center gap-2">
              <Lock className="w-3 h-3" /> Nome (Bloqueado)
            </Label>
            <Input value={cliente.nome} disabled className="bg-slate-100" />
          </div>

          <div>
            <Label className="text-xs text-slate-500 flex items-center gap-2">
              <Lock className="w-3 h-3" /> Código (Bloqueado)
            </Label>
            <Input value={cliente.codigo} disabled className="bg-slate-100" />
          </div>

          <div>
            <Label className="text-xs text-slate-500 flex items-center gap-2">
              <Lock className="w-3 h-3" /> % Comissão (Bloqueado)
            </Label>
            <Input value={`${cliente.porcentagem_comissao || 5}%`} disabled className="bg-slate-100" />
          </div>

          <div>
            <Label>Telefone</Label>
            <Input
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(00) 00000-0000"
            />
          </div>

          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cliente@exemplo.com"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSalvar} disabled={salvando} className="bg-blue-600 hover:bg-blue-700">
              {salvando ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}