import React from 'react';
import { AlertTriangle, XCircle, X, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * AlertModal - Modal de alerta chamativo com blur de tela
 * type: 'error' | 'warning'
 */
export default function AlertModal({ open, onClose, type = 'error', title, message }) {
  if (!open) return null;

  const isError = type === 'error';

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center animate-in fade-in duration-150">
      {/* Backdrop blur */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Card */}
      <div className={cn(
        "relative z-10 w-full max-w-md mx-4 rounded-3xl shadow-2xl border-2 overflow-hidden",
        "animate-in zoom-in-95 slide-in-from-bottom-4 duration-200",
        isError
          ? "bg-red-50 border-red-300"
          : "bg-amber-50 border-amber-300"
      )}>
        {/* Topo colorido */}
        <div className={cn(
          "px-6 pt-6 pb-4 flex items-start gap-4",
          isError ? "bg-red-100/60" : "bg-amber-100/60"
        )}>
          <div className={cn(
            "shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center shadow-md",
            isError ? "bg-red-500" : "bg-amber-500"
          )}>
            {isError
              ? <XCircle className="w-8 h-8 text-white" strokeWidth={2.5} />
              : <AlertTriangle className="w-8 h-8 text-white" strokeWidth={2.5} />
            }
          </div>
          <div className="flex-1">
            <p className={cn(
              "text-xs font-bold uppercase tracking-widest mb-1",
              isError ? "text-red-400" : "text-amber-500"
            )}>
              {isError ? '⛔ Ação Bloqueada' : '⚠️ Atenção'}
            </p>
            <h2 className={cn(
              "text-lg font-black leading-tight",
              isError ? "text-red-800" : "text-amber-900"
            )}>
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className={cn(
              "shrink-0 p-1.5 rounded-xl transition-colors mt-0.5",
              isError ? "hover:bg-red-200 text-red-400" : "hover:bg-amber-200 text-amber-500"
            )}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mensagem */}
        <div className="px-6 py-4">
          <p className={cn(
            "text-sm leading-relaxed font-medium",
            isError ? "text-red-700" : "text-amber-800"
          )}>
            {message}
          </p>
        </div>

        {/* Botão */}
        <div className="px-6 pb-6">
          <Button
            onClick={onClose}
            className={cn(
              "w-full h-11 rounded-xl font-bold text-white shadow-lg",
              isError
                ? "bg-red-500 hover:bg-red-600 shadow-red-200"
                : "bg-amber-500 hover:bg-amber-600 shadow-amber-200"
            )}
          >
            Entendi
          </Button>
        </div>
      </div>
    </div>
  );
}