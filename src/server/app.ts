import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cookieParser from "cookie-parser";
import { ZodError } from "zod";
import type { AppConfig } from "./config.js";
import type { Db } from "./db/pool.js";
import { SessionService } from "./services/session-service.js";
import { FlightService } from "./services/flight-service.js";
import { QuoteService } from "./services/quote-service.js";
import { BookingService } from "./services/booking-service.js";
import { SimulatedProviderAdapter } from "./adapters/provider.js";
import { sessionMiddleware } from "./middleware/session.js";
import { createApiRouter } from "./routes/api.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function fsExists(p: string): boolean {
  return fs.existsSync(path.join(p, "index.html"));
}

export function createApp(config: AppConfig, db: Db) {
  const app = express();
  const sessions = new SessionService(db, config.clock);
  const flights = new FlightService(db);
  const quotes = new QuoteService(db, flights, config.clock);
  const bookings = new BookingService(
    db,
    quotes,
    new SimulatedProviderAdapter(),
    config.clock,
    config.scenario,
  );

  app.disable("x-powered-by");
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser(config.sessionSecret));
  app.use(sessionMiddleware(sessions, config.cookieName));

  app.use(
    "/api",
    createApiRouter({ config, db, sessions, flights, quotes, bookings }),
  );

  // API 404s must remain JSON, not SPA HTML
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  const clientDir = path.resolve(__dirname, "../client");
  if (config.nodeEnv === "production" || fsExists(clientDir)) {
    app.use(express.static(clientDir));
    app.get(/^(?!\/api).*/, (req, res) => {
      if (req.path.startsWith("/api")) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      res.sendFile(path.join(clientDir, "index.html"));
    });
  }

  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      if (err instanceof ZodError) {
        res.status(400).json({ error: "Validation failed", details: err.flatten() });
        return;
      }
      const status =
        err && typeof err === "object" && "status" in err
          ? Number((err as { status: number }).status)
          : 500;
      const message =
        err instanceof Error ? err.message : "Internal server error";
      if (status >= 500) {
        console.error(err);
      }
      res.status(status || 500).json({
        error: message,
        code:
          err && typeof err === "object" && "code" in err
            ? (err as { code?: string }).code
            : undefined,
      });
    },
  );

  return app;
}
