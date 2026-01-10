import { db } from "./db";
import { signals, payments, type InsertSignal, type Signal, type Payment } from "@shared/schema";
import { desc, eq } from "drizzle-orm";

export interface IStorage {
  createSignal(signal: InsertSignal): Promise<Signal>;
  getSignals(): Promise<Signal[]>;
  createPayment(payment: { stripeSessionId: string, amount: number, tier: string }): Promise<Payment>;
  getPaymentBySessionId(sessionId: string): Promise<Payment | undefined>;
  updatePaymentStatus(sessionId: string, status: string): Promise<Payment>;
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
}

export const storage = new DatabaseStorage();
