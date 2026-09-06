# Black Stone API

REST API for the Black Stone women's fashion store (Hijab, Orna, Three-Piece).

- Interactive documentation: `http://localhost:5000/api-docs` (OpenAPI JSON: `/api-docs.json`)
- Base URL: `http://localhost:5000/api`
- Auth: `Authorization: Bearer <accessToken>`
- Roles: `customer`, `admin`

## Response format

Success:

```json
{
	"success": true,
	"message": "Products retrieved successfully!",
	"meta": { "page": 1, "limit": 10, "total": 42, "totalPage": 5 },
	"data": []
}
```

`meta` is present on every paginated list. Error:

```json
{
	"success": false,
	"message": "Validation Error",
	"errorSources": [{ "path": "price", "message": "Price must be greater than 0!" }]
}
```

Stack traces are added only when `NODE_ENV=development`.

Common status codes: `400` validation / invalid state, `401` missing or invalid token,
`403` not allowed, `404` not found, `409` conflict (duplicate, out of stock), `429` rate limited.

## Pagination, filtering, sorting

All list endpoints accept `page`, `limit` (max 100), `sortBy`, `sortOrder` (`asc|desc`).

---

## Authentication — `/api/auth`

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| POST | `/auth/register` | public | Register a customer. Returns access + refresh tokens. |
| POST | `/auth/login` | public | Customer login. |
| POST | `/auth/admin/login` | public | Admin login (alias: `POST /admin/login`). |
| POST | `/auth/refresh-token` | public | New access token from the refresh cookie or `{ refreshToken }`. |
| GET | `/auth/me` | customer, admin | Current user profile. |
| POST | `/auth/change-password` | customer | `{ oldPassword, newPassword }`. Invalidates existing tokens. |
| POST | `/auth/logout` | customer, admin | Bumps `tokenVersion`, so issued tokens stop working. |

```http
POST /api/auth/register
{ "name": "Ayesha", "email": "ayesha@mail.com", "password": "Customer1234", "phone": "01712345678" }
```

Password rules: at least 8 characters with one letter and one number. Phone numbers must be
valid Bangladeshi numbers (`01[3-9]XXXXXXXX`, optional `+88`). Password hashes are never returned.

## Users — `/api/users`

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| PATCH | `/users/me` | customer | Update own profile and saved addresses. |
| GET | `/users` | admin | List customers. Filters: `search`, `status`. |
| GET | `/users/:id` | admin, own customer | Single customer. |
| PATCH | `/users/:id/status` | admin | `{ "status": "active" \| "blocked" }`. |
| DELETE | `/users/:id` | admin | Soft delete. |

## Categories — `/api/categories`

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| GET | `/categories` | public | Active categories (admins also see inactive ones). |
| GET | `/categories/:slug` | public | Single category by slug. |
| POST | `/categories` | admin | `{ name, description?, image?, sortOrder? }`, slug generated. |
| PATCH | `/categories/:id` | admin | Update. |
| DELETE | `/categories/:id` | admin | Deactivate (never hard deleted). |

## Products — `/api/products`

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| GET | `/products` | public | List. Filters below. Admins additionally see draft/inactive. |
| GET | `/products/:slug` | public | Product by slug. |
| GET | `/products/id/:id` | public | Product by id. |
| POST | `/products` | admin | Create. |
| PATCH | `/products/:id` | admin | Update (name, price, specs, SEO, status, featured …). |
| DELETE | `/products/:id` | admin | Soft delete — historical orders stay valid. |
| PATCH | `/products/:id/stock` | admin | `{ stock, variantId? }`. |
| POST | `/products/:id/variants` | admin | Add a variant. |
| PATCH | `/products/:id/variants/:variantId` | admin | Update a variant. |
| DELETE | `/products/:id/variants/:variantId` | admin | Remove a variant. |
| POST | `/products/:id/images` | admin | `multipart/form-data`, field `images` (max 8, JPEG/PNG/WEBP, 5MB each). |
| DELETE | `/products/:id/images` | admin | `{ url }`. |
| POST | `/products/:id/videos` | admin | `multipart/form-data`, field `videos` (max 3, MP4/WEBM/MOV, 50MB each). |
| DELETE | `/products/:id/videos` | admin | `{ url }`. |

Filters: `search`, `category` (id), `categorySlug`, `minPrice`, `maxPrice`, `featured=true`,
`inStock=true`, `tags=a,b`, `status` (admin only). Sortable: `createdAt`, `price`, `name`,
`ratingAverage`, `stock`.

```http
GET /api/products?categorySlug=hijab&minPrice=500&maxPrice=1500&featured=true&sortBy=price&sortOrder=asc
```

Products with variants track stock per variant; the product `stock` is the sum of them.

Media (`images[]`, `videos[]`) is stored on the configured provider - Cloudinary when
`STORAGE_PROVIDER=cloudinary`, otherwise the local disk. Video entries carry `thumbnailUrl`,
`width`, `height` and `duration`.

## Cart — `/api/cart` (customer)

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/cart` | Cart with server-calculated prices and per-item availability. |
| POST | `/cart/items` | `{ productId, variantId?, quantity }`. |
| PATCH | `/cart/items` | Set the quantity of one line. |
| DELETE | `/cart/items` | `{ productId, variantId? }`. |
| DELETE | `/cart` | Clear. |

Only ids and quantities are stored. Prices, discounts and availability are always recalculated
from the product data — anything sent by the client is ignored. Max 50 units per line.

Guests keep their cart on the frontend and check out with an explicit `items` array.

## Checkout & orders — `/api/orders`

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| POST | `/orders/checkout/preview` | public / customer | Totals before placing the order. |
| POST | `/orders/checkout` | public / customer | Place an order (guest, cart or Buy Now). |
| POST | `/orders/track` | public | `{ orderNumber, phone }` — guest order tracking. |
| GET | `/orders/my-orders` | customer | Own orders. |
| GET | `/orders/:id` | owner, admin | Order detail. |
| GET | `/orders/:id/payment-instructions` | owner, admin | Wallet number + instructions. |
| PATCH | `/orders/:id/cancel` | owner, admin | `{ reason? }`. Restores stock. |
| GET | `/orders` | admin | List. Filters: `search`, `status`, `paymentStatus`, `paymentMethod`, `from`, `to`. |
| PATCH | `/orders/:id/status` | admin | `{ status, note? }`. |
| PATCH | `/orders/:id/notes` | admin | `{ adminNotes }`. |

```http
POST /api/orders/checkout
{
  "source": "cart",                        // or omit and send "items" for Buy Now / guest
  "items": [{ "productId": "…", "variantId": "…", "quantity": 1 }],
  "customer":        { "name": "Ayesha", "phone": "01712345678", "email": "a@mail.com" },
  "shippingAddress": { "name": "Ayesha", "phone": "01712345678",
                       "addressLine": "House 12, Road 4", "area": "Dhanmondi", "city": "Dhaka",
                       "deliveryNotes": "Call before delivery" },
  "deliveryArea": "inside-dhaka",
  "paymentMethod": "bkash",                // bkash | nagad | cod
  "customerNotes": "Gift wrap please"
}
```

Response contains the created `order` and `paymentInstructions`.

**Server side rules**

- Product price, discount, delivery charge and total are always recalculated. Amounts in the
  request body are ignored.
- Stock is validated and reserved with atomic conditional decrements — concurrent orders can
  never oversell.
- Each item stores a product and variant snapshot, so historical orders stay correct after the
  catalog changes.

**Order status:** `pending → confirmed → processing → shipped → delivered`, and
`pending|confirmed|processing → cancelled`. Any other transition returns `400`.
Customers may cancel only while an order is `pending` or `confirmed`. Cancelling restores stock.

## Payments — `/api/payments`

Payment status is tracked **separately** from the order status:
`pending → submitted → verified | rejected`, `rejected → submitted`, `verified → refunded`.

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| GET | `/payments/orders/:orderId` | owner, admin, guest (`?phone=`) | Payment for an order. |
| POST | `/payments/orders/:orderId/submit` | owner, admin, guest (`phone` field) | `multipart/form-data`: `transactionId`, `senderNumber?`, `phone?`, `screenshot?` (image). |
| GET | `/payments` | admin | List. Filters: `status`, `method`, `search`. |
| PATCH | `/payments/:id/verify` | admin | `{ note? }`. |
| PATCH | `/payments/:id/reject` | admin | `{ rejectionReason }`. |
| PATCH | `/payments/:id/refund` | admin | `{ note? }` (only from `verified`). |
| GET | `/payments/:id/screenshot` | admin, owner | Streams the screenshot. |

- Submitting a transaction id sets `paymentStatus = submitted` — never `verified`, and it does
  not change the order status.
- Transaction ids are unique across orders.
- Screenshots are stored privately (Cloudinary `authenticated` assets, or outside the public
  directory locally); the storage key is never returned and the file is only reachable through the
  authorised endpoint above, which streams the file (local) or redirects to a signed url (Cloudinary).
- COD orders need no transaction id; their payment is marked `verified` when the order is
  marked `delivered`.

## Reviews — `/api/reviews`

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| GET | `/reviews/product/:productId` | public | Approved reviews only. |
| POST | `/reviews` | customer | `{ productId, orderId?, rating (1-5), comment }`. |
| GET | `/reviews/my-reviews` | customer | Own reviews with their status. |
| PATCH | `/reviews/:id` | owner | Edit — moves the review back to `pending`. |
| DELETE | `/reviews/:id` | owner, admin | Delete. |
| GET | `/reviews` | admin | Moderation queue. Filters: `status`, `productId`, `rating`. |
| PATCH | `/reviews/:id/status` | admin | `{ status: pending\|approved\|rejected, adminNote? }`. |

New reviews start as `pending`. One review per customer per product. Reviews from a delivered
order are flagged `isVerifiedPurchase`. The product rating aggregate is recalculated from the
approved reviews on every moderation change.

## Delivery — `/api/delivery`

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| GET | `/delivery/settings` | public | Default charge, areas, free delivery threshold. |
| PATCH | `/delivery/settings` | admin | `{ defaultCharge?, freeDeliveryEnabled?, freeDeliveryThreshold?, areas?, note? }`. |

Areas: `{ key, name, charge, estimatedDays?, isActive }`. An unknown area falls back to the
default charge. Until an admin saves the settings, the values come from the environment.

## Admin — `/api/admin`

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/admin/login` | Alias of `/auth/admin/login`. |
| GET | `/admin/dashboard` | Statistics. |

Dashboard payload: order counts by status, customer counts, product counts with low stock,
pending reviews, payment counts (pending verification / awaiting payment / verified), revenue
(total and last 30 days, verified payments only), the 5 latest orders and the 10 lowest-stock
products.

Other admin capabilities live on their own resources: products, categories, orders, payments,
reviews, customers (`/users`) and delivery settings.

## System — `/api/system`

`POST /system/mail-to-company` — unchanged boilerplate endpoint.
