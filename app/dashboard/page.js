import { cookies } from "next/headers";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  return (
    <div className="max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-2 text-sm text-zinc-500">Overview and quick status</p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="px-6 py-5">
          <div className="text-sm font-semibold text-zinc-900">
            Authentication
          </div>
          <div className="mt-1 text-xs text-zinc-500">Login cookie status</div>
        </div>

        <div className="px-6 pb-6 text-sm">
          {token ? (
            <div>
              <div className="font-medium text-zinc-900">Authenticated</div>
              <div className="mt-2 text-zinc-600">
                Found <span className="font-mono">auth_token</span> cookie.
              </div>
              <div className="mt-3 break-all rounded-lg border border-zinc-200 bg-zinc-50 p-3 font-mono text-xs text-zinc-700">
                {token}
              </div>
            </div>
          ) : (
            <div>
              <div className="font-medium text-zinc-900">Not authenticated</div>
              <div className="mt-2 text-zinc-600">
                No <span className="font-mono">auth_token</span> cookie found.
                Please sign in from the home page.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

