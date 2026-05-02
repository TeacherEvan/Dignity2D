---
description: "Use when changing upload policy, image retention, image delivery, signed image URLs, hosted backend gating, or client/server image metadata flows. Covers privacy-first upload constraints and matching client/server limits."
applyTo: "server/upload/**/*.ts,server/ImageStore.ts,server/index.ts,src/upload/**/*.ts,src/net/serverApi.ts,shared/protocol.ts"
---

# Upload Privacy And Delivery Guidelines

- Keep uploads private by default. Preserve signed image URLs, token-based image access, and private cache behavior unless the task explicitly requires a deliberate product change.
- Preserve metadata stripping and normalized WebP output in server-side upload processing unless the change request explicitly says otherwise.
- Treat `session` retention as the safe default. If retention options change, keep server normalization conservative so unknown values fall back to the shortest supported retention.
- Keep client and server upload limits aligned. When changing upload byte caps or accepted retention values, update both the browser-facing validation and the server-side enforcement together.
- Hosted frontends without `VITE_SERVER_URL` should stay upload-disabled instead of inventing insecure or misleading fallback behavior.
- When returning upload metadata across HTTP or protocol boundaries, expose only the fields needed by the client flow and avoid adding raw file names, original metadata, or unnecessary user-supplied text.
- Prefer focused tests around boundary behavior: size limits, empty uploads, invalid image payloads, retention normalization, signed access, and backend-required messaging.