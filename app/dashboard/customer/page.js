"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
      : Array.isArray(payload?.customers)
        ? payload.customers
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
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

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

  return (
    <div className="w-full pr-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Browse all customers from the API customer list endpoint
          </p>
        </div>
      </div>

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
