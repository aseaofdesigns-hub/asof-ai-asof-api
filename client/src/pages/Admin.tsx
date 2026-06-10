import { useState } from "react";
import { motion } from "framer-motion";
import { Search, CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LookupResult = {
  payment: {
    id: number;
    stripeSessionId: string;
    status: string;
    amount: number;
    tier: string;
    consumed: boolean;
    customerEmail: string | null;
    createdAt: string;
  };
  analysis: {
    id: number;
    tier: string;
    riskLevel: string;
    summary: string;
    timestamp: string;
    codeSnippet: string;
  } | null;
};

export default function Admin() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setAuthError("");
    const res = await fetch("/api/admin/lookup?sessionId=test", {
      headers: { "x-admin-password": password },
    });
    if (res.status === 401) {
      setAuthError("Incorrect password.");
    } else {
      setAuthed(true);
    }
  }

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!sessionId.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`/api/admin/lookup?sessionId=${encodeURIComponent(sessionId.trim())}`, {
        headers: { "x-admin-password": password },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Lookup failed.");
      } else {
        setResult(data);
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  const tierColor: Record<string, string> = {
    lite: "text-emerald-400",
    pro: "text-blue-400",
    max: "text-purple-400",
  };

  const riskColor: Record<string, string> = {
    low: "text-emerald-400",
    medium: "text-amber-400",
    high: "text-red-400",
    critical: "text-red-500",
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-xl"
      >
        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-widest text-white/30 mb-1">ASOF.ai</p>
          <h1 className="text-2xl font-bold text-white">Support Lookup</h1>
          <p className="text-sm text-white/40 mt-1">Internal use only</p>
        </div>

        {!authed ? (
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-white/60 text-xs">Admin password</Label>
              <Input
                data-testid="input-admin-password"
                type="password"
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/20"
              />
            </div>
            {authError && (
              <p className="text-red-400 text-xs flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5" /> {authError}
              </p>
            )}
            <Button
              data-testid="button-admin-login"
              type="submit"
              className="w-full bg-white/10 hover:bg-white/15 text-white border border-white/10"
            >
              Unlock
            </Button>
          </form>
        ) : (
          <div className="space-y-6">
            <form onSubmit={handleLookup} className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-white/60 text-xs">Stripe session ID</Label>
                <div className="flex gap-2">
                  <Input
                    data-testid="input-session-id"
                    placeholder="cs_live_..."
                    value={sessionId}
                    onChange={(e) => setSessionId(e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/20 font-mono text-sm"
                  />
                  <Button
                    data-testid="button-lookup"
                    type="submit"
                    disabled={loading || !sessionId.trim()}
                    className="bg-white/10 hover:bg-white/15 text-white border border-white/10 shrink-0"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </form>

            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p data-testid="text-error" className="text-sm text-red-300">{error}</p>
              </div>
            )}

            {result && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="rounded-2xl border border-white/8 bg-white/3 p-5 space-y-3">
                  <p className="text-xs uppercase tracking-widest text-white/30 mb-3">Payment</p>
                  <Row label="Session ID" value={<span className="font-mono text-xs break-all text-white/70">{result.payment.stripeSessionId}</span>} />
                  <Row label="Status" value={
                    <span className={result.payment.status === "paid" ? "text-emerald-400" : "text-amber-400"}>
                      {result.payment.status.toUpperCase()}
                    </span>
                  } />
                  <Row label="Tier" value={<span className={tierColor[result.payment.tier] ?? "text-white"}>{result.payment.tier.toUpperCase()}</span>} />
                  <Row label="Amount" value={<span className="text-white">${(result.payment.amount / 100).toFixed(2)}</span>} />
                  <Row label="Email" value={<span className="text-white/70">{result.payment.customerEmail ?? "—"}</span>} />
                  <Row label="Purchased" value={<span className="text-white/50 text-xs">{new Date(result.payment.createdAt).toLocaleString()}</span>} />
                </div>

                <div className="rounded-2xl border border-white/8 bg-white/3 p-5 space-y-3">
                  <p className="text-xs uppercase tracking-widest text-white/30 mb-3">Analysis</p>
                  {result.analysis ? (
                    <>
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span data-testid="status-analysis-used" className="text-emerald-400 text-sm font-medium">Credit was used</span>
                      </div>
                      <Row label="Risk level" value={<span className={riskColor[result.analysis.riskLevel] ?? "text-white"}>{result.analysis.riskLevel.toUpperCase()}</span>} />
                      <Row label="Tier" value={<span className={tierColor[result.analysis.tier] ?? "text-white"}>{result.analysis.tier.toUpperCase()}</span>} />
                      <Row label="Run at" value={<span className="text-white/50 text-xs">{new Date(result.analysis.timestamp).toLocaleString()}</span>} />
                      <div className="pt-2">
                        <p className="text-xs text-white/30 mb-1">Summary</p>
                        <p data-testid="text-analysis-summary" className="text-xs text-white/60 leading-relaxed">{result.analysis.summary}</p>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-amber-400" />
                      <span data-testid="status-analysis-unused" className="text-amber-400 text-sm font-medium">Credit not yet used — safe to restore</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
