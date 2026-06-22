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
import { useQueryClient } from "@tanstack/react-query";
import type { CodeAnalysisResult } from "@shared/routes";
import jsPDF from "jspdf";

const EXAMPLES: Array<{ code: string; prompt: string; result: CodeAnalysisResult }> = [
  {
    prompt: "Build a JWT authentication middleware that checks the token on every request",
    code: `function authenticateUser(req, res, next) {
  const token = req.headers.authorization.split(' ')[1];
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  req.user = decoded;
  next();
}`,
    result: {
      risk_level: "CRITICAL",
      summary: "This AI-generated auth middleware will crash on every unauthenticated request — it calls .split() on an undefined Authorization header with no guard. Anyone who hits an endpoint without a token gets an unhandled TypeError that crashes the request handler instead of a clean 401.",
      assumptions: [
        { severity: "HIGH", text: "Assumes req.headers.authorization always exists and is a valid 'Bearer <token>' string. Any missing or malformed header throws a TypeError before any auth check runs." },
        { severity: "HIGH", text: "Assumes jwt.verify() always returns a decoded user object. If the token is expired or tampered with, jwt.verify() throws — but there's no try/catch, so the error propagates uncaught." },
        { severity: "MEDIUM", text: "Assumes process.env.JWT_SECRET is always set at runtime. If the env var is missing, jwt.verify() silently accepts tokens signed with an empty string." },
        { severity: "LOW", text: "Assumes every valid token contains an exp claim. Tokens without expiry are accepted forever — jwt.verify() only rejects expiry if the claim is present." },
      ],
      risks: [
        { severity: "HIGH", text: "No try/catch: jwt.verify() throws JsonWebTokenError, TokenExpiredError, and NotBeforeError — all uncaught, crashing the middleware chain." },
        { severity: "HIGH", text: "No check for req.headers.authorization existence — calling .split(' ') on undefined throws immediately for every unauthenticated request." },
        { severity: "MEDIUM", text: "Token split on a single space — a double-space or missing 'Bearer ' prefix silently passes undefined to jwt.verify() with no error." },
        { severity: "LOW", text: "next() is called synchronously after setting req.user — if jwt.verify() somehow partially succeeds with a malformed payload, the corrupted user object reaches your route handlers." },
      ],
      checks: [
        "Verify a missing Authorization header returns a clean 401 before .split() is ever called",
        "Confirm JWT_SECRET is set in all environments — a missing secret makes jwt.verify() accept any token",
        "Test with an expired token — confirm the middleware returns 401, not a 500 crash",
        "Check whether any issued tokens omit the exp claim — tokens without expiry are accepted forever",
        "Verify all downstream routes handle req.user being undefined if an error slips through next()",
      ],
      suggestions: [
        {
          problem: "No Authorization header guard before .split()",
          why_it_matters: "Any request without an Authorization header throws TypeError: Cannot read properties of undefined — this crashes the server instead of returning 401.",
          fix: "Add `if (!req.headers.authorization) return res.status(401).json({ error: 'No token' })` before calling .split().",
        },
        {
          problem: "jwt.verify() throws on invalid tokens with no catch",
          why_it_matters: "Expired, malformed, or tampered tokens throw exceptions that bubble up uncaught, causing 500 errors instead of clean 401 rejections.",
          fix: "Wrap in try/catch: `try { req.user = jwt.verify(token, secret); next(); } catch { res.status(401).json({ error: 'Invalid token' }); }`",
        },
      ],
      safer_code: `function authenticateUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or malformed Authorization header' });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not configured');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token has expired' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    return res.status(500).json({ error: 'Authentication error' });
  }
}`,
      tier: "lite",
      gated: true,
      gated_tier: "pro",
    },
  },
  {
    prompt: "Build a function that fetches a user profile from our internal API and caches it in Redis for 1 hour",
    code: `async function getUserProfile(userId) {
  const cacheKey = \`user:\${userId}\`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const response = await fetch(\`https://api.internal.com/users/\${userId}\`, {
    headers: { Authorization: \`Bearer \${process.env.INTERNAL_API_KEY}\` }
  });
  const data = await response.json();
  await redis.setex(cacheKey, 3600, JSON.stringify(data));
  return data;
}`,
    result: {
      risk_level: "NEEDS_REVIEW",
      summary: "This AI-generated function fetches user profiles with Redis caching but never checks whether the API call succeeded. A 404 or 500 response gets parsed and cached as valid user data — callers will receive that corrupted payload for a full hour before it expires.",
      assumptions: [
        { severity: "HIGH", text: "Assumes the external API always returns a valid JSON user object. A 404 or 500 still returns JSON, which gets parsed and written to cache as if it were real user data." },
        { severity: "MEDIUM", text: "Assumes redis.get() returns null on a cache miss and never throws. If Redis is unavailable, the function crashes instead of falling back to the live API." },
        { severity: "MEDIUM", text: "Assumes the cached value is always valid JSON. If a previous write was interrupted, JSON.parse() throws a SyntaxError that crashes the caller with no fallback." },
        { severity: "LOW", text: "Assumes INTERNAL_API_KEY never rotates. If the key is cycled, stale cached data continues to be served for up to 1 hour after the API starts rejecting requests." },
      ],
      risks: [
        { severity: "HIGH", text: "Response status is never checked — fetch() resolves on 4xx/5xx without throwing, so error payloads get cached and served as valid user data." },
        { severity: "MEDIUM", text: "No Redis connection error handling — a Redis outage crashes this function before it can fall back to the API, making profiles completely unavailable." },
        { severity: "MEDIUM", text: "Cache stampede risk: when the key expires for many users simultaneously, all requests hit the external API at once with no lock or single-flight guard." },
        { severity: "LOW", text: "TTL is hardcoded to 3600s — no way to invalidate a single user's cache if their profile changes before the hour is up." },
      ],
      checks: [
        "Verify what the API returns on a 404 or 500 — confirm it's distinguishable from a valid user object",
        "Test the code path when Redis is down — confirm it falls back to the API instead of throwing",
        "Check whether a 1-hour cache TTL is acceptable for your data freshness requirements",
        "Confirm INTERNAL_API_KEY rotation procedures include a cache flush strategy",
        "Add response.ok check before parsing to prevent caching error responses",
      ],
      suggestions: [
        {
          problem: "No HTTP status check before caching the response",
          why_it_matters: "A 404 'user not found' or 500 error body gets stored in Redis and served to callers as real user data for up to an hour.",
          fix: "Add `if (!response.ok) throw new Error(\`API \${response.status} for user \${userId}\`)` before calling response.json() — errors won't reach the cache.",
        },
        {
          problem: "No Redis fallback when the cache layer is unavailable",
          why_it_matters: "Any Redis outage makes user profiles completely unreachable even when the source API is healthy.",
          fix: "Wrap redis.get() in a try/catch and fall through to the API fetch on any cache error — degrade gracefully instead of crashing.",
        },
      ],
      safer_code: `async function getUserProfile(userId) {
  const cacheKey = \`user:\${userId}\`;

  // Degrade gracefully if Redis is unavailable
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch (cacheErr) {
    console.warn(\`Cache read failed for \${cacheKey}, falling back to API\`, cacheErr);
  }

  // Always check HTTP status before trusting the response body
  const response = await fetch(\`https://api.internal.com/users/\${userId}\`, {
    headers: { Authorization: \`Bearer \${process.env.INTERNAL_API_KEY}\` }
  });

  if (!response.ok) {
    throw new Error(\`API returned \${response.status} for user \${userId}\`);
  }

  const data = await response.json();

  // Only cache successful responses
  try {
    await redis.setex(cacheKey, 3600, JSON.stringify(data));
  } catch (cacheErr) {
    console.warn(\`Cache write failed for \${cacheKey}\`, cacheErr);
  }

  return data;
}`,
      tier: "pro",
      gated: true,
      gated_tier: "max",
    },
  },
  {
    prompt: "Build a function that charges a user's card and saves the order to the database",
    code: `async function chargeCardAndSaveOrder(userId, cartItems, paymentMethodId) {
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
}`,
    result: {
      risk_level: "RISKY",
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
    },
  },
];

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

export async function downloadReport(result: CodeAnalysisResult, _code: string, projectName?: string) {
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

  const BADGE_W = 28; // fixed width so text always starts at same column
  function sevBadge(sev: string, bx: number, by: number): number {
    const col = SEV_RGB[sev] ?? [100,100,120];
    const label = sev;
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...col);
    doc.setDrawColor(...col);
    doc.setLineWidth(0.3);
    doc.roundedRect(bx, by - 5, BADGE_W, 6.5, 1, 1, "S");
    doc.text(label, bx + BADGE_W / 2, by, { align: "center" });
    return BADGE_W + 4;
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
  if (projectName) {
    doc.setTextColor(200, 180, 255);
    doc.setFont("helvetica", "bold");
    doc.text(`Project: ${projectName}`, iconPng ? M + 16 : M, 33);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(130, 120, 160);
    doc.text(`Generated: ${now.toLocaleString()}`, iconPng ? M + 16 : M, 40);
  } else {
    doc.text(`Generated: ${now.toLocaleString()}`, iconPng ? M + 16 : M, 34);
  }
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
      const lines = doc.splitTextToSize(c, cW - 20);
      checkY(lines.length * 5 + 5);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(40, 100, 60);
      doc.text("[ ]", M + 4, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(55, 50, 80);
      doc.text(lines, M + 16, y);
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

export function RunAutomationForm({ onResult }: { onResult?: (result: CodeAnalysisResult, code: string, projectName?: string) => void }) {
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<CodeAnalysisResult | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [sessions, setSessions] = useState<Array<{ id: string; tier: string; used?: boolean }>>(() => {
    try {
      const raw = localStorage.getItem("asof_sessions");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
      const old = localStorage.getItem("stripe_session_id");
      if (old) return [{ id: old, tier: localStorage.getItem("purchased_tier") ?? "lite" }];
    } catch {}
    return [];
  });
  const [analysisId, setAnalysisId] = useState<number | null>(null);
  const [freeTrialAvailable, setFreeTrialAvailable] = useState<boolean | null>(null);
  const [showSaferCode, setShowSaferCode] = useState(false);
  const [showExampleResult, setShowExampleResult] = useState(false);
  const [isExampleLoaded, setIsExampleLoaded] = useState(false);
  const [exampleTier, setExampleTier] = useState<string | null>(null);
  const currentExampleRef = useRef<typeof EXAMPLES[number] | null>(null);
  const [ownerName, setOwnerName] = useState<string>("");
  const [upgradedFrom, setUpgradedFrom] = useState<string | null>(null);
  const [usedProjectNames, setUsedProjectNames] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("asof_project_names") ?? "[]"); } catch { return []; }
  });
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

  // Derived: first UNUSED queued session
  const paidSession = sessions.find(s => !s.used) ?? null;
  const paidSessionId = paidSession?.id ?? null;
  const paidSessionTier = (paidSession?.tier ?? "") as string;

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
      // Mark as used but keep the ID so past analyses remain visible in history
      const updated = prev.map(s => s.id === id ? { ...s, used: true } : s);
      localStorage.setItem("asof_sessions", JSON.stringify(updated));
      const nextUnused = updated.find(s => !s.used);
      if (nextUnused) localStorage.setItem("stripe_session_id", nextUnused.id);
      else { localStorage.removeItem("stripe_session_id"); localStorage.removeItem("purchased_tier"); }
      return updated;
    });
  }

  async function fetchUpgradedAnalysis(id: number, upgradeSessionId?: string) {
    const fp = getFingerprint();
    try {
      const params = new URLSearchParams({ fingerprint: fp });
      if (upgradeSessionId) params.set("upgradeSessionId", upgradeSessionId);
      const res = await fetch(`/api/analysis/${id}?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setUpgradedFrom(prev => result?.tier ?? prev ?? null);
        setResult(data);
        setAnalysisId(id);
        onResult?.(data, code);
        void queryClient.invalidateQueries({ queryKey: ['/api/code-analyses'] });
        toast({ title: "Upgrade applied!", description: `Now showing ${data.tier?.toUpperCase() ?? 'upgraded'} tier results.` });
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: "Upgrade load failed", description: err.message ?? "Could not load upgraded analysis. Please refresh and try again.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Upgrade load failed", description: "Network error — please refresh.", variant: "destructive" });
    }
  }

  const loadExample = () => {
    const pick = EXAMPLES[Math.floor(Math.random() * EXAMPLES.length)];
    currentExampleRef.current = pick;
    setCode(pick.code);
    setUserPrompt(pick.prompt);
    setExampleTier(pick.result.tier ?? null);
    setIsExampleLoaded(true);
    setResult(null);
    setShowExampleResult(false);
  };

  const showMockResult = () => {
    const ex = currentExampleRef.current;
    if (ex) onResult?.(ex.result, ex.code);
  };

  useEffect(() => {
    loadSessions();
    fetch(`/api/free-trial-status?fingerprint=${getFingerprint()}`)
      .then(r => r.json())
      .then(d => setFreeTrialAvailable(d.available))
      .catch(() => setFreeTrialAvailable(false));

    // Restore code/prompt the user typed before being redirected to Stripe
    const pendingCode = localStorage.getItem("asof_pending_code");
    const pendingPrompt = localStorage.getItem("asof_pending_prompt");
    if (pendingCode) {
      setCode(pendingCode);
      localStorage.removeItem("asof_pending_code");
    }
    if (pendingPrompt) {
      setUserPrompt(pendingPrompt);
      localStorage.removeItem("asof_pending_prompt");
    }

    // Check for pending upgrade (returned from Stripe after an upgrade payment)
    const raw = localStorage.getItem("pending_upgrade");
    if (raw) {
      try {
        const { analysisId: pendingId, sessionId: pendingSession } = JSON.parse(raw);
        localStorage.removeItem("pending_upgrade");
        if (pendingId) fetchUpgradedAnalysis(pendingId, pendingSession ?? undefined);
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
      if (!url || (!url.startsWith('https://checkout.stripe.com') && !url.includes('/verify?session_id=dev_test_'))) {
        throw new Error("Invalid payment URL received");
      }
      localStorage.setItem("asof_pending_code", code);
      localStorage.setItem("asof_pending_prompt", userPrompt);
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
    setUpgradedFrom(null);
    try {
      const body: any = { code, prompt: userPrompt || undefined, fingerprint: getFingerprint() };
      if (!asFree && paidSessionId) body.sessionId = paidSessionId;
      if (!asFree && ownerName.trim()) body.projectName = ownerName.trim();

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
      const savedProjectName = ownerName.trim() || undefined;
      if (paidSessionId && !asFree) {
        consumeSession(paidSessionId);
        // Save project name to used list and clear field
        if (savedProjectName) {
          const updated = [...usedProjectNames, savedProjectName.toLowerCase()];
          setUsedProjectNames(updated);
          localStorage.setItem("asof_project_names", JSON.stringify(updated));
          setOwnerName("");
        }
      }
      onResult?.(data, code, savedProjectName);
      void queryClient.invalidateQueries({ queryKey: ['/api/code-analyses'] });
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
    { label: "Summary", lite: true, pro: true, max: true },
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
            className="w-20 h-20 rounded-full border-2 border-yellow-400 bg-yellow-400/10 text-yellow-300 hover:bg-yellow-400/20 transition-all flex items-center justify-center text-center text-[9px] font-bold uppercase tracking-wide leading-snug shrink-0 px-1"
            style={{ wordBreak: "break-word" }}
          >
            <span>Test<br />It<br />Out</span>
          </button>
        </CardTitle>
        <p className="text-xs text-muted-foreground">Paste code from Cursor, Claude, ChatGPT, or any AI tool — ASOF finds every assumption it made. New here? Hit <span className="text-yellow-400 font-medium">Test It Out</span> to see a real example.</p>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {isExampleLoaded && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-orange-500/8 border border-orange-500/20">
            <Eye className="w-4 h-4 text-orange-300 shrink-0" />
            <p className="text-xs text-white/70 flex-1">Example loaded — scroll down or click below to see the result.</p>
            <button
              data-testid="button-see-example-result"
              onClick={showMockResult}
              className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-orange-500/15 hover:bg-orange-500/25 text-orange-300 border border-orange-500/25 transition-all shrink-0"
            >
              <Eye className="w-3 h-3" />
              See result
            </button>
          </div>
        )}

        {/* Code input — always visible */}
        <div className="space-y-2">
          <Label htmlFor="code-input" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            AI-Generated Code
            {isExampleLoaded && exampleTier && (
              <span className="text-yellow-400 font-black tracking-widest">
                {exampleTier.toUpperCase()}
              </span>
            )}
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
          <p className="text-[10px] text-white/30 leading-relaxed">
            Works with any AI-generated code — login systems, API routes, payment flows, database queries, webhooks, and more. ASOF reads what the AI silently assumed and tells you exactly what could break before you ship it.
          </p>
        </div>

        {/* Optional prompt — hidden until code is present */}
        {(isExampleLoaded || code.length > 0) && (
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
        )}

        {/* CTA area */}
        {freeTrialAvailable && !paidSessionId && (
          <Button
            data-testid="button-free-trial"
            onClick={() => runAnalysis(true)}
            disabled={isRunning || !code.trim()}
            className="w-full h-11 font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30"
          >
            {isRunning ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing...</> : <><Zap className="mr-2 h-4 w-4" />Analyze Free <span className="opacity-70 font-normal">(One Trial · 2 assumptions)</span></>}
          </Button>
        )}

        {paidSessionId && (
          <div className="space-y-2">
            {/* Required project name field */}
            {(() => {
              const isDuplicate = ownerName.trim() && usedProjectNames.includes(ownerName.trim().toLowerCase());
              return (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                    Project Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    data-testid="input-owner-name"
                    type="text"
                    value={ownerName}
                    onChange={e => setOwnerName(e.target.value)}
                    placeholder="e.g. Acme Auth Service, PayFlow v2…"
                    className={`w-full h-9 px-3 rounded-lg border text-sm text-white placeholder:text-white/25 focus:outline-none transition-colors ${isDuplicate ? "border-red-500/60 bg-red-950/20 focus:border-red-400" : "border-white/10 bg-white/5 focus:border-primary/50"}`}
                  />
                  {isDuplicate ? (
                    <p className="text-[9px] text-red-400">
                      You already analyzed a project with this name. Each run needs a unique project name (e.g. add a version or date).
                    </p>
                  ) : !ownerName.trim() ? (
                    <p className="text-[9px] text-white/35">
                      Use your actual project name — it appears on the PDF and helps track your audits.
                    </p>
                  ) : (
                    <p className="text-[9px] text-emerald-400/70">✓ Good to go</p>
                  )}
                  {usedProjectNames.length > 0 && (
                    <p className="text-[9px] text-white/20 truncate">
                      Previously analyzed: {usedProjectNames.map(n => n).join(", ")}
                    </p>
                  )}
                </div>
              );
            })()}
            <Button
              data-testid="button-analyze"
              onClick={() => runAnalysis(false)}
              disabled={isRunning || !code.trim() || !ownerName.trim() || !!usedProjectNames.includes(ownerName.trim().toLowerCase())}
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
                className="flex items-center w-full p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-left group gap-2"
              >
                <div className="p-1.5 rounded bg-white/10 shrink-0">{tier.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white">{tier.name}</p>
                  <p className="text-[9px] text-muted-foreground leading-tight">{tier.description}</p>
                </div>
                <span className="text-xs font-bold text-white shrink-0 ml-auto">{tier.price}</span>
              </button>
            ))}
            <div className="text-center pt-1 space-y-0.5">
              <p className="text-[9px] text-muted-foreground/60">Prices in USD · Stripe converts to your local currency at checkout</p>
              <Link data-testid="link-full-pricing" href="/pricing" className="text-[10px] text-muted-foreground hover:text-primary transition-colors">
                View full pricing comparison →
              </Link>
            </div>
          </div>
        )}

        {freeTrialAvailable && !paidSessionId && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 py-1">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[9px] text-muted-foreground uppercase tracking-widest">or pay for deeper analysis</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>
            <p className="text-[9px] text-muted-foreground/50 text-center -mt-1">Prices in USD · Stripe converts to your local currency at checkout</p>
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

            {/* Browser credit warning */}
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5 space-y-2">
              <div className="flex items-start gap-2.5">
                <span className="text-amber-400 shrink-0 mt-0.5">⚠</span>
                <p className="text-[9px] text-amber-200/70 leading-relaxed">
                  <span className="font-bold text-amber-300">Credits are stored in this browser only.</span> Clearing your cache or switching devices may lose them. We don't issue refunds — but email{" "}
                  <a
                    href={`mailto:Support@asofai.com?subject=Credit%20Restore%20Request&body=Name%3A%20${encodeURIComponent(ownerName || 'Not provided')}%0ASession%20ID(s)%3A%20${encodeURIComponent(sessions.map(s => s.id.replace(/__\d+$/, '')).filter((v, i, a) => a.indexOf(v) === i).join(', '))}`}
                    className="underline hover:text-amber-200"
                  >Support@asofai.com</a>{" "}
                  with proof of purchase and we'll restore your credits.
                </p>
              </div>
              {sessions.length > 0 && (
                <div className="pl-6 space-y-1">
                  <p className="text-[8px] text-amber-400/60 font-bold uppercase tracking-wider">Your Session ID{sessions.length > 1 ? "s" : ""} — save this for support:</p>
                  {sessions.map((s, i) => {
                    const rawId = s.id.replace(/__\d+$/, '');
                    const short = rawId.length > 24 ? rawId.slice(0, 12) + '…' + rawId.slice(-8) : rawId;
                    return (
                      <button
                        key={i}
                        onClick={() => { navigator.clipboard.writeText(rawId); }}
                        title="Click to copy"
                        className="flex items-center gap-1.5 font-mono text-[8px] text-amber-300/80 hover:text-amber-200 transition-colors"
                      >
                        <span>{short}</span>
                        <span className="text-amber-400/40 text-[7px]">{s.used ? "(used)" : `(${s.tier})`}</span>
                        <span className="text-amber-400/40 text-[7px]">📋</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
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

              {/* Upgrade confirmation banner */}
              {upgradedFrom && result?.tier && upgradedFrom !== result.tier && (
                <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[10px]">
                  <div className="flex items-center gap-2">
                    <ArrowUpCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-emerald-300 font-bold uppercase tracking-wider">
                      Upgraded: {upgradedFrom.toUpperCase()} → {result.tier.toUpperCase()}
                    </span>
                    <span className="text-emerald-400/60 normal-case font-normal">— new features unlocked below</span>
                  </div>
                  <button onClick={() => setUpgradedFrom(null)} className="text-emerald-400/40 hover:text-emerald-300 transition-colors font-bold text-[11px]">✕</button>
                </div>
              )}

              {/* Risk badge + summary */}
              <div className={`rounded-xl border p-4 space-y-3 ${risk.bg}`}>
                {/* Row 1: header */}
                <p className="text-[11px] font-bold uppercase tracking-widest text-white/50">Your Tier Includes:</p>

                {/* Section definitions */}
                {(() => {
                  const tier = result.tier ?? "free";
                  const hasPro = tier === "pro" || tier === "max";
                  const hasMax = tier === "max";
                  const sections = [
                    { label: "Summary", desc: "Overall risk verdict and why.", color: "text-sky-300 bg-sky-500/10 border-sky-500/30", included: true },
                    { label: "Assumptions", desc: `${(result.assumptions?.length ?? 0)} things the AI took for granted.`, color: "text-amber-300 bg-amber-500/10 border-amber-500/30", included: true },
                    { label: "What Could Break", desc: `${(result.risks?.length ?? 0)} real failure scenarios.`, color: "text-red-300 bg-red-500/10 border-red-500/30", included: true },
                    { label: "Verify Checklist", desc: "Steps to confirm before you ship.", color: "text-emerald-300 bg-emerald-500/10 border-emerald-500/30", included: hasPro },
                    { label: "Suggestions", desc: "Fix cards for each issue found.", color: "text-blue-300 bg-blue-500/10 border-blue-500/30", included: hasPro },
                    { label: "Safe Rewrite", desc: "A safer drop-in version of your code.", color: "text-purple-300 bg-purple-500/10 border-purple-500/30", included: hasMax },
                  ];
                  return (
                    <div className="space-y-1.5">
                      {sections.map((s) => (
                        <div key={s.label} className="flex items-start gap-2">
                          <span className={`shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${s.included ? s.color : "text-white/20 bg-white/5 border-white/10"}`}>
                            {s.label}
                          </span>
                          <span className={`text-[10px] leading-snug mt-0.5 ${s.included ? "text-white/60" : "text-white/25"}`}>
                            {s.included ? s.desc : "Locked — upgrade to unlock"}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Full analysis detail lives in the panel below */}
              {((result.assumptions?.length ?? 0) > 0 || (result.risks?.length ?? 0) > 0 || result.checks?.length || result.suggestions?.length || result.safer_code) && (
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

        <RotatingTip />
      </CardContent>
    </Card>
  );
}

const TIPS = [
  { emoji: "🎯", text: "Be specific — tell the AI what language, framework, and constraints you're working with before asking it to write code." },
  { emoji: "🚨", text: "Never trust AI-generated auth, payment, or permission code without a manual audit. These are the highest-risk areas." },
  { emoji: "🔄", text: "Ask the AI: 'What assumptions did you make writing this?' — it often surfaces hidden risks you can then check." },
  { emoji: "⚠️", text: "Check all imports — AI sometimes references packages that don't exist, are deprecated, or have breaking API changes." },
  { emoji: "💸", text: "Money-handling code needs idempotency keys, rollback logic, and atomic transactions. AI rarely includes these by default." },
  { emoji: "🕳️", text: "Test null and empty inputs — AI-generated code often skips edge-case validation on function arguments." },
  { emoji: "🔐", text: "Ask the AI to include error handling in the same prompt, not as a follow-up — it's harder to bolt on safely after the fact." },
  { emoji: "📦", text: "Paste the original prompt alongside the code — ASOF uses it to find assumptions the AI made based on what you asked for." },
  { emoji: "🧪", text: "AI code that works in dev can silently fail in production due to env differences, missing secrets, or different DB states." },
  { emoji: "🔁", text: "Race conditions are invisible in single-user tests. Always ask: what happens if two users hit this simultaneously?" },
  { emoji: "🌐", text: "API calls without timeouts will hang forever under load. Always specify timeout and retry behavior in your prompt." },
  { emoji: "🗄️", text: "Check that database queries use parameterized inputs — AI sometimes concatenates user input directly into SQL strings." },
];

function RotatingTip() {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * TIPS.length));
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex(i => (i + 1) % TIPS.length);
        setVisible(true);
      }, 400);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const tip = TIPS[index];

  return (
    <div className="mt-4 mx-1 mb-1 rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 min-h-[68px] flex items-start gap-3 transition-opacity duration-400"
      style={{ opacity: visible ? 1 : 0 }}>
      <span className="text-lg shrink-0 mt-0.5">{tip.emoji}</span>
      <div>
        <p className="text-[9px] font-bold uppercase tracking-widest text-primary/60 mb-0.5">Prompt tip</p>
        <p className="text-[11px] text-white/65 leading-relaxed">{tip.text}</p>
      </div>
    </div>
  );
}
