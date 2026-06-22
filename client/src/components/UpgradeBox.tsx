import { getNextUpgrade, UPGRADE_PRICES, type Tier } from "../lib/tierFeatures";

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
  const nextTier = getNextUpgrade(currentTier);
  if (!nextTier) return null;

  const price =
    UPGRADE_PRICES[`${originalTier}->${nextTier}`] ??
    UPGRADE_PRICES[`${currentTier}->${nextTier}`] ??
    0;

  return (
    <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-3">
      <p className="text-xs font-bold text-purple-300 flex items-center gap-2">
        ⬆ Upgrade this analysis — pay only the difference
      </p>
      <button
        data-testid={`button-upgrade-${nextTier}`}
        onClick={() => onUpgrade(nextTier)}
        className="w-full flex items-center justify-between rounded-lg border border-purple-500/30 bg-purple-500/10 px-4 py-3 text-sm text-white hover:bg-purple-500/20 transition-colors"
      >
        <span className="flex items-center gap-2 text-[11px] font-bold text-left">
          <span className="text-purple-400">⊕</span>
          {TIER_LABELS[nextTier]}
        </span>
        <span className="text-purple-300 font-mono font-bold shrink-0 ml-3">
          +${price.toFixed(2)}
        </span>
      </button>
      <p className="text-[9px] text-purple-400/50 text-center">
        Same analysis, instantly expanded — no re-run needed.
      </p>
    </div>
  );
}
