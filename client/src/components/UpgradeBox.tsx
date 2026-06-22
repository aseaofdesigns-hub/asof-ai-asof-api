import { ArrowUpCircle, Sparkles } from "lucide-react";
import { getAvailableUpgrades, UPGRADE_PRICES, type Tier } from "../lib/tierFeatures";

interface UpgradeBoxProps {
  currentTier: Tier;
  originalTier: Tier;
  onUpgrade: (toTier: Tier) => void;
}

const TIER_DETAIL: Record<Tier, { label: string; unlocks: string[]; accent: string; border: string; bg: string; textColor: string }> = {
  lite: {
    label: "Lite",
    unlocks: [],
    accent: "text-emerald-400",
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/10",
    textColor: "text-emerald-300",
  },
  pro: {
    label: "Pro",
    unlocks: ["Verify checklist", "Suggestion cards"],
    accent: "text-blue-400",
    border: "border-blue-500/40",
    bg: "bg-blue-500/15",
    textColor: "text-blue-200",
  },
  max: {
    label: "Max",
    unlocks: ["Safer code rewrite"],
    accent: "text-purple-400",
    border: "border-purple-500/25",
    bg: "bg-purple-500/8",
    textColor: "text-purple-300",
  },
};

export function UpgradeBox({ currentTier, originalTier, onUpgrade }: UpgradeBoxProps) {
  const available = getAvailableUpgrades(currentTier);
  if (available.length === 0) return null;

  const primaryTier = available[0];
  const secondaryTiers = available.slice(1);

  return (
    <div className="rounded-xl border border-white/8 bg-white/3 p-4 space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 flex items-center gap-1.5">
        <ArrowUpCircle className="w-3.5 h-3.5 text-white/30" />
        Upgrade this analysis — pay only the difference
      </p>

      {/* Primary upgrade button */}
      {(() => {
        const t = TIER_DETAIL[primaryTier];
        const price =
          UPGRADE_PRICES[`${originalTier}->${primaryTier}`] ??
          UPGRADE_PRICES[`${currentTier}->${primaryTier}`] ??
          0;
        return (
          <button
            key={primaryTier}
            data-testid={`button-upgrade-${primaryTier}`}
            onClick={() => onUpgrade(primaryTier)}
            className={`w-full flex items-center justify-between rounded-xl border-2 ${t.border} ${t.bg} px-4 py-3.5 hover:opacity-90 transition-all group`}
          >
            <div className="flex items-start gap-3 text-left">
              <Sparkles className={`w-4 h-4 mt-0.5 shrink-0 ${t.accent}`} />
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${t.textColor}`}>
                    Upgrade to {t.label}
                  </span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${t.bg} ${t.textColor} border ${t.border}`}>
                    RECOMMENDED
                  </span>
                </div>
                <p className="text-[11px] text-white/50 mt-0.5">
                  Unlocks: {t.unlocks.join(" · ")}
                </p>
              </div>
            </div>
            <span className={`font-mono font-bold text-base shrink-0 ml-4 ${t.textColor}`}>
              +${price.toFixed(2)}
            </span>
          </button>
        );
      })()}

      {/* Secondary upgrade options */}
      {secondaryTiers.map((toTier) => {
        const t = TIER_DETAIL[toTier];
        const price =
          UPGRADE_PRICES[`${originalTier}->${toTier}`] ??
          UPGRADE_PRICES[`${currentTier}->${toTier}`] ??
          0;
        return (
          <button
            key={toTier}
            data-testid={`button-upgrade-${toTier}`}
            onClick={() => onUpgrade(toTier)}
            className="w-full flex items-center justify-between rounded-lg border border-white/8 bg-white/4 px-4 py-2.5 hover:bg-white/8 hover:border-white/15 transition-all"
          >
            <div className="flex items-center gap-2 text-left">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">or skip to</span>
              <span className={`text-[11px] font-bold ${t.accent}`}>{t.label}</span>
              <span className="text-[10px] text-white/30">— also unlocks {t.unlocks.join(", ")}</span>
            </div>
            <span className={`font-mono font-bold text-sm shrink-0 ml-3 ${t.accent}`}>
              +${price.toFixed(2)}
            </span>
          </button>
        );
      })}

      <p className="text-[9px] text-white/25 text-center pt-0.5">
        Same analysis, instantly expanded — no re-run needed
      </p>
    </div>
  );
}
