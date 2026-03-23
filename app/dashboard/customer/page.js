"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const inputClass =
  "mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100";
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

  return (
    <div className="w-full pr-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Browse all customers from the API customer list endpoint
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowForm(true);
            resetForm();
          }}
          className="inline-flex items-center gap-2 rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
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
          Add Customer
        </button>
      </div>

      {showForm && (
        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-900">Add new customer</h2>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label htmlFor="customer-name" className={labelClass}>
                Name
              </label>
              <input
                id="customer-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
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
            {submitError && <p className="text-sm text-red-600">{submitError}</p>}
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:opacity-50"
              >
                {isSubmitting ? "Saving..." : "Save customer"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                disabled={isSubmitting}
                className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="mt-6 rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="px-6 py-5">
          <div className="text-sm font-semibold text-zinc-900">Customer List</div>
          <div className="mt-1 text-xs text-zinc-500">
            {isLoading ? "Loading..." : `${customers.length} customers found`}
          </div>
        </div>

        {isLoading ? (
          <div className="px-6 pb-6 text-sm text-zinc-500">Loading customers...</div>
        ) : error ? (
          <div className="px-6 pb-6 text-sm text-red-600">{error}</div>
        ) : customers.length === 0 ? (
          <div className="flex items-center justify-center px-6 pb-10">
            <p className="text-sm text-zinc-500">
              No customers were returned by the API.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100 px-6 pb-2">
            {customers.map((customer) => (
              <li
                key={customer.id ?? customer.name}
                className="flex flex-wrap items-center justify-between gap-4 py-4"
              >
                <div>
                  <p className="font-medium text-zinc-900">
                    {customer.name || "Unnamed customer"}
                  </p>
                  <p className="text-sm text-zinc-500">
                    {customer.type || "Unknown type"}
                    {customer.email ? ` | ${customer.email}` : ""}
                  </p>
                  {(customer.phone_number || customer.address) && (
                    <p className="mt-1 text-sm text-zinc-600">
                      {[customer.phone_number, customer.address]
                        .filter(Boolean)
                        .join(" | ")}
                    </p>
                  )}
                </div>

                {customer.id ? (
                  <Link
                    href={`/dashboard/customer/${customer.id}`}
                    className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                  >
                    View customer
                  </Link>
                ) : (
                  <span className="text-sm text-zinc-400">No ID available</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
