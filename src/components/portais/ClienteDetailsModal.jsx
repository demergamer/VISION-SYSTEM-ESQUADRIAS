import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Building2, MapPin, Phone, Mail, Percent, Users, CreditCard } from "lucide-react";

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

export default function ClienteDetailsModal({ cliente, open, onClose }) {
  if (!cliente) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Building2 className="w-5 h-5 text-blue-600" />
            Dados do Cliente
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="space-y-6 p-4">
            {/* Info Principal */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h3 className="font-bold text-lg text-slate-800 mb-1">{cliente.nome}</h3>
              <div className="flex items-center gap-4 text-sm text-slate-600">
                <span className="font-mono bg-white px-2 py-1 rounded border">{cliente.codigo}</span>
                {cliente.cnpj && <span className="font-mono">{cliente.cnpj}</span>}
              </div>
            </div>

            {/* Dados de Contato */}
            <div className="grid grid-cols-2 gap-4">
              <div className="border rounded-lg p-4 bg-slate-50">
                <div className="flex items-center gap-2 text-slate-600 mb-2">
                  <MapPin className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase">Região</span>
                </div>
                <p className="text-sm font-medium text-slate-800">{cliente.regiao || 'Não definida'}</p>
              </div>

              <div className="border rounded-lg p-4 bg-slate-50">
                <div className="flex items-center gap-2 text-slate-600 mb-2">
                  <Percent className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase">Comissão</span>
                </div>
                <p className="text-sm font-medium text-slate-800">{cliente.porcentagem_comissao || 5}%</p>
              </div>

              <div className="border rounded-lg p-4 bg-slate-50">
                <div className="flex items-center gap-2 text-slate-600 mb-2">
                  <Phone className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase">Telefone</span>
                </div>
                <p className="text-sm font-medium text-slate-800">{cliente.telefone || 'Não cadastrado'}</p>
              </div>

              <div className="border rounded-lg p-4 bg-slate-50">
                <div className="flex items-center gap-2 text-slate-600 mb-2">
                  <Mail className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase">Email</span>
                </div>
                <p className="text-sm font-medium text-slate-800 break-all">{cliente.email || 'Não cadastrado'}</p>
              </div>
            </div>

            {/* Representante */}
            <div className="border border-slate-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-slate-600 mb-2">
                <Users className="w-4 h-4" />
                <span className="text-xs font-bold uppercase">Representante</span>
              </div>
              <p className="text-sm font-medium text-slate-800">{cliente.representante_nome || 'Não atribuído'}</p>
              <p className="text-xs text-slate-500 font-mono mt-1">Código: {cliente.representante_codigo}</p>
            </div>

            {/* Financeiro */}
            <div className="border border-emerald-200 bg-emerald-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-emerald-700 mb-2">
                <CreditCard className="w-4 h-4" />
                <span className="text-xs font-bold uppercase">Limite de Crédito</span>
              </div>
              <p className="text-xl font-bold text-emerald-800">{formatCurrency(cliente.limite_credito || 0)}</p>
            </div>

            {/* Status */}
            {cliente.bloqueado_manual && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <Badge variant="destructive">🚫 CLIENTE BLOQUEADO</Badge>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}