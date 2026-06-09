import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: string;
  trendUp?: boolean;
  className?: string;
  accentColor?: "primary" | "emerald" | "amber" | "orange" | "rose";
}

const accentMap = {
  primary: {
    iconBg: "bg-primary/10 text-primary",
    bar: "from-primary/50",
  },
  emerald: {
    iconBg: "bg-emerald-500/10 text-emerald-400",
    bar: "from-emerald-500/50",
  },
  amber: {
    iconBg: "bg-amber-500/10 text-amber-400",
    bar: "from-amber-500/50",
  },
  orange: {
    iconBg: "bg-orange-500/10 text-orange-400",
    bar: "from-orange-500/50",
  },
  rose: {
    iconBg: "bg-rose-500/10 text-rose-400",
    bar: "from-rose-500/50",
  },
};

export function StatCard({ title, value, icon, trend, trendUp, className, accentColor = "primary" }: StatCardProps) {
  const accent = accentMap[accentColor];

  return (
    <div className={cn("glass-card rounded-2xl p-6 relative overflow-hidden group", className)}>
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity duration-500 transform group-hover:scale-110">
        {icon}
      </div>
      
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-2">
          <div className={cn("p-2 rounded-lg", accent.iconBg)}>
            {icon}
          </div>
          <p className="text-sm font-medium text-muted-foreground font-display tracking-wide uppercase">
            {title}
          </p>
        </div>
        
        <div className="flex items-end gap-2">
          <h3 className="text-3xl font-bold text-white tracking-tight" data-testid={`stat-value-${title.toLowerCase().replace(/\s+/g, '-')}`}>
            {value}
          </h3>
          {trend && (
            <span className={cn(
              "text-xs font-medium mb-1 px-1.5 py-0.5 rounded",
              trendUp ? "text-emerald-400 bg-emerald-400/10" : "text-rose-400 bg-rose-400/10"
            )}>
              {trend}
            </span>
          )}
        </div>
      </div>
      
      <div className={cn("absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500", accent.bar)} />
    </div>
  );
}
