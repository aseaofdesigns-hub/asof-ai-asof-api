import { useSignals } from "@/hooks/use-automation";
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

export function SignalsTable() {
  const { data: signals, isLoading, error } = useSignals();

  if (isLoading) {
    return (
      <div className="h-[400px] flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center text-rose-400 gap-2">
        <AlertCircle className="w-8 h-8" />
        <p>Failed to load signals history</p>
      </div>
    );
  }

  if (!signals || signals.length === 0) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground gap-4">
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
          <ActivityIcon className="w-8 h-8 opacity-50" />
        </div>
        <p>No automation signals recorded yet</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 overflow-hidden bg-secondary/20">
      <Table>
        <TableHeader className="bg-white/5">
          <TableRow className="border-white/5 hover:bg-transparent">
            <TableHead className="w-[180px] text-xs font-bold uppercase tracking-wider text-muted-foreground">Timestamp</TableHead>
            <TableHead className="w-[150px] text-xs font-bold uppercase tracking-wider text-muted-foreground">Agent ID</TableHead>
            <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Insight Generated</TableHead>
            <TableHead className="w-[100px] text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">Confidence</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {signals.map((signal) => (
            <TableRow key={signal.id} className="border-white/5 hover:bg-white/5 transition-colors">
              <TableCell className="font-mono text-xs text-muted-foreground">
                {signal.timestamp ? format(new Date(signal.timestamp), "MMM dd, HH:mm:ss") : "-"}
              </TableCell>
              <TableCell className="font-medium text-white">
                <Badge variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
                  {signal.agentId}
                </Badge>
              </TableCell>
              <TableCell className="text-gray-300">
                {signal.insight}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        signal.confidence > 0.8 ? 'bg-emerald-500' : 
                        signal.confidence > 0.5 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${signal.confidence * 100}%` }}
                    />
                  </div>
                  <span className={`text-xs font-mono font-bold ${
                    signal.confidence > 0.8 ? 'text-emerald-400' : 
                    signal.confidence > 0.5 ? 'text-amber-400' : 'text-rose-400'
                  }`}>
                    {(signal.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ActivityIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className}
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
