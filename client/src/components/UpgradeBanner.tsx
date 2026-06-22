import { motion } from "framer-motion";
import { ArrowUpCircle } from "lucide-react";

interface UpgradeBannerProps {
  fromTier: string;
  toTier: string;
}

const TIER_UNLOCK_MSG: Record<string, string> = {
  pro: "Verify checklist + suggestion cards are now unlocked.",
  max: "Safe code rewrite is now unlocked side-by-side.",
};

export function UpgradeBanner({ fromTier, toTier }: UpgradeBannerProps) {
  const unlockMsg = TIER_UNLOCK_MSG[toTier.toLowerCase()] ?? "New features are now unlocked.";
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full rounded-xl border border-purple-400/40 bg-gradient-to-r from-purple-600/20 to-indigo-600/20 px-4 py-3 flex items-start gap-3"
    >
      <ArrowUpCircle className="w-5 h-5 text-purple-400 mt-0.5 shrink-0" />
      <div>
        <p className="text-sm font-bold text-purple-200 tracking-wide uppercase">
          ✦ Upgraded: {fromTier.toUpperCase()} → {toTier.toUpperCase()}
        </p>
        <p className="text-[11px] text-purple-300/70 mt-0.5">{unlockMsg}</p>
      </div>
    </motion.div>
  );
}
