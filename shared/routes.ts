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

export const api = {
  payments: {
    create: {
      method: 'POST' as const,
      path: '/api/create-payment',
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
            insight: z.string(),
            confidence: z.number(),
            timestamp: z.string()
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
