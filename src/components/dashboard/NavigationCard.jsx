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
    blue: "hover:border-blue-300 hover:bg-blue-50/50",
    green: "hover:border-emerald-300 hover:bg-emerald-50/50",
    purple: "hover:border-purple-300 hover:bg-purple-50/50",
    amber: "hover:border-amber-300 hover:bg-amber-50/50",
    red: "hover:border-red-300 hover:bg-red-50/50",
    slate: "hover:border-slate-300 hover:bg-slate-50/50"
  };

  const iconColorClasses = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-emerald-100 text-emerald-600",
    purple: "bg-purple-100 text-purple-600",
    amber: "bg-amber-100 text-amber-600",
    red: "bg-red-100 text-red-600",
    slate: "bg-slate-100 text-slate-600"
  };

  return (
    <Card 
      className={cn(
        "cursor-pointer border-2 border-transparent transition-all duration-300",
        "hover:shadow-xl hover:-translate-y-1 group",
        colorClasses[color]
      )}
      onClick={onClick}
    >
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={cn("p-3 rounded-xl", iconColorClasses[color])}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-800">{title}</h3>
                {badge && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-600 rounded-full">
                    {badge}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 mt-0.5">{description}</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-1 transition-all" />
        </div>
      </div>
    </Card>
  );
}