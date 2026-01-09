import { useState } from "react";
import { useRunAutomation } from "@/hooks/use-automation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Play, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const DEFAULT_JSON = JSON.stringify({
  task: "analyze_market_sentiment",
  parameters: {
    symbol: "AAPL",
    interval: "1d",
    indicators: ["RSI", "MACD"]
  }
}, null, 2);

export function RunAutomationForm() {
  const [agentId, setAgentId] = useState("agent-001");
  const [payload, setPayload] = useState(DEFAULT_JSON);
  const [jsonError, setJsonError] = useState<string | null>(null);
  
  const { mutate, isPending, data } = useRunAutomation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setJsonError(null);

    try {
      const parsedPayload = JSON.parse(payload);
      mutate({ agent_id: agentId, payload: parsedPayload });
    } catch (err) {
      setJsonError("Invalid JSON format");
    }
  };

  return (
    <Card className="glass-card border-white/5 overflow-hidden h-full flex flex-col">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-purple-500 to-pink-500" />
      
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Play className="w-5 h-5 text-primary" />
          Run Automation
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col gap-6">
        <form onSubmit={handleSubmit} className="space-y-6 flex-1 flex flex-col">
          <div className="space-y-2">
            <Label htmlFor="agentId" className="text-xs font-medium uppercase text-muted-foreground tracking-wider">
              Agent Identity
            </Label>
            <Input
              id="agentId"
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              className="glass-input font-mono"
              placeholder="e.g. agent-alpha-01"
              required
            />
          </div>

          <div className="space-y-2 flex-1 flex flex-col">
            <div className="flex items-center justify-between">
              <Label htmlFor="payload" className="text-xs font-medium uppercase text-muted-foreground tracking-wider">
                Operation Payload (JSON)
              </Label>
              {jsonError && (
                <span className="text-xs text-rose-400 font-medium animate-pulse">
                  {jsonError}
                </span>
              )}
            </div>
            <Textarea
              id="payload"
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              className="glass-input font-mono text-xs flex-1 min-h-[200px] resize-none leading-relaxed"
              spellCheck={false}
            />
          </div>

          <Button 
            type="submit" 
            disabled={isPending}
            className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processing Signal...
              </>
            ) : (
              <>
                <Play className="mr-2 h-5 w-5 fill-current" />
                Execute Sequence
              </>
            )}
          </Button>
        </form>

        <AnimatePresence>
          {data && data.success && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 overflow-hidden"
            >
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-emerald-400 mb-1">Execution Successful</h4>
                  <p className="text-sm text-emerald-100/70 mb-2">
                    {data.data.insight}
                  </p>
                  <div className="flex items-center gap-4 text-xs font-mono text-emerald-400/60">
                    <span>Conf: {(data.data.confidence * 100).toFixed(1)}%</span>
                    <span>{new Date(data.data.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
