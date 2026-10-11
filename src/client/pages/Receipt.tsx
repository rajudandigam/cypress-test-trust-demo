import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { BookingView } from "../../domain/types";
import { getBooking } from "../lib/api";
import { formatUsdCents } from "../lib/money";

export function Receipt() {
  const { id } = useParams();
  const [booking, setBooking] = useState<BookingView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!id) throw new Error("Missing booking id");
        const next = await getBooking(id);
        if (!cancelled) setBooking(next);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Booking not found");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) return <div className="panel loading" data-cy="receipt-loading">Loading reservation…</div>;
  if (error || !booking) {
    return (
      <section className="panel">
        <div className="alert" role="alert" data-cy="form-alert">
          {error || "Booking not found"}
        </div>
      </section>
    );
  }

  const statusClass =
    booking.status === "confirmed"
      ? "status-confirmed"
      : booking.status === "pending"
        ? "status-pending"
        : "status-failed";

  return (
    <section className="panel" data-cy="receipt-page">
      <h2 data-cy="receipt-heading">Reservation created</h2>
      <p className="muted">Save this reference for your records. You can refresh this page anytime.</p>

      <div style={{ margin: "18px 0" }}>
        <span className={`status-pill ${statusClass}`} data-cy="booking-status">
          {booking.status}
        </span>
      </div>

      <dl className="receipt-grid">
        <div>
          <dt>Reservation reference</dt>
          <dd data-cy="booking-id">{booking.id}</dd>
        </div>
        <div>
          <dt>Provider reference</dt>
          <dd data-cy="provider-reference">{booking.providerReference || "—"}</dd>
        </div>
        <div>
          <dt>Itinerary</dt>
          <dd data-cy="booking-flight">
            {booking.itinerary.flightNumber} · {booking.itinerary.from} → {booking.itinerary.to}
          </dd>
        </div>
        <div>
          <dt>Departure</dt>
          <dd data-cy="booking-departure">
            {new Date(booking.itinerary.departureAt).toISOString()}
          </dd>
        </div>
        <div>
          <dt>Traveler</dt>
          <dd data-cy="booking-traveler">
            {booking.travelerName} ({booking.travelerEmail})
          </dd>
        </div>
        <div>
          <dt>Fare</dt>
          <dd data-cy="booking-fare">{booking.fareCode}</dd>
        </div>
        <div>
          <dt>Amount</dt>
          <dd data-cy="booking-total">
            {formatUsdCents(booking.price.totalCents)} {booking.price.currency}
          </dd>
        </div>
        <div>
          <dt>Itinerary ID</dt>
          <dd data-cy="booking-itinerary-id">{booking.itineraryId}</dd>
        </div>
      </dl>
    </section>
  );
}
