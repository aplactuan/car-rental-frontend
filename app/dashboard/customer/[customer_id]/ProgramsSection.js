"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import ProgramActions from "./ProgramActions";
import PaginationBar from "../../components/PaginationBar";
import { LIST_PAGE_SIZE, extractListMeta } from "../../lib/listMeta";

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

function readNumber(source, keys) {
  if (!source || typeof source !== "object") return null;

  const tryValue = (value) => {
    if (value === undefined || value === null || value === "") return null;
    const number = typeof value === "number" ? value : Number(value);
    return Number.isFinite(number) ? number : null;
  };

  for (const key of keys) {
    const number = tryValue(source[key]);
    if (number !== null) return number;
  }

  return null;
}

function normalizePrograms(payload) {
  const raw = payload?.data ?? payload?.programs ?? payload?.items ?? payload;
  const list = Array.isArray(raw) ? raw : [];

  const programs = list
    .map((record) => {
      const attrs = record?.attributes ?? {};
      const pick = (keys) =>
        readField(attrs, keys) || readField(record, keys);
      const pickNumber = (keys) => {
        const fromAttrs = readNumber(attrs, keys);
        if (fromAttrs !== null) return fromAttrs;
        return readNumber(record, keys);
      };

      return {
        id: String(pick(["id", "program_id", "programId"]) || ""),
        name: String(pick(["name"]) || ""),
        description: String(pick(["description"]) || ""),
        createdAt: String(pick(["created_at", "createdAt"]) || ""),
        purchaseOrderCount:
          pickNumber(["purchase_order_count", "purchaseOrderCount"]) ?? 0,
        purchaseOrderTotal:
          pickNumber(["purchase_order_total", "purchaseOrderTotal"]) ?? 0,
      };
    })
    .filter((item) => item.id);

  return {
    programs,
    pagination: extractListMeta(payload),
  };
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

function SectionEmptyState({ title, description }) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-10 text-center sm:px-6">
      <p className="text-sm font-medium text-zinc-700">{title}</p>
      <p className="mt-1 text-sm text-zinc-500">{description}</p>
    </div>
  );
}

export default function ProgramsSection({
  customerId,
  initialPrograms = [],
  initialPagination = { currentPage: 1, lastPage: 1, total: 0 },
  initialError = "",
  unprogrammedPurchaseOrderCount = 0,
  unprogrammedPurchaseOrderTotal = 0,
}) {
  const [page, setPage] = useState(initialPagination.currentPage || 1);
  const [programs, setPrograms] = useState(initialPrograms);
  const [pagination, setPagination] = useState(initialPagination);
  const [error, setError] = useState(initialError);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setPrograms(initialPrograms);
    setPagination(initialPagination);
    setError(initialError);
    setPage(initialPagination.currentPage || 1);
  }, [initialPrograms, initialPagination, initialError]);

  const loadPrograms = useCallback(
    async (nextPage) => {
      if (!customerId) return;

      setIsLoading(true);
      setError("");

      try {
        const authToken =
          typeof window !== "undefined"
            ? localStorage.getItem("auth_token")
            : null;
        const params = new URLSearchParams({
          customer_id: customerId,
          per_page: String(LIST_PAGE_SIZE),
          page: String(nextPage),
        });
        const response = await fetch(`/api/v1/programs?${params.toString()}`, {
          headers: {
            Accept: "application/json",
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          credentials: "include",
          cache: "no-store",
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          setPrograms([]);
          setPagination({ currentPage: 1, lastPage: 1, total: 0 });
          setError(
            data?.error || data?.message || "Failed to load programs.",
          );
          return;
        }

        const normalized = normalizePrograms(data);
        setPrograms(normalized.programs);
        setPagination(normalized.pagination);
      } catch {
        setPrograms([]);
        setPagination({ currentPage: 1, lastPage: 1, total: 0 });
        setError("Could not reach the programs endpoint.");
      } finally {
        setIsLoading(false);
      }
    },
    [customerId],
  );

  const handlePageChange = (nextPage) => {
    setPage(nextPage);
    void loadPrograms(nextPage);
  };

  const total = pagination.total || programs.length;

  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-zinc-100 px-4 py-5 sm:px-6">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
            Programs
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Programs linked to this customer.
          </p>
        </div>
        {!error && total > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
              {isLoading
                ? "Loading…"
                : `${total.toLocaleString()} program${total === 1 ? "" : "s"}`}
            </div>
            {unprogrammedPurchaseOrderCount > 0 ? (
              <div className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
                {unprogrammedPurchaseOrderCount.toLocaleString()} unprogrammed
                · {formatPhp(unprogrammedPurchaseOrderTotal)}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="px-4 py-5 sm:px-6">
        {error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : programs.length === 0 ? (
          <SectionEmptyState
            title="No Programs Yet"
            description="Add the first program for this customer."
          />
        ) : (
          <>
            <div
              className={`overflow-x-auto overscroll-x-contain ${isLoading ? "opacity-60" : ""}`}
              role="region"
              aria-label="Customer Programs Table"
              tabIndex={0}
            >
              <table className="min-w-[44rem] text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                    <th className="pb-3 pr-6">Name</th>
                    <th className="pb-3 pr-6">Description</th>
                    <th className="pb-3 pr-6 text-right">Purchase Orders</th>
                    <th className="pb-3 pr-6 text-right">PO Total</th>
                    <th className="pb-3 pr-6">Created At</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {programs.map((program) => (
                    <tr
                      key={program.id}
                      className="transition hover:bg-zinc-50/80"
                    >
                      <td className="py-3.5 pr-6 font-medium text-zinc-900">
                        {customerId && program.id ? (
                          <Link
                            href={`/dashboard/customer/${encodeURIComponent(customerId)}/program/${encodeURIComponent(program.id)}`}
                            className="underline-offset-2 transition hover:text-red-700 hover:underline"
                          >
                            {program.name || "View Program"}
                          </Link>
                        ) : (
                          program.name || "—"
                        )}
                      </td>
                      <td className="max-w-md py-3.5 pr-6 text-zinc-700">
                        {program.description || "—"}
                      </td>
                      <td className="py-3.5 pr-6 text-right tabular-nums text-zinc-700">
                        {program.purchaseOrderCount.toLocaleString()}
                      </td>
                      <td className="py-3.5 pr-6 text-right tabular-nums text-zinc-700">
                        {formatPhp(program.purchaseOrderTotal)}
                      </td>
                      <td className="py-3.5 pr-6 text-zinc-700">
                        {formatDate(program.createdAt)}
                      </td>
                      <td className="py-3.5 text-right">
                        <ProgramActions
                          customerId={customerId}
                          program={program}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationBar
              page={page}
              lastPage={pagination.lastPage}
              total={pagination.total}
              rowsOnPage={programs.length}
              isLoading={isLoading}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </div>
    </section>
  );
}
