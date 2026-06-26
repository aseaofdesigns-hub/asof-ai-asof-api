import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import type { Request, Response, NextFunction } from "express";

const allowedOrigins = [
  "https://asofai.com",
  "https://www.asofai.com",
  /\.onrender\.com$/,
  /\.replit\.app$/,
  /\.replit\.dev$/,
  /^http:\/\/localhost/,
];

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.stripe.com", "https://*.replit.app", "https://*.replit.dev"],
      frameSrc: ["https://js.stripe.com"],
    },
  },
});

export const corsPolicy = cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const allowed = allowedOrigins.some(pattern =>
      typeof pattern === "string" ? pattern === origin : pattern.test(origin)
    );
    if (allowed) return callback(null, true);
    callback(new Error(`CORS: origin not allowed — ${origin}`));
  },
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
  skip: (req) => req.originalUrl === "/api/stripe/webhook" || req.path === "/stripe/webhook",
});

export const analyzeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Analysis rate limit reached. Please wait a moment." },
});

// Sustained-abuse cap: limits total analyses per IP per hour. Because this is
// keyed on IP (not the browser fingerprint), it also bounds people who switch
// browsers / use incognito to farm fresh free trials from the same connection.
export const analyzeHourlyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Hourly analysis limit reached. Please try again later." },
});

export function apiNotFound(req: Request, res: Response, next: NextFunction) {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "Endpoint not found" });
  }
  next();
}
