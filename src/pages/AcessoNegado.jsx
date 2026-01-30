import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ArrowLeft, LayoutDashboard } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function AcessoNegado() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <Card className="max-w-md w-full p-8 text-center shadow-xl border-slate-200">
        <div className="mb-6 relative">
          <div className="absolute inset-0 bg-red-100 rounded-full scale-150 opacity-20 blur-xl"></div>
          <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-full bg-red-50 text-red-500 mb-2 ring-8 ring-red-50/50">
            <ShieldAlert className="w-12 h-12" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-slate-800 mb-2 tracking-tight">Acesso Restrito</h1>
        <p className="text-slate-600 mb-6 leading-relaxed">
          Você não possui as permissões necessárias para acessar este módulo.
        </p>
        
        <div className="bg-slate-50 p-4 rounded-xl mb-8 border border-slate-100 text-left">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">O que fazer?</p>
          <ul className="text-sm text-slate-600 space-y-2 list-disc pl-4">
            <li>Verifique se você está logado na conta correta.</li>
            <li>Solicite acesso ao administrador do sistema.</li>
          </ul>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button 
            variant="outline" 
            onClick={() => navigate(-1)}
            className="w-full gap-2 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <Button 
            onClick={() => navigate(createPageUrl('Dashboard'))}
            className="w-full gap-2 bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-200"
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Button>
        </div>
      </Card>
    </div>
  );
}