# Acme Demo Shop — Penetron target app

An **intentionally vulnerable** Node/Express + React app used as Penetron's pen-test fixture.

> ⚠️ For authorized security testing only. Do **not** deploy to production or expose publicly. Every vulnerability here is planted on purpose and documented in [`VULNS.md`](./VULNS.md).

## Stack
- **Server:** Express + Node's built-in `node:sqlite` (in-memory, re-seeded each start — deterministic, no native build).
- **Client:** React (Vite). Built to `client/dist` and served by Express at a single origin.

## Run

```bash
npm install            # server deps (express, cors, jsonwebtoken)
npm run build:client   # installs + builds the React client into client/dist
npm start              # http://localhost:4000
```

For client hot-reload during development: `npm run client:dev` (Vite on :5173, proxies the API to :4000).

## Verify the planted vulnerabilities

```bash
npm start              # in one shell
npm run smoke          # in another — proves each exploit fires and the safe control resists
```

Expected: `8 passed, 0 failed`.

## Planted vulnerabilities (see `VULNS.md` for full detail)
| Class | Endpoint |
|-------|----------|
| SQLi (auth bypass → admin) | `POST /api/login` |
| SQLi (UNION cred leak) | `GET /api/search?q=` |
| Reflected XSS | `GET /welcome?name=` |
| Stored XSS | `POST /api/comments` (rendered in the React reviews list) |
| IDOR / BOLA | `GET /api/orders/:id` |
| Broken auth (no JWT signature verify) | `GET /api/admin/users` |
| **Safe control** (must resist) | `GET /api/products?category=` |

Seed users: `alice/alice123`, `bob/bob123`, `admin/s3cr3t-admin`. Order `1002` belongs to bob (the IDOR target).
