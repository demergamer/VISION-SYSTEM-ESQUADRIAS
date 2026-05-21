import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, ArrowUpCircle, MinusCircle, ArrowDownCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import AnexosUpload from "./AnexosUpload";

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
const hoje = () => format(new Date(), 'yyyy-MM-dd');

const TIPOS_BAIXA = [
  {
    value: 'troco',
    label: 'Baixa c/ Troco',
    icon: ArrowUpCircle,
    color: 'border-green-400 bg-green-50 text-green-800',
    selectedColor: 'border-green-500 bg-green-100 ring-2 ring-green-400',
    desc: 'Funcionário devolveu troco — valor ENTRA no caixa',
    efeito: 'entrada',
  },
  {
    value: 'sem_troco',
    label: 'Baixa s/ Troco',
    icon: MinusCircle,
    color: 'border-slate-300 bg-slate-50 text-slate-700',
    selectedColor: 'border-slate-400 bg-slate-100 ring-2 ring-slate-400',
    desc: 'Gasto igual ao vale — sem alteração no saldo',
    efeito: 'neutro',
  },
  {
    value: 'estorno',
    label: 'Baixa c/ Estorno',
    icon: ArrowDownCircle,
    color: 'border-red-300 bg-red-50 text-red-800',
    selectedColor: 'border-red-400 bg-red-100 ring-2 ring-red-400',
    desc: 'Empresa reembolsou a mais — valor SAI do caixa',
    efeito: 'saida',
  },
];

export default function BaixarValeModal({ vale, saldoAtual, onSave, onCancel, isLoading }) {
  const [tipoBaixa, setTipoBaixa] = useState('sem_troco');
  const [valorAjuste, setValorAjuste] = useState('');
  const [dataDevolucao, setDataDevolucao] = useState(hoje());
  const [anexosBaixa, setAnexosBaixa] = useState([]);

  const valorVale = vale?.valor || 0;
  const valorAjusteNum = parseFloat(valorAjuste) || 0;
  const precisaValor = tipoBaixa !== 'sem_troco';

  const novoSaldo = tipoBaixa === 'troco'
    ? saldoAtual + valorAjusteNum
    : tipoBaixa === 'estorno'
    ? saldoAtual - valorAjusteNum
    : saldoAtual;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (precisaValor && valorAjusteNum <= 0) {
      toast.error('Informe o valor do ajuste');
      return;
    }
    if (anexosBaixa.length === 0) {
      toast.error('Anexe ao menos um comprovante');
      return;
    }
    onSave({ tipoBaixa, valorAjuste: valorAjusteNum, dataDevolucao, anexosBaixa });
  };

  const tipoSelecionado = TIPOS_BAIXA.find(t => t.value === tipoBaixa);

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

      {/* Seletor de tipo de baixa */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold">Tipo de Baixa *</Label>
        <div className="grid grid-cols-3 gap-2">
          {TIPOS_BAIXA.map(t => {
            const Icon = t.icon;
            const selected = tipoBaixa === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => { setTipoBaixa(t.value); setValorAjuste(''); }}
                className={cn(
                  "flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-center cursor-pointer",
                  selected ? t.selectedColor : t.color,
                  "hover:opacity-90"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-bold leading-tight">{t.label}</span>
              </button>
            );
          })}
        </div>
        {tipoSelecionado && (
          <p className="text-xs text-slate-500 italic">{tipoSelecionado.desc}</p>
        )}
      </div>

      {/* Valor do ajuste (só aparece quando necessário) */}
      {precisaValor && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">
              {tipoBaixa === 'troco' ? 'Valor do Troco (R$) *' : 'Valor do Estorno (R$) *'}
            </Label>
            <Input
              type="number" step="0.01" min="0.01"
              value={valorAjuste}
              onChange={e => setValorAjuste(e.target.value)}
              placeholder={tipoBaixa === 'troco' ? 'Quanto voltou ao caixa?' : 'Quanto sairá do caixa?'}
              required
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Data de Devolução</Label>
            <Input type="date" value={dataDevolucao} onChange={e => setDataDevolucao(e.target.value)} />
          </div>
        </div>
      )}

      {tipoBaixa === 'sem_troco' && (
        <div className="space-y-1">
          <Label className="text-xs">Data de Devolução</Label>
          <Input type="date" value={dataDevolucao} onChange={e => setDataDevolucao(e.target.value)} />
        </div>
      )}

      {/* Preview do impacto no caixa */}
      <div className={cn(
        "p-3 rounded-xl border-2 text-sm",
        tipoBaixa === 'troco' ? "bg-green-50 border-green-300" :
        tipoBaixa === 'estorno' ? "bg-red-50 border-red-300" :
        "bg-slate-50 border-slate-300"
      )}>
        <p className="font-semibold mb-1">
          {tipoBaixa === 'troco' ? '💚 Entrada no caixa' :
           tipoBaixa === 'estorno' ? '💸 Saída do caixa' :
           '➖ Sem impacto no caixa'}
        </p>
        {tipoBaixa !== 'sem_troco' && valorAjusteNum > 0 ? (
          <>
            <p className="text-xl font-bold">{formatCurrency(valorAjusteNum)}</p>
            <p className="text-xs text-slate-500 mt-1">
              Novo saldo: <strong>{formatCurrency(novoSaldo)}</strong>
            </p>
          </>
        ) : (
          <p className="text-slate-500 text-xs">
            {tipoBaixa === 'sem_troco' ? `Saldo permanece: ${formatCurrency(saldoAtual)}` : 'Informe o valor acima'}
          </p>
        )}
      </div>

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