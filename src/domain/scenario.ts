import { DEMO_SCENARIOS, type DemoScenario } from "./types.js";

export function parseScenario(raw: string | undefined | null): DemoScenario {
  const value = (raw || "healthy").trim();
  if (!(DEMO_SCENARIOS as readonly string[]).includes(value)) {
    throw new Error(
      `Unknown DEMO_SCENARIO "${value}". Allowed: ${DEMO_SCENARIOS.join(", ")}`,
    );
  }
  return value as DemoScenario;
}

export function shouldOmitFinalization(scenario: DemoScenario): boolean {
  return scenario === "pending-finalization";
}

export function selectButtonAttribute(scenario: DemoScenario): {
  attr: "data-cy" | "data-action";
  value: string;
} {
  if (scenario === "locator-change") {
    return { attr: "data-action", value: "select-itinerary" };
  }
  return { attr: "data-cy", value: "select-button" };
}
