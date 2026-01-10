import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { StatCard } from "@/components/StatCard";
import { RunAutomationForm } from "@/components/RunAutomationForm";
import { SignalsTable } from "@/components/SignalsTable";
import { ConfidenceChart } from "@/components/ConfidenceChart";
import { useSignals } from "@/hooks/use-automation";
import { Activity, Zap, BarChart3, Database, ShieldCheck, Lock } from "lucide-react";
import { motion } from "framer-motion";

export default function Dashboard() {
  const { data: signals } = useSignals();
  const [paidSessionId, setPaidSessionId] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("stripe_session_id");
    if (saved) setPaidSessionId(saved);
  }, []);
  
  // Calculate stats
  const totalSignals = signals?.length || 0;
  const avgConfidence = signals?.length 
    ? (signals.reduce((acc, curr) => acc + curr.confidence, 0) / signals.length * 100).toFixed(1)
    : "0.0";
  const lastActive = signals?.length 
    ? new Date(signals[0].timestamp!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : "--:--";

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

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-8"
        >
          <div>
            <h1 className="text-3xl font-bold tracking-tight">As-of AI Automation</h1>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              ASOF.ai is a paid automation that verifies whether an assumption, signal, or dataset is still valid as of the current moment, returning a confidence-scored decision agents can safely act on.
            </p>
          </div>

          {/* Status Banner */}
          <div className="flex justify-between items-center bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-primary/20 rounded-xl">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider">Execution Status</h2>
                <p className="text-xs text-muted-foreground font-mono">
                  {paidSessionId ? "READY TO EXECUTE" : "LOCKED - PAYMENT REQUIRED"}
                </p>
              </div>
            </div>
            {paidSessionId ? (
              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/20 text-xs font-bold">
                <ShieldCheck className="w-3 h-3" />
                VERIFIED
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 text-amber-500 rounded-full border border-amber-500/20 text-xs font-bold">
                <Lock className="w-3 h-3" />
                LOCKED
              </div>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div variants={item}>
              <StatCard 
                title="Total Signals" 
                value={totalSignals} 
                icon={<Database className="w-5 h-5" />} 
                trend="+12% today"
                trendUp={true}
              />
            </motion.div>
            <motion.div variants={item}>
              <StatCard 
                title="Avg Confidence" 
                value={`${avgConfidence}%`} 
                icon={<Activity className="w-5 h-5" />} 
                trend={parseFloat(avgConfidence) > 80 ? "High accuracy" : "Calibration needed"}
                trendUp={parseFloat(avgConfidence) > 80}
              />
            </motion.div>
            <motion.div variants={item}>
              <StatCard 
                title="System Status" 
                value="Online" 
                icon={<Zap className="w-5 h-5" />} 
                className="border-emerald-500/20"
                trend="Latency: 45ms"
                trendUp={true}
              />
            </motion.div>
            <motion.div variants={item}>
              <StatCard 
                title="Last Active" 
                value={lastActive} 
                icon={<BarChart3 className="w-5 h-5" />} 
              />
            </motion.div>
          </div>

          {/* Main Content Area */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
            {/* Left Column: Input Form */}
            <motion.div variants={item} className="lg:col-span-1 h-full">
              <RunAutomationForm />
            </motion.div>
            
            {/* Right Column: Chart & Table */}
            <motion.div variants={item} className="lg:col-span-2 flex flex-col gap-6 h-full">
              {/* Chart Section */}
              <div className="h-[240px] glass-card rounded-2xl p-6 border border-white/5 relative overflow-hidden">
                 <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Activity className="w-4 h-4 text-primary" />
                      Confidence Trends
                    </h3>
                 </div>
                 <div className="h-[160px] w-full">
                   <ConfidenceChart />
                 </div>
              </div>

              {/* Pricing Table (Moved and Resized) */}
              <div className="glass-card rounded-2xl overflow-hidden border border-white/5">
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px] text-left">
                    <thead className="uppercase tracking-wider text-muted-foreground bg-white/5">
                      <tr>
                        <th className="px-4 py-2">Feature</th>
                        <th className="px-4 py-2 text-center">Lite</th>
                        <th className="px-4 py-2 text-center">Pro</th>
                        <th className="px-4 py-2 text-center">Max</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      <tr className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-2 font-medium">Verdict</td>
                        <td className="px-4 py-2 text-center">✅</td>
                        <td className="px-4 py-2 text-center">✅</td>
                        <td className="px-4 py-2 text-center">✅</td>
                      </tr>
                      <tr className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-2 font-medium">Score</td>
                        <td className="px-4 py-2 text-center">✅</td>
                        <td className="px-4 py-2 text-center">✅</td>
                        <td className="px-4 py-2 text-center">✅</td>
                      </tr>
                      <tr className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-2 font-medium">Evidence</td>
                        <td className="px-4 py-2 text-center">❌</td>
                        <td className="px-4 py-2 text-center">✅</td>
                        <td className="px-4 py-2 text-center">✅</td>
                      </tr>
                      <tr className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-2 font-medium">Strict/Risk</td>
                        <td className="px-4 py-2 text-center">❌</td>
                        <td className="px-4 py-2 text-center">✅</td>
                        <td className="px-4 py-2 text-center">✅</td>
                      </tr>
                      <tr className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-2 font-medium">Conflict/Pri</td>
                        <td className="px-4 py-2 text-center">❌</td>
                        <td className="px-4 py-2 text-center">❌</td>
                        <td className="px-4 py-2 text-center">✅</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Table Section */}
              <div className="flex-1 glass-card rounded-2xl p-6 border border-white/5 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between mb-4 shrink-0">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Database className="w-4 h-4 text-primary" />
                    Recent Signals
                  </h3>
                </div>
                <div className="flex-1 overflow-auto pr-2 custom-scrollbar">
                  <SignalsTable />
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
