import { NextResponse } from "next/server";
import { cookies } from "next/headers";

function pickDisplayName(payload) {
  const attrs = payload?.data?.attributes ?? payload?.attributes ?? {};
  const user = payload?.data ?? payload?.user ?? payload ?? {};

  const candidates = [
    attrs?.name,
    attrs?.full_name,
    attrs?.fullName,
    user?.name,
    user?.full_name,
    user?.fullName,
    [attrs?.first_name ?? attrs?.firstName, attrs?.last_name ?? attrs?.lastName]
      .filter(Boolean)
      .join(" "),
    [
      user?.first_name ?? user?.firstName,
      user?.last_name ?? user?.lastName,
    ]
      .filter(Boolean)
      .join(" "),
    attrs?.email,
    user?.email,
  ];

  for (const value of candidates) {
    const cleaned = String(value || "").trim();
    if (!cleaned) continue;
    if (cleaned.includes("@")) {
      const local = cleaned.split("@")[0]?.trim();
      if (local) return local;
    }
    return cleaned;
  }

  return "";
}

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  const role = cookieStore.get("auth_role")?.value || "";

  if (!token) {
    return NextResponse.json(
      { authenticated: false, role: null, name: null },
      { status: 401 },
    );
  }

  const normalizedRole =
    role === "driver" ? "driver" : role === "admin" ? "admin" : null;

  let name = "";
  const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (backendBase) {
    try {
      const userRes = await fetch(new URL("/api/user", backendBase).toString(), {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });
      if (userRes.ok) {
        const userJson = await userRes.json().catch(() => ({}));
        name = pickDisplayName(userJson);
      }
    } catch {
      // Keep session valid even if /api/user is unreachable.
    }
  }

  return NextResponse.json({
    authenticated: true,
    role: normalizedRole,
    name: name || null,
  });
}
