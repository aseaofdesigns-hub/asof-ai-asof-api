import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Check, Maximize2, ChevronRight, Download, AlertTriangle, XCircle, CheckCircle2, ShieldCheck, Lock, Eye } from "lucide-react";
import type { CodeAnalysisResult } from "@shared/routes";

type Tab = "summary" | "assumptions" | "risks" | "suggestions" | "rewrite";
type ModalData =
  | { kind: "assumption"; text: string; severity: string }
  | { kind: "risk"; text: string; severity: string }
  | { kind: "suggestion"; problem: string; why_it_matters: string; fix: string }
  | null;

const SEV_ORDER: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
const SEV_BADGE: Record<string, string> = {
  HIGH: "bg-red-500/15 text-red-400 border-red-500/30",
  MEDIUM: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  LOW: "bg-blue-500/15 text-blue-400 border-blue-500/30",
};
const RISK_STYLE: Record<string, { text: string; bg: string; border: string; icon: JSX.Element }> = {
  SAFE: { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25", icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" /> },
  NEEDS_REVIEW: { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/25", icon: <AlertTriangle className="w-5 h-5 text-amber-400" /> },
  RISKY: { text: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/25", icon: <AlertTriangle className="w-5 h-5 text-orange-400" /> },
  CRITICAL: { text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/25", icon: <XCircle className="w-5 h-5 text-red-400" /> },
};
const SCORE_MAP: Record<string, number> = { SAFE: 90, NEEDS_REVIEW: 62, RISKY: 32, CRITICAL: 10 };

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/10 border border-white/10"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function CodePanel({ label, code, accent = false }: { label: string; code: string; accent?: boolean }) {
  const [fullscreen, setFullscreen] = useState(false);
  return (
    <>
      <div className="flex flex-col gap-2 min-w-0">
        <div className="flex items-center justify-between">
          <p className={`text-xs font-bold uppercase tracking-widest ${accent ? "text-emerald-400" : "text-muted-foreground"}`}>{label}</p>
          <div className="flex items-center gap-1.5">
            <CopyButton text={code} />
            <button
              onClick={() => setFullscreen(true)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/10 border border-white/10"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              Expand
            </button>
          </div>
        </div>
        <pre
          className={`text-sm leading-relaxed font-mono rounded-xl p-4 overflow-auto max-h-[480px] whitespace-pre-wrap break-all ${
            accent
              ? "bg-emerald-500/5 border border-emerald-500/20 text-emerald-100/85"
              : "bg-white/5 border border-white/10 text-white/65"
          }`}
          style={{ fontSize: "13.5px", lineHeight: "1.65" }}
        >
          {code}
        </pre>
      </div>

      <AnimatePresence>
        {fullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col bg-[#080614]/95 backdrop-blur-md p-4 sm:p-8"
          >
            <div className="flex items-center justify-between mb-4">
              <p className={`text-sm font-bold uppercase tracking-widest ${accent ? "text-emerald-400" : "text-muted-foreground"}`}>{label}</p>
              <div className="flex items-center gap-2">
                <CopyButton text={code} />
                <button onClick={() => setFullscreen(false)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/10 border border-white/10">
                  <X className="w-4 h-4" /> Close
                </button>
              </div>
            </div>
            <pre
              className={`flex-1 overflow-auto rounded-xl p-6 font-mono whitespace-pre-wrap break-all ${
                accent ? "bg-emerald-500/5 border border-emerald-500/20 text-emerald-100/85" : "bg-white/5 border border-white/10 text-white/65"
              }`}
              style={{ fontSize: "14px", lineHeight: "1.7" }}
            >
              {code}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

interface Props {
  result: CodeAnalysisResult;
  originalCode: string;
  onDismiss: () => void;
  onDownloadPDF: () => void;
  upgradedFrom?: string;
}

export function AnalysisResultPanel({ result, originalCode, onDismiss, onDownloadPDF, upgradedFrom }: Props) {
  const [tab, setTab] = useState<Tab>("summary");
  const [modal, setModal] = useState<ModalData>(null);

  const assumptions = (result.assumptions ?? []).slice().sort((a, b) => (SEV_ORDER[a.severity] ?? 9) - (SEV_ORDER[b.severity] ?? 9));
  const risks = (result.risks ?? []).slice().sort((a, b) => (SEV_ORDER[a.severity] ?? 9) - (SEV_ORDER[b.severity] ?? 9));
  const suggestions = result.suggestions ?? [];
  const rs = RISK_STYLE[result.risk_level] ?? RISK_STYLE.NEEDS_REVIEW;
  const score = SCORE_MAP[result.risk_level] ?? 50;

  const topFixes = [...risks, ...assumptions].filter(i => i.severity === "HIGH").slice(0, 3);

  const TIER_UNLOCKS: Record<string, Tab[]> = {
    lite:  ["summary", "assumptions", "risks"],
    pro:   ["summary", "assumptions", "risks", "suggestions"],
    max:   ["summary", "assumptions", "risks", "suggestions", "rewrite"],
    free:  ["summary", "assumptions", "risks"],
  };
  const isTabLocked = (tabId: Tab): boolean => {
    if (!result.gated || !result.tier) return false;
    const unlocked = TIER_UNLOCKS[result.tier] ?? [];
    return !unlocked.includes(tabId);
  };

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "summary", label: "Summary" },
    ...(assumptions.length > 0 ? [{ id: "assumptions" as Tab, label: "Assumptions", count: assumptions.length }] : []),
    ...(risks.length > 0 ? [{ id: "risks" as Tab, label: "What Could Break", count: risks.length }] : []),
    ...(suggestions.length > 0 ? [{ id: "suggestions" as Tab, label: "Suggestions", count: suggestions.length }] : []),
    ...(result.safer_code ? [{ id: "rewrite" as Tab, label: "Safe Rewrite" }] : []),
  ];

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.4 }}
        className="glass-card rounded-2xl border border-white/10 overflow-hidden"
      >
        {/* Sample / example notice */}
        {result.isSample && (
          <div className="px-6 py-2.5 border-b border-orange-500/30 bg-orange-500/15 flex items-center gap-2.5">
            <Eye className="w-4 h-4 text-orange-300 shrink-0" />
            <span className="text-[11px] font-bold text-orange-200 uppercase tracking-widest px-2 py-0.5 rounded bg-orange-500/20 border border-orange-500/40">
              Sample
            </span>
            <span className="text-[11px] text-orange-100/80 leading-snug">
              Example output showing what a paid report includes — not a real analysis of your code.
            </span>
          </div>
        )}

        {/* Upgrade confirmation banner */}
        {upgradedFrom && result.tier && upgradedFrom !== result.tier && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="px-6 py-2.5 border-b border-emerald-500/20 bg-emerald-500/10 flex items-center gap-2.5"
          >
            <span className="text-emerald-400 text-sm">✦</span>
            <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
              Upgraded: {upgradedFrom.toUpperCase()} → {result.tier.toUpperCase()}
            </span>
            <span className="text-[11px] text-emerald-400/60 ml-1">
              — new sections unlocked below
            </span>
          </motion.div>
        )}

        {/* Header */}
        <div className={`px-6 py-4 border-b border-white/10 flex items-center justify-between ${rs.bg}`}>
          <div className="flex items-center gap-3">
            {rs.icon}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className={`text-base font-bold ${rs.text}`}>
                  {result.risk_level.replace("_", " ")}
                </h2>
                {result.tier && (
                  <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-white/10 border border-white/15 text-muted-foreground">
                    {result.tier} tier
                  </span>
                )}
              </div>
              <p className="text-xs text-white/60 mt-0.5 max-w-2xl leading-snug">{result.summary}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-4">
            <span className={`text-sm font-bold font-mono px-2.5 py-1 rounded-lg border ${rs.bg} ${rs.border} ${rs.text}`}>
              {score}% safe
            </span>
            <button
              data-testid="button-download-pdf-panel"
              onClick={onDownloadPDF}
              className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 bg-white/5"
            >
              <Download className="w-3.5 h-3.5" />
              PDF
            </button>
            <button
              data-testid="button-dismiss-result-panel"
              onClick={onDismiss}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-white transition-colors hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-white/8 overflow-x-auto">
          {tabs.map(t => {
            const locked = isTabLocked(t.id);
            return (
              <button
                key={t.id}
                data-testid={`tab-${t.id}`}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors whitespace-nowrap ${
                  tab === t.id
                    ? locked
                      ? "text-yellow-400/80 border-b-2 border-yellow-500/60 -mb-px bg-yellow-500/8"
                      : "text-white border-b-2 border-primary -mb-px bg-primary/10"
                    : locked
                      ? "text-yellow-500/50 hover:text-yellow-400/70"
                      : "text-muted-foreground hover:text-white"
                }`}
              >
                {locked ? <Lock className="w-3 h-3 shrink-0" /> : null}
                {t.label}
                {t.count !== undefined && !locked && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/10 text-white/60">{t.count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {/* ── Summary ─────────────────────────────────── */}
            {tab === "summary" && (
              <motion.div key="summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                {topFixes.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">🔥 Fix These First</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {topFixes.map((f, i) => (
                        <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-red-500/5 border border-red-500/15">
                          <span className="flex-none w-6 h-6 rounded-full bg-red-500/20 text-red-400 text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                          <p className="text-sm text-white/80 leading-relaxed">{f.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Assumptions", count: assumptions.length, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", show: true },
                    { label: "What Could Break", count: risks.length, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", show: true },
                    { label: "Suggestions", count: suggestions.length, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20", show: suggestions.length > 0 },
                    { label: "Safe Rewrite", count: result.safer_code ? 1 : 0, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", show: !!result.safer_code },
                  ].filter(s => s.show).map(s => (
                    <div key={s.label} className={`rounded-xl p-4 border text-center ${s.bg}`}>
                      <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
                      <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">{s.label}</p>
                    </div>
                  ))}
                </div>

                {result.checks && result.checks.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">✅ Verify Checklist</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {result.checks.map((c, i) => (
                        <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/15">
                          <span className="text-amber-400 shrink-0 mt-0.5 text-sm">□</span>
                          <p className="text-sm text-white/75 leading-relaxed">{c}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Assumptions ─────────────────────────────── */}
            {tab === "assumptions" && (
              <motion.div key="assumptions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {assumptions.map((a, i) => (
                    <button
                      key={i}
                      data-testid={`card-assumption-${i}`}
                      onClick={() => setModal({ kind: "assumption", text: a.text, severity: a.severity })}
                      className="text-left p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 hover:bg-blue-500/10 hover:border-blue-500/25 transition-all group cursor-pointer space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${SEV_BADGE[a.severity]}`}>{a.severity}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-white/25 group-hover:text-white/60 transition-colors" />
                      </div>
                      <p className="text-sm text-white/75 leading-relaxed line-clamp-3">{a.text}</p>
                      <p className="text-[10px] text-primary/60 font-medium">View details →</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── Risks ───────────────────────────────────── */}
            {tab === "risks" && (
              <motion.div key="risks" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {risks.map((r, i) => (
                    <button
                      key={i}
                      data-testid={`card-risk-${i}`}
                      onClick={() => setModal({ kind: "risk", text: r.text, severity: r.severity })}
                      className="text-left p-4 rounded-xl bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 hover:border-red-500/25 transition-all group cursor-pointer space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${SEV_BADGE[r.severity]}`}>{r.severity}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-white/25 group-hover:text-white/60 transition-colors" />
                      </div>
                      <p className="text-sm text-white/75 leading-relaxed line-clamp-3">{r.text}</p>
                      <p className="text-[10px] text-primary/60 font-medium">View details →</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── Suggestions ─────────────────────────────── */}
            {tab === "suggestions" && (
              <motion.div key="suggestions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {isTabLocked("suggestions") ? (
                  <div className="relative rounded-xl overflow-hidden">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 blur-sm pointer-events-none select-none opacity-40">
                      {suggestions.map((s, i) => (
                        <div key={i} className="text-left p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                          <p className="text-sm font-semibold text-white leading-snug line-clamp-2">{s.problem}</p>
                          <p className="text-xs text-red-300/70 leading-relaxed line-clamp-2"><span className="font-semibold text-red-400/90">Why: </span>{s.why_it_matters}</p>
                        </div>
                      ))}
                    </div>
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40 backdrop-blur-[2px] rounded-xl">
                      <Lock className="w-7 h-7 text-yellow-400" />
                      <p className="text-sm font-bold text-white">Unlock with ASOF Pro</p>
                      <p className="text-xs text-white/60 text-center max-w-xs">Suggestion cards with exact fixes are included in Pro ($1.00) and Max ($2.50).</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        data-testid={`card-suggestion-${i}`}
                        onClick={() => setModal({ kind: "suggestion", problem: s.problem, why_it_matters: s.why_it_matters, fix: s.fix })}
                        className="text-left p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/8 hover:border-white/20 transition-all group cursor-pointer space-y-2"
                      >
                        <p className="text-sm font-semibold text-white leading-snug line-clamp-2">{s.problem}</p>
                        <p className="text-xs text-red-300/70 leading-relaxed line-clamp-2">
                          <span className="font-semibold text-red-400/90">Why: </span>{s.why_it_matters}
                        </p>
                        <p className="text-[10px] text-primary/60 font-medium group-hover:text-primary/80 transition-colors">View fix →</p>
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Safe Rewrite ─────────────────────────────── */}
            {tab === "rewrite" && result.safer_code && (
              <motion.div key="rewrite" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {isTabLocked("rewrite") ? (
                  <div className="relative rounded-xl overflow-hidden">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 blur-sm pointer-events-none select-none opacity-40">
                      <CodePanel label="Original AI Code" code={originalCode} />
                      <CodePanel label="🚦 Safer Suggested Code" code={result.safer_code} accent />
                    </div>
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/50 backdrop-blur-[2px] rounded-xl">
                      <Lock className="w-7 h-7 text-yellow-400" />
                      <p className="text-sm font-bold text-white">Unlock with ASOF Max</p>
                      <p className="text-xs text-white/60 text-center max-w-xs">The side-by-side safer code rewrite is exclusive to Max ($2.50) — the full fixed version alongside your original.</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <CodePanel label="Original AI Code" code={originalCode} />
                    <CodePanel label="🚦 Safer Suggested Code" code={result.safer_code} accent />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ── Detail Modal ─────────────────────────────────────── */}
      <AnimatePresence>
        {modal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setModal(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-lg bg-[#0d0a1e] border border-white/15 rounded-2xl overflow-hidden shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
                <p className="text-sm font-bold text-white capitalize">
                  {modal.kind === "assumption" ? "🔍 Assumption" : modal.kind === "risk" ? "💥 Risk" : "🛠 Suggestion"}
                </p>
                <button onClick={() => setModal(null)} className="p-1 rounded-lg text-muted-foreground hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                {(modal.kind === "assumption" || modal.kind === "risk") && (
                  <>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${SEV_BADGE[modal.severity]}`}>{modal.severity}</span>
                    <p className="text-sm text-white/85 leading-relaxed">{modal.text}</p>
                  </>
                )}
                {modal.kind === "suggestion" && (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-white/40 mb-1">Problem</p>
                      <p className="text-sm font-semibold text-white leading-relaxed">{modal.problem}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-red-400/60 mb-1">Why it matters</p>
                      <p className="text-sm text-red-300/80 leading-relaxed">{modal.why_it_matters}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-emerald-400/60 mb-1">Fix</p>
                      <p className="text-sm text-emerald-300/80 leading-relaxed">{modal.fix}</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
