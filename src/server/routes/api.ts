import { Router } from "express";
import { z } from "zod";
import type { AppConfig } from "../config.js";
import type { Db } from "../db/pool.js";
import { requiredMigrationsApplied } from "../db/migrate.js";
import type { SessionService } from "../services/session-service.js";
import type { FlightService } from "../services/flight-service.js";
import type { QuoteService } from "../services/quote-service.js";
import type { BookingService } from "../services/booking-service.js";
import { requireAuth, type AuthedRequest } from "../middleware/session.js";
import { selectButtonAttribute } from "../../domain/scenario.js";

export function createApiRouter(deps: {
  config: AppConfig;
  db: Db;
  sessions: SessionService;
  flights: FlightService;
  quotes: QuoteService;
  bookings: BookingService;
}): Router {
  const router = Router();
  const { config, db, sessions, flights, quotes, bookings } = deps;

  router.get("/health", async (_req, res) => {
    try {
      await db.query("SELECT 1");
      const migrationsOk = await requiredMigrationsApplied(db);
      if (!migrationsOk) {
        res.status(503).json({
          status: "not-ready",
          database: true,
          migrations: false,
          scenario: config.demoMode ? config.scenario : undefined,
        });
        return;
      }
      res.json({
        status: "ready",
        database: true,
        migrations: true,
        demoMode: config.demoMode,
        scenario: config.demoMode ? config.scenario : undefined,
        now: config.clock.now().toISOString(),
        selectButton: selectButtonAttribute(config.scenario),
      });
    } catch {
      res.status(503).json({ status: "not-ready", database: false, migrations: false });
    }
  });

  router.post("/session", async (req, res, next) => {
    try {
      const body = z
        .object({
          email: z.string().email(),
          password: z.string().min(1),
        })
        .parse(req.body);
      const result = await sessions.login(body.email, body.password);
      if (!result) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }
      res.cookie(config.cookieName, result.token, {
        httpOnly: true,
        sameSite: "lax",
        secure: config.nodeEnv === "production",
        path: "/",
      });
      res.status(201).json({ user: result.user });
    } catch (error) {
      next(error);
    }
  });

  router.get("/session", async (req: AuthedRequest, res) => {
    if (!req.actor) {
      res.json({ authenticated: false, user: null });
      return;
    }
    const { sessionId: _, ...user } = req.actor;
    void _;
    res.json({ authenticated: true, user });
  });

  router.delete("/session", async (req, res, next) => {
    try {
      const token = req.cookies?.[config.cookieName] as string | undefined;
      await sessions.logout(token);
      res.clearCookie(config.cookieName, { path: "/" });
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  router.post("/flights/search", requireAuth, async (req: AuthedRequest, res, next) => {
    try {
      const body = z
        .object({
          from: z.string().min(3).max(3),
          to: z.string().min(3).max(3),
          departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          cabin: z.string(),
          passengerCount: z.number().int().positive(),
        })
        .parse(req.body);
      const results = await flights.search(body);
      res.json({ results });
    } catch (error) {
      next(error);
    }
  });

  router.post("/quotes", requireAuth, async (req: AuthedRequest, res, next) => {
    try {
      const body = z
        .object({
          itineraryId: z.string().min(1),
          fareCode: z.string().min(1),
          passengerCount: z.number().int().positive(),
        })
        .strict()
        .parse(req.body);
      const quote = await quotes.create(req.actor!, {
        itineraryId: body.itineraryId,
        fareCode: body.fareCode,
        passengerCount: body.passengerCount,
      });
      res.status(201).json({ quote });
    } catch (error) {
      next(error);
    }
  });

  router.get("/quotes/:id", requireAuth, async (req: AuthedRequest, res, next) => {
    try {
      const quoteId = String(req.params.id);
      const quote = await quotes.getForActor(req.actor!, quoteId);
      if (!quote) {
        res.status(404).json({ error: "Quote not found" });
        return;
      }
      res.json({ quote });
    } catch (error) {
      next(error);
    }
  });

  router.post("/bookings", requireAuth, async (req: AuthedRequest, res, next) => {
    try {
      const body = z
        .object({
          quoteId: z.string().min(1),
        })
        .strict()
        .parse(req.body);
      const idempotencyKey = String(req.header("Idempotency-Key") || "");
      const { booking, created } = await bookings.create(req.actor!, {
        quoteId: body.quoteId,
        idempotencyKey,
      });
      res.status(created ? 201 : 200).json({ booking });
    } catch (error) {
      next(error);
    }
  });

  router.get("/bookings/:id", requireAuth, async (req: AuthedRequest, res, next) => {
    try {
      const bookingId = String(req.params.id);
      const booking = await bookings.getForActor(req.actor!, bookingId);
      if (!booking) {
        res.status(404).json({ error: "Booking not found" });
        return;
      }
      res.json({ booking });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
