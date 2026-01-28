import { cookies } from "next/headers";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Login cookie status:
        </p>

        <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900/40">
          {token ? (
            <div>
              <div className="font-medium">Authenticated</div>
              <div className="mt-2 text-zinc-600 dark:text-zinc-400">
                Found <span className="font-mono">auth_token</span> cookie.
                token: {token}
              </div>
            </div>
          ) : (
            <div>
              <div className="font-medium">Not authenticated</div>
              <div className="mt-2 text-zinc-600 dark:text-zinc-400">
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

