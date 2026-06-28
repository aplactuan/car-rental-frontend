import { NextResponse } from "next/server";

function normalizeRole(value) {
  const role = String(value || "").trim().toLowerCase();
  if (role === "admin") return "admin";
  if (role === "driver" || role === "user") return "driver";
  return "";
}

async function fetchCurrentUser(backendBase, token) {
  try {
    const userRes = await fetch(new URL("/api/user", backendBase).toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!userRes.ok) return null;
    return userRes.json().catch(() => null);
  } catch {
    return null;
  }
}

export async function POST(req) {
  const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!backendBase) {
    return NextResponse.json(
      {
        error:
          "Missing NEXT_PUBLIC_BACKEND_URL. Set it (e.g. http://localhost:4000) and restart `npm run dev`.",
      },
      { status: 500 },
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = body?.email;
  const password = body?.password;
  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 },
    );
  }

  const url = new URL("/api/login", backendBase);

  let upstreamRes;
  try {
    upstreamRes = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    return NextResponse.json(
      { error: "Could not reach backend server." },
      { status: 502 },
    );
  }

  const upstreamJson = await upstreamRes.json().catch(() => ({}));

  if (!upstreamRes.ok) {
    return NextResponse.json(
      { error: upstreamJson?.error || upstreamJson?.message || "Login failed." },
      { status: upstreamRes.status },
    );
  }

  // Extract token from response - handle nested data.token structure
  const token =
    upstreamJson?.data?.token ||
    upstreamJson?.token ||
    upstreamJson?.accessToken ||
    upstreamJson?.jwt;

  if (!token) {
    return NextResponse.json(
      { error: "Login succeeded but no token was returned by backend." },
      { status: 502 },
    );
  }

  const currentUser = await fetchCurrentUser(backendBase, token);
  const resolvedRole =
    normalizeRole(
      upstreamJson?.data?.user?.role ??
        upstreamJson?.user?.role ??
        upstreamJson?.data?.role ??
        upstreamJson?.role ??
      currentUser?.data?.role ??
        currentUser?.role ??
        currentUser?.data?.attributes?.role,
    );

  if (!resolvedRole) {
    return NextResponse.json(
      {
        error:
          "Login succeeded but user role could not be resolved. Please check backend user payload.",
      },
      { status: 502 },
    );
  }

  const res = NextResponse.json({ ok: true, token, role: resolvedRole });

  res.cookies.set("auth_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  res.cookies.set("auth_role", resolvedRole, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return res;
}
