import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import type { SafeUser } from "../domain/types";
import { getSession } from "./lib/api";
import { Layout } from "./components/Layout";
import { Home } from "./pages/Home";
import { Results } from "./pages/Results";
import { Checkout } from "./pages/Checkout";
import { Receipt } from "./pages/Receipt";

export function App() {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getSession()
      .then((session) => setUser(session.user))
      .finally(() => setReady(true));
  }, []);

  if (!ready) {
    return <div className="app-shell loading">Loading…</div>;
  }

  return (
    <Layout user={user} onLogout={() => setUser(null)}>
      <Routes>
        <Route path="/" element={<Home user={user} onLogin={setUser} />} />
        <Route
          path="/results"
          element={user ? <Results /> : <Navigate to="/" replace />}
        />
        <Route
          path="/checkout"
          element={user ? <Checkout /> : <Navigate to="/" replace />}
        />
        <Route
          path="/bookings/:id"
          element={user ? <Receipt /> : <Navigate to="/" replace />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
