export type Tier = "lite" | "pro" | "max";

export const TIER_FEATURES: Record<Tier, { label: string; locked: boolean }[]> = {
  lite: [
    { label: "SUMMARY", locked: false },
    { label: "ASSUMPTIONS", locked: false },
    { label: "WHAT COULD BREAK", locked: false },
    { label: "VERIFY CHECKLIST", locked: true },
    { label: "SUGGESTIONS", locked: true },
    { label: "SAFE REWRITES", locked: true },
  ],
  pro: [
    { label: "SUMMARY", locked: false },
    { label: "ASSUMPTIONS", locked: false },
    { label: "WHAT COULD BREAK", locked: false },
    { label: "VERIFY CHECKLIST", locked: false },
    { label: "SUGGESTIONS", locked: false },
    { label: "SAFE REWRITES", locked: true },
  ],
  max: [
    { label: "SUMMARY", locked: false },
    { label: "ASSUMPTIONS", locked: false },
    { label: "WHAT COULD BREAK", locked: false },
    { label: "VERIFY CHECKLIST", locked: false },
    { label: "SUGGESTIONS", locked: false },
    { label: "SAFE REWRITES", locked: false },
  ],
};

export const TIER_ORDER: Tier[] = ["lite", "pro", "max"];

export const UPGRADE_PRICES: Record<string, number> = {
  "lite->pro": 0.50,
  "lite->max": 2.00,
  "pro->max": 1.50,
};

export function getNextUpgrade(currentTier: Tier): Tier | null {
  const idx = TIER_ORDER.indexOf(currentTier);
  if (idx >= TIER_ORDER.length - 1) return null;
  return TIER_ORDER[idx + 1];
}

export function getAvailableUpgrades(currentTier: Tier): Tier[] {
  const idx = TIER_ORDER.indexOf(currentTier);
  return TIER_ORDER.slice(idx + 1);
}
