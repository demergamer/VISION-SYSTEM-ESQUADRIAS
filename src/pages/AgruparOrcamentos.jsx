import React from 'react';
import { Card } from "@/components/ui/card";
import { Layers } from "lucide-react";
import PermissionGuard from "@/components/PermissionGuard";

export default function AgruparOrcamentos() {
  return (
    <PermissionGuard setor="AgruparOrcamentos">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Agrupar Orçamentos</h1>
            <p className="text-slate-500 mt-1">Combine múltiplos orçamentos</p>
          </div>

          <Card className="p-8 text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="p-4 bg-indigo-100 rounded-2xl">
                <Layers className="w-12 h-12 text-indigo-600" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">Módulo em Desenvolvimento</h3>
            <p className="text-slate-500">Agrupamento de orçamentos em breve.</p>
          </Card>
        </div>
      </div>
    </PermissionGuard>
  );
}