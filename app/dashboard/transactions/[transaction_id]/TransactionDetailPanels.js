"use client";

import { useCallback, useState } from "react";
import BillingSection from "./BillingSection";
import BookingListSection from "./BookingListSection";

export default function TransactionDetailPanels({ transactionId, bookings }) {
  // Lock until billing reports whether a bill exists, so bookings stay frozen
  // during the initial bill fetch.
  const [bookingsLocked, setBookingsLocked] = useState(true);

  const handleBillChange = useCallback((bill) => {
    setBookingsLocked(Boolean(bill));
  }, []);

  return (
    <div className="grid min-w-0 gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)] lg:gap-5">
      <aside className="min-w-0 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain">
        <BillingSection
          transactionId={transactionId}
          bookings={bookings}
          onBillChange={handleBillChange}
        />
      </aside>

      <section className="relative z-10 flex min-w-0 flex-col overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm ring-1 ring-zinc-100 lg:min-h-0">
        <BookingListSection
          transactionId={transactionId}
          bookings={bookings}
          layout="panel"
          bookingsLocked={bookingsLocked}
        />
      </section>
    </div>
  );
}
