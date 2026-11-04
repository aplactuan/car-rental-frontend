import Link from "next/link";
import { cookies } from "next/headers";
import TripReportActions from "../../TripReportActions";

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

  return {
    id: String(pick(["id", "purchase_order_id", "purchaseOrderId"]) || ""),
    poNumber: String(pick(["po_number", "poNumber"]) || ""),
    customerId: String(
      pick(["customer_id", "customerId"]) || customerRelationship?.id || "",
    ),
    customerName: String(
      readField(customerAttrs, ["name", "customer_name", "customerName"]) || "",
    ),
    programName: String(pick(["program_name", "programName"]) || ""),
  };
}

function normalizeTripReport(payload) {
  const record = payload?.data ?? payload?.trip_report ?? payload;
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
    createdAt: String(pick(["created_at", "createdAt"]) || ""),
    updatedAt: String(pick(["updated_at", "updatedAt"]) || ""),
    invoiceId: String(
      pick(["invoice_id", "invoiceId"]) ||
        (invoiceRelationship?.id != null ? invoiceRelationship.id : "") ||
        "",
    ),
  };
}

function normalizeInvoiceNumber(payload) {
  const record = payload?.data ?? payload?.invoice ?? payload;
  const attrs = record?.attributes ?? {};
  return String(
    readField(attrs, ["invoice_number", "invoiceNumber"]) ||
      readField(record, ["invoice_number", "invoiceNumber"]) ||
      "",
  );
}

export default async function TripReportDetailPage({ params }) {
  const resolvedParams = await params;
  const customerId = resolvedParams?.customer_id;
  const purchaseOrderId = resolvedParams?.purchase_order_id;
  const tripReportId = resolvedParams?.trip_report_id;

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

  let tripReport = null;
  let purchaseOrder = null;
  let invoiceNumber = "";
  let error = "";

  if (!purchaseOrderId || !tripReportId) {
    error = "Trip report ID was not provided.";
  } else {
    const [tripResult, poResult] = await Promise.all([
      fetchJson(
        `${baseUrl}/api/v1/purchase-orders/${encodeURIComponent(purchaseOrderId)}/trip-reports/${encodeURIComponent(tripReportId)}`,
        fetchHeaders,
      ),
      fetchJson(
        `${baseUrl}/api/v1/purchase-orders/${encodeURIComponent(purchaseOrderId)}`,
        fetchHeaders,
      ),
    ]);

    if (!tripResult) {
      error = "Could not reach the trip report details endpoint.";
    } else if (!tripResult.res.ok) {
      error =
        tripResult.data?.error ||
        tripResult.data?.message ||
        "Failed to load trip report details.";
    } else {
      tripReport = normalizeTripReport(tripResult.data);
    }

    if (poResult?.res?.ok) {
      purchaseOrder = normalizePurchaseOrder(poResult.data);
    }

    if (tripReport?.invoiceId) {
      const invoiceResult = await fetchJson(
        `${baseUrl}/api/v1/purchase-orders/${encodeURIComponent(purchaseOrderId)}/invoices/${encodeURIComponent(tripReport.invoiceId)}`,
        fetchHeaders,
      );
      if (invoiceResult?.res?.ok) {
        invoiceNumber = normalizeInvoiceNumber(invoiceResult.data);
      }
    }
  }

  const resolvedCustomerId =
    customerId || purchaseOrder?.customerId || "";
  const poHref =
    resolvedCustomerId && purchaseOrderId
      ? `/dashboard/customer/${encodeURIComponent(resolvedCustomerId)}/purchase-order/${encodeURIComponent(purchaseOrderId)}`
      : "/dashboard/customer";
  const invoiceHref =
    tripReport?.invoiceId && resolvedCustomerId && purchaseOrderId
      ? `/dashboard/customer/${encodeURIComponent(resolvedCustomerId)}/purchase-order/${encodeURIComponent(purchaseOrderId)}/invoice/${encodeURIComponent(tripReport.invoiceId)}`
      : null;
  const displayNo = tripReport?.tripReportNo || "Trip Report";

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
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-red-100/80">
                    Trip report
                  </p>
                  <h1 className="mt-1 break-words text-2xl font-bold tracking-tight sm:text-3xl">
                    {displayNo}
                  </h1>
                  <p className="mt-1 text-sm text-red-50/95">
                    {[
                      purchaseOrder?.poNumber
                        ? `PO ${purchaseOrder.poNumber}`
                        : null,
                      purchaseOrder?.customerName || null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Purchase order trip report"}
                  </p>
                </div>
              </div>
            </div>

            {tripReport && purchaseOrderId ? (
              <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
                <TripReportActions
                  purchaseOrderId={purchaseOrderId}
                  tripReport={tripReport}
                  invoiceNumber={invoiceNumber}
                  showViewButton={false}
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

        {!error && tripReport ? (
          <div className="grid gap-px bg-zinc-200 sm:grid-cols-2 lg:grid-cols-4">
            <DetailItem label="Amount">
              {formatPhp(tripReport.amount)}
            </DetailItem>
            <DetailItem label="Report date">
              {formatDate(tripReport.reportDate)}
            </DetailItem>
            <DetailItem label="Driver">
              {tripReport.driver || "—"}
            </DetailItem>
            <DetailItem label="Invoice">
              {tripReport.invoiceId ? (
                invoiceHref ? (
                  <Link
                    href={invoiceHref}
                    className="text-red-700 transition hover:text-red-800 hover:underline"
                  >
                    {invoiceNumber || "View invoice"}
                  </Link>
                ) : (
                  invoiceNumber || "Invoiced"
                )
              ) : (
                <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
                  Unassigned
                </span>
              )}
            </DetailItem>
          </div>
        ) : null}
      </header>

      {!error && tripReport ? (
        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 px-4 py-5 sm:px-6">
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
              Details
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Trip window, destinations, and attachment.
            </p>
          </div>
          <dl className="grid gap-px bg-zinc-200 sm:grid-cols-2">
            <DetailItem label="Trip start">
              {formatDate(tripReport.tripStart)}
            </DetailItem>
            <DetailItem label="Trip end">
              {formatDate(tripReport.tripEnd)}
            </DetailItem>
            <div className="bg-white px-4 py-5 sm:col-span-2 sm:px-6">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Destinations
              </p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-800">
                {tripReport.destinations || "—"}
              </p>
            </div>
            <DetailItem label="Attachment">
              <DocumentLink
                href={tripReport.tripReportImageUrl}
                label="View file"
              />
            </DetailItem>
            <DetailItem label="Updated">
              {formatDate(tripReport.updatedAt || tripReport.createdAt)}
            </DetailItem>
          </dl>
        </section>
      ) : null}
    </div>
  );
}
