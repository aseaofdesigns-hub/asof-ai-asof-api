import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { getUncachableStripeClient } from "./stripeClient";
import { sql } from "drizzle-orm";
import { db } from "./db";

type Verdict = "VALID" | "INVALID" | "CONFLICTED" | "UNKNOWN" | "STALE";
type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

interface Signal {
  source?: string;
  assertion?: string;
  last_verified_at?: string;
  priority?: number;
  confidence?: number;
  name?: string;
  value?: any;
  weight?: number;
}

interface BaseResult {
  assumption_verdict: Verdict;
  assumption_confidence: number;
  timestamp: string;
}

interface LiteResult extends BaseResult {
  tier: "lite";
}

interface EvidenceItem {
  source: string;
  assertion: string;
  last_verified_at: string;
  priority: number;
  signal_confidence: number;
}

interface ProResult extends BaseResult {
  tier: "pro";
  explanation: string;
  evidence: EvidenceItem[];
}

interface MaxResult extends BaseResult {
  tier: "max";
  explanation: string;
  evidence: EvidenceItem[];
  signal_confidence: number;
  risk_level: RiskLevel;
  key_findings: string[];
  recommended_actions: string[];
  conflicts: Array<{ signal_a: string; signal_b: string; description: string }>;
  winning_signal: { source: string; score: number; reason: string } | null;
}

function calculateRecencyScore(lastVerifiedAt: string | undefined, freshnessWindowSeconds: number = 86400): number {
  if (!lastVerifiedAt) return 0.5;
  const verifiedTime = new Date(lastVerifiedAt).getTime();
  const now = Date.now();
  const ageSeconds = (now - verifiedTime) / 1000;
  if (ageSeconds <= 0) return 1.0;
  if (ageSeconds >= freshnessWindowSeconds) return 0.0;
  return 1.0 - (ageSeconds / freshnessWindowSeconds);
}

function extractSignals(payload: any): Signal[] {
  const signals: Signal[] = [];
  if (payload?.asof_check?.signals) {
    signals.push(...payload.asof_check.signals);
  }
  if (payload?.asof?.signals) {
    signals.push(...payload.asof.signals);
  }
  if (payload?.signals) {
    signals.push(...payload.signals);
  }
  return signals;
}

function detectDatasetInvalidity(signals: Signal[]): { invalid: boolean; reasons: string[] } {
  const reasons: string[] = [];
  for (const sig of signals) {
    const assertion = (sig.assertion || sig.value?.toString() || "").toLowerCase();
    if (assertion.includes("drift") && assertion.includes("exceeds threshold")) {
      reasons.push("Data drift exceeds threshold");
    }
    const aucMatch = assertion.match(/(\d+\.?\d*)\s*→\s*(\d+\.?\d*)/);
    if (aucMatch) {
      const before = parseFloat(aucMatch[1]);
      const after = parseFloat(aucMatch[2]);
      if (before - after >= 0.10) {
        reasons.push(`AUC drop detected: ${before} → ${after}`);
      }
    }
  }
  return { invalid: reasons.length > 0, reasons };
}

function detectPolicyConflict(signals: Signal[]): { conflicted: boolean; conflicts: Array<{ signal_a: string; signal_b: string; description: string }> } {
  const conflicts: Array<{ signal_a: string; signal_b: string; description: string }> = [];
  const fixedRangePatterns = [/\d+\s*[-–]\s*\d+\s*days?/i, /within\s+\d+\s*days?/i];
  const variablePatterns = [/varies/i, /can exceed/i, /up to/i, /4\s*[-–]\s*6\s*days?/i, /may take longer/i];
  
  const fixedSignals: Signal[] = [];
  const variableSignals: Signal[] = [];
  
  for (const sig of signals) {
    const assertion = sig.assertion || sig.value?.toString() || "";
    const isFixed = fixedRangePatterns.some(p => p.test(assertion));
    const isVariable = variablePatterns.some(p => p.test(assertion));
    if (isFixed) fixedSignals.push(sig);
    if (isVariable) variableSignals.push(sig);
  }
  
  for (const fixed of fixedSignals) {
    for (const variable of variableSignals) {
      conflicts.push({
        signal_a: fixed.source || fixed.name || "signal_fixed",
        signal_b: variable.source || variable.name || "signal_variable",
        description: `Fixed range "${fixed.assertion || fixed.value}" conflicts with variable "${variable.assertion || variable.value}"`
      });
    }
  }
  
  return { conflicted: conflicts.length > 0, conflicts };
}

function checkStaleness(payload: any, nowIso: string): boolean {
  const freshness = payload?.asof_check?.freshness || payload?.asof?.freshness;
  if (!freshness?.stale_after) return false;
  const staleAfter = new Date(freshness.stale_after).getTime();
  const now = new Date(nowIso).getTime();
  return now > staleAfter;
}

function computeSignalScores(signals: Signal[], freshnessWindowSeconds: number = 86400) {
  return signals.map((sig, idx) => {
    const priority = sig.priority || Math.round((sig.weight || 0.5) * 100);
    const recencyScore = calculateRecencyScore(sig.last_verified_at, freshnessWindowSeconds);
    const signalConf = sig.confidence || sig.weight || 0.8;
    const weight = 0.6 * (priority / 100) + 0.4 * recencyScore;
    const score = weight * signalConf;
    return {
      source: sig.source || sig.name || `signal_${idx + 1}`,
      priority,
      recencyScore,
      signalConf,
      weight,
      score
    };
  }).sort((a, b) => b.score - a.score);
}

function deriveConfidenceFromScores(scoredSignals: ReturnType<typeof computeSignalScores>, verdict: Verdict): number {
  if (scoredSignals.length === 0) return 0.5;
  
  const topScore = scoredSignals[0].score;
  const runnerUpScore = scoredSignals[1]?.score || 0;
  const separation = topScore - runnerUpScore;
  
  let confidence = Math.min(0.95, topScore + (separation * 0.2));
  
  if (verdict === "CONFLICTED" || verdict === "STALE") {
    confidence = Math.min(confidence, 0.6);
  }
  if (verdict === "UNKNOWN") {
    confidence = Math.min(confidence, 0.5);
  }
  
  return parseFloat(confidence.toFixed(3));
}

function evaluateLite(payload: any, nowIso: string): LiteResult {
  const signals = extractSignals(payload);
  const payloadType = payload?.type || payload?.asof_check?.type || "unknown";
  const freshnessWindow = payload?.asof_check?.freshness?.max_age_seconds || payload?.asof?.freshness?.max_age_seconds || 86400;
  
  let verdict: Verdict = "UNKNOWN";
  
  if (checkStaleness(payload, nowIso)) {
    verdict = "STALE";
  } else if (payloadType === "dataset_validity") {
    const { invalid } = detectDatasetInvalidity(signals);
    if (invalid) {
      verdict = "INVALID";
    } else if (signals.length > 0) {
      verdict = "VALID";
    }
  } else if (payloadType === "policy_claim") {
    const { conflicted } = detectPolicyConflict(signals);
    if (conflicted) {
      verdict = "CONFLICTED";
    } else if (signals.length > 0) {
      verdict = "VALID";
    }
  } else if (signals.length > 0) {
    verdict = "VALID";
  }
  
  const scoredSignals = computeSignalScores(signals, freshnessWindow);
  const confidence = deriveConfidenceFromScores(scoredSignals, verdict);
  
  return {
    tier: "lite",
    assumption_verdict: verdict,
    assumption_confidence: confidence,
    timestamp: nowIso
  };
}

function evaluatePro(payload: any, nowIso: string): ProResult {
  const liteResult = evaluateLite(payload, nowIso);
  const signals = extractSignals(payload);
  
  const evidence: EvidenceItem[] = signals.map((sig, idx) => ({
    source: sig.source || sig.name || `signal_${idx + 1}`,
    assertion: sig.assertion || (typeof sig.value === 'string' ? sig.value : JSON.stringify(sig.value)) || "No assertion",
    last_verified_at: sig.last_verified_at || nowIso,
    priority: sig.priority || Math.round((sig.weight || 0.5) * 100),
    signal_confidence: sig.confidence || sig.weight || 0.8
  }));
  
  let explanation = "";
  if (liteResult.assumption_verdict === "STALE") {
    explanation = "The data has exceeded its freshness window and should be re-verified before relying on it.";
  } else if (liteResult.assumption_verdict === "INVALID") {
    const { reasons } = detectDatasetInvalidity(signals);
    explanation = `Assumption invalidated: ${reasons.join("; ")}. Signals indicate the underlying data or model has degraded.`;
  } else if (liteResult.assumption_verdict === "CONFLICTED") {
    explanation = "Multiple signals provide contradictory information. Manual review recommended before proceeding.";
  } else if (liteResult.assumption_verdict === "VALID") {
    explanation = `Signals verified against ${evidence.length} source(s). All indicators consistent with the stated assumption.`;
  } else {
    explanation = "Insufficient signal data to make a definitive determination.";
  }
  
  return {
    tier: "pro",
    assumption_verdict: liteResult.assumption_verdict,
    assumption_confidence: liteResult.assumption_confidence,
    timestamp: liteResult.timestamp,
    explanation,
    evidence
  };
}

function evaluateMax(payload: any, nowIso: string): MaxResult {
  const proResult = evaluatePro(payload, nowIso);
  const signals = extractSignals(payload);
  const payloadType = payload?.type || payload?.asof_check?.type || "unknown";
  const freshnessWindow = payload?.asof_check?.freshness?.max_age_seconds || payload?.asof?.freshness?.max_age_seconds || 86400;
  
  const scoredSignals = signals.map((sig, idx) => {
    const priority = sig.priority || Math.round((sig.weight || 0.5) * 100);
    const recencyScore = calculateRecencyScore(sig.last_verified_at, freshnessWindow);
    const signalConf = sig.confidence || sig.weight || 0.8;
    const weight = 0.6 * (priority / 100) + 0.4 * recencyScore;
    const score = weight * signalConf;
    return {
      source: sig.source || sig.name || `signal_${idx + 1}`,
      priority,
      recencyScore,
      signalConf,
      weight,
      score
    };
  });
  
  scoredSignals.sort((a, b) => b.score - a.score);
  
  const avgSignalConfidence = scoredSignals.length > 0
    ? scoredSignals.reduce((sum, s) => sum + s.signalConf, 0) / scoredSignals.length
    : 0.5;
  
  let winningSignal: { source: string; score: number; reason: string } | null = null;
  if (scoredSignals.length > 0) {
    const top = scoredSignals[0];
    const runnerUp = scoredSignals[1];
    const separation = runnerUp ? (top.score - runnerUp.score).toFixed(3) : "N/A";
    winningSignal = {
      source: top.source,
      score: parseFloat(top.score.toFixed(3)),
      reason: `Highest weighted score (priority=${top.priority}, recency=${top.recencyScore.toFixed(2)}, confidence=${top.signalConf}). Separation from runner-up: ${separation}`
    };
  }
  
  let riskLevel: RiskLevel = "LOW";
  const keyFindings: string[] = [];
  let recommendedActions: string[] = [];
  const conflicts: Array<{ signal_a: string; signal_b: string; description: string }> = [];
  
  if (proResult.assumption_verdict === "STALE") {
    riskLevel = "HIGH";
    keyFindings.push("Data has exceeded freshness threshold");
    recommendedActions = ["REFRESH_DATA_SOURCES", "RE_VALIDATE_ASSUMPTIONS"];
  } else if (payloadType === "dataset_validity") {
    const { invalid, reasons } = detectDatasetInvalidity(signals);
    if (invalid) {
      riskLevel = "CRITICAL";
      keyFindings.push(...reasons);
      recommendedActions = payload?.asof_check?.recommended_actions || 
        ["RETRAIN_MODEL", "REVIEW_FEATURE_PIPELINE", "RECALIBRATE_THRESHOLDS"];
    } else {
      keyFindings.push("All dataset validity signals within acceptable bounds");
      recommendedActions = ["CONTINUE_MONITORING", "SCHEDULE_NEXT_VALIDATION"];
    }
  } else if (payloadType === "policy_claim") {
    const conflictResult = detectPolicyConflict(signals);
    if (conflictResult.conflicted) {
      riskLevel = "HIGH";
      conflicts.push(...conflictResult.conflicts);
      keyFindings.push(`${conflictResult.conflicts.length} signal conflict(s) detected`);
      recommendedActions = ["AVOID_HARDCODING", "USE_RANGE_WITH_CAVEATS", "CONSULT_AUTHORITATIVE_SOURCE"];
    } else {
      keyFindings.push("Policy signals are consistent");
      recommendedActions = ["PROCEED_WITH_STATED_POLICY"];
    }
  } else {
    if (signals.length === 0) {
      keyFindings.push("No signals provided for evaluation");
      riskLevel = "MEDIUM";
    } else {
      keyFindings.push(`Evaluated ${signals.length} signal(s)`);
    }
    recommendedActions = ["REVIEW_SIGNAL_SOURCES", "VALIDATE_ASSUMPTIONS"];
  }
  
  if (proResult.assumption_verdict === "CONFLICTED" && riskLevel !== "CRITICAL") {
    riskLevel = "HIGH";
  }
  
  let assumptionConfidence = 0.5;
  if (scoredSignals.length > 0) {
    const topScore = scoredSignals[0].score;
    const runnerUpScore = scoredSignals[1]?.score || 0;
    const separation = topScore - runnerUpScore;
    assumptionConfidence = Math.min(0.95, topScore + (separation * 0.2));
  }
  
  if (proResult.assumption_verdict === "CONFLICTED" || proResult.assumption_verdict === "STALE") {
    assumptionConfidence = Math.min(assumptionConfidence, 0.6);
  }
  if (proResult.assumption_verdict === "UNKNOWN") {
    assumptionConfidence = Math.min(assumptionConfidence, 0.5);
  }
  
  return {
    tier: "max",
    assumption_verdict: proResult.assumption_verdict,
    assumption_confidence: parseFloat(assumptionConfidence.toFixed(3)),
    timestamp: nowIso,
    explanation: proResult.explanation,
    evidence: proResult.evidence,
    signal_confidence: parseFloat(avgSignalConfidence.toFixed(3)),
    risk_level: riskLevel,
    key_findings: keyFindings,
    recommended_actions: recommendedActions,
    conflicts,
    winning_signal: winningSignal
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
      const tier = payment.tier as "lite" | "pro" | "max";
      const nowIso = new Date().toISOString();

      let result: LiteResult | ProResult | MaxResult;
      if (tier === "max") {
        result = evaluateMax(payload, nowIso);
      } else if (tier === "pro") {
        result = evaluatePro(payload, nowIso);
      } else {
        result = evaluateLite(payload, nowIso);
      }

      await storage.createSignal({
        agentId: agent_id,
        payload: payload,
        insight: `${result.assumption_verdict} (${tier.toUpperCase()})`,
        confidence: result.assumption_confidence
      });

      res.json({
        success: true,
        data: result
      });
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
