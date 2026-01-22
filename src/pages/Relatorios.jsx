import React from 'react';
import { Card } from "@/components/ui/card";
import { FileText, TrendingUp, BarChart3 } from "lucide-react";
import PermissionGuard from "@/components/PermissionGuard";

export default function Relatorios() {
  return (
    <PermissionGuard setor="Relatorios">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Relatórios</h1>
            <p className="text-slate-500 mt-1">Análise de dados e gráficos gerenciais</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-slate-800">Relatórios de Vendas</h3>
              </div>
              <p className="text-sm text-slate-500">Em desenvolvimento</p>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-slate-800">Análise de Performance</h3>
              </div>
              <p className="text-sm text-slate-500">Em desenvolvimento</p>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-green-100 rounded-xl">
                  <BarChart3 className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-slate-800">Gráficos Comparativos</h3>
              </div>
              <p className="text-sm text-slate-500">Em desenvolvimento</p>
            </Card>
          </div>
        </div>
      </div>
    </PermissionGuard>
  );
}