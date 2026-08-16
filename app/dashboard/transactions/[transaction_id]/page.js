import Link from "next/link";
import { cookies } from "next/headers";
import TransactionDetailPanels from "./TransactionDetailPanels";

export default async function TransactionDetailPage({ params }) {
  const resolvedParams = await params;
  const transactionId = resolvedParams?.transaction_id;

  let customerName = null;
  let bookings = [];
  if (transactionId) {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");
    const res = await fetch(
      `${baseUrl}/api/v1/transactions/${transactionId}`,
      {
        headers: cookieHeader ? { Cookie: cookieHeader } : {},
        cache: "no-store",
      },
    );
    if (res.ok) {
      const data = await res.json();
      customerName =
        data?.data?.attributes?.customerName ??
        data?.attributes?.customerName ??
        null;
      const bookingsData =
        data?.data?.relationships?.bookings?.data ??
        data?.relationships?.bookings?.data;
      const includedData = Array.isArray(data?.included) ? data.included : [];
      bookings = Array.isArray(bookingsData)
        ? bookingsData.map((booking, index) => {
            const bookingIncluded = includedData.filter(
              (item) =>
                !item?.type || item.type === "bookings" || item.type === "booking",
            );
            const includedBooking =
              bookingIncluded.find((item) => String(item?.id) === String(booking?.id)) ??
              bookingIncluded[index];
            const includedAttributes = includedBooking?.attributes ?? {};
            const includedRelationships = includedBooking?.relationships ?? {};
            const driverRef = includedRelationships?.driver?.data ?? null;
            const carRef = includedRelationships?.car?.data ?? null;
            const driverAttributes =
              driverRef?.attributes ??
              includedBooking?.relationships?.driver?.data?.attributes ??
              null;
            const carAttributes =
              carRef?.attributes ??
              includedBooking?.relationships?.car?.data?.attributes ??
              null;
            const startDate = includedAttributes?.startDate;
            const endDate = includedAttributes?.endDate;
            const note = includedAttributes?.note;
            const price = includedAttributes?.price;
            const driverId = driverRef?.id != null ? String(driverRef.id) : undefined;
            const carId = carRef?.id != null ? String(carRef.id) : undefined;

            return {
              ...booking,
              relationships: {
                ...(booking?.relationships ?? {}),
                ...(driverRef ? { driver: { data: driverRef } } : {}),
                ...(carRef ? { car: { data: carRef } } : {}),
              },
              attributes: {
                ...(booking?.attributes ?? {}),
                ...(startDate !== undefined ? { startDate } : {}),
                ...(endDate !== undefined ? { endDate } : {}),
                ...(note !== undefined ? { note } : {}),
                ...(price !== undefined ? { price } : {}),
                ...(driverId !== undefined ? { driverId } : {}),
                ...(carId !== undefined ? { carId } : {}),
                ...(driverAttributes ? { driver: driverAttributes } : {}),
                ...(carAttributes ? { car: carAttributes } : {}),
              },
              ...(startDate !== undefined ? { startDate } : {}),
              ...(endDate !== undefined ? { endDate } : {}),
              ...(note !== undefined ? { note } : {}),
              ...(price !== undefined ? { price } : {}),
              ...(driverId !== undefined ? { driverId } : {}),
              ...(carId !== undefined ? { carId } : {}),
              ...(driverAttributes ? { driver: driverAttributes } : {}),
              ...(carAttributes ? { car: carAttributes } : {}),
            };
          })
        : [];
    }
  }

  const bookingCount = bookings.length;

  return (
    <div className="flex min-w-0 flex-col gap-4 pr-3 sm:pr-6 lg:h-[calc(100vh-4rem)] lg:min-h-[32rem]">
      <header className="shrink-0 overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm ring-1 ring-zinc-100">
        <div className="bg-gradient-to-r from-red-800 via-red-900 to-zinc-900 px-4 py-5 text-white sm:px-6">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
            <div className="min-w-0">
              <Link
                href="/dashboard/transactions"
                className="text-xs font-medium text-red-100/90 transition hover:text-white"
              >
                ← Back to Transactions
              </Link>
              <h1 className="mt-2 break-words text-2xl font-bold tracking-tight sm:text-3xl">
                Transaction
              </h1>
              {customerName ? (
                <p className="mt-1 text-sm text-red-50/95">{customerName}</p>
              ) : null}
            </div>
            <div className="flex max-w-full flex-wrap gap-2">
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                {bookingCount} booking{bookingCount !== 1 ? "s" : ""}
              </span>
              <span
                className="max-w-full truncate rounded-full bg-white/10 px-3 py-1 font-mono text-xs text-red-50/90 sm:max-w-[220px]"
                title={transactionId}
              >
                {transactionId}
              </span>
            </div>
          </div>
        </div>
      </header>

      <TransactionDetailPanels
        transactionId={transactionId}
        bookings={bookings}
      />
    </div>
  );
}
