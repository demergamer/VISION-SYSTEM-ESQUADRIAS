import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogPortal,
  DialogOverlay,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Maximize2, 
  Minimize2, 
  Layout, 
  Smartphone, 
  X 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePortalContainer } from "@/components/providers/PortalContext";

export default function ModalContainer({ 
  open, 
  onClose, 
  title, 
  description, 
  children, 
  size = "default" // Tamanho sugerido pelo desenvolvedor (fallback)
}) {
  // Chave para salvar no navegador do usuário
  const STORAGE_KEY = "jc_modal_size_pref";

  // Estado inicial busca no localStorage ou usa o padrão
  const [currentSize, setCurrentSize] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved || size;
    }
    return size;
  });

  // Função para mudar tamanho e salvar preferência
  const handleResize = (newSize) => {
    setCurrentSize(newSize);
    localStorage.setItem(STORAGE_KEY, newSize);
  };

  // Garante que o modal abra com a preferência salva quando 'open' mudar
  useEffect(() => {
    if (open) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setCurrentSize(saved);
      }
    }
  }, [open]);

  // Mapa de tamanhos (Tailwind classes)
  const sizeClasses = {
    sm: "sm:max-w-md",       // Pequeno
    default: "sm:max-w-lg",  // Normal
    lg: "sm:max-w-2xl",      // Médio
    xl: "sm:max-w-4xl",      // Grande
    "2xl": "sm:max-w-5xl",   // Extra Grande
    "3xl": "sm:max-w-6xl",   // Super Largo (Ideal para Forms)
    "5xl": "sm:max-w-7xl",   // Ultra Largo
    full: "w-[98vw] h-[98vh] max-w-none rounded-md" // Tela Cheia
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        // [&>button]:hidden remove o 'X' padrão do Shadcn para usarmos o nosso
        className={cn(
          "p-0 gap-0 flex flex-col transition-all duration-300 ease-in-out [&>button]:hidden", 
          currentSize === 'full' ? "h-[98vh]" : "max-h-[95vh]",
          sizeClasses[currentSize] || sizeClasses.default
        )} 
        style={{ scrollbarWidth: 'none' }}
        // Impede que cliques no Select/Popover flutuante (que renderizam no body)
        // sejam interpretados como "clique fora" e derrubem o estado do modal pai
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* CABEÇALHO PERSONALIZADO */}
        <DialogHeader className="px-4 py-3 border-b bg-white/95 backdrop-blur-sm rounded-t-lg z-50 shrink-0 flex flex-row items-center justify-between sticky top-0 gap-4">
          
          {/* Título e Descrição */}
          <div className="flex-1 min-w-0">
            <DialogTitle className="text-lg font-bold text-slate-800 truncate pr-2">{title}</DialogTitle>
            {description && (
              <DialogDescription className="text-xs text-slate-500 truncate hidden sm:block">
                {description}
              </DialogDescription>
            )}
          </div>

          {/* BARRA DE FERRAMENTAS + FECHAR */}
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200 shrink-0">
            
            {/* Grupo de Redimensionamento */}
            <div className="flex items-center gap-0.5 border-r border-slate-300 pr-2 mr-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn("h-7 w-7 rounded-md hover:bg-white hover:text-blue-600 transition-all", currentSize === 'sm' && "bg-white shadow-sm text-blue-600")}
                onClick={() => handleResize('sm')}
                title="Mobile / Compacto"
              >
                <Smartphone className="w-3.5 h-3.5" />
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn("h-7 w-7 rounded-md hover:bg-white hover:text-blue-600 transition-all", (currentSize === 'default' || currentSize === 'lg') && "bg-white shadow-sm text-blue-600")}
                onClick={() => handleResize('lg')}
                title="Padrão"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn("h-7 w-7 rounded-md hover:bg-white hover:text-blue-600 transition-all", (currentSize === '3xl' || currentSize === '5xl') && "bg-white shadow-sm text-blue-600")}
                onClick={() => handleResize('3xl')}
                title="Largo (Ideal para Cadastros)"
              >
                <Layout className="w-3.5 h-3.5" />
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn("h-7 w-7 rounded-md hover:bg-white hover:text-blue-600 transition-all", currentSize === 'full' && "bg-white shadow-sm text-blue-600")}
                onClick={() => handleResize('full')}
                title="Tela Cheia"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Botão FECHAR (Separado e Destacado) */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-md hover:bg-red-100 hover:text-red-600 text-slate-500 transition-colors"
              onClick={onClose}
              title="Fechar (ESC)"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </DialogHeader>
        
        {/* CONTEÚDO */}
        <div 
          className="overflow-y-auto flex-1 px-4 py-4 sm:px-6 sm:py-6" 
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#e2e8f0 transparent' }}
        >
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}