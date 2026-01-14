import React from 'react';
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function StatCard({ title, value, icon: Icon, color = "blue", trend, subtitle }) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    green: "bg-emerald-50 text-emerald-600 border-emerald-100",
    red: "bg-red-50 text-red-600 border-red-100",
    yellow: "bg-amber-50 text-amber-600 border-amber-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
    slate: "bg-slate-50 text-slate-600 border-slate-100"
  };

  const iconColorClasses = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-emerald-100 text-emerald-600",
    red: "bg-red-100 text-red-600",
    yellow: "bg-amber-100 text-amber-600",
    purple: "bg-purple-100 text-purple-600",
    slate: "bg-slate-100 text-slate-600"
  };

  return (
    <Card className={cn(
      "relative overflow-hidden border transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
      colorClasses[color]
    )}>
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wider opacity-70">{title}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {subtitle && <p className="text-xs opacity-60">{subtitle}</p>}
          </div>
          {Icon && (
            <div className={cn("p-2.5 rounded-xl", iconColorClasses[color])}>
              <Icon className="w-5 h-5" />
            </div>
          )}
        </div>
        {trend && (
          <div className="mt-3 pt-3 border-t border-current/10">
            <span className="text-xs font-medium">{trend}</span>
          </div>
        )}
      </div>
    </Card>
  );
}