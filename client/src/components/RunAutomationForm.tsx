import { useState, useEffect } from "react";
import { useRunAutomation } from "@/hooks/use-automation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Play, CheckCircle2, Lock, DollarSign, Zap, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

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
  const [paidSessionId, setPaidSessionId] = useState<string | null>(null);
  const { toast } = useToast();
  
  const { mutate: runAutomation, isPending: isRunning, data } = useRunAutomation();

  useEffect(() => {
    const saved = localStorage.getItem("stripe_session_id");
    if (saved) setPaidSessionId(saved);
  }, []);

  const initiatePayment = async (tier: 'lite' | 'pro' | 'max') => {
    try {
      const res = await fetch(api.payments.create.path, { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier })
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to initiate payment");
      }
      const { url } = await res.json();
      window.location.href = url;
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Payment initialization failed",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paidSessionId) return;
    setJsonError(null);

    try {
      const parsedPayload = JSON.parse(payload);
      runAutomation({ 
        agent_id: agentId, 
        payload: parsedPayload,
        sessionId: paidSessionId 
      });
      localStorage.removeItem("stripe_session_id");
      setPaidSessionId(null);
      queryClient.invalidateQueries({ queryKey: [api.automation.list.path] });
    } catch (err) {
      setJsonError("Invalid JSON format");
    }
  };

  const isLocked = !paidSessionId;

  const tiers = [
    {
      id: 'lite',
      name: 'ASOF Lite',
      price: '$0.50',
      description: 'Single checks',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
      color: 'emerald'
    },
    {
      id: 'pro',
      name: 'ASOF Pro',
      price: '$1.00',
      description: 'High-risk decisions',
      icon: <Zap className="w-4 h-4 text-blue-400" />,
      color: 'blue'
    },
    {
      id: 'max',
      name: 'ASOF Max',
      price: '$2.50',
      description: 'Mission-critical',
      icon: <ShieldCheck className="w-4 h-4 text-purple-400" />,
      color: 'purple'
    }
  ] as const;

  return (
    <Card className="glass-card border-white/5 overflow-hidden h-full flex flex-col relative">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-purple-500 to-pink-500" />
      
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <Play className="w-5 h-5 text-primary" />
            Run Automation
          </div>
          {isLocked && (
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-tighter bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded border border-amber-500/20">
              <Lock className="w-3 h-3" />
              Locked
            </div>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col gap-4">
        {isLocked ? (
          <div className="space-y-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Select Pricing Tier</p>
            <div className="grid grid-cols-1 gap-2">
              {tiers.map((tier) => (
                <button
                  key={tier.id}
                  onClick={() => initiatePayment(tier.id)}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-left w-full group"
                >
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded bg-${tier.color}-500/10`}>
                      {tier.icon}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white leading-none">{tier.name}</h4>
                      <p className="text-[9px] text-muted-foreground mt-1">{tier.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-white">{tier.price}</span>
                  </div>
                </button>
              ))}
            </div>
            
            <div className="mt-4 glass-card rounded-lg overflow-hidden border border-white/5 bg-black/20">
              <table className="w-full text-[8px] text-left leading-tight">
                <thead className="uppercase tracking-wider text-muted-foreground bg-white/5">
                  <tr>
                    <th className="px-2 py-1">Feature</th>
                    <th className="px-1 py-1 text-center">L</th>
                    <th className="px-1 py-1 text-center">P</th>
                    <th className="px-1 py-1 text-center">M</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <tr>
                    <td className="px-2 py-1 text-muted-foreground">Verdict/Score</td>
                    <td className="px-1 py-1 text-center">✅</td>
                    <td className="px-1 py-1 text-center">✅</td>
                    <td className="px-1 py-1 text-center">✅</td>
                  </tr>
                  <tr>
                    <td className="px-2 py-1 text-muted-foreground">Evidence/Risk</td>
                    <td className="px-1 py-1 text-center">❌</td>
                    <td className="px-1 py-1 text-center">✅</td>
                    <td className="px-1 py-1 text-center">✅</td>
                  </tr>
                  <tr>
                    <td className="px-2 py-1 text-muted-foreground">Conflict/Pri</td>
                    <td className="px-1 py-1 text-center">❌</td>
                    <td className="px-1 py-1 text-center">❌</td>
                    <td className="px-1 py-1 text-center">✅</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 flex-1 flex flex-col">
            <div className="space-y-1">
              <Label htmlFor="agentId" className="text-[10px] font-medium uppercase text-muted-foreground tracking-wider">
                Agent Identity
              </Label>
              <Input
                id="agentId"
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                className="glass-input font-mono h-8 text-xs"
                placeholder="e.g. agent-alpha-01"
                required
              />
            </div>

            <div className="space-y-1 flex-1 flex flex-col">
              <div className="flex items-center justify-between">
                <Label htmlFor="payload" className="text-[10px] font-medium uppercase text-muted-foreground tracking-wider">
                  Operation Payload (JSON)
                </Label>
                {jsonError && (
                  <span className="text-[9px] text-rose-400 font-medium animate-pulse">
                    {jsonError}
                  </span>
                )}
              </div>
              <Textarea
                id="payload"
                value={payload}
                onChange={(e) => setPayload(e.target.value)}
                className="glass-input font-mono text-[10px] flex-1 min-h-[150px] resize-none leading-relaxed"
                spellCheck={false}
              />
            </div>

            <Button 
              type="submit" 
              disabled={isRunning}
              className="w-full h-10 text-sm font-semibold bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300"
            >
              {isRunning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4 fill-current" />
                  Execute Sequence
                </>
              )}
            </Button>
          </form>
        )}

        <AnimatePresence>
          {data && data.success && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 overflow-hidden mt-2"
            >
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-emerald-400 mb-0.5">Successful</h4>
                  <p className="text-[10px] text-emerald-100/70 mb-1 leading-tight">
                    {data.data.insight}
                  </p>
                  {data.data.explanation && (
                    <p className="text-[9px] text-emerald-100/50 italic mb-1 leading-tight">
                      "{data.data.explanation}"
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-[9px] font-mono text-emerald-400/60">
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
