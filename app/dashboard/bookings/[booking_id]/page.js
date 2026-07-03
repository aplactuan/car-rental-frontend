import Link from "next/link";
import { cookies } from "next/headers";
import BookingTripReportsSection from "./BookingTripReportsSection";

function readField(source, keys) {
  if (!source || typeof source !== "object") return "";

  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }

  const normalizedMap = Object.fromEntries(
    Object.entries(source).map(([key, value]) => [
      key.toLowerCase().replace(/[_\s]/g, ""),
      value,
    ]),
  );

  for (const key of keys) {
    const normalizedKey = key.toLowerCase().replace(/[_\s]/g, "");
    const value = normalizedMap[normalizedKey];
    if (value !== undefined && value !== null && value !== "") return value;
  }

  return "";
}

function formatCurrency(amount) {
  if (typeof amount !== "number" || !Number.isFinite(amount)) return "-";
  return `PHP ${Math.round(amount).toLocaleString("en-US")}`;
}

function formatDateTime(value) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);

  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function deriveStatus(startDate, endDate) {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "unscheduled";
  }

  if (end < now) return "completed";
  if (start > now) return "incoming";
  if (start <= now && end >= now) return "ongoing";
  return "today";
}

function statusClassName(status) {
  if (status === "today") return "bg-indigo-100 text-indigo-700 ring-indigo-200";
  if (status === "ongoing") return "bg-emerald-100 text-emerald-700 ring-emerald-200";
  if (status === "incoming") return "bg-blue-100 text-blue-700 ring-blue-200";
  if (status === "completed") return "bg-zinc-100 text-zinc-700 ring-zinc-200";
  return "bg-amber-100 text-amber-700 ring-amber-200";
}

function normalizeBooking(payload) {
  const record = payload?.data ?? payload?.booking ?? payload;
  const attrs = record?.attributes ?? record ?? {};
  const relationships = record?.relationships ?? {};

  const pick = (keys) => {
    const fromAttrs = readField(attrs, keys);
    if (fromAttrs !== "") return fromAttrs;
    return readField(record, keys);
  };

  const driverRel = relationships?.driver?.data;
  const carRel = relationships?.car?.data;
  const transactionRel = relationships?.transaction?.data;

  const driverAttrs = driverRel?.attributes ?? {};
  const carAttrs = carRel?.attributes ?? {};
  const transactionAttrs = transactionRel?.attributes ?? {};

  const driverName = [
    readField(driverAttrs, ["first_name", "firstName"]) ||
      pick(["driver_first_name", "driverFirstName"]),
    readField(driverAttrs, ["last_name", "lastName"]) ||
      pick(["driver_last_name", "driverLastName"]),
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  const carLabel = [
    readField(carAttrs, ["make"]) || pick(["car_make", "carMake"]),
    readField(carAttrs, ["model"]) || pick(["car_model", "carModel"]),
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    id: String(pick(["id", "booking_id", "bookingId"]) || ""),
    transactionId: String(
      pick(["transaction_id", "transactionId"]) || transactionRel?.id || "",
    ),
    transactionName: String(
      readField(transactionAttrs, ["name", "title"]) ||
        pick(["transaction_name", "transactionName"]) ||
        "",
    ),
    carId: String(pick(["car_id", "carId"]) || carRel?.id || ""),
    carLabel: String(carLabel || pick(["car_name", "carName"]) || ""),
    carPlate: String(
      readField(carAttrs, ["plate_number", "plateNumber"]) ||
        pick(["car_plate", "carPlate", "plate_number", "plateNumber"]) ||
        "",
    ),
    driverId: String(pick(["driver_id", "driverId"]) || driverRel?.id || ""),
    driverName: String(driverName || pick(["driver_name", "driverName"]) || ""),
    price:
      typeof attrs?.price === "number"
        ? attrs.price
        : attrs?.price != null
          ? Number(attrs.price)
          : null,
    startDate: String(pick(["start_date", "startDate"]) || ""),
    endDate: String(pick(["end_date", "endDate"]) || ""),
    note: String(pick(["note", "notes"]) || ""),
  };
}

function extractPagination(payload) {
  const meta = payload?.meta;
  if (meta && typeof meta === "object") {
    return {
      currentPage: Math.max(1, Number(meta.current_page) || 1),
      lastPage: Math.max(1, Number(meta.last_page) || 1),
    };
  }

  const list = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload)
      ? payload
      : [];

  return {
    currentPage: 1,
    lastPage: list.length > 0 ? 1 : 0,
  };
}

function extractBookingFromTransactionPayload(payload, bookingId) {
  const bookingsData =
    payload?.data?.relationships?.bookings?.data ??
    payload?.relationships?.bookings?.data;
  if (!Array.isArray(bookingsData)) return null;

  const bookingRef = bookingsData.find(
    (item) => String(item?.id) === String(bookingId),
  );
  if (!bookingRef) return null;

  const includedData = Array.isArray(payload?.included) ? payload.included : [];
  const includedBooking =
    includedData.find(
      (item) =>
        String(item?.id) === String(bookingId) &&
        (!item?.type || item.type === "bookings" || item.type === "booking"),
    ) ?? bookingRef;

  const includedAttributes = includedBooking?.attributes ?? {};
  const includedRelationships = includedBooking?.relationships ?? {};
  const driverRef = includedRelationships?.driver?.data ?? null;
  const carRef = includedRelationships?.car?.data ?? null;
  const transactionAttrs = payload?.data?.attributes ?? payload?.attributes ?? {};
  const transactionId = String(
    payload?.data?.id ?? payload?.id ?? bookingRef?.relationships?.transaction?.data?.id ?? "",
  );

  return {
    ...includedBooking,
    id: String(bookingId),
    relationships: {
      ...(includedBooking?.relationships ?? {}),
      ...(driverRef ? { driver: { data: driverRef } } : {}),
      ...(carRef ? { car: { data: carRef } } : {}),
      transaction: {
        data: {
          type: "transactions",
          id: transactionId,
          attributes: transactionAttrs,
        },
      },
    },
    attributes: {
      ...(bookingRef?.attributes ?? {}),
      ...includedAttributes,
    },
  };
}

async function fetchBookingViaTransaction(baseUrl, reqHeaders, transactionId, bookingId) {
  const res = await fetch(
    `${baseUrl}/api/v1/transactions/${encodeURIComponent(transactionId)}`,
    {
      headers: reqHeaders,
      cache: "no-store",
    },
  );

  if (!res.ok) return null;

  const data = await res.json().catch(() => ({}));
  const rawBooking = extractBookingFromTransactionPayload(data, bookingId);
  return rawBooking ? normalizeBooking(rawBooking) : null;
}

async function fetchSingleBooking(baseUrl, reqHeaders, transactionId, bookingId) {
  const res = await fetch(
    `${baseUrl}/api/v1/transactions/${encodeURIComponent(transactionId)}/bookings/${encodeURIComponent(bookingId)}`,
    {
      headers: reqHeaders,
      cache: "no-store",
    },
  );

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    return {
      booking: null,
      error: data?.error || data?.message || "Failed to load booking details.",
    };
  }

  return { booking: normalizeBooking(data), error: "" };
}

async function resolveBookingFromList(baseUrl, reqHeaders, bookingId) {
  const perPage = 100;
  let currentPage = 1;
  let lastPage = 1;

  while (currentPage <= lastPage) {
    const res = await fetch(
      `${baseUrl}/api/v1/bookings?per_page=${perPage}&page=${currentPage}`,
      {
        headers: reqHeaders,
        cache: "no-store",
      },
    );

    if (!res.ok) return null;

    const data = await res.json().catch(() => ({}));
    const rawItems = Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data)
        ? data
        : [];

    const match = rawItems.find((item) => {
      const normalized = normalizeBooking(item);
      return String(normalized.id) === String(bookingId);
    });

    if (match) {
      return normalizeBooking(match);
    }

    const pagination = extractPagination(data);
    currentPage += 1;
    lastPage = pagination.lastPage;
  }

  return null;
}

function DetailRow({ label, value, href }) {
  const content = value || "-";

  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-zinc-200/80 bg-zinc-50/80 px-4 py-3">
      <dt className="text-sm font-medium text-zinc-500">{label}</dt>
      <dd className="text-right text-sm font-semibold text-zinc-900">
        {href && value ? (
          <Link href={href} className="text-teal-700 transition hover:text-teal-800">
            {content}
          </Link>
        ) : (
          content
        )}
      </dd>
    </div>
  );
}

export default async function BookingDetailPage({ params, searchParams }) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const bookingId = resolvedParams?.booking_id;
  let transactionId =
    resolvedSearchParams?.transaction_id ??
    resolvedSearchParams?.transactionId ??
    "";

  let error = "";
  let booking = null;
  let isDriverView = false;

  if (!bookingId) {
    error = "Booking ID was not provided.";
  } else {
    const cookieStore = await cookies();
    const role = cookieStore.get("auth_role")?.value || "";
    isDriverView = role === "driver";
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

    if (!transactionId) {
      booking = await resolveBookingFromList(baseUrl, reqHeaders, bookingId);
      transactionId = booking?.transactionId || "";
    }

    if (transactionId) {
      const fromTransaction = await fetchBookingViaTransaction(
        baseUrl,
        reqHeaders,
        transactionId,
        bookingId,
      );

      if (fromTransaction) {
        booking = fromTransaction;
      } else {
        const singleBookingResult = await fetchSingleBooking(
          baseUrl,
          reqHeaders,
          transactionId,
          bookingId,
        );

        if (singleBookingResult.booking) {
          booking = singleBookingResult.booking;
        } else if (!booking) {
          error = singleBookingResult.error;
        }
      }
    }

    if (!booking && !error) {
      error = "Booking details could not be found.";
    }
  }

  const status = booking ? deriveStatus(booking.startDate, booking.endDate) : "unscheduled";
  const statusLabel = status === "unscheduled" ? "Unscheduled" : status;

  return (
      <div className="w-full pr-8">
        <header className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm ring-1 ring-zinc-100">
          <div className="relative bg-gradient-to-br from-teal-700 via-cyan-700 to-blue-900 px-6 py-6 text-white sm:px-8">
            <div
              className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/15 blur-2xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-12 left-1/3 h-24 w-24 rounded-full bg-cyan-300/20 blur-2xl"
              aria-hidden
            />

            <div className="relative flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <Link
                  href="/dashboard/bookings"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-cyan-100 transition hover:text-white"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-4 w-4"
                    aria-hidden
                  >
                    <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Back to bookings
                </Link>
                <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
                  Booking details
                </h1>
                <p className="mt-1 text-sm text-cyan-50/90">
                  {booking?.transactionName || "Single booking record"}
                </p>
              </div>

              {booking ? (
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ring-1 ${statusClassName(status)}`}
                >
                  {statusLabel}
                </span>
              ) : null}
            </div>
          </div>
        </header>

        <section className="mt-6 rounded-2xl border border-zinc-200/90 bg-white shadow-sm ring-1 ring-zinc-100">
          <div className="border-b border-zinc-100 bg-gradient-to-r from-zinc-50 to-white px-6 py-4 sm:px-8">
            <h2 className="text-lg font-semibold text-zinc-900">Booking overview</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Data loaded from your accessible booking records for this booking.
            </p>
          </div>

          <div className="p-6 sm:p-8">
            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : booking ? (
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
                <div className="space-y-6">
                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Rental period
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-white bg-white px-4 py-3 shadow-sm">
                        <p className="text-xs uppercase tracking-wide text-zinc-500">Start</p>
                        <p className="mt-1 text-sm font-semibold text-zinc-900">
                          {formatDateTime(booking.startDate)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-white bg-white px-4 py-3 shadow-sm">
                        <p className="text-xs uppercase tracking-wide text-zinc-500">End</p>
                        <p className="mt-1 text-sm font-semibold text-zinc-900">
                          {formatDateTime(booking.endDate)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Notes
                    </p>
                    <p className="mt-3 text-sm leading-6 text-zinc-700">
                      {booking.note || "No note provided for this booking."}
                    </p>
                  </div>
                </div>

                <dl className="space-y-3">
                  <DetailRow
                    label="Transaction"
                    value={booking.transactionName}
                    href={
                      booking.transactionId && !isDriverView
                        ? `/dashboard/transactions/${encodeURIComponent(booking.transactionId)}`
                        : null
                    }
                  />
                  <DetailRow label="Price" value={formatCurrency(booking.price)} />
                  <DetailRow
                    label="Car"
                    value={booking.carLabel || booking.carPlate}
                    href={
                      booking.carId
                        ? `/dashboard/cars/${encodeURIComponent(booking.carId)}`
                        : null
                    }
                  />
                  <DetailRow label="Plate number" value={booking.carPlate} />
                  <DetailRow
                    label="Driver"
                    value={booking.driverName}
                    href={
                      booking.driverId
                        ? `/dashboard/drivers/${encodeURIComponent(booking.driverId)}`
                        : null
                    }
                  />
                </dl>
              </div>
            ) : (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                No booking data returned.
              </div>
            )}
          </div>
        </section>

        {booking && !error ? (
          <section className="mt-6 rounded-2xl border border-zinc-200/90 bg-white shadow-sm ring-1 ring-zinc-100">
            <div className="border-b border-zinc-100 bg-gradient-to-r from-zinc-50 to-white px-6 py-4 sm:px-8">
              <h2 className="text-lg font-semibold text-zinc-900">Trip reports</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Create and manage daily trip logs for this booking.
              </p>
            </div>
            <div className="p-6 sm:p-8">
              <BookingTripReportsSection
                transactionId={transactionId || booking.transactionId}
                bookingId={bookingId}
              />
            </div>
          </section>
        ) : null}
      </div>
    );
}
