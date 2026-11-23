"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-red-600 focus:ring-4 focus:ring-red-600/10";

function BrandMark({ light = false }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base font-bold shadow-sm ${
          light
            ? "bg-white text-red-700"
            : "bg-gradient-to-br from-red-400 to-red-600 text-white"
        }`}
      >
        R
      </div>
      <div className="min-w-0">
        <div
          className={`text-base font-semibold leading-tight tracking-tight ${
            light ? "text-white" : "text-zinc-900"
          }`}
        >
          RAMBO
        </div>
        <div className={`text-[11px] leading-tight ${light ? "text-red-100/80" : "text-zinc-500"}`}>
          Bennch Transport Services
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = useMemo(() => {
    return email.trim().length > 0 && password.length > 0 && !isLoading;
  }, [email, password, isLoading]);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Login failed.");
        return;
      }
      if (data?.token) {
        localStorage.setItem("auth_token", data.token);
      }
      if (data?.role) {
        localStorage.setItem("auth_role", data.role);
      } else {
        localStorage.removeItem("auth_role");
      }
      if (data?.name) {
        localStorage.setItem("auth_name", data.name);
      } else {
        localStorage.removeItem("auth_name");
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Is the backend running?");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white lg:flex">
      {/* Brand panel — desktop only */}
      <div className="relative hidden overflow-hidden bg-[#140a0a] lg:flex lg:w-[48%] lg:shrink-0 lg:flex-col lg:justify-between lg:px-12 lg:py-12 xl:w-[50%] xl:px-16">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-red-500/20 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-32 left-0 h-72 w-72 rounded-full bg-red-400/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-red-500/30 to-transparent"
          aria-hidden
        />

        <div className="relative z-10 animate-fade-in-up">
          <BrandMark light />
        </div>

        <div className="relative z-10 max-w-lg">
          <p
            className="animate-fade-in-up text-xs font-semibold uppercase tracking-[0.22em] text-red-400"
            style={{ animationDelay: "80ms" }}
          >
            Bennch Transport Services
          </p>
          <h1
            className="animate-fade-in-up mt-4 text-3xl font-semibold leading-[1.15] tracking-tight text-white xl:text-[2.5rem]"
            style={{ animationDelay: "140ms" }}
          >
            Welcome to RAMBO Dashboard!
          </h1>
          <p
            className="animate-fade-in-up mt-3 text-sm font-medium text-red-100/85"
            style={{ animationDelay: "200ms" }}
          >
            Operations and Financial Management System
          </p>

          <div
            className="animate-fade-in-up mt-8 space-y-4 border-l border-red-500/35 pl-5 text-sm leading-relaxed text-red-100/65"
            style={{ animationDelay: "280ms" }}
          >
            <p>
              RAMBO is a centralized management application exclusively designed
              for Bennch Transport Services to simplify daily operations,
              organize business transactions, and monitor financial performance.
            </p>
            <p>
              This system allows the team to efficiently manage trip reports,
              purchase orders, invoices, customer collectibles, income,
              expenses, and outstanding balances in one convenient platform.
            </p>
            <p>
              With RAMBO, Bennch Transport Services can easily track completed
              and ongoing trips, monitor payments, manage financial records, and
              generate accurate reports to support better business decisions.
            </p>
          </div>

          <div
            className="animate-fade-in-up mt-10"
            style={{ animationDelay: "360ms" }}
          >
            <p className="text-base font-semibold tracking-tight text-white">
              One Platform. Organized Operations. Smarter Financial Management.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-red-100/55">
              Making every trip, transaction, and financial record easier to
              manage.
            </p>
          </div>
        </div>

        <p
          className="relative z-10 animate-fade-in-up text-xs text-red-100/40"
          style={{ animationDelay: "420ms" }}
        >
          © 2026 Bennch Transport Services · RAMBO
        </p>
      </div>

      {/* Form panel */}
      <div className="flex min-h-screen flex-1 flex-col justify-center px-5 py-10 sm:px-10 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-sm animate-fade-in-up">
          <div className="mb-8 lg:hidden">
            <BrandMark />
            <p className="mt-5 text-sm leading-relaxed text-zinc-500">
              Operations and Financial Management System for Bennch Transport
              Services.
            </p>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-[28px]">
            Sign in
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            Access your RAMBO dashboard.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-zinc-700"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="you@company.com"
                required
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-zinc-700">
                  Password
                </label>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputClass} pr-11`}
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error ? (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="mt-0.5 h-4 w-4 shrink-0"
                  aria-hidden
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v5M12 16h.01" strokeLinecap="round" />
                </svg>
                <span>{error}</span>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={!canSubmit}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-red-400 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-red-900/10 transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Signing in…
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-zinc-400 lg:hidden">
            © 2026 Bennch Transport Services · RAMBO
          </p>
        </div>
      </div>
    </div>
  );
}
