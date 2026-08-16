"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const inputClass =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-red-600 focus:ring-2 focus:ring-red-100";
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
      contact_person: pick(["contact_person", "contactPerson"]),
      contact_mobile_number: pick([
        "contact_mobile_number",
        "contactMobileNumber",
      ]),
      contact_email: pick(["contact_email", "contactEmail"]),
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
      className: "bg-red-100 text-red-800 ring-red-200/80",
    };
  }
  return {
    label: type || "Unknown",
    className: "bg-zinc-100 text-zinc-700 ring-zinc-200/80",
  };
}

function CustomerCard({ customer, onEdit }) {
  const displayName = customer.name || "Unnamed customer";
  const typeMeta = getTypeMeta(customer.type);
  const initials = getInitials(displayName);
  const contactPerson = customer.contact_person;
  const contactEmail = customer.contact_email || customer.email;
  const contactPhone =
    customer.contact_mobile_number || customer.phone_number;
  const hasContactDetails =
    contactPerson || contactEmail || contactPhone || customer.address;

  return (
    <article className="group flex min-w-0 flex-col rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-red-200 hover:shadow-md sm:p-5">
      <div className="flex min-w-0 items-start gap-3 sm:gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-400 to-red-600 text-sm font-bold text-white shadow-sm ring-2 ring-white sm:h-12 sm:w-12">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="min-w-0 break-words font-semibold text-zinc-900">{displayName}</h3>
            <span
              className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ${typeMeta.className}`}
            >
              {typeMeta.label}
            </span>
          </div>
          <ul className="mt-3 space-y-1.5 text-sm text-zinc-600">
            {contactPerson ? (
              <li className="flex min-w-0 items-start gap-2">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  className="h-4 w-4 shrink-0 text-zinc-400"
                  aria-hidden
                >
                  <circle cx="12" cy="8" r="3.5" />
                  <path
                    d="M5 20v-1.2a5 5 0 0 1 14 0V20"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="min-w-0 break-words">{contactPerson}</span>
              </li>
            ) : null}
            {contactEmail ? (
              <li className="flex min-w-0 items-start gap-2">
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
                <span className="min-w-0 break-all">{contactEmail}</span>
              </li>
            ) : null}
            {contactPhone ? (
              <li className="flex min-w-0 items-start gap-2">
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
                <span className="min-w-0 break-all">{contactPhone}</span>
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
                <span className="break-words">{customer.address}</span>
              </li>
            ) : null}
            {!hasContactDetails ? (
              <li className="text-xs text-zinc-400">No contact details on file</li>
            ) : null}
          </ul>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-zinc-100 pt-4">
        {customer.id ? (
          <Link
            href={`/dashboard/customer/${customer.id}`}
            className="inline-flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-lg bg-[#cecece] px-3 py-2 text-center text-sm font-medium text-[#000] transition hover:bg-[#bfbfbf] group-hover:bg-[#bfbfbf]"
          >
            View Customer
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
          <span className="block flex-1 text-center text-sm text-zinc-400">
            No ID available
          </span>
        )}
        {onEdit ? (
          <button
            type="button"
            onClick={() => onEdit(customer)}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
            title="Edit Customer"
            aria-label={`Edit ${displayName}`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              className="h-4 w-4"
              aria-hidden
            >
              <path
                d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ) : null}
      </div>
    </article>
  );
}

export default function CustomerDashboardPage() {
  const [formMode, setFormMode] = useState(null);
  const [editingCustomerId, setEditingCustomerId] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("personal");
  const [contactPerson, setContactPerson] = useState("");
  const [contactMobileNumber, setContactMobileNumber] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  function resetForm() {
    setName("");
    setType("personal");
    setContactPerson("");
    setContactMobileNumber("");
    setContactEmail("");
    setSubmitError("");
    setEditingCustomerId("");
  }

  function openAddForm() {
    resetForm();
    setFormMode("add");
  }

  function openEditForm(customer) {
    setFormMode("edit");
    setEditingCustomerId(customer.id || "");
    setName(customer.name || "");
    setType(String(customer.type || "personal").toLowerCase() || "personal");
    setContactPerson(customer.contact_person || "");
    setContactMobileNumber(customer.contact_mobile_number || "");
    setContactEmail(customer.contact_email || "");
    setSubmitError("");
  }

  function closeForm() {
    setFormMode(null);
    resetForm();
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

    const isEdit = formMode === "edit";

    try {
      if (isEdit && !editingCustomerId) {
        setSubmitError(
          "Unable to update this customer because no customer ID was found.",
        );
        return;
      }

      const payload = {
        name: name.trim(),
        type,
        contact_person: contactPerson.trim() || null,
        contact_mobile_number: contactMobileNumber.trim() || null,
        contact_email: contactEmail.trim() || null,
      };

      const endpoint = isEdit
        ? `/api/v1/customers/${encodeURIComponent(editingCustomerId)}`
        : "/api/v1/customers";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setSubmitError(
          data?.error ||
            data?.message ||
            (isEdit ? "Failed to update customer." : "Failed to add customer."),
        );
        return;
      }

      closeForm();
      await fetchCustomers();
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
    <div className="min-w-0 w-full">
      <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            Customers
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Manage personal and business accounts
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-600">
              {isLoading ? "Loading…" : `${customers.length} total`}
            </span>
            {!isLoading && customers.length > 0 ? (
              <>
                <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
                  {personalCount} personal
                </span>
                <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                  {businessCount} business
                </span>
              </>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          onClick={openAddForm}
          className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-[#cecece] px-4 py-2.5 text-sm font-semibold text-[#000] shadow-sm transition hover:bg-[#bfbfbf] sm:w-auto"
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

      {formMode && (
        <div className="mt-6 min-w-0 overflow-hidden rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-base font-semibold text-zinc-900">
            {formMode === "edit" ? "Edit Customer" : "Add New Customer"}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            {formMode === "edit"
              ? "Update customer profile and contact person details."
              : "Create a personal or business customer profile."}
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
            <div>
              <label htmlFor="contact-person" className={labelClass}>
                Contact person
              </label>
              <input
                id="contact-person"
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                className={inputClass}
                placeholder="Primary contact name"
              />
            </div>
            <div>
              <label htmlFor="contact-mobile-number" className={labelClass}>
                Contact mobile number
              </label>
              <input
                id="contact-mobile-number"
                type="tel"
                value={contactMobileNumber}
                onChange={(e) => setContactMobileNumber(e.target.value)}
                className={inputClass}
                placeholder="+639171234567"
              />
            </div>
            <div>
              <label htmlFor="contact-email" className={labelClass}>
                Contact email
              </label>
              <input
                id="contact-email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className={inputClass}
                placeholder="contact@example.com"
              />
            </div>
            {submitError ? (
              <p className="text-sm text-red-600 sm:col-span-2">{submitError}</p>
            ) : null}
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="min-h-11 flex-1 rounded-lg bg-red-400 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-500 disabled:opacity-50 sm:flex-none"
              >
                {isSubmitting
                  ? "Saving…"
                  : formMode === "edit"
                    ? "Save Changes"
                    : "Save Customer"}
              </button>
              <button
                type="button"
                onClick={closeForm}
                disabled={isSubmitting}
                className="min-h-11 flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50 sm:flex-none"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <section className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 bg-gradient-to-r from-zinc-50 to-white px-4 py-4 sm:px-8">
          <h2 className="text-sm font-semibold text-zinc-900">All Customers</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            {isLoading
              ? "Loading customer records…"
              : error
                ? "Could not load customers"
                : customers.length === 0
                  ? "No Customers Yet"
                  : `${customers.length} customer${customers.length === 1 ? "" : "s"} in your directory`}
          </p>
        </div>

        <div className="p-4 sm:p-8">
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
                  <circle cx="12" cy="8" r="3.5" />
                  <path
                    d="M5 20v-1.2a5 5 0 0 1 14 0V20"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <p className="mt-3 text-sm font-medium text-zinc-700">No Customers Yet</p>
              <p className="mt-1 max-w-sm text-sm text-zinc-500">
                Add your first customer to start managing transactions and bookings.
              </p>
              <button
                type="button"
                onClick={openAddForm}
                className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#cecece] px-4 py-2 text-sm font-semibold text-[#000] transition hover:bg-[#bfbfbf]"
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
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {customers.map((customer) => (
                <CustomerCard
                  key={customer.id ?? customer.name}
                  customer={customer}
                  onEdit={openEditForm}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
