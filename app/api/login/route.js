import { NextResponse } from "next/server";

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

  const url = new URL("/auth/login", backendBase);

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

  const token =
    upstreamJson?.token || upstreamJson?.accessToken || upstreamJson?.jwt;

  const res = NextResponse.json({ ok: true });

  if (token) {
    res.cookies.set("auth_token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
  }

  return res;
}

