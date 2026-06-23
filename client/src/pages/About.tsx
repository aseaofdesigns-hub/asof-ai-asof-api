import { motion } from "framer-motion";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ShieldCheck, Zap, Globe, AlertTriangle, Code2, GitPullRequest, Cpu, Users } from "lucide-react";

export default function About() {
  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  const assumptions = [
    { bad: "AI assumed Stripe webhook events are always delivered in order.", risk: "Payments could be applied twice or missed entirely." },
    { bad: "AI assumed userId is already authorized before this function runs.", risk: "Any user could access another user's data." },
    { bad: "AI assumed this API returns amounts in cents — it returns dollars.", risk: "Every transaction is off by 100x." },
    { bad: "AI assumed the compliance rule from 2023 is still in effect.", risk: "Your agent is acting on outdated regulation." },
  ];

  const audiences = [
    {
      icon: <Code2 className="w-5 h-5 text-primary" />,
      bg: "bg-primary/20",
      label: "Developers",
      tagline: "Assumption validation for any code",
      desc: "Catch silent guesses — whether from an AI coding agent or your own hands — before they hit production."
    },
    {
      icon: <Users className="w-5 h-5 text-emerald-400" />,
      bg: "bg-emerald-500/20",
      label: "Non-technical builders",
      tagline: "Check my AI code",
      desc: "Paste what your AI wrote and get a plain-language verdict on whether it's safe to use."
    },
    {
      icon: <GitPullRequest className="w-5 h-5 text-purple-400" />,
      bg: "bg-purple-500/20",
      label: "Teams",
      tagline: "Pre-merge review layer for AI coding agents",
      desc: "Add a validation step before any code ships — AI-written or human-written — no extra tooling required."
    },
  ];

  const comingSoon = [
    { icon: <GitPullRequest className="w-4 h-4" />, label: "GitHub PR Review", desc: "Auto-flag risky assumptions on every pull request." },
    { icon: <Zap className="w-4 h-4" />, label: "CI/CD Checks", desc: "Block merges when critical assumptions are unverified." },
    { icon: <Cpu className="w-4 h-4" />, label: "Cursor & Claude Code", desc: "Validate inline as you build with AI coding tools." },
    { icon: <Code2 className="w-4 h-4" />, label: "Paste Code + Prompt", desc: "Drop in any AI output and get assumption analysis instantly." },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/20">
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none z-0 mix-blend-overlay"></div>
      <div className="fixed top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="fixed bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none z-0"></div>

      <Header />

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-16">

          {/* Hero */}
          <div className="text-center space-y-5">
            <motion.div variants={item} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary uppercase tracking-widest">
              A second opinion before you trust AI code
            </motion.div>
            <motion.h1 variants={item} className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/50">
                      ASOF finds the hidden assumptions in your code before they break in production.
            </motion.h1>
            <motion.p variants={item} className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Whether you wrote it yourself or an AI did — code makes silent assumptions about inputs, APIs, and databases. ASOF surfaces every one of them before you ship.
            </motion.p>
          </div>

          {/* The four outputs */}
          <motion.div variants={item} className="space-y-3">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">What you get back</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { emoji: "🔍", label: "What the AI assumed", desc: "Hidden context the AI filled in without being told — about your auth, data format, API behavior, ordering, or environment.", color: "border-blue-500/20 bg-blue-500/5" },
                { emoji: "💥", label: "What could break", desc: "The specific failure modes those assumptions create — race conditions, wrong amounts, unauthorized access, stale state.", color: "border-red-500/20 bg-red-500/5" },
                { emoji: "✅", label: "What you should verify", desc: "A concrete checklist of things to confirm before running, deploying, or copying the code into your project.", color: "border-amber-500/20 bg-amber-500/5" },
                { emoji: "🚦", label: "Safe to run / Risky / Needs review", desc: "A confidence-scored verdict so you know at a glance whether to trust it, fix it, or ask your AI to try again.", color: "border-emerald-500/20 bg-emerald-500/5" },
              ].map((o, i) => (
                <div key={i} className={`glass-card p-5 rounded-xl border ${o.color} space-y-2`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{o.emoji}</span>
                    <p className="font-bold text-sm text-white">{o.label}</p>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{o.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* How it's different */}
          <motion.div variants={item} className="glass-card p-8 rounded-2xl border border-white/10 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <h2 className="text-xl font-bold">Not a test. Not a linter. Something different.</h2>
            </div>
            <div className="grid md:grid-cols-4 gap-3 text-sm">
              <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                <p className="font-semibold text-white/70 mb-1 text-xs">Linters</p>
                <p className="text-muted-foreground text-xs">"Is this code styled and safe?"</p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                <p className="font-semibold text-white/70 mb-1 text-xs">Tests</p>
                <p className="text-muted-foreground text-xs">"Does it behave as expected?"</p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                <p className="font-semibold text-white/70 mb-1 text-xs">Code review tools</p>
                <p className="text-muted-foreground text-xs">"Are there bugs or security issues?"</p>
              </div>
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                <p className="font-semibold text-primary mb-1 text-xs">ASOF</p>
                <p className="text-muted-foreground text-xs">"Is the <em>reasoning</em> behind this trustworthy?"</p>
              </div>
            </div>
          </motion.div>

          {/* Before/After Examples */}
          <motion.div variants={item} className="space-y-4">
            <h2 className="text-2xl font-bold">What ASOF catches</h2>
            <p className="text-muted-foreground">These are real classes of assumptions AI coding agents make — silently, confidently, and sometimes catastrophically.</p>
            <div className="space-y-3">
              {assumptions.map((a, i) => (
                <div key={i} className="glass-card rounded-xl border border-white/5 overflow-hidden">
                  <div className="p-4 bg-red-500/5 border-b border-white/5 flex items-start gap-3">
                    <span className="text-red-400 font-bold text-xs mt-0.5 shrink-0 uppercase tracking-wider">AI assumed</span>
                    <p className="text-sm text-white/80 font-mono leading-snug">{a.bad}</p>
                  </div>
                  <div className="p-3 flex items-start gap-3">
                    <span className="text-amber-400 font-bold text-xs mt-0.5 shrink-0 uppercase tracking-wider">Risk</span>
                    <p className="text-xs text-muted-foreground">{a.risk}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Who it's for */}
          <motion.div variants={item} className="space-y-4">
            <h2 className="text-2xl font-bold">Who it's for</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {audiences.map((a, i) => (
                <div key={i} className="glass-card p-6 rounded-2xl border border-white/5 space-y-3">
                  <div className={`w-10 h-10 rounded-xl ${a.bg} flex items-center justify-center`}>
                    {a.icon}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">{a.label}</p>
                    <h3 className="font-bold text-sm leading-snug">{a.tagline}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{a.desc}</p>
                </div>
              ))}
            </div>

            {/* Tier structure */}
            <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Tier structure — pay only for what you need</p>
              <div className="grid sm:grid-cols-3 gap-3">
                {[
                  {
                    name: "Lite", price: "$0.50", color: "text-emerald-400", border: "border-emerald-500/20 bg-emerald-500/5",
                    features: ["Risk verdict", "Full assumption list", "What could break", "PDF report download"],
                  },
                  {
                    name: "Pro", price: "$1.00", color: "text-blue-400", border: "border-blue-500/20 bg-blue-500/5",
                    features: ["Everything in Lite", "Verify checklist", "Suggestion cards"],
                  },
                  {
                    name: "Max", price: "$2.50", color: "text-purple-400", border: "border-purple-500/20 bg-purple-500/5",
                    features: ["Everything in Pro", "Safer code rewrite", "Side-by-side diff"],
                  },
                ].map((t, i) => (
                  <div key={i} className={`rounded-xl border p-4 space-y-2 ${t.border}`}>
                    <div className="flex items-baseline justify-between">
                      <span className={`font-bold text-sm ${t.color}`}>{t.name}</span>
                      <span className="text-xs text-white/60">{t.price}</span>
                    </div>
                    <ul className="space-y-1">
                      {t.features.map((f, j) => (
                        <li key={j} className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                          <span className={`w-1 h-1 rounded-full shrink-0 ${t.color.replace("text-", "bg-")}`} />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground text-center">One free trial per device (verdict + 2 assumptions) — no payment required to start.</p>
            </div>
          </motion.div>

          {/* Coming integrations */}
          <motion.div variants={item} className="glass-card p-8 rounded-2xl border border-white/10 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <GitPullRequest className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Integrations — coming soon</h2>
                <p className="text-xs text-muted-foreground">Mentioned early because they're the obvious next step.</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {comingSoon.map((c, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className="text-purple-400 mt-0.5 shrink-0">{c.icon}</div>
                  <div>
                    <p className="text-sm font-semibold">{c.label}</p>
                    <p className="text-xs text-muted-foreground">{c.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center pt-2">
              Want early access? Email <span className="text-primary">Support@asofai.com</span>
            </p>
          </motion.div>

          {/* Mission */}
          <motion.div variants={item} className="glass-card p-10 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Globe className="w-32 h-32" />
            </div>
            <div className="max-w-xl space-y-4">
              <h2 className="text-2xl font-bold">Our Mission</h2>
              <p className="text-muted-foreground leading-relaxed text-lg">
                To build the infrastructure for a world where AI agents act on verified reality — not stale data, unchecked assumptions, or confident guesses.
              </p>
            </div>
          </motion.div>

        </motion.div>
      </main>
      <Footer />
    </div>
  );
}
