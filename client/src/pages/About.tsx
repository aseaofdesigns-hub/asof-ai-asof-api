import { motion } from "framer-motion";
import { Header } from "@/components/Header";
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
      tagline: "Assumption validation for AI-generated code",
      desc: "Catch the silent guesses your AI coding agent makes before they hit production."
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
      desc: "Add a validation step before any AI-generated code ships — no extra tooling required."
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
              What ASOF does
            </motion.div>
            <motion.h1 variants={item} className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/50">
              What did your AI assume?
            </motion.h1>
            <motion.p variants={item} className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Paste your AI-generated signals or connect your agent. ASOF finds risky assumptions, missing checks, and places where the AI may have guessed — before those guesses cause real damage.
            </motion.p>
          </div>

          {/* How it's different */}
          <motion.div variants={item} className="glass-card p-8 rounded-2xl border border-white/10 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <h2 className="text-xl font-bold">Not a test. Not a linter. Something different.</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                <p className="font-semibold text-white/80 mb-1">Tests ask:</p>
                <p className="text-muted-foreground">"Does this code behave as expected?"</p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                <p className="font-semibold text-white/80 mb-1">Linters ask:</p>
                <p className="text-muted-foreground">"Is this code styled and safe?"</p>
              </div>
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                <p className="font-semibold text-primary mb-1">ASOF asks:</p>
                <p className="text-muted-foreground">"Is the <em>reasoning</em> behind this code still trustworthy?"</p>
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
    </div>
  );
}
