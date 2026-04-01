import { db } from "./db";
import { signals, payments, freeTrials, type InsertSignal, type Signal, type Payment } from "@shared/schema";
import { desc, eq } from "drizzle-orm";

export interface IStorage {
  createSignal(signal: InsertSignal): Promise<Signal>;
  getSignals(): Promise<Signal[]>;
  createPayment(payment: { stripeSessionId: string, amount: number, tier: string }): Promise<Payment>;
  getPaymentBySessionId(sessionId: string): Promise<Payment | undefined>;
  updatePaymentStatus(sessionId: string, status: string): Promise<Payment>;
  markSessionConsumed(sessionId: string): Promise<Payment>;
  hasUsedFreeTrial(fingerprint: string): Promise<boolean>;
  markFreeTrialUsed(fingerprint: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async createSignal(signal: InsertSignal): Promise<Signal> {
    const [newSignal] = await db.insert(signals).values(signal).returning();
    return newSignal;
  }

  async getSignals(): Promise<Signal[]> {
    return await db.select().from(signals).orderBy(desc(signals.timestamp));
  }

  async createPayment(data: { stripeSessionId: string, amount: number, tier: string }): Promise<Payment> {
    const [payment] = await db.insert(payments).values({
      stripeSessionId: data.stripeSessionId,
      amount: data.amount,
      tier: data.tier,
      status: "pending"
    }).returning();
    return payment;
  }

  async getPaymentBySessionId(sessionId: string): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.stripeSessionId, sessionId));
    return payment;
  }

  async updatePaymentStatus(sessionId: string, status: string): Promise<Payment> {
    const [payment] = await db.update(payments)
      .set({ status })
      .where(eq(payments.stripeSessionId, sessionId))
      .returning();
    return payment;
  }

  async markSessionConsumed(sessionId: string): Promise<Payment> {
    const [payment] = await db.update(payments)
      .set({ consumed: true })
      .where(eq(payments.stripeSessionId, sessionId))
      .returning();
    return payment;
  }

  async hasUsedFreeTrial(fingerprint: string): Promise<boolean> {
    const [trial] = await db.select().from(freeTrials).where(eq(freeTrials.fingerprint, fingerprint));
    return !!trial?.used;
  }

  async markFreeTrialUsed(fingerprint: string): Promise<void> {
    await db.insert(freeTrials)
      .values({ fingerprint, used: true })
      .onConflictDoUpdate({ target: freeTrials.fingerprint, set: { used: true } });
  }
}

export const storage = new DatabaseStorage();
