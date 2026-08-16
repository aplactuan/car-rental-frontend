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
  partially_paid: "bg-indigo-100 text-indigo-700 border-indigo-300",
  paid: "bg-emerald-100 text-emerald-700 border-emerald-300",
  cancelled: "bg-amber-100 text-amber-700 border-amber-300",
};

const normalizePayment = (record) => {
  const source = record?.data ?? record ?? {};
  const attrs = source?.attributes ?? source;
  const parsedAmount = Number(attrs?.amount);
  return {
    id: source?.id ?? attrs?.id ?? null,
    amount: Number.isFinite(parsedAmount) ? parsedAmount : null,
    method: attrs?.method ?? "",
    referenceNumber: attrs?.referenceNumber ?? attrs?.reference_number ?? "",
    notes: attrs?.notes ?? "",
    proofImageUrl: attrs?.proofImageUrl ?? attrs?.proof_image_url ?? "",
    paidAt: attrs?.paidAt ?? attrs?.paid_at ?? attrs?.createdAt ?? attrs?.created_at ?? null,
  };
};

const normalizePayments = (payload) => {
  const raw = payload?.data ?? payload;
  const list = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
  return list.map((item) => normalizePayment(item)).filter((item) => item.id);
};

export default function InvoicePrintPage() {
  const params = useParams();
  const transactionId = params?.transaction_id;

  const [invoice, setInvoice] = useState(null);
  const [payments, setPayments] = useState([]);
  const [poNumber, setPoNumber] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!transactionId) return;

    const fetchInvoice = async () => {
      setIsLoading(true);
      setError("");
      try {
        const headers = getBearerHeaders();
        // TODO(invoice-po-in-payload): Invoice printable payload currently omits
        // transaction.poNumber (only name). Extra GET /transactions/{id} is a
        // workaround — remove it once the invoice API includes poNumber.
        const [invoiceRes, paymentsRes, transactionRes] = await Promise.all([
          fetch(`/api/v1/transactions/${transactionId}/bill/invoice`, {
            headers,
            credentials: "include",
            cache: "no-store",
          }),
          fetch(`/api/v1/transactions/${transactionId}/bill/payments`, {
            headers,
            credentials: "include",
            cache: "no-store",
          }),
          fetch(`/api/v1/transactions/${transactionId}`, {
            headers,
            credentials: "include",
            cache: "no-store",
          }),
        ]);

        const invoiceData = await invoiceRes.json().catch(() => ({}));
        if (!invoiceRes.ok) {
          setError(invoiceData?.error ?? invoiceData?.message ?? "Failed to load invoice.");
          return;
        }
        setInvoice(invoiceData);

        if (paymentsRes.ok) {
          const paymentsData = await paymentsRes.json().catch(() => ({}));
          setPayments(normalizePayments(paymentsData));
        } else {
          setPayments([]);
        }

        let resolvedPo =
          invoiceData?.transaction?.poNumber ||
          invoiceData?.transaction?.po_number ||
          invoiceData?.poNumber ||
          invoiceData?.po_number ||
          "";

        if (transactionRes.ok) {
          const transactionData = await transactionRes.json().catch(() => ({}));
          const attrs =
            transactionData?.data?.attributes ??
            transactionData?.attributes ??
            transactionData ??
            {};
          resolvedPo =
            attrs?.poNumber ||
            attrs?.po_number ||
            resolvedPo;
        }

        setPoNumber(typeof resolvedPo === "string" ? resolvedPo.trim() : "");
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
  const totalPaid = payments.reduce((sum, payment) => {
    const amount = Number(payment?.amount);
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);
  const remainingAmount =
    typeof invoice?.amount === "number" && Number.isFinite(invoice.amount)
      ? Math.max(0, invoice.amount - totalPaid)
      : null;

  return (
    <div className="min-h-screen bg-zinc-100 print:bg-white">
      {/* Toolbar — hidden on print */}
      <div className="print:hidden sticky top-0 z-10 flex flex-col gap-2 border-b border-zinc-200 bg-white px-4 py-3 shadow-sm min-[360px]:flex-row min-[360px]:items-center min-[360px]:justify-between sm:gap-4 sm:px-6">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 min-[360px]:w-auto"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          disabled={isLoading || !!error || !invoice}
          className="w-full rounded-lg bg-red-400 px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50 min-[360px]:w-auto"
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
        <div className="mx-auto my-4 max-w-3xl overflow-hidden bg-white shadow-lg ring-1 ring-zinc-200 sm:my-8 sm:rounded-2xl print:my-0 print:max-w-none print:overflow-visible print:rounded-none print:shadow-none print:ring-0">

          {/* Header */}
          <div className="flex flex-col items-start gap-5 border-b border-zinc-200 px-4 py-6 sm:flex-row sm:justify-between sm:gap-6 sm:px-10 sm:py-8 print:flex-row print:justify-between print:gap-6 print:px-8 print:py-6">
            <div className="flex items-center gap-4">
              {process.env.NEXT_PUBLIC_COMPANY_LOGO_URL && (
                <div className="relative h-12 w-24 shrink-0 sm:h-16 sm:w-32 print:h-16 print:w-32">
                  <Image
                    src={process.env.NEXT_PUBLIC_COMPANY_LOGO_URL}
                    alt="Company logo"
                    fill
                    className="object-contain object-left"
                    sizes="(max-width: 639px) 6rem, 8rem"
                    preload
                  />
                </div>
              )}
            </div>
            <div className="text-left sm:text-right print:text-right">
              <h1 className="text-2xl font-extrabold uppercase tracking-widest text-zinc-900 sm:text-3xl print:text-3xl">
                Invoice
              </h1>
              <p className="mt-1 font-mono text-sm font-semibold text-zinc-700">
                {invoice.invoiceNumber || "—"}
              </p>
              <span
                className={`mt-2 inline-flex rounded-full border px-3 py-0.5 text-xs font-bold uppercase tracking-wide ${statusStyle}`}
              >
                {status ? status.replaceAll("_", " ") : "—"}
              </span>
            </div>
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-1 gap-x-8 gap-y-5 border-b border-zinc-200 px-4 py-6 text-sm sm:grid-cols-2 sm:px-10 print:grid-cols-2 print:px-8">
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
              {poNumber ? (
                <p className="text-sm text-zinc-700">
                  <span className="font-semibold text-zinc-900">PO Number:</span>{" "}
                  {poNumber}
                </p>
              ) : null}
              {invoice.notes?.trim() && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                    Notes
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-700">
                    {invoice.notes}
                  </p>
                </div>
              )}
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
            <div className="space-y-3 text-left sm:text-right print:text-right">
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
          <div className="px-4 py-6 sm:px-10 print:px-8">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">
              Rental Details
            </p>
            {bookings.length === 0 ? (
              <p className="text-sm text-zinc-500">No bookings attached.</p>
            ) : (
              <>
                <p className="mb-2 text-xs text-zinc-500 md:hidden print:hidden">
                  Scroll horizontally to view all rental details.
                </p>
                <div
                  className="max-w-full overflow-x-auto overscroll-x-contain print:overflow-visible"
                  role="region"
                  aria-label="Rental Details table"
                  tabIndex={0}
                >
                <table className="w-full min-w-[700px] text-sm print:table-fixed print:min-w-0 print:text-[10px]">
                  <thead>
                    <tr className="border-b border-zinc-200 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      <th className="pb-2 pr-4 print:w-[4%] print:pr-1">#</th>
                      <th className="pb-2 pr-4 print:w-[24%] print:pr-2">Period</th>
                      <th className="pb-2 pr-4 print:w-[20%] print:pr-2">Vehicle</th>
                      <th className="pb-2 pr-4 print:w-[18%] print:pr-2">Driver</th>
                      <th className="pb-2 pr-4 print:w-[18%] print:pr-2">Note</th>
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
                          <td className="py-3 pr-4 text-zinc-500 print:pr-1">{i + 1}</td>
                          <td className="py-3 pr-4 text-zinc-800 print:break-words print:pr-2">
                            {formatDate(b.startDate)}
                            <span className="text-zinc-400"> – </span>
                            {formatDate(b.endDate)}
                          </td>
                          <td className="py-3 pr-4 text-zinc-800 print:break-words print:pr-2">
                            {carLabel}
                            {plateLabel && (
                              <span className="text-zinc-400">{plateLabel}</span>
                            )}
                          </td>
                          <td className="py-3 pr-4 text-zinc-800 print:break-words print:pr-2">
                            {driverLabel}
                          </td>
                          <td className="py-3 pr-4 text-zinc-500 print:break-words print:pr-2">
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
                </div>
              </>
            )}
          </div>

          {/* Totals */}
          <div className="border-t border-zinc-200 px-4 py-5 sm:px-10 print:px-8">
            <div className="flex flex-col items-end gap-1.5 text-sm">
              {bookings.length > 0 &&
                bookingTotal !== invoice.amount && (
                  <div className="flex w-full items-center justify-between gap-3 text-zinc-500 sm:w-auto sm:gap-8 print:w-auto print:gap-8">
                    <span>Booking subtotal</span>
                    <span className="min-w-0 text-right font-mono sm:w-36 print:w-36">
                      {formatCurrency(bookingTotal)}
                    </span>
                  </div>
                )}
              <div className="flex w-full items-center justify-between gap-3 border-t border-zinc-200 pt-2 text-base font-bold text-zinc-900 sm:w-auto sm:gap-8 print:w-auto print:gap-8">
                <span>Total</span>
                <span className="min-w-0 text-right font-mono sm:w-36 print:w-36">
                  {formatCurrency(invoice.amount)}
                </span>
              </div>
              <div className="flex w-full items-center justify-between gap-3 text-zinc-700 sm:w-auto sm:gap-8 print:w-auto print:gap-8">
                <span>Paid So Far</span>
                <span className="min-w-0 text-right font-mono sm:w-36 print:w-36">
                  {formatCurrency(totalPaid)}
                </span>
              </div>
              <div className="flex w-full items-center justify-between gap-3 text-zinc-700 sm:w-auto sm:gap-8 print:w-auto print:gap-8">
                <span>Remaining</span>
                <span className="min-w-0 text-right font-mono sm:w-36 print:w-36">
                  {formatCurrency(remainingAmount)}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-100 px-4 py-5 sm:px-10 print:px-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
              Payments
            </p>
            {payments.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-500">No recorded payments yet.</p>
            ) : (
              <div className="mt-2 space-y-2">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm"
                  >
                    <p className="font-semibold text-zinc-900">
                      {formatCurrency(payment.amount)} •{" "}
                      {payment.method ? payment.method.replaceAll("_", " ") : "—"}
                    </p>
                    <p className="text-xs text-zinc-600">
                      Ref {payment.referenceNumber || "—"} • {formatDate(payment.paidAt)}
                    </p>
                    {payment.notes ? (
                      <p className="text-xs text-zinc-600">{payment.notes}</p>
                    ) : null}
                    {payment.proofImageUrl ? (
                      <a
                        href={payment.proofImageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-blue-700 hover:underline"
                      >
                        View Proof Image
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* End user */}
          <div className="border-t border-zinc-100 px-4 pb-8 pt-4 sm:px-10 print:px-8">
            <p className="flex flex-col gap-1 text-sm text-zinc-700 sm:block print:block">
              <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                End user
              </span>
              <span className="mx-2 hidden text-zinc-300 sm:inline print:inline">·</span>
              <span className="font-medium text-zinc-800">
                {invoice.customer?.contactPerson ||
                  invoice.customer?.contact_person ||
                  "—"}
              </span>
            </p>
          </div>

          {/* Footer */}
          <div className="border-t border-zinc-100 bg-zinc-50 px-4 py-4 text-center text-xs text-zinc-400 sm:rounded-b-2xl sm:px-10 print:rounded-none print:px-8">
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
