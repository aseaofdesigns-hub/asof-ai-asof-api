import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Lock, Zap, ShieldCheck, Loader2, Tag, PartyPopper, X } from "lucide-react";

const FEATURE_ROWS = [
  { label: "Risk Verdict", lite: true, pro: true, max: true },
  { label: "What the AI Assumed", lite: true, pro: true, max: true },
  { label: "What Could Break", lite: true, pro: true, max: true },
  { label: "Verify Checklist", lite: false, pro: true, max: true },
  { label: "Suggestion Cards", lite: false, pro: true, max: true },
  { label: "Safer Code Rewrite", lite: false, pro: false, max: true },
];

const TIERS = [
  {
    id: "lite" as const,
    name: "ASOF Lite",
    price: "$0.50",
    tagline: "Per analysis",
    description: "Risk level, every assumption the AI made, and every way it could break.",
    icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
    accent: "emerald",
    borderClass: "border-emerald-500/30",
    badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    ctaClass: "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/30",
    highlight: false,
  },
  {
    id: "pro" as const,
    name: "ASOF Pro",
    price: "$1.00",
    tagline: "Per analysis",
    description: "Everything in Lite plus a checklist of what to verify and detailed fix cards.",
    icon: <Zap className="w-5 h-5 text-blue-400" />,
    accent: "blue",
    borderClass: "border-blue-500/40",
    badgeClass: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    ctaClass: "bg-blue-600 hover:bg-blue-500 shadow-blue-900/30",
    highlight: true,
  },
  {
    id: "max" as const,
    name: "ASOF Max",
    price: "$2.50",
    tagline: "Per analysis",
    description: "Full analysis plus a side-by-side safer code rewrite you can drop right in.",
    icon: <ShieldCheck className="w-5 h-5 text-purple-400" />,
    accent: "purple",
    borderClass: "border-purple-500/30",
    badgeClass: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    ctaClass: "bg-purple-600 hover:bg-purple-500 shadow-purple-900/30",
    highlight: false,
  },
];

export default function Pricing() {
  const [loading, setLoading] = useState<string | null>(null);
  const [purchasedTier, setPurchasedTier] = useState<string | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const tier = localStorage.getItem("purchased_tier");
    if (tier) {
      setPurchasedTier(tier);
      setShowBanner(true);
      localStorage.removeItem("purchased_tier");
    }
  }, []);

  const initiatePayment = async (tier: "lite" | "pro" | "max") => {
    setLoading(tier);
    try {
      const res = await fetch("/api/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      if (!res.ok) throw new Error((await res.json()).message || "Payment failed");
      const { url } = await res.json();
      if (!url || !url.startsWith("https://checkout.stripe.com")) {
        throw new Error("Invalid payment URL received");
      }
      if (window.self !== window.top) window.open(url, "_blank");
      else window.location.href = url;
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Payment failed",
        variant: "destructive",
      });
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Success banner */}
        <AnimatePresence>
          {showBanner && purchasedTier && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35 }}
              data-testid="banner-purchase-success"
              className="mb-8 flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4"
            >
              <div className="flex items-center gap-3">
                <PartyPopper className="w-5 h-5 text-emerald-400 shrink-0" />
                <p className="text-sm font-semibold text-emerald-300">
                  Payment confirmed! You're all set on the{" "}
                  <span className="capitalize font-bold text-white">
                    {TIERS.find((t) => t.id === purchasedTier)?.name ?? purchasedTier}
                  </span>{" "}
                  plan.
                </p>
              </div>
              <button
                data-testid="button-dismiss-banner"
                onClick={() => setShowBanner(false)}
                className="text-emerald-400/60 hover:text-emerald-300 transition-colors shrink-0"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-5">
            <Tag className="w-3 h-3" />
            Pay per analysis — no subscription
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Simple, honest pricing
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto leading-relaxed">
            Each tier gives you a deeper look at what your AI-generated code assumed and where it could fail.
            Pay once per analysis — no monthly fees.
          </p>
        </motion.div>

        {/* Tier cards */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-14"
        >
          {TIERS.map((tier) => {
            const isActive = purchasedTier === tier.id;
            const activeRingClass = isActive
              ? tier.id === "lite"
                ? "ring-2 ring-emerald-500/60 shadow-lg shadow-emerald-950/40"
                : tier.id === "pro"
                ? "ring-2 ring-blue-500/60 shadow-lg shadow-blue-950/40"
                : "ring-2 ring-purple-500/60 shadow-lg shadow-purple-950/40"
              : "";
            return (
            <div
              key={tier.id}
              data-testid={`card-pricing-${tier.id}`}
              className={`relative rounded-2xl border bg-white/[0.03] p-6 flex flex-col gap-5 transition-all ${tier.borderClass} ${tier.highlight && !isActive ? "ring-1 ring-blue-500/30 shadow-lg shadow-blue-950/30" : ""} ${activeRingClass}`}
            >
              {isActive && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2" data-testid={`badge-active-${tier.id}`}>
                  <span className={`px-3 py-1 rounded-full text-white text-[10px] font-bold uppercase tracking-wider shadow-md ${tier.id === "lite" ? "bg-emerald-600" : tier.id === "pro" ? "bg-blue-600" : "bg-purple-600"}`}>
                    ✓ Active
                  </span>
                </div>
              )}
              {!isActive && tier.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 rounded-full bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider shadow-md">
                    Most Popular
                  </span>
                </div>
              )}

              {/* Header */}
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl border ${tier.badgeClass}`}>
                  {tier.icon}
                </div>
                <div>
                  <p className="font-bold text-white text-sm">{tier.name}</p>
                  <p className={`text-[10px] uppercase tracking-wider font-semibold ${tier.badgeClass.split(" ")[1]}`}>
                    {tier.tagline}
                  </p>
                </div>
              </div>

              {/* Price */}
              <div>
                <span className="text-4xl font-extrabold text-white">{tier.price}</span>
              </div>

              {/* Description */}
              <p className="text-sm text-muted-foreground leading-relaxed">
                {tier.description}
              </p>

              {/* CTA */}
              <Button
                data-testid={`button-get-started-${tier.id}`}
                onClick={() => initiatePayment(tier.id)}
                disabled={loading !== null}
                className={`w-full h-10 font-semibold text-white shadow-lg mt-auto ${tier.ctaClass}`}
              >
                {loading === tier.id ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Redirecting…
                  </>
                ) : (
                  "Get started"
                )}
              </Button>
            </div>
          );
          })}
        </motion.div>

        {/* Feature comparison table */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <h2 className="text-lg font-bold text-center mb-5">What's included in each tier</h2>

          <div className="rounded-2xl border border-white/10 overflow-hidden">
            {/* Header row */}
            <div className="grid grid-cols-4 bg-white/5 border-b border-white/10">
              <div className="p-4 text-xs text-muted-foreground font-semibold uppercase tracking-wider">Feature</div>
              <div className="p-4 text-center">
                <span className="text-emerald-400 font-bold text-sm">Lite</span>
                <br />
                <span className="text-xs text-muted-foreground">$0.50</span>
              </div>
              <div className="p-4 text-center">
                <span className="text-blue-400 font-bold text-sm">Pro</span>
                <br />
                <span className="text-xs text-muted-foreground">$1.00</span>
              </div>
              <div className="p-4 text-center">
                <span className="text-purple-400 font-bold text-sm">Max</span>
                <br />
                <span className="text-xs text-muted-foreground">$2.50</span>
              </div>
            </div>

            {FEATURE_ROWS.map((row, i) => (
              <div
                key={i}
                className={`grid grid-cols-4 border-b border-white/5 last:border-0 ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}
              >
                <div className="p-4 text-sm text-muted-foreground">{row.label}</div>
                {[row.lite, row.pro, row.max].map((has, j) => (
                  <div key={j} className="p-4 flex justify-center items-center">
                    {has ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Lock className="w-4 h-4 text-white/20" />
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Footer note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="text-center text-xs text-muted-foreground mt-8"
        >
          Prices listed in USD. Stripe accepts all major cards worldwide and converts to your local currency at checkout. No subscription. No renewal. One analysis, one payment.
        </motion.p>
      </main>
    </div>
  );
}
