import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { getUncachableStripeClient } from "./stripeClient";
import { sql } from "drizzle-orm";
import { db } from "./db";

type AsOfSignal = {
  source?: string;
  priority?: number;
  assertion?: string;
  confidence?: number;
  last_verified_at?: string;
};

type AsOfPayload = {
  type?: string;
  assumption?: string;
  claim?: string;
  dataset_name?: string;
  last_trained?: string;
  asof_check?: {
    freshness_window_seconds?: number;
    signals?: AsOfSignal[];
    recommended_actions?: string[];
    conflict_rules?: {
      mode?: string;
      resolution_strategy?: string;
    };
  };
};

function safeIsoNow() {
  return new Date().toISOString();
}

function parseIsoMs(iso?: string): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function recencyScore(lastVerifiedIso?: string, freshnessWindowSec: number = 604800): number {
  const ms = parseIsoMs(lastVerifiedIso);
  if (!ms) return 0.2;
  const ageSec = Math.max(0, (Date.now() - ms) / 1000);
  const r = 1 - ageSec / Math.max(1, freshnessWindowSec);
  return clamp01(Math.max(0.05, r));
}

function txt(s?: string) {
  return String(s ?? "").toLowerCase();
}

function has(assertion: string | undefined, re: RegExp) {
  return re.test(txt(assertion));
}

function extractAucDrop(assertion?: string): number | null {
  if (!assertion) return null;
  const nums = assertion.match(/0\.\d+/g);
  if (!nums || nums.length < 2) return null;
  const a = Number(nums[0]);
  const b = Number(nums[1]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return a - b;
}

function normalizeEvidence(signals: AsOfSignal[]) {
  return signals.map((s) => ({
    source: s.source ?? "unknown",
    assertion: s.assertion ?? "",
    last_verified_at: s.last_verified_at ?? null,
    priority: typeof s.priority === "number" ? s.priority : 0,
    signal_confidence: typeof s.confidence === "number" ? s.confidence : 0.5
  }));
}

function checkStaleness(payload: AsOfPayload, nowIso: string): {
  is_stale: boolean;
  stale_days?: number;
  stale_verdict?: "STALE";
} {
  const lastTrained = payload?.last_trained;
  if (!lastTrained) return { is_stale: false };
  const lastMs = parseIsoMs(lastTrained);
  if (!lastMs) return { is_stale: false };
  const ageDays = (Date.now() - lastMs) / (1000 * 60 * 60 * 24);
  const freshnessWindowSec = payload?.asof_check?.freshness_window_seconds ?? 604800;
  const freshnessWindowDays = freshnessWindowSec / 86400;
  if (ageDays > freshnessWindowDays) {
    return { is_stale: true, stale_days: Math.round(ageDays), stale_verdict: "STALE" };
  }
  return { is_stale: false };
}

function generateRemediation(
  verdict: "VALID" | "INVALID" | "CONFLICTED" | "UNKNOWN" | "STALE",
  type: string,
  payload: AsOfPayload,
  keyFindings: string[]
): {
  remediation_required: boolean;
  severity: "NONE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  steps: Array<{ step: number; action: string; detail: string; priority: "IMMEDIATE" | "SHORT_TERM" | "LONG_TERM" }>;
  estimated_fix_time: string;
  prevention_tips: string[];
} {
  if (verdict === "VALID") {
    return {
      remediation_required: false,
      severity: "NONE",
      steps: [],
      estimated_fix_time: "N/A",
      prevention_tips: [
        "Schedule regular validation checks to catch drift early",
        "Set freshness_window_seconds to match your data update frequency",
        "Monitor confidence scores over time for gradual degradation"
      ]
    };
  }

  if (verdict === "STALE") {
    const staleDays = checkStaleness(payload, new Date().toISOString()).stale_days ?? 0;
    return {
      remediation_required: true,
      severity: staleDays > 90 ? "CRITICAL" : staleDays > 30 ? "HIGH" : "MEDIUM",
      steps: [
        { step: 1, action: "Refresh your dataset", detail: `Data is ${staleDays} days old. Pull fresh data from your source immediately.`, priority: "IMMEDIATE" },
        { step: 2, action: "Update last_trained timestamp", detail: "After refreshing, update the last_trained field to the current ISO timestamp.", priority: "IMMEDIATE" },
        { step: 3, action: "Re-run validation", detail: "Submit a new validation request after refreshing to confirm VALID status.", priority: "SHORT_TERM" },
        { step: 4, action: "Set up automatic refresh schedule", detail: `Your freshness window is set to ${Math.round((payload?.asof_check?.freshness_window_seconds ?? 604800) / 86400)} days. Automate data refresh before this window expires.`, priority: "LONG_TERM" }
      ],
      estimated_fix_time: "1-4 hours depending on data pipeline",
      prevention_tips: [
        "Set up automated data refresh pipelines",
        "Add ASOF.ai validation as a pre-flight check before model inference",
        "Alert when data age exceeds 80% of your freshness window"
      ]
    };
  }

  if (verdict === "INVALID" && type === "dataset_validity") {
    const hasDrift = keyFindings.some(f => f.toLowerCase().includes("drift"));
    const hasAucDrop = keyFindings.some(f => f.toLowerCase().includes("auc"));
    return {
      remediation_required: true,
      severity: "CRITICAL",
      steps: [
        { step: 1, action: "Halt model inference immediately", detail: "Do not use this model for production decisions until revalidated. Flag all recent predictions as potentially unreliable.", priority: "IMMEDIATE" },
        ...(hasDrift ? [{ step: 2, action: "Investigate data drift source", detail: "Compare current feature distributions against training baseline. Use KL divergence or PSI scores to identify which features have drifted most.", priority: "IMMEDIATE" as const }] : []),
        ...(hasAucDrop ? [{ step: 2 + (hasDrift ? 1 : 0), action: "Analyze AUC degradation", detail: "Pull your confusion matrix and ROC curve for the current period vs baseline. Identify which classes are most affected.", priority: "IMMEDIATE" as const }] : []),
        { step: 3, action: "Retrain with recent data", detail: "Gather at least 3 months of recent labeled data. Retrain with a rolling window strategy to capture current patterns.", priority: "SHORT_TERM" },
        { step: 4, action: "Recalibrate decision thresholds", detail: "After retraining, re-optimize classification thresholds using recent validation data before deploying.", priority: "SHORT_TERM" },
        { step: 5, action: "Implement continuous monitoring", detail: "Set up weekly ASOF.ai validation checks and alert when AUC drops below your acceptable threshold.", priority: "LONG_TERM" }
      ],
      estimated_fix_time: "2-5 days for full retrain and validation",
      prevention_tips: [
        "Run weekly dataset validation checks via ASOF.ai API",
        "Set AUC drop threshold alerts at 0.05 (warning) and 0.10 (critical)",
        "Implement feature store versioning to track distribution changes",
        "Use champion/challenger model framework for gradual rollouts"
      ]
    };
  }

  if (verdict === "CONFLICTED" && type === "policy_claim") {
    return {
      remediation_required: true,
      severity: "HIGH",
      steps: [
        { step: 1, action: "Do not use this claim as a hard rule", detail: "Conflicting signals mean this policy cannot be stated as absolute fact. Avoid hardcoding this value in automated systems.", priority: "IMMEDIATE" },
        { step: 2, action: "Identify the authoritative source", detail: "Review your signals and determine which source has the highest priority and most recent verification. Use the winning_signal field from Max tier to guide this.", priority: "IMMEDIATE" },
        { step: 3, action: "Replace with a range or conditional statement", detail: "Instead of 'delivery takes 1-3 days', use 'delivery typically takes 1-3 days but may take up to 6 days depending on conditions'.", priority: "SHORT_TERM" },
        { step: 4, action: "Escalate to source owners", detail: "Contact the owners of the conflicting sources to reconcile the discrepancy and establish a single authoritative version.", priority: "SHORT_TERM" },
        { step: 5, action: "Re-validate after reconciliation", detail: "Once sources are aligned, re-submit to ASOF.ai to confirm the conflict is resolved.", priority: "LONG_TERM" }
      ],
      estimated_fix_time: "1-3 days to reconcile sources",
      prevention_tips: [
        "Assign priority scores to your signal sources based on authority",
        "Establish a single source of truth for each policy claim",
        "Schedule monthly policy validation checks via ASOF.ai",
        "Document the authoritative source for each critical policy"
      ]
    };
  }

  if (verdict === "UNKNOWN") {
    return {
      remediation_required: true,
      severity: "MEDIUM",
      steps: [
        { step: 1, action: "Provide more signals", detail: "ASOF.ai needs at least 2-3 specific signals to reach a verdict. Add more data points to your asof_check.signals array.", priority: "IMMEDIATE" },
        { step: 2, action: "Make assertions more specific", detail: "Vague assertions like 'data might be off' cannot be evaluated. Use specific metrics: 'AUC dropped from 0.87 to 0.71' or 'data drift exceeds 0.15 threshold'.", priority: "IMMEDIATE" },
        { step: 3, action: "Add last_verified_at timestamps", detail: "Include last_verified_at on each signal so ASOF.ai can factor in recency when scoring.", priority: "SHORT_TERM" },
        { step: 4, action: "Upgrade to Pro or Max tier", detail: "Higher tiers use weighted scoring and conflict detection that can often reach a verdict from signals that Lite cannot evaluate.", priority: "SHORT_TERM" }
      ],
      estimated_fix_time: "30 minutes to improve signal quality",
      prevention_tips: [
        "Always include at least 3 signals per validation request",
        "Use specific numeric thresholds in assertions",
        "Assign priority scores (0-100) to rank signal importance",
        "Include last_verified_at on all signals for recency scoring"
      ]
    };
  }

  return { remediation_required: false, severity: "NONE", steps: [], estimated_fix_time: "N/A", prevention_tips: [] };
}

function evaluateLite(payload: AsOfPayload, nowIso: string) {
  const type = payload?.type ?? "unknown";
  const asof = payload?.asof_check ?? {};
  const signals = Array.isArray(asof.signals) ? asof.signals : [];

  let assumption_verdict: "VALID" | "INVALID" | "CONFLICTED" | "UNKNOWN" | "STALE" = "UNKNOWN";
  let assumption_confidence = 0.5;

  if (type === "dataset_validity") {
    const drift = signals.some((s) => has(s.assertion, /drift/) && has(s.assertion, /exceed|threshold/));
    const aucDrop = signals.map((s) => extractAucDrop(s.assertion)).find((d) => typeof d === "number") ?? null;
    const bigAucDrop = typeof aucDrop === "number" && aucDrop >= 0.10;

    if (drift || bigAucDrop) {
      assumption_verdict = "INVALID";
      assumption_confidence = 0.78;
    } else if (signals.length) {
      assumption_verdict = "VALID";
      assumption_confidence = 0.62;
    }
  }

  if (type === "policy_claim") {
    const fixed = signals.some((s) => has(s.assertion, /\b1\s*[-–]?\s*3\b|\b1\s*to\s*3\b/));
    const exceed = signals.some((s) => has(s.assertion, /vary|exceed|more than|longer|4\s*[-–]?\s*6|4\s*to\s*6/));
    if (fixed && exceed) {
      assumption_verdict = "CONFLICTED";
      assumption_confidence = 0.7;
    } else if (fixed) {
      assumption_verdict = "VALID";
      assumption_confidence = 0.6;
    }
  }

  return {
    tier: "lite",
    assumption_verdict,
    assumption_confidence,
    timestamp: nowIso
  };
}

function evaluatePro(payload: AsOfPayload, nowIso: string) {
  const asof = payload?.asof_check ?? {};
  const signals = Array.isArray(asof.signals) ? asof.signals : [];
  const lite = evaluateLite(payload, nowIso);

  const stalenessCheck = checkStaleness(payload, nowIso);
  const verdict = stalenessCheck.is_stale ? "STALE" as const : lite.assumption_verdict;
  const confidence = stalenessCheck.is_stale ? 0.95 : lite.assumption_confidence;

  const explanation =
    verdict === "STALE"
      ? `Data is ${stalenessCheck.stale_days} days old, exceeding the freshness window. Treat as unreliable until refreshed.`
      : verdict === "INVALID"
      ? "Assumption invalidated based on provided signals."
      : verdict === "CONFLICTED"
      ? "Signals conflict; assumption cannot be treated as reliably true without caveats."
      : verdict === "VALID"
      ? "Signals support the assumption within the current context."
      : "Insufficient or inconclusive signals to validate the assumption.";

  const remediation = generateRemediation(verdict, payload?.type ?? "unknown", payload, []);

  return {
    ...lite,
    tier: "pro",
    assumption_verdict: verdict,
    assumption_confidence: confidence,
    explanation,
    evidence: normalizeEvidence(signals),
    remediation,
    ...(stalenessCheck.is_stale ? { stale_days: stalenessCheck.stale_days } : {})
  };
}

function evaluateMax(payload: AsOfPayload, nowIso: string) {
  const type = payload?.type ?? "unknown";
  const asof = payload?.asof_check ?? {};
  const signals = Array.isArray(asof.signals) ? asof.signals : [];
  const freshnessWindowSec = typeof asof.freshness_window_seconds === "number" ? asof.freshness_window_seconds : 604800;

  const evidence = normalizeEvidence(signals);

  const scored = evidence.map((s) => {
    const priority = typeof s.priority === "number" ? s.priority : 0;
    const conf = typeof s.signal_confidence === "number" ? s.signal_confidence : 0.5;
    const rec = recencyScore(s.last_verified_at ?? undefined, freshnessWindowSec);
    const weight = 0.6 * (priority / 100) + 0.4 * rec;
    const score = weight * conf;
    return { ...s, recency: rec, weight, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const winner = scored[0];
  const runnerUp = scored[1];
  const separation = runnerUp ? winner.score - runnerUp.score : winner?.score ?? 0;

  let assumption_verdict: "VALID" | "INVALID" | "CONFLICTED" | "UNKNOWN" | "STALE" = "UNKNOWN";
  let risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "MEDIUM";
  let key_findings: string[] = [];
  let recommended_actions: string[] = Array.isArray(asof.recommended_actions) ? asof.recommended_actions : [];
  const conflicts: Array<{ between: string[]; type: string; detail: string }> = [];

  const top2 = scored.slice(0, 2);
  const signal_confidence =
    top2.length
      ? clamp01(
          top2.reduce((acc, s) => acc + s.signal_confidence * (s.weight || 0.5), 0) /
            top2.reduce((acc, s) => acc + (s.weight || 0.5), 0)
        )
      : 0.5;

  if (type === "dataset_validity") {
    const driftHit = scored.find((s) => has(s.assertion, /drift/) && has(s.assertion, /exceed|threshold/));
    const aucSignal = scored.find((s) => has(s.assertion, /auc/));
    const aucDrop = aucSignal ? extractAucDrop(aucSignal.assertion) : null;
    const bigAucDrop = typeof aucDrop === "number" && aucDrop >= 0.10;

    if (driftHit || bigAucDrop) {
      assumption_verdict = "INVALID";
      risk_level = "CRITICAL";
      key_findings = [
        driftHit ? "Data drift exceeds threshold" : null,
        bigAucDrop ? `AUC drop >= 0.10 detected (${aucDrop?.toFixed(2)})` : null
      ].filter(Boolean) as string[];

      if (!recommended_actions.length) {
        recommended_actions = ["RETRAIN_MODEL", "REVIEW_FEATURE_PIPELINE", "RECALIBRATE_THRESHOLDS"];
      }
    } else if (signals.length) {
      assumption_verdict = "VALID";
      risk_level = "MEDIUM";
      key_findings = ["No strong degradation indicators detected in provided signals."];
      if (!recommended_actions.length) recommended_actions = ["MONITOR"];
    }
  }

  if (type === "policy_claim") {
    const fixed = scored.some((s) =>
      /\b1\s*(?:-|–|to)\s*3\b/.test(txt(s.assertion)) ||
      /\b1\s*[-–]\s*3\b/.test(txt(s.assertion))
    );

    const exceeds = scored.some((s) =>
      /vary|varies|exceed|exceeds|more than|longer|delays|4\s*(?:-|–|to)\s*6/.test(txt(s.assertion))
    );

    if (fixed && exceeds) {
      assumption_verdict = "CONFLICTED";
      risk_level = "HIGH";

      key_findings = [
        "Conflicting signals: service standard suggests a fixed window, but other sources indicate delivery can exceed that window."
      ];

      conflicts.push({
        between: ["fixed_timeframe", "variability_or_delay"],
        type: "assertion_conflict",
        detail:
          "At least one signal claims a fixed delivery window (e.g., 1-3 days) while another indicates variability or exceeding 3 days (e.g., 4-6 days)."
      });

      if (!recommended_actions.length) {
        recommended_actions = ["AVOID_HARDCODING", "USE_RANGE_WITH_CAVEATS"];
      }
    } else if (fixed) {
      assumption_verdict = "VALID";
      risk_level = "MEDIUM";
      key_findings = ["Signals support a service standard delivery window, but exceptions may apply."];
      if (!recommended_actions.length) recommended_actions = ["ADD_CAVEATS", "MONITOR"];
    } else {
      assumption_verdict = "UNKNOWN";
      risk_level = "MEDIUM";
      key_findings = ["No clear service-standard window detected in provided signals."];
      if (!recommended_actions.length) recommended_actions = ["PROVIDE_BETTER_SIGNALS"];
    }
  }

  let assumption_confidence = clamp01(0.55 + (winner?.score ?? 0) * 0.35 + separation * 0.3);
  if (assumption_verdict === "CONFLICTED") {
    assumption_confidence = Math.min(0.65, assumption_confidence * 0.75);
  }
  if (assumption_verdict === "UNKNOWN") assumption_confidence = 0.5;

  const explanation =
    assumption_verdict === "INVALID"
      ? "Assumption invalidated by high-priority, recent signals indicating degradation."
      : assumption_verdict === "CONFLICTED"
      ? "Signals conflict; highest-priority sources do not fully agree on the claim."
      : assumption_verdict === "VALID"
      ? "Signals support the assumption with acceptable priority/recency/confidence."
      : "Insufficient matching rules or signals to reach a confident verdict.";

  return {
    tier: "max",
    assumption_verdict,
    assumption_confidence: Number(assumption_confidence.toFixed(3)),
    timestamp: nowIso,
    explanation,
    evidence,
    signal_confidence: Number(signal_confidence.toFixed(3)),
    risk_level,
    key_findings,
    recommended_actions,
    conflicts,
    winning_signal: winner
      ? {
          source: winner.source,
          score: Number(winner.score.toFixed(3)),
          reason: `Highest weighted score (priority=${winner.priority}, recency=${winner.recency.toFixed(
            2
          )}, confidence=${winner.signal_confidence}). Separation from runner-up: ${Number(separation.toFixed(3))}`
        }
      : null,
    remediation: generateRemediation(assumption_verdict, type, payload, key_findings),
    ...(checkStaleness(payload, nowIso).is_stale ? { stale_days: checkStaleness(payload, nowIso).stale_days } : {})
  };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.post(api.payments.create.path, async (req, res) => {
    try {
      const stripe = await getUncachableStripeClient();
      const { tier } = api.payments.create.input.parse(req.body);

      
      // Live Stripe price IDs - fallback if database sync hasn't happened
      const livePriceIds: Record<string, { price_id: string; unit_amount: number }> = {
        lite: { price_id: 'price_1SnuQmAGtLlBc3WPf2LwcpRH', unit_amount: 50 },
        pro: { price_id: 'price_1SnuQnAGtLlBc3WP0kv4feWH', unit_amount: 100 },
        max: { price_id: 'price_1SnuQnAGtLlBc3WPMh06ap1f', unit_amount: 250 },
      };

      let price_id: string;
      let unit_amount: number;

      try {
        const result = await db.execute(
          sql`SELECT p.id as product_id, pr.id as price_id, p.name, pr.unit_amount
              FROM stripe.products p
              JOIN stripe.prices pr ON pr.product = p.id
              WHERE p.metadata->>'tier' = ${tier}
              AND p.active = true
              AND pr.active = true
              ORDER BY p.id DESC
              LIMIT 1`
        );

        if (result.rows.length > 0) {
          const row = result.rows[0] as any;
          price_id = row.price_id;
          unit_amount = row.unit_amount;
        } else {
          // Use fallback
          const fallback = livePriceIds[tier];
          if (!fallback) {
            return res.status(404).json({ message: `No price found for tier: ${tier}` });
          }
          price_id = fallback.price_id;
          unit_amount = fallback.unit_amount;
          console.log(`Using fallback price for tier ${tier}: ${price_id}`);
        }
      } catch (dbErr) {
        // Database query failed, use fallback
        console.log('Database query failed, using fallback prices:', dbErr);
        const fallback = livePriceIds[tier];
        if (!fallback) {
          return res.status(404).json({ message: `No price found for tier: ${tier}` });
        }
        price_id = fallback.price_id;
        unit_amount = fallback.unit_amount;
      }

      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers.host || req.headers.origin?.replace(/^https?:\/\//, '');
      const baseUrl = req.headers.origin || `${protocol}://${host}`;

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price: price_id,
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${baseUrl}/verify?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/`,
        metadata: {
          tier: tier
        }
      });

      await storage.createPayment({
        stripeSessionId: session.id,
        amount: unit_amount as number,
        tier: tier
      });

      res.json({ url: session.url });
    } catch (err) {
      console.error('Payment creation error:', err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid tier" });
      }
      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });

  app.get(api.payments.verify.path, async (req, res) => {
    const { sessionId } = req.params;

    try {
      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      const payment = await storage.getPaymentBySessionId(sessionId);

      if (session.payment_status === 'paid') {
        await storage.updatePaymentStatus(sessionId, 'paid');
        return res.json({
          status: 'paid',
          tier: payment?.tier ?? null,
          amount: payment?.amount ?? null,
        });
      }
      res.json({ status: session.payment_status });
    } catch (err) {
      console.error('Payment verification error:', err);
      res.status(404).json({ message: "Session not found" });
    }
  });

  app.post(api.automation.run.path, async (req, res) => {
    try {
      const { agent_id, payload, sessionId } = api.automation.run.input.parse(req.body);

      const payment = await storage.getPaymentBySessionId(sessionId);
      if (!payment || payment.status !== 'paid') {
        return res.status(401).json({ message: "Payment required to run automation" });
      }
      if (payment.consumed) {
        return res.status(401).json({ message: "This session has already been used. Please purchase a new validation." });
      }
      const tier = payment.tier as "lite" | "pro" | "max";
      const nowIso = safeIsoNow();

      let result: any;
      if (tier === "max") {
        result = evaluateMax(payload as any, nowIso);
      } else if (tier === "pro") {
        result = evaluatePro(payload as any, nowIso);
      } else {
        result = evaluateLite(payload as any, nowIso);
      }

      await storage.createSignal({
        agentId: agent_id,
        payload: payload,
        insight: `${result.assumption_verdict ?? 'UNKNOWN'} (${tier.toUpperCase()})`,
        confidence: result.assumption_confidence ?? 0.5
      });

      await storage.markSessionConsumed(sessionId);

      return res.json({ success: true, data: result });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.get(api.automation.list.path, async (req, res) => {
    const list = await storage.getSignals();
    res.json(list);
  });

  app.post('/api/preflight', async (req, res) => {
    try {
      const { assumption, context, urgency = "normal" } = req.body;
      if (!assumption) {
        return res.status(400).json({ message: "assumption is required" });
      }
      const a = assumption.toLowerCase();
      const redFlags = [
        { pattern: /stale|old|outdated|expired|last year|last month/, flag: "potentially_stale" },
        { pattern: /might|maybe|possibly|could be|not sure/, flag: "low_confidence" },
        { pattern: /conflict|disagree|different source|another source/, flag: "conflict_detected" },
        { pattern: /auc|accuracy|precision|recall|f1/, flag: "model_metric_check_needed" },
        { pattern: /drift|distribution|shift/, flag: "drift_check_needed" },
      ];
      const flagged = redFlags.filter(r => r.pattern.test(a)).map(r => r.flag);
      const safe = flagged.length === 0;
      return res.json({
        preflight: safe ? "CLEAR" : "REVIEW_RECOMMENDED",
        flags: flagged,
        confidence: safe ? 0.85 : 0.45,
        recommendation: safe
          ? "Assumption appears safe to act on. For higher confidence, run a full validation."
          : `${flagged.length} concern(s) detected. Run a full ASOF.ai validation before acting.`,
        upgrade_prompt: !safe
          ? {
              message: "Get a full verdict with remediation steps",
              tiers: [
                { name: "Lite", price: "$0.50", features: ["Verdict", "Confidence score"] },
                { name: "Pro", price: "$1.00", features: ["Verdict", "Explanation", "Remediation steps"] },
                { name: "Max", price: "$2.50", features: ["Full analysis", "Conflict detection", "Risk level", "Complete remediation plan"] }
              ]
            }
          : null,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      res.status(500).json({ message: "Preflight check failed" });
    }
  });

  function isSafeWebhookUrl(raw: string): boolean {
    let parsed: URL;
    try { parsed = new URL(raw); } catch { return false; }
    if (parsed.protocol !== "https:") return false;
    const hostname = parsed.hostname.toLowerCase();
    const privatePatterns = [
      /^localhost$/,
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2\d|3[01])\./,
      /^192\.168\./,
      /^0\./,
      /^::1$/,
      /^fc00:/,
      /^fe80:/,
      /\.local$/,
      /\.internal$/,
    ];
    return !privatePatterns.some(p => p.test(hostname));
  }

  app.post('/api/monitor', async (req, res) => {
    try {
      const { agent_id, payload, webhook_url, check_interval_hours = 24 } = req.body;
      if (!agent_id || !payload) {
        return res.status(400).json({ message: "agent_id and payload required" });
      }
      if (webhook_url !== undefined && webhook_url !== null) {
        if (typeof webhook_url !== "string" || !isSafeWebhookUrl(webhook_url)) {
          return res.status(400).json({ message: "webhook_url must be a valid public HTTPS URL" });
        }
      }
      const parsedInterval = Number(check_interval_hours);
      if (!Number.isFinite(parsedInterval) || parsedInterval < 0.25 || parsedInterval > 8760) {
        return res.status(400).json({ message: "check_interval_hours must be between 0.25 and 8760" });
      }
      const nowIso = safeIsoNow();
      const result = evaluateMax(payload, nowIso);
      if (webhook_url && result.assumption_verdict !== "VALID") {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
          await fetch(webhook_url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              alert: true,
              agent_id,
              verdict: result.assumption_verdict,
              confidence: result.assumption_confidence,
              risk_level: result.risk_level,
              remediation: result.remediation,
              timestamp: nowIso
            }),
            signal: controller.signal
          });
          clearTimeout(timeout);
        } catch (webhookErr) {
          console.warn("Webhook delivery failed:", webhookErr);
        }
      }
      return res.json({
        success: true,
        monitor_id: `mon_${agent_id}_${Date.now()}`,
        immediate_result: result,
        monitoring: {
          active: true,
          check_interval_hours: parsedInterval,
          webhook_url: webhook_url ?? null,
          next_check: new Date(Date.now() + parsedInterval * 3600000).toISOString()
        }
      });
    } catch (err) {
      res.status(500).json({ message: "Failed to create monitor" });
    }
  });

  return httpServer;
}
