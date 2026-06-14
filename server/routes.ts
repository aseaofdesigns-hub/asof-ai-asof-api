import type { Express } from "express";
import type { Server } from "http";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { getUncachableStripeClient } from "./stripeClient";
import { sql, eq } from "drizzle-orm";
import { db } from "./db";
import { freeTrials, payments, codeAnalyses } from "@shared/schema";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

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

function analyzeAsofPayload(payload: any, nowIso: string): {
  verdict: "VALID" | "INVALID" | "CONFLICTED" | "UNKNOWN" | "STALE";
  confidence: number;
  reason: string;
} {
  const asof = payload?.asof ?? {};
  const claim = asof.claim ?? payload?.claim ?? "";
  const signals = Array.isArray(asof.signals) ? asof.signals : [];
  const freshness = asof.freshness ?? {};
  const context = asof.context ?? {};
  const subject = asof.subject ?? {};
  const nowMs = Date.now();

  if (freshness.stale_after) {
    const staleMs = parseIsoMs(freshness.stale_after);
    if (staleMs && nowMs > staleMs) {
      const ageDays = Math.round((nowMs - staleMs) / 86400000);
      return {
        verdict: "STALE",
        confidence: 0.95,
        reason: `Data expired ${ageDays > 0 ? ageDays + ' day(s) ago' : 'recently'} (stale_after: ${freshness.stale_after})`
      };
    }
  }

  if (freshness.max_age_seconds && freshness.last_verified_at) {
    const verifiedMs = parseIsoMs(freshness.last_verified_at);
    if (verifiedMs) {
      const ageSec = (nowMs - verifiedMs) / 1000;
      if (ageSec > freshness.max_age_seconds) {
        return {
          verdict: "STALE",
          confidence: 0.92,
          reason: `Last verified ${Math.round(ageSec / 3600)} hours ago, exceeding max age of ${Math.round(freshness.max_age_seconds / 3600)} hours`
        };
      }
    }
  }

  if (signals.length >= 2) {
    const positiveSignals: any[] = [];
    const negativeSignals: any[] = [];

    for (const s of signals) {
      const name = txt(s.name ?? s.key ?? s.source ?? "");
      const value = s.value;
      const weight = typeof s.weight === "number" ? s.weight : 0.5;

      const isNegative =
        value === false ||
        value === "fail" ||
        value === "failed" ||
        value === "flagged" ||
        value === "flagged_review" ||
        value === "expired" ||
        value === "unknown" ||
        value === "partial" ||
        value === "denied" ||
        value === "rejected" ||
        /flag|fail|denied|reject|expired|missing|incomplete|unknown|violation|breach|exceed/i.test(String(value)) ||
        /flag|fail|denied|reject|expired|missing|incomplete|violation|breach|exceed/i.test(name);

      const isPositive =
        value === true ||
        value === "clear" ||
        value === "pass" ||
        value === "passed" ||
        value === "verified" ||
        value === "approved" ||
        value === "compliant" ||
        /clear|pass|verified|approved|compliant|valid|confirmed|complete/i.test(String(value));

      if (isNegative) negativeSignals.push({ ...s, weight });
      else if (isPositive) positiveSignals.push({ ...s, weight });
    }

    const posWeight = positiveSignals.reduce((sum, s) => sum + (s.weight || 0.5), 0);
    const negWeight = negativeSignals.reduce((sum, s) => sum + (s.weight || 0.5), 0);
    const totalWeight = posWeight + negWeight;

    if (negativeSignals.length > 0 && positiveSignals.length > 0) {
      if (Math.abs(posWeight - negWeight) < totalWeight * 0.2) {
        return {
          verdict: "CONFLICTED",
          confidence: clamp01(0.65 + totalWeight * 0.05),
          reason: `Conflicting signals: ${positiveSignals.length} positive vs ${negativeSignals.length} negative with similar weight`
        };
      }
      if (negWeight > posWeight) {
        return {
          verdict: "INVALID",
          confidence: clamp01(0.70 + (negWeight / totalWeight) * 0.2),
          reason: `Negative signals outweigh positive: ${negativeSignals.map(s => s.name || s.key || 'signal').join(', ')} flagged`
        };
      }
      return {
        verdict: "VALID",
        confidence: clamp01(0.60 + (posWeight / totalWeight) * 0.2),
        reason: `Positive signals dominate but ${negativeSignals.length} concern(s) noted`
      };
    }

    if (negativeSignals.length > 0 && positiveSignals.length === 0) {
      return {
        verdict: "INVALID",
        confidence: clamp01(0.75 + negWeight * 0.1),
        reason: `All evaluated signals indicate issues: ${negativeSignals.map(s => s.name || s.key || 'signal').join(', ')}`
      };
    }

    if (positiveSignals.length > 0 && negativeSignals.length === 0) {
      return {
        verdict: "VALID",
        confidence: clamp01(0.70 + posWeight * 0.1),
        reason: `All evaluated signals support the claim`
      };
    }
  }

  if (signals.length === 1) {
    const s = signals[0];
    const value = s.value;
    const isNeg =
      value === false || value === "fail" || value === "failed" || value === "flagged_review" ||
      value === "partial" || value === "unknown" || value === "denied" ||
      /flag|fail|denied|reject|expired/i.test(String(value));
    const isPos =
      value === true || value === "clear" || value === "pass" || value === "verified" ||
      /clear|pass|verified|approved|compliant/i.test(String(value));

    if (isNeg) return { verdict: "INVALID", confidence: 0.68, reason: `Single signal '${s.name || s.key || 'signal'}' indicates an issue (value: ${value})` };
    if (isPos) return { verdict: "VALID", confidence: 0.65, reason: `Single signal '${s.name || s.key || 'signal'}' supports the claim (value: ${value})` };
  }

  const riskTolerance = txt(context.risk_tolerance ?? "");
  if (riskTolerance === "low" && signals.length > 0) {
    return {
      verdict: "INVALID",
      confidence: 0.60,
      reason: "Low risk tolerance with ambiguous signals — conservative verdict applied"
    };
  }

  if (claim && signals.length === 0) {
    return {
      verdict: "UNKNOWN",
      confidence: 0.40,
      reason: "Claim provided but no signals to evaluate"
    };
  }

  return {
    verdict: "UNKNOWN",
    confidence: 0.45,
    reason: "Insufficient data to determine verdict"
  };
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

  if (assumption_verdict === "UNKNOWN") {
    const generic = analyzeAsofPayload(payload, nowIso);
    assumption_verdict = generic.verdict;
    assumption_confidence = generic.confidence;
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

  if (assumption_verdict === "UNKNOWN") {
    const generic = analyzeAsofPayload(payload, nowIso);
    assumption_verdict = generic.verdict;
    key_findings = [generic.reason];
    if (generic.verdict === "STALE") risk_level = "HIGH";
    else if (generic.verdict === "INVALID") risk_level = "HIGH";
    else if (generic.verdict === "CONFLICTED") risk_level = "HIGH";
    else if (generic.verdict === "VALID") risk_level = "LOW";
    if (!recommended_actions.length) {
      recommended_actions = generic.verdict === "VALID" ? ["MONITOR"] : generic.verdict === "STALE" ? ["REFRESH_DATA", "RE_VERIFY"] : ["REVIEW_SIGNALS", "ADD_MORE_CONTEXT"];
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

function gateSeverityByTier(result: any, tier: "lite" | "pro" | "max"): any {
  if (tier === "max") return result;

  const verdict = result.assumption_verdict;
  const riskLevel = result.risk_level;

  const tierLimits = {
    lite: {
      allowedRiskLevels: ["LOW", "MEDIUM"],
      showRemediation: false,
      showEvidence: false,
      showConflicts: false,
      showKeyFindings: false,
      showWinningSignal: false,
    },
    pro: {
      allowedRiskLevels: ["LOW", "MEDIUM", "HIGH"],
      showRemediation: true,
      showEvidence: true,
      showConflicts: false,
      showKeyFindings: true,
      showWinningSignal: false,
    }
  };

  const limits = tierLimits[tier];
  const isTooSevere = riskLevel === "CRITICAL" && tier !== "max";
  const isHighGated = riskLevel === "HIGH" && tier === "lite";

  if (isTooSevere || isHighGated) {
    return {
      tier,
      assumption_verdict: verdict,
      assumption_confidence: result.assumption_confidence,
      timestamp: result.timestamp,
      gated: true,
      gated_reason: `${riskLevel} severity results require a higher tier`,
      gated_message: tier === "lite"
        ? `⚠️ This validation returned a ${riskLevel} severity issue. Upgrade to Pro ($1.00) for explanation and evidence, or Max ($2.50) for the complete remediation plan with step-by-step fix instructions.`
        : `⚠️ This validation returned a CRITICAL severity issue. Upgrade to Max ($2.50) for the complete remediation plan, conflict analysis, and step-by-step fix instructions.`,
      upgrade_options: tier === "lite" ? [
        {
          tier: "pro",
          price: "$1.00",
          unlocks: ["Full explanation", "Evidence breakdown", "Remediation steps", "HIGH severity access"]
        },
        {
          tier: "max",
          price: "$2.50",
          unlocks: ["Complete remediation plan", "CRITICAL severity access", "Conflict detection", "Risk level", "Prevention tips", "Winning signal analysis"]
        }
      ] : [
        {
          tier: "max",
          price: "$2.50",
          unlocks: ["Complete remediation plan", "CRITICAL severity access", "Conflict detection", "Winning signal analysis", "Prevention tips"]
        }
      ],
      preview: {
        risk_level: riskLevel,
        hint: verdict === "INVALID"
          ? "Critical degradation detected in your AI system. Immediate action required."
          : verdict === "CONFLICTED"
          ? "Critical conflicts detected between your data sources. Resolution required before proceeding."
          : "Critical issue detected. Upgrade to see full details and fix instructions."
      }
    };
  }

  const gatedResult: any = {
    tier,
    assumption_verdict: result.assumption_verdict,
    assumption_confidence: result.assumption_confidence,
    timestamp: result.timestamp,
    gated: false,
  };

  if (tier === "lite") {
    return {
      ...gatedResult,
      gated: true,
      gated_reason: "Full analysis requires a higher tier",
      gated_message: "⚠️ You're seeing the verdict only. Upgrade to Pro ($1.00) for explanation and evidence, or Max ($2.50) for the complete remediation plan and CRITICAL severity access.",
      upgrade_options: [
        {
          tier: "pro",
          price: "$1.00",
          unlocks: ["Full explanation", "Evidence breakdown", "Remediation steps", "HIGH severity access"]
        },
        {
          tier: "max",
          price: "$2.50",
          unlocks: ["Complete remediation plan", "CRITICAL severity access", "Conflict detection", "Risk level", "Prevention tips", "Winning signal analysis"]
        }
      ]
    };
  }

  if (tier === "pro") {
    return {
      ...gatedResult,
      explanation: result.explanation,
      evidence: limits.showEvidence ? result.evidence : undefined,
      key_findings: limits.showKeyFindings ? result.key_findings : undefined,
      remediation: limits.showRemediation ? result.remediation : undefined,
      upgrade_hint: result.risk_level === "HIGH"
        ? "Upgrade to Max ($2.50) for conflict detection, risk scoring, and winning signal analysis."
        : undefined
    };
  }

  return gatedResult;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get('/openapi.json', (_req, res) => {
    const filePath = path.resolve(process.cwd(), 'server', 'openapi.json');
    if (fs.existsSync(filePath)) {
      res.type('application/json');
      res.sendFile(filePath);
    } else {
      res.status(404).json({ message: "OpenAPI spec not found" });
    }
  });

  app.post(api.payments.create.path, async (req, res) => {
    try {
      const stripe = await getUncachableStripeClient();
      const { tier, analysisId, fromTier } = api.payments.create.input.parse(req.body);

      const TIER_CENTS: Record<string, number> = { free: 0, lite: 50, pro: 100, max: 250 };
      const TIER_NAMES: Record<string, string> = { free: 'Free', lite: 'Lite', pro: 'Pro', max: 'Max' };

      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers.host || req.headers.origin?.replace(/^https?:\/\//, '');
      const baseUrl = req.headers.origin || `${protocol}://${host}`;

      // ── Upgrade payment (diff pricing) ────────────────────────────────────
      if (analysisId && fromTier && fromTier !== tier) {
        const diffCents = TIER_CENTS[tier] - (TIER_CENTS[fromTier] ?? 0);
        if (diffCents <= 0) {
          return res.status(400).json({ message: "Invalid upgrade path — target tier must be higher" });
        }
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [{
            price_data: {
              currency: 'usd',
              unit_amount: diffCents,
              product_data: {
                name: `ASOF ${TIER_NAMES[tier]} Upgrade`,
                description: `Upgrade from ${TIER_NAMES[fromTier]} → ${TIER_NAMES[tier]} — pay only the difference`,
              },
            },
            quantity: 1,
          }],
          mode: 'payment',
          success_url: `${baseUrl}/verify?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${baseUrl}/`,
          metadata: { tier, analysisId: String(analysisId), fromTier },
        });
        await storage.createPayment({
          stripeSessionId: session.id,
          amount: diffCents,
          tier,
          analysisId,
        });
        return res.json({ url: session.url });
      }

      // ── Fresh purchase ─────────────────────────────────────────────────────
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
          const fallback = livePriceIds[tier];
          if (!fallback) return res.status(404).json({ message: `No price found for tier: ${tier}` });
          price_id = fallback.price_id;
          unit_amount = fallback.unit_amount;
        }
      } catch (dbErr) {
        const fallback = livePriceIds[tier];
        if (!fallback) return res.status(404).json({ message: `No price found for tier: ${tier}` });
        price_id = fallback.price_id;
        unit_amount = fallback.unit_amount;
      }

      const tierMeta: Record<string, { name: string; description: string }> = {
        lite: { name: 'ASOF Lite', description: 'Risk verdict + all hidden assumptions + every way it could break' },
        pro:  { name: 'ASOF Pro',  description: 'Everything in Lite, plus a verify checklist and detailed fix cards' },
        max:  { name: 'ASOF Max',  description: 'Full analysis + safer code rewrite side-by-side — drop it straight in' },
      };

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            unit_amount: unit_amount as number,
            product_data: {
              name: tierMeta[tier]?.name ?? `ASOF ${tier}`,
              description: tierMeta[tier]?.description ?? 'AI code audit',
            },
          },
          quantity: 1,
          adjustable_quantity: { enabled: true, minimum: 1, maximum: 20 },
        }],
        mode: 'payment',
        success_url: `${baseUrl}/verify?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/`,
        metadata: { tier },
      });

      await storage.createPayment({
        stripeSessionId: session.id,
        amount: unit_amount as number,
        tier,
      });

      res.json({ url: session.url });
    } catch (err) {
      console.error('Payment creation error:', err);
      if (err instanceof z.ZodError) return res.status(400).json({ message: "Invalid tier" });
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
        // Capture customer email from Stripe for recovery
        const email = session.customer_details?.email ?? (session as any).customer_email ?? null;
        if (email) {
          await storage.updatePaymentEmail(sessionId, email.toLowerCase().trim());
        }
        // If this is an upgrade payment, bump the analysis tier in place
        if (payment?.analysisId) {
          await storage.upgradeAnalysisTier(payment.analysisId, payment.tier);
        }
        return res.json({
          status: 'paid',
          tier: payment?.tier ?? null,
          amount: payment?.amount ?? null,
          analysisId: payment?.analysisId ?? null,
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

      const gatedResult = gateSeverityByTier(result, tier);

      await storage.createSignal({
        agentId: agent_id,
        payload: payload,
        insight: `${gatedResult.assumption_verdict ?? 'UNKNOWN'} (${tier.toUpperCase()})${gatedResult.gated ? ' [GATED]' : ''}`,
        confidence: gatedResult.assumption_confidence ?? 0.5
      });

      await storage.markSessionConsumed(sessionId);

      return res.json({ success: true, data: gatedResult });
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

  app.post('/api/free-run', async (req, res) => {
    try {
      const { agent_id, payload, fingerprint } = req.body;
      if (!agent_id || !payload || !fingerprint) {
        return res.status(400).json({ message: "agent_id, payload, and fingerprint are required" });
      }

      const alreadyUsed = await storage.hasUsedFreeTrial(fingerprint);
      if (alreadyUsed) {
        return res.status(403).json({
          message: "Free trial already used. Purchase a Lite ($0.50), Pro ($1.00), or Max ($2.50) validation to continue.",
          trial_exhausted: true
        });
      }

      const nowIso = safeIsoNow();
      const result = evaluateLite(payload as any, nowIso);
      const gatedResult = gateSeverityByTier(result, "lite");

      await storage.markFreeTrialUsed(fingerprint);

      await storage.createSignal({
        agentId: agent_id,
        payload: payload,
        insight: `${gatedResult.assumption_verdict ?? 'UNKNOWN'} (FREE TRIAL)${gatedResult.gated ? ' [GATED]' : ''}`,
        confidence: gatedResult.assumption_confidence ?? 0.5
      });

      return res.json({ success: true, data: gatedResult, free_trial: true });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.get('/api/free-trial-status', async (req, res) => {
    const fingerprint = req.query.fingerprint as string;
    if (!fingerprint) return res.json({ available: false });
    const used = await storage.hasUsedFreeTrial(fingerprint);
    return res.json({ available: !used });
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

  // ── Code analysis history ─────────────────────────────────────────────────
  app.get('/api/code-analyses', async (req, res) => {
    try {
      const rawFp = req.query.fingerprint;
      const fingerprints: string[] = Array.isArray(rawFp)
        ? (rawFp as string[]).filter(Boolean)
        : typeof rawFp === 'string' && rawFp ? [rawFp] : [];
      const rawSid = req.query.sessionId;
      const sessionIds: string[] = Array.isArray(rawSid)
        ? (rawSid as string[]).filter(Boolean)
        : typeof rawSid === 'string' && rawSid ? [rawSid] : [];
      if (fingerprints.length === 0 && sessionIds.length === 0) {
        return res.status(400).json({ message: "fingerprint or sessionId required" });
      }
      const analyses = await storage.getCodeAnalyses({ fingerprints, sessionIds });
      const safe = analyses.map(({ codeSnippet: _omit, ...rest }) => rest);
      return res.json(safe);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch code analyses." });
    }
  });

  // ── AI-powered code analysis ──────────────────────────────────────────────
  app.post('/api/analyze-code', async (req, res) => {
    try {
      const { code, prompt: userPrompt, sessionId, fingerprint, tier: explicitTier } = req.body;

      if (!code || typeof code !== 'string' || code.trim().length < 10) {
        return res.status(400).json({ message: "Please paste at least 10 characters of code to analyze." });
      }
      if (code.length > 20000) {
        return res.status(400).json({ message: "Code is too long. Please paste 20,000 characters or fewer." });
      }

      // Determine tier
      let tier: 'free' | 'lite' | 'pro' | 'max' = 'free';
      if (sessionId) {
        const rawSessionId = sessionId.replace(/__\d+$/, '');
        const payment = await storage.getPaymentBySessionId(rawSessionId);
        if (payment && payment.status === 'paid') {
          tier = (payment.tier as any) ?? 'lite';
        } else {
          return res.status(401).json({ message: "Payment session not found or not paid." });
        }
      } else if (fingerprint) {
        const trial = await db.select().from(freeTrials).where(eq(freeTrials.fingerprint, fingerprint));
        if (trial.length > 0) {
          return res.status(402).json({ message: "Your free trial has already been used.", trial_exhausted: true });
        }
        tier = 'free';
      } else {
        return res.status(401).json({ message: "Payment required. Please select a tier to continue." });
      }

      // Build OpenAI prompt
      const systemPrompt = `You are ASOF — an AI code auditor. Your job is to find hidden assumptions in AI-generated code.

When given code (and optionally the original prompt that produced it), you identify:
1. What the AI silently assumed without being told
2. What could break because of those assumptions  
3. What the developer should verify before trusting or shipping the code
4. A safer, improved version of the code with better error handling and safety checks

ALWAYS respond with valid JSON matching exactly this structure:
{
  "risk_level": "SAFE" | "NEEDS_REVIEW" | "RISKY" | "CRITICAL",
  "summary": "1-2 sentences describing the most important concern",
  "assumptions": [
    { "text": "The AI assumed X", "severity": "LOW" | "MEDIUM" | "HIGH" }
  ],
  "risks": [
    { "text": "What could fail or go wrong", "severity": "LOW" | "MEDIUM" | "HIGH" }
  ],
  "checks": [
    "Specific thing to verify before using this code"
  ],
  "safer_code": "The full improved code with assumptions made explicit, better validation, and error handling. Keep the same language and style.",
  "suggestions": [
    {
      "problem": "Short name for the issue",
      "why_it_matters": "Why this is dangerous or problematic",
      "fix": "Concrete change to make it safe"
    }
  ]
}

Be specific and concrete. Avoid vague warnings. Reference actual variable names, function names, and lines from the code.`;

      const userMessage = userPrompt
        ? `Original prompt: "${userPrompt}"\n\nAI-generated code:\n\`\`\`\n${code}\n\`\`\``
        : `AI-generated code:\n\`\`\`\n${code}\n\`\`\``;

      const completion = await openai.chat.completions.create({
        model: "gpt-5.4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 4096,
      });

      const raw = completion.choices[0]?.message?.content ?? '{}';
      let analysis: any;
      try {
        analysis = JSON.parse(raw);
      } catch {
        return res.status(500).json({ message: "AI returned invalid JSON. Please try again." });
      }

      // Record free trial usage
      if (tier === 'free' && fingerprint) {
        await db.insert(freeTrials).values({ fingerprint });
      }

      // Save analysis to database (store ownership + full AI response for upgrades)
      const riskLevel = analysis.risk_level ?? 'NEEDS_REVIEW';
      const summary = analysis.summary ?? '';
      const savedAnalysis = await storage.createCodeAnalysis({
        codeSnippet: code.slice(0, 500),
        riskLevel,
        summary,
        tier,
        fingerprint: fingerprint ?? null,
        sessionId: sessionId ?? null,
        fullData: analysis,
      });

      // Consume the payment session so it cannot be reused
      if (sessionId && tier !== 'free') {
        await storage.markSessionConsumed(sessionId).catch(() => {});
      }

      // Gate results by tier
      const base = {
        risk_level: analysis.risk_level ?? 'NEEDS_REVIEW',
        summary: analysis.summary ?? '',
        assumptions: analysis.assumptions ?? [],
        tier,
        analysisId: savedAnalysis.id,
      };

      if (tier === 'free') {
        return res.json({
          ...base,
          assumptions: (analysis.assumptions ?? []).slice(0, 2),
          gated: true,
          gated_tier: 'lite',
        });
      }
      if (tier === 'lite') {
        return res.json({
          ...base,
          risks: analysis.risks ?? [],
          gated: true,
          gated_tier: 'pro',
        });
      }
      if (tier === 'pro') {
        return res.json({
          ...base,
          risks: analysis.risks ?? [],
          checks: analysis.checks ?? [],
          suggestions: analysis.suggestions ?? [],
          gated: true,
          gated_tier: 'max',
        });
      }
      // max — full access
      return res.json({
        ...base,
        risks: analysis.risks ?? [],
        checks: analysis.checks ?? [],
        safer_code: analysis.safer_code ?? '',
        suggestions: analysis.suggestions ?? [],
        gated: false,
      });
    } catch (err: any) {
      console.error("analyze-code error:", err);
      res.status(500).json({ message: err?.message ?? "Analysis failed." });
    }
  });

  // ── POST /api/recover-sessions — restore unused paid sessions by email ──
  app.post('/api/recover-sessions', async (req, res) => {
    try {
      const { email } = req.body;
      if (!email || typeof email !== 'string') return res.status(400).json({ message: "Email required" });
      const allPayments = await storage.getUnconsumedPaymentsByEmail(email.toLowerCase().trim());
      const recoverable = allPayments.filter(p => p.status === 'paid' && !p.consumed && !p.analysisId);
      const sessions = recoverable.map(p => ({ id: p.stripeSessionId, tier: p.tier }));
      res.json({ sessions, count: sessions.length });
    } catch {
      res.status(500).json({ message: "Recovery failed" });
    }
  });

  // ── GET /api/payment-quantity/:sessionId — how many credits were purchased ──
  app.get('/api/payment-quantity/:sessionId', async (req, res) => {
    try {
      const stripe = await getUncachableStripeClient();
      const lineItems = await stripe.checkout.sessions.listLineItems(req.params.sessionId, { limit: 1 });
      const quantity = lineItems.data[0]?.quantity ?? 1;
      res.json({ quantity });
    } catch {
      res.json({ quantity: 1 });
    }
  });

  // ── GET /api/analysis/:id — fetch a single analysis by ID (for upgrades) ──
  app.get('/api/analysis/:id', async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid analysis ID" });
    const fingerprint = req.query.fingerprint as string | undefined;
    const sessionId = req.query.sessionId as string | undefined;

    try {
      const record = await storage.getAnalysisById(id);
      if (!record) return res.status(404).json({ message: "Analysis not found" });

      // Ownership check — must match fingerprint or sessionId
      const ownsViaTierprint = fingerprint && record.fingerprint === fingerprint;
      const ownsViaSession = sessionId && record.sessionId === sessionId;
      if (!ownsViaTierprint && !ownsViaSession) {
        return res.status(403).json({ message: "Not authorized to view this analysis" });
      }

      const fullData = record.fullData as any;
      if (!fullData) return res.status(422).json({ message: "Full data unavailable — this analysis was created before upgrade support was added" });

      const tier = record.tier;
      const base = {
        risk_level: fullData.risk_level ?? record.riskLevel,
        summary: fullData.summary ?? record.summary,
        assumptions: fullData.assumptions ?? [],
        tier,
        analysisId: record.id,
      };

      if (tier === 'free') {
        return res.json({ ...base, assumptions: (fullData.assumptions ?? []).slice(0, 2), gated: true, gated_tier: 'lite' });
      }
      if (tier === 'lite') {
        return res.json({ ...base, risks: fullData.risks ?? [], gated: true, gated_tier: 'pro' });
      }
      if (tier === 'pro') {
        return res.json({ ...base, risks: fullData.risks ?? [], checks: fullData.checks ?? [], suggestions: fullData.suggestions ?? [], gated: true, gated_tier: 'max' });
      }
      return res.json({ ...base, risks: fullData.risks ?? [], checks: fullData.checks ?? [], safer_code: fullData.safer_code ?? '', suggestions: fullData.suggestions ?? [], gated: false });
    } catch (err: any) {
      res.status(500).json({ message: err?.message ?? "Failed to fetch analysis" });
    }
  });

  app.get("/api/admin/lookup", async (req, res) => {
    const adminPassword = process.env.ADMIN_PASSWORD;
    const provided = req.headers["x-admin-password"];
    if (!adminPassword || provided !== adminPassword) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const { sessionId } = req.query as { sessionId?: string };
    if (!sessionId) return res.status(400).json({ message: "sessionId required" });
    try {
      const [payment] = await db
        .select()
        .from(payments)
        .where(eq(payments.stripeSessionId, sessionId));
      if (!payment) return res.status(404).json({ message: "No payment found for that session ID." });
      const [analysis] = await db
        .select()
        .from(codeAnalyses)
        .where(eq(codeAnalyses.sessionId, sessionId));
      return res.json({ payment, analysis: analysis ?? null });
    } catch (err: any) {
      res.status(500).json({ message: err?.message ?? "Lookup failed" });
    }
  });

  return httpServer;
}
