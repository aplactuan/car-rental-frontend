import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const placeholder = {
  kpis: [
    {
      label: "Open purchase orders",
      value: "18",
      hint: "Pending review",
      href: "/dashboard/customer",
      icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
    },
    {
      label: "Unpaid invoices",
      value: "12",
      hint: "Issued & partial",
      href: "/dashboard/billing",
      icon: "M9 12h6m-6 4h6M8 6h8a2 2 0 012 2v12a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2z",
    },
    {
      label: "Outstanding balance",
      value: "PHP 486,200",
      hint: "Across all customers",
      href: "/dashboard/billing",
      icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V6m0 10v2m0-12a9 9 0 100 18 9 9 0 000-18z",
    },
    {
      label: "Missing trip reports",
      value: "7",
      hint: "Invoices awaiting reports",
      href: "/dashboard/customer",
      icon: "M9 17v-2a2 2 0 012-2h2a2 2 0 012 2v2m-6 0h6M8 7h8M8 11h5",
    },
  ],
  attention: [
    {
      type: "Purchase order",
      title: "PO-1042 · Acme Logistics",
      meta: "Pending · PHP 85,000",
      age: "2 days",
      tone: "amber",
    },
    {
      type: "Invoice",
      title: "INV-26050123 · Vista Tours",
      meta: "Overdue · PHP 42,500 remaining",
      age: "5 days",
      tone: "rose",
    },
    {
      type: "Trip report",
      title: "INV-26050098 · Baroch School",
      meta: "Issued · no trip report yet",
      age: "1 day",
      tone: "amber",
    },
    {
      type: "Invoice",
      title: "INV-26050077 · Metro Medical",
      meta: "Partially paid · PHP 18,000 left",
      age: "3 days",
      tone: "blue",
    },
    {
      type: "Purchase order",
      title: "PO-1038 · Horizon Events",
      meta: "Pending · PHP 120,000",
      age: "Today",
      tone: "amber",
    },
  ],
  money: {
    unpaid: "PHP 486,200",
    paidMonth: "PHP 312,800",
    aging: [
      { label: "0–30 days", amount: "PHP 210,400", pct: 43 },
      { label: "31–60 days", amount: "PHP 168,200", pct: 35 },
      { label: "60+ days", amount: "PHP 107,600", pct: 22 },
    ],
    topCustomers: [
      { name: "Acme Logistics", amount: "PHP 128,000" },
      { name: "Vista Tours", amount: "PHP 96,500" },
      { name: "Horizon Events", amount: "PHP 74,200" },
    ],
  },
  activity: [
    {
      title: "Trip report added on PO-1036",
      detail: "Baroch School · 3 attachments",
      time: "2h ago",
    },
    {
      title: "Invoice INV-26050140 issued",
      detail: "Metro Medical · PHP 55,000",
      time: "5h ago",
    },
    {
      title: "Payment recorded",
      detail: "Vista Tours · PHP 20,000 on INV-26050077",
      time: "Yesterday",
    },
    {
      title: "Purchase order PO-1042 created",
      detail: "Acme Logistics · pending",
      time: "Yesterday",
    },
    {
      title: "New customer registered",
      detail: "Sunrise Catering · business",
      time: "2 days ago",
    },
  ],
};

function toneClasses(tone) {
  if (tone === "rose") return "bg-rose-50 text-rose-700 ring-rose-200";
  if (tone === "blue") return "bg-blue-50 text-blue-700 ring-blue-200";
  return "bg-amber-50 text-amber-800 ring-amber-200";
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const role = cookieStore.get("auth_role")?.value;

  if (role === "driver") {
    redirect("/dashboard/bookings");
  }

  return (
    <div className="w-full min-w-0 pr-0 sm:pr-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            Dashboard
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Customers, purchase orders, invoices, and trip reports at a glance.
          </p>
        </div>
        <span className="inline-flex w-fit items-center rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-500">
          Placeholder data
        </span>
      </div>

      {/* KPI row */}
      <section className="mt-8" aria-labelledby="kpi-heading">
        <h2 id="kpi-heading" className="sr-only">
          Key metrics
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {placeholder.kpis.map((kpi) => (
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
                    <path strokeLinecap="round" strokeLinejoin="round" d={kpi.icon} />
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

      {/* Ops + money */}
      <section className="mt-4 grid gap-4 lg:grid-cols-5">
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm lg:col-span-3">
          <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-4 py-4 sm:px-6">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">Needs attention</h2>
              <p className="mt-0.5 text-xs text-zinc-500">
                Open POs, overdue invoices, and missing trip reports
              </p>
            </div>
            <Link
              href="/dashboard/billing"
              className="shrink-0 text-xs font-semibold text-red-700 hover:text-red-800"
            >
              View billing
            </Link>
          </div>
          <ul className="divide-y divide-zinc-100">
            {placeholder.attention.map((item) => (
              <li
                key={item.title}
                className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${toneClasses(item.tone)}`}
                    >
                      {item.type}
                    </span>
                    <span className="text-xs text-zinc-400">{item.age}</span>
                  </div>
                  <p className="mt-1.5 truncate text-sm font-medium text-zinc-900">
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">{item.meta}</p>
                </div>
                <span className="text-xs font-medium text-zinc-400 sm:shrink-0">
                  Placeholder
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm lg:col-span-2">
          <div className="border-b border-zinc-100 px-4 py-4 sm:px-6">
            <h2 className="text-sm font-semibold text-zinc-900">Money snapshot</h2>
            <p className="mt-0.5 text-xs text-zinc-500">Collections and aging overview</p>
          </div>
          <div className="space-y-5 px-4 py-4 sm:px-6">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                  Outstanding
                </p>
                <p className="mt-1 text-sm font-semibold tabular-nums text-zinc-900">
                  {placeholder.money.unpaid}
                </p>
              </div>
              <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                  Paid this month
                </p>
                <p className="mt-1 text-sm font-semibold tabular-nums text-zinc-900">
                  {placeholder.money.paidMonth}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-zinc-700">Aging</p>
              <ul className="mt-2 space-y-2.5">
                {placeholder.money.aging.map((bucket) => (
                  <li key={bucket.label}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-600">{bucket.label}</span>
                      <span className="font-medium tabular-nums text-zinc-800">
                        {bucket.amount}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className="h-full rounded-full bg-red-400"
                        style={{ width: `${bucket.pct}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold text-zinc-700">
                Top outstanding customers
              </p>
              <ul className="mt-2 divide-y divide-zinc-100">
                {placeholder.money.topCustomers.map((customer, index) => (
                  <li
                    key={customer.name}
                    className="flex items-center justify-between gap-3 py-2 text-sm"
                  >
                    <span className="min-w-0 truncate text-zinc-700">
                      <span className="mr-2 text-xs text-zinc-400">{index + 1}.</span>
                      {customer.name}
                    </span>
                    <span className="shrink-0 font-medium tabular-nums text-zinc-900">
                      {customer.amount}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Activity + quick actions */}
      <section className="mt-4 grid gap-4 lg:grid-cols-5">
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm lg:col-span-3">
          <div className="border-b border-zinc-100 px-4 py-4 sm:px-6">
            <h2 className="text-sm font-semibold text-zinc-900">Recent activity</h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Sample events across POs, invoices, and trip reports
            </p>
          </div>
          <ul className="divide-y divide-zinc-100 px-4 py-2 sm:px-6">
            {placeholder.activity.map((item) => (
              <li key={item.title} className="flex items-start gap-3 py-3">
                <span
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400"
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-zinc-800">{item.title}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">{item.detail}</p>
                </div>
                <span className="shrink-0 text-xs text-zinc-400">{item.time}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6 lg:col-span-2">
          <h2 className="text-sm font-semibold text-zinc-900">Quick actions</h2>
          <p className="mt-0.5 text-xs text-zinc-500">Jump into the main workflows</p>
          <div className="mt-4 flex flex-col gap-2">
            <Link
              href="/dashboard/customer"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-red-400 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-500"
            >
              Manage customers
            </Link>
            <Link
              href="/dashboard/billing"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
            >
              Open billing report
            </Link>
            <Link
              href="/dashboard/bookings"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
            >
              View bookings
            </Link>
          </div>
          <p className="mt-5 text-xs leading-relaxed text-zinc-400">
            These numbers are placeholders. Wire them to purchase orders, bills, and
            trip reports when you&apos;re ready.
          </p>
        </div>
      </section>
    </div>
  );
}
