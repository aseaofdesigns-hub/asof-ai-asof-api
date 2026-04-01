import { pgTable, text, serial, jsonb, real, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
  status: text("status").notNull().default("pending"), // pending, paid
  amount: integer("amount").notNull(),
  tier: text("tier").notNull().default("lite"), // lite, pro, max
  consumed: boolean("consumed").notNull().default(false), // one-time use protection
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
  sessionId: z.string(), // Required to verify payment before run
});
