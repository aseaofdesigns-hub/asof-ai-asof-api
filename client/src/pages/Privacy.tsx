import { motion } from "framer-motion";
import { Header } from "@/components/Header";
import { Shield, Eye, Lock, FileText } from "lucide-react";

export default function Privacy() {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <Header />
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-16 relative z-10">
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-12">
          <div className="text-center space-y-4">
            <motion.h1 variants={item} className="text-4xl font-extrabold tracking-tight">Privacy Policy</motion.h1>
            <motion.p variants={item} className="text-muted-foreground">Last updated: January 10, 2026</motion.p>
          </div>

          <div className="grid gap-8">
            <motion.section variants={item} className="glass-card p-8 rounded-2xl border border-white/5 space-y-4">
              <div className="flex items-center gap-3 text-primary">
                <Eye className="w-5 h-5" />
                <h2 className="text-xl font-bold">Data Collection</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                ASOF.ai only collects the data necessary to verify signals. This includes agent identities and the specific payloads sent for verification. We do not sell or share this data with third parties.
              </p>
            </motion.section>

            <motion.section variants={item} className="glass-card p-8 rounded-2xl border border-white/5 space-y-4">
              <div className="flex items-center gap-3 text-purple-400">
                <Lock className="w-5 h-5" />
                <h2 className="text-xl font-bold">Security Protocols</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                All data transmitted to ASOF.ai is encrypted in transit and at rest. We use enterprise-grade security to ensure your automation signals remain confidential.
              </p>
            </motion.section>

            <motion.section variants={item} className="glass-card p-8 rounded-2xl border border-white/5 space-y-4">
              <div className="flex items-center gap-3 text-emerald-400">
                <Shield className="w-5 h-5" />
                <h2 className="text-xl font-bold">Payment Security</h2>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Payment processing is handled securely by Stripe. ASOF.ai never stores your credit card information on our servers.
              </p>
            </motion.section>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
