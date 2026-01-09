import { pgTable, text, serial, jsonb, real, timestamp, integer } from "drizzle-orm/pg-core";
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
