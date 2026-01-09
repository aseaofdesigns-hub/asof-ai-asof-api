import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import Stripe from "stripe";

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY) 
  : null;

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.post(api.payments.create.path, async (req, res) => {
    if (!stripe) return res.status(500).json({ message: "Stripe not configured" });
    
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: { name: 'AI Automation Run' },
            unit_amount: 50, // $0.50
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${req.headers.origin}/verify?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.headers.origin}/`,
      });

      await storage.createPayment({
        stripeSessionId: session.id,
        amount: 50
      });

      res.json({ url: session.url });
    } catch (err) {
      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });

  app.get(api.payments.verify.path, async (req, res) => {
    const { sessionId } = req.params;
    if (!stripe) return res.status(500).json({ message: "Stripe not configured" });

    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status === 'paid') {
        await storage.updatePaymentStatus(sessionId, 'paid');
        return res.json({ status: 'paid' });
      }
      res.json({ status: session.payment_status });
    } catch (err) {
      res.status(404).json({ message: "Session not found" });
    }
  });

  app.post(api.automation.run.path, async (req, res) => {
    try {
      const { agent_id, payload, sessionId } = api.automation.run.input.parse(req.body);

      // Verify payment in storage
      const payment = await storage.getPaymentBySessionId(sessionId);
      if (!payment || payment.status !== 'paid') {
        return res.status(401).json({ message: "Payment required to run automation" });
      }

      const result = {
        insight: "As-of signal processed (Paid)",
        confidence: 0.87,
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
