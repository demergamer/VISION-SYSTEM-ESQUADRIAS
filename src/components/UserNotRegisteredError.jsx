import React from 'react';
import { Card } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";

export default function UserNotRegisteredError() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
      <Card className="p-8 max-w-md text-center">
        <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Acesso Negado</h2>
        <p className="text-slate-600">
          Você não tem permissão para realizar esta ação.
        </p>
        <p className="text-sm text-slate-500 mt-4">
          Entre em contato com o administrador do sistema.
        </p>
      </Card>
    </div>
  );
}