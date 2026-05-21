"use client";

import { Fragment, useState, useEffect, useCallback, useRef } from "react";

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
  if (node) {
    if (Array.isArray(node)) return String(node[0]?.id ?? "");
    return String(node?.id ?? "");
  }

  const flatKey = rel === "driver" ? "driverId" : "carId";
  const snakeKey = rel === "driver" ? "driver_id" : "car_id";
  const flatValue = raw?.[flatKey] ?? raw?.attributes?.[flatKey] ?? raw?.[snakeKey] ?? raw?.attributes?.[snakeKey];
  return flatValue != null && flatValue !== "" ? String(flatValue) : "";
}

function toDatetimeLocalValue(value) {
  if (!value || value === "-") return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    const s = String(value);
    if (s.includes("T")) return s.length >= 16 ? s.slice(0, 16) : s;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s}T09:00`;
    return s.length >= 16 ? s.slice(0, 16) : s;
  }
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function splitDatetimeLocalValue(value) {
  if (!value) return { date: "", time: "" };
  const normalized = toDatetimeLocalValue(value);
  if (!normalized) return { date: "", time: "" };
  const [date, timePart] = normalized.split("T");
  return { date: date || "", time: timePart ? timePart.slice(0, 5) : "" };
}

function combineDateAndTime(date, time, fallbackTime) {
  if (!date) return "";
  const resolvedTime =
    time && /^\d{2}:\d{2}$/.test(time) ? time : fallbackTime;
  return `${date}T${resolvedTime}`;
}

function formatScheduleLabel(value) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toDisplayBooking(raw) {
  const attrs = raw?.attributes ?? raw?.data?.attributes ?? raw ?? {};
  const driver = attrs.driver ?? attrs.driverName ?? "";
  const car = attrs.car ?? attrs.carInfo ?? "";
  const startDate = attrs.startDate ?? attrs.start_date ?? attrs.startsAt ?? "";
  const endDate = attrs.endDate ?? attrs.end_date ?? attrs.endsAt ?? "";
  const note = attrs.note ?? "";
  const parsedPrice = Number(attrs.price);
  const price = Number.isFinite(parsedPrice) ? parsedPrice : null;
  const apiStart = startDate || attrs.startTime || attrs.start_time || "";
  const apiEnd = endDate || attrs.endTime || attrs.end_time || "";
  const driverId = relationId(raw, "driver");
  const carId = relationId(raw, "car");
  const id = String(raw?.id ?? attrs.id ?? "");
  if (!id) return null;

  return {
    id,
    startTime: attrs.startTime ?? attrs.start_time ?? startDate ?? "-",
    endTime: attrs.endTime ?? attrs.end_time ?? endDate ?? "-",
    startDate: startDate || "-",
    endDate: endDate || "-",
    apiStart,
    apiEnd,
    price,
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

function formatPrice(amount) {
  if (typeof amount !== "number" || !Number.isFinite(amount)) return "—";
  return `PHP ${Math.round(amount).toLocaleString("en-US")}`;
}

function bearerHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function jsonAuthHeaders() {
  return { "Content-Type": "application/json", ...bearerHeaders() };
}

function formatBookingRange(booking) {
  const start = formatScheduleLabel(booking.apiStart || booking.startDate || booking.startTime);
  const end = formatScheduleLabel(booking.apiEnd || booking.endDate || booking.endTime);
  if (start === "—" && end === "—") return "—";
  return `${start} → ${end}`;
}

export default function BookingListSection({
  transactionId,
  bookings: initialBookings,
  layout = "default",
}) {
  const isPanel = layout === "panel";
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [cars, setCars] = useState([]);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [driverId, setDriverId] = useState("");
  const [carId, setCarId] = useState("");
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");
  const [bookings, setBookings] = useState(() =>
    (initialBookings ?? [])
      .map((b) => {
        if (typeof b !== "object") {
          const id = String(b);
          return id
            ? {
                id,
                startTime: "-",
                endTime: "-",
                driver: "—",
                car: "—",
                price: null,
                driverId: "",
                carId: "",
              }
            : null;
        }
        return toDisplayBooking(b);
      })
      .filter(Boolean),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [listError, setListError] = useState("");

  const carIdRef = useRef(carId);
  const driverIdRef = useRef(driverId);
  const editingIdRef = useRef(editingId);
  const bookingsRef = useRef(bookings);
  carIdRef.current = carId;
  driverIdRef.current = driverId;
  editingIdRef.current = editingId;
  bookingsRef.current = bookings;

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
        let cList = normalizeCars(carsRes);
        let dList = normalizeDrivers(driversRes);

        const curCar = carIdRef.current;
        const curDriver = driverIdRef.current;
        const isEditing = Boolean(editingIdRef.current);
        const editingBooking = isEditing
          ? bookingsRef.current.find((row) => row.id === editingIdRef.current)
          : null;

        if (isEditing && curCar && !cList.some((c) => String(c.id) === String(curCar))) {
          cList = [
            {
              id: curCar,
              label: editingBooking?.car ? `Current: ${editingBooking.car}` : `Car ${curCar}`,
            },
            ...cList,
          ];
        }

        if (
          isEditing &&
          curDriver &&
          !dList.some((d) => String(d.id) === String(curDriver))
        ) {
          dList = [
            {
              id: curDriver,
              label: editingBooking?.driver
                ? `Current: ${editingBooking.driver}`
                : `Driver ${curDriver}`,
            },
            ...dList,
          ];
        }

        setCars(cList);
        setDrivers(dList);

        const keepCar = curCar && cList.some((c) => String(c.id) === String(curCar));
        const keepDriver =
          curDriver && dList.some((d) => String(d.id) === String(curDriver));

        if (!keepCar && !isEditing && cList.length > 0) {
          setCarId(String(cList[0]?.id ?? ""));
        } else if (!keepCar && !isEditing && cList.length === 0) {
          setCarId("");
        }

        if (!keepDriver && !isEditing && dList.length > 0) {
          setDriverId(String(dList[0]?.id ?? ""));
        } else if (!keepDriver && !isEditing && dList.length === 0) {
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
    setPrice("");
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
    setPrice(b.price != null ? String(b.price) : "");
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
      const parsedPrice = Number(price);
      if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
        setSubmitError("Price must be greater than 0.");
        setIsSubmitting(false);
        return;
      }
      const res = await fetch(`/api/v1/transactions/${transactionId}/book`, {
        method: "POST",
        headers: jsonAuthHeaders(),
        credentials: "include",
        body: JSON.stringify({
          car_id: carId,
          driver_id: driverId,
          price: parsedPrice,
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
      if (!fromApi) {
        setSubmitError("Booking was saved but the response did not include a booking ID.");
        return;
      }
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
        price: fromApi.price ?? parsedPrice,
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
      const parsedPrice = Number(price);
      if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
        setSubmitError("Price must be greater than 0.");
        setIsSubmitting(false);
        return;
      }
      const res = await fetch(
        `/api/v1/transactions/${transactionId}/bookings/${editingId}`,
        {
          method: "PUT",
          headers: jsonAuthHeaders(),
          credentials: "include",
          body: JSON.stringify({
            car_id: carId,
            driver_id: driverId,
            price: parsedPrice,
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
      if (!fromApi) {
        setSubmitError("Booking was saved but the response did not include a booking ID.");
        return;
      }
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
        price: fromApi.price ?? parsedPrice,
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
    price,
    setPrice,
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

  const shellClass = isPanel
    ? "flex h-full min-h-0 flex-col"
    : "mt-6 overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm ring-1 ring-zinc-100";

  return (
    <div className={shellClass}>
      <div className="shrink-0 border-b border-zinc-100 bg-gradient-to-r from-teal-50/80 via-white to-zinc-50 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-zinc-900">
              Bookings
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              {bookings.length} reservation{bookings.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => (showForm ? handleCancel() : beginAdd())}
            className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 active:scale-[0.98]"
          >
            {showForm ? "Close" : "Add booking"}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="shrink-0 max-h-[min(50vh,28rem)] overflow-y-auto border-b border-zinc-100">
          <BookingFormShell
            formKey="add"
            title="New booking"
            subtitle="Choose start and end date/time, then pick an available car and driver."
            onSubmit={handleSubmit}
            submitLabel={isSubmitting ? "Saving…" : "Save booking"}
            {...sharedFormProps}
          />
        </div>
      )}

      {listError && (
        <p className="shrink-0 border-b border-red-100 bg-red-50/80 px-5 py-2.5 text-sm text-red-700">
          {listError}
        </p>
      )}

      <div
        className={
          isPanel
            ? "min-h-0 flex-1 overflow-y-auto overscroll-contain"
            : "px-6 py-8"
        }
      >
        {bookings.length === 0 ? (
          <div className="flex h-full min-h-[12rem] flex-col items-center justify-center px-6 py-12 text-center">
            <p className="text-sm font-medium text-zinc-700">No bookings yet</p>
            <p className="mt-1 max-w-xs text-sm text-zinc-500">
              Add a booking to assign a car and driver to this transaction.
            </p>
          </div>
        ) : (
          <div className={isPanel ? "" : "overflow-x-auto"}>
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead className="sticky top-0 z-10 bg-zinc-50/95 text-xs font-semibold uppercase tracking-wide text-zinc-500 backdrop-blur-sm">
                <tr className="border-b border-zinc-200">
                  <th className="px-5 py-3 font-semibold">Schedule</th>
                  <th className="px-4 py-3 font-semibold">Driver</th>
                  <th className="px-4 py-3 font-semibold">Vehicle</th>
                  <th className="px-4 py-3 font-semibold">Price</th>
                  <th className="hidden px-4 py-3 font-semibold xl:table-cell">Note</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <Fragment key={b.id}>
                    <tr
                      className={`border-b border-zinc-100 transition-colors hover:bg-teal-50/40 ${
                        editingId === b.id ? "bg-teal-50/60" : "bg-white"
                      }`}
                    >
                      <td className="max-w-[200px] px-5 py-3 align-top">
                        <p className="text-xs font-medium leading-snug text-zinc-800">
                          {formatBookingRange(b)}
                        </p>
                      </td>
                      <td className="px-4 py-3 align-top font-medium text-zinc-800">
                        {b.driver}
                      </td>
                      <td className="max-w-[160px] px-4 py-3 align-top text-zinc-800">
                        <span className="line-clamp-2">{b.car}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 align-top font-semibold text-zinc-900">
                        {formatPrice(b.price)}
                      </td>
                      <td className="hidden max-w-[140px] px-4 py-3 align-top text-zinc-600 xl:table-cell">
                        <span className="line-clamp-2">{b.noteDisplay}</span>
                      </td>
                      <td className="px-5 py-3 align-top text-right">
                        <div className="inline-flex gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              editingId === b.id ? handleCancel() : beginEdit(b)
                            }
                            disabled={deletingId === b.id}
                            className="rounded-lg border border-teal-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-teal-800 transition hover:bg-teal-50 disabled:opacity-50"
                          >
                            {editingId === b.id ? "Cancel" : "Edit"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(b.id)}
                            disabled={deletingId === b.id}
                            className="rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                          >
                            {deletingId === b.id ? "…" : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {editingId === b.id && (
                      <tr className="border-b border-zinc-100 bg-zinc-50/80">
                        <td colSpan={6} className="p-0">
                          <BookingFormShell
                            formKey={`edit-${b.id}`}
                            title="Edit booking"
                            subtitle="Update times, vehicle, driver, or note."
                            onSubmit={handleSaveEdit}
                            submitLabel={isSubmitting ? "Saving…" : "Update booking"}
                            className="border-0"
                            {...sharedFormProps}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function BookingScheduleFields({
  formKey,
  startTime,
  endTime,
  setStartTime,
  setEndTime,
  isTimeValid,
  onStartDateChange,
}) {
  const start = splitDatetimeLocalValue(startTime);
  const end = splitDatetimeLocalValue(endTime);
  const fieldClass =
    "w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-teal-500/30 focus:ring-2";

  return (
    <div className="w-full min-w-[280px] basis-full">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Schedule
      </p>
      <div className="grid gap-4 rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-2">
        <div className="space-y-3">
          <p className="text-xs font-medium text-zinc-700">Start</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs text-zinc-500">Date</span>
              <input
                id={`start-date-${formKey}`}
                type="date"
                value={start.date}
                onChange={(e) => {
                  const nextStart = combineDateAndTime(
                    e.target.value,
                    start.time,
                    "09:00",
                  );
                  setStartTime(nextStart);
                  onStartDateChange?.(e.target.value, nextStart);
                }}
                required
                className={fieldClass}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-zinc-500">Time</span>
              <input
                id={`start-time-${formKey}`}
                type="time"
                value={start.time}
                step={900}
                onChange={(e) =>
                  setStartTime(
                    combineDateAndTime(start.date, e.target.value, "09:00"),
                  )
                }
                required
                disabled={!start.date}
                className={fieldClass}
              />
            </label>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-medium text-zinc-700">End</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs text-zinc-500">Date</span>
              <input
                id={`end-date-${formKey}`}
                type="date"
                value={end.date}
                min={start.date || undefined}
                onChange={(e) =>
                  setEndTime(
                    combineDateAndTime(e.target.value, end.time, "17:00"),
                  )
                }
                required
                disabled={!start.date}
                className={fieldClass}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-zinc-500">Time</span>
              <input
                id={`end-time-${formKey}`}
                type="time"
                value={end.time}
                step={900}
                onChange={(e) =>
                  setEndTime(
                    combineDateAndTime(end.date, e.target.value, "17:00"),
                  )
                }
                required
                disabled={!end.date}
                className={fieldClass}
              />
            </label>
          </div>
        </div>
      </div>

      {startTime && endTime ? (
        <p className="mt-2 text-xs text-zinc-600">
          <span className="font-medium text-zinc-800">Selected:</span>{" "}
          {formatScheduleLabel(startTime)} → {formatScheduleLabel(endTime)}
        </p>
      ) : (
        <p className="mt-2 text-xs text-zinc-500">
          Pick a start date and time, then an end date and time (15-minute steps).
        </p>
      )}

      {startTime && endTime && !isTimeValid ? (
        <p className="mt-1 text-xs text-amber-600">
          End must be at least 1 hour after start.
        </p>
      ) : null}
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
  price,
  setPrice,
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
        <BookingScheduleFields
          formKey={formKey}
          startTime={startTime}
          endTime={endTime}
          setStartTime={setStartTime}
          setEndTime={setEndTime}
          isTimeValid={isTimeValid}
          onStartDateChange={(startDate, nextStart) => {
            const end = splitDatetimeLocalValue(endTime);
            if (!end.date && startDate) {
              setEndTime(
                combineDateAndTime(startDate, end.time || "17:00", "17:00"),
              );
            } else if (
              end.date &&
              startDate &&
              new Date(combineDateAndTime(end.date, end.time, "17:00")) <
                new Date(nextStart)
            ) {
              setEndTime(
                combineDateAndTime(startDate, end.time || "17:00", "17:00"),
              );
            }
          }}
        />
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
            htmlFor={`price-${formKey}`}
            className="mb-1 block text-xs font-medium text-zinc-600"
          >
            Price
          </label>
          <input
            id={`price-${formKey}`}
            type="number"
            min="1"
            step="1"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            placeholder="e.g. 500000"
            className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-teal-500/30 focus:ring-2"
          />
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
              !carId ||
              price.trim() === ""
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
