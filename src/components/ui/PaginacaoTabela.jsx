import React from 'react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function PaginacaoTabela({ currentPage, totalItems, itemsPerPage, onPageChange, onItemsPerPageChange }) {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const start = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-slate-50/50">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <span>Itens por página:</span>
        <Select value={String(itemsPerPage)} onValueChange={(v) => { onItemsPerPageChange(Number(v)); onPageChange(1); }}>
          <SelectTrigger className="h-8 w-20 text-xs bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[10, 30, 50, 100].map(n => (
              <SelectItem key={n} value={String(n)}>{n}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="hidden sm:inline">
          {totalItems === 0 ? 'Nenhum registro' : `${start}–${end} de ${totalItems}`}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(1)} disabled={currentPage === 1}>
          <ChevronLeft className="w-3 h-3" /><ChevronLeft className="w-3 h-3 -ml-2" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm font-medium text-slate-600 px-3 py-1 bg-white border border-slate-200 rounded-md min-w-[80px] text-center">
          {currentPage} / {totalPages}
        </span>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages}>
          <ChevronRight className="w-3 h-3" /><ChevronRight className="w-3 h-3 -ml-2" />
        </Button>
      </div>
    </div>
  );
}