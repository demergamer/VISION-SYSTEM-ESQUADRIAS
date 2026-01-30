import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Maximize2, 
  Minimize2, 
  Layout, 
  Monitor, 
  Smartphone 
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function ModalContainer({ 
  open, 
  onClose, 
  title, 
  description, 
  children, 
  size = "default" // Tamanho inicial sugerido pela página pai
}) {
  // Estado para controlar o tamanho dinamicamente
  const [currentSize, setCurrentSize] = useState(size);

  // Resetar o tamanho quando o modal abre/fecha ou a prop muda
  useEffect(() => {
    if (open) {
      setCurrentSize(size);
    }
  }, [open, size]);

  // Mapa de tamanhos (Tailwind classes)
  const sizeClasses = {
    sm: "sm:max-w-md",       // Pequeno
    default: "sm:max-w-lg",  // Normal
    lg: "sm:max-w-2xl",      // Médio
    xl: "sm:max-w-4xl",      // Grande
    wide: "sm:max-w-6xl",    // Longo (Ideal para o seu form de Cliente)
    full: "w-[98vw] h-[98vh] max-w-none rounded-md" // Tela Cheia
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className={cn(
          "p-0 gap-0 flex flex-col transition-all duration-300 ease-in-out", 
          // Se for 'full', força altura total. Senão, altura automática com limite
          currentSize === 'full' ? "h-[98vh]" : "max-h-[95vh]",
          sizeClasses[currentSize] || sizeClasses.default
        )} 
        // Remove scrollbar feia do container principal
        style={{ scrollbarWidth: 'none' }} 
      >
        {/* CABEÇALHO COM CONTROLES */}
        <DialogHeader className="px-4 py-3 border-b bg-white/95 backdrop-blur-sm rounded-t-lg z-50 shrink-0 flex flex-row items-center justify-between sticky top-0">
          
          {/* Título e Descrição */}
          <div className="flex-1 mr-4">
            <DialogTitle className="text-lg font-bold text-slate-800 line-clamp-1">{title}</DialogTitle>
            {description && (
              <DialogDescription className="text-xs text-slate-500 line-clamp-1 hidden sm:block">
                {description}
              </DialogDescription>
            )}
          </div>

          {/* CONTROLES DE TAMANHO (Visíveis em Mobile e Desktop) */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
            {/* Pequeno */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn("h-6 w-6 rounded-md hover:bg-white hover:shadow-sm transition-all", currentSize === 'sm' && "bg-white shadow-sm text-blue-600")}
              onClick={() => setCurrentSize('sm')}
              title="Visualização Compacta"
            >
              <Smartphone className="w-3 h-3" />
            </Button>

            {/* Médio/Padrão */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn("h-6 w-6 rounded-md hover:bg-white hover:shadow-sm transition-all", (currentSize === 'default' || currentSize === 'lg') && "bg-white shadow-sm text-blue-600")}
              onClick={() => setCurrentSize('lg')}
              title="Visualização Padrão"
            >
              <Minimize2 className="w-3 h-3" />
            </Button>

            {/* Longo (Wide) */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn("h-6 w-6 rounded-md hover:bg-white hover:shadow-sm transition-all", (currentSize === 'wide' || currentSize === '5xl') && "bg-white shadow-sm text-blue-600")}
              onClick={() => setCurrentSize('wide')}
              title="Visualização Expandida"
            >
              <Layout className="w-3 h-3" />
            </Button>

            {/* Full Screen */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn("h-6 w-6 rounded-md hover:bg-white hover:shadow-sm transition-all", currentSize === 'full' && "bg-white shadow-sm text-blue-600")}
              onClick={() => setCurrentSize('full')}
              title="Tela Cheia"
            >
              <Maximize2 className="w-3 h-3" />
            </Button>
          </div>
        </DialogHeader>
        
        {/* CONTEÚDO COM SCROLL */}
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