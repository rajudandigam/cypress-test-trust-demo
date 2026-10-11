import type { BookingView, FlightItinerary, QuoteView, SafeUser } from "../../domain/types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers || {});
  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers,
  });
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function login(email: string, password: string): Promise<SafeUser> {
  const data = await request<{ user: SafeUser }>("/api/session", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return data.user;
}

export async function getSession(): Promise<{ authenticated: boolean; user: SafeUser | null }> {
  return request("/api/session");
}

export async function logout(): Promise<void> {
  await request("/api/session", { method: "DELETE" });
}

export async function searchFlights(input: {
  from: string;
  to: string;
  departureDate: string;
  cabin: string;
  passengerCount: number;
}): Promise<FlightItinerary[]> {
  const data = await request<{ results: FlightItinerary[] }>("/api/flights/search", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.results;
}

export async function createQuote(input: {
  itineraryId: string;
  fareCode: string;
  passengerCount: number;
}): Promise<QuoteView> {
  const data = await request<{ quote: QuoteView }>("/api/quotes", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.quote;
}

export async function getQuote(id: string): Promise<QuoteView> {
  const data = await request<{ quote: QuoteView }>(`/api/quotes/${id}`);
  return data.quote;
}

export async function createBooking(quoteId: string, idempotencyKey: string): Promise<BookingView> {
  const data = await request<{ booking: BookingView }>("/api/bookings", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify({ quoteId }),
  });
  return data.booking;
}

export async function getBooking(id: string): Promise<BookingView> {
  const data = await request<{ booking: BookingView }>(`/api/bookings/${id}`);
  return data.booking;
}

export async function getHealth(): Promise<{
  status: string;
  scenario?: string;
  selectButton?: { attr: string; value: string };
}> {
  return request("/api/health");
}
