import Link from "next/link";
import { cookies } from "next/headers";

function readField(source, keys) {
  if (!source || typeof source !== "object") return "";

  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }

  const normalizedMap = Object.fromEntries(
    Object.entries(source).map(([k, v]) => [
      k.toLowerCase().replace(/[_\s]/g, ""),
      v,
    ]),
  );

  for (const key of keys) {
    const normalizedKey = key.toLowerCase().replace(/[_\s]/g, "");
    const value = normalizedMap[normalizedKey];
    if (value !== undefined && value !== null && value !== "") return value;
  }

  return "";
}

function normalizeCar(payload) {
  const record = payload?.data ?? payload?.car ?? payload;
  const attrs = record?.attributes ?? {};
  const pick = (keys) => {
    const fromAttrs = readField(attrs, keys);
    if (fromAttrs !== "") return fromAttrs;
    return readField(record, keys);
  };

  return {
    id:
      pick(["id"]) ||
      pick(["car_id", "carId"]) ||
      pick(["uuid", "car_uuid", "carUuid"]),
    make: pick(["make"]),
    model: pick(["model"]),
    plate_number: pick(["plate_number", "plateNumber", "plateNUmber"]),
    type: pick(["type"]),
    door: pick(["door"]),
    seats: pick(["seats", "number_of_seats", "numberOfSeats"]),
    color: pick(["color"]),
    year: pick(["year"]),
  };
}

function normalizeBooking(raw, transactionName) {
  const attrs = raw?.attributes ?? raw ?? {};
  const pick = (keys) => readField(attrs, keys) || readField(raw, keys);

  const driverAttrs =
    raw?.relationships?.driver?.data?.attributes ??
    attrs?.driver ??
    null;
  const driverName = driverAttrs
    ? [readField(driverAttrs, ["first_name", "firstName"]), readField(driverAttrs, ["last_name", "lastName"])]
        .filter(Boolean)
        .join(" ")
        .trim()
    : pick(["driver_name", "driverName"]);

  return {
    id: pick(["id", "booking_id", "bookingId"]),
    transaction_name: transactionName || "-",
    start_date: pick(["start_date", "startDate", "start"]),
    end_date: pick(["end_date", "endDate", "end"]),
    note: pick(["note", "notes"]),
    driver: driverName || null,
  };
}

function formatDate(value) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const COLOR_SWATCHES = {
  black: "#18181b",
  white: "#fafafa",
  silver: "#a1a1aa",
  gray: "#71717a",
  grey: "#71717a",
  red: "#dc2626",
  blue: "#2563eb",
  green: "#16a34a",
  yellow: "#ca8a04",
  orange: "#ea580c",
  brown: "#92400e",
  gold: "#b45309",
  beige: "#d6d3d1",
  navy: "#1e3a8a",
  purple: "#7c3aed",
  pink: "#db2777",
};

function displayValue(value) {
  if (value === undefined || value === null || value === "") return null;
  return String(value);
}

function resolveSwatch(color) {
  if (!color) return "#d4d4d8";
  const key = String(color).trim().toLowerCase();
  return COLOR_SWATCHES[key] ?? "#d4d4d8";
}

function SpecCard({ icon, label, value }) {
  const shown = displayValue(value);
  return (
    <div className="flex items-start gap-3 rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-4 transition hover:border-teal-200 hover:bg-teal-50/40">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-teal-700 shadow-sm ring-1 ring-zinc-200/80">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          {label}
        </p>
        <p className="mt-1 truncate text-base font-semibold text-zinc-900">
          {shown ?? "—"}
        </p>
      </div>
    </div>
  );
}

function CarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      className="h-5 w-5"
      aria-hidden
    >
      <path
        d="M5 17h14M6 17l1-4h10l1 4M7 13l1.5-4h7L17 13"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="7.5" cy="17.5" r="1.5" />
      <circle cx="16.5" cy="17.5" r="1.5" />
    </svg>
  );
}

function CarDetailSection({ car, carName }) {
  const plate = displayValue(car.plate_number);
  const type = displayValue(car.type);
  const year = displayValue(car.year);
  const color = displayValue(car.color);
  const swatch = resolveSwatch(color);

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="relative bg-gradient-to-br from-blue-900 via-blue-800 to-teal-700 px-6 pb-8 pt-6 text-white sm:px-8">
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-12 left-1/3 h-32 w-32 rounded-full bg-teal-400/20 blur-2xl"
          aria-hidden
        />

        <Link
          href="/dashboard/cars"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-100 transition hover:text-white"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-4 w-4"
            aria-hidden
          >
            <path
              d="M15 18l-6-6 6-6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back to car list
        </Link>

        <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-sm">
              <CarIcon />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {carName || "Unknown vehicle"}
              </h1>
              <p className="mt-1 text-sm text-blue-100">
                {[type, year].filter(Boolean).join(" · ") || "Vehicle profile"}
              </p>
            </div>
          </div>
          {plate && (
            <div className="inline-flex w-fit items-center rounded-lg border border-white/25 bg-white/10 px-4 py-2 font-mono text-sm font-semibold tracking-wider text-white backdrop-blur-sm">
              {plate}
            </div>
          )}
        </div>
      </div>

      <div className="px-6 py-6 sm:px-8">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Specifications
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SpecCard
            label="Vehicle type"
            value={type}
            icon={
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                className="h-5 w-5"
                aria-hidden
              >
                <path
                  d="M4 8h16M6 8V6h12v2M8 12h8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
          />
          <SpecCard
            label="Doors"
            value={car.door}
            icon={
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                className="h-5 w-5"
                aria-hidden
              >
                <rect x="5" y="4" width="14" height="16" rx="1.5" />
                <path d="M12 4v16" strokeLinecap="round" />
              </svg>
            }
          />
          <SpecCard
            label="Seats"
            value={car.seats}
            icon={
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                className="h-5 w-5"
                aria-hidden
              >
                <circle cx="12" cy="8" r="3" />
                <path
                  d="M6 20v-1a4 4 0 0 1 8 0v1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
          />
          <SpecCard
            label="Year"
            value={year}
            icon={
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                className="h-5 w-5"
                aria-hidden
              >
                <rect x="4" y="5" width="16" height="15" rx="2" />
                <path d="M8 3v4M16 3v4M4 10h16" strokeLinecap="round" />
              </svg>
            }
          />
        </div>

        <div className="mt-4 flex items-center gap-4 rounded-xl border border-zinc-200 bg-gradient-to-r from-zinc-50 to-white p-4 sm:p-5">
          <div
            className="h-12 w-12 shrink-0 rounded-full ring-2 ring-white shadow-md"
            style={{ backgroundColor: swatch }}
            aria-hidden
          />
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Exterior color
            </p>
            <p className="mt-1 text-lg font-semibold capitalize text-zinc-900">
              {color ?? "Not specified"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function CarDetailPage({ params }) {
  const resolvedParams = await params;
  const carId = resolvedParams?.car_id;

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

  let car = null;
  let error = "";
  let upcomingBookings = [];
  let bookingsError = "";

  const reqHeaders = cookieHeader ? { Cookie: cookieHeader } : {};

  if (!carId) {
    error = "Car ID was not provided.";
  } else {
    const [carRes, txRes] = await Promise.allSettled([
      fetch(`${baseUrl}/api/v1/cars/${carId}`, {
        headers: reqHeaders,
        cache: "no-store",
      }),
      fetch(`${baseUrl}/api/v1/transactions?per_page=100`, {
        headers: reqHeaders,
        cache: "no-store",
      }),
    ]);

    if (carRes.status === "fulfilled") {
      const res = carRes.value;
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        error = data?.error || data?.message || "Failed to load car details.";
      } else {
        car = normalizeCar(data);
      }
    } else {
      error = "Could not reach the car details endpoint.";
    }

    if (txRes.status === "fulfilled") {
      const txRawRes = txRes.value;
      if (txRawRes.ok) {
        const txData = await txRawRes.json().catch(() => ({}));
        const rawTransactions =
          txData?.data ??
          txData?.transactions ??
          txData?.items ??
          (Array.isArray(txData) ? txData : []);

        const transactions = Array.isArray(rawTransactions) ? rawTransactions : [];

        if (transactions.length > 0) {
          const bookingResults = await Promise.allSettled(
            transactions.map(async (tx) => {
              const txAttrs = tx?.attributes ?? tx ?? {};
              const txId =
                tx?.id ??
                txAttrs?.id ??
                txAttrs?.transaction_id ??
                txAttrs?.transactionId;
              const txName =
                txAttrs?.name ??
                txAttrs?.transaction_name ??
                txAttrs?.transactionName ??
                null;

              if (!txId) return [];

              const bRes = await fetch(
                `${baseUrl}/api/v1/transactions/${txId}/bookings?status=upcoming&car_id=${encodeURIComponent(carId)}`,
                { headers: reqHeaders, cache: "no-store" },
              );
              if (!bRes.ok) return [];

              const bData = await bRes.json().catch(() => ({}));
              const rawBookings =
                bData?.data ??
                bData?.bookings ??
                bData?.items ??
                (Array.isArray(bData) ? bData : []);

              return Array.isArray(rawBookings)
                ? rawBookings.map((b) => normalizeBooking(b, txName))
                : [];
            }),
          );

          upcomingBookings = bookingResults
            .filter((r) => r.status === "fulfilled")
            .flatMap((r) => r.value)
            .filter((b) => b.id);
        }
      } else {
        bookingsError = "Failed to load transactions.";
      }
    } else {
      bookingsError = "Could not reach the transactions endpoint.";
    }
  }

  const carName = [car?.make, car?.model].filter(Boolean).join(" ").trim();

  return (
    <div className="w-full pr-8">
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
          <Link
            href="/dashboard/cars"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 transition hover:text-teal-800"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-4 w-4"
              aria-hidden
            >
              <path
                d="M15 18l-6-6 6-6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Back to car list
          </Link>
          <p className="mt-4 text-sm text-red-600">{error}</p>
        </div>
      ) : car ? (
        <CarDetailSection car={car} carName={carName} />
      ) : (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <Link
            href="/dashboard/cars"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 transition hover:text-teal-800"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-4 w-4"
              aria-hidden
            >
              <path
                d="M15 18l-6-6 6-6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Back to car list
          </Link>
          <p className="mt-4 text-sm text-zinc-500">No car data returned.</p>
        </div>
      )}

      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-zinc-900">Upcoming Bookings</h2>
        {bookingsError ? (
          <p className="mt-4 text-sm text-red-600">{bookingsError}</p>
        ) : upcomingBookings.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">No upcoming bookings for this car.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                  <th className="pb-3 pr-6">Transaction</th>
                  <th className="pb-3 pr-6">Driver</th>
                  <th className="pb-3 pr-6">Start Date</th>
                  <th className="pb-3 pr-6">End Date</th>
                  <th className="pb-3">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {upcomingBookings.map((booking) => (
                  <tr key={booking.id} className="text-zinc-700">
                    <td className="py-3 pr-6 font-medium text-zinc-900">
                      {booking.transaction_name}
                    </td>
                    <td className="py-3 pr-6">{booking.driver || "—"}</td>
                    <td className="py-3 pr-6">{formatDate(booking.start_date)}</td>
                    <td className="py-3 pr-6">{formatDate(booking.end_date)}</td>
                    <td className="py-3 text-zinc-500">{booking.note || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
