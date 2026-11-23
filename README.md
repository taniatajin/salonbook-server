# SalonBook Server

REST API for **SalonBook**, a salon appointment booking platform. It handles authentication checks, services, appointments, users, payments and Stripe webhooks.

Client repository: https://github.com/taniatajin/salonbook-client

## Live Links

- Live site: https://salonbook-client-liard.vercel.app
- Live API: https://salonbook-server-opal.vercel.app

## Repositories

- Client: https://github.com/taniatajin/salonbook-client
- Server: https://github.com/taniatajin/salonbook-server

## Demo Credentials (for evaluation)

Use these accounts on the live site: https://salonbook-client-liard.vercel.app

| Role | Email | Password |
|---|---|---|
| Admin | admin@salonbook.com | Admin123 |
| Customer | tajin@gmail.com | Tajin123 |

## Important Features

- JWT verification middleware (tokens issued by Better Auth are verified against its JWKS endpoint)
- Server-side role verification on every protected route (admin and customer)
- User role and blocked status are re-checked from the database on every request
- Service CRUD, activation and deactivation, with search, category filter and price sorting
- Image upload to ImgBB
- Appointment booking with duplicate slot prevention (application check and a unique database index)
- Admin appointment confirmation and cancellation, customer cancellation of pending requests
- Stripe Checkout sessions for confirmed appointments
- Verified Stripe webhook that marks appointments as paid and saves the transaction
- Read-only transactions for admins, so payment records cannot be changed manually
- Admin statistics and customer block or unblock

## Technology Stack

Node.js, Express, TypeScript, MongoDB (official driver), jose (JWT verification), Stripe, Multer, ImgBB

## Installation

```bash
git clone https://github.com/taniatajin/salonbook-server.git
cd salonbook-server
npm install
```

## Environment Variables

Create a `.env` file in the project root. Names only, never commit real values:

```
PORT=
MONGODB_URI=
DB_NAME=
CLIENT_URL=
AUTH_URL=
IMGBB_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

- `CLIENT_URL` is the URL of the client (used for CORS and Stripe redirect URLs).
- `AUTH_URL` is the URL of the client that runs Better Auth. It must match the client's `BETTER_AUTH_URL`.

## Run Locally

```bash
npm run dev
```

The API runs on http://localhost:5000.

Optional seed data for services:

```bash
npm run seed
```

## Stripe Webhook (local)

Install the Stripe CLI, then forward events to the server:

```bash
stripe listen --events checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed --forward-to localhost:5000/api/webhook/stripe
```

Copy the printed `whsec_...` signing secret into `STRIPE_WEBHOOK_SECRET`.

## API Overview

| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/services` | Public (active services, supports `search`, `category`, `sort`) |
| GET | `/api/services/:id` | Public |
| POST | `/api/appointments` | Customer |
| GET | `/api/appointments/my` | Customer |
| GET | `/api/appointments/my/stats` | Customer |
| PATCH | `/api/appointments/:id/cancel` | Customer (own pending only) |
| POST | `/api/payments/checkout-session` | Customer |
| GET | `/api/payments/session/:sessionId` | Customer |
| GET | `/api/payments/my` | Customer |
| POST | `/api/webhook/stripe` | Stripe (signature verified) |
| GET, POST | `/api/admin/services` | Admin |
| PUT, DELETE | `/api/admin/services/:id` | Admin |
| PATCH | `/api/admin/services/:id/status` | Admin |
| POST | `/api/admin/upload` | Admin |
| GET | `/api/admin/appointments` | Admin |
| PATCH | `/api/admin/appointments/:id/confirm` | Admin |
| PATCH | `/api/admin/appointments/:id/cancel` | Admin |
| GET | `/api/admin/users` | Admin |
| PATCH | `/api/admin/users/:id/block` and `/unblock` | Admin |
| GET | `/api/admin/transactions` | Admin (read-only) |
| GET | `/api/admin/stats` | Admin |

## Scripts

- `npm run dev` start with auto reload
- `npm run build` type check and compile
- `npm run start` run the compiled server
- `npm run seed` insert sample services