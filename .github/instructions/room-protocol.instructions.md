---
description: "Use when editing shared room or websocket protocol types, protocol validation, room lifecycle behavior, or client/server networking code. Covers keeping shared contracts, server handlers, and client call sites aligned."
applyTo: "shared/protocol.ts,shared/protocol.test.ts,server/index.ts,server/rooms/**/*.ts,server/rooms/**/*.test.ts,src/net/**/*.ts,src/net/**/*.test.ts"
---

# Room Protocol Guidelines

- Keep shared message contracts centralized in `shared/protocol.ts`. When message shapes change, update the shared types, validators, server handlers, and client consumers together in the same change.
- Prefer explicit, deterministic validation for inbound payloads. Reject malformed data at the boundary rather than letting room or scene logic infer missing fields later.
- Keep transport helpers thin. Networking modules should translate payloads and connection state, while gameplay, scoring, and room rules stay in framework-light modules.
- Preserve the guest-friendly two-player room model unless the task explicitly changes product behavior. If capacity or join flow changes, update room tests and all related response payloads together.
- Keep identifiers and protocol fields minimal. Avoid adding free-form user text or duplicate derived fields to shared contracts unless the client flow demonstrably needs them.
- Prefer focused tests close to the touched boundary: protocol validation in `shared/protocol.test.ts`, room lifecycle behavior in `server/rooms/*.test.ts`, and client-side network helpers in `src/net/*.test.ts`.
