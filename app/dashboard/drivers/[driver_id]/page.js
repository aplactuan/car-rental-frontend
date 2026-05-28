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

function normalizeDriver(payload) {
  const record = payload?.data ?? payload?.driver ?? payload;
  const attrs = record?.attributes ?? {};
  const pick = (keys) => {
    const fromAttrs = readField(attrs, keys);
    if (fromAttrs !== "") return fromAttrs;
    return readField(record, keys);
  };

  return {
    id:
      pick(["id"]) ||
      pick(["driver_id", "driverId"]) ||
      pick(["uuid", "driver_uuid", "driverUuid"]),
    first_name: pick(["first_name", "firstName"]),
    last_name: pick(["last_name", "lastName"]),
    license_number: pick(["license_number", "licenseNumber", "licenseNUmber"]),
    license_expiry_date: pick([
      "license_expiry_date",
      "licenseExpiryDate",
      "licenseEXpiryDate",
    ]),
    address: pick(["address", "full_address", "fullAddress"]),
    phone_number: pick(["phone_number", "phoneNumber", "phoneNUmber"]),
  };
}

function normalizeBooking(raw, transactionName) {
  const attrs = raw?.attributes ?? raw ?? {};
  const pick = (keys) => readField(attrs, keys) || readField(raw, keys);

  const carAttrs =
    raw?.relationships?.car?.data?.attributes ??
    attrs?.car ??
    null;

  const carName =
    carAttrs
      ? [
          readField(carAttrs, ["brand", "make"]),
          readField(carAttrs, ["model"]),
          readField(carAttrs, ["plate_number", "plateNumber", "licensePlate"]),
        ]
          .filter(Boolean)
          .join(" ") || readField(carAttrs, ["name"]) || null
      : pick(["car_name", "carName"]) || null;

  return {
    id: pick(["id", "booking_id", "bookingId"]),
    transaction_name: transactionName || "-",
    start_date:
      pick(["start_date", "startDate", "start_time", "startTime", "starts_at", "startsAt"]) ||
      pick(["start"]),
    end_date:
      pick(["end_date", "endDate", "end_time", "endTime", "ends_at", "endsAt"]) ||
      pick(["end"]),
    note: pick(["note", "notes"]),
    car: carName,
    status: pick(["status", "state"]),
  };
}

function formatDate(value) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function displayValue(value) {
  if (value === undefined || value === null || value === "") return null;
  return String(value);
}

function getInitials(firstName, lastName) {
  const first = String(firstName ?? "").trim();
  const last = String(lastName ?? "").trim();
  const letters = `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
  if (letters.trim()) return letters;
  return "?";
}

function parseDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function licenseExpiryMeta(expiryValue) {
  const expiry = parseDate(expiryValue);
  if (!expiry) {
    return { label: "Unknown", tone: "neutral" };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiryDay = new Date(expiry);
  expiryDay.setHours(0, 0, 0, 0);

  const diffMs = expiryDay.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { label: "Expired", tone: "danger" };
  }
  if (diffDays <= 30) {
    return { label: "Expiring soon", tone: "warning" };
  }
  return { label: "Valid", tone: "success" };
}

const LICENSE_TONE_CLASSES = {
  neutral: "bg-white/15 text-white ring-white/25",
  success: "bg-emerald-500/25 text-emerald-50 ring-emerald-300/40",
  warning: "bg-amber-500/25 text-amber-50 ring-amber-300/40",
  danger: "bg-red-500/30 text-red-50 ring-red-300/40",
};

function BackLink({ href, label }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-violet-100 transition hover:text-white"
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
      {label}
    </Link>
  );
}

function InfoCard({ icon, label, value, className = "" }) {
  const shown = displayValue(value);
  return (
    <div
      className={`flex items-start gap-3 rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-4 transition hover:border-violet-200 hover:bg-violet-50/40 ${className}`}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-violet-700 shadow-sm ring-1 ring-zinc-200/80">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          {label}
        </p>
        <p className="mt-1 text-base font-semibold text-zinc-900 break-words">
          {shown ?? "—"}
        </p>
      </div>
    </div>
  );
}

function DriverDetailSection({ driver, fullName }) {
  const license = displayValue(driver.license_number);
  const phone = displayValue(driver.phone_number);
  const address = displayValue(driver.address);
  const expiryRaw = driver.license_expiry_date;
  const expiryFormatted = formatDate(expiryRaw);
  const expiryMeta = licenseExpiryMeta(expiryRaw);
  const initials = getInitials(driver.first_name, driver.last_name);

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="relative bg-gradient-to-br from-violet-900 via-indigo-800 to-teal-700 px-6 pb-8 pt-6 text-white sm:px-8">
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-12 left-1/3 h-32 w-32 rounded-full bg-teal-400/20 blur-2xl"
          aria-hidden
        />

        <BackLink href="/dashboard/drivers" label="Back to driver list" />

        <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-lg font-bold tracking-tight text-white ring-1 ring-white/25 backdrop-blur-sm">
              {initials}
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {fullName || "Unknown driver"}
              </h1>
              <p className="mt-1 text-sm text-violet-100">
                {phone || "No phone on file"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {license && (
              <div className="inline-flex w-fit items-center rounded-lg border border-white/25 bg-white/10 px-4 py-2 font-mono text-sm font-semibold tracking-wider text-white backdrop-blur-sm">
                {license}
              </div>
            )}
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${LICENSE_TONE_CLASSES[expiryMeta.tone]}`}
            >
              {expiryMeta.label}
            </span>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 sm:px-8">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Contact & license
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <InfoCard
            label="Phone number"
            value={phone}
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
                  d="M6.5 4h3l1.5 4-2 1.5a11 11 0 0 0 5 5L15.5 13l4 1.5v3a1.5 1.5 0 0 1-1.5 1.5A14 14 0 0 1 4 6A1.5 1.5 0 0 1 5.5 4.5Z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
          />
          <InfoCard
            label="License expiry"
            value={expiryFormatted === "—" ? null : expiryFormatted}
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

        <div className="mt-4 flex items-start gap-4 rounded-xl border border-zinc-200 bg-gradient-to-r from-zinc-50 to-white p-4 sm:p-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 ring-2 ring-white shadow-md">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              className="h-5 w-5"
              aria-hidden
            >
              <path
                d="M12 21s-6-4.35-6-10a6 6 0 1 1 12 0c0 5.65-6 10-6 10Z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="11" r="2" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Address
            </p>
            <p className="mt-1 text-base font-semibold text-zinc-900 break-words">
              {address ?? "Not specified"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function BookingCard({ booking }) {
  return (
    <article className="group rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-violet-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-zinc-900">
            {booking.transaction_name}
          </h3>
          <p className="mt-0.5 truncate text-sm text-zinc-500">
            {booking.car || "Vehicle not assigned"}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700 ring-1 ring-violet-100">
          Upcoming
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            Start
          </dt>
          <dd className="mt-0.5 font-medium text-zinc-800">
            {formatDateTime(booking.start_date)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            End
          </dt>
          <dd className="mt-0.5 font-medium text-zinc-800">
            {formatDateTime(booking.end_date)}
          </dd>
        </div>
      </dl>

      {booking.note ? (
        <p className="mt-3 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
          {booking.note}
        </p>
      ) : null}
    </article>
  );
}

function UpcomingBookingsSection({ bookings, error }) {
  const count = bookings.length;

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 bg-gradient-to-r from-zinc-50 to-white px-6 py-5 sm:px-8">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
            Upcoming bookings
          </h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            Scheduled trips assigned to this driver
          </p>
        </div>
        <span className="inline-flex items-center rounded-full bg-violet-100 px-3 py-1 text-sm font-semibold text-violet-800">
          {count} {count === 1 ? "booking" : "bookings"}
        </span>
      </div>

      <div className="px-6 py-6 sm:px-8">
        {error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : count === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 px-6 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="h-6 w-6"
                aria-hidden
              >
                <rect x="4" y="5" width="16" height="15" rx="2" />
                <path d="M8 3v4M16 3v4M4 10h16" strokeLinecap="round" />
              </svg>
            </div>
            <p className="mt-3 text-sm font-medium text-zinc-700">
              No upcoming bookings
            </p>
            <p className="mt-1 max-w-sm text-sm text-zinc-500">
              This driver has no scheduled trips across active transactions.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {bookings.map((booking) => (
              <BookingCard key={booking.id} booking={booking} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default async function DriverDetailPage({ params }) {
  const resolvedParams = await params;
  const driverId = resolvedParams?.driver_id;

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

  const reqHeaders = cookieHeader ? { Cookie: cookieHeader } : {};

  let driver = null;
  let driverError = "";
  let upcomingBookings = [];
  let bookingsError = "";

  if (!driverId) {
    driverError = "Driver ID was not provided.";
  } else {
    const [driverRes, txRes] = await Promise.allSettled([
      fetch(`${baseUrl}/api/v1/drivers/${driverId}`, {
        headers: reqHeaders,
        cache: "no-store",
      }),
      fetch(`${baseUrl}/api/v1/transactions?per_page=100`, {
        headers: reqHeaders,
        cache: "no-store",
      }),
    ]);

    if (driverRes.status === "fulfilled") {
      const res = driverRes.value;
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        driverError = data?.error || data?.message || "Failed to load driver details.";
      } else {
        driver = normalizeDriver(data);
      }
    } else {
      driverError = "Could not reach the driver details endpoint.";
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

        const transactions = Array.isArray(rawTransactions)
          ? rawTransactions
          : [];

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
                `${baseUrl}/api/v1/transactions/${txId}/bookings?status=upcoming&driver_id=${encodeURIComponent(driverId)}`,
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

  const fullName = [driver?.first_name, driver?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    <div className="w-full pr-8">
      {driverError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
          <BackLink href="/dashboard/drivers" label="Back to driver list" />
          <p className="mt-4 text-sm text-red-600">{driverError}</p>
        </div>
      ) : driver ? (
        <DriverDetailSection driver={driver} fullName={fullName} />
      ) : (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <BackLink href="/dashboard/drivers" label="Back to driver list" />
          <p className="mt-4 text-sm text-zinc-500">No driver data returned.</p>
        </div>
      )}

      <UpcomingBookingsSection
        bookings={upcomingBookings}
        error={bookingsError}
      />
    </div>
  );
}
