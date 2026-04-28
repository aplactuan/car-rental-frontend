# CarRental Management System

A full-stack car rental management dashboard built with **Next.js 16**, **React 19**, and **Tailwind CSS v4**. The system provides an operator-facing interface to manage customers, vehicles, drivers, transactions, bookings, and billing — all backed by a REST API.

---

## Features

### Dashboard & Analytics
- KPI cards for revenue, active rentals, booking volume, and fleet utilization
- Booking volume bar chart (weekly trend)
- Recent activity feed

### Customer Management
- Customer list with search
- Customer detail view showing full transaction history
- Create new customers via inline form

### Transaction & Booking Workflow
- Create transactions tied to a customer
- Add multiple bookings per transaction, each with a car, driver, start/end date, and note
- **Availability filtering** — only cars and drivers with no scheduling conflicts are shown when adding a booking
- Edit and delete individual bookings
- View detailed booking breakdown per transaction

### Billing
- End-to-end billing workflow per transaction
- Generate and view bills with line-item breakdown

### Fleet (Cars) Management
- Car list with make, model, plate, year, type, and seat count
- Car detail page showing vehicle specs and **upcoming bookings** across all transactions
- Add and edit car records

### Driver Management
- Driver list and detail views
- Driver detail page with upcoming booking schedule
- Add and edit driver records

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI Library | React 19 |
| Styling | Tailwind CSS v4 |
| API Layer | Next.js Route Handlers (proxy to backend) |
| Auth | Cookie-based JWT (`auth_token`) |
| Backend | External REST API (configurable via env) |

---

## Architecture

```
app/
├── api/                        # Next.js route handlers (API proxy layer)
│   ├── login/                  # POST /api/login  → proxies to backend auth
│   ├── logout/                 # POST /api/logout → clears auth cookie
│   └── v1/
│       ├── availability/       # GET  car/driver availability by date range
│       ├── cars/               # CRUD cars
│       ├── customers/          # CRUD customers + customer transactions
│       ├── drivers/            # CRUD drivers
│       └── transactions/       # CRUD transactions, bookings, and billing
└── dashboard/                  # Protected UI (requires auth cookie)
    ├── page.js                 # Analytics overview
    ├── cars/                   # Fleet list + car detail
    ├── customer/               # Customer list + detail + transaction detail
    ├── drivers/                # Driver list + detail
    └── transactions/           # Transaction list + detail + booking management
```

The Next.js API routes act as a **BFF (Backend-for-Frontend)** layer — they attach the auth cookie to every upstream request so the browser never holds the raw token.

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/aplactuan/car-rental.git
cd car-rental
npm install
```

### 2. Configure environment

```bash
cp env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
```

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Backend Contract

The app expects a REST backend at `NEXT_PUBLIC_BACKEND_URL` that exposes:

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/login` | Returns `{ token }` / `{ accessToken }` / `{ jwt }` |
| GET/POST | `/api/v1/cars` | Fleet management |
| GET/POST | `/api/v1/drivers` | Driver management |
| GET/POST | `/api/v1/customers` | Customer management |
| GET/POST | `/api/v1/transactions` | Transaction management |
| GET/POST | `/api/v1/transactions/:id/bookings` | Bookings per transaction |
| POST | `/api/v1/transactions/:id/bill` | Generate billing |
| GET | `/api/v1/availability` | Car/driver availability check |

Responses follow a JSON:API-style envelope: `{ data: { id, attributes, relationships } }`.

---

## Key Design Decisions

- **App Router + Server Components** — data-fetching pages (car detail, transaction detail) use async Server Components to fetch data before render, keeping the client bundle lean.
- **BFF proxy pattern** — auth cookies are forwarded server-side, avoiding token exposure in the browser.
- **Resilient field normalization** — API response shapes are normalized via helper functions that check multiple key conventions (snake_case, camelCase, etc.), making the frontend tolerant of backend variations.
- **Availability-aware booking** — when creating a booking, the UI queries the availability endpoint with the chosen date range and filters out already-booked cars and drivers in real time.

---

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```
