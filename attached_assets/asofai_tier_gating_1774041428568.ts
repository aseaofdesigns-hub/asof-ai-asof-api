// ════════════════════════════════════════════════════════════
// ASOF.ai — SEVERITY GATING BY TIER
// 
// INSTRUCTIONS FOR REPLIT:
// 1. Add the gateSeverityByTier() function to routes.ts
// 2. Add applyTierGating() function to routes.ts  
// 3. In the app.post(api.automation.run.path) route,
//    after the result is computed, add the gating call
//    before returning the response.
// ════════════════════════════════════════════════════════════


// ── STEP 1: Add this function to routes.ts ──────────────────
// Place it after your evaluateMax function, before registerRoutes

function gateSeverityByTier(result: any, tier: "lite" | "pro" | "max"): any {

  // Max tier — full access, no gating
  if (tier === "max") return result;

  const verdict = result.assumption_verdict;
  const riskLevel = result.risk_level;

  // Define what each tier can see
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
      showRemediation: true,     // Pro gets remediation but only for LOW/MEDIUM/HIGH
      showEvidence: true,
      showConflicts: false,
      showKeyFindings: true,
      showWinningSignal: false,
    }
  };

  const limits = tierLimits[tier];

  // Check if this result exceeds the tier's allowed severity
  const isTooSevere = riskLevel === "CRITICAL" && tier !== "max";
  const isHighGated = riskLevel === "HIGH" && tier === "lite";

  if (isTooSevere || isHighGated) {
    // Return a gated response — show verdict but hide details
    return {
      tier,
      assumption_verdict: verdict,
      assumption_confidence: result.assumption_confidence,
      timestamp: result.timestamp,
      
      // Show a teaser but gate the full analysis
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

      // Show a hint of what they're missing
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

  // Result is within tier limits — apply field filtering
  const gatedResult: any = {
    tier,
    assumption_verdict: result.assumption_verdict,
    assumption_confidence: result.assumption_confidence,
    timestamp: result.timestamp,
    gated: false,
  };

  // Lite only gets verdict + confidence
  if (tier === "lite") {
    return gatedResult;
  }

  // Pro gets explanation + evidence + remediation (for non-CRITICAL)
  if (tier === "pro") {
    return {
      ...gatedResult,
      explanation: result.explanation,
      evidence: limits.showEvidence ? result.evidence : undefined,
      key_findings: limits.showKeyFindings ? result.key_findings : undefined,
      remediation: limits.showRemediation ? result.remediation : undefined,
      // Pro does NOT get: risk_level, conflicts, winning_signal, signal_confidence
      upgrade_hint: result.risk_level === "HIGH" 
        ? "Upgrade to Max ($2.50) for conflict detection, risk scoring, and winning signal analysis."
        : undefined
    };
  }

  return gatedResult;
}


// ── STEP 2: Update the automation run route ─────────────────
// 
// Find this section in your existing app.post(api.automation.run.path) route:
//
//   let result: any;
//   if (tier === "max") {
//     result = evaluateMax(payload as any, nowIso);
//   } else if (tier === "pro") {
//     result = evaluatePro(payload as any, nowIso);
//   } else {
//     result = evaluateLite(payload as any, nowIso);
//   }
//
// REPLACE IT WITH THIS:

/*

  let result: any;
  if (tier === "max") {
    result = evaluateMax(payload as any, nowIso);
  } else if (tier === "pro") {
    // Use Pro V2 which includes remediation
    result = evaluateProV2(payload as any, nowIso);
  } else {
    result = evaluateLite(payload as any, nowIso);
  }

  // Apply severity gating based on tier
  const gatedResult = gateSeverityByTier(result, tier);

  await storage.createSignal({
    agentId: agent_id,
    payload: payload,
    insight: `${gatedResult.assumption_verdict ?? 'UNKNOWN'} (${tier.toUpperCase()})${gatedResult.gated ? ' [GATED]' : ''}`,
    confidence: gatedResult.assumption_confidence ?? 0.5
  });

  await storage.markSessionConsumed(sessionId);

  return res.json({ success: true, data: gatedResult });

*/


// ── STEP 3: What each tier now returns ──────────────────────
//
// LITE ($0.50):
//   - Verdict (VALID / INVALID / CONFLICTED / UNKNOWN / STALE)
//   - Confidence score
//   - If HIGH or CRITICAL: gated message + upgrade options
//
// PRO ($1.00):
//   - Everything in Lite
//   - Explanation
//   - Evidence breakdown
//   - Key findings
//   - Remediation steps (for LOW / MEDIUM / HIGH only)
//   - If CRITICAL: gated message + upgrade to Max
//
// MAX ($2.50):
//   - Everything in Pro
//   - CRITICAL severity access
//   - Full remediation plan
//   - Conflict detection
//   - Risk level scoring
//   - Winning signal analysis
//   - Prevention tips
//   - Stale days calculation
//
// ════════════════════════════════════════════════════════════
// SUMMARY FOR REPLIT:
// 1. Add gateSeverityByTier() function to routes.ts
// 2. Replace the tier evaluation block in the run route
//    with the updated version that calls gateSeverityByTier()
// 3. The evaluateProV2 function should already be in routes.ts
//    from the previous upgrade file
// ════════════════════════════════════════════════════════════
