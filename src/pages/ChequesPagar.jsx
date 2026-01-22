import React from 'react';
import { Card } from "@/components/ui/card";
import { CreditCard, Lock } from "lucide-react";
import PermissionGuard from "@/components/PermissionGuard";

export default function ChequesPagar() {
  return (
    <PermissionGuard setor="ChequesPagar">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Cheques a Pagar</h1>
            <p className="text-slate-500 mt-1">Gestão de cheques e pagamentos</p>
          </div>

          <Card className="p-8 text-center border-amber-200 bg-amber-50/30">
            <div className="flex items-center justify-center mb-4">
              <div className="p-4 bg-amber-100 rounded-2xl">
                <Lock className="w-12 h-12 text-amber-600" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">Fase Master</h3>
            <p className="text-slate-500">Esta funcionalidade está em desenvolvimento.</p>
          </Card>
        </div>
      </div>
    </PermissionGuard>
  );
}