import Link from "next/link";
import { cookies } from "next/headers";
import InvoiceActions from "../../InvoiceActions";
import { canChangeInvoiceStatus as roleCanChangeInvoiceStatus } from "@/app/lib/invoiceStatusAuth";

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

function toAmount(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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

function DocumentLink({ href, label }) {
  if (!href) {
    return <span className="text-zinc-400">—</span>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex max-w-full min-w-0 items-center gap-1 break-all text-sm font-medium text-red-700 transition hover:text-red-800"
    >
      {label}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="h-3.5 w-3.5"
        aria-hidden
      >
        <path
          d="M7 17L17 7M7 7h10v10"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </a>
  );
}

function DetailItem({ label, children }) {
  return (
    <div className="bg-white px-4 py-5 sm:px-6">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <div className="mt-2 text-base font-semibold text-zinc-900">{children}</div>
    </div>
  );
}

function InvoiceStatusBadge({ status }) {
  const isPaid = status === "paid";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isPaid
          ? "bg-emerald-50 text-emerald-800"
          : "bg-amber-50 text-amber-800"
      }`}
    >
      {isPaid ? "Paid" : "Unpaid"}
    </span>
  );
}

async function fetchJson(url, headers) {
  try {
    const res = await fetch(url, { headers, cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    return { res, data };
  } catch {
    return null;
  }
}

function normalizePurchaseOrder(payload) {
  const record = payload?.data ?? payload?.purchase_order ?? payload;
  const attrs = record?.attributes ?? {};
  const pick = (keys) => {
    const fromAttrs = readField(attrs, keys);
    if (fromAttrs !== "") return fromAttrs;
    return readField(record, keys);
  };

  const customerRelationship =
    record?.relationships?.customer?.data ??
    attrs?.relationships?.customer?.data ??
    null;
  const customerAttrs = customerRelationship?.attributes ?? {};
  const programRelationship =
    record?.relationships?.program?.data ??
    attrs?.relationships?.program?.data ??
    null;
  const programAttrs = programRelationship?.attributes ?? {};

  return {
    id: String(pick(["id", "purchase_order_id", "purchaseOrderId"]) || ""),
    poNumber: String(pick(["po_number", "poNumber"]) || ""),
    customerId: String(
      pick(["customer_id", "customerId"]) || customerRelationship?.id || "",
    ),
    customerName: String(
      readField(customerAttrs, ["name", "customer_name", "customerName"]) || "",
    ),
    programName: String(
      readField(programAttrs, ["name", "program_name", "programName"]) ||
        pick(["program_name", "programName"]) ||
        "",
    ),
  };
}

function normalizeInvoice(payload) {
  const record = payload?.data ?? payload?.invoice ?? payload;
  const attrs = record?.attributes ?? {};
  const pick = (keys) =>
    readField(attrs, keys) || readField(record, keys);

  const statusRaw = String(pick(["status"]) || "unpaid").toLowerCase();
  const tripReportCountParsed = Number(
    attrs?.tripReportCount ??
      attrs?.trip_report_count ??
      record?.tripReportCount ??
      record?.trip_report_count,
  );

  return {
    id: String(pick(["id", "invoice_id", "invoiceId"]) || ""),
    invoiceNumber: String(pick(["invoice_number", "invoiceNumber"]) || ""),
    lddapAdapNo: String(pick(["lddap_adap_no", "lddapAdapNo"]) || ""),
    note: String(pick(["note"]) || ""),
    status: statusRaw === "paid" ? "paid" : "unpaid",
    amount:
      toAmount(attrs?.amount ?? record?.amount) ??
      toAmount(attrs?.invoiceAmount ?? record?.invoiceAmount) ??
      0,
    tripReportCount: Number.isFinite(tripReportCountParsed)
      ? tripReportCountParsed
      : 0,
    billedAt: String(pick(["billed_at", "billedAt"]) || ""),
    paidAt: String(pick(["paid_at", "paidAt"]) || ""),
    paymentReceiptUrl: String(
      pick(["payment_receipt_url", "paymentReceiptUrl"]) || "",
    ),
    disbursementVoucherUrl: String(
      pick(["disbursement_voucher_url", "disbursementVoucherUrl"]) || "",
    ),
    invoicePictureUrl: String(
      pick(["invoice_picture_url", "invoicePictureUrl"]) || "",
    ),
    createdAt: String(pick(["created_at", "createdAt"]) || ""),
    updatedAt: String(pick(["updated_at", "updatedAt"]) || ""),
  };
}

function normalizeTripReports(payload) {
  const raw =
    payload?.data ?? payload?.trip_reports ?? payload?.items ?? payload;
  const list = Array.isArray(raw) ? raw : [];

  return list
    .map((record) => {
      const attrs = record?.attributes ?? {};
      const pick = (keys) =>
        readField(attrs, keys) || readField(record, keys);
      const invoiceRelationship =
        record?.relationships?.invoice?.data ??
        attrs?.relationships?.invoice?.data ??
        null;

      return {
        id: String(pick(["id", "trip_report_id", "tripReportId"]) || ""),
        tripReportNo: String(pick(["trip_report_no", "tripReportNo"]) || ""),
        reportDate: String(pick(["report_date", "reportDate"]) || ""),
        tripStart: String(pick(["trip_start", "tripStart"]) || ""),
        tripEnd: String(pick(["trip_end", "tripEnd"]) || ""),
        driver: String(pick(["driver"]) || ""),
        destinations: String(pick(["destinations"]) || ""),
        amount: toAmount(attrs?.amount ?? record?.amount),
        tripReportImageUrl: String(
          pick(["trip_report_image_url", "tripReportImageUrl"]) || "",
        ),
        invoiceId: String(
          pick(["invoice_id", "invoiceId"]) ||
            (invoiceRelationship?.id != null ? invoiceRelationship.id : "") ||
            "",
        ),
      };
    })
    .filter((item) => item.id);
}

export default async function InvoiceDetailPage({ params }) {
  const resolvedParams = await params;
  const customerId = resolvedParams?.customer_id;
  const purchaseOrderId = resolvedParams?.purchase_order_id;
  const invoiceId = resolvedParams?.invoice_id;

  const cookieStore = await cookies();
  const canChangeInvoiceStatus = roleCanChangeInvoiceStatus(
    cookieStore.get("auth_role")?.value,
  );
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");
  const fetchHeaders = cookieHeader ? { Cookie: cookieHeader } : {};

  let invoice = null;
  let purchaseOrder = null;
  let tripReports = [];
  let error = "";

  if (!purchaseOrderId || !invoiceId) {
    error = "Invoice ID was not provided.";
  } else {
    const [invoiceResult, poResult, tripResult] = await Promise.all([
      fetchJson(
        `${baseUrl}/api/v1/purchase-orders/${encodeURIComponent(purchaseOrderId)}/invoices/${encodeURIComponent(invoiceId)}`,
        fetchHeaders,
      ),
      fetchJson(
        `${baseUrl}/api/v1/purchase-orders/${encodeURIComponent(purchaseOrderId)}`,
        fetchHeaders,
      ),
      fetchJson(
        `${baseUrl}/api/v1/purchase-orders/${encodeURIComponent(purchaseOrderId)}/trip-reports`,
        fetchHeaders,
      ),
    ]);

    if (!invoiceResult) {
      error = "Could not reach the invoice details endpoint.";
    } else if (!invoiceResult.res.ok) {
      error =
        invoiceResult.data?.error ||
        invoiceResult.data?.message ||
        "Failed to load invoice details.";
    } else {
      invoice = normalizeInvoice(invoiceResult.data);
    }

    if (poResult?.res?.ok) {
      purchaseOrder = normalizePurchaseOrder(poResult.data);
    }

    if (tripResult?.res?.ok) {
      tripReports = normalizeTripReports(tripResult.data);
    }
  }

  const resolvedCustomerId =
    customerId || purchaseOrder?.customerId || "";
  const poHref =
    resolvedCustomerId && purchaseOrderId
      ? `/dashboard/customer/${encodeURIComponent(resolvedCustomerId)}/purchase-order/${encodeURIComponent(purchaseOrderId)}`
      : "/dashboard/customer";
  const attachedTripReports = invoice
    ? tripReports.filter((report) => report.invoiceId === invoice.id)
    : [];
  const availableTripReports = tripReports.filter((report) => !report.invoiceId);
  const displayNumber = invoice?.invoiceNumber || "Invoice";

  return (
    <div className="min-w-0 w-full space-y-6 lg:pr-8">
      <header className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm ring-1 ring-zinc-100">
        <div className="relative bg-gradient-to-br from-red-800 via-red-900 to-zinc-900 px-4 py-6 text-white sm:px-8">
          <div
            className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-16 left-1/3 h-32 w-32 rounded-full bg-red-500/20 blur-2xl"
            aria-hidden
          />

          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <Link
                href={poHref}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-red-100/90 transition hover:text-white"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-4 w-4"
                  aria-hidden
                >
                  <path
                    d="M15 18l-6-6 6-6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Back to Purchase Order
              </Link>

              <div className="mt-4 flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    className="h-6 w-6"
                    aria-hidden
                  >
                    <path
                      d="M9 12h6m-6 4h6M8 6h8a2 2 0 012 2v12a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-red-100/80">
                    Invoice
                  </p>
                  <h1 className="mt-1 break-words text-2xl font-bold tracking-tight sm:text-3xl">
                    {displayNumber}
                  </h1>
                  <p className="mt-1 text-sm text-red-50/95">
                    {[
                      purchaseOrder?.customerName || null,
                      purchaseOrder?.programName || null,
                      purchaseOrder?.poNumber
                        ? `PO ${purchaseOrder.poNumber}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Purchase order invoice"}
                  </p>
                </div>
              </div>
            </div>

            {invoice && purchaseOrderId ? (
              <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
                <InvoiceActions
                  purchaseOrderId={purchaseOrderId}
                  invoice={invoice}
                  availableTripReports={availableTripReports}
                  attachedTripReports={attachedTripReports}
                  canChangeInvoiceStatus={canChangeInvoiceStatus}
                  afterDeleteHref={poHref}
                />
              </div>
            ) : null}
          </div>

          {error ? (
            <p className="relative mt-5 rounded-lg border border-red-300/40 bg-red-500/20 px-3 py-2 text-sm text-red-50">
              {error}
            </p>
          ) : null}
        </div>

        {!error && invoice ? (
          <div className="grid gap-px bg-zinc-200 sm:grid-cols-2 lg:grid-cols-4">
            <DetailItem label="Amount">{formatPhp(invoice.amount)}</DetailItem>
            <DetailItem label="Status">
              <InvoiceStatusBadge status={invoice.status} />
            </DetailItem>
            <DetailItem label="Billed">
              {formatDate(invoice.billedAt)}
            </DetailItem>
            <DetailItem label="Paid">
              {invoice.status === "paid"
                ? formatDate(invoice.paidAt)
                : "—"}
            </DetailItem>
          </div>
        ) : null}
      </header>

      {!error && invoice ? (
        <>
          <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-100 px-4 py-5 sm:px-6">
              <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
                Details
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Notes, references, and documents for this invoice.
              </p>
            </div>
            <dl className="grid gap-px bg-zinc-200 sm:grid-cols-2">
              <DetailItem label="LDDAP / ADAP">
                {invoice.lddapAdapNo || "—"}
              </DetailItem>
              <DetailItem label="Trip reports">
                {invoice.tripReportCount.toLocaleString()}
              </DetailItem>
              <div className="bg-white px-4 py-5 sm:col-span-2 sm:px-6">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Note
                </p>
                <p className="mt-2 text-sm leading-relaxed text-zinc-800">
                  {invoice.note || "—"}
                </p>
              </div>
              <DetailItem label="Invoice picture">
                <DocumentLink
                  href={invoice.invoicePictureUrl}
                  label="View"
                />
              </DetailItem>
              <DetailItem label="Payment receipt">
                <DocumentLink
                  href={invoice.paymentReceiptUrl}
                  label="View"
                />
              </DetailItem>
              <DetailItem label="Disbursement voucher">
                <DocumentLink
                  href={invoice.disbursementVoucherUrl}
                  label="View"
                />
              </DetailItem>
              <DetailItem label="Updated">
                {formatDate(invoice.updatedAt || invoice.createdAt)}
              </DetailItem>
            </dl>
          </section>

          <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-zinc-100 px-4 py-5 sm:px-6">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
                  Attached trip reports
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Trip reports billed on this invoice.
                </p>
              </div>
              {attachedTripReports.length > 0 ? (
                <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
                  {attachedTripReports.length} report
                  {attachedTripReports.length === 1 ? "" : "s"}
                </div>
              ) : null}
            </div>

            <div className="px-4 py-5 sm:px-6">
              {attachedTripReports.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-6 py-10 text-center">
                  <p className="text-sm font-medium text-zinc-700">
                    No trip reports attached
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Edit this invoice to attach trip reports.
                  </p>
                </div>
              ) : (
                <div
                  className="overflow-x-auto overscroll-x-contain"
                  role="region"
                  aria-label="Attached Trip Reports Table"
                  tabIndex={0}
                >
                  <table className="min-w-[48rem] text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                        <th className="pb-3 pr-6">Trip Report No</th>
                        <th className="pb-3 pr-6">Report Date</th>
                        <th className="pb-3 pr-6">Driver</th>
                        <th className="pb-3 pr-6">Destinations</th>
                        <th className="pb-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {attachedTripReports.map((report) => {
                        const reportHref =
                          resolvedCustomerId && purchaseOrderId
                            ? `/dashboard/customer/${encodeURIComponent(resolvedCustomerId)}/purchase-order/${encodeURIComponent(purchaseOrderId)}/trip-report/${encodeURIComponent(report.id)}`
                            : null;

                        return (
                          <tr
                            key={report.id}
                            className="transition hover:bg-zinc-50/80"
                          >
                            <td className="py-3.5 pr-6 font-medium text-zinc-900">
                              {reportHref ? (
                                <Link
                                  href={reportHref}
                                  className="text-red-700 transition hover:text-red-800 hover:underline"
                                >
                                  {report.tripReportNo || "View"}
                                </Link>
                              ) : (
                                report.tripReportNo || "—"
                              )}
                            </td>
                            <td className="py-3.5 pr-6 text-zinc-700">
                              {formatDate(report.reportDate)}
                            </td>
                            <td className="py-3.5 pr-6 text-zinc-700">
                              {report.driver || "—"}
                            </td>
                            <td className="max-w-xs py-3.5 pr-6 text-zinc-700">
                              {report.destinations || "—"}
                            </td>
                            <td className="py-3.5 text-right tabular-nums text-zinc-900">
                              {formatPhp(report.amount)}
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
        </>
      ) : null}
    </div>
  );
}
