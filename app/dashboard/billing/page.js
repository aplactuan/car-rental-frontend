"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

const BILLS_PER_PAGE = 10;
/** Max per_page supported by the bills API; used when aggregating amounts. */
const BILLS_AGG_PAGE_SIZE = 100;
/**
 * JSON:API compound include: loads each bill's transaction and that transaction's customer
 * into `included`, so customer names resolve for “All customers” without guessing shapes.
 * Falls back safely if the server only honors `transaction` (see normalizeBills).
 */
const BILLS_INCLUDE = "transaction.customer";

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
    };
  });
}

function extractListMeta(payload) {
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

function billsEndpoint(customerId) {
  if (customerId) {
    return `/api/v1/customers/${encodeURIComponent(customerId)}/bills`;
  }
  return "/api/v1/bills";
}

/** String customer name from a nested object if the API nests customer instead of flattening. */
function nameFromNestedCustomer(value) {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "object" && !Array.isArray(value)) {
    const n = readField(value, ["name", "customer_name", "customerName", "label"]);
    if (typeof n === "string" && n.trim()) return n.trim();
  }
  return "";
}

/**
 * Resolve display name from JSON:API `relationships.customer.data` using `included`
 * first, then optional id → name map from the customers list (covers “All customers”).
 */
function resolveCustomerRelation(includedMap, relData, customerLookup) {
  if (!relData || typeof relData !== "object" || Array.isArray(relData)) return "";
  const id = relData.id != null ? String(relData.id) : "";
  const type = String(relData.type || "customers");
  if (!id) return "";

  const inc =
    includedMap.get(`${type}:${id}`) ||
    includedMap.get(`customers:${id}`) ||
    includedMap.get(`customer:${id}`);

  if (inc) {
    const ca = inc.attributes ?? inc;
    const n = readField(ca, ["name", "customer_name", "customerName"]);
    if (typeof n === "string" && n.trim()) return n.trim();
  }

  if (customerLookup && typeof customerLookup === "object") {
    const fromLookup = customerLookup[id];
    if (typeof fromLookup === "string" && fromLookup.trim()) return fromLookup.trim();
  }

  return "";
}

function normalizeBills(payload, customerNameFallback = "", customerLookup = {}) {
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
      if (fromAttrs !== "" && fromAttrs !== undefined) return fromAttrs;
      return readField(item, keys);
    };

    let customerName =
      readField(attrs, ["customer_name", "customerName"]) || "";
    if (!customerName) customerName = nameFromNestedCustomer(attrs.customer);

    const billCustomerId = readField(attrs, ["customer_id", "customerId"]);
    if (!customerName && billCustomerId && customerLookup[String(billCustomerId)]) {
      customerName = customerLookup[String(billCustomerId)];
    }

    if (!customerName) {
      const billCustomerRel = item?.relationships?.customer?.data;
      customerName = resolveCustomerRelation(includedMap, billCustomerRel, customerLookup);
    }

    const rel = item?.relationships?.transaction?.data;
    const relId = rel && typeof rel === "object" && !Array.isArray(rel) ? rel.id : null;
    const relType = rel && typeof rel === "object" && !Array.isArray(rel) ? rel.type : "transactions";
    let transactionName = "";
    let transactionId = relId || pick(["transaction_id", "transactionId"]);

    if (relId) {
      const inc = includedMap.get(`${relType}:${relId}`);
      const tAttrs = inc?.attributes ?? {};
      transactionName = readField(tAttrs, ["name", "title", "label"]) || "";

      if (!customerName) {
        customerName =
          readField(tAttrs, ["customerName", "customer_name"]) || "";
      }
      if (!customerName) customerName = nameFromNestedCustomer(tAttrs.customer);

      const txCustomerId = readField(tAttrs, ["customer_id", "customerId"]);
      if (!customerName && txCustomerId && customerLookup[String(txCustomerId)]) {
        customerName = customerLookup[String(txCustomerId)];
      }

      if (!customerName) {
        const txCustomerRel = inc?.relationships?.customer?.data;
        customerName = resolveCustomerRelation(
          includedMap,
          txCustomerRel,
          customerLookup,
        );
      }
    }

    if (!customerName && customerNameFallback) {
      customerName = customerNameFallback;
    }

    return {
      id: pick(["id"]),
      amount:
        typeof attrs?.amount === "number"
          ? attrs.amount
          : attrs?.amount != null
            ? Number(attrs.amount)
            : null,
      status: String(pick(["status"]) || "").toLowerCase(),
      issuedAt: pick(["issued_at", "issuedAt"]),
      paidAt: pick(["paid_at", "paidAt"]),
      dueAt: pick(["due_at", "dueAt"]),
      transactionId: transactionId ? String(transactionId) : "",
      transactionName: transactionName ? String(transactionName) : "",
      customerName: customerName ? String(customerName) : "",
    };
  });
}

async function fetchBillsPayload(urlBase, baseParams) {
  const run = async (includeValue) => {
    const params = new URLSearchParams(baseParams);
    params.set("include", includeValue);
    const res = await fetch(`${urlBase}?${params}`, { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    return { res, data };
  };

  let { res, data } = await run(BILLS_INCLUDE);
  if (!res.ok) {
    const second = await run("transaction");
    res = second.res;
    data = second.data;
  }
  return { res, data };
}

function sumAmountsFromBillPayload(payload) {
  const raw = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload)
      ? payload
      : [];
  let sum = 0;
  for (const item of raw) {
    const attrs = item?.attributes ?? item;
    const n =
      typeof attrs?.amount === "number"
        ? attrs.amount
        : attrs?.amount != null
          ? Number(attrs.amount)
          : NaN;
    if (Number.isFinite(n)) sum += n;
  }
  return sum;
}

async function fetchTotalAmountForStatus(base, statusFilter) {
  let total = 0;
  let page = 1;

  for (;;) {
    const { res, data } = await fetchBillsPayload(base, {
      per_page: String(BILLS_AGG_PAGE_SIZE),
      page: String(page),
      sort: "-issued_at",
      "filter[status]": statusFilter,
    });
    if (!res.ok) return null;
    total += sumAmountsFromBillPayload(data);
    const meta = extractListMeta(data);
    if (page >= meta.lastPage) break;
    page += 1;
    if (page > 500) break;
  }

  return total;
}

function formatCurrency(amount) {
  if (typeof amount !== "number" || !Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateString) {
  if (!dateString) return "—";
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) return String(dateString);
  return parsed.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusBadgeClass(status) {
  const s = String(status || "").toLowerCase();
  if (s === "draft") return "bg-zinc-100 text-zinc-700 border-zinc-200";
  if (s === "issued") return "bg-blue-100 text-blue-700 border-blue-200";
  if (s === "paid") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (s === "cancelled") return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-zinc-100 text-zinc-700 border-zinc-200";
}

function formatBillRangeLabel(page, rowsOnPage, total) {
  if (total <= 0 || rowsOnPage <= 0) return "";
  const from = (page - 1) * BILLS_PER_PAGE + 1;
  const to = from + rowsOnPage - 1;
  return `Showing ${from.toLocaleString()}–${to.toLocaleString()} of ${total.toLocaleString()}`;
}

export default function BillingReportPage() {
  const [customerId, setCustomerId] = useState("");
  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(true);

  const [bills, setBills] = useState([]);
  const [billsLoading, setBillsLoading] = useState(true);
  const [billsError, setBillsError] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    lastPage: 1,
    total: 0,
  });

  const [unpaidAmountTotal, setUnpaidAmountTotal] = useState(0);
  const [paidAmountTotal, setPaidAmountTotal] = useState(0);
  const [amountsLoading, setAmountsLoading] = useState(true);

  const customerNameFallback = useMemo(() => {
    if (!customerId) return "";
    return customers.find((c) => String(c.id) === String(customerId))?.name || "";
  }, [customerId, customers]);

  const customerLookup = useMemo(() => {
    const map = {};
    for (const c of customers) {
      if (c.id != null && String(c.id) !== "") {
        map[String(c.id)] = c.name || "";
      }
    }
    return map;
  }, [customers]);

  const fetchCustomers = useCallback(async () => {
    setCustomersLoading(true);
    try {
      const res = await fetch("/api/v1/customers?per_page=100", {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCustomers([]);
        return;
      }
      setCustomers(normalizeCustomers(data));
    } catch {
      setCustomers([]);
    } finally {
      setCustomersLoading(false);
    }
  }, []);

  const fetchAmountTotals = useCallback(async () => {
    setAmountsLoading(true);
    const base = billsEndpoint(customerId);

    try {
      const [unpaidSum, paidSum] = await Promise.all([
        fetchTotalAmountForStatus(base, "draft,issued"),
        fetchTotalAmountForStatus(base, "paid"),
      ]);

      setUnpaidAmountTotal(unpaidSum == null ? 0 : unpaidSum);
      setPaidAmountTotal(paidSum == null ? 0 : paidSum);
    } catch {
      setUnpaidAmountTotal(0);
      setPaidAmountTotal(0);
    } finally {
      setAmountsLoading(false);
    }
  }, [customerId]);

  const fetchBills = useCallback(async () => {
    setBillsLoading(true);
    setBillsError("");
    try {
      const base = billsEndpoint(customerId);
      const { res, data } = await fetchBillsPayload(base, {
        per_page: String(BILLS_PER_PAGE),
        page: String(page),
        sort: "-issued_at",
      });

      if (!res.ok) {
        setBillsError(data?.error || data?.message || "Failed to load bills.");
        setBills([]);
        return;
      }
      setBills(normalizeBills(data, customerNameFallback, customerLookup));
      setPagination(extractListMeta(data));
    } catch {
      setBillsError("Network error. Please try again.");
      setBills([]);
    } finally {
      setBillsLoading(false);
    }
  }, [customerId, page, customerNameFallback, customerLookup]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    fetchAmountTotals();
  }, [fetchAmountTotals]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  return (
    <div className="w-full pr-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing report</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Paginated bills (all statuses). Summary cards show unpaid vs paid totals only.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 text-left shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Unpaid billing
          </div>
          <div className="mt-2 text-2xl font-bold text-zinc-900">
            {amountsLoading ? "…" : formatCurrency(unpaidAmountTotal)}
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Sum of amounts for draft and issued bills (not yet paid).
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5 text-left shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Paid billing
          </div>
          <div className="mt-2 text-2xl font-bold text-zinc-900">
            {amountsLoading ? "…" : formatCurrency(paidAmountTotal)}
          </div>
          <p className="mt-1 text-xs text-zinc-500">Sum of amounts for bills marked as paid.</p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <label className={labelClass} htmlFor="billing-customer">
          Filter by customer
        </label>
        <select
          id="billing-customer"
          className={inputClass}
          value={customerId}
          disabled={customersLoading}
          onChange={(e) => {
            setPage(1);
            setCustomerId(e.target.value);
          }}
        >
          <option value="">All customers</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name || c.id}
            </option>
          ))}
        </select>
        <p className="mt-2 text-xs text-zinc-500">
          Uses <code className="rounded bg-zinc-100 px-1">GET /api/v1/bills</code> for all customers,
          or{" "}
          <code className="rounded bg-zinc-100 px-1">
            GET /api/v1/customers/:customer_id/bills
          </code>{" "}
          when a customer is selected (per your API collection).
        </p>
      </div>

      <div className="mt-6 rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-6 py-4">
          <div className="text-sm font-semibold text-zinc-900">All bills</div>
          <div className="mt-1 text-xs text-zinc-500">
            All statuses (draft, issued, paid, cancelled). Sorted by issue date (newest first).{" "}
            {pagination.total > 0
              ? `${pagination.total.toLocaleString()} record${pagination.total === 1 ? "" : "s"}`
              : billsLoading
                ? "Loading…"
                : "No records"}
          </div>
        </div>

        {billsError && (
          <div className="px-6 py-3 text-sm text-red-600">{billsError}</div>
        )}

        <div className="overflow-x-auto px-2 pb-2">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3 font-medium">Bill</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Issued</th>
                <th className="px-4 py-3 font-medium">Paid</th>
                <th className="px-4 py-3 font-medium">Transaction</th>
              </tr>
            </thead>
            <tbody>
              {billsLoading && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-zinc-500">
                    Loading bills…
                  </td>
                </tr>
              )}
              {!billsLoading && bills.length === 0 && !billsError && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-zinc-500">
                    No bills found.
                  </td>
                </tr>
              )}
              {!billsLoading &&
                bills.map((row) => (
                  <tr key={row.id} className="border-b border-zinc-50 last:border-0">
                    <td className="max-w-[10rem] break-all px-4 py-3 font-mono text-xs text-zinc-700">
                      {row.id ? String(row.id) : "—"}
                    </td>
                    <td className="max-w-[12rem] px-4 py-3 text-zinc-800">
                      {row.customerName ? (
                        <span className="line-clamp-2" title={row.customerName}>
                          {row.customerName}
                        </span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${statusBadgeClass(row.status)}`}
                      >
                        {row.status || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-800">{formatCurrency(row.amount)}</td>
                    <td className="px-4 py-3 text-zinc-600">{formatDate(row.issuedAt)}</td>
                    <td className="px-4 py-3 text-zinc-600">{formatDate(row.paidAt)}</td>
                    <td className="px-4 py-3">
                      {row.transactionId ? (
                        <Link
                          href={`/dashboard/transactions/${encodeURIComponent(row.transactionId)}`}
                          className="text-teal-700 underline-offset-2 hover:underline"
                        >
                          {row.transactionName || `Transaction ${String(row.transactionId).slice(0, 8)}…`}
                        </Link>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {!billsLoading && pagination.lastPage > 1 && (
          <div className="flex flex-col items-stretch justify-between gap-3 border-t border-zinc-100 px-6 py-4 sm:flex-row sm:items-center">
            <p className="text-xs text-zinc-500">
              {formatBillRangeLabel(page, bills.length, pagination.total)}
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={page <= 1 || billsLoading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-xs text-zinc-600">
                Page {page} of {pagination.lastPage}
              </span>
              <button
                type="button"
                disabled={page >= pagination.lastPage || billsLoading}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
