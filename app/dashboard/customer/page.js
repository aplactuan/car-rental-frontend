"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const inputClass =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100";
const labelClass = "block text-xs font-medium text-zinc-700";

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

function normalizeCustomers(payload) {
  const rawCustomers = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : payload?.data && typeof payload.data === "object"
        ? [payload.data]
        : Array.isArray(payload?.customers)
          ? payload.customers
          : payload?.customer && typeof payload.customer === "object"
            ? [payload.customer]
            : payload && typeof payload === "object"
              ? [payload]
              : [];

  return rawCustomers.map((customer) => {
    const attrs = customer?.attributes ?? {};
    const pick = (keys) => {
      const fromAttrs = readField(attrs, keys);
      if (fromAttrs !== "") return fromAttrs;
      return readField(customer, keys);
    };

    return {
      id: pick(["id", "customer_id", "customerId"]),
      name: pick(["name", "customer_name", "customerName"]),
      type: pick(["type", "customer_type", "customerType"]),
      email: pick(["email", "email_address", "emailAddress"]),
      phone_number: pick(["phone_number", "phoneNumber"]),
      address: pick(["address", "full_address", "fullAddress"]),
    };
  });
}

function getInitials(name) {
  const parts = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

function getTypeMeta(type) {
  const normalized = String(type ?? "").toLowerCase();
  if (normalized === "business") {
    return {
      label: "Business",
      className: "bg-blue-100 text-blue-800 ring-blue-200/80",
    };
  }
  if (normalized === "personal") {
    return {
      label: "Personal",
      className: "bg-teal-100 text-teal-800 ring-teal-200/80",
    };
  }
  return {
    label: type || "Unknown",
    className: "bg-zinc-100 text-zinc-700 ring-zinc-200/80",
  };
}

function CustomerCard({ customer }) {
  const displayName = customer.name || "Unnamed customer";
  const typeMeta = getTypeMeta(customer.type);
  const initials = getInitials(displayName);

  return (
    <article className="group flex flex-col rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-teal-200 hover:shadow-md">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-700 to-teal-600 text-sm font-bold text-white shadow-sm ring-2 ring-white">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-semibold text-zinc-900">{displayName}</h3>
            <span
              className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ${typeMeta.className}`}
            >
              {typeMeta.label}
            </span>
          </div>
          <ul className="mt-3 space-y-1.5 text-sm text-zinc-600">
            {customer.email ? (
              <li className="flex items-center gap-2 truncate">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  className="h-4 w-4 shrink-0 text-zinc-400"
                  aria-hidden
                >
                  <path
                    d="M4 6h16v12H4V6Z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path d="m4 7 8 6 8-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="truncate">{customer.email}</span>
              </li>
            ) : null}
            {customer.phone_number ? (
              <li className="flex items-center gap-2 truncate">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  className="h-4 w-4 shrink-0 text-zinc-400"
                  aria-hidden
                >
                  <path
                    d="M6.5 4h3l1.5 4-2 1.5a11 11 0 0 0 5 5L15.5 13l4 1.5v3a1.5 1.5 0 0 1-1.5 1.5A14 14 0 0 1 4 6Z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="truncate">{customer.phone_number}</span>
              </li>
            ) : null}
            {customer.address ? (
              <li className="flex items-start gap-2">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400"
                  aria-hidden
                >
                  <path
                    d="M12 21s-6-4.35-6-10a6 6 0 1 1 12 0c0 5.65-6 10-6 10Z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="12" cy="11" r="2" />
                </svg>
                <span className="line-clamp-2">{customer.address}</span>
              </li>
            ) : null}
            {!customer.email && !customer.phone_number && !customer.address ? (
              <li className="text-xs text-zinc-400">No contact details on file</li>
            ) : null}
          </ul>
        </div>
      </div>

      <div className="mt-4 border-t border-zinc-100 pt-4">
        {customer.id ? (
          <Link
            href={`/dashboard/customer/${customer.id}`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition group-hover:bg-teal-800"
          >
            View customer
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-4 w-4"
              aria-hidden
            >
              <path
                d="M5 12h14M13 6l6 6-6 6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        ) : (
          <span className="block text-center text-sm text-zinc-400">
            No ID available
          </span>
        )}
      </div>
    </article>
  );
}

export default function CustomerDashboardPage() {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("personal");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  function resetForm() {
    setName("");
    setType("personal");
    setSubmitError("");
  }

  async function fetchCustomers() {
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/v1/customers", {
        method: "GET",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error || data?.message || "Failed to load customers.");
        setCustomers([]);
        return;
      }

      setCustomers(normalizeCustomers(data));
    } catch {
      setError("Network error. Please try again.");
      setCustomers([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchCustomers();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError("");
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/v1/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: name.trim(),
          type,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setSubmitError(data?.error || data?.message || "Failed to add customer.");
        return;
      }

      const [createdCustomer] = normalizeCustomers(data);

      if (createdCustomer) {
        setError("");
        setCustomers((current) => [...current, createdCustomer]);
      }

      setShowForm(false);
      resetForm();
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const personalCount = customers.filter(
    (c) => String(c.type ?? "").toLowerCase() === "personal",
  ).length;
  const businessCount = customers.filter(
    (c) => String(c.type ?? "").toLowerCase() === "business",
  ).length;

  return (
    <div className="w-full pr-8">
      <header className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm ring-1 ring-zinc-100">
        <div className="relative bg-gradient-to-br from-blue-800 via-teal-700 to-zinc-900 px-6 py-6 text-white sm:px-8">
          <div
            className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10 blur-2xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-14 left-1/4 h-28 w-28 rounded-full bg-teal-400/20 blur-2xl"
            aria-hidden
          />

          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    className="h-6 w-6"
                    aria-hidden
                  >
                    <circle cx="12" cy="8" r="3.5" />
                    <path
                      d="M5 20v-1.2a5 5 0 0 1 14 0V20"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    Customers
                  </h1>
                  <p className="mt-1 text-sm text-blue-50/90">
                    Manage personal and business accounts
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowForm(true);
                resetForm();
              }}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-blue-900 shadow-sm transition hover:bg-blue-50"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
              </svg>
              Add customer
            </button>
          </div>

          <div className="relative mt-5 flex flex-wrap gap-2">
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm">
              {isLoading ? "Loading…" : `${customers.length} total`}
            </span>
            {!isLoading && customers.length > 0 ? (
              <>
                <span className="rounded-full bg-teal-500/25 px-3 py-1 text-xs font-medium text-teal-50 ring-1 ring-teal-300/30">
                  {personalCount} personal
                </span>
                <span className="rounded-full bg-blue-500/25 px-3 py-1 text-xs font-medium text-blue-50 ring-1 ring-blue-300/30">
                  {businessCount} business
                </span>
              </>
            ) : null}
          </div>
        </div>
      </header>

      {showForm && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-teal-200/80 bg-gradient-to-br from-teal-50/80 to-white p-6 shadow-sm ring-1 ring-teal-100">
          <h2 className="text-base font-semibold text-zinc-900">Add new customer</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Create a personal or business customer profile.
          </p>
          <form onSubmit={handleSubmit} className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="customer-name" className={labelClass}>
                Name
              </label>
              <input
                id="customer-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                placeholder="Customer or company name"
                required
              />
            </div>
            <div>
              <label htmlFor="customer-type" className={labelClass}>
                Type
              </label>
              <select
                id="customer-type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className={inputClass}
                required
              >
                <option value="personal">Personal</option>
                <option value="business">Business</option>
              </select>
            </div>
            {submitError ? (
              <p className="text-sm text-red-600 sm:col-span-2">{submitError}</p>
            ) : null}
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:opacity-50"
              >
                {isSubmitting ? "Saving…" : "Save customer"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                disabled={isSubmitting}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <section className="mt-6 overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm ring-1 ring-zinc-100">
        <div className="border-b border-zinc-100 bg-gradient-to-r from-zinc-50 to-white px-6 py-4 sm:px-8">
          <h2 className="text-sm font-semibold text-zinc-900">All customers</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            {isLoading
              ? "Loading customer records…"
              : error
                ? "Could not load customers"
                : customers.length === 0
                  ? "No customers yet"
                  : `${customers.length} customer${customers.length === 1 ? "" : "s"} in your directory`}
          </p>
        </div>

        <div className="p-6 sm:p-8">
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2].map((key) => (
                <div
                  key={key}
                  className="h-44 animate-pulse rounded-xl border border-zinc-200 bg-zinc-100"
                />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 px-6 py-14 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="h-6 w-6"
                  aria-hidden
                >
                  <circle cx="12" cy="8" r="3.5" />
                  <path
                    d="M5 20v-1.2a5 5 0 0 1 14 0V20"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <p className="mt-3 text-sm font-medium text-zinc-700">No customers yet</p>
              <p className="mt-1 max-w-sm text-sm text-zinc-500">
                Add your first customer to start managing transactions and bookings.
              </p>
              <button
                type="button"
                onClick={() => {
                  setShowForm(true);
                  resetForm();
                }}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
                </svg>
                Add customer
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {customers.map((customer) => (
                <CustomerCard
                  key={customer.id ?? customer.name}
                  customer={customer}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
