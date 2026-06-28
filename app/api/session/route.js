import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  const role = cookieStore.get("auth_role")?.value || "";

  if (!token) {
    return NextResponse.json(
      { authenticated: false, role: null },
      { status: 401 },
    );
  }

  return NextResponse.json({
    authenticated: true,
    role: role === "driver" ? "driver" : role === "admin" ? "admin" : null,
  });
}
