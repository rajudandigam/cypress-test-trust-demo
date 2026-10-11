import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { QuoteView } from "../../domain/types";
import { createBooking, getQuote } from "../lib/api";
import { formatUsdCents } from "../lib/money";

export function Checkout() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const quoteId = params.get("quoteId") || "";
  const [quote, setQuote] = useState<QuoteView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const idempotencyKey = useRef(crypto.randomUUID());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!quoteId) throw new Error("Missing quote");
        const next = await getQuote(quoteId);
        if (!cancelled) setQuote(next);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Quote unavailable");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [quoteId]);

  const onBook = async () => {
    if (!quote || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const booking = await createBooking(quote.id, idempotencyKey.current);
      navigate(`/bookings/${booking.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed");
      setSubmitting(false);
    }
  };

  if (loading) return <div className="panel loading">Loading checkout…</div>;
  if (error && !quote) {
    return (
      <section className="panel">
        <div className="alert" role="alert">
          {error}
        </div>
      </section>
    );
  }
  if (!quote) return null;

  return (
    <section className="panel" data-cy="checkout-page">
      <h2>Checkout</h2>
      <p className="muted">Review your itinerary and fare, then confirm the booking.</p>
      <dl className="receipt-grid">
        <div>
          <dt>Itinerary</dt>
          <dd data-cy="checkout-flight">
            {quote.itinerary.flightNumber} · {quote.itinerary.from} → {quote.itinerary.to}
          </dd>
        </div>
        <div>
          <dt>Departure</dt>
          <dd data-cy="checkout-departure">
            {new Date(quote.itinerary.departureAt).toLocaleString()}
          </dd>
        </div>
        <div>
          <dt>Fare</dt>
          <dd data-cy="checkout-fare">{quote.itinerary.fareCode}</dd>
        </div>
        <div>
          <dt>Total</dt>
          <dd data-cy="checkout-total">{formatUsdCents(quote.price.totalCents)}</dd>
        </div>
      </dl>
      <div style={{ marginTop: 24 }}>
        <button
          type="button"
          className="btn btn-primary"
          data-cy="book-button"
          aria-label="Book flight"
          disabled={submitting}
          onClick={onBook}
        >
          {submitting ? "Booking…" : "Book flight"}
        </button>
      </div>
      {error && (
        <div className="alert" role="alert" data-cy="form-alert">
          {error}
        </div>
      )}
    </section>
  );
}
