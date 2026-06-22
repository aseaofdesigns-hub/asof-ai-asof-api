---
name: path-to-regexp deploy crash
description: Express 4 incompatible with path-to-regexp v8; causes silent crash in production bundle
---

The root-level `path-to-regexp` in `package.json` must stay pinned to `0.1.13`.

**Why:** Express 4 internally requires path-to-regexp v0.1.x. esbuild bundles the root-level version. If v8 is present, Express's `lazyrouter` crashes with `TypeError: n$ is not a function` (minified `pathRegexp is not a function`) on every request. The crash happens after Stripe schema init so the server appears to start but serves 500 on every route.

**How to apply:** Never bump `path-to-regexp` past `0.1.x` in package.json. If you see a deployment crash loop with `n$ is not a function` at `He.lazyrouter`, check this first.
