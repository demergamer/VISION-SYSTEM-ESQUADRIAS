import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import AnexosUpload from "./AnexosUpload";

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
const hoje = () => format(new Date(), 'yyyy-MM-dd');

export default function BaixarValeModal({ vale, saldoAtual, onSave, onCancel, isLoading }) {
  const [valorGasto, setValorGasto] = useState('');
  const [dataDevolucao, setDataDevolucao] = useState(hoje());
  const [anexosBaixa, setAnexosBaixa] = useState([]);

  const valorVale = vale?.valor || 0;
  const valorGastoNum = parseFloat(valorGasto) || 0;
  const diferenca = valorVale - valorGastoNum;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (valorGastoNum <= 0) { toast.error('Informe o valor gasto'); return; }
    if (anexosBaixa.length === 0) { toast.error('Anexe ao menos um comprovante da despesa'); return; }

    onSave({
      valorGasto: valorGastoNum,
      diferenca,
      dataDevolucao,
      anexosBaixa,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
      {/* Resumo do vale */}
      <div className="p-4 bg-blue-50 rounded-xl space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500">Vale Nº:</span>
          <span className="font-bold text-blue-700">#{vale?.ticket_id}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Funcionário:</span>
          <span className="font-semibold">{vale?.funcionario}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Valor do Vale:</span>
          <span className="font-bold text-lg text-blue-700">{formatCurrency(valorVale)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Motivo:</span>
          <span className="max-w-[60%] text-right text-xs text-slate-600">{vale?.motivo}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Valor Efetivamente Gasto (R$) *</Label>
          <Input
            type="number" step="0.01" min="0.01"
            value={valorGasto} onChange={e => setValorGasto(e.target.value)}
            placeholder="Quanto foi gasto de fato?" required
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Data de Devolução</Label>
          <Input type="date" value={dataDevolucao} onChange={e => setDataDevolucao(e.target.value)} />
        </div>
      </div>

      {valorGasto && (
        <div className={cn(
          "p-4 rounded-xl border-2",
          diferenca > 0 ? "bg-green-50 border-green-300" :
          diferenca < 0 ? "bg-red-50 border-red-300" :
          "bg-slate-50 border-slate-300"
        )}>
          <p className="text-sm font-semibold mb-1">
            {diferenca > 0 ? '💚 Troco a Devolver ao Caixa' :
             diferenca < 0 ? '💸 Reembolso — Saída adicional' :
             '✅ Valor Exato'}
          </p>
          <p className="text-2xl font-bold">
            {diferenca !== 0 ? formatCurrency(Math.abs(diferenca)) : 'Sem ajuste de caixa'}
          </p>
          {diferenca > 0 && <p className="text-xs text-green-700 mt-1">Novo saldo: {formatCurrency(saldoAtual + diferenca)}</p>}
          {diferenca < 0 && <p className="text-xs text-red-700 mt-1">Novo saldo: {formatCurrency(saldoAtual - Math.abs(diferenca))}</p>}
          {diferenca === 0 && <p className="text-xs text-slate-500 mt-1">Saldo sem alteração</p>}
        </div>
      )}

      <AnexosUpload anexos={anexosBaixa} onChange={setAnexosBaixa} label="Comprovantes da Baixa *" />

      <div className="flex justify-end gap-3 pt-3 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>Cancelar</Button>
        <Button type="submit" disabled={isLoading} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
          {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Processando...</> : <><CheckCircle className="w-4 h-4" />Baixar Vale</>}
        </Button>
      </div>
    </form>
  );
}