---
name: Global analyses view
description: Recent Analyses and stats show all analyses globally, not per-browser
---

`GET /api/code-analyses` calls `storage.getAllCodeAnalyses()` which returns all rows with no fingerprint filter.

**Why:** The dashboard is a global view — all users see all analyses. The previous per-fingerprint design caused "No analyses yet" for any new browser session. `useCodeAnalyses()` in the client fetches `/api/code-analyses` with no query params.

**How to apply:** Do not add fingerprint/sessionId filtering back to this endpoint. If per-user views are ever needed, add a separate scoped endpoint.
