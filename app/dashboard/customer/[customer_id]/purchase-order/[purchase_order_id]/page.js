import Link from "next/link";
import { cookies } from "next/headers";
import AddInvoiceButton from "./AddInvoiceButton";
import AddTripReportButton from "./AddTripReportButton";

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
  const customerAttrs =
    customerRelationship?.attributes ??
    payload?.included?.find?.(
      (item) =>
        String(item?.id) === String(customerRelationship?.id) &&
        (item?.type === "customers" || item?.type === "customer"),
    )?.attributes ??
    {};

  return {
    id: String(pick(["id", "purchase_order_id", "purchaseOrderId"]) || ""),
    poNumber: String(pick(["po_number", "poNumber"]) || ""),
    date: String(pick(["date"]) || ""),
    amount: toAmount(attrs?.amount ?? record?.amount),
    requestPerson: String(pick(["request_person", "requestPerson"]) || ""),
    description: String(pick(["description"]) || ""),
    customerId: String(
      pick(["customer_id", "customerId"]) || customerRelationship?.id || "",
    ),
    customerName: String(
      readField(customerAttrs, ["name", "customer_name", "customerName"]) || "",
    ),
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
      const invoiceId = String(
        pick(["invoice_id", "invoiceId"]) ||
          (invoiceRelationship && invoiceRelationship.id != null
            ? invoiceRelationship.id
            : "") ||
          "",
      );

      return {
        id: String(pick(["id", "trip_report_id", "tripReportId"]) || ""),
        reportDate: String(pick(["report_date", "reportDate"]) || ""),
        driver: String(pick(["driver"]) || ""),
        destinations: String(pick(["destinations"]) || ""),
        amount: toAmount(attrs?.amount ?? record?.amount),
        tripReportImageUrl: String(
          pick(["trip_report_image_url", "tripReportImageUrl"]) || "",
        ),
        invoiceId,
      };
    })
    .filter((item) => item.id);
}

function normalizeInvoices(payload) {
  const raw = payload?.data ?? payload?.invoices ?? payload?.items ?? payload;
  const list = Array.isArray(raw) ? raw : [];

  return list
    .map((record) => {
      const attrs = record?.attributes ?? {};
      const pick = (keys) =>
        readField(attrs, keys) || readField(record, keys);

      return {
        id: String(pick(["id", "invoice_id", "invoiceId"]) || ""),
        invoiceNumber: String(
          pick(["invoice_number", "invoiceNumber"]) || "",
        ),
        lddapAdapNo: String(pick(["lddap_adap_no", "lddapAdapNo"]) || ""),
        note: String(pick(["note"]) || ""),
        paymentReceiptUrl: String(
          pick(["payment_receipt_url", "paymentReceiptUrl"]) || "",
        ),
        disbursementVoucherUrl: String(
          pick(["disbursement_voucher_url", "disbursementVoucherUrl"]) || "",
        ),
        createdAt: String(pick(["created_at", "createdAt"]) || ""),
      };
    })
    .filter((item) => item.id);
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
      className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 transition hover:text-teal-800"
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

export default async function PurchaseOrderDetailPage({ params }) {
  const resolvedParams = await params;
  const customerId = resolvedParams?.customer_id;
  const purchaseOrderId = resolvedParams?.purchase_order_id;

  const cookieStore = await cookies();
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

  let purchaseOrder = null;
  let error = "";
  let tripReports = [];
  let tripReportsError = "";
  let invoices = [];
  let invoicesError = "";

  if (!purchaseOrderId) {
    error = "Purchase order ID was not provided.";
  } else {
    try {
      const res = await fetch(
        `${baseUrl}/api/v1/purchase-orders/${encodeURIComponent(purchaseOrderId)}`,
        {
          headers: fetchHeaders,
          cache: "no-store",
        },
      );
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        error =
          data?.error ||
          data?.message ||
          "Failed to load purchase order details.";
      } else {
        purchaseOrder = normalizePurchaseOrder(data);
      }
    } catch {
      error = "Could not reach the purchase order details endpoint.";
    }

    try {
      const tripRes = await fetch(
        `${baseUrl}/api/v1/purchase-orders/${encodeURIComponent(purchaseOrderId)}/trip-reports`,
        {
          headers: fetchHeaders,
          cache: "no-store",
        },
      );
      const tripData = await tripRes.json().catch(() => ({}));

      if (!tripRes.ok) {
        tripReportsError =
          tripData?.error ||
          tripData?.message ||
          "Failed to load trip reports.";
      } else {
        tripReports = normalizeTripReports(tripData);
      }
    } catch {
      tripReportsError = "Could not reach the trip reports endpoint.";
    }

    try {
      const invoiceRes = await fetch(
        `${baseUrl}/api/v1/purchase-orders/${encodeURIComponent(purchaseOrderId)}/invoices`,
        {
          headers: fetchHeaders,
          cache: "no-store",
        },
      );
      const invoiceData = await invoiceRes.json().catch(() => ({}));

      if (!invoiceRes.ok) {
        invoicesError =
          invoiceData?.error ||
          invoiceData?.message ||
          "Failed to load invoices.";
      } else {
        invoices = normalizeInvoices(invoiceData);
      }
    } catch {
      invoicesError = "Could not reach the invoices endpoint.";
    }
  }

  const backHref = customerId
    ? `/dashboard/customer/${encodeURIComponent(customerId)}`
    : "/dashboard/customer";
  const displayPoNumber = purchaseOrder?.poNumber || "Purchase order";
  const tripTotal = tripReports.reduce(
    (sum, report) => sum + (typeof report.amount === "number" ? report.amount : 0),
    0,
  );
  const availableTripReports = tripReports.filter((report) => !report.invoiceId);
  const poAmount =
    typeof purchaseOrder?.amount === "number" ? purchaseOrder.amount : null;
  const tripTotalExceedsPo =
    poAmount != null && tripTotal > poAmount;

  return (
    <div className="w-full space-y-6 pr-8">
      <header className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm ring-1 ring-zinc-100">
        <div className="relative bg-gradient-to-br from-teal-800 via-emerald-700 to-zinc-900 px-6 py-6 text-white sm:px-8">
          <div
            className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-16 left-1/3 h-32 w-32 rounded-full bg-emerald-300/20 blur-2xl"
            aria-hidden
          />

          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <Link
                href={backHref}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-100/90 transition hover:text-white"
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
                Back to customer
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
                      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M14 2v6h6M8 13h8M8 17h5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-100/80">
                    Purchase order
                  </p>
                  <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                    {displayPoNumber}
                  </h1>
                  {purchaseOrder?.customerName ? (
                    <p className="mt-1 text-sm text-emerald-50/95">
                      {purchaseOrder.customerName}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-emerald-50/80">
                      Customer purchase order
                    </p>
                  )}
                </div>
              </div>
            </div>

            {purchaseOrderId ? (
              <div className="flex flex-wrap items-center gap-2">
                <AddInvoiceButton
                  purchaseOrderId={purchaseOrderId}
                  availableTripReports={availableTripReports}
                />
                <AddTripReportButton purchaseOrderId={purchaseOrderId} />
              </div>
            ) : null}
          </div>

          {error ? (
            <p className="relative mt-5 rounded-lg border border-red-300/40 bg-red-500/20 px-3 py-2 text-sm text-red-50">
              {error}
            </p>
          ) : null}
        </div>

        {!error && purchaseOrder ? (
          <div className="grid gap-px bg-zinc-200 sm:grid-cols-3">
            <div className="bg-white px-6 py-5">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Amount
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
                {formatPhp(purchaseOrder.amount)}
              </p>
            </div>
            <div className="bg-white px-6 py-5">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Date
              </p>
              <p className="mt-2 text-lg font-semibold text-zinc-900">
                {formatDate(purchaseOrder.date)}
              </p>
            </div>
            <div className="bg-white px-6 py-5">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Request person
              </p>
              <p className="mt-2 text-lg font-semibold text-zinc-900">
                {purchaseOrder.requestPerson || "—"}
              </p>
            </div>
          </div>
        ) : null}

        {!error && purchaseOrder?.description ? (
          <div className="border-t border-zinc-100 bg-zinc-50/80 px-6 py-4 sm:px-8">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Description
            </p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-700">
              {purchaseOrder.description}
            </p>
          </div>
        ) : null}
      </header>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-zinc-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
              Trip reports
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Trips logged against this purchase order.
            </p>
          </div>
          {!tripReportsError && tripReports.length > 0 ? (
            <div
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                tripTotalExceedsPo
                  ? "bg-red-50 text-red-800"
                  : "bg-emerald-50 text-emerald-800"
              }`}
            >
              {tripReports.length} report{tripReports.length === 1 ? "" : "s"} ·{" "}
              {formatPhp(tripTotal)}
            </div>
          ) : null}
        </div>

        <div className="px-6 py-5">
          {tripReportsError ? (
            <p className="text-sm text-red-600">{tripReportsError}</p>
          ) : tripReports.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-6 py-10 text-center">
              <p className="text-sm font-medium text-zinc-700">
                No trip reports yet
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                Add the first trip report for this purchase order.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                    <th className="pb-3 pr-6">Report date</th>
                    <th className="pb-3 pr-6">Driver</th>
                    <th className="pb-3 pr-6">Destinations</th>
                    <th className="pb-3 pr-6">Amount</th>
                    <th className="pb-3 pr-6">Invoice</th>
                    <th className="pb-3">Image</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {tripReports.map((report) => {
                    const linkedInvoice = report.invoiceId
                      ? invoices.find(
                          (invoice) => invoice.id === report.invoiceId,
                        )
                      : null;

                    return (
                      <tr
                        key={report.id}
                        className="transition hover:bg-zinc-50/80"
                      >
                        <td className="py-3.5 pr-6 font-medium text-zinc-900">
                          {formatDate(report.reportDate)}
                        </td>
                        <td className="py-3.5 pr-6 text-zinc-700">
                          {report.driver || "—"}
                        </td>
                        <td className="max-w-xs py-3.5 pr-6 text-zinc-700">
                          {report.destinations || "—"}
                        </td>
                        <td className="py-3.5 pr-6 font-medium text-zinc-900">
                          {formatPhp(report.amount)}
                        </td>
                        <td className="py-3.5 pr-6">
                          {report.invoiceId ? (
                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                              {linkedInvoice?.invoiceNumber || "Invoiced"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
                              Unassigned
                            </span>
                          )}
                        </td>
                        <td className="py-3.5">
                          <DocumentLink
                            href={report.tripReportImageUrl}
                            label="View"
                          />
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

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-zinc-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
              Invoices
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Purchase order invoices with payment and disbursement documents.
            </p>
          </div>
          {!invoicesError && invoices.length > 0 ? (
            <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
              {invoices.length} invoice{invoices.length === 1 ? "" : "s"}
            </div>
          ) : null}
        </div>

        <div className="px-6 py-5">
          {invoicesError ? (
            <p className="text-sm text-red-600">{invoicesError}</p>
          ) : invoices.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-6 py-10 text-center">
              <p className="text-sm font-medium text-zinc-700">
                No invoices yet
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                Add the first invoice for this purchase order.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                    <th className="pb-3 pr-6">Invoice number</th>
                    <th className="pb-3 pr-6">LDDAP/ADAP</th>
                    <th className="pb-3 pr-6">Note</th>
                    <th className="pb-3 pr-6">Created</th>
                    <th className="pb-3 pr-6">Receipt</th>
                    <th className="pb-3">Voucher</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {invoices.map((invoice) => (
                    <tr
                      key={invoice.id}
                      className="transition hover:bg-zinc-50/80"
                    >
                      <td className="py-3.5 pr-6 font-medium text-zinc-900">
                        {invoice.invoiceNumber || "—"}
                      </td>
                      <td className="py-3.5 pr-6 text-zinc-700">
                        {invoice.lddapAdapNo || "—"}
                      </td>
                      <td className="max-w-xs py-3.5 pr-6 text-zinc-700">
                        {invoice.note || "—"}
                      </td>
                      <td className="py-3.5 pr-6 text-zinc-700">
                        {formatDate(invoice.createdAt)}
                      </td>
                      <td className="py-3.5 pr-6">
                        <DocumentLink
                          href={invoice.paymentReceiptUrl}
                          label="View"
                        />
                      </td>
                      <td className="py-3.5">
                        <DocumentLink
                          href={invoice.disbursementVoucherUrl}
                          label="View"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
