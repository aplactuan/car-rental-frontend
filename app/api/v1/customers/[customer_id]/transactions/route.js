import { NextResponse } from "next/server";
import { cookies } from "next/headers";

async function getToken(req) {
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get("auth_token")?.value;
  const authHeader = req.headers.get("authorization") || "";
  const headerToken = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";
  return cookieToken || headerToken;
}

export async function GET(req, { params }) {
  const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!backendBase) {
    return NextResponse.json(
      { error: "Backend URL not configured." },
      { status: 500 },
    );
  }

  const token = await getToken(req);
  if (!token) {
    return NextResponse.json(
      { error: "Not authenticated. Please sign in." },
      { status: 401 },
    );
  }

  const resolvedParams = await params;
  const customerId = resolvedParams?.customer_id;

  if (!customerId) {
    return NextResponse.json(
      { error: "Customer ID is required." },
      { status: 400 },
    );
  }

  const { searchParams } = new URL(req.url);
  const perPage = searchParams.get("per_page") || "15";

  const url = new URL(
    `/api/v1/customers/${customerId}/transactions`,
    backendBase,
  );
  url.searchParams.set("per_page", perPage);

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

export async function POST(req, { params }) {
  const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!backendBase) {
    return NextResponse.json(
      { error: "Backend URL not configured." },
      { status: 500 },
    );
  }

  const token = await getToken(req);
  if (!token) {
    return NextResponse.json(
      { error: "Not authenticated. Please sign in." },
      { status: 401 },
    );
  }

  const resolvedParams = await params;
  const customerId = resolvedParams?.customer_id;

  if (!customerId) {
    return NextResponse.json(
      { error: "Customer ID is required." },
      { status: 400 },
    );
  }

  const url = new URL(
    `/api/v1/customers/${customerId}/transactions`,
    backendBase,
  );

  try {
    const res = await fetch(url.toString(), {
      method: "POST",
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
