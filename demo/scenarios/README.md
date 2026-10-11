# Demo scenarios

Controlled via `DEMO_MODE=true` and `DEMO_SCENARIO=<name>`. Unknown names fail startup.
Scenario overrides are never accepted from ordinary booking requests or public query parameters.

| Scenario | Behavior |
|----------|----------|
| `healthy` | Provider confirms; app persists `confirmed` (default) |
| `style-change` | CSS/layout spacing only; `data-cy` hooks unchanged |
| `locator-change` | Select control uses `data-action="select-itinerary"` instead of `data-cy="select-button"` |
| `pending-finalization` | Provider confirms; app omits finalization update; status stays `pending` |

```bash
npm run demo:up -- --scenario healthy
npm run demo:up -- --scenario pending-finalization
```
