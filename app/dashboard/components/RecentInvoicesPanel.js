"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "unpaid", label: "Unpaid" },
  { value: "paid", label: "Paid" },
];

function formatCurrency(amount) {
  const value =
    typeof amount === "number" && Number.isFinite(amount)
      ? amount
      : Number(amount);
  const safe = Number.isFinite(value) ? value : 0;
  return `PHP ${Math.round(safe).toLocaleString("en-US")}`;
}

function formatDashboardDate(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString("en-PH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function invoiceStatusBadgeClass(status) {
  return status === "paid"
    ? "bg-emerald-50 text-emerald-800"
    : "bg-amber-50 text-amber-800";
}

function invoiceHref(customerId, purchaseOrderId, invoiceId) {
  if (!customerId || !purchaseOrderId || !invoiceId) return null;
  return `/dashboard/customer/${encodeURIComponent(customerId)}/purchase-order/${encodeURIComponent(purchaseOrderId)}/invoice/${encodeURIComponent(invoiceId)}`;
}

function EmptyList({ title, description }) {
  return (
    <div className="px-4 py-8 text-center sm:px-6">
      <p className="text-sm font-medium text-zinc-700">{title}</p>
      <p className="mt-1 text-sm text-zinc-500">{description}</p>
    </div>
  );
}

function StatusBadge({ status, className }) {
  const label = status && status !== "—" ? status.replaceAll("_", " ") : "—";
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${className}`}
    >
      {label}
    </span>
  );
}

export default function RecentInvoicesPanel({ invoices = [] }) {
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredInvoices = useMemo(() => {
    if (statusFilter === "all") return invoices;
    return invoices.filter((invoice) => invoice.status === statusFilter);
  }, [invoices, statusFilter]);

  const emptyTitle =
    statusFilter === "all"
      ? "No invoices yet"
      : `No ${statusFilter} invoices`;
  const emptyDescription =
    statusFilter === "all"
      ? "Recent invoices will show up here after they are created."
      : `None of the latest invoices are marked ${statusFilter}.`;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 px-4 py-4 sm:px-6">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-zinc-900">
            Recent Invoices
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Latest 10 purchase-order invoices by billed date
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="recent-invoice-status-filter">
            Filter invoices by status
          </label>
          <select
            id="recent-invoice-status-filter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 shadow-sm outline-none transition hover:border-zinc-300 focus:border-red-300 focus:ring-2 focus:ring-red-100"
          >
            {STATUS_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Link
            href="/dashboard/add-invoice"
            className="text-xs font-semibold text-red-700 hover:text-red-800"
          >
            Add Invoice
          </Link>
        </div>
      </div>

      {invoices.length === 0 ? (
        <EmptyList
          title="No invoices yet"
          description="Recent invoices will show up here after they are created."
        />
      ) : filteredInvoices.length === 0 ? (
        <EmptyList title={emptyTitle} description={emptyDescription} />
      ) : (
        <ul className="divide-y divide-zinc-100">
          {filteredInvoices.map((invoice) => {
            const href = invoiceHref(
              invoice.customerId,
              invoice.purchaseOrderId,
              invoice.id,
            );
            const contextParts = [
              invoice.customerName || null,
              invoice.programName || null,
            ].filter(Boolean);
            const rowClass =
              "flex flex-col gap-1 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6";
            const body = (
              <>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p
                      className={`truncate text-sm font-medium ${
                        href
                          ? "text-red-700 underline-offset-2 group-hover:underline"
                          : "text-zinc-900"
                      }`}
                    >
                      {invoice.invoiceNumber}
                    </p>
                    <StatusBadge
                      status={invoice.status}
                      className={invoiceStatusBadgeClass(invoice.status)}
                    />
                  </div>
                  {contextParts.length > 0 ? (
                    <p className="mt-0.5 truncate text-xs text-zinc-600">
                      {contextParts.join(" · ")}
                    </p>
                  ) : null}
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {invoice.billedAt
                      ? `Billed ${formatDashboardDate(invoice.billedAt)}`
                      : "Billed date unavailable"}
                    {invoice.status === "paid" && invoice.paidAt
                      ? ` · Paid ${formatDashboardDate(invoice.paidAt)}`
                      : ""}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-zinc-900">
                  {formatCurrency(invoice.amount)}
                </span>
              </>
            );

            return (
              <li key={invoice.id || invoice.invoiceNumber}>
                {href ? (
                  <Link
                    href={href}
                    className={`group ${rowClass} transition hover:bg-zinc-50`}
                  >
                    {body}
                  </Link>
                ) : (
                  <div className={rowClass}>{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
