# Black Stone — Backend

REST API for a small women's fashion e-commerce platform (Hijab, Orna, Three-Piece):
catalog, cart, guest & customer checkout, bKash/Nagad manual payment verification, cash on
delivery, orders, reviews and an admin dashboard.

Node.js · Express 5 · TypeScript · MongoDB (Mongoose) · Zod · JWT

## Getting started

```bash
pnpm install
cp .env.example .env      # fill in DATABASE_URL, JWT secrets, merchant numbers
pnpm start:dev            # http://localhost:5000
pnpm seed                 # admin + sample categories, products, variants, reviews
```

| Script                           | Purpose                                             |
| -------------------------------- | --------------------------------------------------- |
| `pnpm start:dev`                 | Development server with reload.                     |
| `pnpm build` / `pnpm start:prod` | Compile to `dist/` and run it.                      |
| `pnpm type-check`                | TypeScript without emitting.                        |
| `pnpm lint` / `pnpm lint:fix`    | ESLint.                                             |
| `pnpm test`                      | Unit tests (Vitest).                                |
| `pnpm seed`                      | Seed admin and development data.                    |
| `pnpm swagger:json`              | Export the OpenAPI document to `docs/openapi.json`. |

The admin account is created from `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` on boot.
Setting `SEED_DEV_DATA=true` also seeds the sample catalog at startup (never in production).

API reference:

- **Swagger UI** - <http://localhost:5000/api-docs> (interactive, "Try it out" enabled)
- **OpenAPI JSON** - <http://localhost:5000/api-docs.json> (import into Postman/Insomnia; a checked-in copy lives at [docs/openapi.json](docs/openapi.json))
- **Markdown reference** - [docs/API.md](docs/API.md)

The path is configurable through `SWAGGER_PATH`, the docs can be switched off with `SWAGGER_ENABLED=false`,
and setting `SWAGGER_USER` + `SWAGGER_PASSWORD` protects both endpoints with HTTP basic auth (recommended in production).

## Architecture

The boilerplate module layout is unchanged; each module adds a repository so business logic
never talks to Mongoose directly.

```
route → controller (thin) → service (business rules) → repository (data access) → MongoDB
```

```
src/
  app.ts, server.ts, seed.ts
  app/
    config/            environment configuration
    DB/                admin seed, dev seed, database helpers
    errors/            AppError + zod/mongoose error handlers
    interface/         shared types (auth, common DTOs)
    middlewares/       AuthGuard, validateRequest, upload, rate limit, sanitize, error handler
    modules/
      Auth  User  Admin  Category  Product  Cart  Order  Payment  Review  Delivery  system
        <module>.interfaces.ts   domain types / DTOs (database independent)
        <module>.model.ts        mongoose schema
        <module>.repository.ts   the only file that knows about MongoDB
        <module>.services.ts     business rules
        <module>.controllers.ts  request/response only
        <module>.validations.ts  zod schemas
        <module>.routes.ts
    utils/             pricing, pagination, slugify, storage, tokens, sendResponse
  tests/               unit tests for pricing, delivery, order rules, pagination
```

### PostgreSQL readiness

- Services and controllers only use plain DTOs with a string `id` — no `_id`, no `ObjectId`, no
  Mongoose documents leave a repository.
- Repositories expose an intent-based API (`findById`, `findBySlug`, `findMany`, `create`,
  `update`, `reserveStock`, …). Swapping in Prisma/Postgres means reimplementing those files.
- Mongo-specific helpers are confined to `src/app/DB/dbHelpers.ts` and the repositories.
- API contracts are unchanged by the storage engine.

### Money and stock rules

- Prices, discounts, delivery charges and totals are always recalculated server side; values
  sent by the client are ignored.
- Stock is reserved with atomic conditional updates, so concurrent orders cannot oversell;
  cancelling an order restores it.
- Orders keep product and variant snapshots, so historical orders survive catalog changes.
- Order status and payment status are independent state machines.

### Checkout rules

- **Cash on delivery only.** `paymentMethod` is ignored on create and every order is stored as
  `cod`. The wallet values stay in the enum and `ONLINE_PAYMENTS_ENABLED=true` re-opens the
  bKash/Nagad submission flow without a migration.
- **Two delivery areas**: `INSIDE_DHAKA` and `OUTSIDE_DHAKA`, required at checkout. Both rates live
  in the `DeliverySetting` document - readable at `GET /api/delivery/settings`, editable by an admin
  at `PATCH /api/delivery/settings`, seeded from `DELIVERY_CHARGE_INSIDE_DHAKA` /
  `DELIVERY_CHARGE_OUTSIDE_DHAKA`. The charge is persisted on each order, so changing a rate never
  rewrites history.
- **Four collected fields**: name, mobile number, full address, delivery area. Phone numbers are
  normalised to `01XXXXXXXXX` on the way in.
- **Duplicate protection**: an `Idempotency-Key` header, or an identical basket from the same number
  within two minutes, returns the original order with 200. A unique index makes the concurrent case
  safe as well.
- Validation errors carry a stable `code` (`validation.customer.phone.invalid`) for Bangla copy.

Run `pnpm migrate:delivery-areas` (add `--dry-run` first) once after deploying to canonicalise
existing orders and delivery settings.

### Storage (Cloudinary)

Every product image, product video and payment screenshot is uploaded to Cloudinary. Nothing is
written to the server disk. Uploads go through `IStorageProvider`
([src/app/utils/storage.ts](src/app/utils/storage.ts)), so no service or controller knows about
the provider - replacing that one file is all another provider would take.

Required environment: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` and the
optional `CLOUDINARY_FOLDER` base folder. The provider is created on first use, so a missing
credential fails the upload endpoints with a clear message instead of taking down the whole API.

- **Product images** - up to 12 per product, JPEG/PNG/WEBP, `MAX_UPLOAD_SIZE_MB` (default 5MB).
- **Product videos** - up to 12 per product, MP4/WEBM/MOV, `MAX_VIDEO_UPLOAD_SIZE_MB` (default 50MB).
  Cloudinary also returns a poster frame (`thumbnailUrl`) plus width, height and duration.
- **Payment screenshots** are uploaded as private `authenticated` assets, so their url cannot be
  guessed or shared. `GET /api/payments/:id/screenshot` authorises the caller and then redirects to
  a signed delivery url.
- Deleting a product image/video or replacing a screenshot also deletes the asset from Cloudinary.

Stored keys have the form `<deliveryType>:<resourceType>:<publicId>` so a delete or signed url can
address the asset without extra lookups.

## Deployment (Vercel)

The API runs as a single Vercel serverless function.

| File                           | Role                                                                  |
| ------------------------------ | --------------------------------------------------------------------- |
| [api/index.ts](api/index.ts)   | Function entry - exports the Express app as the request handler.      |
| [vercel.json](vercel.json)     | Declares the single `@vercel/node` build and routes every path to it. |
| [src/server.ts](src/server.ts) | Local / long running server only (`app.listen`, seeding).             |

Vercel compiles `api/index.ts` itself, so nothing is built into `dist/` for the deployment and
`dist/` stays git-ignored. `vercel.json` declares that single build explicitly, which keeps the
deployment independent of Vercel's framework auto-detection - no build command, no output
directory, no static entrypoint search. Run `pnpm type-check:all` locally or in CI to type-check
`src` and `api` together before pushing.

### Required environment variables on Vercel

Set these in **Project → Settings → Environment Variables** (Production and Preview):

```
DATABASE_URL           JWT_SECRET               JWT_REFRESH_SECRET
JWT_EXPIRATION         JWT_REFRESH_EXPIRATION   NODE_ENV=production
SUPER_ADMIN_EMAIL      SUPER_ADMIN_PASSWORD     CORS_ORIGINS
CLOUDINARY_CLOUD_NAME  CLOUDINARY_API_KEY       CLOUDINARY_API_SECRET
BKASH_MERCHANT_NUMBER  NAGAD_MERCHANT_NUMBER    DEFAULT_DELIVERY_CHARGE
```

`.env` is git-ignored and never reaches Vercel - the dashboard is the only source of configuration.
Set `CORS_ORIGINS` to the deployed frontend origin, and add `SWAGGER_USER` / `SWAGGER_PASSWORD` to
put the documentation behind basic auth (or `SWAGGER_ENABLED=false` to disable it in production).

### Serverless notes

- **Database** - [connectToDatabase](src/app/DB/connect.ts) caches the mongoose connection on
  `globalThis` and [ensureDatabase](src/app/middlewares/ensureDatabase.ts) awaits it before the
  routes run, so a cold instance connects once instead of per request. Use a MongoDB Atlas cluster
  that allows connections from anywhere (`0.0.0.0/0`), since Vercel function IPs are not fixed.
- **Seeding does not run on Vercel.** The function never executes `src/server.ts`. Seed a deployed
  database from your machine with `DATABASE_URL=<production url> pnpm seed`.
- **Rate limiting** is in-memory, so counters are per function instance rather than global. Move to
  a shared store if you need strict limits.
- **Uploads** stream straight to Cloudinary, so nothing is written to the (read-only) function
  filesystem.
