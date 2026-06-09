import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Code2, ShieldCheck, Zap, CheckCircle2, Lock, AlertTriangle, XCircle, Download, ChevronDown, ChevronUp, Sparkles, Eye } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import type { CodeAnalysisResult } from "@shared/routes";
import jsPDF from "jspdf";

const EXAMPLE_CODE = `async function chargeCardAndSaveOrder(userId, cartItems, paymentMethodId) {
  // Get user from database
  const user = await db.users.findOne({ id: userId });
  
  // Calculate total
  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  
  // Charge the card via Stripe
  const charge = await stripe.charges.create({
    amount: total,
    currency: 'usd',
    customer: user.stripeCustomerId,
    payment_method: paymentMethodId,
  });
  
  // Save order to database
  const order = await db.orders.create({
    userId,
    items: cartItems,
    total,
    chargeId: charge.id,
    status: 'paid',
  });
  
  // Send confirmation email
  await emailService.send({
    to: user.email,
    subject: 'Order confirmed!',
    body: \`Your order #\${order.id} has been placed.\`,
  });
  
  return order;
}`;

const EXAMPLE_RESULT: CodeAnalysisResult = {
  risk_level: "RISKY",
  summary:
    "This AI-generated function charges a card and creates an order in two separate steps with no transaction safety. If the database write fails after the charge succeeds, you'll have a customer billed but no order record — with no automatic rollback or retry logic.",
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
    "Test what happens when the DB write fails after a successful charge",
  ],
  suggestions: [
    {
      problem: "No atomic transaction between charge and order creation",
      why_it_matters: "A server crash between the two steps will bill the customer without creating an order, requiring manual reconciliation.",
      fix: "Use a database transaction and only confirm the Stripe charge (capture it) after the order row is committed — or store the charge ID first and mark the order as `pending_capture`.",
    },
    {
      problem: "Missing Stripe idempotency key",
      why_it_matters: "Network retries on a timeout will create duplicate real charges on the customer's card.",
      fix: "Add `idempotencyKey: \`order-\${userId}-\${cartHash}\`` to every `stripe.charges.create` call.",
    },
  ],
  tier: "max",
  gated: false,
};
function getFingerprint(): string {
  let fp = localStorage.getItem("asof_fp");
  if (!fp) {
    fp = `fp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem("asof_fp", fp);
  }
  return fp;
}

const RISK_META = {
  SAFE: { label: "Safe to Run", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30", icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" /> },
  NEEDS_REVIEW: { label: "Needs Review", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30", icon: <AlertTriangle className="w-5 h-5 text-amber-400" /> },
  RISKY: { label: "Risky", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/30", icon: <AlertTriangle className="w-5 h-5 text-orange-400" /> },
  CRITICAL: { label: "Critical Risk", color: "text-red-400", bg: "bg-red-500/10 border-red-500/30", icon: <XCircle className="w-5 h-5 text-red-400" /> },
};

const SEV_COLOR: Record<string, string> = {
  LOW: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  MEDIUM: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  HIGH: "bg-red-500/10 text-red-400 border-red-500/20",
};

function downloadReport(result: CodeAnalysisResult, code: string) {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const now = new Date();

  doc.setFillColor(10, 10, 20);
  doc.rect(0, 0, pageW, 42, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("ASOF.ai", 14, 18);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(160, 160, 180);
  doc.text("AI Code Assumption Analysis Report", 14, 28);
  doc.text(`Generated: ${now.toLocaleString()}`, 14, 36);

  let y = 54;
  const riskColors: Record<string, [number, number, number]> = {
    SAFE: [34, 197, 94],
    NEEDS_REVIEW: [251, 191, 36],
    RISKY: [249, 115, 22],
    CRITICAL: [239, 68, 68],
  };
  const rc = riskColors[result.risk_level] ?? [107, 114, 128];
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...rc);
  doc.text(`Risk Level: ${result.risk_level.replace("_", " ")}`, 14, y);
  y += 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 80);
  const sumLines = doc.splitTextToSize(result.summary, pageW - 28);
  doc.text(sumLines, 14, y);
  y += sumLines.length * 5 + 10;

  if (result.assumptions?.length) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 40);
    doc.text("What the AI Assumed", 14, y);
    y += 7;
    for (const a of result.assumptions) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 80);
      const lines = doc.splitTextToSize(`• ${a.text}`, pageW - 28);
      doc.text(lines, 16, y);
      y += lines.length * 4.5 + 2;
    }
    y += 4;
  }

  if (result.risks?.length) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 40);
    doc.text("What Could Break", 14, y);
    y += 7;
    for (const r of result.risks) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 80);
      const lines = doc.splitTextToSize(`• ${r.text}`, pageW - 28);
      doc.text(lines, 16, y);
      y += lines.length * 4.5 + 2;
    }
    y += 4;
  }

  const pageH = doc.internal.pageSize.getHeight();
  doc.setFillColor(10, 10, 20);
  doc.rect(0, pageH - 14, pageW, 14, "F");
  doc.setTextColor(120, 120, 140);
  doc.setFontSize(8);
  doc.text("ASOF.ai — asofai.com  |  Support@asofai.com", 14, pageH - 5);

  doc.save(`asof-report-${Date.now()}.pdf`);
}

export function RunAutomationForm() {
  const [code, setCode] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<CodeAnalysisResult | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [paidSessionId, setPaidSessionId] = useState<string | null>(null);
  const [freeTrialAvailable, setFreeTrialAvailable] = useState<boolean | null>(null);
  const [showSaferCode, setShowSaferCode] = useState(false);
  const [showExampleResult, setShowExampleResult] = useState(false);
  const [isExampleLoaded, setIsExampleLoaded] = useState(false);
  const { toast } = useToast();

  const loadExample = () => {
    setCode(EXAMPLE_CODE);
    setUserPrompt("Build a function that charges a user's card and saves the order to the database");
    setIsExampleLoaded(true);
    setResult(null);
    setShowExampleResult(false);
  };

  const showMockResult = () => {
    setShowExampleResult(v => !v);
  };

  useEffect(() => {
    const saved = localStorage.getItem("stripe_session_id");
    if (saved) setPaidSessionId(saved);
    const onStorage = (e: StorageEvent) => {
      if (e.key === "stripe_session_id" && e.newValue) setPaidSessionId(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    fetch(`/api/free-trial-status?fingerprint=${getFingerprint()}`)
      .then(r => r.json())
      .then(d => setFreeTrialAvailable(d.available))
      .catch(() => setFreeTrialAvailable(false));
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const initiatePayment = async (tier: 'lite' | 'pro' | 'max') => {
    try {
      const res = await fetch('/api/create-payment', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      if (!res.ok) throw new Error((await res.json()).message || "Payment failed");
      const { url } = await res.json();
      if (window.self !== window.top) window.open(url, '_blank');
      else window.location.href = url;
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Payment failed", variant: "destructive" });
    }
  };

  const runAnalysis = async (asFree = false) => {
    if (!code.trim()) {
      toast({ title: "Paste some code first", description: "Add at least a few lines of AI-generated code to analyze.", variant: "destructive" });
      return;
    }
    setIsRunning(true);
    setResult(null);
    setIsDemo(false);
    setShowSaferCode(false);
    try {
      const body: any = { code, prompt: userPrompt || undefined };
      if (asFree) body.fingerprint = getFingerprint();
      else if (paidSessionId) body.sessionId = paidSessionId;

      const res = await fetch('/api/analyze-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.trial_exhausted) setFreeTrialAvailable(false);
        throw new Error(data.message || "Analysis failed");
      }
      setResult(data);
      if (asFree) setFreeTrialAvailable(false);
      if (paidSessionId && !asFree) {
        localStorage.removeItem("stripe_session_id");
        setPaidSessionId(null);
      }
      toast({ title: "Analysis complete", description: `Risk level: ${data.risk_level?.replace("_", " ")}` });
    } catch (err) {
      toast({ title: "Analysis failed", description: err instanceof Error ? err.message : "Something went wrong", variant: "destructive" });
    } finally {
      setIsRunning(false);
    }
  };

  const risk = result ? (RISK_META[result.risk_level] ?? RISK_META.NEEDS_REVIEW) : null;

  const tiers = [
    { id: 'lite' as const, name: 'ASOF Lite', price: '$0.50', description: 'Risk level + all assumptions + what could break', icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />, unlocks: ['Full assumption list', 'What could break'] },
    { id: 'pro' as const, name: 'ASOF Pro', price: '$1.00', description: 'Everything in Lite + verify checklist + suggestion cards', icon: <Zap className="w-4 h-4 text-blue-400" />, unlocks: ['Verify checklist', 'Detailed suggestion cards'] },
    { id: 'max' as const, name: 'ASOF Max', price: '$2.50', description: 'Full analysis + safer code rewrite side-by-side', icon: <ShieldCheck className="w-4 h-4 text-purple-400" />, unlocks: ['Side-by-side safer code', 'Full rewrite'] },
  ];

  return (
    <Card className="glass-card border-white/5 overflow-hidden flex flex-col relative">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-purple-500 to-pink-500" />

      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-primary" />
            Analyze AI-Generated Code
          </div>
          <button
            data-testid="button-load-demo"
            onClick={loadExample}
            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-all"
          >
            ✨ Try an example
          </button>
        </CardTitle>
        <p className="text-xs text-muted-foreground">Paste code from Cursor, Claude, ChatGPT, or any AI tool. ASOF finds what it assumed.</p>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {/* Example CTA banner */}
        <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/8 border border-primary/20 backdrop-blur-sm">
          <Sparkles className="w-4 h-4 text-primary shrink-0" />
          <p className="text-xs text-white/70 flex-1">New here? See what ASOF finds in real AI-generated code.</p>
          <div className="flex gap-2 shrink-0">
            <button
              data-testid="button-try-example"
              onClick={loadExample}
              className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 transition-all"
            >
              <Sparkles className="w-3 h-3" />
              Try an example
            </button>
            {isExampleLoaded && (
              <button
                data-testid="button-see-example-result"
                onClick={showMockResult}
                className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-orange-500/15 hover:bg-orange-500/25 text-orange-300 border border-orange-500/25 transition-all"
              >
                <Eye className="w-3 h-3" />
                {showExampleResult ? "Hide result" : "See result"}
              </button>
            )}
          </div>
        </div>

        {/* Code input */}
        <div className="space-y-2">
          <Label htmlFor="code-input" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            AI-Generated Code
          </Label>
          <Textarea
            id="code-input"
            data-testid="input-code"
            value={code}
            onChange={e => { setCode(e.target.value); if (isExampleLoaded) setIsExampleLoaded(false); }}
            placeholder="Paste AI-generated code here..."
            className="glass-input font-mono text-xs min-h-[160px] resize-y leading-relaxed"
            spellCheck={false}
          />
        </div>

        {/* Optional prompt */}
        <div className="space-y-2">
          <Label htmlFor="prompt-input" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            What did you ask the AI to build? <span className="normal-case font-normal text-muted-foreground/60">(optional but improves accuracy)</span>
          </Label>
          <Textarea
            id="prompt-input"
            data-testid="input-prompt"
            value={userPrompt}
            onChange={e => setUserPrompt(e.target.value)}
            placeholder="e.g. Build a function that charges a user's card and saves the order to the database"
            className="glass-input text-xs min-h-[60px] resize-y leading-relaxed"
            spellCheck={false}
          />
        </div>

        {/* Pre-rendered example result panel */}
        <AnimatePresence>
          {showExampleResult && (
            <motion.div
              key="example-result"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-4 rounded-xl border border-orange-500/20 bg-orange-500/5 p-4"
            >
              <div className="flex items-center gap-2 mb-1">
                <Eye className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-orange-400">Example Output — not a real run</span>
              </div>

              {/* Risk badge */}
              <div className={`rounded-xl border p-4 space-y-2 ${RISK_META.RISKY.bg}`}>
                <div className="flex items-center gap-2">
                  {RISK_META.RISKY.icon}
                  <span className={`font-bold text-sm ${RISK_META.RISKY.color}`}>{RISK_META.RISKY.label}</span>
                </div>
                <p className="text-xs text-white/80 leading-relaxed">{EXAMPLE_RESULT.summary}</p>
                <span className="inline-block text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded bg-white/5 border border-white/10 text-muted-foreground">max tier</span>
              </div>

              {/* Assumptions */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">🔍 What the AI assumed</p>
                {EXAMPLE_RESULT.assumptions!.map((a, i) => (
                  <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/15">
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border shrink-0 mt-0.5 uppercase ${SEV_COLOR[a.severity]}`}>{a.severity}</span>
                    <p className="text-xs text-white/75 leading-relaxed">{a.text}</p>
                  </div>
                ))}
              </div>

              {/* Risks */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">💥 What could break</p>
                {EXAMPLE_RESULT.risks!.map((r, i) => (
                  <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-red-500/5 border border-red-500/15">
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border shrink-0 mt-0.5 uppercase ${SEV_COLOR[r.severity]}`}>{r.severity}</span>
                    <p className="text-xs text-white/75 leading-relaxed">{r.text}</p>
                  </div>
                ))}
              </div>

              {/* Verify checklist */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">✅ What to verify</p>
                <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/15 space-y-1.5">
                  {EXAMPLE_RESULT.checks!.map((c, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-amber-500/60 shrink-0 mt-0.5">□</span>
                      <p className="text-xs text-white/75 leading-relaxed">{c}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Suggestions */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">🛠 Suggestions</p>
                {EXAMPLE_RESULT.suggestions!.map((s, i) => (
                  <div key={i} className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-1.5">
                    <p className="text-xs font-bold text-white">{s.problem}</p>
                    <p className="text-[10px] text-red-300/70 leading-snug"><span className="font-semibold text-red-400/90">Why it matters:</span> {s.why_it_matters}</p>
                    <p className="text-[10px] text-emerald-300/70 leading-snug"><span className="font-semibold text-emerald-400/90">Fix:</span> {s.fix}</p>
                  </div>
                ))}
              </div>

              <p className="text-[9px] text-muted-foreground/50 text-center pt-1">This is a pre-rendered preview. Run your own code to get a real analysis.</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CTA area */}
        {freeTrialAvailable && (
          <Button
            data-testid="button-free-trial"
            onClick={() => runAnalysis(true)}
            disabled={isRunning || !code.trim()}
            className="w-full h-11 font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30"
          >
            {isRunning ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing...</> : <><Zap className="mr-2 h-4 w-4" />Analyze Free (One Trial)</>}
          </Button>
        )}

        {paidSessionId && (
          <Button
            data-testid="button-analyze"
            onClick={() => runAnalysis(false)}
            disabled={isRunning || !code.trim()}
            className="w-full h-11 font-semibold bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
          >
            {isRunning ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing with AI...</> : <><Code2 className="mr-2 h-4 w-4" />Analyze Code</>}
          </Button>
        )}

        {!freeTrialAvailable && !paidSessionId && freeTrialAvailable !== null && (
          <div className="space-y-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Select Pricing Tier</p>

            {/* Feature comparison table */}
            <div className="rounded-xl border border-white/10 overflow-hidden text-[9px]">
              <div className="grid grid-cols-4 bg-white/5 border-b border-white/10">
                <div className="p-2 text-muted-foreground font-semibold uppercase tracking-wider">Feature</div>
                <div className="p-2 text-center text-emerald-400 font-bold">Lite<br/><span className="text-white/60 font-normal normal-case tracking-normal">$0.50</span></div>
                <div className="p-2 text-center text-blue-400 font-bold">Pro<br/><span className="text-white/60 font-normal normal-case tracking-normal">$1.00</span></div>
                <div className="p-2 text-center text-purple-400 font-bold">Max<br/><span className="text-white/60 font-normal normal-case tracking-normal">$2.50</span></div>
              </div>
              {[
                { label: "Verdict (risk level)", lite: true, pro: true, max: true },
                { label: "Assumptions", lite: true, pro: true, max: true },
                { label: "What Could Break", lite: true, pro: true, max: true },
                { label: "Verify Checklist", lite: false, pro: true, max: true },
                { label: "Suggestion Cards", lite: false, pro: true, max: true },
                { label: "Safer Code Rewrite", lite: false, pro: false, max: true },
              ].map((row, i) => (
                <div key={i} className={`grid grid-cols-4 border-b border-white/5 last:border-0 ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}>
                  <div className="p-2 text-muted-foreground">{row.label}</div>
                  {[row.lite, row.pro, row.max].map((has, j) => (
                    <div key={j} className="p-2 flex justify-center items-center">
                      {has
                        ? <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        : <Lock className="w-3 h-3 text-white/20" />}
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {tiers.map(tier => (
              <button
                key={tier.id}
                data-testid={`button-tier-${tier.id}`}
                onClick={() => initiatePayment(tier.id)}
                className="flex items-center justify-between w-full p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-left group"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded bg-white/10">{tier.icon}</div>
                  <div>
                    <p className="text-xs font-bold text-white">{tier.name}</p>
                    <p className="text-[9px] text-muted-foreground">{tier.description}</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-white">{tier.price}</span>
              </button>
            ))}

            <div className="text-center pt-1">
              <Link
                data-testid="link-full-pricing"
                href="/pricing"
                className="text-[10px] text-muted-foreground hover:text-primary transition-colors"
              >
                View full pricing comparison →
              </Link>
            </div>
          </div>
        )}

        {freeTrialAvailable && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[9px] text-muted-foreground uppercase tracking-widest">or pay for deeper analysis</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Feature comparison table */}
            <div className="rounded-xl border border-white/10 overflow-hidden text-[9px]">
              <div className="grid grid-cols-4 bg-white/5 border-b border-white/10">
                <div className="p-2 text-muted-foreground font-semibold uppercase tracking-wider">Feature</div>
                <div className="p-2 text-center text-emerald-400 font-bold">Lite<br/><span className="text-white/60 font-normal normal-case tracking-normal">$0.50</span></div>
                <div className="p-2 text-center text-blue-400 font-bold">Pro<br/><span className="text-white/60 font-normal normal-case tracking-normal">$1.00</span></div>
                <div className="p-2 text-center text-purple-400 font-bold">Max<br/><span className="text-white/60 font-normal normal-case tracking-normal">$2.50</span></div>
              </div>
              {[
                { label: "Verdict (risk level)", lite: true, pro: true, max: true },
                { label: "Assumptions", lite: true, pro: true, max: true },
                { label: "What Could Break", lite: true, pro: true, max: true },
                { label: "Verify Checklist", lite: false, pro: true, max: true },
                { label: "Suggestion Cards", lite: false, pro: true, max: true },
                { label: "Safer Code Rewrite", lite: false, pro: false, max: true },
              ].map((row, i) => (
                <div key={i} className={`grid grid-cols-4 border-b border-white/5 last:border-0 ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}>
                  <div className="p-2 text-muted-foreground">{row.label}</div>
                  {[row.lite, row.pro, row.max].map((has, j) => (
                    <div key={j} className="p-2 flex justify-center items-center">
                      {has
                        ? <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        : <Lock className="w-3 h-3 text-white/20" />}
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {tiers.map(tier => (
              <button
                key={tier.id}
                data-testid={`button-tier-${tier.id}`}
                onClick={() => initiatePayment(tier.id)}
                className="flex items-center justify-between w-full p-2.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-left"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-white/5">{tier.icon}</div>
                  <div>
                    <p className="text-[10px] font-bold text-white">{tier.name} — {tier.price}</p>
                    <p className="text-[9px] text-muted-foreground">{tier.unlocks.join(' · ')}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Results */}
        <AnimatePresence>
          {result && risk && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4 mt-2"
            >
              {/* Demo banner */}
              {isDemo && (
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-[10px]">
                  <span className="text-primary font-bold uppercase tracking-wider">✨ Example analysis — paste your own code above to run a real check</span>
                  <button onClick={() => { setResult(null); setIsDemo(false); setCode(""); setUserPrompt(""); }} className="text-primary/60 hover:text-primary transition-colors font-semibold">Clear</button>
                </div>
              )}

              {/* Risk badge + summary */}
              <div className={`rounded-xl border p-4 space-y-2 ${risk.bg}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {risk.icon}
                    <span className={`font-bold text-sm ${risk.color}`}>{risk.label}</span>
                  </div>
                  <button
                    data-testid="button-download-pdf"
                    onClick={() => downloadReport(result, code)}
                    className="flex items-center gap-1 text-[9px] font-semibold text-muted-foreground hover:text-white transition-colors px-2 py-1 rounded border border-white/10 hover:border-white/20 bg-white/5"
                  >
                    <Download className="w-3 h-3" />
                    PDF
                  </button>
                </div>
                <p className="text-xs text-white/80 leading-relaxed">{result.summary}</p>
                {result.tier && (
                  <span className="inline-block text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded bg-white/5 border border-white/10 text-muted-foreground">
                    {result.tier} tier
                  </span>
                )}
              </div>

              {/* What the AI assumed */}
              {result.assumptions?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">🔍 What the AI assumed</p>
                  {result.assumptions.map((a, i) => (
                    <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/15">
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border shrink-0 mt-0.5 uppercase ${SEV_COLOR[a.severity]}`}>{a.severity}</span>
                      <p className="text-xs text-white/75 leading-relaxed">{a.text}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* What could break */}
              {result.risks?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">💥 What could break</p>
                  {result.risks.map((r, i) => (
                    <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-red-500/5 border border-red-500/15">
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border shrink-0 mt-0.5 uppercase ${SEV_COLOR[r.severity]}`}>{r.severity}</span>
                      <p className="text-xs text-white/75 leading-relaxed">{r.text}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* What to verify */}
              {result.checks?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">✅ What to verify</p>
                  <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/15 space-y-1.5">
                    {result.checks.map((c, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-amber-500/60 shrink-0 mt-0.5">□</span>
                        <p className="text-xs text-white/75 leading-relaxed">{c}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestion cards */}
              {result.suggestions?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">🛠 Suggestions</p>
                  {result.suggestions.map((s, i) => (
                    <div key={i} className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-1.5">
                      <p className="text-xs font-bold text-white">{s.problem}</p>
                      <p className="text-[10px] text-red-300/70 leading-snug"><span className="font-semibold text-red-400/90">Why it matters:</span> {s.why_it_matters}</p>
                      <p className="text-[10px] text-emerald-300/70 leading-snug"><span className="font-semibold text-emerald-400/90">Fix:</span> {s.fix}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Side-by-side code diff */}
              {result.safer_code && (
                <div className="space-y-2">
                  <button
                    data-testid="button-toggle-code"
                    onClick={() => setShowSaferCode(v => !v)}
                    className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-primary hover:text-primary/80 transition-colors"
                  >
                    {showSaferCode ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    🚦 Safer suggested code
                  </button>
                  <AnimatePresence>
                    {showSaferCode && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground px-1">Original AI Code</p>
                            <pre className="text-[9px] font-mono leading-relaxed bg-white/5 border border-white/10 rounded-lg p-3 overflow-x-auto text-white/60 whitespace-pre-wrap break-all">{code}</pre>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-400 px-1">Safer Suggested Code</p>
                            <pre className="text-[9px] font-mono leading-relaxed bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3 overflow-x-auto text-emerald-100/80 whitespace-pre-wrap break-all">{result.safer_code}</pre>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Gated upgrade prompt */}
              {result.gated && (
                <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-3">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-purple-400" />
                    <p className="text-xs font-bold text-purple-300">
                      Upgrade to {result.gated_tier?.toUpperCase()} for{' '}
                      {result.gated_tier === 'lite' ? 'the full assumption list and what could break' :
                       result.gated_tier === 'pro' ? 'the verify checklist and detailed suggestion cards' :
                       'the safer code rewrite side-by-side'}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {tiers.filter(t => {
                      const order = { lite: 0, pro: 1, max: 2 };
                      return order[t.id] >= order[result.gated_tier as keyof typeof order];
                    }).map(t => (
                      <button
                        key={t.id}
                        onClick={() => initiatePayment(t.id)}
                        className="text-[10px] font-bold px-3 py-1.5 rounded border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 transition-all"
                      >
                        {t.name} — {t.price}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
