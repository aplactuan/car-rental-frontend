import Link from "next/link";
import { cookies } from "next/headers";
import BookingListSection from "../../../../transactions/[transaction_id]/BookingListSection";

export default async function CustomerTransactionDetailPage({ params }) {
  const resolvedParams = await params;
  const customerId = resolvedParams?.customer_id;
  const transactionId = resolvedParams?.transaction_id;

  let customerName = null;
  let transactionName = null;
  let transactionLoaded = false;
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
      transactionLoaded = true;
      const attrs = data?.data?.attributes ?? data?.attributes ?? {};
      transactionName =
        attrs?.name ??
        attrs?.transaction_name ??
        attrs?.transactionName ??
        null;
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
            const includedBooking =
              includedData.find((item) => String(item?.id) === String(booking?.id)) ??
              includedData[index];
            const includedAttributes = includedBooking?.attributes ?? {};
            const driverAttributes =
              includedBooking?.relationships?.driver?.data?.attributes ?? null;
            const carAttributes =
              includedBooking?.relationships?.car?.data?.attributes ?? null;
            const startDate = includedAttributes?.startDate;
            const endDate = includedAttributes?.endDate;
            const note = includedAttributes?.note;

            return {
              ...booking,
              attributes: {
                ...(booking?.attributes ?? {}),
                ...(startDate !== undefined ? { startDate } : {}),
                ...(endDate !== undefined ? { endDate } : {}),
                ...(note !== undefined ? { note } : {}),
                ...(driverAttributes ? { driver: driverAttributes } : {}),
                ...(carAttributes ? { car: carAttributes } : {}),
              },
              ...(startDate !== undefined ? { startDate } : {}),
              ...(endDate !== undefined ? { endDate } : {}),
              ...(note !== undefined ? { note } : {}),
              ...(driverAttributes ? { driver: driverAttributes } : {}),
              ...(carAttributes ? { car: carAttributes } : {}),
            };
          })
        : [];
    }
  }

  return (
    <div className="w-full pr-8">
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <Link
          href={
            customerId
              ? `/dashboard/customer/${customerId}`
              : "/dashboard/customer"
          }
          className="text-sm font-medium text-teal-700 transition hover:text-teal-800"
        >
          Back to customer
        </Link>

        <h1 className="mt-4 text-3xl font-bold tracking-tight">Transaction Details</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Transaction ID:{" "}
          <span className="font-medium text-zinc-900">{transactionId}</span>
        </p>
        {transactionLoaded && (
          <p className="mt-2 text-sm text-zinc-500">
            Transaction name:{" "}
            <span className="font-medium text-zinc-900">
              {transactionName != null && transactionName !== ""
                ? transactionName
                : "Unnamed transaction"}
            </span>
          </p>
        )}
        {customerName && (
          <p className="mt-2 text-sm text-zinc-500">
            Customer:{" "}
            <span className="font-medium text-zinc-900">{customerName}</span>
          </p>
        )}
      </div>

      <BookingListSection
        transactionId={transactionId}
        bookings={bookings}
      />
    </div>
  );
}
