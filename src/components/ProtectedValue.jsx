import React from 'react';
import { usePermissions } from "@/components/hooks/usePermissions";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Componente para proteger dados sensíveis (Valores R$, Custos, Totais)
 * @param {string} setor - Nome do módulo (Ex: 'Produtos', 'Dashboard')
 * @param {string} acao - Permissão necessária (Ex: 'ver_custo', 'ver_total')
 * @param {any} value - O valor a ser exibido
 * @param {boolean} blur - Se true, aplica efeito de blur (embaçado). Se false, mostra cadeado.
 */
export default function ProtectedValue({ setor, acao, value, className, blur = true }) {
  const { can } = usePermissions();
  
  // Verifica se tem permissão
  const hasAccess = can(setor, acao);

  if (hasAccess) {
    return <span className={className}>{value}</span>;
  }

  // Se não tiver acesso:
  return (
    <span className={cn("inline-flex items-center gap-1 select-none text-slate-400", className)} title="Acesso Restrito">
      {blur ? (
        // Opção 1: Efeito Borrado (Parece que tem algo ali, mas ilegível)
        <span className="blur-sm bg-slate-200 rounded px-1 min-w-[30px]">
           {/* Renderiza caracteres aleatórios ocultos para manter o layout */}
           xxxx
        </span>
      ) : (
        // Opção 2: Cadeado
        <>
          <Lock className="w-3 h-3" />
          <span className="text-xs">Oculto</span>
        </>
      )}
    </span>
  );
}
