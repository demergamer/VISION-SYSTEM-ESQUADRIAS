import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Phone, Wallet, Hash, User } from "lucide-react";

export default function MotoristaDetails({ motorista }) {
  if (!motorista) return null;
  const rows = [
    { label: 'Código', value: motorista.codigo, icon: Hash },
    { label: 'Nome Completo', value: motorista.nome, icon: User },
    { label: 'Nome Social', value: motorista.nome_social },
    { label: 'Telefone', value: motorista.telefone, icon: Phone },
    { label: 'Chave PIX', value: motorista.chave_pix, icon: Wallet },
  ];

  return (
    <div className="space-y-6 py-2">
      <div className="flex flex-col items-center gap-3 pb-4 border-b">
        <Avatar className="h-20 w-20 border-4 border-slate-100">
          <AvatarImage src={motorista.foto_url} />
          <AvatarFallback className="bg-blue-100 text-blue-700 font-bold text-2xl">{(motorista.nome_social || motorista.nome || 'M').slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-800">{motorista.nome_social || motorista.nome}</h2>
          <Badge className={motorista.ativo === false ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}>
            {motorista.ativo === false ? 'Inativo' : 'Ativo'}
          </Badge>
        </div>
      </div>
      <div className="space-y-3">
        {rows.map((r, i) => r.value && (
          <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            {r.icon && <r.icon className="w-4 h-4 text-slate-400 shrink-0" />}
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase">{r.label}</p>
              <p className="font-semibold text-slate-700">{r.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}