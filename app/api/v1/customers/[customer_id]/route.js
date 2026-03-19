import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(_req, { params }) {
  const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!backendBase) {
    return NextResponse.json(
      { error: "Backend URL not configured." },
      { status: 500 },
    );
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
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

  const url = new URL(`/api/v1/customers/${customerId}`, backendBase);

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
