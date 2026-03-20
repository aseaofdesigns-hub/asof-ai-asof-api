// ════════════════════════════════════════════════════════════
// ASOF.ai — UPGRADES TO ADD TO routes.ts
// Add these functions and routes to your existing routes.ts
// ════════════════════════════════════════════════════════════

// ── 1. STALENESS DETECTION ──────────────────────────────────
// Add this function alongside your existing evaluate functions

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
    return {
      is_stale: true,
      stale_days: Math.round(ageDays),
      stale_verdict: "STALE"
    };
  }
  return { is_stale: false };
}


// ── 2. REMEDIATION ENGINE ───────────────────────────────────
// Add this function — it takes a verdict and returns specific fix instructions

function generateRemediation(
  verdict: "VALID" | "INVALID" | "CONFLICTED" | "UNKNOWN" | "STALE",
  type: string,
  payload: AsOfPayload,
  keyFindings: string[]
): {
  remediation_required: boolean;
  severity: "NONE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  steps: Array<{
    step: number;
    action: string;
    detail: string;
    priority: "IMMEDIATE" | "SHORT_TERM" | "LONG_TERM";
  }>;
  estimated_fix_time: string;
  prevention_tips: string[];
} {
  // No remediation needed if valid
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

  // STALE remediation
  if (verdict === "STALE") {
    const staleDays = checkStaleness(payload, new Date().toISOString()).stale_days ?? 0;
    return {
      remediation_required: true,
      severity: staleDays > 90 ? "CRITICAL" : staleDays > 30 ? "HIGH" : "MEDIUM",
      steps: [
        {
          step: 1,
          action: "Refresh your dataset",
          detail: `Data is ${staleDays} days old. Pull fresh data from your source immediately.`,
          priority: "IMMEDIATE"
        },
        {
          step: 2,
          action: "Update last_trained timestamp",
          detail: "After refreshing, update the last_trained field to the current ISO timestamp.",
          priority: "IMMEDIATE"
        },
        {
          step: 3,
          action: "Re-run validation",
          detail: "Submit a new validation request after refreshing to confirm VALID status.",
          priority: "SHORT_TERM"
        },
        {
          step: 4,
          action: "Set up automatic refresh schedule",
          detail: `Your freshness window is set to ${Math.round((payload?.asof_check?.freshness_window_seconds ?? 604800) / 86400)} days. Automate data refresh before this window expires.`,
          priority: "LONG_TERM"
        }
      ],
      estimated_fix_time: "1-4 hours depending on data pipeline",
      prevention_tips: [
        "Set up automated data refresh pipelines",
        "Add ASOF.ai validation as a pre-flight check before model inference",
        "Alert when data age exceeds 80% of your freshness window"
      ]
    };
  }

  // DATASET INVALID remediation
  if (verdict === "INVALID" && type === "dataset_validity") {
    const hasDrift = keyFindings.some(f => f.toLowerCase().includes("drift"));
    const hasAucDrop = keyFindings.some(f => f.toLowerCase().includes("auc"));

    return {
      remediation_required: true,
      severity: "CRITICAL",
      steps: [
        {
          step: 1,
          action: "Halt model inference immediately",
          detail: "Do not use this model for production decisions until revalidated. Flag all recent predictions as potentially unreliable.",
          priority: "IMMEDIATE"
        },
        ...(hasDrift ? [{
          step: 2,
          action: "Investigate data drift source",
          detail: "Compare current feature distributions against training baseline. Use KL divergence or PSI scores to identify which features have drifted most.",
          priority: "IMMEDIATE" as const
        }] : []),
        ...(hasAucDrop ? [{
          step: 2 + (hasDrift ? 1 : 0),
          action: "Analyze AUC degradation",
          detail: "Pull your confusion matrix and ROC curve for the current period vs baseline. Identify which classes are most affected.",
          priority: "IMMEDIATE" as const
        }] : []),
        {
          step: 3,
          action: "Retrain with recent data",
          detail: "Gather at least 3 months of recent labeled data. Retrain with a rolling window strategy to capture current patterns.",
          priority: "SHORT_TERM"
        },
        {
          step: 4,
          action: "Recalibrate decision thresholds",
          detail: "After retraining, re-optimize classification thresholds using recent validation data before deploying.",
          priority: "SHORT_TERM"
        },
        {
          step: 5,
          action: "Implement continuous monitoring",
          detail: "Set up weekly ASOF.ai validation checks and alert when AUC drops below your acceptable threshold.",
          priority: "LONG_TERM"
        }
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

  // POLICY CONFLICTED remediation
  if (verdict === "CONFLICTED" && type === "policy_claim") {
    return {
      remediation_required: true,
      severity: "HIGH",
      steps: [
        {
          step: 1,
          action: "Do not use this claim as a hard rule",
          detail: "Conflicting signals mean this policy cannot be stated as absolute fact. Avoid hardcoding this value in automated systems.",
          priority: "IMMEDIATE"
        },
        {
          step: 2,
          action: "Identify the authoritative source",
          detail: "Review your signals and determine which source has the highest priority and most recent verification. Use the winning_signal field from Max tier to guide this.",
          priority: "IMMEDIATE"
        },
        {
          step: 3,
          action: "Replace with a range or conditional statement",
          detail: "Instead of 'delivery takes 1-3 days', use 'delivery typically takes 1-3 days but may take up to 6 days depending on conditions'.",
          priority: "SHORT_TERM"
        },
        {
          step: 4,
          action: "Escalate to source owners",
          detail: "Contact the owners of the conflicting sources to reconcile the discrepancy and establish a single authoritative version.",
          priority: "SHORT_TERM"
        },
        {
          step: 5,
          action: "Re-validate after reconciliation",
          detail: "Once sources are aligned, re-submit to ASOF.ai to confirm the conflict is resolved.",
          priority: "LONG_TERM"
        }
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

  // UNKNOWN remediation
  if (verdict === "UNKNOWN") {
    return {
      remediation_required: true,
      severity: "MEDIUM",
      steps: [
        {
          step: 1,
          action: "Provide more signals",
          detail: "ASOF.ai needs at least 2-3 specific signals to reach a verdict. Add more data points to your asof_check.signals array.",
          priority: "IMMEDIATE"
        },
        {
          step: 2,
          action: "Make assertions more specific",
          detail: "Vague assertions like 'data might be off' cannot be evaluated. Use specific metrics: 'AUC dropped from 0.87 to 0.71' or 'data drift exceeds 0.15 threshold'.",
          priority: "IMMEDIATE"
        },
        {
          step: 3,
          action: "Add last_verified_at timestamps",
          detail: "Include last_verified_at on each signal so ASOF.ai can factor in recency when scoring.",
          priority: "SHORT_TERM"
        },
        {
          step: 4,
          action: "Upgrade to Pro or Max tier",
          detail: "Higher tiers use weighted scoring and conflict detection that can often reach a verdict from signals that Lite cannot evaluate.",
          priority: "SHORT_TERM"
        }
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

  // Fallback
  return {
    remediation_required: false,
    severity: "NONE",
    steps: [],
    estimated_fix_time: "N/A",
    prevention_tips: []
  };
}


// ── 3. UPGRADED evaluatePro WITH REMEDIATION ────────────────
// Replace your existing evaluatePro function with this

function evaluateProV2(payload: AsOfPayload, nowIso: string) {
  const asof = payload?.asof_check ?? {};
  const signals = Array.isArray(asof.signals) ? asof.signals : [];
  const lite = evaluateLite(payload, nowIso);

  // Check staleness first
  const stalenessCheck = checkStaleness(payload, nowIso);
  const verdict = stalenessCheck.is_stale ? "STALE" : lite.assumption_verdict;
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

  const remediation = generateRemediation(
    verdict,
    payload?.type ?? "unknown",
    payload,
    []
  );

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


// ── 4. UPGRADED evaluateMax WITH REMEDIATION ────────────────
// Add remediation to the end of your existing evaluateMax return object
// Find the return statement at the end of evaluateMax and add:
//
//   remediation: generateRemediation(
//     assumption_verdict,
//     type,
//     payload,
//     key_findings
//   ),
//
// So the return looks like:
//
//   return {
//     tier: "max",
//     assumption_verdict,
//     assumption_confidence: ...,
//     timestamp: nowIso,
//     explanation,
//     evidence,
//     signal_confidence: ...,
//     risk_level,
//     key_findings,
//     recommended_actions,
//     conflicts,
//     winning_signal: ...,
//     remediation: generateRemediation(assumption_verdict, type, payload, key_findings),  // ← ADD THIS
//     ...(checkStaleness(payload, nowIso).is_stale ? { stale_days: checkStaleness(payload, nowIso).stale_days } : {})  // ← ADD THIS
//   };


// ── 5. NEW MONITORING ENDPOINT ──────────────────────────────
// Add this route inside your registerRoutes function
// after the existing app.post(api.automation.run.path ...) route

/*

app.post('/api/monitor', async (req, res) => {
  try {
    const { agent_id, payload, webhook_url, check_interval_hours = 24 } = req.body;

    if (!agent_id || !payload) {
      return res.status(400).json({ message: "agent_id and payload required" });
    }

    // Run immediate validation
    const nowIso = safeIsoNow();
    const result = evaluateMax(payload, nowIso);
    const remediation = generateRemediation(
      result.assumption_verdict,
      payload?.type ?? "unknown",
      payload,
      result.key_findings ?? []
    );

    // Store monitor job (you'd need to add this to storage.ts)
    // await storage.createMonitor({ agent_id, payload, webhook_url, check_interval_hours });

    // If webhook provided and verdict is bad — fire it immediately
    if (webhook_url && result.assumption_verdict !== "VALID") {
      try {
        await fetch(webhook_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            alert: true,
            agent_id,
            verdict: result.assumption_verdict,
            confidence: result.assumption_confidence,
            risk_level: result.risk_level,
            remediation,
            timestamp: nowIso
          })
        });
      } catch (webhookErr) {
        console.warn("Webhook delivery failed:", webhookErr);
      }
    }

    return res.json({
      success: true,
      monitor_id: `mon_${agent_id}_${Date.now()}`,
      immediate_result: { ...result, remediation },
      monitoring: {
        active: true,
        check_interval_hours,
        webhook_url: webhook_url ?? null,
        next_check: new Date(Date.now() + check_interval_hours * 3600000).toISOString()
      }
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to create monitor" });
  }
});

*/


// ── 6. NEW FREE PREFLIGHT CHECK ENDPOINT ────────────────────
// A free lightweight endpoint AI agents call before taking action
// No payment required — this is your lead generator

/*

app.post('/api/preflight', async (req, res) => {
  try {
    const { assumption, context, urgency = "normal" } = req.body;

    if (!assumption) {
      return res.status(400).json({ message: "assumption is required" });
    }

    // Simple keyword-based pre-screening (free, no AI cost)
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

*/
