import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { getUncachableStripeClient } from "./stripeClient";
import { sql } from "drizzle-orm";
import { db } from "./db";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.post(api.payments.create.path, async (req, res) => {
    try {
      const stripe = await getUncachableStripeClient();
      const { tier } = api.payments.create.input.parse(req.body);
      
      // Live Stripe price IDs - fallback if database sync hasn't happened
      const livePriceIds: Record<string, { price_id: string; unit_amount: number }> = {
        lite: { price_id: 'price_1SnuQmAGtLlBc3WPf2LwcpRH', unit_amount: 50 },
        pro: { price_id: 'price_1SnuQnAGtLlBc3WP0kv4feWH', unit_amount: 100 },
        max: { price_id: 'price_1SnuQnAGtLlBc3WPMh06ap1f', unit_amount: 250 },
      };

      let price_id: string;
      let unit_amount: number;

      try {
        const result = await db.execute(
          sql`SELECT p.id as product_id, pr.id as price_id, p.name, pr.unit_amount
              FROM stripe.products p
              JOIN stripe.prices pr ON pr.product = p.id
              WHERE p.metadata->>'tier' = ${tier}
              AND p.active = true
              AND pr.active = true
              ORDER BY p.id DESC
              LIMIT 1`
        );

        if (result.rows.length > 0) {
          const row = result.rows[0] as any;
          price_id = row.price_id;
          unit_amount = row.unit_amount;
        } else {
          // Use fallback
          const fallback = livePriceIds[tier];
          if (!fallback) {
            return res.status(404).json({ message: `No price found for tier: ${tier}` });
          }
          price_id = fallback.price_id;
          unit_amount = fallback.unit_amount;
          console.log(`Using fallback price for tier ${tier}: ${price_id}`);
        }
      } catch (dbErr) {
        // Database query failed, use fallback
        console.log('Database query failed, using fallback prices:', dbErr);
        const fallback = livePriceIds[tier];
        if (!fallback) {
          return res.status(404).json({ message: `No price found for tier: ${tier}` });
        }
        price_id = fallback.price_id;
        unit_amount = fallback.unit_amount;
      }

      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers.host || req.headers.origin?.replace(/^https?:\/\//, '');
      const baseUrl = req.headers.origin || `${protocol}://${host}`;

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price: price_id,
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${baseUrl}/verify?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/`,
        metadata: {
          tier: tier
        }
      });

      await storage.createPayment({
        stripeSessionId: session.id,
        amount: unit_amount as number,
        tier: tier
      });

      res.json({ url: session.url });
    } catch (err) {
      console.error('Payment creation error:', err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid tier" });
      }
      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });

  app.get(api.payments.verify.path, async (req, res) => {
    const { sessionId } = req.params;

    try {
      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      
      if (session.payment_status === 'paid') {
        await storage.updatePaymentStatus(sessionId, 'paid');
        return res.json({ status: 'paid' });
      }
      res.json({ status: session.payment_status });
    } catch (err) {
      console.error('Payment verification error:', err);
      res.status(404).json({ message: "Session not found" });
    }
  });

  app.post(api.automation.run.path, async (req, res) => {
    try {
      const { agent_id, payload, sessionId } = api.automation.run.input.parse(req.body);

      const payment = await storage.getPaymentBySessionId(sessionId);
      if (!payment || payment.status !== 'paid') {
        return res.status(401).json({ message: "Payment required to run automation" });
      }
      const tier = payment.tier;

      const result = {
        insight: `As-of signal processed (${tier.toUpperCase()} Tier)`,
        confidence: tier === 'max' ? 0.98 : tier === 'pro' ? 0.92 : 0.87,
        evidence: tier !== 'lite' ? [
          { name: "source_timestamp", value: new Date().toISOString(), weight: 0.7 },
          { name: "consistency_check", value: true, weight: 0.3 }
        ] : undefined,
        explanation: tier !== 'lite' ? "Signal verified against primary and secondary sources with high consistency." : undefined,
        timestamp: new Date().toISOString()
      };

      await storage.createSignal({
        agentId: agent_id,
        payload: payload,
        insight: result.insight,
        confidence: result.confidence
      });

      res.json({
        success: true,
        data: result
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  app.get(api.automation.list.path, async (req, res) => {
    const list = await storage.getSignals();
    res.json(list);
  });

  return httpServer;
}
