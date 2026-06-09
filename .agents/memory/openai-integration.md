---
name: OpenAI integration
description: How OpenAI is wired into this project via Replit AI Integrations
---

Uses `AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL` env vars.
Import pattern in server: `import OpenAI from "openai"` then `new OpenAI({ apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY, baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL })`.
No user API key required — billed to Replit credits.
Best model for general analysis: `gpt-5.4`. Best for code: `gpt-5.3-codex` (Responses API only, not chat completions).

**Why:** Replit-managed integration avoids exposing API keys and simplifies setup for the user.
