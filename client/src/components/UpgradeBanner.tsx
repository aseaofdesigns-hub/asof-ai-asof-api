import { motion } from "framer-motion";

interface UpgradeBannerProps {
  fromTier: string;
  toTier: string;
}

export function UpgradeBanner({ fromTier, toTier }: UpgradeBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3"
    >
      <p className="text-center text-sm font-bold text-emerald-400 tracking-wide uppercase">
        ✦ Upgraded: {fromTier.toUpperCase()} → {toTier.toUpperCase()} ✦
      </p>
    </motion.div>
  );
}
