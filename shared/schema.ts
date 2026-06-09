import { pgTable, text, serial, jsonb, real, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const codeAnalyses = pgTable("code_analyses", {
  id: serial("id").primaryKey(),
  codeSnippet: text("code_snippet").notNull(),
  riskLevel: text("risk_level").notNull(),
  summary: text("summary").notNull(),
  tier: text("tier").notNull(),
  fingerprint: text("fingerprint"),
  sessionId: text("session_id"),
  fullData: jsonb("full_data"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertCodeAnalysisSchema = createInsertSchema(codeAnalyses).omit({
  id: true,
  timestamp: true,
});

export type CodeAnalysis = typeof codeAnalyses.$inferSelect;
export type InsertCodeAnalysis = z.infer<typeof insertCodeAnalysisSchema>;

export const signals = pgTable("signals", {
  id: serial("id").primaryKey(),
  agentId: text("agent_id").notNull(),
  payload: jsonb("payload").notNull(),
  insight: text("insight").notNull(),
  confidence: real("confidence").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  stripeSessionId: text("stripe_session_id").notNull().unique(),
  status: text("status").notNull().default("pending"),
  amount: integer("amount").notNull(),
  tier: text("tier").notNull().default("lite"),
  consumed: boolean("consumed").notNull().default(false),
  analysisId: integer("analysis_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const freeTrials = pgTable("free_trials", {
  id: serial("id").primaryKey(),
  fingerprint: text("fingerprint").notNull().unique(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSignalSchema = createInsertSchema(signals).omit({
  id: true,
  timestamp: true
});

export type Signal = typeof signals.$inferSelect;
export type InsertSignal = z.infer<typeof insertSignalSchema>;
export type Payment = typeof payments.$inferSelect;

export const runAutomationSchema = z.object({
  agent_id: z.string(),
  payload: z.record(z.any()),
  sessionId: z.string(),
});
