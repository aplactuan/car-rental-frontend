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
    mileage: pick(["mileage"]),
    type: pick(["type"]),
    number_of_seats: pick(["number_of_seats", "numberOfSeats"]),
    year: pick(["year"]),
    created_at: pick(["created_at", "createdAt"]),
    updated_at: pick(["updated_at", "updatedAt"]),
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
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <Link
          href="/dashboard/cars"
          className="text-sm font-medium text-teal-700 transition hover:text-teal-800"
        >
          Back to car list
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Car Details</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Car ID: <span className="font-medium text-zinc-900">{carId}</span>
        </p>
      </div>

      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        {error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : car ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <DetailRow label="Car" value={carName} />
            <DetailRow label="Plate Number" value={car.plate_number} />
            <DetailRow
              label="Seats"
              value={
                car.number_of_seats !== undefined &&
                car.number_of_seats !== null &&
                car.number_of_seats !== ""
                  ? String(car.number_of_seats)
                  : ""
              }
            />
            <DetailRow
              label="Mileage"
              value={
                car.mileage !== undefined && car.mileage !== null && car.mileage !== ""
                  ? Number(car.mileage).toLocaleString()
                  : ""
              }
            />
            <DetailRow label="Year" value={car.year ? String(car.year) : ""} />
            <DetailRow label="Type" value={car.type} />
            <DetailRow label="Created At" value={car.created_at} />
            <DetailRow label="Updated At" value={car.updated_at} />
          </div>
        ) : (
          <p className="text-sm text-zinc-500">No car data returned.</p>
        )}
      </div>

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
