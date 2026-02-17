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
      id: pick(["id", "car_id", "carId"]),
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
  const [showForm, setShowForm] = useState(false);
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [plate_number, setPlateNumber] = useState("");
  const [mileage, setMileage] = useState("");
  const [type, setType] = useState("");
  const [number_of_seats, setNumberOfSeats] = useState("");
  const [year, setYear] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
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
    setError("");
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

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
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

      const res = await fetch("/api/v1/cars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || data?.message || "Failed to add car.");
        return;
      }
      setShowForm(false);
      resetForm();
      fetchCars();
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cars</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Manage your fleet vehicles, availability, and details
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowForm(true);
            resetForm();
          }}
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

      {showForm && (
        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-900">Add new car</h2>
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
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:opacity-50"
              >
                {isLoading ? "Saving…" : "Save car"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
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
            {carsLoading ? "Loading…" : `${cars.length} cars registered`}
          </div>
        </div>
        {carsLoading ? (
          <div className="px-6 pb-6 text-sm text-zinc-500">Loading cars…</div>
        ) : carsError ? (
          <div className="px-6 pb-6 text-sm text-red-600">{carsError}</div>
        ) : cars.length === 0 ? (
          <div className="flex items-center justify-center px-6 pb-10">
            <p className="text-sm text-zinc-500">
              No cars added yet. Add one to get started.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100 px-6 pb-2">
            {cars.map((car) => (
              <li
                key={car.id ?? car.plate_number ?? car.make + car.model}
                className="flex flex-wrap items-center justify-between gap-2 py-4"
              >
                <div>
                  <p className="font-medium text-zinc-900">
                    {car.make} {car.model}
                    {car.year && ` (${car.year})`}
                  </p>
                  <p className="text-sm text-zinc-500">
                    Plate: {car.plate_number}
                    {car.type && ` · ${car.type}`}
                    {car.number_of_seats
                      ? ` · ${car.number_of_seats} seats` : ""}
                  </p>
                  {car.mileage != null && car.mileage !== "" && (
                    <p className="mt-1 text-sm text-zinc-600">
                      Mileage: {Number(car.mileage).toLocaleString()} km
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
