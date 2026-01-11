import { motion } from "framer-motion";
import { Header } from "@/components/Header";
import { ShieldCheck, Zap, Globe, AlertTriangle } from "lucide-react";

export default function About() {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary/20">
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none z-0 mix-blend-overlay"></div>
      <div className="fixed top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="fixed bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none z-0"></div>

      <Header />

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">
        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-12"
        >
          <div className="text-center space-y-4">
            <motion.h1 variants={item} className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/50">
              The Standard for <br />AI Decision Integrity
            </motion.h1>
            <motion.p variants={item} className="text-lg text-muted-foreground max-w-2xl mx-auto">
              ASOF.ai provides the "As-of" verification layer for autonomous agents, ensuring they act on reality, not stale data.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div variants={item} className="glass-card p-8 rounded-2xl border border-white/5 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold">Trust by Design</h3>
              <p className="text-muted-foreground leading-relaxed">
                We believe AI agents are only as good as the data they consume. Our platform introduces a verification step that checks freshness, consistency, and conflict before any action is taken.
              </p>
            </motion.div>

            <motion.div variants={item} className="glass-card p-8 rounded-2xl border border-white/5 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Zap className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold">Real-time Veracity</h3>
              <p className="text-muted-foreground leading-relaxed">
                "As-of" isn't just a name—it's a commitment. We provide timestamps and cryptographic proof that a signal was valid at the exact moment of execution.
              </p>
            </motion.div>
          </div>

          <motion.div variants={item} className="glass-card p-10 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Globe className="w-32 h-32" />
            </div>
            <div className="max-w-xl space-y-4">
              <h2 className="text-2xl font-bold">Our Mission</h2>
              <p className="text-muted-foreground leading-relaxed text-lg">
                To build the infrastructure for a world where billions of autonomous agents can interact securely, knowing that every assumption they hold has been verified "as of" right now.
              </p>
            </div>
          </motion.div>

          <motion.div variants={item} className="p-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 backdrop-blur-sm">
            <div className="flex items-start gap-4">
              <div className="bg-amber-500/20 p-2 rounded-lg shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-amber-400">Verification Layer, Not a Replacement</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  ASOF.ai is a verification layer, not a replacement for reasoning or search. ASOF.ai verifies whether assumptions are still valid as of now. Always review your code, data pipelines, and system logic to ensure they correctly apply validated assumptions.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
