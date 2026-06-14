---
name: SignalsTable history display
description: How Recent Analyses works, what caused phantom April data, and session retention fix
---

# SignalsTable — Recent Analyses

## Rule
SignalsTable must ONLY query `useCodeAnalyses` and never fall back to the legacy `useSignals` hook. The signals table is a separate, old concept unrelated to the code-audit product.

**Why:** The signals fallback caused April test data to appear in "Recent Analyses" whenever no code analyses matched the current fingerprint/sessionIds, deeply confusing users who had real paid sessions.

## Session retention fix
`consumeSession()` in RunAutomationForm now marks sessions `{ used: true }` instead of deleting them from `asof_sessions` localStorage. This keeps session IDs available for the `useCodeAnalyses` query to find past analyses by sessionId even after the credit is spent.

**How to apply:** `paidSessionId` is derived as `sessions.find(s => !s.used)?.id` — only unused sessions are offered for new runs. All sessions (used + unused) stay in localStorage for history lookup.

## Production DB note
Dev DB is always empty for code_analyses — all real analyses live in the production database. "No analyses showing" in dev preview is expected and correct.
