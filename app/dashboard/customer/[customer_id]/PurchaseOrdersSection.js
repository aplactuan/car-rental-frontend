"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const FILTER_ALL = "all";
const FILTER_NONE = "none";

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

function normalizePurchaseOrders(payload) {
  const raw =
    payload?.data ?? payload?.purchase_orders ?? payload?.items ?? payload;
  const list = Array.isArray(raw) ? raw : [];

  return list
    .map((record) => {
      const attrs = record?.attributes ?? {};
      const pick = (keys) =>
        readField(attrs, keys) || readField(record, keys);
      const amountRaw = attrs?.amount ?? record?.amount;
      const amount =
        typeof amountRaw === "number"
          ? amountRaw
          : amountRaw !== undefined && amountRaw !== null && amountRaw !== ""
            ? Number(amountRaw)
            : null;

      const programRelationship =
        record?.relationships?.program?.data ??
        attrs?.relationships?.program?.data ??
        null;
      const programAttrs = programRelationship?.attributes ?? {};

      return {
        id: String(pick(["id", "purchase_order_id", "purchaseOrderId"]) || ""),
        poNumber: String(pick(["po_number", "poNumber"]) || ""),
        date: String(pick(["date"]) || ""),
        amount: Number.isFinite(amount) ? amount : null,
        requestPerson: String(
          pick(["request_person", "requestPerson"]) || "",
        ),
        description: String(pick(["description"]) || ""),
        programId: String(
          pick(["program_id", "programId"]) || programRelationship?.id || "",
        ),
        programName: String(
          readField(programAttrs, ["name", "program_name", "programName"]) ||
            pick(["program_name", "programName"]) ||
            "",
        ),
        status:
          String(pick(["status"]) || "pending").toLowerCase() === "ok"
            ? "ok"
            : "pending",
      };
    })
    .filter((item) => item.id);
}

function formatPhp(amount) {
  if (typeof amount !== "number" || !Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    currencyDisplay: "code",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);

  return parsed.toLocaleDateString("en-PH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function PurchaseOrderStatusBadge({ status }) {
  const isOk = status === "ok";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isOk
          ? "bg-emerald-50 text-emerald-800"
          : "bg-amber-50 text-amber-800"
      }`}
    >
      {isOk ? "OK" : "Pending"}
    </span>
  );
}

function buildPurchaseOrdersUrl(customerId, programFilter) {
  const params = new URLSearchParams({
    customer_id: customerId,
    per_page: "100",
  });

  if (programFilter === FILTER_NONE) {
    params.set("unprogrammed", "1");
  } else if (programFilter !== FILTER_ALL) {
    params.set("program_id", programFilter);
  }

  return `/api/v1/purchase-orders?${params.toString()}`;
}

export default function PurchaseOrdersSection({
  customerId,
  initialPurchaseOrders = [],
  programs = [],
  initialError = "",
}) {
  const [programFilter, setProgramFilter] = useState(FILTER_ALL);
  const [purchaseOrders, setPurchaseOrders] = useState(initialPurchaseOrders);
  const [error, setError] = useState(initialError);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setPurchaseOrders(initialPurchaseOrders);
    setError(initialError);
  }, [initialPurchaseOrders, initialError]);

  const loadPurchaseOrders = useCallback(
    async (filter) => {
      if (!customerId) return;

      setIsLoading(true);
      setError("");

      try {
        const authToken =
          typeof window !== "undefined"
            ? localStorage.getItem("auth_token")
            : null;
        const response = await fetch(
          buildPurchaseOrdersUrl(customerId, filter),
          {
            headers: {
              Accept: "application/json",
              ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
            },
            credentials: "include",
            cache: "no-store",
          },
        );
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          setPurchaseOrders([]);
          setError(
            data?.error ||
              data?.message ||
              "Failed to load purchase orders.",
          );
          return;
        }

        setPurchaseOrders(normalizePurchaseOrders(data));
      } catch {
        setPurchaseOrders([]);
        setError("Could not reach the purchase orders endpoint.");
      } finally {
        setIsLoading(false);
      }
    },
    [customerId],
  );

  const handleFilterChange = (nextFilter) => {
    setProgramFilter(nextFilter);
    void loadPurchaseOrders(nextFilter);
  };

  const showFilter = Boolean(customerId) && !initialError;

  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-zinc-100 px-4 py-5 sm:px-6">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
            Purchase orders
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Purchase orders linked to this customer.
          </p>
        </div>

        <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          {showFilter ? (
            <label className="flex flex-col gap-2 text-sm text-zinc-600 sm:flex-row sm:items-center">
              <span className="whitespace-nowrap font-medium text-zinc-700">
                Program
              </span>
              <select
                value={programFilter}
                onChange={(event) => handleFilterChange(event.target.value)}
                disabled={isLoading}
                className="w-full min-w-0 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 outline-none ring-zinc-300 focus:ring-2 disabled:cursor-not-allowed disabled:bg-zinc-100 sm:min-w-[12rem]"
              >
                <option value={FILTER_ALL}>All</option>
                <option value={FILTER_NONE}>Unprogrammed</option>
                {programs.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.name || program.id}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {!error ? (
            <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
              {isLoading
                ? "Loading…"
                : `${purchaseOrders.length} order${purchaseOrders.length === 1 ? "" : "s"}`}
            </div>
          ) : null}
        </div>
      </div>

      <div className="px-4 py-5 sm:px-6">
        {error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : purchaseOrders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-6 py-10 text-center">
            <p className="text-sm font-medium text-zinc-700">
              {programFilter === FILTER_ALL
                ? "No purchase orders yet"
                : "No matching purchase orders"}
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              {programFilter === FILTER_ALL
                ? "Add the first purchase order for this customer."
                : "Try another program filter."}
            </p>
          </div>
        ) : (
          <div
            className={`overflow-x-auto overscroll-x-contain ${isLoading ? "opacity-60" : ""}`}
            role="region"
            aria-label="Purchase orders table"
            tabIndex={0}
          >
            <table className="min-w-[64rem] text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/60 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                  <th className="pb-3 pr-6">PO number</th>
                  <th className="pb-3 pr-6">Program</th>
                  <th className="pb-3 pr-6">Date</th>
                  <th className="pb-3 pr-6">Amount</th>
                  <th className="pb-3 pr-6">Status</th>
                  <th className="pb-3 pr-6">Request person</th>
                  <th className="pb-3 pr-6">Description</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {purchaseOrders.map((po) => {
                  const programName =
                    po.programName ||
                    programs.find((program) => program.id === po.programId)
                      ?.name ||
                    "";
                  const purchaseOrderHref = `/dashboard/customer/${encodeURIComponent(customerId)}/purchase-order/${encodeURIComponent(po.id)}`;

                  return (
                    <tr key={po.id} className="transition hover:bg-zinc-50/80">
                      <td className="py-3.5 pr-6 font-medium text-zinc-900">
                        {customerId && po.id ? (
                          <Link
                            href={purchaseOrderHref}
                            className="underline-offset-2 transition hover:text-red-700 hover:underline"
                          >
                            {po.poNumber || "View purchase order"}
                          </Link>
                        ) : (
                          po.poNumber || "—"
                        )}
                      </td>
                      <td className="py-3.5 pr-6 text-zinc-700">
                        {programName || "—"}
                      </td>
                      <td className="py-3.5 pr-6 text-zinc-700">
                        {formatDate(po.date)}
                      </td>
                      <td className="py-3.5 pr-6 text-zinc-700">
                        {formatPhp(po.amount)}
                      </td>
                      <td className="py-3.5 pr-6">
                        <PurchaseOrderStatusBadge status={po.status} />
                      </td>
                      <td className="py-3.5 pr-6 text-zinc-700">
                        {po.requestPerson || "—"}
                      </td>
                      <td className="max-w-xs py-3.5 pr-6 text-zinc-700">
                        {po.description || "—"}
                      </td>
                      <td className="py-3.5 text-right">
                        <Link
                          href={purchaseOrderHref}
                          className="text-xs font-medium text-red-700 transition hover:text-red-800"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
