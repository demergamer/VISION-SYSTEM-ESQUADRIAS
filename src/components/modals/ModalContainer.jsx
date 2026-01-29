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
  const sizeClasses = {
    sm: "max-w-md",
    default: "max-w-2xl",
    lg: "max-w-4xl",
    xl: "max-w-6xl",
    full: "max-w-[95vw]"
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={cn(
        "max-h-[90vh] flex flex-col p-0",
        sizeClasses[size]
      )}>
        <DialogHeader className="p-6 pb-0 shrink-0">
          <DialogTitle className="text-xl font-bold text-slate-800">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-slate-500">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="overflow-y-auto flex-1 p-6 pt-4">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}