import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet } from "lucide-react";

export default function Financeiro() {
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Wallet className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-slate-800">Financeiro</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Dashboard Financeiro</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600">Página financeira em desenvolvimento</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}