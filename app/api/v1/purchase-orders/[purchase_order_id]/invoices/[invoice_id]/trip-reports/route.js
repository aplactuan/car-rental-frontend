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

async function resolveAuth(req, params) {
  const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!backendBase) {
    return {
      error: NextResponse.json(
        { error: "Backend URL not configured." },
        { status: 500 },
      ),
    };
  }

  const token = await getToken(req);
  if (!token) {
    return {
      error: NextResponse.json(
        { error: "Not authenticated. Please sign in." },
        { status: 401 },
      ),
    };
  }

  const resolvedParams = await params;
  const purchaseOrderId = resolvedParams?.purchase_order_id;
  const invoiceId = resolvedParams?.invoice_id;

  if (!purchaseOrderId) {
    return {
      error: NextResponse.json(
        { error: "Purchase order ID is required." },
        { status: 400 },
      ),
    };
  }

  if (!invoiceId) {
    return {
      error: NextResponse.json(
        { error: "Invoice ID is required." },
        { status: 400 },
      ),
    };
  }

  const url = new URL(
    `/api/v1/purchase-orders/${purchaseOrderId}/invoices/${invoiceId}/trip-reports`,
    backendBase,
  );

  return { token, url };
}

export async function POST(req, { params }) {
  const auth = await resolveAuth(req, params);
  if (auth.error) return auth.error;

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(auth.url.toString(), {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.token}`,
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

export async function DELETE(req, { params }) {
  const auth = await resolveAuth(req, params);
  if (auth.error) return auth.error;

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(auth.url.toString(), {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.token}`,
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
