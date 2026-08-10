import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const dummyAnalytics = {
  kpis: [
    {
      label: "Revenue (30d)",
      value: "$48,290",
      change: "+12.4%",
      positive: true,
      icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V6m0 10v2m0-12a9 9 0 100 18 9 9 0 000-18z",
    },
    {
      label: "Active rentals",
      value: "127",
      change: "+3",
      positive: true,
      icon: "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4",
    },
    {
      label: "Bookings",
      value: "342",
      change: "−2.1%",
      positive: false,
      icon: "M8 7V5a2 2 0 114 0v2m0 0h4a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V9a2 2 0 012-2h4m0 0V5m0 7h4m-8 4h5",
    },
    {
      label: "Fleet utilization",
      value: "78%",
      change: "+5%",
      positive: true,
      icon: "M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z",
    },
  ],
  trend: [
    { label: "Mon", pct: 45 },
    { label: "Tue", pct: 62 },
    { label: "Wed", pct: 55 },
    { label: "Thu", pct: 71 },
    { label: "Fri", pct: 88 },
    { label: "Sat", pct: 92 },
    { label: "Sun", pct: 64 },
  ],
  recent: [
    { title: "Booking #1042 confirmed", time: "2h ago" },
    { title: "Vehicle returned — Sedan class", time: "5h ago" },
    { title: "New customer registered", time: "Yesterday" },
  ],
};

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const role = cookieStore.get("auth_role")?.value;

  if (role === "driver") {
    redirect("/dashboard/bookings");
  }

  return (
    <div className="w-full min-w-0 pr-0 sm:pr-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            Dashboard
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Here&apos;s what&apos;s happening across your fleet today.
          </p>
        </div>
      </div>

      <section className="mt-8" aria-labelledby="analytics-heading">
        <div className="flex items-baseline justify-between">
          <h2
            id="analytics-heading"
            className="text-sm font-semibold uppercase tracking-wide text-zinc-500"
          >
            Analytics overview
          </h2>
          <span className="text-xs text-zinc-400">Placeholder data</span>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {dummyAnalytics.kpis.map((kpi) => (
            <div
              key={kpi.label}
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
              <div className="mt-3 flex items-baseline justify-between gap-2">
                <span className="text-2xl font-semibold tabular-nums text-zinc-900">
                  {kpi.value}
                </span>
                <span
                  className={
                    kpi.positive
                      ? "text-xs font-semibold text-emerald-600"
                      : "text-xs font-semibold text-rose-600"
                  }
                >
                  {kpi.change}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-zinc-200 bg-white shadow-sm lg:col-span-2">
            <div className="border-b border-zinc-100 px-4 py-4 sm:px-6">
              <div className="text-sm font-semibold text-zinc-900">
                Booking volume
              </div>
              <div className="mt-0.5 text-xs text-zinc-500">
                Sample of the last 7 days
              </div>
            </div>
            <div className="flex h-48 items-end gap-1.5 px-4 pb-6 pt-4 sm:gap-2 sm:px-6">
              {dummyAnalytics.trend.map((bar) => (
                <div
                  key={bar.label}
                  className="group flex h-full min-h-0 flex-1 flex-col items-center justify-end gap-2"
                >
                  <span className="text-[10px] font-medium text-zinc-400 opacity-0 transition group-hover:opacity-100">
                    {bar.pct}%
                  </span>
                  <div
                    className="w-full max-w-12 rounded-t-md bg-red-100 transition-colors group-hover:bg-red-500"
                    style={{
                      height: `${(bar.pct / 100) * 9}rem`,
                    }}
                    title={`${bar.label}: ${bar.pct}% (dummy)`}
                  />
                  <span className="text-[10px] font-medium text-zinc-500">
                    {bar.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-100 px-4 py-4 sm:px-6">
              <div className="text-sm font-semibold text-zinc-900">
                Recent activity
              </div>
              <div className="mt-0.5 text-xs text-zinc-500">
                Sample events
              </div>
            </div>
            <ul className="divide-y divide-zinc-100 px-4 py-2 sm:px-6">
              {dummyAnalytics.recent.map((item) => (
                <li
                  key={item.title}
                  className="flex items-start gap-3 py-3 first:pt-3.5 last:pb-1"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" aria-hidden />
                  <div className="min-w-0">
                    <span className="block text-sm text-zinc-700">{item.title}</span>
                    <span className="block text-xs text-zinc-400">{item.time}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
