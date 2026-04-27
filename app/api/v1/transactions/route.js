import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(req) {
  const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!backendBase) {
    return NextResponse.json(
      { error: "Backend URL not configured." },
      { status: 500 },
    );
  }

  const cookieStore = await cookies();
  const cookieToken = cookieStore.get("auth_token")?.value;
  const authHeader = req.headers.get("authorization") || "";
  const headerToken = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";
  const token = cookieToken || headerToken;
  if (!token) {
    return NextResponse.json(
      { error: "Not authenticated. Please sign in." },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(req.url);
  const url = new URL("/api/v1/transactions", backendBase);
  searchParams.forEach((value, key) => url.searchParams.set(key, value));

  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { error: "Could not reach backend server." },
      { status: 502 },
    );
  }
}

export async function POST(req) {
  const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!backendBase) {
    return NextResponse.json(
      { error: "Backend URL not configured." },
      { status: 500 },
    );
  }

  const cookieStore = await cookies();
  const cookieToken = cookieStore.get("auth_token")?.value;
  const authHeader = req.headers.get("authorization") || "";
  const headerToken = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";
  const token = cookieToken || headerToken;
  if (!token) {
    return NextResponse.json(
      { error: "Not authenticated. Please sign in." },
      { status: 401 },
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const url = new URL("/api/v1/transactions", backendBase);
  try {
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { error: "Could not reach backend server." },
      { status: 502 },
    );
  }
}
