import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { StatCard } from "@/components/StatCard";
import { RunAutomationForm, downloadReport } from "@/components/RunAutomationForm";
import { AnalysisResultPanel } from "@/components/AnalysisResultPanel";
import { SignalsTable } from "@/components/SignalsTable";
import { ConfidenceChart } from "@/components/ConfidenceChart";
import { useCodeAnalyses } from "@/hooks/use-automation";
import { Activity, Zap, Database, ShieldCheck, Lock, AlertTriangle, AlertOctagon, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { CodeAnalysisResult } from "@shared/routes";

type RiskLevel = "SAFE" | "NEEDS_REVIEW" | "RISKY" | "CRITICAL";

function computeHealthScore(counts: Record<RiskLevel, number>): number | null {
  const total = counts.SAFE + counts.NEEDS_REVIEW + counts.RISKY + counts.CRITICAL;
  if (total === 0) return null;
  const weighted = counts.SAFE * 100 + counts.NEEDS_REVIEW * 65 + counts.RISKY * 35 + counts.CRITICAL * 10;
  return Math.round(weighted / total);
}

function healthColor(score: number) {
  if (score >= 80) return { text: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" };
  if (score >= 60) return { text: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" };
  if (score >= 40) return { text: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" };
  return { text: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20" };
}

function healthCallout(score: number, counts: Record<RiskLevel, number>): string {
  const total = counts.SAFE + counts.NEEDS_REVIEW + counts.RISKY + counts.CRITICAL;
  if (counts.CRITICAL > 0) return `${counts.CRITICAL} critical issue${counts.CRITICAL > 1 ? "s" : ""} need immediate attention. Click Critical to triage.`;
  if (counts.RISKY > 0) return `${counts.RISKY} risky analysis${counts.RISKY > 1 ? "es" : ""} flagged. Click Risky to review.`;
  if (counts.NEEDS_REVIEW > 0) return `${counts.NEEDS_REVIEW} analysis${counts.NEEDS_REVIEW > 1 ? "es" : ""} need review. Click Needs Review to inspect.`;
  if (score === 100) return "All analyses passed. Your code looks clean.";
  return `${total} total ${total === 1 ? "analysis" : "analyses"} run.`;
}

export default function Dashboard() {
  const { data: analyses } = useCodeAnalyses();
  const [paidSessionId, setPaidSessionId] = useState<string | null>(null);
  const [riskFilter, setRiskFilter] = useState<RiskLevel | null>(null);
  const [analysisData, setAnalysisData] = useState<{ result: CodeAnalysisResult; code: string } | null>({
    code: "async function chargeAndOrder(userId, cartItems) {\n  const total = cartItems.reduce((s, i) => s + i.price, 0);\n  await stripe.charges.create({ amount: total, customer: user.stripeCustomerId });\n  await db.orders.create({ userId, cartItems, status: 'confirmed' });\n  await emailService.send(userId, 'order-confirmed');\n}",
    result: {
      risk_level: "CRITICAL",
      summary: "This AI-generated function charges a card and creates an order in two separate steps with no transaction safety. If the database write fails after the charge succeeds, you'll have a customer billed but no order record — with no automatic rollback or retry logic.",
      assumptions: [
        { severity: "HIGH", text: "Assumes the Stripe charge will always complete before the database write, with no handling for partial failures between the two operations." },
        { severity: "HIGH", text: "Assumes `user.stripeCustomerId` always exists — if the user has no saved Stripe customer, this silently passes `undefined` to Stripe." },
        { severity: "MEDIUM", text: "Assumes `total` is already in the correct currency's smallest unit (cents for USD). If `item.price` is in dollars, the charge will be 100× too small." },
        { severity: "LOW", text: "Assumes `emailService.send` failures are non-critical and can be ignored without alerting the caller." },
      ],
      risks: [
        { severity: "HIGH", text: "No try/catch: any uncaught exception leaves the user charged but without an order, with no compensation or rollback path." },
        { severity: "HIGH", text: "Race condition: two simultaneous calls for the same cart could create duplicate charges before either order is committed." },
        { severity: "MEDIUM", text: "No idempotency key on the Stripe charge — retrying on a network timeout will create a second charge." },
        { severity: "LOW", text: "Order confirmation email is sent synchronously; a slow email provider will block the entire request." },
      ],
      checks: [
        "Verify `item.price` units — confirm they are already in cents, not dollars",
        "Confirm all users have a `stripeCustomerId` before this function is reachable",
        "Add a Stripe idempotency key tied to `userId + cartItems` hash",
        "Wrap the charge + order creation in a try/catch with a Stripe refund in the catch block",
      ],
      suggestions: [
        { problem: "No atomic transaction between charge and order creation", why_it_matters: "A server crash between the two steps will bill the customer without creating an order, requiring manual reconciliation.", fix: "Use a database transaction and only confirm the Stripe charge after the order row is committed." },
        { problem: "Missing Stripe idempotency key", why_it_matters: "Network retries on a timeout will create duplicate real charges on the customer's card.", fix: "Add `idempotencyKey: `order-${userId}-${cartHash}`` to every `stripe.charges.create` call." },
        { problem: "No input validation", why_it_matters: "Malformed cartItems or a missing userId will cause a silent failure or corrupt data.", fix: "Validate all inputs with a schema check before calling Stripe or the database." },
        { problem: "Unsafe payment amount assumption", why_it_matters: "If prices are stored in dollars but Stripe expects cents, every charge will be 100× too small.", fix: "Explicitly convert to cents: `Math.round(item.price * 100)`." },
        { problem: "No idempotency protection", why_it_matters: "Concurrent requests can result in duplicate charges.", fix: "Use a distributed lock or database-level unique constraint on the order before charging." },
        { problem: "Lack of transactional consistency", why_it_matters: "Partial writes leave the system in an inconsistent state with no recovery path.", fix: "Wrap the DB write in a transaction and only capture the charge on success." },
      ],
      tier: "max",
      gated: false,
    }
  });

  useEffect(() => {
    const saved = localStorage.getItem("stripe_session_id");
    if (saved) setPaidSessionId(saved);
  }, []);

  const hasAnalyses = analyses && analyses.length > 0;

  const riskCounts: Record<RiskLevel, number> = {
    SAFE: analyses?.filter(a => a.riskLevel === "SAFE").length ?? 0,
    NEEDS_REVIEW: analyses?.filter(a => a.riskLevel === "NEEDS_REVIEW").length ?? 0,
    RISKY: analyses?.filter(a => a.riskLevel === "RISKY").length ?? 0,
    CRITICAL: analyses?.filter(a => a.riskLevel === "CRITICAL").length ?? 0,
  };

  const healthScore = hasAnalyses ? computeHealthScore(riskCounts) : null;
  const hColor = healthScore !== null ? healthColor(healthScore) : null;

  const toggleFilter = (level: RiskLevel) => {
    setRiskFilter(prev => prev === level ? null : level);
  };

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/20">
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none z-0 mix-blend-overlay"></div>
      <div className="fixed top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="fixed bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none z-0"></div>

      <Header />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-8"
        >
          <div>
            <h1 className="text-3xl font-bold tracking-tight">ASOF finds the hidden assumptions in AI-generated code before you trust it.</h1>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              Paste your code and get back: what the AI assumed, what could break, what to verify, and whether it's safe to run — before you ship it.
            </p>
          </div>

          {/* Code Health Score — Task #13 */}
          <AnimatePresence>
            {healthScore !== null && hColor && (
              <motion.div
                key="health"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`flex items-center gap-4 rounded-2xl border p-4 backdrop-blur-md ${hColor.bg}`}
              >
                <div className={`text-4xl font-black tabular-nums ${hColor.text}`} data-testid="stat-health-score">
                  {healthScore}%
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold ${hColor.text}`}>Code Health Score</p>
                  <p className="text-xs text-white/60 mt-0.5">{healthCallout(healthScore, riskCounts)}</p>
                </div>
                <div className="w-32 h-2 rounded-full bg-white/10 overflow-hidden shrink-0">
                  <motion.div
                    className={`h-full rounded-full ${healthScore >= 80 ? 'bg-emerald-500' : healthScore >= 60 ? 'bg-amber-500' : healthScore >= 40 ? 'bg-orange-500' : 'bg-rose-500'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${healthScore}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Execution Status */}
          <div className="flex justify-between items-center bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-primary/20 rounded-xl">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider">Execution Status</h2>
                <p className="text-xs text-muted-foreground font-mono">
                  {paidSessionId ? "READY TO EXECUTE" : "LOCKED - PAYMENT REQUIRED"}
                </p>
              </div>
            </div>
            {paidSessionId ? (
              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/20 text-xs font-bold">
                <ShieldCheck className="w-3 h-3" />
                VERIFIED
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 text-amber-500 rounded-full border border-amber-500/20 text-xs font-bold">
                <Lock className="w-3 h-3" />
                LOCKED
              </div>
            )}
          </div>

          {/* Risk-level stat cards — clickable for Task #14 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div variants={item}>
              <StatCard
                title="Safe"
                value={riskCounts.SAFE}
                icon={<ShieldCheck className="w-5 h-5" />}
                accentColor="emerald"
                trend={riskCounts.SAFE > 0 ? "No issues found" : "No analyses yet"}
                trendUp={riskCounts.SAFE > 0}
                onClick={() => toggleFilter("SAFE")}
                isActive={riskFilter === "SAFE"}
              />
            </motion.div>
            <motion.div variants={item}>
              <StatCard
                title="Needs Review"
                value={riskCounts.NEEDS_REVIEW}
                icon={<Activity className="w-5 h-5" />}
                accentColor="amber"
                trend={riskCounts.NEEDS_REVIEW > 0 ? "Attention needed" : "All clear"}
                trendUp={riskCounts.NEEDS_REVIEW === 0}
                onClick={() => toggleFilter("NEEDS_REVIEW")}
                isActive={riskFilter === "NEEDS_REVIEW"}
              />
            </motion.div>
            <motion.div variants={item}>
              <StatCard
                title="Risky"
                value={riskCounts.RISKY}
                icon={<AlertTriangle className="w-5 h-5" />}
                accentColor="orange"
                trend={riskCounts.RISKY > 0 ? "Action required" : "All clear"}
                trendUp={riskCounts.RISKY === 0}
                onClick={() => toggleFilter("RISKY")}
                isActive={riskFilter === "RISKY"}
              />
            </motion.div>
            <motion.div variants={item}>
              <StatCard
                title="Critical"
                value={riskCounts.CRITICAL}
                icon={<AlertOctagon className="w-5 h-5" />}
                accentColor="rose"
                trend={riskCounts.CRITICAL > 0 ? "Immediate action" : "All clear"}
                trendUp={riskCounts.CRITICAL === 0}
                onClick={() => toggleFilter("CRITICAL")}
                isActive={riskFilter === "CRITICAL"}
              />
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <motion.div variants={item} className="lg:col-span-1">
              <RunAutomationForm onResult={(result, code) => setAnalysisData({ result, code })} />
            </motion.div>

            <motion.div variants={item} className="lg:col-span-2 flex flex-col gap-6">
              <div className="h-[240px] glass-card rounded-2xl p-6 border border-white/5 relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    Confidence Trends
                  </h3>
                </div>
                <div className="h-[160px] w-full">
                  <ConfidenceChart />
                </div>
              </div>

              <div className="glass-card rounded-2xl p-6 border border-white/5 overflow-hidden flex flex-col min-h-[220px]">
                <div className="flex items-center justify-between mb-4 shrink-0">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Database className="w-4 h-4 text-primary" />
                    Recent Analyses
                    {riskFilter && (
                      <span className="ml-2 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-white/70 border border-white/15">
                        {riskFilter.replace("_", " ")}
                      </span>
                    )}
                  </h3>
                  {riskFilter && (
                    <button
                      data-testid="button-clear-filter"
                      onClick={() => setRiskFilter(null)}
                      className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
                    >
                      <X className="w-3 h-3" />
                      Clear filter
                    </button>
                  )}
                </div>
                <div className="overflow-auto pr-2 custom-scrollbar max-h-[320px]">
                  <SignalsTable riskFilter={riskFilter} />
                </div>
              </div>

              {/* ── Analysis Result Panel sits in the right column, filling the space beside the form ── */}
              <AnimatePresence>
                {analysisData && (
                  <motion.div
                    key="analysis-panel"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.3 }}
                  >
                    <AnalysisResultPanel
                      result={analysisData.result}
                      originalCode={analysisData.code}
                      onDismiss={() => setAnalysisData(null)}
                      onDownloadPDF={() => void downloadReport(analysisData.result, analysisData.code)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

            </motion.div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
