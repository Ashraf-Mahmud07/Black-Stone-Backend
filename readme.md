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

| Script | Purpose |
| --- | --- |
| `pnpm start:dev` | Development server with reload. |
| `pnpm build` / `pnpm start:prod` | Compile to `dist/` and run it. |
| `pnpm type-check` | TypeScript without emitting. |
| `pnpm lint` / `pnpm lint:fix` | ESLint. |
| `pnpm test` | Unit tests (Vitest). |
| `pnpm seed` | Seed admin and development data. |
| `pnpm swagger:json` | Export the OpenAPI document to `docs/openapi.json`. |

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

### Storage (Cloudinary)

Every product image, product video and payment screenshot is uploaded to Cloudinary. Nothing is
written to the server disk. Uploads go through `IStorageProvider`
([src/app/utils/storage.ts](src/app/utils/storage.ts)), so no service or controller knows about
the provider - replacing that one file is all another provider would take.

Required environment: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
(the server refuses to start without them) and the optional `CLOUDINARY_FOLDER` base folder.

- **Product images** - up to 12 per product, JPEG/PNG/WEBP, `MAX_UPLOAD_SIZE_MB` (default 5MB).
- **Product videos** - up to 12 per product, MP4/WEBM/MOV, `MAX_VIDEO_UPLOAD_SIZE_MB` (default 50MB).
  Cloudinary also returns a poster frame (`thumbnailUrl`) plus width, height and duration.
- **Payment screenshots** are uploaded as private `authenticated` assets, so their url cannot be
  guessed or shared. `GET /api/payments/:id/screenshot` authorises the caller and then redirects to
  a signed delivery url.
- Deleting a product image/video or replacing a screenshot also deletes the asset from Cloudinary.

Stored keys have the form `<deliveryType>:<resourceType>:<publicId>` so a delete or signed url can
address the asset without extra lookups.
