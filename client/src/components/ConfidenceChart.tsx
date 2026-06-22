import { useAnalysesTrend, useSignals } from "@/hooks/use-automation";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { format, isSameDay } from "date-fns";

function insightToScore(insight: string): number {
  const u = insight.toUpperCase();
  if (u.includes("VALID") && !u.includes("INVALID")) return 95;
  if (u.includes("CONFLICTED") || u.includes("STALE")) return 35;
  if (u.includes("INVALID")) return 10;
  if (u.includes("UNKNOWN")) return 65;
  return 50;
}

function insightToRisk(insight: string): string {
  const u = insight.toUpperCase();
  if (u.includes("VALID") && !u.includes("INVALID")) return "SAFE";
  if (u.includes("CONFLICTED") || u.includes("STALE")) return "RISKY";
  if (u.includes("INVALID")) return "CRITICAL";
  if (u.includes("UNKNOWN")) return "NEEDS_REVIEW";
  return "NEEDS_REVIEW";
}

function riskToScore(riskLevel: string): number {
  switch (riskLevel) {
    case "SAFE": return 95;
    case "NEEDS_REVIEW": return 65;
    case "RISKY": return 35;
    case "CRITICAL": return 10;
    default: return 50;
  }
}

function riskColor(score: number): string {
  if (score > 80) return "hsl(142, 76%, 36%)";
  if (score > 50) return "hsl(38, 92%, 50%)";
  if (score > 30) return "hsl(25, 95%, 53%)";
  return "hsl(0, 72%, 51%)";
}

export function ConfidenceChart() {
  const { data: trend } = useAnalysesTrend();
  const { data: signals } = useSignals();

  const fromAnalyses = (trend ?? []).map(a => ({
    time: new Date(a.timestamp).getTime(),
    score: riskToScore(a.riskLevel ?? "NEEDS_REVIEW"),
    riskLevel: a.riskLevel ?? "NEEDS_REVIEW",
    summary: a.riskLevel ?? "NEEDS_REVIEW",
  }));

  const fromSignals = (signals ?? []).map(s => ({
    time: new Date(s.timestamp!).getTime(),
    score: insightToScore(s.insight),
    riskLevel: insightToRisk(s.insight),
    summary: s.insight,
  }));

  const chartData = [...fromAnalyses, ...fromSignals]
    .sort((a, b) => a.time - b.time)
    .slice(-40);

  const spansMultipleDays = chartData.length >= 2 &&
    !isSameDay(new Date(chartData[0].time), new Date(chartData[chartData.length - 1].time));

  if (chartData.length < 2) {
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
            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis
            dataKey="time"
            tickFormatter={(time) =>
              spansMultipleDays
                ? format(time, "MMM d")
                : format(time, "HH:mm")
            }
            stroke="rgba(255,255,255,0.2)"
            tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis hide domain={[0, 100]} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const score = payload[0].value as number;
                return (
                  <div className="bg-secondary border border-white/10 p-3 rounded-lg shadow-xl backdrop-blur-md">
                    <p className="text-xs text-muted-foreground mb-1">
                      {format(label, "MMM dd yyyy, HH:mm")}
                    </p>
                    <p className="font-bold" style={{ color: riskColor(score) }}>
                      {(payload[0].payload as any).riskLevel} — {score}%
                    </p>
                    <p className="text-xs text-white/70 mt-1 max-w-[200px] truncate">
                      {(payload[0].payload as any).summary}
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Area
            type="monotone"
            dataKey="score"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorScore)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
