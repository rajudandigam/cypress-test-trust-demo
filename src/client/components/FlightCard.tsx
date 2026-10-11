import type { FlightItinerary } from "../../domain/types";
import { formatUsdCents } from "../lib/money";

type SelectAttr = { attr: "data-cy" | "data-action"; value: string };

export function FlightCard({
  flight,
  selectAttr,
  onSelect,
}: {
  flight: FlightItinerary;
  selectAttr: SelectAttr;
  onSelect: (flight: FlightItinerary) => void;
}) {
  const buttonProps =
    selectAttr.attr === "data-cy"
      ? { "data-cy": selectAttr.value }
      : { "data-action": selectAttr.value, "data-cy": undefined };

  return (
    <article className="flight-card" data-cy={`flight-card-${flight.id}`}>
      <div>
        <div style={{ fontWeight: 700, fontSize: "1.15rem" }}>
          {flight.flightNumber} · {flight.carrier}
        </div>
        <div className="flight-meta">
          {flight.from} → {flight.to} · {new Date(flight.departureAt).toLocaleString()} →{" "}
          {new Date(flight.arrivalAt).toLocaleString()}
        </div>
        <div className="flight-meta">
          {flight.stops === 0 ? "Nonstop" : `${flight.stops} stop`} · {flight.fareCode}
        </div>
      </div>
      <div>
        <div className="price" data-cy="flight-price">
          {formatUsdCents(flight.totalCents)}
        </div>
        <button
          type="button"
          className="btn btn-primary"
          aria-label={`Select ${flight.flightNumber}`}
          {...buttonProps}
          onClick={() => onSelect(flight)}
        >
          Select
        </button>
      </div>
    </article>
  );
}
