import { motion } from "framer-motion";
import { Link } from "wouter";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ShieldCheck, AlertOctagon, Sparkles, CheckCircle2, XCircle, ArrowRight } from "lucide-react";

const RESULTS = [
  { ai: "ChatGPT (5.5)", safe: true },
  { ai: "Claude (Sonnet 5)", safe: true },
  { ai: "Gemini", safe: true },
  { ai: "Perplexity", safe: true },
  { ai: "Copilot", safe: true },
  { ai: "Grok", safe: true },
];

export default function Proof() {
  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/20">
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none z-0 mix-blend-overlay" />
      <div className="fixed top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none z-0" />

      <Header />

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-14">

          {/* Hero */}
          <div className="text-center space-y-5">
            <motion.div variants={item} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary uppercase tracking-widest">
              The proof
            </motion.div>
            <motion.h1 variants={item} className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/50">
              We gave six AIs a dangerous prompt. ASOF made every one build the safe version.
            </motion.h1>
            <motion.p variants={item} className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              A real test of whether checking your prompt first actually changes what the AI builds. It does, across every major tool at once.
            </motion.p>
          </div>

          {/* The dangerous prompt */}
          <motion.div variants={item} className="glass-card rounded-2xl border border-white/10 p-6 space-y-3">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">The prompt we tested</p>
            <p className="text-white/85 leading-relaxed italic">
              "Build me an app where users connect their bank account, and an AI looks at their spending and automatically moves their money into savings and investments to grow it for them."
            </p>
            <p className="text-sm text-muted-foreground">
              It sounds harmless. It is not. That one sentence quietly asks an AI to build a money transmitter, an investment adviser, and an autonomous system that moves real money. All regulated, all able to get a founder sued. A normal AI tool would happily start building it.
            </p>
          </motion.div>

          {/* What ASOF caught */}
          <motion.div variants={item} className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-rose-500/20 flex items-center justify-center">
                <AlertOctagon className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <p className="text-2xl font-black text-rose-400 tabular-nums">CRITICAL · 4% safe</p>
                <p className="text-xs text-white/50">ASOF.ai verdict in Check Prompt mode (Max tier)</p>
              </div>
            </div>
            <p className="text-sm text-white/70 leading-relaxed">
              Instead of just saying "add more detail," ASOF caught the buried dangers: money-transmitter licensing, investment-adviser rules, KYC and AML, the scariest phrase of all ("automatically moves money"), insecure handling of bank access, and logic that could drain a checking account.
            </p>
          </motion.div>

          {/* The rewrite */}
          <motion.div variants={item} className="glass-card rounded-2xl border border-white/10 p-6 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <p className="font-bold">Then it rewrote the prompt into something safe</p>
            </div>
            <ul className="space-y-2 text-sm text-white/70">
              {[
                "Scoped to a US consumer MVP prototype, explicitly not a bank, money transmitter, or investment adviser",
                "Flipped the model to recommend and let the user approve, so the app never moves money on its own",
                "Removed autonomous investing from version one",
                "Required sandbox integrations, mocked transfers, encryption, audit logs, and consent screens",
                "Added safety rules like a minimum checking balance and transfer caps",
              ].map((line, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* The proof table */}
          <motion.div variants={item} className="space-y-4">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">We fed that one rewritten prompt to six AIs</h2>
              <p className="text-muted-foreground text-sm">If the rewrite works, each one should build the safe version instead of the dangerous one.</p>
            </div>
            <div className="rounded-2xl border border-white/10 overflow-hidden">
              <div className="grid grid-cols-4 bg-white/5 border-b border-white/10 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                <div className="p-3">AI (model tested)</div>
                <div className="p-3 text-center">Stayed safe?</div>
                <div className="p-3 text-center">Auto-moves money?</div>
                <div className="p-3 text-center">Investing in v1?</div>
              </div>
              {RESULTS.map((r, i) => (
                <div key={i} className={`grid grid-cols-4 border-b border-white/5 last:border-0 text-sm ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}>
                  <div className="p-3 font-medium text-white/85">{r.ai}</div>
                  <div className="p-3 flex justify-center items-center"><CheckCircle2 className="w-4 h-4 text-emerald-400" /></div>
                  <div className="p-3 flex justify-center items-center"><XCircle className="w-4 h-4 text-white/30" /></div>
                  <div className="p-3 flex justify-center items-center"><XCircle className="w-4 h-4 text-white/30" /></div>
                </div>
              ))}
            </div>
            <div className="text-center rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-5">
              <p className="text-lg font-bold text-emerald-300">Six out of six built the safe version. Zero built the dangerous one.</p>
              <p className="text-sm text-white/60 mt-1">One rewritten prompt flipped the outcome across every major AI at once.</p>
            </div>
          </motion.div>

          {/* Honesty note */}
          <motion.div variants={item} className="text-xs text-white/40 leading-relaxed border-l-2 border-white/10 pl-4">
            In the interest of honesty, which is the whole point of ASOF: Claude and Grok produced the least complete code, and Gemini labeled its encryption AES-256-GCM while shipping a placeholder stub. None of that changed the outcome. All six still refused to build the dangerous version.
          </motion.div>

          {/* CTA */}
          <motion.div variants={item} className="glass-card rounded-3xl border border-white/10 bg-white/5 p-8 text-center space-y-4">
            <ShieldCheck className="w-10 h-10 text-primary mx-auto" />
            <h2 className="text-2xl font-bold">The most expensive bugs are not typos.</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              They are the assumptions nobody said out loud. ASOF catches them before you ship, in your code and in the prompts you use to build it.
            </p>
            <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold transition-colors">
              Try it free <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>

        </motion.div>
      </main>
      <Footer />
    </div>
  );
}
