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
    created_at: pick(["created_at", "createdAt"]),
    updated_at: pick(["updated_at", "updatedAt"]),
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
      pick(["start_date", "startDate"]) || pick(["start"]),
    end_date:
      pick(["end_date", "endDate"]) || pick(["end"]),
    note: pick(["note", "notes"]),
    car: carName,
    status: pick(["status", "state"]),
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

function DetailRow({ label, value }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </div>
      <div className="mt-2 text-sm text-zinc-900">{value || "Not available"}</div>
    </div>
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
    // Fetch driver details and transaction list in parallel
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

    // Resolve driver
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

    // Resolve transactions → fetch upcoming bookings per transaction
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
      {/* Header */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <Link
          href="/dashboard/drivers"
          className="text-sm font-medium text-teal-700 transition hover:text-teal-800"
        >
          Back to driver list
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Driver Details</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Driver ID: <span className="font-medium text-zinc-900">{driverId}</span>
        </p>
      </div>

      {/* Driver info */}
      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-zinc-900">Profile</h2>
        {driverError ? (
          <p className="mt-4 text-sm text-red-600">{driverError}</p>
        ) : driver ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <DetailRow label="Full Name" value={fullName} />
            <DetailRow label="License Number" value={driver.license_number} />
            <DetailRow label="Phone Number" value={driver.phone_number} />
            <DetailRow label="Address" value={driver.address} />
            <DetailRow label="License Expiry Date" value={driver.license_expiry_date} />
            <DetailRow label="Created At" value={driver.created_at} />
          </div>
        ) : (
          <p className="mt-4 text-sm text-zinc-500">No driver data returned.</p>
        )}
      </div>

      {/* Upcoming bookings */}
      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-zinc-900">Upcoming Bookings</h2>

        {bookingsError ? (
          <p className="mt-4 text-sm text-red-600">{bookingsError}</p>
        ) : upcomingBookings.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">No upcoming bookings for this driver.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                  <th className="pb-3 pr-6">Transaction</th>
                  <th className="pb-3 pr-6">Car</th>
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
                    <td className="py-3 pr-6">{booking.car || "—"}</td>
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
