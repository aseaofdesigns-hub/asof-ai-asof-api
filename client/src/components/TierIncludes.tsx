import { TIER_FEATURES, type Tier } from "../lib/tierFeatures";

interface TierIncludesProps {
  activeTier: Tier;
}

function getFeatureDescription(label: string): string {
  const map: Record<string, string> = {
    SUMMARY: "Overall risk verdict and why.",
    ASSUMPTIONS: "Things the AI took for granted.",
    "WHAT COULD BREAK": "Real failure scenarios.",
    "VERIFY CHECKLIST": "Step-by-step verification list.",
    SUGGESTIONS: "Actionable fix cards.",
    "SAFE REWRITES": "Safer code side-by-side.",
  };
  return map[label] || "";
}

export function TierIncludes({ activeTier }: TierIncludesProps) {
  const features = TIER_FEATURES[activeTier] ?? TIER_FEATURES.lite;

  return (
    <div className="space-y-1.5">
      {features.map((f) => (
        <div key={f.label} className="flex items-start gap-2">
          <span className={`shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
            f.locked
              ? "text-white/20 bg-white/5 border-white/10"
              : "text-orange-300 bg-orange-500/10 border-orange-500/30"
          }`}>
            {f.label}
          </span>
          <span className={`text-[10px] leading-snug mt-0.5 ${f.locked ? "text-white/25" : "text-white/60"}`}>
            {f.locked ? "Locked — upgrade to unlock" : getFeatureDescription(f.label)}
          </span>
        </div>
      ))}
    </div>
  );
}
