import { getAvailableUpgrades, UPGRADE_PRICES, type Tier } from "../lib/tierFeatures";

interface UpgradeBoxProps {
  currentTier: Tier;
  originalTier: Tier;
  onUpgrade: (toTier: Tier) => void;
}

const TIER_LABELS: Record<Tier, string> = {
  lite: "Lite",
  pro: "Pro — Verify checklist + suggestion cards",
  max: "Max — Safer code rewrite side-by-side",
};

export function UpgradeBox({ currentTier, originalTier, onUpgrade }: UpgradeBoxProps) {
  const available = getAvailableUpgrades(currentTier);
  if (available.length === 0) return null;

  return (
    <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-2">
      <p className="text-xs font-bold text-purple-300 pb-1">
        ⬆ Upgrade this analysis — pay only the difference
      </p>
      {available.map((toTier) => {
        const price =
          UPGRADE_PRICES[`${originalTier}->${toTier}`] ??
          UPGRADE_PRICES[`${currentTier}->${toTier}`] ??
          0;
        return (
          <button
            key={toTier}
            data-testid={`button-upgrade-${toTier}`}
            onClick={() => onUpgrade(toTier)}
            className="w-full flex items-center justify-between rounded-lg border border-purple-500/30 bg-purple-500/10 px-4 py-3 text-sm text-white hover:bg-purple-500/20 transition-colors"
          >
            <span className="flex items-center gap-2 text-[11px] font-bold text-left">
              <span className="text-purple-400">⊕</span>
              {TIER_LABELS[toTier]}
            </span>
            <span className="text-purple-300 font-mono font-bold shrink-0 ml-3">
              +${price.toFixed(2)}
            </span>
          </button>
        );
      })}
      <p className="text-[9px] text-purple-400/50 text-center pt-1">
        Same analysis, instantly expanded — no re-run needed.
      </p>
    </div>
  );
}
