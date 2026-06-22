import { z } from 'zod';
import { runAutomationSchema, signals } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

export const codeAnalysisResultSchema = z.object({
  risk_level: z.enum(['SAFE', 'NEEDS_REVIEW', 'RISKY', 'CRITICAL']),
  summary: z.string(),
  assumptions: z.array(z.object({ text: z.string(), severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']) })),
  risks: z.array(z.object({ text: z.string(), severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']) })).optional(),
  checks: z.array(z.string()).optional(),
  safer_code: z.string().optional(),
  suggestions: z.array(z.object({
    problem: z.string(),
    why_it_matters: z.string(),
    fix: z.string(),
  })).optional(),
  gated: z.boolean().optional(),
  gated_tier: z.string().optional(),
  tier: z.string().optional(),
  analysisId: z.number().optional(),
});

export type CodeAnalysisResult = z.infer<typeof codeAnalysisResultSchema>;

export const api = {
  payments: {
    create: {
      method: 'POST' as const,
      path: '/api/create-payment',
      input: z.object({
        tier: z.enum(['lite', 'pro', 'max']),
        analysisId: z.number().optional(),
        fromTier: z.enum(['free', 'lite', 'pro']).optional(),
      }),
      responses: {
        200: z.object({ url: z.string() }),
        500: errorSchemas.internal
      }
    },
    verify: {
      method: 'GET' as const,
      path: '/api/verify-payment/:sessionId',
      responses: {
        200: z.object({ status: z.string() }),
        404: z.object({ message: z.string() })
      }
    }
  },
  automation: {
    run: {
      method: 'POST' as const,
      path: '/api/run',
      input: runAutomationSchema,
      responses: {
        200: z.object({
          success: z.boolean(),
          data: z.object({
            tier: z.string(),
            assumption_verdict: z.enum(['VALID', 'INVALID', 'CONFLICTED', 'UNKNOWN', 'STALE']),
            assumption_confidence: z.number(),
            timestamp: z.string(),
            explanation: z.string().optional(),
            evidence: z.array(z.object({
              source: z.string(),
              assertion: z.string(),
              last_verified_at: z.string().nullable(),
              priority: z.number(),
              signal_confidence: z.number(),
            })).optional(),
            risk_level: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
            signal_confidence: z.number().optional(),
            key_findings: z.array(z.string()).optional(),
            recommended_actions: z.array(z.string()).optional(),
            conflicts: z.array(z.object({
              between: z.array(z.string()),
              type: z.string(),
              detail: z.string(),
            })).optional(),
            winning_signal: z.object({
              source: z.string(),
              score: z.number(),
              reason: z.string(),
            }).nullable().optional(),
            stale_days: z.number().optional(),
            remediation: z.object({
              remediation_required: z.boolean(),
              severity: z.enum(['NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
              steps: z.array(z.object({
                step: z.number(),
                action: z.string(),
                detail: z.string(),
                priority: z.enum(['IMMEDIATE', 'SHORT_TERM', 'LONG_TERM']),
              })),
              estimated_fix_time: z.string(),
              prevention_tips: z.array(z.string()),
            }).optional(),
            gated: z.boolean().optional(),
            gated_reason: z.string().optional(),
            gated_message: z.string().optional(),
            upgrade_hint: z.string().optional(),
            upgrade_options: z.array(z.object({
              tier: z.string(),
              price: z.string(),
              unlocks: z.array(z.string()),
            })).optional(),
            preview: z.object({
              risk_level: z.string().optional(),
              hint: z.string().optional(),
            }).optional(),
          })
        }),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
        500: errorSchemas.internal
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/signals',
      responses: {
        200: z.array(z.custom<typeof signals.$inferSelect>()),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
