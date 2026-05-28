"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";

const getBearerHeaders = () => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const formatCurrency = (amount) => {
  if (typeof amount !== "number" || !Number.isFinite(amount)) return "—";
  return `PHP ${Math.round(amount).toLocaleString("en-US")}`;
};

const formatDate = (dateString) => {
  if (!dateString) return "—";
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) return String(dateString);
  return parsed.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const STATUS_STYLES = {
  draft: "bg-zinc-100 text-zinc-700 border-zinc-300",
  issued: "bg-blue-100 text-blue-700 border-blue-300",
  paid: "bg-emerald-100 text-emerald-700 border-emerald-300",
  cancelled: "bg-amber-100 text-amber-700 border-amber-300",
};

export default function InvoicePrintPage() {
  const params = useParams();
  const transactionId = params?.transaction_id;

  const [invoice, setInvoice] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!transactionId) return;

    const fetchInvoice = async () => {
      setIsLoading(true);
      setError("");
      try {
        const res = await fetch(
          `/api/v1/transactions/${transactionId}/bill/invoice`,
          {
            headers: getBearerHeaders(),
            credentials: "include",
            cache: "no-store",
          },
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data?.error ?? data?.message ?? "Failed to load invoice.");
          return;
        }
        setInvoice(data);
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvoice();
  }, [transactionId]);

  const status = String(invoice?.status ?? "").toLowerCase();
  const statusStyle = STATUS_STYLES[status] ?? STATUS_STYLES.draft;
  const bookings = Array.isArray(invoice?.bookings) ? invoice.bookings : [];
  const bookingTotal = bookings.reduce((sum, b) => {
    const n = Number(b?.price ?? 0);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);

  return (
    <div className="min-h-screen bg-zinc-100 print:bg-white">
      {/* Toolbar — hidden on print */}
      <div className="print:hidden sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-zinc-200 bg-white px-6 py-3 shadow-sm">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          disabled={isLoading || !!error || !invoice}
          className="rounded-lg bg-zinc-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Print / Save PDF
        </button>
      </div>

      {/* Loading / error states */}
      {isLoading && (
        <div className="flex min-h-[60vh] items-center justify-center print:hidden">
          <p className="text-sm text-zinc-500">Loading invoice…</p>
        </div>
      )}
      {!isLoading && error && (
        <div className="flex min-h-[60vh] items-center justify-center print:hidden">
          <p className="rounded-xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-700">
            {error}
          </p>
        </div>
      )}

      {/* Invoice document */}
      {!isLoading && !error && invoice && (
        <div className="mx-auto my-8 max-w-3xl rounded-2xl bg-white shadow-lg ring-1 ring-zinc-200 print:my-0 print:max-w-none print:rounded-none print:shadow-none print:ring-0">

          {/* Header */}
          <div className="flex items-start justify-between gap-6 border-b border-zinc-200 px-10 py-8 print:px-8 print:py-6">
            <div className="flex items-center gap-4">
              {process.env.NEXT_PUBLIC_COMPANY_LOGO_URL && (
                <div className="relative h-16 w-32 shrink-0">
                  <Image
                    src={process.env.NEXT_PUBLIC_COMPANY_LOGO_URL}
                    alt="Company logo"
                    fill
                    className="object-contain object-left"
                    priority
                  />
                </div>
              )}
            </div>
            <div className="text-right">
              <h1 className="text-3xl font-extrabold uppercase tracking-widest text-zinc-900">
                Invoice
              </h1>
              <p className="mt-1 font-mono text-sm font-semibold text-zinc-700">
                {invoice.invoiceNumber || "—"}
              </p>
              <span
                className={`mt-2 inline-flex rounded-full border px-3 py-0.5 text-xs font-bold uppercase tracking-wide ${statusStyle}`}
              >
                {status || "—"}
              </span>
            </div>
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-5 border-b border-zinc-200 px-10 py-6 text-sm print:px-8">
            {/* Left — Bill To + Transaction */}
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                  Bill to
                </p>
                <p className="mt-1 text-base font-bold text-zinc-900">
                  {invoice.customer?.name || "—"}
                </p>
                {invoice.customer?.type && (
                  <p className="mt-0.5 text-xs capitalize text-zinc-500">
                    {invoice.customer.type}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                  Transaction
                </p>
                <p className="mt-1 font-medium text-zinc-800">
                  {invoice.transaction?.name || "—"}
                </p>
              </div>
            </div>

            {/* Right — Dates */}
            <div className="space-y-3 text-right">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                  Issue date
                </p>
                <p className="mt-0.5 font-medium text-zinc-800">
                  {formatDate(invoice.issuedAt)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                  Due date
                </p>
                <p className="mt-0.5 font-medium text-zinc-800">
                  {formatDate(invoice.dueAt)}
                </p>
              </div>
              {invoice.paidAt && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                    Paid on
                  </p>
                  <p className="mt-0.5 font-medium text-emerald-700">
                    {formatDate(invoice.paidAt)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Bookings table */}
          <div className="px-10 py-6 print:px-8">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">
              Rental details
            </p>
            {bookings.length === 0 ? (
              <p className="text-sm text-zinc-500">No bookings attached.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    <th className="pb-2 pr-4">#</th>
                    <th className="pb-2 pr-4">Period</th>
                    <th className="pb-2 pr-4">Vehicle</th>
                    <th className="pb-2 pr-4">Driver</th>
                    <th className="pb-2 pr-4">Note</th>
                    <th className="pb-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b, i) => {
                    const car = b?.car ?? {};
                    const driver = b?.driver ?? {};
                    const carLabel =
                      [car.make, car.model].filter(Boolean).join(" ") ||
                      "—";
                    const plateLabel = car.plateNumber
                      ? ` · ${car.plateNumber}`
                      : "";
                    const driverLabel =
                      [driver.firstName, driver.lastName]
                        .filter(Boolean)
                        .join(" ") || "—";

                    return (
                      <tr
                        key={i}
                        className="border-b border-zinc-100 last:border-0"
                      >
                        <td className="py-3 pr-4 text-zinc-500">{i + 1}</td>
                        <td className="py-3 pr-4 text-zinc-800">
                          {formatDate(b.startDate)}
                          <span className="text-zinc-400"> – </span>
                          {formatDate(b.endDate)}
                        </td>
                        <td className="py-3 pr-4 text-zinc-800">
                          {carLabel}
                          {plateLabel && (
                            <span className="text-zinc-400">{plateLabel}</span>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-zinc-800">{driverLabel}</td>
                        <td className="py-3 pr-4 text-zinc-500">
                          {b.note || <span className="text-zinc-300">—</span>}
                        </td>
                        <td className="py-3 text-right font-mono text-zinc-900">
                          {formatCurrency(Number(b.price))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Totals */}
          <div className="border-t border-zinc-200 px-10 py-5 print:px-8">
            <div className="flex flex-col items-end gap-1.5 text-sm">
              {bookings.length > 0 &&
                bookingTotal !== invoice.amount && (
                  <div className="flex items-center gap-8 text-zinc-500">
                    <span>Booking subtotal</span>
                    <span className="w-36 text-right font-mono">
                      {formatCurrency(bookingTotal)}
                    </span>
                  </div>
                )}
              <div className="flex items-center gap-8 border-t border-zinc-200 pt-2 text-base font-bold text-zinc-900">
                <span>Total</span>
                <span className="w-36 text-right font-mono">
                  {formatCurrency(invoice.amount)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes?.trim() && (
            <div className="border-t border-zinc-100 px-10 pb-8 pt-4 print:px-8">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                Notes
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-700">
                {invoice.notes}
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="rounded-b-2xl border-t border-zinc-100 bg-zinc-50 px-10 py-4 text-center text-xs text-zinc-400 print:rounded-none print:px-8">
            Bennch Transport Rent a Car · Comfort and Safety
          </div>
        </div>
      )}

      <style>{`
        @media print {
          @page { margin: 1.5cm; size: A4; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}
