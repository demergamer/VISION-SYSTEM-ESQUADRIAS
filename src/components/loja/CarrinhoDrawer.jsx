import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, ShoppingCart, Package } from "lucide-react";

const fmt = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

export default function CarrinhoDrawer({ open, onClose, itens, onRemove, onLimpar }) {
  const total = itens.reduce((acc, i) => acc + (i.preco_unitario * i.quantidade), 0);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-5 py-4 border-b border-slate-100">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-blue-500" /> Orçamento
            <Badge className="ml-1 bg-blue-100 text-blue-700 border-0">{itens.length} item(s)</Badge>
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
          {itens.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-400">
              <Package className="w-12 h-12 text-slate-200 mb-2" />
              <p className="text-sm">Orçamento vazio</p>
            </div>
          ) : itens.map((item, idx) => (
            <div key={idx} className="flex gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-slate-800 truncate">{item.nome_completo}</p>
                <p className="text-xs text-slate-400 mt-0.5 font-mono">SKU: {item.sku}</p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {item.tamanho && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{item.tamanho}</Badge>}
                  {item.cor && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{item.cor}</Badge>}
                  {item.lado && item.lado !== 'N/A' && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{item.lado}</Badge>}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-slate-500">Qtd: <span className="font-bold text-slate-700">{item.quantidade}</span></p>
                  <p className="font-bold text-blue-700 text-sm">{fmt(item.preco_unitario * item.quantidade)}</p>
                </div>
              </div>
              <button onClick={() => onRemove(idx)} className="text-red-400 hover:text-red-600 self-start mt-0.5 p-1 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {itens.length > 0 && (
          <div className="border-t border-slate-100 px-5 py-4 space-y-3 bg-white">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">Total do Orçamento</span>
              <span className="text-xl font-bold text-blue-700">{fmt(total)}</span>
            </div>
            <Button className="w-full bg-blue-600 hover:bg-blue-700 gap-2">
              <ShoppingCart className="w-4 h-4" /> Gerar Orçamento
            </Button>
            <Button variant="outline" size="sm" className="w-full text-red-500 hover:text-red-600 hover:bg-red-50" onClick={onLimpar}>
              Limpar tudo
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}