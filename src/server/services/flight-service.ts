import type { Db } from "../db/pool.js";
import type { FlightItinerary } from "../../domain/types.js";
import { buildPrice } from "../../domain/money.js";

function mapFlight(row: Record<string, unknown>): FlightItinerary {
  const price = buildPrice(Number(row.base_cents), Number(row.taxes_fees_cents));
  return {
    id: String(row.id),
    flightNumber: String(row.flight_number),
    from: String(row.origin),
    to: String(row.destination),
    departureAt: new Date(String(row.departure_at)).toISOString(),
    arrivalAt: new Date(String(row.arrival_at)).toISOString(),
    fareCode: String(row.fare_code),
    baseCents: price.baseCents,
    taxesFeesCents: price.taxesFeesCents,
    totalCents: price.totalCents,
    currency: "USD",
    carrier: String(row.carrier),
    stops: Number(row.stops),
    durationMins: Number(row.duration_mins),
  };
}

export class FlightService {
  constructor(private readonly db: Db) {}

  async search(input: {
    from: string;
    to: string;
    departureDate: string;
    cabin: string;
    passengerCount: number;
  }): Promise<FlightItinerary[]> {
    if (input.passengerCount !== 1) {
      throw Object.assign(new Error("Only 1 passenger is supported in this demo"), { status: 400 });
    }
    if (input.cabin !== "ECONOMY") {
      throw Object.assign(new Error("Only ECONOMY cabin is supported in this demo"), { status: 400 });
    }

    const from = input.from.trim().toUpperCase();
    const to = input.to.trim().toUpperCase();
    const day = input.departureDate;

    const result = await this.db.query(
      `SELECT * FROM flights
       WHERE origin = $1
         AND destination = $2
         AND departure_at::date = $3::date
       ORDER BY sort_order ASC`,
      [from, to, day],
    );
    return result.rows.map(mapFlight);
  }

  async getById(id: string): Promise<FlightItinerary | null> {
    const result = await this.db.query(`SELECT * FROM flights WHERE id = $1`, [id]);
    if (!result.rows[0]) return null;
    return mapFlight(result.rows[0]);
  }
}
