"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

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

const CARS_PER_PAGE = 10;

function formatCarRangeLabel(page, carsOnPage, total) {
  if (total <= 0 || carsOnPage <= 0) return "";
  const from = (page - 1) * CARS_PER_PAGE + 1;
  const to = from + carsOnPage - 1;
  return `Showing ${from.toLocaleString()}–${to.toLocaleString()} of ${total.toLocaleString()}`;
}

function extractCarListMeta(payload) {
  const meta = payload?.meta;
  if (meta && typeof meta === "object") {
    return {
      currentPage: Math.max(1, Number(meta.current_page) || 1),
      lastPage: Math.max(1, Number(meta.last_page) || 1),
      total: Math.max(0, Number(meta.total) || 0),
    };
  }

  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : [];
  return {
    currentPage: 1,
    lastPage: 1,
    total: list.length,
  };
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
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    lastPage: 1,
    total: 0,
  });
  const [showImportForm, setShowImportForm] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [importStatus, setImportStatus] = useState("");
  const importInputRef = useRef(null);

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

  const fetchCars = useCallback(async (pageNum = page) => {
    setCarsLoading(true);
    setCarsError("");
    try {
      const params = new URLSearchParams({
        per_page: String(CARS_PER_PAGE),
        page: String(pageNum),
      });
      const res = await fetch(`/api/v1/cars?${params}`, {
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
      setPagination(extractCarListMeta(data));
    } catch {
      setCarsError("Network error. Please try again.");
      setCars([]);
    } finally {
      setCarsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchCars(page);
  }, [page, fetchCars]);

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

  async function handleImportSubmit(e) {
    e.preventDefault();
    setImportError("");
    setImportStatus("");

    if (!importFile) {
      setImportError("Please choose a CSV file to import.");
      return;
    }

    const formData = new FormData();
    formData.append("file", importFile);

    setIsImporting(true);
    try {
      const res = await fetch("/api/v1/cars/import", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setImportError(
          data?.error ||
            data?.message ||
            "Failed to queue car import. Please try again.",
        );
        return;
      }

      const importId =
        data?.data?.id ||
        data?.id ||
        data?.import_id ||
        data?.importId ||
        "";

      setImportStatus(
        importId
          ? `Import queued successfully. Import ID: ${importId}`
          : "Import queued successfully.",
      );
      setImportFile(null);
      if (importInputRef.current) {
        importInputRef.current.value = "";
      }
      setShowImportForm(false);
      await fetchCars(page);
    } catch {
      setImportError("Network error. Please try again.");
    } finally {
      setIsImporting(false);
    }
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
      await fetchCars(page);
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
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setShowImportForm((prev) => !prev);
              setImportError("");
              setImportStatus("");
            }}
            className="inline-flex items-center gap-2 rounded-md border border-blue-900 bg-white px-4 py-2 text-sm font-semibold text-blue-900 shadow-sm transition hover:bg-blue-50"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 16V4m0 0-4 4m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
              />
            </svg>
            Import Car
          </button>
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
      </div>

      {showImportForm && (
        <div className="mt-4 rounded-xl border border-dashed border-blue-200 bg-blue-50 p-4 text-sm text-zinc-800">
          <form
            onSubmit={handleImportSubmit}
            className="flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <div className="flex-1">
              <label className={labelClass}>Import Cars CSV</label>
              <input
                ref={importInputRef}
                type="file"
                accept=".csv,text/csv"
                className={inputClass}
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setImportFile(file);
                  setImportError("");
                  setImportStatus("");
                }}
              />
              <p className="mt-1 text-xs text-zinc-500">
                Upload a CSV file to queue a car import.
              </p>
            </div>
            <div className="flex gap-2 pt-2 sm:pt-6">
              <button
                type="submit"
                disabled={isImporting}
                className="rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:opacity-50"
              >
                {isImporting ? "Importing..." : "Import CSV"}
              </button>
              <button
                type="button"
                disabled={isImporting}
                onClick={() => {
                  setShowImportForm(false);
                  setImportFile(null);
                  setImportError("");
                  setImportStatus("");
                  if (importInputRef.current) {
                    importInputRef.current.value = "";
                  }
                }}
                className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
          {importError && (
            <p className="mt-2 text-xs text-red-600">{importError}</p>
          )}
          {importStatus && (
            <p className="mt-2 text-xs text-teal-700">{importStatus}</p>
          )}
        </div>
      )}

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
            {carsLoading
              ? "Loading..."
              : pagination.total > 0
                ? `${pagination.total.toLocaleString()} cars registered (${CARS_PER_PAGE} per page)`
                : "0 cars registered"}
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
                        {car.id ? (
                          <Link
                            href={`/dashboard/cars/${encodeURIComponent(car.id)}`}
                            className="text-teal-600 transition hover:text-teal-700"
                            title="View car"
                            aria-label={`View ${car.make || ""} ${car.model || "car"}`.trim()}
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
                                d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <circle cx="12" cy="12" r="2.5" />
                            </svg>
                          </Link>
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="cursor-not-allowed text-zinc-300"
                            title="Car ID is unavailable"
                            aria-label="View not available"
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
                                d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <circle cx="12" cy="12" r="2.5" />
                            </svg>
                          </button>
                        )}
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
            {!carsLoading && pagination.lastPage > 1 && (
              <div className="mt-4 flex flex-col items-stretch justify-between gap-3 border-t border-zinc-100 pt-4 sm:flex-row sm:items-center">
                <p className="text-xs text-zinc-500">
                  {formatCarRangeLabel(page, cars.length, pagination.total)}
                </p>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    disabled={page <= 1 || carsLoading}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-zinc-600">
                    Page {page} of {pagination.lastPage}
                  </span>
                  <button
                    type="button"
                    disabled={page >= pagination.lastPage || carsLoading}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
