import crypto from "node:crypto";
import type pg from "pg";
import type { Db } from "../db/pool.js";
import { withTransaction } from "../db/pool.js";
import type { Clock } from "../../domain/clock.js";
import type { BookingView, DemoScenario } from "../../domain/types.js";
import { buildPrice } from "../../domain/money.js";
import { assertTransition } from "../../domain/booking-state.js";
import { shouldOmitFinalization } from "../../domain/scenario.js";
import type { ProviderAdapter } from "../adapters/provider.js";
import type { QuoteService } from "./quote-service.js";
import type { SessionActor } from "./session-service.js";

function payloadHash(quoteId: string): string {
  return crypto.createHash("sha256").update(JSON.stringify({ quoteId })).digest("hex");
}

function mapBooking(row: Record<string, unknown>): BookingView {
  const price = buildPrice(Number(row.base_cents), Number(row.taxes_fees_cents));
  return {
    id: String(row.id),
    status: row.status as BookingView["status"],
    quoteId: String(row.quote_id),
    itineraryId: String(row.itinerary_id),
    itinerary: row.itinerary_snapshot as BookingView["itinerary"],
    travelerId: String(row.traveler_id),
    travelerEmail: String(row.traveler_email),
    travelerName: String(row.traveler_name),
    fareCode: String(row.fare_code),
    price,
    providerReference: row.provider_reference ? String(row.provider_reference) : null,
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

export class BookingService {
  constructor(
    private readonly db: Db,
    private readonly quotes: QuoteService,
    private readonly provider: ProviderAdapter,
    private readonly clock: Clock,
    private readonly scenario: DemoScenario,
  ) {}

  async create(
    actor: SessionActor,
    input: { quoteId: string; idempotencyKey: string },
  ): Promise<{ booking: BookingView; created: boolean }> {
    if (!input.idempotencyKey?.trim()) {
      throw Object.assign(new Error("Idempotency-Key is required"), { status: 400 });
    }

    const quote = await this.quotes.getForActor(actor, input.quoteId);
    if (!quote) {
      throw Object.assign(new Error("Quote not found"), { status: 404 });
    }
    if (new Date(quote.expiresAt).getTime() <= this.clock.now().getTime()) {
      throw Object.assign(new Error("Quote has expired"), { status: 409 });
    }

    const hash = payloadHash(input.quoteId);

    const existing = await this.db.query(
      `SELECT * FROM bookings
       WHERE tenant_id = $1 AND user_id = $2 AND idempotency_key = $3`,
      [actor.tenantId, actor.id, input.idempotencyKey],
    );
    if (existing.rows[0]) {
      if (existing.rows[0].idempotency_payload_hash !== hash) {
        throw Object.assign(new Error("Idempotency key reuse with different payload"), {
          status: 409,
          code: "IDEMPOTENCY_CONFLICT",
        });
      }
      return { booking: mapBooking(existing.rows[0]), created: false };
    }

    const bookingId = crypto.randomUUID();

    try {
      const booking = await withTransaction(this.db, async (client) => {
        await client.query(
          `INSERT INTO bookings (
            id, user_id, tenant_id, quote_id, itinerary_id, fare_code,
            traveler_id, traveler_email, traveler_name,
            base_cents, taxes_fees_cents, total_cents, currency,
            status, provider_reference, itinerary_snapshot,
            idempotency_key, idempotency_payload_hash
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'pending',NULL,$14::jsonb,$15,$16
          )`,
          [
            bookingId,
            actor.id,
            actor.tenantId,
            quote.id,
            quote.itineraryId,
            quote.itinerary.fareCode,
            actor.travelerId,
            actor.email,
            actor.displayName,
            quote.price.baseCents,
            quote.price.taxesFeesCents,
            quote.price.totalCents,
            quote.price.currency,
            JSON.stringify(quote.itinerary),
            input.idempotencyKey,
            hash,
          ],
        );

        // Provider is simulated in-process; do not hold a real network call across a DB transaction in production.
        const confirmation = await this.provider.confirm({
          bookingId,
          itineraryId: quote.itineraryId,
          totalCents: quote.price.totalCents,
          currency: quote.price.currency,
        });

        if (confirmation.status === "confirmed") {
          await this.finalizeConfirmed(client, bookingId, confirmation.providerReference);
        }

        const row = await client.query(`SELECT * FROM bookings WHERE id = $1`, [bookingId]);
        return mapBooking(row.rows[0]);
      });

      return { booking, created: true };
    } catch (error: unknown) {
      if (isUniqueViolation(error)) {
        const again = await this.db.query(
          `SELECT * FROM bookings
           WHERE tenant_id = $1 AND user_id = $2 AND idempotency_key = $3`,
          [actor.tenantId, actor.id, input.idempotencyKey],
        );
        if (again.rows[0]) {
          if (again.rows[0].idempotency_payload_hash !== hash) {
            throw Object.assign(new Error("Idempotency key reuse with different payload"), {
              status: 409,
              code: "IDEMPOTENCY_CONFLICT",
            });
          }
          return { booking: mapBooking(again.rows[0]), created: false };
        }
      }
      throw error;
    }
  }

  async getForActor(actor: SessionActor, bookingId: string): Promise<BookingView | null> {
    const result = await this.db.query(
      `SELECT * FROM bookings WHERE id = $1 AND user_id = $2 AND tenant_id = $3`,
      [bookingId, actor.id, actor.tenantId],
    );
    if (!result.rows[0]) return null;
    return mapBooking(result.rows[0]);
  }

  /**
   * Healthy path persists confirmed status after simulated provider confirmation.
   * pending-finalization intentionally omits this update (controlled application defect).
   */
  private async finalizeConfirmed(
    client: pg.PoolClient,
    bookingId: string,
    providerReference: string,
  ): Promise<void> {
    // CONTROLLED APPLICATION DEFECT (demo PR): provider confirmed, but the
    // finalization update is omitted. Receipt/API expose pending truthfully.
    void client;
    void bookingId;
    void providerReference;
    return;
  }
}

function isUniqueViolation(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "23505",
  );
}
