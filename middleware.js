import { NextResponse } from "next/server";

export function middleware(request) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/dashboard")) {
    const token = request.cookies.get("auth_token")?.value;
    const role = request.cookies.get("auth_role")?.value;

    if (!token) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    if (!role) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    const isDriver = role === "driver";
    const isBookingsPage =
      pathname === "/dashboard/bookings" ||
      pathname.startsWith("/dashboard/bookings/");

    if (isDriver && !isBookingsPage) {
      return NextResponse.redirect(new URL("/dashboard/bookings", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
