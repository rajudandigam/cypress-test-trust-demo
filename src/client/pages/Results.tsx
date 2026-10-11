import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { FlightItinerary } from "../../domain/types";
import { createQuote, getHealth, searchFlights } from "../lib/api";
import { FlightCard } from "../components/FlightCard";

export function Results() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [flights, setFlights] = useState<FlightItinerary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectAttr, setSelectAttr] = useState<{ attr: "data-cy" | "data-action"; value: string }>({
    attr: "data-cy",
    value: "select-button",
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const health = await getHealth();
        if (health.selectButton?.attr === "data-action" || health.selectButton?.attr === "data-cy") {
          setSelectAttr({
            attr: health.selectButton.attr,
            value: health.selectButton.value,
          });
        }
        if ((health.scenario || "") === "style-change") {
          document.body.classList.add("style-change");
        } else {
          document.body.classList.remove("style-change");
        }
        const results = await searchFlights({
          from: params.get("from") || "SFO",
          to: params.get("to") || "JFK",
          departureDate: params.get("depart") || "2026-11-12",
          cabin: params.get("cabin") || "ECONOMY",
          passengerCount: Number(params.get("pax") || 1),
        });
        if (!cancelled) setFlights(results);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Search failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params]);

  const onSelect = async (flight: FlightItinerary) => {
    setError(null);
    try {
      const quote = await createQuote({
        itineraryId: flight.id,
        fareCode: flight.fareCode,
        passengerCount: 1,
      });
      navigate(`/checkout?quoteId=${encodeURIComponent(quote.id)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create quote");
    }
  };

  return (
    <section className="panel">
      <h2>Choose an itinerary</h2>
      <p className="muted">Compare departure times and fares, then select the flight that fits your trip.</p>
      {loading && <div className="loading" data-cy="results-loading">Loading flights…</div>}
      {error && (
        <div className="alert" role="alert" data-cy="form-alert">
          {error}
        </div>
      )}
      {!loading && !error && flights.length === 0 && (
        <div data-cy="empty-results">No flights found for this route/date.</div>
      )}
      <div className="stack" data-cy="results-list">
        {flights.map((flight) => (
          <FlightCard
            key={flight.id}
            flight={flight}
            selectAttr={selectAttr}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  );
}
