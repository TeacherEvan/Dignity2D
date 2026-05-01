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
- Uploads are privacy-first, with session retention as the default and metadata stripped during processing.
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
- `server/upload/` owns retention policy and image transformation.
- `shared/protocol.ts` defines typed messages shared by client and server.

## HTTP Endpoints

The server currently exposes these routes:

- `GET /health` returns a simple health payload.
- `POST /rooms` creates a room. Optional JSON body: `{ "imageId": "..." }`.
- `POST /rooms/join` joins a room. JSON body: `{ "roomId": "..." }`.
- `POST /upload?retention=session|7-days|30-days` transforms an uploaded image into private WebP output with stripped metadata.

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

Useful commands:

```bash
npm run test
npm run server:test
npm run test:e2e
npm run lint
```

## Repository Layout

```text
src/        Client runtime, scenes, gameplay, rendering, input, theme
server/     HTTP/WebSocket server, room management, upload processing
shared/     Types and message contracts shared by client and server
tests/      End-to-end Playwright coverage
dist-server/ Compiled server output
```

## Notes

- Upload output is private by default, metadata-stripped, and normalized to WebP.
- The architecture favors pure modules first, with Phaser used mainly as the presentation and orchestration layer.
- The codebase includes both client and server test suites, so narrow checks are usually available before broader integration work.
- The main next-quality step is polish: better gameplay presentation, stronger onboarding/feedback, and tighter visual cohesion between the launcher and Phaser runtime.
