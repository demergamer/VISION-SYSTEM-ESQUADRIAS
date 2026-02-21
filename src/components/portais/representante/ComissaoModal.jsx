import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { format, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, AlertCircle } from "lucide-react";
import ComissaoDetalhes from "@/components/comissoes/ComissaoDetalhes";

export default function ComissaoModal({ open, onClose, representante }) {
  // Lógica: Se dia <= 10, mostra mês passado por padrão (fase de fechamento)
  const [mesAno, setMesAno] = useState(() => {
      const hoje = new Date();
      if (hoje.getDate() <= 10) return format(subMonths(hoje, 1), 'yyyy-MM');
      return format(hoje, 'yyyy-MM');
  });

  // Gera lista de meses (12 passados, atual e 2 futuros para previsão)
  const mesesDisponiveis = useMemo(() => {
    const meses = []; 
    const hoje = new Date();
    for (let i = 2; i > -12; i--) { 
        const d = addMonths(hoje, i);
        meses.push({ value: format(d, 'yyyy-MM'), label: format(d, 'MMMM yyyy', { locale: ptBR }) });
    }
    return meses;
  }, []);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[95vh] p-0 flex flex-col bg-[#F8FAFC]">
        <DialogHeader className="px-6 py-4 border-b bg-white flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-800">📊 Minhas Comissões</DialogTitle>
            <DialogDescription>Acompanhe suas prévias e comissões pagas.</DialogDescription>
          </div>
          
          {/* Seletor de Meses do Portal */}
          <div className="bg-slate-50 p-2 rounded-xl border flex items-center gap-2 shadow-sm">
             <Calendar className="w-5 h-5 text-blue-600 ml-1" />
             <select 
               value={mesAno} 
               onChange={(e) => setMesAno(e.target.value)} 
               className="bg-transparent font-bold text-slate-700 outline-none uppercase cursor-pointer"
             >
                 {mesesDisponiveis.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
             </select>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
            {!representante ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 bg-amber-50 rounded-xl border border-amber-200 m-4 p-8">
                  <AlertCircle className="w-10 h-10 mb-2 text-amber-600" />
                  <p>Erro: Dados do representante não identificados.</p>
                </div>
            ) : (
                <ComissaoDetalhes 
                    key={`${representante.codigo}-${mesAno}`}
                    representante={representante} 
                    mesAno={mesAno} 
                    onClose={onClose}
                    isPortal={true}
                />
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}