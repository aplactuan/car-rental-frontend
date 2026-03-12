"use client";

import { useState, useEffect } from "react";

function getArray(response) {
  const raw = response?.data ?? response;
  return Array.isArray(raw) ? raw : raw?.data ?? [];
}

function normalizeDrivers(response) {
  return getArray(response).map((item) => {
    const attrs = item.attributes ?? {};
    const label = [attrs.firstName, attrs.lastName].filter(Boolean).join(" - ") || String(item.id ?? "");
    return { id: item.id ?? attrs.id, label };
  });
}

function normalizeCars(response) {
  return getArray(response).map((item) => {
    const attrs = item.attributes ?? {};
    const label = [attrs.make, attrs.model, attrs.plateNumber].filter(Boolean).join(" - ") || String(item.id ?? "");
    return { id: item.id ?? attrs.id, label };
  });
}

function toDisplayBooking(raw) {
  const attrs = raw?.attributes ?? raw?.data?.attributes ?? raw ?? {};
  const driver = attrs.driver ?? attrs.driverName ?? "";
  const car = attrs.car ?? attrs.carInfo ?? "";
  const startDate = attrs.startDate ?? attrs.start_date ?? attrs.startsAt ?? "";
  const endDate = attrs.endDate ?? attrs.end_date ?? attrs.endsAt ?? "";
  const note = attrs.note ?? "";
  return {
    id: raw?.id ?? attrs.id ?? crypto.randomUUID(),
    startTime: attrs.startTime ?? attrs.start_time ?? startDate ?? "-",
    endTime: attrs.endTime ?? attrs.end_time ?? endDate ?? "-",
    startDate: startDate || "-",
    endDate: endDate || "-",
    note: String(note || "-"),
    driver: typeof driver === "object" ? [driver.firstName, driver.lastName].filter(Boolean).join(" ") : String(driver || "-"),
    car: typeof car === "object" ? [car.make, car.model, car.plateNumber].filter(Boolean).join(" - ") : String(car || "-"),
  };
}

export default function BookingListSection({
  transactionId,
  bookings: initialBookings,
}) {
  const [showForm, setShowForm] = useState(false);
  const [drivers, setDrivers] = useState([]);
  const [cars, setCars] = useState([]);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [driverId, setDriverId] = useState("");
  const [carId, setCarId] = useState("");
  const [bookings, setBookings] = useState(() =>
    (initialBookings ?? []).map((b) =>
      typeof b === "object"
        ? toDisplayBooking(b)
        : { id: String(b), startTime: "-", endTime: "-", driver: "-", car: "-" },
    ),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");

  const isTimeValid =
    startTime &&
    endTime &&
    new Date(endTime) - new Date(startTime) >= 60 * 60 * 1000;

  useEffect(() => {
    if (!showForm || !isTimeValid) {
      setDrivers([]);
      setCars([]);
      setDriverId("");
      setCarId("");
      setAvailabilityError("");
      return;
    }

    const token = localStorage.getItem("auth_token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const params = new URLSearchParams({
      start: startTime,
      end: endTime,
    });

    setIsLoadingAvailability(true);
    setAvailabilityError("");

    Promise.all([
      fetch(
        `/api/v1/availability?type=car&${params.toString()}`,
        { headers, credentials: "include" },
      ).then((r) => r.json()),
      fetch(
        `/api/v1/availability?type=driver&${params.toString()}`,
        { headers, credentials: "include" },
      ).then((r) => r.json()),
    ])
      .then(([carsRes, driversRes]) => {
        const cList = normalizeCars(carsRes);
        const dList = normalizeDrivers(driversRes);
        setCars(cList);
        setDrivers(dList);
        if (cList.length > 0) setCarId(String(cList[0]?.id ?? ""));
        if (dList.length > 0) setDriverId(String(dList[0]?.id ?? ""));
        if (carsRes?.error) setAvailabilityError(carsRes.error);
        else if (driversRes?.error) setAvailabilityError(driversRes.error);
      })
      .catch(() => {
        setAvailabilityError("Failed to load availability.");
      })
      .finally(() => {
        setIsLoadingAvailability(false);
      });
  }, [showForm, startTime, endTime, isTimeValid]);

  const handleCancel = () => {
    setShowForm(false);
    setStartTime("");
    setEndTime("");
    setDriverId("");
    setCarId("");
    setSubmitError("");
    setAvailabilityError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!transactionId) return;
    if (!isTimeValid) {
      setSubmitError("End Time must be at least 1 hour after Start Time.");
      return;
    }
    setSubmitError("");
    setIsSubmitting(true);
    const token = localStorage.getItem("auth_token");
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    try {
      const res = await fetch(
        `/api/v1/transactions/${transactionId}/book`,
        {
          method: "POST",
          headers,
          credentials: "include",
          body: JSON.stringify({
            car_id: carId,
            driver_id: driverId,
            start_date: startTime,
            end_date: endTime,
            note: "Hardcode this for now to test",
          }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitError(data?.error ?? data?.message ?? "Failed to save booking.");
        return;
      }
      const fromApi = toDisplayBooking(data?.data ?? data);
      const driverLabel = drivers.find((d) => String(d.id) === String(driverId))?.label ?? fromApi.driver;
      const carLabel = cars.find((c) => String(c.id) === String(carId))?.label ?? fromApi.car;
      const newBooking = {
        ...fromApi,
        startTime: fromApi.startTime !== "-" ? fromApi.startTime : startTime,
        endTime: fromApi.endTime !== "-" ? fromApi.endTime : endTime,
        driver: fromApi.driver !== "-" ? fromApi.driver : driverLabel,
        car: fromApi.car !== "-" ? fromApi.car : carLabel,
      };
      setBookings((prev) => [...prev, newBooking]);
      setShowForm(false);
      setStartTime("");
      setEndTime("");
      setDriverId("");
      setCarId("");
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-6 rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
        <div>
          <div className="text-sm font-semibold text-zinc-900">Booking List</div>
          <div className="mt-1 text-xs text-zinc-500">
            {bookings.length} booking{bookings.length !== 1 ? "s" : ""}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((prev) => !prev)}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Add Booking
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="border-t border-zinc-200 bg-zinc-50/50 px-6 py-4"
        >
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label
                htmlFor="startTime"
                className="mb-1 block text-xs font-medium text-zinc-600"
              >
                Start Time
              </label>
              <input
                id="startTime"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-300 focus:ring-2"
              />
            </div>
            <div>
              <label
                htmlFor="endTime"
                className="mb-1 block text-xs font-medium text-zinc-600"
              >
                End Time
              </label>
              <input
                id="endTime"
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-300 focus:ring-2"
              />
              {startTime && endTime && !isTimeValid && (
                <p className="mt-1 text-xs text-amber-600">
                  End Time must be at least 1 hour after Start Time.
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="driver"
                className="mb-1 block text-xs font-medium text-zinc-600"
              >
                Driver
              </label>
              <select
                id="driver"
                value={driverId}
                onChange={(e) => setDriverId(e.target.value)}
                required
                disabled={!isTimeValid || isLoadingAvailability}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-300 focus:ring-2 min-w-[140px] disabled:bg-zinc-100 disabled:cursor-not-allowed"
              >
                <option value="">
                  {!isTimeValid
                    ? "Set times first"
                    : isLoadingAvailability
                      ? "Loading..."
                      : "Select driver"}
                </option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="car"
                className="mb-1 block text-xs font-medium text-zinc-600"
              >
                Car
              </label>
              <select
                id="car"
                value={carId}
                onChange={(e) => setCarId(e.target.value)}
                required
                disabled={!isTimeValid || isLoadingAvailability}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-300 focus:ring-2 min-w-[140px] disabled:bg-zinc-100 disabled:cursor-not-allowed"
              >
                <option value="">
                  {!isTimeValid
                    ? "Set times first"
                    : isLoadingAvailability
                      ? "Loading..."
                      : "Select car"}
                </option>
                {cars.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  !isTimeValid ||
                  isLoadingAvailability ||
                  !driverId ||
                  !carId
                }
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
              >
                {isSubmitting ? "Saving..." : "Save Booking"}
              </button>
            </div>
          </div>
          {(submitError || availabilityError) && (
            <p className="mt-3 text-sm text-red-600">
              {submitError || availabilityError}
            </p>
          )}
        </form>
      )}

      <div className="px-6 pb-10 pt-4">
        {bookings.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No Bookings for this Transaction
          </p>
        ) : (
          <ul className="divide-y divide-zinc-200">
            {bookings.map((b) => (
              <li
                key={b.id}
                className="flex flex-wrap items-center gap-x-6 gap-y-1 py-3 text-sm"
              >
                <span className="font-medium text-zinc-900">
                  {b.startTime} – {b.endTime}
                </span>
                <span className="text-zinc-600">{b.driver}</span>
                <span className="text-zinc-600">{b.car}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
