"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { href: "/dashboard/customer", label: "Customer", icon: "M17 20h5V4H2v16h5m10 0v-2a4 4 0 00-4-4H11a4 4 0 00-4 4v2m10 0H7m10-11a4 4 0 11-8 0 4 4 0 018 0z" },
  { href: "/dashboard/drivers", label: "Drivers", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  { href: "/dashboard/cars", label: "Cars", icon: "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" },
  { href: "/dashboard/bookings", label: "Bookings", icon: "M8 7V5a2 2 0 114 0v2m0 0h4a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V9a2 2 0 012-2h4m0 0V5m0 7h4m-8 4h8" },
  { href: "/dashboard/transactions", label: "Transactions", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" },
  { href: "/dashboard/billing", label: "Billing report", icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" },
];

const accountNavItem = {
  href: "/dashboard/account",
  label: "Change password",
  icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState("admin");
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const drawerRef = useRef(null);
  const menuButtonRef = useRef(null);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    let isCurrent = true;

    async function fetchSessionRole() {
      try {
        const res = await fetch("/api/session", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!isCurrent) return;
        if (res.ok && data?.role) {
          setRole(data.role === "driver" ? "driver" : "admin");
          return;
        }
      } catch {
        // Fall back to local storage role.
      }

      if (typeof window !== "undefined" && isCurrent) {
        const localRole = localStorage.getItem("auth_role");
        setRole(localRole === "driver" ? "driver" : "admin");
      }
    }

    fetchSessionRole();

    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    if (!isMobileOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    const menuButton = menuButtonRef.current;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function closeOnEscape(event) {
      if (event.key === "Escape") setIsMobileOpen(false);
      if (event.key !== "Tab") return;

      const focusable = drawerRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
      menuButton?.focus();
    };
  }, [isMobileOpen]);

  const visibleNavItems = useMemo(() => {
    if (role === "driver") {
      return navItems.filter((item) => item.href === "/dashboard/bookings");
    }
    return navItems;
  }, [role]);

  async function handleLogout() {
    try {
      await fetch("/api/logout", { method: "POST" });
      if (typeof window !== "undefined") {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_role");
      }
      router.push("/");
      router.refresh();
    } catch {
      if (typeof window !== "undefined") {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_role");
      }
      router.push("/");
      router.refresh();
    }
  }

  const navigation = (
    <>
      <div className="px-5 pb-5 pt-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-3"
          onClick={() => setIsMobileOpen(false)}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-red-400 to-red-600 text-sm font-bold text-white shadow-sm">
            R
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold leading-tight tracking-tight text-white">
              Rambo App
            </div>
            <div className="mt-0.5 truncate text-[11px] leading-tight text-zinc-500">
              Fleet Management System
            </div>
          </div>
        </Link>
        {role === "driver" ? (
          <span className="mt-3 inline-flex items-center rounded-full border border-red-400/30 bg-red-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-red-300">
            Driver mode
          </span>
        ) : null}
      </div>
      <div className="mx-5 border-t border-white/10" />
      <nav className="flex-1 overflow-y-auto px-3 pt-4">
        {visibleNavItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMobileOpen(false)}
              className={`group relative mb-1 flex min-h-11 items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-red-400/15 text-white"
                  : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
              }`}
            >
              {isActive ? (
                <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-red-400" aria-hidden />
              ) : null}
              <svg
                className={`h-5 w-5 shrink-0 transition-colors ${
                  isActive ? "text-red-400" : "text-zinc-500 group-hover:text-zinc-300"
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={item.icon}
                />
              </svg>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-3 pt-2">
        <div className="mx-1 mb-2 border-t border-white/10 pt-3 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
          Account
        </div>
        <Link
          href={accountNavItem.href}
          onClick={() => setIsMobileOpen(false)}
          className={`group relative mb-1 flex min-h-11 items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors ${
            pathname === accountNavItem.href
              ? "bg-red-400/15 text-white"
              : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
          }`}
        >
          {pathname === accountNavItem.href ? (
            <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-red-400" aria-hidden />
          ) : null}
          <svg
            className={`h-5 w-5 shrink-0 transition-colors ${
              pathname === accountNavItem.href ? "text-red-400" : "text-zinc-500 group-hover:text-zinc-300"
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={accountNavItem.icon}
            />
          </svg>
          {accountNavItem.label}
        </Link>
      </div>
      <div className="mt-auto px-3 pb-5">
        <button
          ref={menuButtonRef}
          type="button"
          onClick={handleLogout}
          className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-100"
        >
          <svg
            className="h-5 w-5 shrink-0 text-zinc-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          Logout
        </button>
        <div className="mt-5 px-2 text-[11px] text-zinc-600">© 2026 Rambo App</div>
      </div>
    </>
  );

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-white/10 bg-[#0B0F14] px-4 text-white lg:hidden">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5" onClick={() => setIsMobileOpen(false)}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-red-400 to-red-600 text-xs font-bold text-white">
            R
          </div>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold leading-tight">Rambo App</span>
            <span className="block truncate text-[10px] leading-tight text-zinc-500">Fleet Management System</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setIsMobileOpen(true)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 text-zinc-200 transition hover:bg-white/10"
          aria-label="Open navigation"
          aria-controls="mobile-dashboard-navigation"
          aria-expanded={isMobileOpen}
        >
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>

      <aside className="relative z-0 hidden w-64 shrink-0 flex-col border-r border-white/10 bg-[#0B0F14] lg:flex">
        {navigation}
      </aside>

      {isMobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/55"
            onClick={() => setIsMobileOpen(false)}
            aria-label="Close navigation"
          />
          <aside
            ref={drawerRef}
            id="mobile-dashboard-navigation"
            className="relative flex h-full w-[min(18rem,88vw)] flex-col bg-[#0B0F14] shadow-2xl"
            aria-label="Dashboard navigation"
          >
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => setIsMobileOpen(false)}
              className="absolute right-3 top-3 z-10 inline-flex h-11 w-11 items-center justify-center rounded-lg text-zinc-300 hover:bg-white/10 hover:text-white"
              aria-label="Close navigation"
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
                <path d="M6 6l12 12M18 6 6 18" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            {navigation}
          </aside>
        </div>
      ) : null}
    </>
  );
}
