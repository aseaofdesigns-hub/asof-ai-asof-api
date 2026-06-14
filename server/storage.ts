import { db } from "./db";
import { signals, payments, freeTrials, codeAnalyses, type InsertSignal, type Signal, type Payment, type InsertCodeAnalysis, type CodeAnalysis } from "@shared/schema";
import { desc, eq } from "drizzle-orm";

export interface IStorage {
  createSignal(signal: InsertSignal): Promise<Signal>;
  getSignals(): Promise<Signal[]>;
  createPayment(payment: { stripeSessionId: string, amount: number, tier: string, analysisId?: number }): Promise<Payment>;
  getPaymentBySessionId(sessionId: string): Promise<Payment | undefined>;
  updatePaymentStatus(sessionId: string, status: string): Promise<Payment>;
  updatePaymentEmail(sessionId: string, email: string): Promise<void>;
  getUnconsumedPaymentsByEmail(email: string): Promise<Payment[]>;
  getAllPaidPaymentsByEmail(email: string): Promise<Payment[]>;
  markSessionConsumed(sessionId: string): Promise<Payment>;
  hasUsedFreeTrial(fingerprint: string): Promise<boolean>;
  markFreeTrialUsed(fingerprint: string): Promise<void>;
  createCodeAnalysis(analysis: InsertCodeAnalysis): Promise<CodeAnalysis>;
  getCodeAnalyses(filter: { fingerprints?: string[]; sessionIds?: string[] }): Promise<CodeAnalysis[]>;
  getAnalysisById(id: number): Promise<CodeAnalysis | undefined>;
  upgradeAnalysisTier(id: number, tier: string): Promise<CodeAnalysis>;
}

export class DatabaseStorage implements IStorage {
  async createSignal(signal: InsertSignal): Promise<Signal> {
    const [newSignal] = await db.insert(signals).values(signal).returning();
    return newSignal;
  }

  async getSignals(): Promise<Signal[]> {
    return await db.select().from(signals).orderBy(desc(signals.timestamp));
  }

  async createPayment(data: { stripeSessionId: string, amount: number, tier: string, analysisId?: number }): Promise<Payment> {
    const [payment] = await db.insert(payments).values({
      stripeSessionId: data.stripeSessionId,
      amount: data.amount,
      tier: data.tier,
      status: "pending",
      analysisId: data.analysisId ?? null,
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

  async updatePaymentEmail(sessionId: string, email: string): Promise<void> {
    await db.update(payments)
      .set({ customerEmail: email })
      .where(eq(payments.stripeSessionId, sessionId));
  }

  async getUnconsumedPaymentsByEmail(email: string): Promise<Payment[]> {
    return await db.select().from(payments)
      .where(eq(payments.customerEmail, email.toLowerCase().trim()));
  }

  async getAllPaidPaymentsByEmail(email: string): Promise<Payment[]> {
    return await db.select().from(payments)
      .where(eq(payments.customerEmail, email.toLowerCase().trim()));
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

  async createCodeAnalysis(analysis: InsertCodeAnalysis): Promise<CodeAnalysis> {
    const [record] = await db.insert(codeAnalyses).values(analysis).returning();
    return record;
  }

  async getCodeAnalyses(filter: { fingerprints?: string[]; sessionIds?: string[] }): Promise<CodeAnalysis[]> {
    const { fingerprints = [], sessionIds = [] } = filter;
    if (fingerprints.length === 0 && sessionIds.length === 0) return [];
    const { or, inArray } = await import("drizzle-orm");
    const conditions = [];
    if (fingerprints.length > 0) conditions.push(inArray(codeAnalyses.fingerprint, fingerprints));
    if (sessionIds.length > 0) conditions.push(inArray(codeAnalyses.sessionId, sessionIds));
    return await db.select().from(codeAnalyses)
      .where(or(...conditions))
      .orderBy(desc(codeAnalyses.timestamp));
  }

  async getAnalysisById(id: number): Promise<CodeAnalysis | undefined> {
    const [record] = await db.select().from(codeAnalyses).where(eq(codeAnalyses.id, id));
    return record;
  }

  async upgradeAnalysisTier(id: number, tier: string): Promise<CodeAnalysis> {
    const [record] = await db.update(codeAnalyses)
      .set({ tier })
      .where(eq(codeAnalyses.id, id))
      .returning();
    return record;
  }
}

export const storage = new DatabaseStorage();
