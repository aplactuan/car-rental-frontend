"use client";

import { useState, useEffect, useCallback, useRef } from "react";

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

function relationId(raw, rel) {
  const node = raw?.relationships?.[rel]?.data;
  if (!node) return "";
  if (Array.isArray(node)) return String(node[0]?.id ?? "");
  return String(node?.id ?? "");
}

function toDatetimeLocalValue(value) {
  if (!value || value === "-") return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    const s = String(value);
    return s.length >= 16 ? s.slice(0, 16) : s;
  }
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toDisplayBooking(raw) {
  const attrs = raw?.attributes ?? raw?.data?.attributes ?? raw ?? {};
  const driver = attrs.driver ?? attrs.driverName ?? "";
  const car = attrs.car ?? attrs.carInfo ?? "";
  const startDate = attrs.startDate ?? attrs.start_date ?? attrs.startsAt ?? "";
  const endDate = attrs.endDate ?? attrs.end_date ?? attrs.endsAt ?? "";
  const note = attrs.note ?? "";
  const apiStart = startDate || attrs.startTime || attrs.start_time || "";
  const apiEnd = endDate || attrs.endTime || attrs.end_time || "";
  const driverId = relationId(raw, "driver");
  const carId = relationId(raw, "car");

  return {
    id: String(raw?.id ?? attrs.id ?? crypto.randomUUID()),
    startTime: attrs.startTime ?? attrs.start_time ?? startDate ?? "-",
    endTime: attrs.endTime ?? attrs.end_time ?? endDate ?? "-",
    startDate: startDate || "-",
    endDate: endDate || "-",
    apiStart,
    apiEnd,
    noteDisplay: String(note || "").trim() ? String(note).trim() : "—",
    noteRaw: String(note ?? ""),
    driver:
      typeof driver === "object"
        ? [driver.firstName, driver.lastName].filter(Boolean).join(" ")
        : String(driver || "—"),
    car:
      typeof car === "object"
        ? [car.make, car.model, car.plateNumber].filter(Boolean).join(" - ")
        : String(car || "—"),
    carId,
    driverId,
  };
}

function bearerHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function jsonAuthHeaders() {
  return { "Content-Type": "application/json", ...bearerHeaders() };
}

export default function BookingListSection({
  transactionId,
  bookings: initialBookings,
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [cars, setCars] = useState([]);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [driverId, setDriverId] = useState("");
  const [carId, setCarId] = useState("");
  const [note, setNote] = useState("");
  const [bookings, setBookings] = useState(() =>
    (initialBookings ?? []).map((b) =>
      typeof b === "object"
        ? toDisplayBooking(b)
        : { id: String(b), startTime: "-", endTime: "-", driver: "—", car: "—" },
    ),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [listError, setListError] = useState("");

  const carIdRef = useRef(carId);
  const driverIdRef = useRef(driverId);
  carIdRef.current = carId;
  driverIdRef.current = driverId;

  const isTimeValid =
    startTime &&
    endTime &&
    new Date(endTime) - new Date(startTime) >= 60 * 60 * 1000;

  const formActive = showForm || editingId !== null;

  useEffect(() => {
    if (!formActive || !isTimeValid) {
      setDrivers([]);
      setCars([]);
      if (!editingId) {
        setDriverId("");
        setCarId("");
      }
      setAvailabilityError("");
      return;
    }

    const headers = bearerHeaders();

    const params = new URLSearchParams({
      start: startTime,
      end: endTime,
    });

    setIsLoadingAvailability(true);
    setAvailabilityError("");

    Promise.all([
      fetch(`/api/v1/availability?type=car&${params.toString()}`, {
        headers,
        credentials: "include",
      }).then((r) => r.json()),
      fetch(`/api/v1/availability?type=driver&${params.toString()}`, {
        headers,
        credentials: "include",
      }).then((r) => r.json()),
    ])
      .then(([carsRes, driversRes]) => {
        const cList = normalizeCars(carsRes);
        const dList = normalizeDrivers(driversRes);
        setCars(cList);
        setDrivers(dList);

        const curCar = carIdRef.current;
        const curDriver = driverIdRef.current;
        const keepCar = curCar && cList.some((c) => String(c.id) === String(curCar));
        const keepDriver =
          curDriver && dList.some((d) => String(d.id) === String(curDriver));

        if (!keepCar && cList.length > 0) {
          setCarId(String(cList[0]?.id ?? ""));
        } else if (!keepCar && cList.length === 0) {
          setCarId("");
        }

        if (!keepDriver && dList.length > 0) {
          setDriverId(String(dList[0]?.id ?? ""));
        } else if (!keepDriver && dList.length === 0) {
          setDriverId("");
        }

        if (carsRes?.error) setAvailabilityError(carsRes.error);
        else if (driversRes?.error) setAvailabilityError(driversRes.error);
      })
      .catch(() => {
        setAvailabilityError("Failed to load availability.");
      })
      .finally(() => {
        setIsLoadingAvailability(false);
      });
  }, [formActive, isTimeValid, startTime, endTime, editingId]);

  const resetFormFields = useCallback(() => {
    setStartTime("");
    setEndTime("");
    setDriverId("");
    setCarId("");
    setNote("");
    setSubmitError("");
    setAvailabilityError("");
  }, []);

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    resetFormFields();
  };

  const beginAdd = () => {
    setEditingId(null);
    resetFormFields();
    setShowForm(true);
  };

  const beginEdit = (b) => {
    setShowForm(false);
    setSubmitError("");
    setAvailabilityError("");
    setEditingId(b.id);
    setStartTime(toDatetimeLocalValue(b.apiStart || b.startDate || b.startTime));
    setEndTime(toDatetimeLocalValue(b.apiEnd || b.endDate || b.endTime));
    setNote(b.noteRaw ?? "");
    setDriverId(b.driverId || "");
    setCarId(b.carId || "");
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
    try {
      const res = await fetch(`/api/v1/transactions/${transactionId}/book`, {
        method: "POST",
        headers: jsonAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({
          car_id: carId,
          driver_id: driverId,
          start_date: startTime,
          end_date: endTime,
          note: note.trim() || "",
        }),
      });
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
        relationships: {
          driver: { data: driverId ? { id: driverId } : null },
          car: { data: carId ? { id: carId } : null },
        },
        startTime: fromApi.startTime !== "-" ? fromApi.startTime : startTime,
        endTime: fromApi.endTime !== "-" ? fromApi.endTime : endTime,
        apiStart: startTime,
        apiEnd: endTime,
        driver: fromApi.driver !== "—" ? fromApi.driver : driverLabel,
        car: fromApi.car !== "—" ? fromApi.car : carLabel,
        driverId: fromApi.driverId || driverId,
        carId: fromApi.carId || carId,
        noteRaw: note.trim(),
        noteDisplay: note.trim() ? note.trim() : "—",
      };
      setBookings((prev) => [...prev, newBooking]);
      setShowForm(false);
      resetFormFields();
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!transactionId || !editingId) return;
    if (!isTimeValid) {
      setSubmitError("End Time must be at least 1 hour after Start Time.");
      return;
    }
    setSubmitError("");
    setIsSubmitting(true);
    try {
      const res = await fetch(
        `/api/v1/transactions/${transactionId}/bookings/${editingId}`,
        {
          method: "PUT",
          headers: jsonAuthHeaders(),
          credentials: "include",
          body: JSON.stringify({
            car_id: carId,
            driver_id: driverId,
            start_date: startTime,
            end_date: endTime,
            note: note.trim() || "",
          }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitError(data?.error ?? data?.message ?? "Failed to update booking.");
        return;
      }
      const fromApi = toDisplayBooking(data?.data ?? data);
      const driverLabel = drivers.find((d) => String(d.id) === String(driverId))?.label ?? fromApi.driver;
      const carLabel = cars.find((c) => String(c.id) === String(carId))?.label ?? fromApi.car;
      const updated = {
        ...fromApi,
        id: editingId,
        relationships: {
          driver: { data: driverId ? { id: driverId } : null },
          car: { data: carId ? { id: carId } : null },
        },
        startTime: fromApi.startTime !== "-" ? fromApi.startTime : startTime,
        endTime: fromApi.endTime !== "-" ? fromApi.endTime : endTime,
        apiStart: startTime,
        apiEnd: endTime,
        driver: fromApi.driver !== "—" ? fromApi.driver : driverLabel,
        car: fromApi.car !== "—" ? fromApi.car : carLabel,
        driverId: fromApi.driverId || driverId,
        carId: fromApi.carId || carId,
        noteRaw: note.trim(),
        noteDisplay: note.trim() ? note.trim() : "—",
      };
      setBookings((prev) => prev.map((row) => (row.id === editingId ? updated : row)));
      setEditingId(null);
      resetFormFields();
    } catch {
      setSubmitError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (bookingId) => {
    if (!transactionId) return;
    if (!window.confirm("Delete this booking? This cannot be undone.")) return;
    setListError("");
    setDeletingId(bookingId);
    try {
      const res = await fetch(
        `/api/v1/transactions/${transactionId}/bookings/${bookingId}`,
        {
          method: "DELETE",
          headers: bearerHeaders(),
          credentials: "include",
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setListError(data?.error ?? data?.message ?? "Failed to delete booking.");
        return;
      }
      setBookings((prev) => prev.filter((b) => b.id !== bookingId));
      if (editingId === bookingId) {
        setEditingId(null);
        resetFormFields();
      }
    } catch {
      setListError("Network error. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const sharedFormProps = {
    startTime,
    endTime,
    setStartTime,
    setEndTime,
    driverId,
    setDriverId,
    carId,
    setCarId,
    note,
    setNote,
    drivers,
    cars,
    isTimeValid,
    isLoadingAvailability,
    isSubmitting,
    submitError,
    availabilityError,
    onCancel: handleCancel,
  };

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm ring-1 ring-zinc-100">
      <div className="relative border-b border-zinc-100 bg-gradient-to-r from-teal-50/80 via-white to-zinc-50 px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
              Bookings
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              {bookings.length} reservation{bookings.length !== 1 ? "s" : ""} on this
              transaction
            </p>
          </div>
          <button
            type="button"
            onClick={() => (showForm ? handleCancel() : beginAdd())}
            className="rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 active:scale-[0.98]"
          >
            {showForm ? "Close" : "Add booking"}
          </button>
        </div>
      </div>

      {showForm && (
        <BookingFormShell
          formKey="add"
          title="New booking"
          subtitle="Pick a window, then choose an available car and driver."
          onSubmit={handleSubmit}
          submitLabel={isSubmitting ? "Saving…" : "Save booking"}
          {...sharedFormProps}
        />
      )}

      {listError && (
        <p className="border-b border-red-100 bg-red-50/80 px-6 py-3 text-sm text-red-700">
          {listError}
        </p>
      )}

      <div className="px-6 py-8">
        {bookings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 px-6 py-14 text-center">
            <p className="text-sm font-medium text-zinc-700">No bookings yet</p>
            <p className="mt-1 text-sm text-zinc-500">
              Add a booking to assign a car and driver to this transaction.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-5">
            {bookings.map((b) => (
              <li key={b.id}>
                <article className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-gradient-to-br from-white via-white to-teal-50/30 shadow-sm transition hover:border-teal-200/70 hover:shadow-md">
                  <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-teal-100/80 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-teal-900">
                          Schedule
                        </span>
                        <p className="text-base font-semibold text-zinc-900">
                          {b.startTime} → {b.endTime}
                        </p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-zinc-100 bg-white/80 px-4 py-3">
                          <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                            Driver
                          </p>
                          <p className="mt-1 text-sm font-medium text-zinc-800">{b.driver}</p>
                        </div>
                        <div className="rounded-xl border border-zinc-100 bg-white/80 px-4 py-3">
                          <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                            Vehicle
                          </p>
                          <p className="mt-1 text-sm font-medium text-zinc-800">{b.car}</p>
                        </div>
                      </div>
                      <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 px-4 py-3">
                        <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                          Note
                        </p>
                        <p className="mt-1 text-sm text-zinc-700">{b.noteDisplay}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-row gap-2 sm:flex-col sm:items-stretch">
                      <button
                        type="button"
                        onClick={() => (editingId === b.id ? handleCancel() : beginEdit(b))}
                        disabled={deletingId === b.id}
                        className="rounded-xl border border-teal-200 bg-white px-4 py-2 text-sm font-semibold text-teal-800 shadow-sm transition hover:bg-teal-50 disabled:opacity-50"
                      >
                        {editingId === b.id ? "Cancel edit" : "Edit"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(b.id)}
                        disabled={deletingId === b.id || editingId === b.id}
                        className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 shadow-sm transition hover:bg-red-50 disabled:opacity-50"
                      >
                        {deletingId === b.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </div>

                  {editingId === b.id && (
                    <BookingFormShell
                      formKey={`edit-${b.id}`}
                      title="Edit booking"
                      subtitle="Update times, vehicle, driver, or note. Availability refreshes when times change."
                      onSubmit={handleSaveEdit}
                      submitLabel={isSubmitting ? "Saving…" : "Update booking"}
                      className="border-t border-zinc-100"
                      {...sharedFormProps}
                    />
                  )}
                </article>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function BookingFormShell({
  formKey,
  title,
  subtitle,
  onSubmit,
  submitLabel,
  className = "",
  startTime,
  endTime,
  setStartTime,
  setEndTime,
  driverId,
  setDriverId,
  carId,
  setCarId,
  note,
  setNote,
  drivers,
  cars,
  isTimeValid,
  isLoadingAvailability,
  isSubmitting,
  submitError,
  availabilityError,
  onCancel,
}) {
  return (
    <form
      onSubmit={onSubmit}
      className={`bg-zinc-50/80 px-6 py-5 ${className}`}
    >
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
        <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label
            htmlFor={`start-${formKey}`}
            className="mb-1 block text-xs font-medium text-zinc-600"
          >
            Start time
          </label>
          <input
            id={`start-${formKey}`}
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
            className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-teal-500/30 focus:ring-2"
          />
        </div>
        <div>
          <label
            htmlFor={`end-${formKey}`}
            className="mb-1 block text-xs font-medium text-zinc-600"
          >
            End time
          </label>
          <input
            id={`end-${formKey}`}
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
            className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-teal-500/30 focus:ring-2"
          />
          {startTime && endTime && !isTimeValid && (
            <p className="mt-1 text-xs text-amber-600">
              End time must be at least 1 hour after start time.
            </p>
          )}
        </div>
        <div>
          <label
            htmlFor={`driver-${formKey}`}
            className="mb-1 block text-xs font-medium text-zinc-600"
          >
            Driver
          </label>
          <select
            id={`driver-${formKey}`}
            value={driverId}
            onChange={(e) => setDriverId(e.target.value)}
            required
            disabled={!isTimeValid || isLoadingAvailability}
            className="min-w-[160px] rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-teal-500/30 focus:ring-2 disabled:cursor-not-allowed disabled:bg-zinc-100"
          >
            <option value="">
              {!isTimeValid
                ? "Set times first"
                : isLoadingAvailability
                  ? "Loading…"
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
            htmlFor={`car-${formKey}`}
            className="mb-1 block text-xs font-medium text-zinc-600"
          >
            Car
          </label>
          <select
            id={`car-${formKey}`}
            value={carId}
            onChange={(e) => setCarId(e.target.value)}
            required
            disabled={!isTimeValid || isLoadingAvailability}
            className="min-w-[160px] rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-teal-500/30 focus:ring-2 disabled:cursor-not-allowed disabled:bg-zinc-100"
          >
            <option value="">
              {!isTimeValid
                ? "Set times first"
                : isLoadingAvailability
                  ? "Loading…"
                  : "Select car"}
            </option>
            {cars.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[200px] flex-1 basis-full sm:basis-auto">
          <label
            htmlFor={`note-${formKey}`}
            className="mb-1 block text-xs font-medium text-zinc-600"
          >
            Note
          </label>
          <input
            id={`note-${formKey}`}
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional"
            className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-teal-500/30 focus:ring-2"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
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
            className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
          >
            {submitLabel}
          </button>
        </div>
      </div>
      {(submitError || availabilityError) && (
        <p className="mt-3 text-sm text-red-600">{submitError || availabilityError}</p>
      )}
    </form>
  );
}
