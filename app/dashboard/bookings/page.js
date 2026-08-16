"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const BOOKING_PAGE_SIZE = 9;
const FILTERS = [
  { key: "today", label: "Today" },
  { key: "all", label: "All" },
  { key: "ongoing", label: "Ongoing" },
  { key: "incoming", label: "Incoming" },
  { key: "completed", label: "Completed" },
];

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

function extractPagination(payload) {
  const meta = payload?.meta;
  if (meta && typeof meta === "object") {
    return {
      currentPage: Math.max(1, Number(meta.current_page) || 1),
      lastPage: Math.max(1, Number(meta.last_page) || 1),
      total: Math.max(0, Number(meta.total) || 0),
    };
  }

  const list = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload)
      ? payload
      : [];

  return {
    currentPage: 1,
    lastPage: 1,
    total: list.length,
  };
}

function normalizeBookings(payload) {
  const raw = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload)
      ? payload
      : [];
  const included = Array.isArray(payload?.included) ? payload.included : [];
  const includedMap = new Map();

  for (const item of included) {
    if (item?.type && item?.id) {
      includedMap.set(`${item.type}:${item.id}`, item);
    }
  }

  return raw.map((item) => {
    const attrs = item?.attributes ?? item;
    const pick = (keys) => {
      const fromAttrs = readField(attrs, keys);
      if (fromAttrs !== "") return fromAttrs;
      return readField(item, keys);
    };

    const carRel = item?.relationships?.car?.data;
    const driverRel = item?.relationships?.driver?.data;
    const transactionRel = item?.relationships?.transaction?.data;

    const carRelAttrs =
      carRel && typeof carRel === "object" && !Array.isArray(carRel)
        ? carRel.attributes ?? {}
        : {};
    const driverRelAttrs =
      driverRel && typeof driverRel === "object" && !Array.isArray(driverRel)
        ? driverRel.attributes ?? {}
        : {};
    const transactionRelAttrs =
      transactionRel &&
      typeof transactionRel === "object" &&
      !Array.isArray(transactionRel)
        ? transactionRel.attributes ?? {}
        : {};

    const carInc =
      carRel?.id && carRel?.type ? includedMap.get(`${carRel.type}:${carRel.id}`) : null;
    const driverInc =
      driverRel?.id && driverRel?.type
        ? includedMap.get(`${driverRel.type}:${driverRel.id}`)
        : null;
    const transactionInc =
      transactionRel?.id && transactionRel?.type
        ? includedMap.get(`${transactionRel.type}:${transactionRel.id}`)
        : null;

    const carAttrs = carInc?.attributes ?? carRelAttrs;
    const driverAttrs = driverInc?.attributes ?? driverRelAttrs;
    const transactionAttrs = transactionInc?.attributes ?? transactionRelAttrs;

    const carMake = readField(carAttrs, ["make"]) || readField(attrs, ["car_make", "carMake"]);
    const carModel = readField(carAttrs, ["model"]) || readField(attrs, ["car_model", "carModel"]);
    const carPlate =
      readField(carAttrs, ["plate_number", "plateNumber"]) ||
      readField(attrs, ["plate_number", "plateNumber", "car_plate", "carPlate"]);

    const driverFirst =
      readField(driverAttrs, ["first_name", "firstName"]) ||
      readField(attrs, ["driver_first_name", "driverFirstName"]);
    const driverLast =
      readField(driverAttrs, ["last_name", "lastName"]) ||
      readField(attrs, ["driver_last_name", "driverLastName"]);

    const driverName = [driverFirst, driverLast].filter(Boolean).join(" ").trim();
    const carDisplay = [carMake, carModel].filter(Boolean).join(" ").trim();

    return {
      id: String(pick(["id"]) || ""),
      price:
        typeof attrs?.price === "number"
          ? attrs.price
          : attrs?.price != null
            ? Number(attrs.price)
            : null,
      startDate: String(pick(["start_date", "startDate"]) || ""),
      endDate: String(pick(["end_date", "endDate"]) || ""),
      note: String(pick(["note", "notes"]) || ""),
      carId: String(
        pick(["car_id", "carId"]) || carRel?.id || "",
      ),
      driverId: String(
        pick(["driver_id", "driverId"]) || driverRel?.id || "",
      ),
      transactionId: String(
        pick(["transaction_id", "transactionId"]) || transactionRel?.id || "",
      ),
      transactionName: String(
        readField(transactionAttrs, ["name", "title"]) ||
          pick(["transaction_name", "transactionName"]) ||
          "",
      ),
      carLabel: String(carDisplay || pick(["car_name", "carName"]) || ""),
      carPlate: String(carPlate || ""),
      driverName: String(driverName || pick(["driver_name", "driverName"]) || ""),
    };
  });
}

function formatCurrency(amount) {
  if (typeof amount !== "number" || !Number.isFinite(amount)) return "—";
  return `PHP ${Math.round(amount).toLocaleString("en-US")}`;
}

function formatDateLabel(dateString) {
  if (!dateString) return "—";
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) return String(dateString);

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

function rangeLabel(page, rowsOnPage, total) {
  if (total <= 0 || rowsOnPage <= 0) return "No Bookings";
  const from = (page - 1) * BOOKING_PAGE_SIZE + 1;
  const to = from + rowsOnPage - 1;
  return `Showing ${from.toLocaleString()}-${to.toLocaleString()} of ${total.toLocaleString()} bookings`;
}

function BookingCard({ booking, hideTransactionLink = false }) {
  const status = deriveStatus(booking.startDate, booking.endDate);
  const statusLabel = status === "unscheduled" ? "Unscheduled" : status;

  return (
    <article className="min-w-0 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:shadow-md sm:p-5">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words text-sm font-semibold text-zinc-900">
            {booking.transactionName || "Booking"}
          </h3>
          <p className="mt-1 break-all text-xs text-zinc-500">
            ID: {booking.id ? booking.id.slice(0, 8) : "N/A"}
          </p>
        </div>
        <span
          className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ring-1 ${statusClassName(status)}`}
        >
          {statusLabel}
        </span>
      </div>

      <div className="mt-4 rounded-lg border border-zinc-100 bg-zinc-50/80 p-3">
        <p className="text-xs uppercase tracking-wide text-zinc-500">Rental period</p>
        <p className="mt-1 break-words text-sm font-medium text-zinc-800">
          {formatDateLabel(booking.startDate)} - {formatDateLabel(booking.endDate)}
        </p>
      </div>

      <div className="mt-4 grid gap-3 text-sm text-zinc-700">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <span className="text-zinc-500">Price</span>
          <span className="break-words text-right font-semibold text-zinc-900">{formatCurrency(booking.price)}</span>
        </div>
        <div className="flex min-w-0 items-start justify-between gap-3">
          <span className="text-zinc-500">Car</span>
          <span className="min-w-0 break-words text-right">
            {booking.carLabel || booking.carPlate || "Not specified"}
          </span>
        </div>
        <div className="flex min-w-0 items-start justify-between gap-3">
          <span className="text-zinc-500">Driver</span>
          <span className="min-w-0 break-words text-right">{booking.driverName || "Not specified"}</span>
        </div>
      </div>

      {booking.note ? (
        <p className="mt-4 line-clamp-2 rounded-lg border border-red-100 bg-red-50/70 px-3 py-2 text-xs text-red-800">
          {booking.note}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {booking.id ? (
          <Link
            href={
              booking.transactionId
                ? `/dashboard/bookings/${encodeURIComponent(booking.id)}?transaction_id=${encodeURIComponent(booking.transactionId)}`
                : `/dashboard/bookings/${encodeURIComponent(booking.id)}`
            }
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-100 px-3 text-center text-xs font-semibold text-red-700 transition hover:bg-red-50 hover:text-red-800"
          >
            View Booking Details
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-3.5 w-3.5"
              aria-hidden
            >
              <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        ) : null}

        {booking.transactionId && !hideTransactionLink ? (
          <Link
            href={`/dashboard/transactions/${encodeURIComponent(booking.transactionId)}`}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border border-zinc-200 px-3 text-center text-xs font-semibold text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-800"
          >
            View Transaction
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-3.5 w-3.5"
              aria-hidden
            >
              <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        ) : null}
      </div>
    </article>
  );
}

export default function BookingsPage() {
  const [activeFilter, setActiveFilter] = useState("today");
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    lastPage: 1,
    total: 0,
  });
  const [isDriverView, setIsDriverView] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    async function fetchSessionRole() {
      try {
        const res = await fetch("/api/session", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!isCurrent) return;
        if (res.ok && data?.role) {
          setIsDriverView(data.role === "driver");
          return;
        }
      } catch {
        // Fall through to local role.
      }

      if (typeof window !== "undefined" && isCurrent) {
        setIsDriverView(localStorage.getItem("auth_role") === "driver");
      }
    }

    fetchSessionRole();
    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    let isCurrent = true;

    async function fetchBookings() {
      setIsLoading(true);
      setError("");

      const params = new URLSearchParams();
      params.set("per_page", String(BOOKING_PAGE_SIZE));
      params.set("page", String(page));
      if (activeFilter !== "all") {
        params.set("status", activeFilter);
      }

      try {
        const res = await fetch(`/api/v1/bookings?${params.toString()}`, {
          method: "GET",
          credentials: "include",
        });
        const data = await res.json().catch(() => ({}));

        if (!isCurrent) return;

        if (!res.ok) {
          setError(data?.error || data?.message || "Failed to load bookings.");
          setBookings([]);
          setPagination({ currentPage: 1, lastPage: 1, total: 0 });
          return;
        }

        setBookings(normalizeBookings(data));
        setPagination(extractPagination(data));
      } catch {
        if (!isCurrent) return;
        setError("Network error. Please try again.");
        setBookings([]);
        setPagination({ currentPage: 1, lastPage: 1, total: 0 });
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    fetchBookings();

    return () => {
      isCurrent = false;
    };
  }, [activeFilter, page]);

  const titleFilter = useMemo(
    () => FILTERS.find((filter) => filter.key === activeFilter)?.label || "Today",
    [activeFilter],
  );

  return (
    <div className="min-w-0 w-full">
      <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">Bookings</h1>
          <p className="mt-2 break-words text-sm text-zinc-500">
            View and track all rental bookings by status
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-600">
          {isLoading ? "Loading..." : `${pagination.total.toLocaleString()} records`}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 min-[420px]:flex min-[420px]:flex-wrap">
        {FILTERS.map((filter) => {
          const isActive = activeFilter === filter.key;
          return (
            <button
              key={filter.key}
              type="button"
              onClick={() => {
                setActiveFilter(filter.key);
                setPage(1);
              }}
              className={`min-h-11 rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-wide transition min-[420px]:px-4 ${
                isActive
                  ? "border-red-400 bg-red-400 text-white shadow-sm"
                  : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      <section className="mt-4 rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 bg-gradient-to-r from-zinc-50 to-white px-4 py-4 sm:px-8">
          <h2 className="text-sm font-semibold text-zinc-900">{titleFilter} Bookings</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            {isLoading
              ? "Loading booking records..."
              : error
                ? "Could not load bookings"
                : `${rangeLabel(page, bookings.length, pagination.total)}`}
          </p>
        </div>

        <div className="p-4 sm:p-8">
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2].map((key) => (
                <div
                  key={key}
                  className="h-56 animate-pulse rounded-xl border border-zinc-200 bg-zinc-100"
                />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : bookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 px-4 py-10 text-center sm:px-6 sm:py-14">
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
                  <path d="M8 3v4M16 3v4M4 10h16" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="mt-3 text-sm font-medium text-zinc-700">No Bookings Found</p>
              <p className="mt-1 max-w-sm text-sm text-zinc-500">
                Try changing the filter to view bookings in other statuses.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {bookings.map((booking) => (
                <BookingCard
                  key={booking.id || `${booking.startDate}-${booking.endDate}`}
                  booking={booking}
                  hideTransactionLink={isDriverView}
                />
              ))}
            </div>
          )}
        </div>

        {!isLoading && !error ? (
          <div className="flex flex-col items-stretch justify-between gap-3 border-t border-zinc-100 px-4 py-4 sm:flex-row sm:items-center sm:px-6">
            <p className="text-xs text-zinc-500">
              Page {page} of {pagination.lastPage}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="min-h-11 rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= pagination.lastPage}
                onClick={() => setPage((current) => current + 1)}
                className="min-h-11 rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
