import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import type { SafeUser } from "../../domain/types";
import { login } from "../lib/api";

export function Home({
  user,
  onLogin,
}: {
  user: SafeUser | null;
  onLogin: (user: SafeUser) => void;
}) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("alex@example.test");
  const [password, setPassword] = useState("Password123!");
  const [from, setFrom] = useState("SFO");
  const [to, setTo] = useState("JFK");
  const [depart, setDepart] = useState("2026-11-12");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const ensureSession = async () => {
    if (user) return user;
    const next = await login(email, password);
    onLogin(next);
    return next;
  };

  const onSearch = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await ensureSession();
      const params = new URLSearchParams({
        from: from.toUpperCase(),
        to: to.toUpperCase(),
        depart,
        cabin: "ECONOMY",
        pax: "1",
      });
      navigate(`/results?${params.toString()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="hero-panel">
      <h1>Reserve the itinerary you meant</h1>
      <p>
        Search, quote, book, and reopen a persisted reservation — the same journey the critical
        Cypress contract verifies.
      </p>

      {!user && (
        <div className="login-row" style={{ marginBottom: 18 }}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              data-cy="login-email"
              aria-label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              data-cy="login-password"
              aria-label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>
      )}

      <form aria-label="Flight Search Form" onSubmit={onSearch}>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="from">From</label>
            <input
              id="from"
              data-cy="from-input"
              aria-label="From"
              value={from}
              onChange={(e) => setFrom(e.target.value.toUpperCase())}
            />
          </div>
          <div className="field">
            <label htmlFor="to">To</label>
            <input
              id="to"
              data-cy="to-input"
              aria-label="To"
              value={to}
              onChange={(e) => setTo(e.target.value.toUpperCase())}
            />
          </div>
          <div className="field">
            <label htmlFor="depart">Depart</label>
            <input
              id="depart"
              type="date"
              data-cy="depart-input"
              aria-label="Depart"
              value={depart}
              onChange={(e) => setDepart(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="cabin">Cabin</label>
            <select id="cabin" data-cy="cabin-select" aria-label="Cabin" value="ECONOMY" disabled>
              <option value="ECONOMY">Economy</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="pax">Passengers</label>
            <input id="pax" data-cy="pax-input" aria-label="Passengers" value={1} readOnly />
          </div>
        </div>
        <div style={{ marginTop: 18 }}>
          <button className="btn btn-primary" data-cy="search-button" type="submit" disabled={busy}>
            {busy ? "Working…" : "Search flights"}
          </button>
        </div>
      </form>
      {error && (
        <div className="alert" role="alert" data-cy="form-alert">
          {error}
        </div>
      )}
    </section>
  );
}
