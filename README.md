# Cloud-Native Order Processing Platform — `e-com`

A full-stack e-commerce application built as the application foundation for a cloud-native
DevOps portfolio project. **Phase 1 (this repository state) is a complete, locally runnable
e-commerce MVP** — no AWS infrastructure exists yet by design.

> **CURRENT status:** working local application (React + Express + PostgreSQL) with tests.
> **PLANNED:** Docker images, Kubernetes manifests, Terraform, GitHub Actions CI/CD, ECR/EKS,
> S3 + CloudFront, ALB, Secrets Manager, Prometheus/Grafana/Loki. See
> [Roadmap](#15-future-architecture-roadmap).

---

## 1. Project purpose

Demonstrate end-to-end ownership of a production-shaped system:

1. Build a real, working application (this phase).
2. Containerize it and deploy it to Kubernetes on AWS with infrastructure as code,
   CI/CD, security scanning, and observability (later phases).

The storefront ("Nimbus Store") supports account registration, login, product browsing,
a server-side shopping cart, transactional checkout with stock management, and order history.

## 2. Current architecture

```
┌────────────────────┐    /api/* (JSON, Vite dev proxy)    ┌────────────────────┐
│  React + Vite SPA  │ ───────────────────────────────────▶ │  Express REST API  │
│  localhost:5173    │ ◀─────────────────────────────────── │  localhost:3001    │
└────────────────────┘            Bearer JWT                └─────────┬──────────┘
                                                                     │ Prisma ORM
                                                                     ▼
                                                          ┌────────────────────┐
                                                          │  PostgreSQL 16     │
                                                          │  (Docker) :5432   │
                                                          └────────────────────┘
```

- **Single backend process**, internally modular (`routes/ → services/ → prisma`), not
  microservices. Service extraction (user/product/order) is a later phase.
- **Database is provider-independent** PostgreSQL (Prisma migrations). It can later be pointed
  at Supabase PostgreSQL or an RDS instance by changing `DATABASE_URL` only.
- The frontend dev server proxies `/api` to the backend, so the browser talks to one origin in
  development. The backend also has CORS configured for split-origin setups.

## 3. Technology stack

| Layer     | Choice                                                            |
| --------- | ----------------------------------------------------------------- |
| Frontend  | React 19, Vite 8, TypeScript 6, React Router 7, hand-rolled CSS    |
| Backend   | Node.js 24, Express 4, TypeScript 5, Zod validation                |
| Database  | PostgreSQL 16 (Docker), Prisma ORM 6 (migrations + client)         |
| Auth      | bcryptjs password hashing, JWT bearer tokens (`jsonwebtoken`)      |
| Tests     | Vitest + Supertest (backend integration), Playwright (UI E2E ad-hoc) |
| Tooling   | npm, tsx, oxlint                                                   |

## 4. Repository structure

```
e-com/
├── frontend/                 # React + Vite SPA
│   ├── public/products/      # SVG product images (offline-safe placeholders)
│   └── src/
│       ├── api/client.ts     # fetch wrapper + ApiError
│       ├── components/       # Navbar, ProductCard, QuantityStepper, ...
│       ├── context/          # AuthContext, CartContext
│       ├── lib/              # price/date formatting
│       ├── pages/            # Home, Products, ProductDetail, Cart, Login, ...
│       └── App.tsx           # routes + providers
├── backend/                  # Express REST API
│   ├── prisma/
│   │   ├── schema.prisma     # User, Product, Cart, CartItem, Order, OrderItem
│   │   ├── migrations/       # committed SQL migrations
│   │   └── seed.ts           # demo users + 12 products
│   ├── scripts/restock.ts    # reset demo stock (dev utility)
│   ├── src/
│   │   ├── app.ts            # express app factory (used by tests)
│   │   ├── index.ts          # server entrypoint
│   │   ├── config/env.ts     # zod-validated environment
│   │   ├── lib/              # prisma client, errors, jwt
│   │   ├── middleware/       # auth, validation, error handler
│   │   ├── routes/           # auth, products, cart, orders
│   │   ├── schemas/          # zod request schemas
│   │   └── services/         # business logic + transactions
│   └── tests/                # 58 integration tests (real HTTP + real DB)
├── database/docker-compose.yml   # PostgreSQL only (app is not containerized yet)
├── .env.example             # template for all environment variables
└── README.md
```

## 5. Features implemented (CURRENT)

- **Accounts:** register, login, logout, `GET /me`; bcrypt-hashed passwords; generic auth
  error messages (no user enumeration).
- **Products:** paginated listing, category filter, text search, product detail; admin-only
  create/update endpoints demonstrating role-based access control.
- **Cart:** server-side per-user cart — add (accumulates quantity), update quantity, remove,
  live totals; stock enforced on every mutation.
- **Orders:** checkout in a single DB transaction (stock decrement with oversell guard, cart
  clearing, price/name snapshot onto order items), order history with pagination, order detail.
- **Security basics:** JWT auth middleware, ownership checks (users only see their own
  cart/orders — other users' orders return 404), Zod input validation on every endpoint,
  consistent JSON error envelope, no secrets in code, `.env` git-ignored.
- **UX:** responsive layout (desktop + mobile menu), accessible forms/labels/focus states,
  loading/empty/error states, protected routes with redirect-back.

## 6. Local setup

Prerequisites: Node.js ≥ 20, npm, Docker with Compose.

```bash
# 1. Clone and install
git clone https://github.com/bhatiadhrumil-lang/e-com.git
cd e-com
(cd backend && npm install)
(cd frontend && npm install)

# 2. Start PostgreSQL (database only)
docker compose -f database/docker-compose.yml up -d

# 3. Configure the backend environment
cp .env.example backend/.env
# then edit backend/.env — set a strong JWT_SECRET for anything non-disposable

# 4. Create the schema and seed demo data
cd backend
npx prisma migrate deploy      # applies committed migrations
npm run seed                   # 12 products + 2 demo users

# 5. Run the apps (two terminals)
npm run dev                    # backend  -> http://localhost:3001
cd ../frontend && npm run dev  # frontend -> http://localhost:5173
```

Open **http://localhost:5173**.

Demo accounts (created by `npm run seed`):

| Role     | Email                   | Password            |
| -------- | ----------------------- | ------------------- |
| Admin    | admin@example.com       | demo-password-123   |
| Customer | customer@example.com    | demo-password-123   |

> ⚠️ Demo credentials are for local seeding only. Never reuse them anywhere real.

### Verify the stack

```bash
# backend unit/integration tests (uses a separate ecom_test database)
cd backend && npm test

# type checks + production builds
(cd backend && npm run typecheck && npm run build)
(cd frontend && npm run build)

# health endpoint (through the frontend proxy or directly)
curl http://localhost:3001/api/health
```

## 7. Environment variables

Defined in `.env.example`; the backend validates them at boot (zod) and fails fast with a
readable message if something is missing.

| Variable          | Where     | Purpose                                             |
| ----------------- | --------- | --------------------------------------------------- |
| `DATABASE_URL`    | backend   | PostgreSQL connection string                         |
| `PORT`            | backend   | API port (default `3001`)                           |
| `CORS_ORIGIN`     | backend   | Comma-separated allowed origins                     |
| `JWT_SECRET`      | backend   | HS256 signing secret (min 16 chars)                 |
| `JWT_EXPIRES_IN`  | backend   | Token lifetime (default `1d`)                       |
| `NODE_ENV`        | backend   | `development` / `test` / `production`               |
| `VITE_API_BASE_URL` | frontend| API prefix (default `/api`)                         |

`.env` files are git-ignored (root, `backend/`, `frontend/` patterns). Only `.env.example`
is committed.

## 8. Database setup

- **Engine:** PostgreSQL 16 via `database/docker-compose.yml` (container `ecom-postgres`,
  port `5432`, volume `ecom_pgdata`).
- **Schema management:** Prisma Migrate. Migrations are committed under
  `backend/prisma/migrations/`. Apply with `npx prisma migrate deploy`.
- **Entities:** `User` (role enum), `Product`, `Cart` (1:1 user), `CartItem` (unique per
  cart+product), `Order` (status enum, `totalCents`), `OrderItem` (**snapshots** of product
  name/description/image/price at purchase time, `productId` nullable so deleting a product
  never destroys order history). Indexes on foreign keys, email, category, and status.
- **Money** is stored as integer cents — no floating point.
- **Test database:** `ecom_test`, created/migrated automatically by the test global setup;
  truncated between test files. Independent of your dev data.

## 9. API overview

All endpoints are prefixed `/api`. Authenticated endpoints require
`Authorization: Bearer <token>`. Errors use a single envelope:
`{ "error": { "code", "message", "details?" } }`.

### Auth
| Method | Path                   | Auth | Description                         |
| ------ | ---------------------- | ---- | ----------------------------------- |
| POST   | `/auth/register`       | —    | Create account → `{ user, token }`  |
| POST   | `/auth/login`          | —    | Login → `{ user, token }`           |
| GET    | `/auth/me`             | ✔    | Current user                        |

### Products
| Method | Path                   | Auth   | Description                              |
| ------ | ---------------------- | ------ | ---------------------------------------- |
| GET    | `/products`            | —      | List (`?page&pageSize&category&search`)  |
| GET    | `/products/:id`        | —      | Detail (active products only)            |
| POST   | `/products`            | admin  | Create product                           |
| PATCH  | `/products/:id`        | admin  | Update product                           |

### Cart (per authenticated user)
| Method | Path                   | Description                             |
| ------ | ---------------------- | --------------------------------------- |
| GET    | `/cart`                | Cart with items, `itemCount`, `totalCents` |
| POST   | `/cart/items`          | Add `{ productId, quantity }` (accumulates) |
| PATCH  | `/cart/items/:id`      | Set `{ quantity }`                      |
| DELETE | `/cart/items/:id`      | Remove item                             |

### Orders (per authenticated user)
| Method | Path                   | Description                                |
| ------ | ---------------------- | ------------------------------------------ |
| POST   | `/orders`              | Checkout from cart (transactional)         |
| GET    | `/orders`              | Order history (`?page&pageSize`)           |
| GET    | `/orders/:id`          | Order detail (404 for other users' orders) |

### Other
| GET | `/health` | Liveness-style health payload |

## 10. Testing

```bash
cd backend
npm test           # 58 integration tests: auth, products, cart, orders,
                   # authorization, validation, error handling
npm run typecheck  # tsc --noEmit (src + tests)
```

Coverage of the required flows: registration (success/duplicate/weak password/invalid email),
login (success/wrong password/unknown email), token auth (`/me`, malformed/tampered/deleted
user), product retrieval (list/filter/search/pagination/404/422), cart operations (add,
accumulate, update, remove, stock limits, cross-user isolation), order creation (empty cart,
snapshot immutability, oversell rollback, deactivation), and authorization (401/403/404 paths).

Frontend checks:

```bash
cd frontend
npm run build      # tsc -b && vite build
npm run lint       # oxlint (advisory warnings only)
```

UI flows were additionally verified in a real Chromium browser (register → browse → detail →
add to cart → quantity update → checkout → order history → logout → login → mobile menu),
22/22 checks passing. Those Playwright scripts were run ad hoc during development and are not
yet part of the repository (planned as a later phase with the CI pipeline).

## 11. Current project status

| Area                       | State                                        |
| -------------------------- | -------------------------------------------- |
| Frontend SPA               | ✅ COMPLETE — all 9 routes implemented      |
| REST API                   | ✅ COMPLETE — all required endpoints        |
| Database schema + migrations | ✅ COMPLETE — 6 tables, seeded             |
| Auth (JWT + bcrypt)        | ✅ COMPLETE                                 |
| Cart + transactional checkout | ✅ COMPLETE                              |
| Backend tests (58)         | ✅ PASSING                                  |
| Builds (frontend + backend)| ✅ PASSING                                  |
| Browser E2E verification   | ✅ 22/22 flows verified in Chromium         |
| Docker (app containers)    | ⬜ NOT STARTED — Phase 2                    |
| Kubernetes / EKS / Terraform | ⬜ NOT STARTED — later phases             |
| CI/CD (GitHub Actions)     | ⬜ NOT STARTED — later phases               |
| Observability stack        | ⬜ NOT STARTED — later phases               |

## 12. Known issues & limitations

- **No payment integration.** "Place order" immediately creates a `PENDING` order. There is no
  payment provider, shipping address, tax, or shipping cost logic.
- **JWT in `localStorage`.** Simple and adequate for a local MVP; vulnerable to XSS by design.
  A later phase should evaluate httpOnly cookies + CSRF protections.
- **No refresh tokens / token revocation.** Logging out clears the client token only; an
  already-issued token stays valid until it expires.
- **No rate limiting or brute-force lockout** on auth endpoints.
- **Admin UI is API-only** (`POST`/`PATCH /api/products`); there is no admin console.
- **Single-region, single-database.** No replication, caching layer, or queueing.
- **Product images are local SVG placeholders**, not user uploads.
- **Frontend lint** reports 7 advisory oxlint warnings (React `setState`-in-effect data
  fetching patterns and context fast-refresh hints). No errors.
- **`prisma migrate dev` hangs in some sandboxed environments** (see troubleshooting). Use
  `migrate deploy` for applying committed migrations.

## 13. Troubleshooting

| Symptom | Fix |
| --- | --- |
| Backend exits with `Invalid environment configuration: DATABASE_URL is required` | Create `backend/.env` from `.env.example` (step 3 of setup). |
| `P1001` / can't reach database | `docker compose -f database/docker-compose.yml up -d`, wait for healthy, check `DATABASE_URL` credentials/port. |
| `prisma migrate dev` hangs indefinitely | Use `npx prisma migrate deploy` instead (non-interactive; applies committed migrations). This is a known quirk in some sandboxes; `migrate deploy` works reliably. |
| Port 3001 or 5173 already in use | Stop the other process or change `PORT` / Vite port. |
| `ENOENT` / stale Prisma client after pulling changes | `cd backend && npx prisma generate`. |
| CORS errors in the browser | In dev you should be on `http://localhost:5173` (proxy). If calling `:3001` directly, ensure `CORS_ORIGIN` includes your origin. |
| Cart/order API returns 401 after a while | JWT expired — log in again. |
| Stock too low to test checkout | `cd backend && npm run restock` resets demo stock levels. |
| Tests fail with migration errors | The global test setup applies migrations to `ecom_test`; ensure Docker Postgres is running first. |
| Port 5432 conflict | Another Postgres is using the port — stop it or remap in `database/docker-compose.yml`. |
| Checkout (`POST /api/orders`) returns `P2028` / "Transaction already closed" | The interactive transaction exceeded its 5s default. Against a remote database (e.g. Supabase pooler) per-query latency is far higher than localhost, so `order.service.ts` raises `timeout`/`maxWait` on that `$transaction`. If you see this on a new slow connection, raise those values. |

## 14. Security notes

- Passwords hashed with bcrypt (cost 10); plaintext passwords never stored or logged.
- `JWT_SECRET` comes from the environment; validated at boot; never committed.
- `.env` is git-ignored; only `.env.example` template is committed.
- All request bodies/params/query strings validated with Zod; invalid input → `422` with
  field-level details (no stack traces).
- Ownership enforcement: cart and order resources are scoped to the authenticated user;
  foreign resources return `404` (existence not leaked).
- Admin endpoints guarded by `requireAuth + requireAdmin` (RBAC via the `role` column).
- Login/register errors are intentionally generic to prevent account enumeration.
- Unhandled errors return a generic `500` message; details are logged server-side only.
- `x-powered-by` disabled; JSON body limited to 100 kB.
- Not yet addressed (later phases): rate limiting, CSP headers, refresh-token rotation,
  secrets management via AWS Secrets Manager, image/scanning gates in CI.

## 15. Future architecture roadmap

> Everything below is **PLANNED**. None of it exists in this repository yet.

**Phase 2 — Containerization & CI**
- Multi-stage Dockerfiles for frontend (nginx) and backend (Node), docker-compose for the
  whole stack locally, GitHub Actions workflow (lint → typecheck → test → Trivy scan → build),
  push images to Amazon ECR.

**Phase 3 — Kubernetes on AWS (EKS)**
- Terraform for VPC, EKS cluster, node groups, RDS PostgreSQL, ECR, IAM (least privilege +
  IRSA), ALB Ingress, AWS Secrets Manager + External Secrets Operator, Kubernetes RBAC,
  resource requests/limits, HPA, liveness/readiness probes.

**Phase 4 — Observability & hardening**
- Prometheus + Grafana + Loki stack on cluster, structured logging, dashboards & alerts,
  network policies, Pod Security Standards, backup strategy.

**Phase 5 — Application evolution (as needed)**
- Split the modular backend into user/product/order services only when justified.
- Payment integration, refresh-token auth flow, admin UI, rate limiting, caching.

Supabase PostgreSQL remains an option for the managed database (the schema is already
provider-independent — only `DATABASE_URL` would change).

---

### License / purpose

Portfolio project. Not a real store — do not send it real payment or personal data.
