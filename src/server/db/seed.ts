import bcrypt from "bcryptjs";
import type { Db } from "./pool.js";

export const SEED_FLIGHTS = [
  {
    id: "flight-as88-20261112",
    flightNumber: "AS88",
    carrier: "Alaska Airlines",
    origin: "SFO",
    destination: "JFK",
    departureAt: "2026-11-12T14:30:00.000Z",
    arrivalAt: "2026-11-12T23:05:00.000Z",
    fareCode: "ECONOMY_STANDARD",
    baseCents: 36000,
    taxesFeesCents: 2500,
    currency: "USD",
    stops: 0,
    durationMins: 335,
    sortOrder: 1,
  },
  {
    id: "flight-ua123-20261112",
    flightNumber: "UA123",
    carrier: "United Airlines",
    origin: "SFO",
    destination: "JFK",
    departureAt: "2026-11-12T16:00:00.000Z",
    arrivalAt: "2026-11-12T21:30:00.000Z",
    fareCode: "ECONOMY_STANDARD",
    baseCents: 40000,
    taxesFeesCents: 2800,
    currency: "USD",
    stops: 0,
    durationMins: 330,
    sortOrder: 2,
  },
  {
    id: "flight-dl455-20261112",
    flightNumber: "DL455",
    carrier: "Delta Air Lines",
    origin: "SFO",
    destination: "JFK",
    departureAt: "2026-11-12T18:15:00.000Z",
    arrivalAt: "2026-11-12T02:40:00.000Z",
    fareCode: "ECONOMY_STANDARD",
    baseCents: 45500,
    taxesFeesCents: 3100,
    currency: "USD",
    stops: 1,
    durationMins: 505,
    sortOrder: 3,
  },
] as const;

export async function seed(db: Db, seedPassword: string): Promise<void> {
  const passwordHash = await bcrypt.hash(seedPassword, 10);

  await db.query(
    `
    INSERT INTO users (id, email, password_hash, display_name, tenant_id, traveler_id)
    VALUES
      ('user-alex', 'alex@example.test', $1, 'Alex Traveler', 'tenant-demo', 'traveler-demo'),
      ('user-blake', 'blake@example.test', $1, 'Blake Other', 'tenant-demo', 'traveler-blake')
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      password_hash = EXCLUDED.password_hash,
      display_name = EXCLUDED.display_name,
      tenant_id = EXCLUDED.tenant_id,
      traveler_id = EXCLUDED.traveler_id
    `,
    [passwordHash],
  );

  for (const flight of SEED_FLIGHTS) {
    await db.query(
      `
      INSERT INTO flights (
        id, flight_number, carrier, origin, destination, departure_at, arrival_at,
        fare_code, base_cents, taxes_fees_cents, currency, stops, duration_mins, sort_order
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      ON CONFLICT (id) DO UPDATE SET
        flight_number = EXCLUDED.flight_number,
        carrier = EXCLUDED.carrier,
        origin = EXCLUDED.origin,
        destination = EXCLUDED.destination,
        departure_at = EXCLUDED.departure_at,
        arrival_at = EXCLUDED.arrival_at,
        fare_code = EXCLUDED.fare_code,
        base_cents = EXCLUDED.base_cents,
        taxes_fees_cents = EXCLUDED.taxes_fees_cents,
        currency = EXCLUDED.currency,
        stops = EXCLUDED.stops,
        duration_mins = EXCLUDED.duration_mins,
        sort_order = EXCLUDED.sort_order
      `,
      [
        flight.id,
        flight.flightNumber,
        flight.carrier,
        flight.origin,
        flight.destination,
        flight.departureAt,
        flight.arrivalAt,
        flight.fareCode,
        flight.baseCents,
        flight.taxesFeesCents,
        flight.currency,
        flight.stops,
        flight.durationMins,
        flight.sortOrder,
      ],
    );
  }
}

export async function resetDemoData(db: Db, seedPassword: string): Promise<void> {
  await db.query("DELETE FROM bookings");
  await db.query("DELETE FROM quotes");
  await db.query("DELETE FROM sessions");
  await db.query("DELETE FROM flights");
  await db.query("DELETE FROM users");
  await seed(db, seedPassword);
}
