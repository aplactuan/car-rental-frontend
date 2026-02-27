"use client";

import { useState } from "react";

const drivers = ["John Doe", "Jane Smith", "Alex Carter"];
const cars = ["Toyota Vios", "Honda City", "Mitsubishi Xpander"];
const createEmptyBooking = () => ({
  driver: "",
  car: "",
  startDateTime: "",
  endDateTime: "",
});

export default function TransactionsPage() {
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [bookings, setBookings] = useState([]);
  const [bookingErrors, setBookingErrors] = useState({});

  const handleTransactionSubmit = (event) => {
    event.preventDefault();

    const nextErrors = {};
    bookings.forEach((booking, index) => {
      if (
        booking.startDateTime &&
        booking.endDateTime &&
        new Date(booking.startDateTime) > new Date(booking.endDateTime)
      ) {
        nextErrors[index] =
          "Start date time should not be greater than end date time.";
      }
    });

    if (Object.keys(nextErrors).length > 0) {
      setBookingErrors(nextErrors);
      return;
    }

    setBookingErrors({});
    setCustomerName("");
    setBookings([]);
    setShowTransactionForm(false);
  };

  const handleAddBooking = () => {
    setBookings((prev) => [...prev, createEmptyBooking()]);
  };

  const handleRemoveBooking = (indexToRemove) => {
    setBookings((prev) => prev.filter((_, index) => index !== indexToRemove));
    setBookingErrors((prev) => {
      const next = {};
      Object.entries(prev).forEach(([key, value]) => {
        const index = Number(key);
        if (index < indexToRemove) next[index] = value;
        if (index > indexToRemove) next[index - 1] = value;
      });
      return next;
    });
  };

  const handleBookingChange = (indexToUpdate, field, value) => {
    setBookings((prev) =>
      prev.map((booking, index) =>
        index === indexToUpdate ? { ...booking, [field]: value } : booking
      )
    );
    setBookingErrors((prev) => {
      if (!prev[indexToUpdate]) return prev;
      const next = { ...prev };
      delete next[indexToUpdate];
      return next;
    });
  };

  return (
    <div className="max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="mt-2 text-sm text-zinc-500">
            View and manage rental transactions and billing
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowTransactionForm((prev) => !prev)}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Add Transaction
          </button>
        </div>
      </div>

      {showTransactionForm && (
        <form
          onSubmit={handleTransactionSubmit}
          className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-sm font-semibold text-zinc-900">New Transaction</h2>
          <div className="mt-4">
            <label
              htmlFor="customerName"
              className="mb-1 block text-sm font-medium text-zinc-700"
            >
              Customer Name
            </label>
            <input
              id="customerName"
              type="text"
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              required
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-300 focus:ring-2"
              placeholder="Enter customer name"
            />
          </div>
          <div className="mt-4">
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
            >
              Save Transaction
            </button>
            <button
              type="button"
              onClick={handleAddBooking}
              className="ml-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
            >
              Add Booking
            </button>
          </div>
          {bookings.map((booking, index) => (
            <div
              key={`booking-${index}`}
              className="mt-6 rounded-lg border border-zinc-200 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-zinc-900">
                  Booking {index + 1}
                </h2>
                <button
                  type="button"
                  onClick={() => handleRemoveBooking(index)}
                  className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Remove
                </button>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label
                    htmlFor={`driver-${index}`}
                    className="mb-1 block text-sm font-medium text-zinc-700"
                  >
                    Driver
                  </label>
                  <select
                    id={`driver-${index}`}
                    value={booking.driver}
                    onChange={(event) =>
                      handleBookingChange(index, "driver", event.target.value)
                    }
                    required
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-300 focus:ring-2"
                  >
                    <option value="">Select driver</option>
                    {drivers.map((driver) => (
                      <option key={driver} value={driver}>
                        {driver}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor={`car-${index}`}
                    className="mb-1 block text-sm font-medium text-zinc-700"
                  >
                    Car
                  </label>
                  <select
                    id={`car-${index}`}
                    value={booking.car}
                    onChange={(event) =>
                      handleBookingChange(index, "car", event.target.value)
                    }
                    required
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-300 focus:ring-2"
                  >
                    <option value="">Select car</option>
                    {cars.map((car) => (
                      <option key={car} value={car}>
                        {car}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor={`startDateTime-${index}`}
                    className="mb-1 block text-sm font-medium text-zinc-700"
                  >
                    Start Date Time
                  </label>
                  <input
                    id={`startDateTime-${index}`}
                    type="datetime-local"
                    value={booking.startDateTime}
                    onChange={(event) =>
                      handleBookingChange(index, "startDateTime", event.target.value)
                    }
                    required
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-300 focus:ring-2"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`endDateTime-${index}`}
                    className="mb-1 block text-sm font-medium text-zinc-700"
                  >
                    End Date Time
                  </label>
                  <input
                    id={`endDateTime-${index}`}
                    type="datetime-local"
                    value={booking.endDateTime}
                    min={booking.startDateTime || undefined}
                    onChange={(event) =>
                      handleBookingChange(index, "endDateTime", event.target.value)
                    }
                    required
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-300 focus:ring-2"
                  />
                </div>
              </div>

              {bookingErrors[index] && (
                <p className="mt-3 text-sm text-red-600" role="alert">
                  {bookingErrors[index]}
                </p>
              )}
            </div>
          ))}
        </form>
      )}

      <div className="mt-6 rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="px-6 py-5">
          <div className="text-sm font-semibold text-zinc-900">
            Transaction List
          </div>
          <div className="mt-1 text-xs text-zinc-500">0 transactions</div>
        </div>
        <div className="flex items-center justify-center px-6 pb-10">
          <p className="text-sm text-zinc-500">
            Transaction history and management will go here.
          </p>
        </div>
      </div>
    </div>
  );
}
