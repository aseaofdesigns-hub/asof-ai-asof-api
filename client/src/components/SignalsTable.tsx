import { useCodeAnalyses, useSignals } from "@/hooks/use-automation";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle } from "lucide-react";

const RISK_CONFIG = {
  SAFE: { label: "SAFE", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  NEEDS_REVIEW: { label: "NEEDS REVIEW", className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  RISKY: { label: "RISKY", className: "bg-orange-500/15 text-orange-400 border-amber-500/30" },
  CRITICAL: { label: "CRITICAL", className: "bg-rose-500/15 text-rose-400 border-rose-500/30" },
} as const;

function riskToScore(riskLevel: string): number {
  switch (riskLevel) {
    case "SAFE": return 0.95;
    case "NEEDS_REVIEW": return 0.65;
    case "RISKY": return 0.35;
    case "CRITICAL": return 0.10;
    default: return 0.50;
  }
}

function confidenceToRisk(confidence: number): string {
  if (confidence >= 0.85) return "SAFE";
  if (confidence >= 0.65) return "NEEDS_REVIEW";
  if (confidence >= 0.4) return "RISKY";
  return "CRITICAL";
}

export function SignalsTable() {
  const { data: analyses, isLoading: analysesLoading } = useCodeAnalyses();
  const { data: signals, isLoading: signalsLoading } = useSignals();

  const isLoading = analysesLoading || signalsLoading;

  if (isLoading) {
    return (
      <div className="h-[400px] flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasAnalyses = analyses && analyses.length > 0;
  const hasSignals = signals && signals.length > 0;

  if (!hasAnalyses && !hasSignals) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground gap-4">
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
          <ActivityIcon className="w-8 h-8 opacity-50" />
        </div>
        <p>No analyses yet — run your first analysis above</p>
      </div>
    );
  }

  if (hasAnalyses) {
    return (
      <div className="rounded-xl border border-white/10 overflow-hidden bg-secondary/20">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead className="w-[160px] text-xs font-bold uppercase tracking-wider text-muted-foreground">Timestamp</TableHead>
              <TableHead className="w-[130px] text-xs font-bold uppercase tracking-wider text-muted-foreground">Risk Level</TableHead>
              <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Summary</TableHead>
              <TableHead className="w-[80px] text-xs font-bold uppercase tracking-wider text-muted-foreground">Tier</TableHead>
              <TableHead className="w-[100px] text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {analyses!.map((analysis) => {
              const config = RISK_CONFIG[analysis.riskLevel as keyof typeof RISK_CONFIG] ?? RISK_CONFIG.NEEDS_REVIEW;
              const score = riskToScore(analysis.riskLevel);
              return (
                <TableRow key={analysis.id} className="border-white/5 hover:bg-white/5 transition-colors" data-testid={`row-analysis-${analysis.id}`}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {analysis.timestamp ? format(new Date(analysis.timestamp), "MMM dd, HH:mm:ss") : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs font-bold ${config.className}`} data-testid={`badge-risk-${analysis.id}`}>
                      {config.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-300 text-sm max-w-0">
                    <p className="truncate" title={analysis.summary}>{analysis.summary}</p>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground font-mono uppercase">{analysis.tier}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-12 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${score > 0.8 ? 'bg-emerald-500' : score > 0.5 ? 'bg-amber-500' : score > 0.3 ? 'bg-orange-500' : 'bg-rose-500'}`}
                          style={{ width: `${score * 100}%` }}
                        />
                      </div>
                      <span className={`text-xs font-mono font-bold ${score > 0.8 ? 'text-emerald-400' : score > 0.5 ? 'text-amber-400' : score > 0.3 ? 'text-orange-400' : 'text-rose-400'}`}>
                        {(score * 100).toFixed(0)}%
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 overflow-hidden bg-secondary/20">
      <Table>
        <TableHeader className="bg-white/5">
          <TableRow className="border-white/5 hover:bg-transparent">
            <TableHead className="w-[160px] text-xs font-bold uppercase tracking-wider text-muted-foreground">Timestamp</TableHead>
            <TableHead className="w-[130px] text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</TableHead>
            <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Insight</TableHead>
            <TableHead className="w-[100px] text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">Confidence</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {signals!.map((signal) => {
            const riskLevel = confidenceToRisk(signal.confidence);
            const config = RISK_CONFIG[riskLevel as keyof typeof RISK_CONFIG] ?? RISK_CONFIG.NEEDS_REVIEW;
            return (
              <TableRow key={signal.id} className="border-white/5 hover:bg-white/5 transition-colors" data-testid={`row-signal-${signal.id}`}>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {signal.timestamp ? format(new Date(signal.timestamp), "MMM dd, HH:mm:ss") : "-"}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-xs font-bold ${config.className}`}>
                    {config.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-gray-300 text-sm max-w-0">
                  <p className="truncate" title={signal.insight}>{signal.insight}</p>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-12 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${signal.confidence > 0.8 ? 'bg-emerald-500' : signal.confidence > 0.5 ? 'bg-amber-500' : signal.confidence > 0.3 ? 'bg-orange-500' : 'bg-rose-500'}`}
                        style={{ width: `${signal.confidence * 100}%` }}
                      />
                    </div>
                    <span className={`text-xs font-mono font-bold ${signal.confidence > 0.8 ? 'text-emerald-400' : signal.confidence > 0.5 ? 'text-amber-400' : signal.confidence > 0.3 ? 'text-orange-400' : 'text-rose-400'}`}>
                      {(signal.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function ActivityIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
