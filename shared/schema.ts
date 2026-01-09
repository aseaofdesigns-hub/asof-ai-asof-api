import { pgTable, text, serial, jsonb, real, timestamp } from "drizzle-orm/pg-core";
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

export const insertSignalSchema = createInsertSchema(signals).omit({ 
  id: true,
  timestamp: true 
});

export type Signal = typeof signals.$inferSelect;
export type InsertSignal = z.infer<typeof insertSignalSchema>;

export const runAutomationSchema = z.object({
  agent_id: z.string(),
  payload: z.record(z.any()),
});
