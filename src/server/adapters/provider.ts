/**
 * Deterministic simulated airline/payment provider.
 * Makes no external network calls. Not a production distributed booking protocol.
 */
export type ProviderConfirmResult = {
  status: "confirmed";
  providerReference: string;
};

export type ProviderAdapter = {
  confirm(input: {
    bookingId: string;
    itineraryId: string;
    totalCents: number;
    currency: string;
  }): Promise<ProviderConfirmResult>;
};

export class SimulatedProviderAdapter implements ProviderAdapter {
  async confirm(input: {
    bookingId: string;
    itineraryId: string;
    totalCents: number;
    currency: string;
  }): Promise<ProviderConfirmResult> {
    return {
      status: "confirmed",
      providerReference: `SIM-${input.itineraryId}-${input.bookingId.slice(0, 8)}`.toUpperCase(),
    };
  }
}
