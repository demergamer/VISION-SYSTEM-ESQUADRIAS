import React from 'react';
import { Card } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function NavigationCard({ 
  title, 
  description, 
  icon: Icon, 
  onClick, 
  color = "blue",
  badge 
}) {
  const colorClasses = {
    blue: "hover:border-blue-400/50 hover:bg-blue-50/80 group-hover:shadow-blue-200/50",
    green: "hover:border-emerald-400/50 hover:bg-emerald-50/80 group-hover:shadow-emerald-200/50",
    purple: "hover:border-purple-400/50 hover:bg-purple-50/80 group-hover:shadow-purple-200/50",
    amber: "hover:border-amber-400/50 hover:bg-amber-50/80 group-hover:shadow-amber-200/50",
    red: "hover:border-red-400/50 hover:bg-red-50/80 group-hover:shadow-red-200/50",
    slate: "hover:border-slate-400/50 hover:bg-slate-50/80 group-hover:shadow-slate-200/50"
  };

  const iconColorClasses = {
    blue: "bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white",
    green: "bg-emerald-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white",
    purple: "bg-purple-100 text-purple-600 group-hover:bg-purple-600 group-hover:text-white",
    amber: "bg-amber-100 text-amber-600 group-hover:bg-amber-600 group-hover:text-white",
    red: "bg-red-100 text-red-600 group-hover:bg-red-600 group-hover:text-white",
    slate: "bg-slate-100 text-slate-600 group-hover:bg-slate-600 group-hover:text-white"
  };

  return (
    <Card 
      className={cn(
        "cursor-pointer border border-white/40 bg-white/60 backdrop-blur-md shadow-sm transition-all duration-300",
        "hover:shadow-xl hover:-translate-y-1 group relative overflow-hidden",
        colorClasses[color]
      )}
      onClick={onClick}
    >
      <div className="p-5 h-full flex flex-col justify-between">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={cn("p-3 rounded-xl transition-colors duration-300 shrink-0", iconColorClasses[color])}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-800 text-lg group-hover:text-blue-700 transition-colors">{title}</h3>
                {badge && (
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full shadow-sm animate-pulse">
                    {badge}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-600 mt-1 font-medium leading-relaxed line-clamp-2">{description}</p>
            </div>
          </div>
        </div>
        
        <div className="mt-4 flex items-center text-xs font-bold text-slate-400 group-hover:text-blue-600 transition-colors justify-end">
          Acessar <ChevronRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </Card>
  );
}