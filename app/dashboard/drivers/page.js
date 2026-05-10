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

function formatDateForInput(value) {
  if (!value) return "";
  const raw = String(value).trim();
  const matched = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (matched) return `${matched[1]}-${matched[2]}-${matched[3]}`;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function splitFullName(fullName) {
  const cleaned = String(fullName || "").trim().replace(/\s+/g, " ");
  if (!cleaned) return { first_name: "", last_name: "" };

  const parts = cleaned.split(" ");
  const first_name = parts.shift() || "";
  const last_name = parts.join(" ");
  return { first_name, last_name };
}

const DRIVERS_PER_PAGE = 10;

function formatDriverRangeLabel(page, driversOnPage, total) {
  if (total <= 0 || driversOnPage <= 0) return "";
  const from = (page - 1) * DRIVERS_PER_PAGE + 1;
  const to = from + driversOnPage - 1;
  return `Showing ${from.toLocaleString()}–${to.toLocaleString()} of ${total.toLocaleString()}`;
}

function extractDriverListMeta(payload) {
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

function normalizeDrivers(payload) {
  const rawDrivers = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.drivers)
        ? payload.drivers
        : [];

  return rawDrivers.map((driver) => {
    const attrs = driver?.attributes ?? {};

    const pick = (keys) => {
      const fromAttrs = readField(attrs, keys);
      if (fromAttrs !== "") return fromAttrs;
      return readField(driver, keys);
    };

    return {
      id:
        pick(["id"]) ||
        pick(["driver_id", "driverId"]) ||
        pick(["uuid", "driver_uuid", "driverUuid"]),
      first_name: pick(["first_name", "firstName"]),
      last_name: pick(["last_name", "lastName"]),
      license_number: pick([
        "license_number",
        "licenseNumber",
        "licenseNUmber",
      ]),
      license_expiry_date: pick([
        "license_expiry_date",
        "licenseExpiryDate",
        "licenseEXpiryDate",
      ]),
      address: pick(["address", "full_address", "fullAddress", "email"]),
      phone_number: pick(["phone_number", "phoneNumber", "phoneNUmber"]),
    };
  });
}

export default function DriversPage() {
  const [formMode, setFormMode] = useState(null);
  const [editingDriverId, setEditingDriverId] = useState("");
  const [name, setName] = useState("");
  const [license_number, setLicenseNumber] = useState("");
  const [license_expiry_date, setLicenseExpiryDate] = useState("");
  const [address, setAddress] = useState("");
  const [phone_number, setPhoneNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [drivers, setDrivers] = useState([]);
  const [driversLoading, setDriversLoading] = useState(true);
  const [driversError, setDriversError] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    lastPage: 1,
    total: 0,
  });
  const [nameSearchInput, setNameSearchInput] = useState("");
  const [nameSearch, setNameSearch] = useState("");
  const [showImportForm, setShowImportForm] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [importStatus, setImportStatus] = useState("");
  const importInputRef = useRef(null);

  function submitNameSearch(e) {
    e.preventDefault();
    const trimmed = nameSearchInput.trim();
    setNameSearch(trimmed);
    setPage(1);
  }

  function clearNameSearch() {
    setNameSearchInput("");
    setNameSearch("");
    setPage(1);
  }

  function resetForm() {
    setName("");
    setLicenseNumber("");
    setLicenseExpiryDate("");
    setAddress("");
    setPhoneNumber("");
    setFormError("");
    setEditingDriverId("");
  }

  const fetchDrivers = useCallback(
    async (pageNum = page) => {
      setDriversLoading(true);
      setDriversError("");
      try {
        const params = new URLSearchParams({
          per_page: String(DRIVERS_PER_PAGE),
          page: String(pageNum),
        });
        if (nameSearch) {
          params.set("filter", nameSearch);
        }
        const res = await fetch(`/api/v1/drivers?${params}`, {
          method: "GET",
          credentials: "include",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setDriversError(data?.error || data?.message || "Failed to load drivers.");
          setDrivers([]);
          return;
        }
        setDrivers(normalizeDrivers(data));
        setPagination(extractDriverListMeta(data));
      } catch {
        setDriversError("Network error. Please try again.");
        setDrivers([]);
      } finally {
        setDriversLoading(false);
      }
    },
    [page, nameSearch],
  );

  useEffect(() => {
    fetchDrivers(page);
  }, [page, fetchDrivers]);

  function openAddForm() {
    resetForm();
    setFormMode("add");
  }

  function openEditForm(driver) {
    setFormMode("edit");
    setEditingDriverId(driver.id || "");
    setName([driver.first_name, driver.last_name].filter(Boolean).join(" ").trim());
    setLicenseNumber(driver.license_number || "");
    setPhoneNumber(driver.phone_number || "");
    setAddress(driver.address || "");
    setLicenseExpiryDate(formatDateForInput(driver.license_expiry_date));
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
      const res = await fetch("/api/v1/drivers/import", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setImportError(
          data?.error ||
            data?.message ||
            "Failed to queue driver import. Please try again.",
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
      await fetchDrivers(page);
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
      const { first_name, last_name } = splitFullName(name);
      const payload = {
        first_name,
        last_name,
        license_number: license_number.trim(),
        license_expiry_date,
        address: address.trim(),
        phone_number: phone_number.trim(),
      };

      const isEdit = formMode === "edit";
      if (isEdit && !editingDriverId) {
        setFormError("Unable to update this driver because no driver ID was found.");
        return;
      }

      const endpoint = isEdit
        ? `/api/v1/drivers/${encodeURIComponent(editingDriverId)}`
        : "/api/v1/drivers";
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
            (isEdit ? "Failed to update driver." : "Failed to add driver."),
        );
        return;
      }
      closeForm();
      await fetchDrivers();
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
          <h1 className="text-3xl font-bold tracking-tight">Drivers</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Manage your driver database
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
                d="M4 4h16v4H4zm4 6h8m-8 4h5M6 20h12a2 2 0 0 0 2-2V6"
              />
            </svg>
            Export Driver
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
            Add Driver
          </button>
        </div>
      </div>

      {showImportForm && (
        <div className="mt-4 rounded-xl border border-dashed border-blue-200 bg-blue-50 p-4 text-sm text-zinc-800">
          <form onSubmit={handleImportSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex-1">
              <label className={labelClass}>Import Drivers CSV</label>
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
                Upload a CSV file to queue a driver import.
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
            {formMode === "edit" ? "Edit Driver" : "Add Driver"}
          </h2>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>License Number</label>
                <input
                  type="text"
                  value={license_number}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Phone</label>
                <input
                  type="text"
                  value={phone_number}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>License Expiry</label>
              <input
                type="date"
                value={license_expiry_date}
                onChange={(e) => setLicenseExpiryDate(e.target.value)}
                className={inputClass}
                required
              />
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
                    ? "Update Driver"
                    : "Save Driver"}
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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-zinc-900">Driver List</div>
              <div className="mt-1 text-xs text-zinc-500">
                {driversLoading
                  ? "Loading…"
                  : pagination.total > 0
                    ? nameSearch
                      ? `${pagination.total.toLocaleString()} matching driver${pagination.total === 1 ? "" : "s"} (${DRIVERS_PER_PAGE} per page)`
                      : `${pagination.total.toLocaleString()} drivers registered (${DRIVERS_PER_PAGE} per page)`
                    : nameSearch
                      ? `No matches for "${nameSearch}"`
                      : "0 drivers registered"}
              </div>
            </div>
            <form
              className="w-full sm:max-w-md sm:flex-none"
              onSubmit={submitNameSearch}
            >
              <label htmlFor="driver-name-search" className={labelClass}>
                Search by name
              </label>
              <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-start">
                <input
                  id="driver-name-search"
                  type="search"
                  placeholder="First or last name"
                  autoComplete="off"
                  value={nameSearchInput}
                  onChange={(e) => setNameSearchInput(e.target.value)}
                  className={`${inputClass.replace(/^mt-1\s+/, "")} sm:min-w-0 sm:flex-1`}
                />
                <div className="flex shrink-0 gap-2">
                  <button
                    type="submit"
                    className="rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
                  >
                    Search
                  </button>
                  <button
                    type="button"
                    disabled={!nameSearch && !nameSearchInput.trim()}
                    onClick={clearNameSearch}
                    className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
        {driversLoading ? (
          <div className="px-6 pb-6 text-sm text-zinc-500">Loading drivers…</div>
        ) : driversError ? (
          <div className="px-6 pb-6 text-sm text-red-600">{driversError}</div>
        ) : drivers.length === 0 ? (
          <div className="flex items-center justify-center px-6 pb-10">
            <p className="text-sm text-zinc-500">
              {nameSearch
                ? `No drivers match "${nameSearch}". Try another search.`
                : "No drivers added yet. Create one to get started."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto px-6 pb-4">
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-sm font-semibold text-zinc-800">
                  <th className="py-3 pr-4">Name</th>
                  <th className="py-3 pr-4">License</th>
                  <th className="py-3 pr-4">Phone</th>
                  <th className="py-3 pr-4">Address</th>
                  <th className="py-3 pr-4">License Expiry</th>
                  <th className="py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map((driver) => {
                  const rowName = [driver.first_name, driver.last_name]
                    .filter(Boolean)
                    .join(" ")
                    .trim();
                  return (
                    <tr
                      key={driver.id ?? driver.license_number}
                      className="border-b border-zinc-100 text-sm text-zinc-700"
                    >
                      <td className="py-4 pr-4 font-medium text-zinc-900">
                        {rowName || "-"}
                      </td>
                      <td className="py-4 pr-4">{driver.license_number || "-"}</td>
                      <td className="py-4 pr-4">{driver.phone_number || "-"}</td>
                      <td className="py-4 pr-4">{driver.address || "-"}</td>
                      <td className="py-4 pr-4">
                        {formatDateForInput(driver.license_expiry_date) || "-"}
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          {driver.id ? (
                            <Link
                              href={`/dashboard/drivers/${encodeURIComponent(driver.id)}`}
                              className="text-teal-600 transition hover:text-teal-700"
                              title="View driver"
                              aria-label={`View ${rowName || "driver"}`}
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
                              title="Driver ID is unavailable"
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
                            onClick={() => openEditForm(driver)}
                            className="text-blue-600 transition hover:text-blue-700"
                            title="Edit driver"
                            aria-label={`Edit ${rowName || "driver"}`}
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
                  );
                })}
              </tbody>
            </table>
            {!driversLoading && pagination.lastPage > 1 && (
              <div className="mt-4 flex flex-col items-stretch justify-between gap-3 border-t border-zinc-100 pt-4 sm:flex-row sm:items-center">
                <p className="text-xs text-zinc-500">
                  {formatDriverRangeLabel(page, drivers.length, pagination.total)}
                </p>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    disabled={page <= 1 || driversLoading}
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
                    disabled={page >= pagination.lastPage || driversLoading}
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
