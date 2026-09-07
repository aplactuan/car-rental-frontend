import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

function toNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function formatCurrency(amount) {
  return `PHP ${Math.round(toNumber(amount)).toLocaleString("en-US")}`;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function pickAmount(source, preferredKeys = []) {
  for (const key of preferredKeys) {
    if (source[key] != null && source[key] !== "") {
      return toNumber(source[key]);
    }
  }
  return toNumber(
    source.amount ??
      source.total ??
      source.purchaseOrderTotal ??
      source.purchase_order_total ??
      source.totalBilled ??
      source.total_billed ??
      source.totalPaid ??
      source.total_paid,
  );
}

function normalizeTopCustomer(raw) {
  const source = raw?.attributes ?? raw ?? {};
  const id = String(source.id ?? raw?.id ?? "").trim();
  return {
    id,
    name: String(source.name ?? "Unnamed customer").trim() || "Unnamed customer",
    type: String(source.type ?? "").trim().toLowerCase(),
    purchaseOrderCount: toNumber(
      source.purchaseOrderCount ?? source.purchase_order_count,
    ),
    purchaseOrderTotal: toNumber(
      source.purchaseOrderTotal ?? source.purchase_order_total,
    ),
  };
}

function normalizeCustomerOverview(payload) {
  const source = payload?.data?.attributes ?? payload?.data ?? payload ?? {};
  const topCustomersRaw = asArray(
    source.topCustomers ?? source.top_customers,
  );

  return {
    totalPrograms: toNumber(source.totalPrograms ?? source.total_programs),
    totalPurchaseOrderAmount: toNumber(
      source.totalPurchaseOrderAmount ?? source.total_purchase_order_amount,
    ),
    totalBilled: toNumber(source.totalBilled ?? source.total_billed),
    totalPaid: toNumber(source.totalPaid ?? source.total_paid),
    balanceToCollect: toNumber(
      source.balanceToCollect ?? source.balance_to_collect,
    ),
    topCustomers: topCustomersRaw.map(normalizeTopCustomer).filter((c) => c.id),
  };
}

function normalizeProgramEntry(raw, preferredAmountKeys) {
  const source = raw?.attributes ?? raw ?? {};
  const id = String(source.id ?? raw?.id ?? "").trim();
  const customerId = String(
    source.customerId ??
      source.customer_id ??
      source.customer?.id ??
      "",
  ).trim();

  return {
    id,
    name: String(source.name ?? "Unnamed program").trim() || "Unnamed program",
    customerId,
    amount: pickAmount(source, preferredAmountKeys),
  };
}

function normalizeProgramRankings(payload) {
  const source = payload?.data?.attributes ?? payload?.data ?? payload ?? {};
  return {
    topPrograms: asArray(source.topPrograms ?? source.top_programs)
      .map((item) =>
        normalizeProgramEntry(item, [
          "purchaseOrderTotal",
          "purchase_order_total",
          "purchaseOrderAmount",
          "purchase_order_amount",
          "total",
          "amount",
        ]),
      )
      .filter((item) => item.id),
    topBilledPrograms: asArray(
      source.topBilledPrograms ?? source.top_billed_programs,
    )
      .map((item) =>
        normalizeProgramEntry(item, [
          "totalBilled",
          "total_billed",
          "billedAmount",
          "billed_amount",
          "total",
          "amount",
        ]),
      )
      .filter((item) => item.id),
    topPaidPrograms: asArray(
      source.topPaidPrograms ?? source.top_paid_programs,
    )
      .map((item) =>
        normalizeProgramEntry(item, [
          "totalPaid",
          "total_paid",
          "paidAmount",
          "paid_amount",
          "total",
          "amount",
        ]),
      )
      .filter((item) => item.id),
  };
}

function relationshipId(relationships, keys) {
  for (const key of keys) {
    const rel = relationships?.[key]?.data;
    if (rel?.id) return String(rel.id).trim();
    if (Array.isArray(rel) && rel[0]?.id) return String(rel[0].id).trim();
  }
  return "";
}

function normalizeRecentTripReport(raw) {
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

function normalizeRecentTripReports(payload) {
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
    .map(normalizeRecentTripReport)
    .filter((item) => item.id || item.tripReportNo !== "—");
}

function normalizeMonthRow(raw) {
  const source = raw?.attributes ?? raw ?? {};
  return {
    month: String(source.month ?? "").trim(),
    totalBilled: toNumber(source.totalBilled ?? source.total_billed),
    totalCollectible: toNumber(
      source.totalCollectible ?? source.total_collectible,
    ),
    totalPaid: toNumber(source.totalPaid ?? source.total_paid),
  };
}

function normalizeMonthReport(payload) {
  const source = payload?.data?.attributes ?? payload?.data ?? payload ?? {};
  const monthsRaw = Array.isArray(payload?.data)
    ? payload.data
    : asArray(source.months ?? source.monthReport ?? source.month_report);

  return monthsRaw
    .map(normalizeMonthRow)
    .filter((row) => row.month)
    .slice(-3);
}

async function fetchDashboardSection(url, headers) {
  try {
    const res = await fetch(url, {
      headers,
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        error:
          data?.error ||
          data?.message ||
          `Request failed (${res.status}).`,
      };
    }
    return { ok: true, data };
  } catch {
    return { ok: false, error: "Could not reach the server." };
  }
}

const kpiIcons = {
  programs:
    "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
  po: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
  billed:
    "M9 12h6m-6 4h6M8 6h8a2 2 0 012 2v12a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2z",
  paid: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  balance:
    "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V6m0 10v2m0-12a9 9 0 100 18 9 9 0 000-18z",
};

function typeBadgeClasses(type) {
  if (type === "business") return "bg-blue-50 text-blue-700 ring-blue-200";
  if (type === "personal") return "bg-zinc-100 text-zinc-700 ring-zinc-200";
  return "bg-zinc-50 text-zinc-600 ring-zinc-200";
}

function SectionError({ message }) {
  return (
    <div
      className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
      role="alert"
    >
      {message}
    </div>
  );
}

function EmptyList({ title, description }) {
  return (
    <div className="px-4 py-8 text-center sm:px-6">
      <p className="text-sm font-medium text-zinc-700">{title}</p>
      <p className="mt-1 text-sm text-zinc-500">{description}</p>
    </div>
  );
}

function ProgramRankingList({ title, subtitle, items }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-100 px-4 py-4 sm:px-5">
        <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
        <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>
      </div>
      {items.length === 0 ? (
        <EmptyList
          title="No programs yet"
          description="Rankings will appear when programs have purchase orders."
        />
      ) : (
        <ul className="divide-y divide-zinc-100">
          {items.map((program, index) => {
            const content = (
              <>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-900">
                    <span className="mr-2 text-xs text-zinc-400">
                      {index + 1}.
                    </span>
                    {program.name}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-zinc-900">
                  {formatCurrency(program.amount)}
                </span>
              </>
            );

            return (
              <li key={`${title}-${program.id}`}>
                {program.customerId ? (
                  <Link
                    href={`/dashboard/customer/${program.customerId}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-zinc-50 sm:px-5"
                  >
                    {content}
                  </Link>
                ) : (
                  <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                    {content}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function MonthReportPanel({ months }) {
  const maxValue = Math.max(
    1,
    ...months.flatMap((row) => [
      row.totalBilled,
      row.totalCollectible,
      row.totalPaid,
    ]),
  );

  const series = [
    { key: "totalBilled", label: "Billed", barClass: "bg-red-400" },
    {
      key: "totalCollectible",
      label: "Collectible",
      barClass: "bg-amber-400",
    },
    { key: "totalPaid", label: "Paid", barClass: "bg-emerald-500" },
  ];

  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-zinc-100 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">
            3-Month Report
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Billed, collectible, and paid for the last 3 months
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-[11px] font-medium text-zinc-600">
          {series.map((item) => (
            <span key={item.key} className="inline-flex items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full ${item.barClass}`}
                aria-hidden
              />
              {item.label}
            </span>
          ))}
        </div>
      </div>

      {months.length === 0 ? (
        <EmptyList
          title="No monthly activity"
          description="Month totals will appear once invoices are billed or paid."
        />
      ) : (
        <ul className="divide-y divide-zinc-100 px-4 py-2 sm:px-6">
          {months.map((row) => (
            <li key={row.month} className="py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold tabular-nums text-zinc-700">
                  {row.month}
                </span>
                <span className="text-[11px] tabular-nums text-zinc-500">
                  {formatCurrency(row.totalBilled)} /{" "}
                  {formatCurrency(row.totalCollectible)} /{" "}
                  {formatCurrency(row.totalPaid)}
                </span>
              </div>
              <div className="mt-2 space-y-1.5">
                {series.map((item) => {
                  const value = row[item.key];
                  const pct = Math.max(
                    0,
                    Math.min(100, (value / maxValue) * 100),
                  );
                  return (
                    <div
                      key={item.key}
                      className="h-1.5 overflow-hidden rounded-full bg-zinc-100"
                      title={`${item.label}: ${formatCurrency(value)}`}
                    >
                      <div
                        className={`h-full rounded-full ${item.barClass}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const role = cookieStore.get("auth_role")?.value;

  if (role === "driver") {
    redirect("/dashboard/bookings");
  }

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

  const [overviewResult, rankingsResult, recentResult, monthResult] =
    await Promise.all([
      fetchDashboardSection(
        `${baseUrl}/api/v1/dashboard/customer-overview`,
        fetchHeaders,
      ),
      fetchDashboardSection(
        `${baseUrl}/api/v1/dashboard/program-rankings`,
        fetchHeaders,
      ),
      fetchDashboardSection(
        `${baseUrl}/api/v1/dashboard/trip-reports/recent`,
        fetchHeaders,
      ),
      fetchDashboardSection(
        `${baseUrl}/api/v1/dashboard/month-report`,
        fetchHeaders,
      ),
    ]);

  const overview = overviewResult.ok
    ? normalizeCustomerOverview(overviewResult.data)
    : null;
  const rankings = rankingsResult.ok
    ? normalizeProgramRankings(rankingsResult.data)
    : null;
  const recentTripReports = recentResult.ok
    ? normalizeRecentTripReports(recentResult.data)
    : null;
  const months = monthResult.ok
    ? normalizeMonthReport(monthResult.data)
    : null;

  const sectionErrors = [
    overviewResult.ok ? null : `Overview: ${overviewResult.error}`,
    rankingsResult.ok ? null : `Program rankings: ${rankingsResult.error}`,
    recentResult.ok ? null : `Recent trip reports: ${recentResult.error}`,
    monthResult.ok ? null : `Month report: ${monthResult.error}`,
  ].filter(Boolean);

  const kpis = overview
    ? [
        {
          label: "Total Programs",
          value: overview.totalPrograms.toLocaleString("en-US"),
          hint: "All programs",
          href: "/dashboard/customer",
          icon: kpiIcons.programs,
        },
        {
          label: "Purchase Order Amount",
          value: formatCurrency(overview.totalPurchaseOrderAmount),
          hint: "Sum of PO amounts",
          href: "/dashboard/customer",
          icon: kpiIcons.po,
        },
        {
          label: "Total Billed",
          value: formatCurrency(overview.totalBilled),
          hint: "Attached trip reports on PO invoices",
          href: "/dashboard/billing",
          icon: kpiIcons.billed,
        },
        {
          label: "Total Paid",
          value: formatCurrency(overview.totalPaid),
          hint: "Paid PO invoice trip reports",
          href: "/dashboard/billing",
          icon: kpiIcons.paid,
        },
        {
          label: "Balance to Collect",
          value: formatCurrency(overview.balanceToCollect),
          hint: "Unpaid PO invoice trip reports",
          href: "/dashboard/billing",
          icon: kpiIcons.balance,
        },
      ]
    : [];

  return (
    <div className="w-full min-w-0 pr-0 sm:pr-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            Dashboard
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Programs, collections, rankings, and recent trip reports.
          </p>
        </div>
      </div>

      {sectionErrors.length > 0 ? (
        <div className="mt-8 space-y-2">
          {sectionErrors.map((message) => (
            <SectionError key={message} message={message} />
          ))}
        </div>
      ) : null}

      {overview ? (
        <section
          className={sectionErrors.length > 0 ? "mt-4" : "mt-8"}
          aria-labelledby="kpi-heading"
        >
          <h2 id="kpi-heading" className="sr-only">
            Key Metrics
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {kpis.map((kpi) => (
              <Link
                key={kpi.label}
                href={kpi.href}
                className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-red-200 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    {kpi.label}
                  </div>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-700">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      className="h-4 w-4"
                      aria-hidden
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d={kpi.icon}
                      />
                    </svg>
                  </div>
                </div>
                <div className="mt-3 text-2xl font-semibold tabular-nums text-zinc-900">
                  {kpi.value}
                </div>
                <p className="mt-1 text-xs text-zinc-500">{kpi.hint}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {months ? (
        <section className="mt-4">
          <MonthReportPanel months={months} />
        </section>
      ) : null}

      {overview ? (
        <section className="mt-4 grid gap-4 lg:grid-cols-5">
          <div className="rounded-xl border border-zinc-200 bg-white shadow-sm lg:col-span-3">
            <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-4 py-4 sm:px-6">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900">
                  Top Customers
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Ranked by purchase-order value
                </p>
              </div>
              <Link
                href="/dashboard/customer"
                className="shrink-0 text-xs font-semibold text-red-700 hover:text-red-800"
              >
                View Customers
              </Link>
            </div>

            {overview.topCustomers.length === 0 ? (
              <EmptyList
                title="No customers with purchase orders yet"
                description="Top customers will appear here once purchase orders exist."
              />
            ) : (
              <ul className="divide-y divide-zinc-100">
                {overview.topCustomers.map((customer, index) => (
                  <li key={customer.id}>
                    <Link
                      href={`/dashboard/customer/${customer.id}`}
                      className="flex flex-col gap-2 px-4 py-3.5 transition hover:bg-zinc-50 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs text-zinc-400">
                            {index + 1}.
                          </span>
                          <span className="truncate text-sm font-medium text-zinc-900">
                            {customer.name}
                          </span>
                          {customer.type ? (
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${typeBadgeClasses(customer.type)}`}
                            >
                              {customer.type}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs text-zinc-500">
                          {customer.purchaseOrderCount.toLocaleString("en-US")}{" "}
                          purchase order
                          {customer.purchaseOrderCount === 1 ? "" : "s"}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-zinc-900">
                        {formatCurrency(customer.purchaseOrderTotal)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6 lg:col-span-2">
            <h2 className="text-sm font-semibold text-zinc-900">
              Quick Actions
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Jump into the main workflows
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <Link
                href="/dashboard/customer"
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-red-400 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-500"
              >
                Manage Customers
              </Link>
              <Link
                href="/dashboard/add-trip-report"
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
              >
                Add Trip Report
              </Link>
              <Link
                href="/dashboard/add-invoice"
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
              >
                Add Invoice
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {rankings ? (
        <section className="mt-4" aria-labelledby="program-rankings-heading">
          <div className="mb-3">
            <h2
              id="program-rankings-heading"
              className="text-sm font-semibold text-zinc-900"
            >
              Program Rankings
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Top programs by purchase-order, billed, and paid amounts
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <ProgramRankingList
              title="Top by PO Amount"
              subtitle="Up to 10 programs"
              items={rankings.topPrograms}
            />
            <ProgramRankingList
              title="Top Billed"
              subtitle="Up to 5 programs"
              items={rankings.topBilledPrograms}
            />
            <ProgramRankingList
              title="Top Paid"
              subtitle="Up to 5 programs"
              items={rankings.topPaidPrograms}
            />
          </div>
        </section>
      ) : null}

      {recentTripReports ? (
        <section className="mt-4">
          <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-4 py-4 sm:px-6">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900">
                  Recent Trip Reports
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Latest 10 reports by report date
                </p>
              </div>
              <Link
                href="/dashboard/add-trip-report"
                className="shrink-0 text-xs font-semibold text-red-700 hover:text-red-800"
              >
                Add Trip Report
              </Link>
            </div>

            {recentTripReports.length === 0 ? (
              <EmptyList
                title="No trip reports yet"
                description="Recent reports will show up here after they are created."
              />
            ) : (
              <ul className="divide-y divide-zinc-100">
                {recentTripReports.map((report) => {
                  const href =
                    report.customerId && report.purchaseOrderId
                      ? `/dashboard/customer/${report.customerId}/purchase-order/${report.purchaseOrderId}`
                      : null;
                  const rowClass =
                    "flex flex-col gap-1 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6";
                  const body = (
                    <>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-900">
                          {report.tripReportNo}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {report.driver}
                          {report.reportDate ? ` · ${report.reportDate}` : ""}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs tabular-nums text-zinc-500">
                        {[report.tripStart, report.tripEnd]
                          .filter(Boolean)
                          .join(" → ") || "—"}
                      </span>
                    </>
                  );

                  return (
                    <li key={report.id || report.tripReportNo}>
                      {href ? (
                        <Link
                          href={href}
                          className={`${rowClass} transition hover:bg-zinc-50`}
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
        </section>
      ) : null}
    </div>
  );
}
