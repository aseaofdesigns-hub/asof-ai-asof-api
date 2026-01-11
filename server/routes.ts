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

  const explanation =
    lite.assumption_verdict === "INVALID"
      ? "Assumption invalidated based on provided signals."
      : lite.assumption_verdict === "CONFLICTED"
      ? "Signals conflict; assumption cannot be treated as reliably true without caveats."
      : lite.assumption_verdict === "VALID"
      ? "Signals support the assumption within the current context."
      : "Insufficient or inconclusive signals to validate the assumption.";

  return {
    ...lite,
    tier: "pro",
    explanation,
    evidence: normalizeEvidence(signals)
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
      : null
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
      
      if (session.payment_status === 'paid') {
        await storage.updatePaymentStatus(sessionId, 'paid');
        return res.json({ status: 'paid' });
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
        insight: `${result.assumption_verdict} (${tier.toUpperCase()})`,
        confidence: result.assumption_confidence
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

  return httpServer;
}
