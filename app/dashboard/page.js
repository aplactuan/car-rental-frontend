import { cookies } from "next/headers";

const dummyAnalytics = {
  kpis: [
    {
      label: "Revenue (30d)",
      value: "$48,290",
      change: "+12.4%",
      positive: true,
    },
    {
      label: "Active rentals",
      value: "127",
      change: "+3",
      positive: true,
    },
    {
      label: "Bookings",
      value: "342",
      change: "−2.1%",
      positive: false,
    },
    {
      label: "Fleet utilization",
      value: "78%",
      change: "+5%",
      positive: true,
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
  const token = cookieStore.get("auth_token")?.value;

  return (
    <div className="w-full pr-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-2 text-sm text-zinc-500">Overview and quick status</p>
        </div>
      </div>

      <section className="mt-8" aria-labelledby="analytics-heading">
        <h2
          id="analytics-heading"
          className="text-lg font-semibold tracking-tight text-zinc-900"
        >
          Analytics
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Placeholder metrics — replace with live data when wired up.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {dummyAnalytics.kpis.map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
            >
              <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                {kpi.label}
              </div>
              <div className="mt-2 flex items-baseline justify-between gap-2">
                <span className="text-2xl font-semibold tabular-nums text-zinc-900">
                  {kpi.value}
                </span>
                <span
                  className={
                    kpi.positive
                      ? "text-xs font-medium text-emerald-600"
                      : "text-xs font-medium text-rose-600"
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
            <div className="border-b border-zinc-100 px-6 py-4">
              <div className="text-sm font-semibold text-zinc-900">
                Booking volume
              </div>
              <div className="mt-0.5 text-xs text-zinc-500">
                Dummy last 7 days
              </div>
            </div>
            <div className="flex h-48 items-end gap-2 px-6 pb-6 pt-4">
              {dummyAnalytics.trend.map((bar) => (
                <div
                  key={bar.label}
                  className="flex h-full min-h-0 flex-1 flex-col items-center justify-end gap-2"
                >
                  <div
                    className="w-full max-w-12 rounded-t-md bg-zinc-200 transition-colors hover:bg-zinc-300"
                    style={{
                      height: `${(bar.pct / 100) * 11}rem`,
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
            <div className="border-b border-zinc-100 px-6 py-4">
              <div className="text-sm font-semibold text-zinc-900">
                Recent activity
              </div>
              <div className="mt-0.5 text-xs text-zinc-500">
                Sample events
              </div>
            </div>
            <ul className="divide-y divide-zinc-100 px-6 py-2">
              {dummyAnalytics.recent.map((item) => (
                <li
                  key={item.title}
                  className="flex flex-col gap-0.5 py-3 first:pt-1 last:pb-1"
                >
                  <span className="text-sm text-zinc-800">{item.title}</span>
                  <span className="text-xs text-zinc-500">{item.time}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      
    </div>
  );
}

