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
  const topCustomersRaw = Array.isArray(source.topCustomers)
    ? source.topCustomers
    : Array.isArray(source.top_customers)
      ? source.top_customers
      : [];

  return {
    totalPrograms: toNumber(source.totalPrograms ?? source.total_programs),
    balanceToCollect: toNumber(
      source.balanceToCollect ?? source.balance_to_collect,
    ),
    topCustomers: topCustomersRaw.map(normalizeTopCustomer).filter((c) => c.id),
  };
}

const kpiIcons = {
  programs:
    "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
  balance:
    "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V6m0 10v2m0-12a9 9 0 100 18 9 9 0 000-18z",
};

function typeBadgeClasses(type) {
  if (type === "business") return "bg-blue-50 text-blue-700 ring-blue-200";
  if (type === "personal") return "bg-zinc-100 text-zinc-700 ring-zinc-200";
  return "bg-zinc-50 text-zinc-600 ring-zinc-200";
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

  let overview = null;
  let error = "";

  try {
    const res = await fetch(`${baseUrl}/api/v1/dashboard/customer-overview`, {
      headers: fetchHeaders,
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      error =
        data?.error ||
        data?.message ||
        `Could not load dashboard overview (${res.status}).`;
    } else {
      overview = normalizeCustomerOverview(data);
    }
  } catch {
    error = "Could not reach the server for dashboard overview.";
  }

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
            Programs, collections, and top customers by purchase-order value.
          </p>
        </div>
      </div>

      {error ? (
        <div
          className="mt-8 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {overview ? (
        <>
          <section className="mt-8" aria-labelledby="kpi-heading">
            <h2 id="kpi-heading" className="sr-only">
              Key Metrics
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
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
                <div className="px-4 py-10 text-center sm:px-6">
                  <p className="text-sm font-medium text-zinc-700">
                    No customers with purchase orders yet
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Top customers will appear here once purchase orders exist.
                  </p>
                </div>
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
                  href="/dashboard/billing"
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                >
                  Open Billing Report
                </Link>
                <Link
                  href="/dashboard/bookings"
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                >
                  View Bookings
                </Link>
              </div>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
