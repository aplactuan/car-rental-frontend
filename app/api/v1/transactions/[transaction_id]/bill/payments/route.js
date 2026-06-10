import { NextResponse } from "next/server";
import { cookies } from "next/headers";

async function getAuthToken(req) {
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get("auth_token")?.value;
  const authHeader = req.headers.get("authorization") || "";
  const headerToken = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";

  return cookieToken || headerToken;
}

function getBackendBase() {
  return process.env.NEXT_PUBLIC_BACKEND_URL;
}

function buildPaymentsUrl(transactionId, backendBase) {
  return new URL(`/api/v1/transactions/${transactionId}/bill/payments`, backendBase);
}

export async function GET(req, { params }) {
  const resolvedParams = await params;
  const transactionId = resolvedParams?.transaction_id;

  if (!transactionId) {
    return NextResponse.json(
      { error: "Transaction ID is required." },
      { status: 400 },
    );
  }

  const backendBase = getBackendBase();
  if (!backendBase) {
    return NextResponse.json(
      { error: "Backend URL not configured." },
      { status: 500 },
    );
  }

  const token = await getAuthToken(req);
  if (!token) {
    return NextResponse.json(
      { error: "Not authenticated. Please sign in." },
      { status: 401 },
    );
  }

  try {
    const res = await fetch(buildPaymentsUrl(transactionId, backendBase).toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
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
  const resolvedParams = await params;
  const transactionId = resolvedParams?.transaction_id;

  if (!transactionId) {
    return NextResponse.json(
      { error: "Transaction ID is required." },
      { status: 400 },
    );
  }

  const backendBase = getBackendBase();
  if (!backendBase) {
    return NextResponse.json(
      { error: "Backend URL not configured." },
      { status: 500 },
    );
  }

  const token = await getAuthToken(req);
  if (!token) {
    return NextResponse.json(
      { error: "Not authenticated. Please sign in." },
      { status: 401 },
    );
  }

  let formData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid multipart form body." },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(buildPaymentsUrl(transactionId, backendBase).toString(), {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: formData,
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
