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

async function proxyToBackend(req, transactionId, bookingId, tripReportId, method) {
  if (!transactionId || !bookingId || !tripReportId) {
    return NextResponse.json(
      { error: "Transaction ID, booking ID, and trip report ID are required." },
      { status: 400 },
    );
  }

  const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL;
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

  const url = new URL(
    `/api/v1/transactions/${transactionId}/bookings/${bookingId}/trip-reports/${tripReportId}`,
    backendBase,
  );

  const init = {
    method,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  };

  if (method === "PUT") {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    init.headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(url.toString(), init);

    if (res.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { error: "Could not reach backend server." },
      { status: 502 },
    );
  }
}

export async function GET(req, { params }) {
  const resolvedParams = await params;
  return proxyToBackend(
    req,
    resolvedParams?.transaction_id,
    resolvedParams?.booking_id,
    resolvedParams?.trip_report_id,
    "GET",
  );
}

export async function PUT(req, { params }) {
  const resolvedParams = await params;
  return proxyToBackend(
    req,
    resolvedParams?.transaction_id,
    resolvedParams?.booking_id,
    resolvedParams?.trip_report_id,
    "PUT",
  );
}

export async function DELETE(req, { params }) {
  const resolvedParams = await params;
  return proxyToBackend(
    req,
    resolvedParams?.transaction_id,
    resolvedParams?.booking_id,
    resolvedParams?.trip_report_id,
    "DELETE",
  );
}
