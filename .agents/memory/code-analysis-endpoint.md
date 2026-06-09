---
name: Code analysis endpoint
description: /api/analyze-code - AI-powered code assumption analysis with tier gating
---

POST /api/analyze-code accepts: { code, prompt?, sessionId?, fingerprint? }
- fingerprint → free trial (2 assumptions only, gated)
- sessionId → paid tier from payments table (lite/pro/max)
- Uses freeTrials table (imported as `freeTrials` camelCase from @shared/schema)
- Uses `eq` from drizzle-orm for queries

Tier gating returns subsets:
- free: risk_level + summary + 2 assumptions, gated:true gated_tier:'lite'
- lite: + all assumptions + risks, gated:true gated_tier:'pro'
- pro: + checks + suggestions, gated:true gated_tier:'max'
- max: full including safer_code, gated:false

**Why:** Tier gating on server side keeps paid features secure.
**How to apply:** Always use static imports for freeTrials/eq, never dynamic imports inside route handlers.
