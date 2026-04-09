"use client";

import { useState, useEffect } from "react";

const inputClass =
  "mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100";
const labelClass = "block text-xs font-medium text-zinc-700";

function readField(source, keys) {
  if (!source || typeof source !== "object") return "";

  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }

  const normalizedMap = Object.fromEntries(
    Object.entries(source).map(([k, v]) => [
      k.toLowerCase().replace(/[_\s]/g, ""),
      v,
    ]),
  );

  for (const key of keys) {
    const normalizedKey = key.toLowerCase().replace(/[_\s]/g, "");
    const value = normalizedMap[normalizedKey];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return "";
}

function normalizeCars(payload) {
  const rawCars = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.cars)
        ? payload.cars
        : [];

  return rawCars.map((car) => {
    const attrs = car?.attributes ?? {};
    const pick = (keys) => {
      const fromAttrs = readField(attrs, keys);
      if (fromAttrs !== "" && fromAttrs !== undefined) return fromAttrs;
      return readField(car, keys);
    };

    return {
      id: pick(["id", "car_id", "carId", "uuid", "car_uuid", "carUuid"]),
      make: pick(["make"]),
      model: pick(["model"]),
      plate_number: pick(["plate_number", "plateNumber", "plateNUmber"]),
      mileage: pick(["mileage"]) ?? 0,
      type: pick(["type"]),
      number_of_seats: pick(["number_of_seats", "numberOfSeats"]) ?? 0,
      year: pick(["year"]),
    };
  });
}

export default function CarsPage() {
  const [formMode, setFormMode] = useState(null);
  const [editingCarId, setEditingCarId] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [plate_number, setPlateNumber] = useState("");
  const [mileage, setMileage] = useState("");
  const [type, setType] = useState("");
  const [number_of_seats, setNumberOfSeats] = useState("");
  const [year, setYear] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [cars, setCars] = useState([]);
  const [carsLoading, setCarsLoading] = useState(true);
  const [carsError, setCarsError] = useState("");

  function resetForm() {
    setMake("");
    setModel("");
    setPlateNumber("");
    setMileage("");
    setType("");
    setNumberOfSeats("");
    setYear("");
    setFormError("");
    setEditingCarId("");
  }

  async function fetchCars() {
    setCarsLoading(true);
    setCarsError("");
    try {
      const res = await fetch("/api/v1/cars", {
        method: "GET",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCarsError(data?.error || data?.message || "Failed to load cars.");
        setCars([]);
        return;
      }
      setCars(normalizeCars(data));
    } catch {
      setCarsError("Network error. Please try again.");
      setCars([]);
    } finally {
      setCarsLoading(false);
    }
  }

  useEffect(() => {
    fetchCars();
  }, []);

  function openAddForm() {
    resetForm();
    setFormMode("add");
  }

  function openEditForm(car) {
    setFormMode("edit");
    setEditingCarId(car.id || "");
    setMake(car.make || "");
    setModel(car.model || "");
    setPlateNumber(car.plate_number || "");
    setMileage(
      car.mileage !== undefined && car.mileage !== null ? String(car.mileage) : "",
    );
    setType(car.type || "");
    setNumberOfSeats(
      car.number_of_seats !== undefined && car.number_of_seats !== null
        ? String(car.number_of_seats)
        : "",
    );
    setYear(car.year !== undefined && car.year !== null ? String(car.year) : "");
    setFormError("");
  }

  function closeForm() {
    setFormMode(null);
    resetForm();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    setIsLoading(true);
    try {
      const payload = {
        make: make.trim(),
        model: model.trim(),
        plate_number: plate_number.trim(),
        mileage: mileage ? Number(mileage) : 0,
        type: type.trim(),
        number_of_seats: number_of_seats ? Number(number_of_seats) : 0,
        year: year ? Number(year) : new Date().getFullYear(),
      };

      const isEdit = formMode === "edit";
      if (isEdit && !editingCarId) {
        setFormError("Unable to update this car because no car ID was found.");
        return;
      }

      const endpoint = isEdit
        ? `/api/v1/cars/${encodeURIComponent(editingCarId)}`
        : "/api/v1/cars";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(
          data?.error ||
            data?.message ||
            (isEdit ? "Failed to update car." : "Failed to add car."),
        );
        return;
      }
      closeForm();
      await fetchCars();
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full pr-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cars</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Manage your fleet vehicles, availability, and details
          </p>
        </div>
        <button
          type="button"
          onClick={openAddForm}
          className="inline-flex items-center gap-2 rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
          </svg>
          Add Car
        </button>
      </div>

      {formMode && (
        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-900">
            {formMode === "edit" ? "Edit Car" : "Add Car"}
          </h2>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Make</label>
                <input
                  type="text"
                  value={make}
                  onChange={(e) => setMake(e.target.value)}
                  className={inputClass}
                  placeholder="e.g. Toyota"
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Model</label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className={inputClass}
                  placeholder="e.g. Corolla"
                  required
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Plate number</label>
              <input
                type="text"
                value={plate_number}
                onChange={(e) => setPlateNumber(e.target.value)}
                className={inputClass}
                placeholder="e.g. ABC-123"
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Mileage</label>
                <input
                  type="number"
                  min="0"
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value)}
                  className={inputClass}
                  placeholder="e.g. 50000"
                />
              </div>
              <div>
                <label className={labelClass}>Year</label>
                <input
                  type="number"
                  min="1900"
                  max={new Date().getFullYear() + 1}
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className={inputClass}
                  placeholder="e.g. 2020"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Type</label>
                <input
                  type="text"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className={inputClass}
                  placeholder="e.g. Sedan"
                />
              </div>
              <div>
                <label className={labelClass}>Number of seats</label>
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={number_of_seats}
                  onChange={(e) => setNumberOfSeats(e.target.value)}
                  className={inputClass}
                  placeholder="e.g. 5"
                />
              </div>
            </div>
            {formError && (
              <p className="text-sm text-red-600">{formError}</p>
            )}
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:opacity-50"
              >
                {isLoading
                  ? formMode === "edit"
                    ? "Updating..."
                    : "Saving..."
                  : formMode === "edit"
                    ? "Update Car"
                    : "Save Car"}
              </button>
              <button
                type="button"
                onClick={closeForm}
                disabled={isLoading}
                className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="mt-6 rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="px-6 py-5">
          <div className="text-sm font-semibold text-zinc-900">Available Cars</div>
          <div className="mt-1 text-xs text-zinc-500">
            {carsLoading ? "Loading..." : `${cars.length} cars registered`}
          </div>
        </div>
        {carsLoading ? (
          <div className="px-6 pb-6 text-sm text-zinc-500">Loading cars...</div>
        ) : carsError ? (
          <div className="px-6 pb-6 text-sm text-red-600">{carsError}</div>
        ) : cars.length === 0 ? (
          <div className="flex items-center justify-center px-6 pb-10">
            <p className="text-sm text-zinc-500">
              No cars added yet. Add one to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto px-6 pb-4">
            <table className="w-full min-w-[920px] border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-sm font-semibold text-zinc-800">
                  <th className="py-3 pr-4">Make</th>
                  <th className="py-3 pr-4">Model</th>
                  <th className="py-3 pr-4">Plate</th>
                  <th className="py-3 pr-4">Type</th>
                  <th className="py-3 pr-4">Seats</th>
                  <th className="py-3 pr-4">Mileage</th>
                  <th className="py-3 pr-4">Year</th>
                  <th className="py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {cars.map((car) => (
                  <tr
                    key={car.id ?? car.plate_number ?? `${car.make}-${car.model}`}
                    className="border-b border-zinc-100 text-sm text-zinc-700"
                  >
                    <td className="py-4 pr-4 font-medium text-zinc-900">
                      {car.make || "-"}
                    </td>
                    <td className="py-4 pr-4">{car.model || "-"}</td>
                    <td className="py-4 pr-4">{car.plate_number || "-"}</td>
                    <td className="py-4 pr-4">{car.type || "-"}</td>
                    <td className="py-4 pr-4">
                      {car.number_of_seats ? String(car.number_of_seats) : "-"}
                    </td>
                    <td className="py-4 pr-4">
                      {car.mileage !== undefined && car.mileage !== null && car.mileage !== ""
                        ? Number(car.mileage).toLocaleString()
                        : "-"}
                    </td>
                    <td className="py-4 pr-4">{car.year || "-"}</td>
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => openEditForm(car)}
                          className="text-blue-600 transition hover:text-blue-700"
                          title="Edit car"
                          aria-label={`Edit ${car.make || ""} ${car.model || "car"}`.trim()}
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
                              d="M16.862 3.487a2.25 2.25 0 1 1 3.182 3.182L7.25 19.463 3 21l1.537-4.25L16.862 3.487Z"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                        <button
                          type="button"
                          disabled
                          className="cursor-not-allowed text-red-400"
                          title="Delete is not available yet"
                          aria-label="Delete not available"
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
                              d="M3 6h18M8 6V4h8v2m-7 4v7m4-7v7m-9 1h14a1 1 0 0 0 1-1V6H4v12a1 1 0 0 0 1 1Z"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
