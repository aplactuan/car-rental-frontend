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

export async function DELETE(req, { params }) {
  const resolvedParams = await params;
  const transactionId = resolvedParams?.transaction_id;
  const billPaymentId = resolvedParams?.bill_payment_id;

  if (!transactionId) {
    return NextResponse.json(
      { error: "Transaction ID is required." },
      { status: 400 },
    );
  }

  if (!billPaymentId) {
    return NextResponse.json(
      { error: "Bill payment ID is required." },
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
    `/api/v1/transactions/${transactionId}/bill/payments/${billPaymentId}`,
    backendBase,
  );

  try {
    const res = await fetch(url.toString(), {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

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
