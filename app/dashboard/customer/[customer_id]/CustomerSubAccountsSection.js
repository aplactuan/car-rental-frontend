"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const inputClass =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-red-600 focus:ring-2 focus:ring-red-100";
const labelClass = "block text-xs font-medium text-zinc-700";

function readField(source, keys) {
  if (!source || typeof source !== "object") return "";

  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }

  const normalized = Object.fromEntries(
    Object.entries(source).map(([key, value]) => [
      key.toLowerCase().replace(/[_\s]/g, ""),
      value,
    ]),
  );

  for (const key of keys) {
    const value = normalized[key.toLowerCase().replace(/[_\s]/g, "")];
    if (value !== undefined && value !== null && value !== "") return value;
  }

  return "";
}

function normalizeCustomers(payload) {
  const records = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.customers)
        ? payload.customers
        : [];

  return records.map((record) => {
    const attributes = record?.attributes ?? {};
    const pick = (keys) =>
      readField(attributes, keys) || readField(record, keys);

    return {
      id: pick(["id", "customer_id", "customerId"]),
      name: pick(["name", "customer_name", "customerName"]),
      type: pick(["type", "customer_type", "customerType"]),
      contactPerson: pick(["contact_person", "contactPerson"]),
      contactMobileNumber: pick([
        "contact_mobile_number",
        "contactMobileNumber",
      ]),
      contactEmail: pick(["contact_email", "contactEmail"]),
    };
  });
}

export default function CustomerSubAccountsSection({ customerId }) {
  const [subAccounts, setSubAccounts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("business");
  const [contactPerson, setContactPerson] = useState("");
  const [contactMobileNumber, setContactMobileNumber] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitError, setSubmitError] = useState("");

  const loadSubAccounts = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/v1/customers/${encodeURIComponent(customerId)}/children`,
        { credentials: "include" },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data?.error || data?.message || "Failed to load sub-accounts.");
        setSubAccounts([]);
        return;
      }

      setSubAccounts(normalizeCustomers(data));
    } catch {
      setError("Network error while loading sub-accounts.");
      setSubAccounts([]);
    } finally {
      setIsLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    loadSubAccounts();
  }, [loadSubAccounts]);

  function resetForm() {
    setName("");
    setType("business");
    setContactPerson("");
    setContactMobileNumber("");
    setContactEmail("");
    setSubmitError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/v1/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: name.trim(),
          type,
          parent_id: customerId,
          contact_person: contactPerson.trim() || null,
          contact_mobile_number: contactMobileNumber.trim() || null,
          contact_email: contactEmail.trim() || null,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setSubmitError(
          data?.error || data?.message || "Failed to add sub-account.",
        );
        return;
      }

      resetForm();
      setShowForm(false);
      await loadSubAccounts();
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
            Customer Sub-Accounts
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Accounts linked directly to this customer.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetForm();
            setShowForm((current) => !current);
          }}
          className="w-full rounded-lg bg-red-400 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 sm:w-auto"
        >
          {showForm ? "Cancel" : "Add Sub-Account"}
        </button>
      </div>

      {showForm ? (
        <form
          onSubmit={handleSubmit}
          className="mt-5 grid gap-4 rounded-xl border border-red-100 bg-red-50/50 p-4 sm:grid-cols-2"
        >
          <div className="sm:col-span-2">
            <label htmlFor="sub-account-name" className={labelClass}>
              Name
            </label>
            <input
              id="sub-account-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={inputClass}
              placeholder="Sub-account or branch name"
              required
            />
          </div>
          <div>
            <label htmlFor="sub-account-type" className={labelClass}>
              Type
            </label>
            <select
              id="sub-account-type"
              value={type}
              onChange={(event) => setType(event.target.value)}
              className={inputClass}
              required
            >
              <option value="business">Business</option>
              <option value="personal">Personal</option>
            </select>
          </div>
          <div>
            <label htmlFor="sub-account-contact-person" className={labelClass}>
              Contact person
            </label>
            <input
              id="sub-account-contact-person"
              value={contactPerson}
              onChange={(event) => setContactPerson(event.target.value)}
              className={inputClass}
              placeholder="Primary contact name"
            />
          </div>
          <div>
            <label htmlFor="sub-account-mobile" className={labelClass}>
              Contact mobile number
            </label>
            <input
              id="sub-account-mobile"
              type="tel"
              value={contactMobileNumber}
              onChange={(event) => setContactMobileNumber(event.target.value)}
              className={inputClass}
              placeholder="+639171234567"
            />
          </div>
          <div>
            <label htmlFor="sub-account-email" className={labelClass}>
              Contact email
            </label>
            <input
              id="sub-account-email"
              type="email"
              value={contactEmail}
              onChange={(event) => setContactEmail(event.target.value)}
              className={inputClass}
              placeholder="contact@example.com"
            />
          </div>
          {submitError ? (
            <p className="text-sm text-red-600 sm:col-span-2">{submitError}</p>
          ) : null}
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-red-400 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50 sm:w-auto"
            >
              {isSubmitting ? "Saving…" : "Save Sub-Account"}
            </button>
          </div>
        </form>
      ) : null}

      <div className="mt-5">
        {isLoading ? (
          <p className="text-sm text-zinc-500">Loading sub-accounts…</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : subAccounts.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-center text-sm text-zinc-500">
            No sub-accounts found.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {subAccounts.map((account) => (
              <article
                key={account.id || account.name}
                className="rounded-lg border border-zinc-200 bg-zinc-50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-zinc-900">
                      {account.name || "Unnamed sub-account"}
                    </h3>
                    <p className="mt-1 text-xs capitalize text-zinc-500">
                      {account.type || "Unknown type"}
                    </p>
                  </div>
                  {account.id ? (
                    <Link
                      href={`/dashboard/customer/${encodeURIComponent(account.id)}`}
                      className="shrink-0 text-sm font-medium text-red-700 hover:text-red-800"
                    >
                      View
                    </Link>
                  ) : null}
                </div>
                <dl className="mt-3 space-y-1 text-sm text-zinc-600">
                  {account.contactPerson ? (
                    <div>
                      <dt className="inline font-medium text-zinc-700">Contact: </dt>
                      <dd className="inline">{account.contactPerson}</dd>
                    </div>
                  ) : null}
                  {account.contactMobileNumber ? (
                    <div>
                      <dt className="sr-only">Mobile</dt>
                      <dd>{account.contactMobileNumber}</dd>
                    </div>
                  ) : null}
                  {account.contactEmail ? (
                    <div>
                      <dt className="sr-only">Email</dt>
                      <dd className="truncate">{account.contactEmail}</dd>
                    </div>
                  ) : null}
                </dl>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
