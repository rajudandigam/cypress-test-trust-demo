# Decisions and pinned versions

| Item | Choice | Notes |
|------|--------|-------|
| Node (CI) | 24.x | `actions/setup-node` pin; local verified on 24.12.0 |
| npm | lockfile committed | Local npm 11.6.2 during bootstrap |
| Cypress | **16.1.1** | `cy.prompt` beta; use `Cypress.expose` / `cy.env`; no `experimentalPromptCommand` |
| React | 19.1.x | Matches reference patterns |
| Vite | 7.x | Dev proxy `/api` → Express 3001 |
| Express | 5.x | Serves built client in production |
| PostgreSQL | 16.15 | Homebrew locally (Docker unavailable on build machine); `postgres:16.15-alpine` in Actions |
| Validator | Zod 4 | `.strict()` rejects client price/status overrides |
| Package layout | Single package | Not a monorepo |
| Money | Integer cents | Format without float dollars |
| Provider | In-process simulation | No external network; not a distributed booking protocol |
| Required check name | `ci-required` | Depends on `verify` + `booking-critical` |

## Action SHA pins

- `actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1` # v7.0.1
- `actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1` # v7.1.0
- `actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9` # v7.0.2
- `cypress-io/github-action@c541a95ea92d9239347a2355f2e895cd4b3f8060` # v7.4.6
