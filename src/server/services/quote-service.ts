import crypto from "node:crypto";
import type { Db } from "../db/pool.js";
import type { Clock } from "../../domain/clock.js";
import type { QuoteView } from "../../domain/types.js";
import { buildPrice, storedPriceSnapshot } from "../../domain/money.js";
import type { FlightService } from "./flight-service.js";
import type { SessionActor } from "./session-service.js";

const QUOTE_TTL_MS = 1000 * 60 * 30;

function mapQuote(row: Record<string, unknown>): QuoteView {
  const price = storedPriceSnapshot(row);
  return {
    id: String(row.id),
    itineraryId: String(row.itinerary_id),
    itinerary: row.itinerary_snapshot as QuoteView["itinerary"],
    passengerCount: Number(row.passenger_count),
    price,
    expiresAt: new Date(String(row.expires_at)).toISOString(),
  };
}

export class QuoteService {
  constructor(
    private readonly db: Db,
    private readonly flights: FlightService,
    private readonly clock: Clock,
  ) {}

  async create(
    actor: SessionActor,
    input: { itineraryId: string; fareCode: string; passengerCount: number },
  ): Promise<QuoteView> {
    if (input.passengerCount !== 1) {
      throw Object.assign(new Error("Only 1 passenger is supported"), { status: 400 });
    }
    const flight = await this.flights.getById(input.itineraryId);
    if (!flight) {
      throw Object.assign(new Error("Itinerary not found"), { status: 404 });
    }
    if (flight.fareCode !== input.fareCode) {
      throw Object.assign(new Error("Fare code does not match itinerary"), { status: 400 });
    }

    const price = buildPrice(flight.baseCents, flight.taxesFeesCents);
    const id = crypto.randomUUID();
    const expiresAt = new Date(this.clock.now().getTime() + QUOTE_TTL_MS).toISOString();

    await this.db.query(
      `INSERT INTO quotes (
        id, user_id, tenant_id, itinerary_id, fare_code, passenger_count,
        base_cents, taxes_fees_cents, total_cents, currency, itinerary_snapshot, expires_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12)`,
      [
        id,
        actor.id,
        actor.tenantId,
        flight.id,
        flight.fareCode,
        input.passengerCount,
        price.baseCents,
        price.taxesFeesCents,
        price.totalCents,
        price.currency,
        JSON.stringify(flight),
        expiresAt,
      ],
    );

    return {
      id,
      itineraryId: flight.id,
      itinerary: flight,
      passengerCount: input.passengerCount,
      price,
      expiresAt,
    };
  }

  async getForActor(actor: SessionActor, quoteId: string): Promise<QuoteView | null> {
    const result = await this.db.query(
      `SELECT * FROM quotes WHERE id = $1 AND user_id = $2 AND tenant_id = $3`,
      [quoteId, actor.id, actor.tenantId],
    );
    if (!result.rows[0]) return null;
    return mapQuote(result.rows[0]);
  }
}
