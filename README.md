# Dignity2D

Dignity2D is a logic-first arcade territory-capture game built with Phaser, TypeScript, and Vite. The codebase emphasizes deterministic gameplay modules, small testable units, and a thin Phaser scene layer on top of pure game rules.

The current repository includes:

- A browser client bootstrapped with Vite and Phaser
- A solo gameplay loop driven by pure capture, collision, scoring, and enemy systems
- Shared client/server protocol types for co-op room flow
- A lightweight Node HTTP and WebSocket server for room creation, joining, and image upload processing
- Vitest and Playwright coverage around the core gameplay and startup flow

## Project Status

This repo is best described as a well-tested gameplay foundation with an active playable shell. The solo game path is wired into `GameScene`, while room transport and upload processing are available as backend foundations for broader multiplayer and content flows.

## Product Direction

- Mobile web is the primary target, with a portrait-first play surface.
- The app is guest-friendly by default: quick play and room flows do not require accounts.
- Uploads are privacy-first, with signed private image paths resolved by the client, session retention as the default, and metadata stripped during processing.
- Competitive fairness is expected to come from normalized ranked templates rather than unrestricted build power.

## Stack

- TypeScript
- Phaser
- Vite
- Vitest
- Playwright
- Node.js HTTP + `ws`
- `sharp` for server-side image transformation

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Start the client

```bash
npm run dev
```

Vite serves the game locally and boots the client from `src/main.ts`.

### 3. Start the server

```bash
npm run server:start
```

This starts the local HTTP/WebSocket server from `server/main.ts` via `tsx`. The default port is `8787`, configurable with the `PORT` environment variable.

### 4. Configure hosted backend access

For hosted frontend deployments, set `VITE_SERVER_URL` to the base URL of a separately hosted backend.

```bash
VITE_SERVER_URL=https://your-backend.example.com
```

Without that variable, hosted builds stay usable for quick play but room creation, joining, and uploads are intentionally unavailable.

## Available Scripts

```bash
npm run dev           # Start the Vite dev server
npm run build         # Type-check and build the client bundle
npm run preview       # Preview the built client locally
npm run server:start  # Build and run the local HTTP/WebSocket server
npm run test          # Run all Vitest tests
npm run test:watch    # Run Vitest in watch mode
npm run test:e2e      # Run Playwright end-to-end tests
npm run server:test   # Run server and shared-module tests
npm run perf:mobile   # Run performance profile tests
npm run lint          # Run ESLint
npm run format        # Check formatting with Prettier
```

## Runtime Overview

### Client

- `src/main.ts` mounts the DOM launcher shell.
- `src/launcher.ts` owns quick play, room create/join, upload preview, and the return-to-launcher flow.
- `src/bootstrap.ts` lazy-loads Phaser and starts the runtime only after launcher intent.
- Phaser is intentionally split into deferred subsystem chunks so first paint stays light and the full runtime only loads when a session starts.
- `src/scenes/GameScene.ts` runs the current solo gameplay loop once Phaser is active.
- Display detection and standard device layouts live under `src/display`, with versioned local layout preferences per device class.
- Welcome-screen rendering is tested separately from launcher event wiring under `src/welcome`.
- Privacy-safe diagnostic event tracking lives under `src/diagnostics` and filters room IDs, image URLs, file names, and free text from payloads.
- Territorial progression milestones live under `src/progression/territoryProgression.ts`.

Core rules stay outside Phaser wherever possible:

- `src/game/` contains state, scoring, collision, border, and capture logic.
- `src/enemies/` contains enemy wave spawning.
- `src/input/` contains joystick math.
- `src/render/` contains reveal/mask helpers.
- `src/theme/` and `src/performance/` contain presentation and fallback logic.

### Server

- `server/index.ts` exposes the HTTP and WebSocket application.
- `server/main.ts` starts the server process.
- `server/rooms/` owns room lifecycle and co-op validation.
- `server/upload/` owns retention policy, the server-side upload size cap, and image transformation.
- `server/ImageStore.ts` issues signed private image paths and expires uploads from the in-memory store when their retention window closes.
- `shared/protocol.ts` defines typed messages shared by client and server.

## HTTP Endpoints

The server currently exposes these routes:

- `GET /health` returns a simple health payload.
- `POST /rooms` creates a room. Optional JSON body: `{ "imageId": "..." }`.
- `POST /rooms/join` joins a room. JSON body: `{ "roomId": "..." }`.
- `POST /upload?retention=session|N-days` transforms an uploaded image into signed private WebP output with stripped metadata, accepts day-based retention windows up to 30 days, and enforces the server-side 10 MB upload limit.

## WebSocket Messages

Incoming client messages:

- `create-room`
- `join-room`
- `input-frame`
- `capture-proposal`
- `reconnect`

Outgoing server messages:

- `room-created`
- `room-joined`
- `state-sync`
- `capture-commit`
- `error`

The exact message contracts live in `shared/protocol.ts`.

## Testing

The project leans heavily on deterministic unit tests.

- Gameplay, networking contracts, theme logic, upload policy, and performance fallbacks are covered with Vitest.
- Browser startup and the home screen path are covered with Playwright.
- Display detection, device layouts, session-mode resolution, territorial progression, and enemy intent rules are covered with focused Vitest slices.

Useful commands:

```bash
npm run test
npm run server:test
npm run test:e2e
npm run lint
```

## Vercel Deployment

Vercel is configured for the static Vite frontend in `vercel.json`.

- The frontend can be deployed directly on Vercel.
- The current Node + `ws` room server is not deployed by Vercel in this repo.
- Online rooms and uploads require `VITE_SERVER_URL` to point at a separately hosted backend.
- If `VITE_SERVER_URL` is not set in a hosted environment, the launcher still supports quick play and surfaces a clear backend-required message for online features.

## Repository Layout

```text
src/        Client runtime, scenes, gameplay, rendering, input, theme
server/     HTTP/WebSocket server, room management, upload processing
shared/     Types and message contracts shared by client and server
tests/      End-to-end Playwright coverage
dist-server/ Compiled server output
```

## Notes

- Upload output is private by default through signed image URLs, metadata-stripped, and normalized to WebP.
- The current in-memory upload store enforces maximum retention lifetimes while the server is running; a server restart clears uploads sooner than the configured retention window.
- Both client and server enforce the 10 MB upload limit; the server remains the source of truth for request rejection.
- The architecture favors pure modules first, with Phaser used mainly as the presentation and orchestration layer.
- The codebase includes both client and server test suites, so narrow checks are usually available before broader integration work.
- The main next-quality step is polish: better gameplay presentation, stronger onboarding/feedback, and tighter visual cohesion between the launcher and Phaser runtime.
