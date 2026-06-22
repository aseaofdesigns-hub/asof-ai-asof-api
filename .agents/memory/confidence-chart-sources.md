---
name: Confidence chart data sources
description: ConfidenceChart must merge signals (legacy) and code_analyses (current) for full history
---

The Confidence Trends chart in `client/src/components/ConfidenceChart.tsx` uses both:
- `useCodeAnalyses()` — newer code audit results (June 2026+)
- `useSignals()` — legacy automation signals (Jan–Apr 2026)

**Why:** Historical data lives in the `signals` table; newer audits are in `code_analyses`. Using only one source cuts off months of history. Signals use a text `insight` field mapped to risk scores via `insightToScore()`/`insightToRisk()`.

**How to apply:** When modifying the chart, always keep both data sources merged and sorted by timestamp. The mapping: VALID→SAFE(95), CONFLICTED/STALE→RISKY(35), INVALID→CRITICAL(10), UNKNOWN→NEEDS_REVIEW(65).
