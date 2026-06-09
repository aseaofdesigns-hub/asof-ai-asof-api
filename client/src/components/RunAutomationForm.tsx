import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Code2, ShieldCheck, Zap, CheckCircle2, Lock, AlertTriangle, XCircle, Download, Sparkles, Eye, ArrowUpCircle, MailSearch } from "lucide-react";
import { Input } from "@/components/ui/input";
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
      fix: "Add `idempotencyKey: `order-${userId}-${cartHash}`` to every `stripe.charges.create` call.",
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

const TIER_CENTS: Record<string, number> = { free: 0, lite: 50, pro: 100, max: 250 };
const TIER_ORDER: Record<string, number> = { free: 0, lite: 1, pro: 2, max: 3 };

function getUpgradeOptions(currentTier: string, minTier: string) {
  const all = [
    { tier: 'lite' as const, name: 'Lite', description: 'Full assumptions + what could break' },
    { tier: 'pro' as const, name: 'Pro', description: 'Verify checklist + suggestion cards' },
    { tier: 'max' as const, name: 'Max', description: 'Safer code rewrite side-by-side' },
  ];
  return all
    .filter(t => TIER_ORDER[t.tier] >= TIER_ORDER[minTier])
    .map(t => {
      const diffCents = TIER_CENTS[t.tier] - (TIER_CENTS[currentTier] ?? 0);
      return { ...t, diffCents, diffLabel: diffCents > 0 ? `+$${(diffCents / 100).toFixed(2)}` : `$${(TIER_CENTS[t.tier] / 100).toFixed(2)}` };
    })
    .filter(t => t.diffCents > 0);
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

async function svgToPng(svgStr: string, size: number): Promise<string> {
  return new Promise((resolve) => {
    const blob = new Blob([svgStr], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size; canvas.height = size;
      canvas.getContext("2d")!.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(""); };
    img.src = url;
  });
}

const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="7" fill="#1e1133"/>
  <rect x="9" y="9" width="14" height="14" rx="2" fill="none" stroke="#a855f7" stroke-width="1.5"/>
  <rect x="12.5" y="12.5" width="7" height="7" rx="1" fill="#a855f7" opacity="0.25"/>
  <line x1="13" y1="9" x2="13" y2="6" stroke="#a855f7" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="19" y1="9" x2="19" y2="6" stroke="#a855f7" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="13" y1="23" x2="13" y2="26" stroke="#a855f7" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="19" y1="23" x2="19" y2="26" stroke="#a855f7" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="9" y1="13" x2="6" y2="13" stroke="#a855f7" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="9" y1="19" x2="6" y2="19" stroke="#a855f7" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="23" y1="13" x2="26" y2="13" stroke="#a855f7" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="23" y1="19" x2="26" y2="19" stroke="#a855f7" stroke-width="1.5" stroke-linecap="round"/>
</svg>`;

export async function downloadReport(result: CodeAnalysisResult, _code: string) {
  const iconPng = await svgToPng(FAVICON_SVG, 64);

  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 14;
  const cW = pageW - M * 2;
  const FOOTER_H = 16;
  const MAX_Y = pageH - FOOTER_H - 4;
  const now = new Date();

  const SEV_ORDER: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  const SEV_RGB: Record<string, [number,number,number]> = {
    CRITICAL: [220,38,38], HIGH: [249,115,22], MEDIUM: [217,119,6], LOW: [59,130,246],
  };
  const RISK_RGB: Record<string, [number,number,number]> = {
    SAFE: [34,197,94], NEEDS_REVIEW: [251,191,36], RISKY: [249,115,22], CRITICAL: [239,68,68],
  };
  const SCORE_MAP: Record<string, number> = { SAFE: 90, NEEDS_REVIEW: 62, RISKY: 32, CRITICAL: 10 };

  let y = 0;
  let pageNum = 1;

  function addFooter() {
    doc.setFillColor(14, 10, 26);
    doc.rect(0, pageH - FOOTER_H, pageW, FOOTER_H, "F");
    doc.setTextColor(120, 120, 150);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.text("ASOF.ai — asofai.com  |  Support@asofai.com", M, pageH - 5);
    doc.text(`Page ${pageNum}`, pageW - M, pageH - 5, { align: "right" });
  }

  function newPage() {
    addFooter();
    doc.addPage();
    pageNum++;
    doc.setFillColor(14, 10, 26);
    doc.rect(0, 0, pageW, 10, "F");
    doc.setTextColor(160, 140, 200);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("ASOF.ai — AI Code Analysis Report (continued)", M, 7);
    y = 18;
  }

  function checkY(need: number) { if (y + need > MAX_Y) newPage(); }

  function sectionHeader(label: string) {
    checkY(18);
    doc.setFillColor(168, 85, 247);
    doc.rect(M, y, 3, 9, "F");
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 20, 50);
    doc.text(label, M + 7, y + 7);
    y += 14;
  }

  function sevBadge(sev: string, bx: number, by: number): number {
    const col = SEV_RGB[sev] ?? [100,100,120];
    const label = sev;
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...col);
    const tw = doc.getTextWidth(label) + 6;
    doc.setDrawColor(...col);
    doc.setLineWidth(0.3);
    doc.roundedRect(bx, by - 5, tw, 6.5, 1, 1, "S");
    doc.text(label, bx + 3, by);
    return tw + 4;
  }

  // ── HEADER ──────────────────────────────────────────────────────
  doc.setFillColor(14, 10, 26);
  doc.rect(0, 0, pageW, 46, "F");

  if (iconPng) doc.addImage(iconPng, "PNG", M, 8, 12, 12);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("ASOF.ai", iconPng ? M + 16 : M, 17);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 150, 230);
  doc.text("AI Code Assumption Analysis Report", iconPng ? M + 16 : M, 26);
  doc.setTextColor(130, 120, 160);
  doc.text(`Generated: ${now.toLocaleString()}`, iconPng ? M + 16 : M, 34);
  if (result.tier) {
    const tierLabel = result.tier.toUpperCase() + " TIER";
    doc.setFillColor(168, 85, 247, 0.3);
    doc.setDrawColor(168, 85, 247);
    doc.setLineWidth(0.4);
    const tw = doc.getTextWidth(tierLabel) + 8;
    doc.roundedRect(pageW - M - tw, 28, tw, 8, 2, 2, "S");
    doc.setTextColor(200, 150, 255);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.text(tierLabel, pageW - M - tw + 4, 34);
  }

  y = 56;

  // ── 1. RISK SUMMARY ─────────────────────────────────────────────
  const rc = RISK_RGB[result.risk_level] ?? [107,114,128];
  const score = SCORE_MAP[result.risk_level] ?? 50;

  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...rc);
  doc.text(`Risk Level: ${result.risk_level.replace("_"," ")}`, M, y);

  // Score pill top-right
  const scoreLabel = `${score}% safe`;
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  const spW = doc.getTextWidth(scoreLabel) + 10;
  doc.setDrawColor(...rc);
  doc.setLineWidth(0.5);
  doc.roundedRect(pageW - M - spW, y - 8, spW, 10, 2, 2, "S");
  doc.setTextColor(...rc);
  doc.text(scoreLabel, pageW - M - spW + 5, y);

  y += 7;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(55, 45, 75);
  const sumLines = doc.splitTextToSize(result.summary, cW);
  checkY(sumLines.length * 5 + 6);
  doc.text(sumLines, M, y);
  y += sumLines.length * 5 + 12;

  // ── 2. FIX THESE FIRST ──────────────────────────────────────────
  const allItems = [
    ...(result.risks ?? []),
    ...(result.assumptions ?? []),
  ].sort((a, b) => (SEV_ORDER[a.severity] ?? 9) - (SEV_ORDER[b.severity] ?? 9));
  const topFixes = allItems.filter(i => i.severity === "CRITICAL" || i.severity === "HIGH").slice(0, 3);

  if (topFixes.length > 0) {
    sectionHeader("Fix These First");
    topFixes.forEach((fix, idx) => {
      const lines = doc.splitTextToSize(fix.text, cW - 22);
      checkY(lines.length * 5 + 10);
      const col = SEV_RGB[fix.severity] ?? [120,120,140];
      doc.setFillColor(...col);
      doc.circle(M + 5, y + 1, 4.5, "F");
      doc.setTextColor(255,255,255);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(`${idx + 1}`, M + 5, y + 3.5, { align: "center" });
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(40, 30, 60);
      doc.text(lines, M + 13, y + 1);
      y += lines.length * 5 + 6;
    });
    y += 4;
  }

  // ── 3. WHAT THE AI ASSUMED ───────────────────────────────────────
  if (result.assumptions?.length) {
    sectionHeader("What the AI Assumed");
    const sorted = [...result.assumptions].sort(
      (a, b) => (SEV_ORDER[a.severity] ?? 9) - (SEV_ORDER[b.severity] ?? 9)
    );
    for (const a of sorted) {
      const lines = doc.splitTextToSize(a.text, cW - 30);
      checkY(lines.length * 5 + 8);
      const bw = sevBadge(a.severity, M, y);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(55, 50, 80);
      doc.text(lines, M + bw, y);
      y += Math.max(lines.length * 5, 7) + 4;
    }
    y += 4;
  }

  // ── 4. WHAT COULD BREAK ─────────────────────────────────────────
  if (result.risks?.length) {
    sectionHeader("What Could Break");
    const sorted = [...result.risks].sort(
      (a, b) => (SEV_ORDER[a.severity] ?? 9) - (SEV_ORDER[b.severity] ?? 9)
    );
    for (const r of sorted) {
      const lines = doc.splitTextToSize(r.text, cW - 30);
      checkY(lines.length * 5 + 8);
      const bw = sevBadge(r.severity, M, y);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(55, 50, 80);
      doc.text(lines, M + bw, y);
      y += Math.max(lines.length * 5, 7) + 4;
    }
    y += 4;
  }

  // ── 5. VERIFY CHECKLIST ──────────────────────────────────────────
  if (result.checks?.length) {
    sectionHeader("Verify Checklist");
    for (const c of result.checks) {
      const lines = doc.splitTextToSize(`☐  ${c}`, cW - 8);
      checkY(lines.length * 5 + 5);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(40, 100, 60);
      doc.text(lines, M + 4, y);
      y += lines.length * 5 + 3;
    }
    y += 4;
  }

  // ── 6. SUGGESTION CARDS ──────────────────────────────────────────
  if (result.suggestions?.length) {
    sectionHeader("Suggestion Cards");
    for (const s of result.suggestions) {
      const probLines = doc.splitTextToSize(s.problem, cW - 8);
      const whyLines  = doc.splitTextToSize(s.why_it_matters, cW - 12);
      const fixLines  = doc.splitTextToSize(s.fix, cW - 12);
      const cardH = probLines.length * 5 + whyLines.length * 4.5 + fixLines.length * 4.5 + 22;
      checkY(cardH + 6);

      doc.setFillColor(248, 246, 254);
      doc.setDrawColor(200, 180, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(M, y - 2, cW, cardH, 2, 2, "FD");

      doc.setFontSize(9.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(50, 30, 80);
      doc.text(probLines, M + 5, y + 5);
      y += probLines.length * 5 + 5;

      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(180, 50, 50);
      doc.text("Why it matters:", M + 5, y + 3);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(120, 50, 50);
      doc.text(whyLines, M + 5, y + 8);
      y += whyLines.length * 4.5 + 9;

      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(40, 130, 80);
      doc.text("Fix:", M + 5, y + 3);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(40, 100, 60);
      doc.text(fixLines, M + 5, y + 8);
      y += fixLines.length * 4.5 + 12;
    }
  }

  // ── 7. SAFER CODE REWRITE (Max) ──────────────────────────────────
  if (result.safer_code) {
    sectionHeader("Suggested Safe Rewrite");
    const codeLines = result.safer_code.split("\n");
    const lineH = 4.2;
    const visLines = Math.min(codeLines.length, Math.floor((MAX_Y - y - 12) / lineH));
    const blockH = visLines * lineH + 10;
    checkY(blockH + 6);

    doc.setFillColor(14, 12, 28);
    doc.setDrawColor(80, 50, 120);
    doc.setLineWidth(0.4);
    doc.roundedRect(M, y - 2, cW, blockH, 2, 2, "FD");

    doc.setFontSize(7.5);
    doc.setFont("courier", "normal");
    doc.setTextColor(180, 220, 180);
    let cy = y + 5;
    for (let i = 0; i < visLines; i++) {
      const wrapped = doc.splitTextToSize(codeLines[i] || " ", cW - 10);
      doc.text(wrapped[0] ?? " ", M + 5, cy);
      cy += lineH;
    }
    y += blockH + 8;
  }

  // ── FOOTER on last page ──────────────────────────────────────────
  addFooter();
  doc.save(`asof-report-${Date.now()}.pdf`);
}

export function RunAutomationForm({ onResult }: { onResult?: (result: CodeAnalysisResult, code: string) => void }) {
  const [code, setCode] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<CodeAnalysisResult | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [sessions, setSessions] = useState<Array<{ id: string; tier: string }>>([]);
  const [analysisId, setAnalysisId] = useState<number | null>(null);
  const [freeTrialAvailable, setFreeTrialAvailable] = useState<boolean | null>(null);
  const [showSaferCode, setShowSaferCode] = useState(false);
  const [showExampleResult, setShowExampleResult] = useState(false);
  const [isExampleLoaded, setIsExampleLoaded] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [isRecovering, setIsRecovering] = useState(false);
  const recoveryInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  async function recoverSessions() {
    if (!recoveryEmail.trim()) return;
    setIsRecovering(true);
    try {
      const res = await fetch('/api/recover-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recoveryEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      if (data.count === 0) {
        toast({ title: "No credits found", description: "No unused paid credits found for that email.", variant: "destructive" });
      } else {
        const raw = localStorage.getItem("asof_sessions");
        const existing: Array<{ id: string; tier: string }> = raw ? JSON.parse(raw) : [];
        const existingIds = new Set(existing.map((s: any) => s.id));
        const newSessions = data.sessions.filter((s: any) => !existingIds.has(s.id));
        const merged = [...existing, ...newSessions];
        localStorage.setItem("asof_sessions", JSON.stringify(merged));
        if (merged.length > 0) localStorage.setItem("stripe_session_id", merged[0].id);
        setSessions(merged);
        setShowRecovery(false);
        setRecoveryEmail("");
        toast({ title: `${data.count} credit${data.count > 1 ? 's' : ''} restored!`, description: "Your paid sessions are ready to use." });
      }
    } catch (err) {
      toast({ title: "Recovery failed", description: err instanceof Error ? err.message : "Try again", variant: "destructive" });
    } finally {
      setIsRecovering(false);
    }
  }

  // Derived: first queued session (backward compat with existing render logic)
  const paidSessionId = sessions[0]?.id ?? null;

  function loadSessions() {
    try {
      const raw = localStorage.getItem("asof_sessions");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) { setSessions(parsed); return; }
      }
      const old = localStorage.getItem("stripe_session_id");
      if (old) setSessions([{ id: old, tier: localStorage.getItem("purchased_tier") ?? "lite" }]);
    } catch { setSessions([]); }
  }

  function consumeSession(id: string) {
    setSessions(prev => {
      const updated = prev.filter(s => s.id !== id);
      localStorage.setItem("asof_sessions", JSON.stringify(updated));
      if (updated.length > 0) localStorage.setItem("stripe_session_id", updated[0].id);
      else { localStorage.removeItem("stripe_session_id"); localStorage.removeItem("purchased_tier"); }
      return updated;
    });
  }

  async function fetchUpgradedAnalysis(id: number) {
    const fp = getFingerprint();
    try {
      const res = await fetch(`/api/analysis/${id}?fingerprint=${fp}`);
      if (res.ok) {
        const data = await res.json();
        setResult(data);
        setAnalysisId(id);
        onResult?.(data, code);
        toast({ title: "Analysis loaded", description: `Upgraded to ${data.tier?.toUpperCase() ?? 'new tier'}` });
      }
    } catch {}
  }

  const loadExample = () => {
    setCode(EXAMPLE_CODE);
    setUserPrompt("Build a function that charges a user's card and saves the order to the database");
    setIsExampleLoaded(true);
    setResult(null);
    setShowExampleResult(false);
  };

  const showMockResult = () => { setShowExampleResult(v => !v); };

  useEffect(() => {
    loadSessions();
    fetch(`/api/free-trial-status?fingerprint=${getFingerprint()}`)
      .then(r => r.json())
      .then(d => setFreeTrialAvailable(d.available))
      .catch(() => setFreeTrialAvailable(false));

    // Check for pending upgrade (returned from Stripe after an upgrade payment)
    const raw = localStorage.getItem("pending_upgrade");
    if (raw) {
      try {
        const { analysisId: pendingId } = JSON.parse(raw);
        localStorage.removeItem("pending_upgrade");
        if (pendingId) fetchUpgradedAnalysis(pendingId);
      } catch { localStorage.removeItem("pending_upgrade"); }
    }

    // Listen for new sessions added in other tabs (e.g. verify page)
    const onStorage = (e: StorageEvent) => {
      if (e.key === "asof_sessions") loadSessions();
      if (e.key === "stripe_session_id" && e.newValue) loadSessions();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const initiatePayment = async (
    tier: 'lite' | 'pro' | 'max',
    upgradeAnalysisId?: number,
    fromTier?: string,
  ) => {
    try {
      const body: Record<string, unknown> = { tier };
      if (upgradeAnalysisId && fromTier) {
        body.analysisId = upgradeAnalysisId;
        body.fromTier = fromTier;
      }
      const res = await fetch('/api/create-payment', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
    setAnalysisId(null);
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
      if (data.analysisId) setAnalysisId(data.analysisId);
      if (asFree) setFreeTrialAvailable(false);
      if (paidSessionId && !asFree) consumeSession(paidSessionId);
      onResult?.(data, code);
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

  const featureTable = [
    { label: "Verdict (risk level)", lite: true, pro: true, max: true },
    { label: "Assumptions", lite: true, pro: true, max: true },
    { label: "What Could Break", lite: true, pro: true, max: true },
    { label: "Verify Checklist", lite: false, pro: true, max: true },
    { label: "Suggestion Cards", lite: false, pro: true, max: true },
    { label: "Safer Code Rewrite", lite: false, pro: false, max: true },
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
              <div className={`rounded-xl border p-4 space-y-2 ${RISK_META.RISKY.bg}`}>
                <div className="flex items-center gap-2">
                  {RISK_META.RISKY.icon}
                  <span className={`font-bold text-sm ${RISK_META.RISKY.color}`}>{RISK_META.RISKY.label}</span>
                </div>
                <p className="text-xs text-white/80 leading-relaxed">{EXAMPLE_RESULT.summary}</p>
                <span className="inline-block text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded bg-white/5 border border-white/10 text-muted-foreground">max tier</span>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">🔍 What the AI assumed</p>
                {EXAMPLE_RESULT.assumptions!.map((a, i) => (
                  <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/15">
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border shrink-0 mt-0.5 uppercase ${SEV_COLOR[a.severity]}`}>{a.severity}</span>
                    <p className="text-xs text-white/75 leading-relaxed">{a.text}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">💥 What could break</p>
                {EXAMPLE_RESULT.risks!.map((r, i) => (
                  <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-red-500/5 border border-red-500/15">
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border shrink-0 mt-0.5 uppercase ${SEV_COLOR[r.severity]}`}>{r.severity}</span>
                    <p className="text-xs text-white/75 leading-relaxed">{r.text}</p>
                  </div>
                ))}
              </div>
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
          <div className="space-y-2">
            <Button
              data-testid="button-analyze"
              onClick={() => runAnalysis(false)}
              disabled={isRunning || !code.trim()}
              className="w-full h-11 font-semibold bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
            >
              {isRunning ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing with AI...</> : <><Code2 className="mr-2 h-4 w-4" />Analyze Code</>}
            </Button>
            {sessions.length > 1 && (
              <p className="text-center text-[10px] text-emerald-400/80 font-medium">
                {sessions.length} credits queued — used one at a time
              </p>
            )}
          </div>
        )}

        {/* Credit recovery */}
        {!paidSessionId && freeTrialAvailable === false && (
          <div className="text-center">
            <button
              data-testid="button-recover-credits"
              onClick={() => { setShowRecovery(v => !v); setTimeout(() => recoveryInputRef.current?.focus(), 50); }}
              className="text-[10px] text-muted-foreground hover:text-primary transition-colors underline underline-offset-2"
            >
              Already paid? Recover your credits →
            </button>
            <AnimatePresence>
              {showRecovery && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mt-3"
                >
                  <div className="flex gap-2 items-center p-3 rounded-xl bg-white/5 border border-white/10">
                    <MailSearch className="w-4 h-4 text-muted-foreground shrink-0" />
                    <Input
                      ref={recoveryInputRef}
                      data-testid="input-recovery-email"
                      type="email"
                      placeholder="Enter the email you used at checkout"
                      value={recoveryEmail}
                      onChange={e => setRecoveryEmail(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && recoverSessions()}
                      className="glass-input text-xs h-8 flex-1"
                    />
                    <Button
                      data-testid="button-recover-submit"
                      size="sm"
                      onClick={recoverSessions}
                      disabled={isRecovering || !recoveryEmail.trim()}
                      className="text-xs h-8 px-3 shrink-0"
                    >
                      {isRecovering ? <Loader2 className="w-3 h-3 animate-spin" /> : "Restore"}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {!freeTrialAvailable && !paidSessionId && freeTrialAvailable !== null && (
          <div className="space-y-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Select Pricing Tier</p>
            <div className="rounded-xl border border-white/10 overflow-hidden text-[9px]">
              <div className="grid grid-cols-4 bg-white/5 border-b border-white/10">
                <div className="p-2 text-muted-foreground font-semibold uppercase tracking-wider">Feature</div>
                <div className="p-2 text-center text-emerald-400 font-bold">Lite<br/><span className="text-white/60 font-normal normal-case tracking-normal">$0.50</span></div>
                <div className="p-2 text-center text-blue-400 font-bold">Pro<br/><span className="text-white/60 font-normal normal-case tracking-normal">$1.00</span></div>
                <div className="p-2 text-center text-purple-400 font-bold">Max<br/><span className="text-white/60 font-normal normal-case tracking-normal">$2.50</span></div>
              </div>
              {featureTable.map((row, i) => (
                <div key={i} className={`grid grid-cols-4 border-b border-white/5 last:border-0 ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}>
                  <div className="p-2 text-muted-foreground">{row.label}</div>
                  {[row.lite, row.pro, row.max].map((has, j) => (
                    <div key={j} className="p-2 flex justify-center items-center">
                      {has ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Lock className="w-3 h-3 text-white/20" />}
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
              <Link data-testid="link-full-pricing" href="/pricing" className="text-[10px] text-muted-foreground hover:text-primary transition-colors">
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
            <div className="rounded-xl border border-white/10 overflow-hidden text-[9px]">
              <div className="grid grid-cols-4 bg-white/5 border-b border-white/10">
                <div className="p-2 text-muted-foreground font-semibold uppercase tracking-wider">Feature</div>
                <div className="p-2 text-center text-emerald-400 font-bold">Lite<br/><span className="text-white/60 font-normal normal-case tracking-normal">$0.50</span></div>
                <div className="p-2 text-center text-blue-400 font-bold">Pro<br/><span className="text-white/60 font-normal normal-case tracking-normal">$1.00</span></div>
                <div className="p-2 text-center text-purple-400 font-bold">Max<br/><span className="text-white/60 font-normal normal-case tracking-normal">$2.50</span></div>
              </div>
              {featureTable.map((row, i) => (
                <div key={i} className={`grid grid-cols-4 border-b border-white/5 last:border-0 ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}>
                  <div className="p-2 text-muted-foreground">{row.label}</div>
                  {[row.lite, row.pro, row.max].map((has, j) => (
                    <div key={j} className="p-2 flex justify-center items-center">
                      {has ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Lock className="w-3 h-3 text-white/20" />}
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
                  <div className="flex items-center gap-2">
                    {/* Score pill */}
                    {(() => {
                      const scoreMap: Record<string, number> = { SAFE: 90, NEEDS_REVIEW: 62, RISKY: 32, CRITICAL: 10 };
                      const score = scoreMap[result.risk_level] ?? 50;
                      const color = score > 80 ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
                        : score > 55 ? "text-amber-400 bg-amber-500/10 border-amber-500/30"
                        : score > 25 ? "text-orange-400 bg-orange-500/10 border-orange-500/30"
                        : "text-red-400 bg-red-500/10 border-red-500/30";
                      return (
                        <span data-testid="text-risk-score" className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded border ${color}`}>
                          {score}% safe
                        </span>
                      );
                    })()}
                    <button
                      data-testid="button-download-pdf"
                      onClick={() => void downloadReport(result, code)}
                      className="flex items-center gap-1 text-[9px] font-semibold text-muted-foreground hover:text-white transition-colors px-2 py-1 rounded border border-white/10 hover:border-white/20 bg-white/5"
                    >
                      <Download className="w-3 h-3" />
                      PDF
                    </button>
                  </div>
                </div>
                <p className="text-xs text-white/80 leading-relaxed">{result.summary}</p>
                {result.tier && (
                  <span className="inline-block text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded bg-white/5 border border-white/10 text-muted-foreground">
                    {result.tier} tier
                  </span>
                )}
              </div>

              {/* Full analysis detail lives in the panel below */}
              {(result.assumptions?.length > 0 || result.risks?.length > 0 || result.checks?.length || result.suggestions?.length || result.safer_code) && (
                <p className="text-[10px] text-primary/60 font-medium flex items-center gap-1">
                  <span>Full report with all details shown below</span>
                  <span className="text-primary/40">↓</span>
                </p>
              )}

              {/* Gated upgrade prompt — diff pricing with analysisId */}
              {result.gated && result.gated_tier && (
                <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-3">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-purple-400" />
                    <p className="text-xs font-bold text-purple-300">
                      {analysisId ? "Upgrade this analysis — pay only the difference" : `Unlock ${result.gated_tier.toUpperCase()} tier`}
                    </p>
                  </div>

                  {/* Upgrade-in-place (diff pricing) — only when we have an analysisId */}
                  {analysisId && (
                    <div className="space-y-2">
                      {getUpgradeOptions(result.tier ?? 'free', result.gated_tier).map(opt => (
                        <button
                          key={opt.tier}
                          data-testid={`button-upgrade-${opt.tier}`}
                          onClick={() => initiatePayment(opt.tier, analysisId, result.tier ?? 'free')}
                          className="flex items-center justify-between w-full text-[10px] font-bold px-3 py-2.5 rounded-lg border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-200 transition-all"
                        >
                          <div className="flex items-center gap-2">
                            <ArrowUpCircle className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                            <div className="text-left">
                              <p className="font-bold">{opt.name} — {opt.description}</p>
                            </div>
                          </div>
                          <span className="font-mono text-purple-300 shrink-0 ml-3">{opt.diffLabel}</span>
                        </button>
                      ))}
                      <p className="text-[9px] text-purple-400/50 pl-1">Same analysis, instantly expanded — no re-run needed.</p>
                    </div>
                  )}

                  {/* Fallback: fresh purchase (no analysisId or free) */}
                  {!analysisId && (
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
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
