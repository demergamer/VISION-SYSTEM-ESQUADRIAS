import React from 'react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function SeletorItensPorPagina({ itemsPerPage, onChangeItemsPerPage }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500 whitespace-nowrap">Itens por página:</span>
      <Select value={String(itemsPerPage)} onValueChange={(v) => onChangeItemsPerPage(Number(v))}>
        <SelectTrigger className="h-9 w-20 bg-white text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {[5, 10, 30, 50, 100].map(n => (
            <SelectItem key={n} value={String(n)}>{n}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function PaginacaoControles({ currentPage, totalPages, totalItems, itemsPerPage, onPageChange }) {
  if (totalPages <= 1) return null;

  const indexFirst = (currentPage - 1) * itemsPerPage + 1;
  const indexLast = Math.min(currentPage * itemsPerPage, totalItems);

  // Gera os números de páginas com reticências
  const getPages = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = [];
    pages.push(1);
    if (currentPage > 3) pages.push('...');
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 mt-2">
      <p className="text-xs text-slate-400">
        Mostrando <span className="font-semibold text-slate-600">{indexFirst}</span> a{' '}
        <span className="font-semibold text-slate-600">{indexLast}</span> de{' '}
        <span className="font-semibold text-slate-600">{totalItems}</span> pedidos
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-3 text-xs"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Anterior
        </Button>

        {getPages().map((page, i) =>
          page === '...' ? (
            <span key={`ellipsis-${i}`} className="px-2 text-slate-400 text-sm select-none">…</span>
          ) : (
            <Button
              key={page}
              variant={currentPage === page ? 'default' : 'outline'}
              size="sm"
              className={cn("h-8 w-8 p-0 text-xs", currentPage === page ? "bg-blue-600 hover:bg-blue-700 text-white" : "")}
              onClick={() => onPageChange(page)}
            >
              {page}
            </Button>
          )
        )}

        <Button
          variant="outline"
          size="sm"
          className="h-8 px-3 text-xs"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Próximo <ChevronRight className="w-3.5 h-3.5 ml-1" />
        </Button>
      </div>
    </div>
  );
}