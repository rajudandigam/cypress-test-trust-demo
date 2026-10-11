import { afterEach, describe, expect, it } from "vitest";
import { authedJson, login, startTestApp } from "./helpers.js";

const UA123 = "flight-ua123-20261112";

describe("booking API", () => {
  let close: (() => Promise<void>) | undefined;

  afterEach(async () => {
    if (close) await close();
    close = undefined;
  });

  it("creates a confirmed booking with server-owned pricing", async () => {
    const app = await startTestApp("healthy");
    close = app.close;
    const { cookie } = await login(app.baseUrl);

    const quoteRes = await authedJson(app.baseUrl, cookie, "/api/quotes", {
      method: "POST",
      body: JSON.stringify({
        itineraryId: UA123,
        fareCode: "ECONOMY_STANDARD",
        passengerCount: 1,
      }),
    });
    expect(quoteRes.status).toBe(201);
    expect(quoteRes.body.quote.price.totalCents).toBe(42800);

    const bookRes = await authedJson(app.baseUrl, cookie, "/api/bookings", {
      method: "POST",
      headers: { "Idempotency-Key": "key-healthy-1" },
      body: JSON.stringify({ quoteId: quoteRes.body.quote.id }),
    });
    expect(bookRes.status).toBe(201);
    expect(bookRes.body.booking.status).toBe("confirmed");
    expect(bookRes.body.booking.price.totalCents).toBe(42800);
    expect(bookRes.body.booking.providerReference).toBeTruthy();

    const getRes = await authedJson(
      app.baseUrl,
      cookie,
      `/api/bookings/${bookRes.body.booking.id}`,
    );
    expect(getRes.status).toBe(200);
    expect(getRes.body.booking.status).toBe("confirmed");
  });

  it("rejects client amount/status overrides and unauthenticated access", async () => {
    const app = await startTestApp("healthy");
    close = app.close;

    const unauth = await fetch(`${app.baseUrl}/api/quotes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itineraryId: UA123,
        fareCode: "ECONOMY_STANDARD",
        passengerCount: 1,
      }),
    });
    expect(unauth.status).toBe(401);

    const { cookie } = await login(app.baseUrl);
    const bad = await authedJson(app.baseUrl, cookie, "/api/quotes", {
      method: "POST",
      body: JSON.stringify({
        itineraryId: UA123,
        fareCode: "ECONOMY_STANDARD",
        passengerCount: 1,
        totalCents: 1,
        status: "confirmed",
      }),
    });
    expect(bad.status).toBe(400);
  });

  it("hides other users bookings and rejects expired quotes", async () => {
    const app = await startTestApp("healthy");
    close = app.close;
    const alex = await login(app.baseUrl);
    const quoteRes = await authedJson(app.baseUrl, alex.cookie, "/api/quotes", {
      method: "POST",
      body: JSON.stringify({
        itineraryId: UA123,
        fareCode: "ECONOMY_STANDARD",
        passengerCount: 1,
      }),
    });
    const bookRes = await authedJson(app.baseUrl, alex.cookie, "/api/bookings", {
      method: "POST",
      headers: { "Idempotency-Key": "key-own-1" },
      body: JSON.stringify({ quoteId: quoteRes.body.quote.id }),
    });

    const blake = await login(app.baseUrl, "blake@example.test", "Password123!");
    const hidden = await authedJson(
      app.baseUrl,
      blake.cookie,
      `/api/bookings/${bookRes.body.booking.id}`,
    );
    expect(hidden.status).toBe(404);

    // Expire relative to the demo fixed clock (DEMO_FIXED_NOW), not wall clock
    await app.db.query(`UPDATE quotes SET expires_at = $2 WHERE id = $1`, [
      quoteRes.body.quote.id,
      "2026-09-01T00:00:00.000Z",
    ]);
    const expired = await authedJson(app.baseUrl, alex.cookie, "/api/bookings", {
      method: "POST",
      headers: { "Idempotency-Key": "key-expired" },
      body: JSON.stringify({ quoteId: quoteRes.body.quote.id }),
    });
    // New key against expired quote
    expect(expired.status).toBe(409);
  });

  it("idempotent replay returns same booking; conflicting payload conflicts", async () => {
    const app = await startTestApp("healthy");
    close = app.close;
    const { cookie } = await login(app.baseUrl);
    const q1 = await authedJson(app.baseUrl, cookie, "/api/quotes", {
      method: "POST",
      body: JSON.stringify({
        itineraryId: UA123,
        fareCode: "ECONOMY_STANDARD",
        passengerCount: 1,
      }),
    });
    const q2 = await authedJson(app.baseUrl, cookie, "/api/quotes", {
      method: "POST",
      body: JSON.stringify({
        itineraryId: "flight-as88-20261112",
        fareCode: "ECONOMY_STANDARD",
        passengerCount: 1,
      }),
    });

    const first = await authedJson(app.baseUrl, cookie, "/api/bookings", {
      method: "POST",
      headers: { "Idempotency-Key": "same-key" },
      body: JSON.stringify({ quoteId: q1.body.quote.id }),
    });
    expect(first.status).toBe(201);

    const replay = await authedJson(app.baseUrl, cookie, "/api/bookings", {
      method: "POST",
      headers: { "Idempotency-Key": "same-key" },
      body: JSON.stringify({ quoteId: q1.body.quote.id }),
    });
    expect(replay.status).toBe(200);
    expect(replay.body.booking.id).toBe(first.body.booking.id);

    const conflict = await authedJson(app.baseUrl, cookie, "/api/bookings", {
      method: "POST",
      headers: { "Idempotency-Key": "same-key" },
      body: JSON.stringify({ quoteId: q2.body.quote.id }),
    });
    expect(conflict.status).toBe(409);
  });

  it("concurrent identical idempotent retries produce one reservation", async () => {
    const app = await startTestApp("healthy");
    close = app.close;
    const { cookie } = await login(app.baseUrl);
    const quoteRes = await authedJson(app.baseUrl, cookie, "/api/quotes", {
      method: "POST",
      body: JSON.stringify({
        itineraryId: UA123,
        fareCode: "ECONOMY_STANDARD",
        passengerCount: 1,
      }),
    });

    const attempts = await Promise.all(
      Array.from({ length: 5 }, () =>
        authedJson(app.baseUrl, cookie, "/api/bookings", {
          method: "POST",
          headers: { "Idempotency-Key": "parallel-key" },
          body: JSON.stringify({ quoteId: quoteRes.body.quote.id }),
        }),
      ),
    );

    const ids = new Set(attempts.map((a) => a.body.booking.id));
    expect(ids.size).toBe(1);
    expect(attempts.every((a) => a.status === 200 || a.status === 201)).toBe(true);
  });

  it("rejects inconsistent persisted money totals on read", async () => {
    const app = await startTestApp("healthy");
    close = app.close;
    const { cookie } = await login(app.baseUrl);
    const quoteRes = await authedJson(app.baseUrl, cookie, "/api/quotes", {
      method: "POST",
      body: JSON.stringify({
        itineraryId: UA123,
        fareCode: "ECONOMY_STANDARD",
        passengerCount: 1,
      }),
    });
    const bookRes = await authedJson(app.baseUrl, cookie, "/api/bookings", {
      method: "POST",
      headers: { "Idempotency-Key": "money-integrity" },
      body: JSON.stringify({ quoteId: quoteRes.body.quote.id }),
    });
    await app.db.query(`UPDATE bookings SET total_cents = 1 WHERE id = $1`, [
      bookRes.body.booking.id,
    ]);
    const getRes = await authedJson(
      app.baseUrl,
      cookie,
      `/api/bookings/${bookRes.body.booking.id}`,
    );
    expect(getRes.status).toBe(500);
    expect(getRes.body.code).toBe("MONEY_INTEGRITY");
    expect(getRes.body.booking?.price?.totalCents).not.toBe(42800);
  });

  it("pending-finalization leaves persisted status pending after provider confirm", async () => {
    const app = await startTestApp("pending-finalization");
    close = app.close;
    const { cookie } = await login(app.baseUrl);
    const quoteRes = await authedJson(app.baseUrl, cookie, "/api/quotes", {
      method: "POST",
      body: JSON.stringify({
        itineraryId: UA123,
        fareCode: "ECONOMY_STANDARD",
        passengerCount: 1,
      }),
    });
    const bookRes = await authedJson(app.baseUrl, cookie, "/api/bookings", {
      method: "POST",
      headers: { "Idempotency-Key": "pending-key" },
      body: JSON.stringify({ quoteId: quoteRes.body.quote.id }),
    });
    expect(bookRes.status).toBe(201);
    expect(bookRes.body.booking.status).toBe("pending");

    const getRes = await authedJson(
      app.baseUrl,
      cookie,
      `/api/bookings/${bookRes.body.booking.id}`,
    );
    expect(getRes.body.booking.status).toBe("pending");
  });
});
