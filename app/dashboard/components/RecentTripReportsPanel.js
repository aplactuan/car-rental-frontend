"use client";

import { useState } from "react";
import Link from "next/link";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function relationshipId(relationships, keys) {
  for (const key of keys) {
    const rel = relationships?.[key]?.data;
    if (rel?.id) return String(rel.id).trim();
    if (Array.isArray(rel) && rel[0]?.id) return String(rel[0].id).trim();
  }
  return "";
}

function normalizeTripReport(raw) {
  const source = raw?.attributes ?? raw ?? {};
  const relationships = raw?.relationships ?? {};
  const id = String(source.id ?? raw?.id ?? "").trim();
  const purchaseOrderId = String(
    source.purchaseOrderId ??
      source.purchase_order_id ??
      relationshipId(relationships, [
        "purchaseOrder",
        "purchase_order",
        "purchaseOrders",
        "purchase_orders",
      ]) ??
      "",
  ).trim();
  const customerId = String(
    source.customerId ??
      source.customer_id ??
      relationshipId(relationships, ["customer", "customers"]) ??
      "",
  ).trim();

  return {
    id,
    tripReportNo: String(
      source.tripReportNo ?? source.trip_report_no ?? "—",
    ).trim(),
    driver: String(source.driver ?? "—").trim() || "—",
    reportDate: String(source.reportDate ?? source.report_date ?? "").trim(),
    tripStart: String(source.tripStart ?? source.trip_start ?? "").trim(),
    tripEnd: String(source.tripEnd ?? source.trip_end ?? "").trim(),
    purchaseOrderId,
    customerId,
  };
}

function normalizeTripReports(payload) {
  const rawList = Array.isArray(payload?.data)
    ? payload.data
    : asArray(
        payload?.data?.attributes?.tripReports ??
          payload?.data?.attributes?.trip_reports ??
          payload?.data?.tripReports ??
          payload?.tripReports ??
          payload?.data,
      );

  return rawList
    .map(normalizeTripReport)
    .filter((item) => item.id || item.tripReportNo !== "—");
}

function tripReportHref(customerId, purchaseOrderId, tripReportId) {
  if (!customerId || !purchaseOrderId || !tripReportId) return null;
  return `/dashboard/customer/${encodeURIComponent(customerId)}/purchase-order/${encodeURIComponent(purchaseOrderId)}/trip-report/${encodeURIComponent(tripReportId)}`;
}

function EmptyList({ title, description }) {
  return (
    <div className="px-4 py-8 text-center sm:px-6">
      <p className="text-sm font-medium text-zinc-700">{title}</p>
      <p className="mt-1 text-sm text-zinc-500">{description}</p>
    </div>
  );
}

function TripReportList({ reports }) {
  return (
    <ul className="divide-y divide-zinc-100">
      {reports.map((report) => {
        const href = tripReportHref(
          report.customerId,
          report.purchaseOrderId,
          report.id,
        );
        const rowClass =
          "flex flex-col gap-1 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6";
        const title = (
          <p
            className={`truncate text-sm font-medium ${
              href
                ? "text-red-700 underline-offset-2 group-hover:underline"
                : "text-zinc-900"
            }`}
          >
            {report.tripReportNo}
          </p>
        );
        const body = (
          <>
            <div className="min-w-0">
              {title}
              <p className="mt-0.5 text-xs text-zinc-500">
                {report.driver}
                {report.reportDate ? ` · ${report.reportDate}` : ""}
              </p>
            </div>
            <span className="shrink-0 text-xs tabular-nums text-zinc-500">
              {[report.tripStart, report.tripEnd].filter(Boolean).join(" → ") ||
                "—"}
            </span>
          </>
        );

        return (
          <li key={report.id || report.tripReportNo}>
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
  );
}

export default function RecentTripReportsPanel({ reports = [] }) {
  const [searchInput, setSearchInput] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  const handleSubmitSearch = async (event) => {
    event.preventDefault();
    const trimmed = searchInput.trim();
    if (!trimmed) {
      setActiveQuery("");
      setSearchResults(null);
      setSearchError("");
      return;
    }

    setSearchLoading(true);
    setSearchError("");
    setActiveQuery(trimmed);

    try {
      const params = new URLSearchParams({ q: trimmed });
      const res = await fetch(
        `/api/v1/dashboard/trip-reports/search?${params}`,
        {
          headers: { Accept: "application/json" },
          cache: "no-store",
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSearchResults([]);
        setSearchError(
          data?.message ||
            data?.error ||
            data?.errors?.q?.[0] ||
            `Search failed (${res.status}).`,
        );
        return;
      }
      setSearchResults(normalizeTripReports(data));
    } catch {
      setSearchResults([]);
      setSearchError("Could not reach the server.");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setActiveQuery("");
    setSearchResults(null);
    setSearchError("");
  };

  const isSearching = Boolean(activeQuery);
  const displayedReports = isSearching ? (searchResults ?? []) : reports;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-100 px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-zinc-900">
              {isSearching ? "Trip Report Search" : "Recent Trip Reports"}
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              {isSearching
                ? searchLoading
                  ? `Searching for “${activeQuery}”…`
                  : `Up to 20 matches for “${activeQuery}”`
                : "Latest 10 reports by report date"}
            </p>
          </div>
          <Link
            href="/dashboard/add-trip-report"
            className="shrink-0 text-xs font-semibold text-red-700 hover:text-red-800"
          >
            Add Trip Report
          </Link>
        </div>

        <form
          className="mt-3"
          onSubmit={handleSubmitSearch}
          role="search"
          aria-label="Search trip reports"
        >
          <label htmlFor="dashboard-trip-report-search" className="sr-only">
            Search trip reports by number, driver, or destination
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <input
              id="dashboard-trip-report-search"
              type="search"
              placeholder="Trip report no, driver, or destination"
              autoComplete="off"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              className="min-h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 hover:border-zinc-300 focus:border-red-300 focus:ring-2 focus:ring-red-100 sm:min-w-0 sm:flex-1"
            />
            <div className="flex shrink-0 gap-2">
              <button
                type="submit"
                disabled={searchLoading || !searchInput.trim()}
                className="min-h-11 flex-1 rounded-lg bg-red-400 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
              >
                {searchLoading ? "Searching…" : "Search"}
              </button>
              <button
                type="button"
                disabled={
                  searchLoading || (!activeQuery && !searchInput.trim())
                }
                onClick={handleClearSearch}
                className="min-h-11 flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
              >
                Clear
              </button>
            </div>
          </div>
        </form>
      </div>

      {searchError ? (
        <div
          className="mx-4 my-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 sm:mx-6"
          role="alert"
        >
          {searchError}
        </div>
      ) : null}

      {searchLoading ? (
        <div className="px-4 py-8 text-center text-sm text-zinc-500 sm:px-6">
          Searching trip reports…
        </div>
      ) : displayedReports.length === 0 ? (
        <EmptyList
          title={
            isSearching ? `No matches for “${activeQuery}”` : "No trip reports yet"
          }
          description={
            isSearching
              ? "Try another trip report number, driver name, or destination."
              : "Recent reports will show up here after they are created."
          }
        />
      ) : (
        <TripReportList reports={displayedReports} />
      )}
    </div>
  );
}
