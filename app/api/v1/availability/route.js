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
  const token = cookieStore.get("auth_token")?.value;
  if (!token) {
    return NextResponse.json(
      { error: "Not authenticated. Please sign in." },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (!type || !start || !end) {
    return NextResponse.json(
      { error: "type, start, and end parameters are required." },
      { status: 400 },
    );
  }

  if (!["car", "driver"].includes(type)) {
    return NextResponse.json(
      { error: "type must be 'car' or 'driver'." },
      { status: 400 },
    );
  }

  const url = new URL("/api/v1/availability", backendBase);
  url.searchParams.set("type", type);
  url.searchParams.set("start", start);
  url.searchParams.set("end", end);

  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { error: "Could not reach backend server." },
      { status: 502 },
    );
  }
}
