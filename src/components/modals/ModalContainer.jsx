import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export default function ModalContainer({ 
  open, 
  onClose, 
  title, 
  description,
  children,
  size = "default"
}) {
  
  // Mapa expandido de tamanhos para classes do Tailwind
  const sizeClasses = {
    sm: "sm:max-w-sm",
    md: "sm:max-w-md",
    default: "sm:max-w-lg", // ~512px
    lg: "sm:max-w-xl",      // ~576px
    xl: "sm:max-w-2xl",     // ~672px
    "2xl": "sm:max-w-3xl",  // ~768px
    "3xl": "sm:max-w-4xl",  // ~896px
    "4xl": "sm:max-w-5xl",  // ~1024px
    "5xl": "sm:max-w-6xl",  // ~1152px (Perfeito para o seu Form)
    "6xl": "sm:max-w-7xl",  // ~1280px
    "7xl": "min-w-[90vw]",  // Muito largo
    full: "min-w-[98vw] h-[98vh] rounded-none border-none" // Tela cheia
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className={cn(
          "p-0 gap-0 flex flex-col max-h-[90vh]", // Flex column + Altura máxima para scroll funcionar
          sizeClasses[size] || sizeClasses.default
        )} 
        style={{ scrollbarWidth: 'none' }} // Esconde scrollbar do container principal
      >
        <DialogHeader className="px-6 py-4 border-b bg-white rounded-t-lg z-10 shrink-0">
          <DialogTitle className="text-xl font-bold text-slate-800">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-slate-500 mt-1">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        
        <div 
          className="overflow-y-auto flex-1 px-6 py-6" 
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}
        >
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}