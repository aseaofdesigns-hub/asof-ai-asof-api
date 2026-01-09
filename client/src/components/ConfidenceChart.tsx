import { useSignals } from "@/hooks/use-automation";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { format } from "date-fns";

export function ConfidenceChart() {
  const { data: signals } = useSignals();

  // Process data for chart - sort by time and take last 20
  const chartData = signals 
    ? [...signals]
        .sort((a, b) => new Date(a.timestamp!).getTime() - new Date(b.timestamp!).getTime())
        .slice(-20)
        .map(s => ({
          time: new Date(s.timestamp!).getTime(),
          confidence: s.confidence * 100,
          insight: s.insight
        }))
    : [];

  if (!signals || signals.length < 2) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        Not enough data points for visualization
      </div>
    );
  }

  return (
    <div className="h-full w-full min-h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorConfidence" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis 
            dataKey="time" 
            tickFormatter={(time) => format(time, "HH:mm")}
            stroke="rgba(255,255,255,0.2)"
            tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            hide
            domain={[0, 100]}
          />
          <Tooltip 
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-secondary border border-white/10 p-3 rounded-lg shadow-xl backdrop-blur-md">
                    <p className="text-xs text-muted-foreground mb-1">
                      {format(label, "MMM dd, HH:mm:ss")}
                    </p>
                    <p className="font-bold text-primary">
                      Confidence: {payload[0].value}%
                    </p>
                    <p className="text-xs text-white/70 mt-1 max-w-[200px] truncate">
                      {(payload[0].payload as any).insight}
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Area 
            type="monotone" 
            dataKey="confidence" 
            stroke="hsl(var(--primary))" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorConfidence)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
