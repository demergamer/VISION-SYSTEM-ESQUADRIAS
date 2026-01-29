import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ArrowLeft, Home } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function AcessoNegado() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-slate-50 to-orange-50 flex items-center justify-center p-6">
      <Card className="max-w-lg w-full p-8 text-center shadow-2xl">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-red-100 mb-4">
            <ShieldAlert className="w-12 h-12 text-red-600" />
          </div>
          <h1 className="text-4xl font-bold text-slate-800 mb-2">403</h1>
          <h2 className="text-2xl font-semibold text-slate-700 mb-3">Acesso Negado</h2>
          <p className="text-slate-600 leading-relaxed">
            Você não tem permissão para acessar esta área do sistema.
          </p>
          <p className="text-sm text-slate-500 mt-2">
            Entre em contato com o administrador do sistema para solicitar as permissões necessárias.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button 
            variant="outline" 
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <Button 
            onClick={() => navigate(createPageUrl('Dashboard'))}
            className="gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Home className="w-4 h-4" />
            Ir para o Dashboard
          </Button>
        </div>

        <div className="mt-8 pt-6 border-t">
          <p className="text-xs text-slate-400">
            J&C System - Portal do Representante
          </p>
        </div>
      </Card>
    </div>
  );
}