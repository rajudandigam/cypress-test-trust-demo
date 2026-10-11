import fs from "node:fs";
import path from "node:path";

const target = path.resolve("src/server/services/booking-service.ts");

const HEALTHY = `  private async finalizeConfirmed(
    client: pg.PoolClient,
    bookingId: string,
    providerReference: string,
  ): Promise<void> {
    if (shouldOmitFinalization(this.scenario)) {
      // Controlled defect: provider confirmed, but finalization update is omitted.
      return;
    }
    assertTransition("pending", "confirmed");
    await client.query(
      \`UPDATE bookings
       SET status = 'confirmed',
           provider_reference = \$2,
           updated_at = NOW()
       WHERE id = \$1\`,
      [bookingId, providerReference],
    );
  }`;

const DEFECT = `  private async finalizeConfirmed(
    client: pg.PoolClient,
    bookingId: string,
    providerReference: string,
  ): Promise<void> {
    // CONTROLLED APPLICATION DEFECT (demo PR): provider confirmed, but the
    // finalization update is omitted. Receipt/API expose pending truthfully.
    void shouldOmitFinalization;
    void assertTransition;
    void client;
    void bookingId;
    void providerReference;
    return;
  }`;

const mode = process.argv[2];
if (mode !== "defect" && mode !== "repair") {
  console.error("Usage: tsx scripts/apply-demo-defect.ts <defect|repair>");
  process.exit(1);
}

const source = fs.readFileSync(target, "utf8");
const pattern =
  / {2}private async finalizeConfirmed\(\n {4}client: pg\.PoolClient,\n {4}bookingId: string,\n {4}providerReference: string,\n {2}\): Promise<void> \{[\s\S]*?\n {2}\}/;

if (!pattern.test(source)) {
  throw new Error("Could not locate finalizeConfirmed block with expected formatting");
}

const next = source.replace(pattern, mode === "defect" ? DEFECT : HEALTHY);
if (next === source) {
  throw new Error(`No change applied for mode=${mode}`);
}
fs.writeFileSync(target, next);
console.log(JSON.stringify({ applied: mode, file: target }));
