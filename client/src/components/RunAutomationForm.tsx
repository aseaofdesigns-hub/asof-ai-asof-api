import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Code2, ShieldCheck, Zap, CheckCircle2, Lock, AlertTriangle, XCircle, Download, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import type { CodeAnalysisResult } from "@shared/routes";
import jsPDF from "jspdf";

const DEMO_CODE = `// AI-generated: charge customer and save order
async function processOrder(userId, cartItems) {
  const total = cartItems.reduce((sum, item) => sum + item.price, 0);

  const charge = await stripe.charges.create({
    amount: total,
    currency: 'usd',
    customer: userId,
    description: 'Order payment'
  });

  const order = await db.orders.create({
    userId: userId,
    items: cartItems,
    total: total,
    stripeChargeId: charge.id,
    status: 'paid'
  });

  return order;
}`;

const DEMO_PROMPT = "Build a function that charges a customer's card and saves their order to the database";

const DEMO_RESULT: CodeAnalysisResult = {
  risk_level: "RISKY",
  summary: "This function charges the customer using userId as a Stripe customer ID without verifying it exists, and treats item.price as already being in cents — if prices are stored in dollars, customers will be overcharged by 100×. A DB failure after a successful charge will silently lose money.",
  tier: "max (demo)",
  assumptions: [
    { text: "The AI assumed userId is a valid Stripe customer ID — it may be an internal DB user ID, which will cause a Stripe error or charge the wrong customer.", severity: "HIGH" },
    { text: "The AI assumed item.price is already in cents. If your app stores prices in dollars (e.g. 29.99), Stripe will charge $2,999.", severity: "HIGH" },
    { text: "The AI assumed no duplicate order protection is needed — a network retry or double-click will create two charges.", severity: "MEDIUM" },
    { text: "The AI assumed the charge always succeeds before the DB insert — there is no rollback if the database fails after money is taken.", severity: "HIGH" },
  ],
  risks: [
    { text: "100× overcharge if item.price is in dollars instead of cents — Stripe receives the raw float as cents.", severity: "HIGH" },
    { text: "Orphaned charge: if db.orders.create throws, Stripe has the money but no order exists in your system.", severity: "HIGH" },
    { text: "Double-charge on retry: no Stripe idempotency key means a network timeout retry creates a second charge.", severity: "MEDIUM" },
    { text: "No authorization check — any userId can be passed in, so one user could trigger a charge on another user's saved card.", severity: "HIGH" },
  ],
  checks: [
    "Confirm item.price unit: is it dollars or cents? Multiply by 100 if dollars before passing to Stripe.",
    "Verify userId is a Stripe customer ID (starts with 'cus_'), not an internal user ID.",
    "Add a Stripe idempotency key (e.g. based on cart hash + userId) to prevent double-charging on retry.",
    "Wrap the charge + DB insert in a try/catch that issues a Stripe refund if the DB insert fails.",
    "Add an ownership check to confirm the userId matches the authenticated session before charging.",
  ],
  suggestions: [
    {
      problem: "Prices may not be in cents",
      why_it_matters: "Stripe requires amounts in the smallest currency unit (cents). If item.price is 29.99 dollars, Stripe charges $2,999.",
      fix: "Multiply by 100: amount: Math.round(total * 100) — or store prices in cents throughout your app.",
    },
    {
      problem: "No idempotency key on Stripe charge",
      why_it_matters: "If the request times out and retries, Stripe creates a second charge. The customer gets billed twice.",
      fix: "Add idempotencyKey: { idempotencyKey: `order-${userId}-${cartHash}` } to the stripe.charges.create call.",
    },
    {
      problem: "No rollback if DB insert fails after charge",
      why_it_matters: "Stripe takes the money, then if db.orders.create throws, the order is never recorded. You have a payment with no order.",
      fix: "Wrap both calls in try/catch. If the DB insert fails, call stripe.refunds.create({ charge: charge.id }) before rethrowing.",
    },
    {
      problem: "Missing authorization check",
      why_it_matters: "Nothing confirms the caller owns the userId being charged. A logged-in user could pass someone else's userId.",
      fix: "Compare userId to the authenticated session user ID before processing: if (userId !== req.user.id) throw new Error('Unauthorized').",
    },
  ],
  safer_code: `// Safer version: explicit cents conversion, idempotency, rollback, auth check
async function processOrder(authenticatedUserId, cartItems) {
  // 1. Authorization: only charge the authenticated user
  if (!authenticatedUserId) throw new Error('Unauthorized: no authenticated user');

  // 2. Look up the Stripe customer ID — never use internal user IDs directly
  const user = await db.users.findById(authenticatedUserId);
  if (!user?.stripeCustomerId) throw new Error('No payment method on file');

  // 3. Convert prices to cents explicitly (assumes item.price is in dollars)
  const totalCents = Math.round(
    cartItems.reduce((sum, item) => sum + item.price, 0) * 100
  );

  // 4. Create a stable idempotency key to prevent double-charges on retry
  const cartHash = cartItems.map(i => i.id + ':' + i.qty).join(',');
  const idempotencyKey = \`order-\${authenticatedUserId}-\${Buffer.from(cartHash).toString('base64').slice(0, 16)}\`;

  let charge;
  try {
    charge = await stripe.charges.create(
      { amount: totalCents, currency: 'usd', customer: user.stripeCustomerId, description: 'Order payment' },
      { idempotencyKey }
    );
  } catch (stripeErr) {
    throw new Error(\`Payment failed: \${stripeErr.message}\`);
  }

  // 5. Save the order — if this fails, refund the charge
  let order;
  try {
    order = await db.orders.create({
      userId: authenticatedUserId,
      items: cartItems,
      totalCents,
      stripeChargeId: charge.id,
      status: 'paid',
    });
  } catch (dbErr) {
    // Rollback: refund the charge so money isn't lost
    await stripe.refunds.create({ charge: charge.id });
    throw new Error('Order could not be saved; payment has been refunded.');
  }

  return order;
}`,
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
  const { toast } = useToast();

  const loadDemo = () => {
    setCode(DEMO_CODE);
    setUserPrompt(DEMO_PROMPT);
    setResult(DEMO_RESULT);
    setIsDemo(true);
    setShowSaferCode(true);
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
            onClick={loadDemo}
            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-all"
          >
            ✨ Try an example
          </button>
        </CardTitle>
        <p className="text-xs text-muted-foreground">Paste code from Cursor, Claude, ChatGPT, or any AI tool. ASOF finds what it assumed.</p>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {/* Code input */}
        <div className="space-y-2">
          <Label htmlFor="code-input" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            AI-Generated Code
          </Label>
          <Textarea
            id="code-input"
            data-testid="input-code"
            value={code}
            onChange={e => setCode(e.target.value)}
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
          <div className="space-y-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Select Pricing Tier</p>
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
          </div>
        )}

        {freeTrialAvailable && (
          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-[9px] text-muted-foreground uppercase tracking-widest">or pay for deeper analysis</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>
        )}

        {freeTrialAvailable && tiers.map(tier => (
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
