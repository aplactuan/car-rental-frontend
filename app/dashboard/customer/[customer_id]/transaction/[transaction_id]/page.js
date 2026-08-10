import Link from "next/link";
import { cookies } from "next/headers";
import TransactionDetailPanels from "../../../../transactions/[transaction_id]/TransactionDetailPanels";

function normalizeBookingsFromTransaction(data) {
  const bookingsData =
    data?.data?.relationships?.bookings?.data ??
    data?.relationships?.bookings?.data;
  const includedData = Array.isArray(data?.included) ? data.included : [];

  if (!Array.isArray(bookingsData)) return [];

  return bookingsData.map((booking, index) => {
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
  });
}

function TransactionHero({
  customerId,
  customerName,
  transactionId,
  transactionName,
  poNumber,
  bookingCount,
  loadError,
}) {
  const backHref = customerId
    ? `/dashboard/customer/${customerId}`
    : "/dashboard/customer";
  const displayName =
    transactionName != null && transactionName !== ""
      ? transactionName
      : "Unnamed transaction";

  return (
    <header className="shrink-0 overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm ring-1 ring-zinc-100">
      <div className="relative bg-gradient-to-br from-blue-800 via-teal-700 to-zinc-900 px-4 py-5 text-white sm:px-8">
        <div
          className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10 blur-2xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-14 left-1/4 h-28 w-28 rounded-full bg-teal-400/20 blur-2xl"
          aria-hidden
        />

        <div className="relative flex flex-col items-start justify-between gap-4 sm:flex-row">
          <div className="min-w-0">
            <Link
              href={backHref}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-100/90 transition hover:text-white"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-4 w-4"
                aria-hidden
              >
                <path
                  d="M15 18l-6-6 6-6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Back to customer
            </Link>

            <div className="mt-4 flex items-start gap-3 sm:gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  className="h-6 w-6"
                  aria-hidden
                >
                  <path
                    d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <rect x="9" y="3" width="6" height="4" rx="1" />
                  <path d="M9 12h6M9 16h4" strokeLinecap="round" />
                </svg>
              </div>
              <div className="min-w-0">
                <h1 className="break-words text-2xl font-bold tracking-tight sm:text-3xl">
                  {displayName}
                </h1>
                {customerName ? (
                  <p className="mt-1 text-sm text-blue-50/95">{customerName}</p>
                ) : (
                  <p className="mt-1 text-sm text-blue-50/80">
                    Customer transaction
                  </p>
                )}
                {poNumber ? (
                  <p className="mt-1 text-sm text-blue-100/90">
                    PO number:{" "}
                    <span className="font-medium text-white">{poNumber}</span>
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="relative flex max-w-full flex-wrap gap-2">
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
              {bookingCount} booking{bookingCount !== 1 ? "s" : ""}
            </span>
            {transactionId ? (
              <span
                className="max-w-full truncate rounded-full bg-white/10 px-3 py-1 font-mono text-xs text-blue-50/90 sm:max-w-[220px]"
                title={transactionId}
              >
                {transactionId}
              </span>
            ) : null}
          </div>
        </div>

        {loadError ? (
          <p className="relative mt-4 rounded-lg border border-red-300/40 bg-red-500/20 px-3 py-2 text-sm text-red-50">
            {loadError}
          </p>
        ) : null}
      </div>
    </header>
  );
}

export default async function CustomerTransactionDetailPage({ params }) {
  const resolvedParams = await params;
  const customerId = resolvedParams?.customer_id;
  const transactionId = resolvedParams?.transaction_id;

  let customerName = null;
  let transactionName = null;
  let poNumber = null;
  let loadError = "";
  let bookings = [];

  if (!transactionId) {
    loadError = "Transaction ID was not provided.";
  } else {
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

    const res = await fetch(`${baseUrl}/api/v1/transactions/${transactionId}`, {
      headers: cookieHeader ? { Cookie: cookieHeader } : {},
      cache: "no-store",
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      loadError =
        data?.error || data?.message || "Failed to load transaction details.";
    } else {
      const data = await res.json();
      const attrs = data?.data?.attributes ?? data?.attributes ?? {};
      transactionName =
        attrs?.name ??
        attrs?.transaction_name ??
        attrs?.transactionName ??
        null;
      poNumber = attrs?.poNumber ?? attrs?.po_number ?? null;
      customerName =
        data?.data?.attributes?.customerName ??
        data?.attributes?.customerName ??
        null;
      bookings = normalizeBookingsFromTransaction(data);
    }
  }

  const bookingCount = bookings.length;

  return (
    <div className="flex min-w-0 flex-col gap-4 pr-3 sm:pr-6 lg:h-[calc(100vh-4rem)] lg:min-h-[32rem]">
      <TransactionHero
        customerId={customerId}
        customerName={customerName}
        transactionId={transactionId}
        transactionName={transactionName}
        poNumber={poNumber}
        bookingCount={bookingCount}
        loadError={loadError}
      />

      <TransactionDetailPanels
        transactionId={transactionId}
        bookings={bookings}
      />
    </div>
  );
}
