import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

export default function ResolveDuplicatesModal({ duplicateGroups, onResolve, onCancel, isProcessing }) {
  const [selectedKeepers, setSelectedKeepers] = useState({});

  useEffect(() => {
    const initialSelections = {};
    Object.keys(duplicateGroups).forEach(key => {
      initialSelections[key] = duplicateGroups[key][0].id;
    });
    setSelectedKeepers(initialSelections);
  }, [duplicateGroups]);

  const handleConfirm = () => {
    const idsToExclude = [];
    Object.keys(duplicateGroups).forEach(key => {
      const keeperId = selectedKeepers[key];
      const group = duplicateGroups[key];
      group.forEach(cheque => {
        if (cheque.id !== keeperId) idsToExclude.push(cheque.id);
      });
    });
    onResolve(idsToExclude);
  };

  return (
    <div className="space-y-6">
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
        <div className="text-sm text-amber-800">
          <p className="font-bold">Atenção: Cheques Idênticos Detectados</p>
          <p>O sistema encontrou registros duplicados (mesmo número, conta, vencimento e titular). Selecione abaixo qual é o <strong>original</strong> para manter. Os outros serão movidos para "Excluídos".</p>
        </div>
      </div>

      <div className="max-h-[60vh] overflow-y-auto space-y-6 pr-2">
        {Object.entries(duplicateGroups).map(([key, group], index) => (
          <Card key={key} className="p-4 border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-3 border-b pb-2 bg-slate-50 -mx-4 -mt-4 px-4 py-2 rounded-t-lg">
              <span className="bg-white border text-slate-500 text-xs font-bold px-2 py-1 rounded">Conflito #{index + 1}</span>
              <span className="font-mono text-sm text-slate-700 font-medium">Cheque Nº {group[0].numero_cheque}</span>
              <span className="text-sm text-slate-500 hidden sm:inline">| {group[0].titular || group[0].emitente}</span>
              <span className="ml-auto font-bold text-slate-800">{formatCurrency(group[0].valor)}</span>
            </div>

            <RadioGroup 
              value={selectedKeepers[key]} 
              onValueChange={(val) => setSelectedKeepers(prev => ({ ...prev, [key]: val }))}
              className="space-y-3"
            >
              {group.map(cheque => (
                <div key={cheque.id} onClick={() => setSelectedKeepers(prev => ({ ...prev, [key]: cheque.id }))} className={cn(
                  "flex items-start space-x-3 p-3 rounded-lg border transition-all cursor-pointer relative",
                  selectedKeepers[key] === cheque.id ? "border-green-500 bg-green-50 ring-1 ring-green-500" : "border-slate-200 hover:bg-slate-50"
                )}>
                  <RadioGroupItem value={cheque.id} id={cheque.id} className="mt-1" />
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <Label className="font-bold cursor-pointer text-slate-800">
                          ID: {cheque.id}
                        </Label>
                        <p className="text-xs text-slate-500">Cadastrado em: {format(parseISO(cheque.created_date || new Date().toISOString()), 'dd/MM/yyyy HH:mm')}</p>
                      </div>
                      <Badge variant="outline" className="capitalize bg-white">{cheque.status === 'normal' ? 'Em Mãos' : cheque.status}</Badge>
                    </div>
                    
                    <div className="mt-2 text-xs text-slate-600 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white/50 p-2 rounded border border-black/5">
                        <div>
                            <span className="font-semibold text-slate-400 block">Origem / Vínculo:</span>
                            {cheque.pedido_id ? `Pedido #${cheque.pedido_id}` : (cheque.origem || 'Cadastro Manual')}
                        </div>
                        <div>
                            <span className="font-semibold text-slate-400 block">Observação:</span>
                            {cheque.observacao || '-'}
                        </div>
                    </div>
                  </div>
                  {selectedKeepers[key] === cheque.id && (
                      <div className="absolute top-2 right-2 text-green-600"><CheckCircle className="w-4 h-4"/></div>
                  )}
                </div>
              ))}
            </RadioGroup>
          </Card>
        ))}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel} disabled={isProcessing}>Cancelar</Button>
        <Button onClick={handleConfirm} disabled={isProcessing} className="bg-green-600 hover:bg-green-700 text-white">
          {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
          Resolver Selecionados
        </Button>
      </div>
    </div>
  );
}