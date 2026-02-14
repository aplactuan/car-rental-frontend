"use client";

import { useState, useEffect } from "react";

const inputClass =
  "mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100";
const labelClass = "block text-xs font-medium text-zinc-700";

export default function DriversPage() {
  const [showForm, setShowForm] = useState(false);
  const [first_name, setFirstName] = useState("");
  const [last_name, setLastName] = useState("");
  const [license_number, setLicenseNumber] = useState("");
  const [license_expiry_date, setLicenseExpiryDate] = useState("");
  const [address, setAddress] = useState("");
  const [phone_number, setPhoneNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [drivers, setDrivers] = useState([]);
  const [driversLoading, setDriversLoading] = useState(true);
  const [driversError, setDriversError] = useState("");

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
      const readField = (source, keys) => {
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
      };

      const pick = (keys) => {
        const fromAttrs = readField(attrs, keys);
        if (fromAttrs !== "") return fromAttrs;
        return readField(driver, keys);
      };

      return {
        id:
          pick(["id"]) ||
          pick(["license_number", "licenseNumber", "licenseNUmber"]),
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
        address: pick(["address", "full_address", "fullAddress"]),
        phone_number: pick(["phone_number", "phoneNumber", "phoneNUmber"]),
      };
    });
  }

  function resetForm() {
    setFirstName("");
    setLastName("");
    setLicenseNumber("");
    setLicenseExpiryDate("");
    setAddress("");
    setPhoneNumber("");
    setError("");
  }

  async function fetchDrivers() {
    setDriversLoading(true);
    setDriversError("");
    try {
      const res = await fetch("/api/v1/drivers", {
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
    } catch {
      setDriversError("Network error. Please try again.");
      setDrivers([]);
    } finally {
      setDriversLoading(false);
    }
  }

  useEffect(() => {
    fetchDrivers();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/drivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          first_name,
          last_name,
          license_number,
          license_expiry_date,
          address,
          phone_number,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || data?.message || "Failed to add driver.");
        return;
      }
      setShowForm(false);
      resetForm();
      fetchDrivers();
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
          <h1 className="text-3xl font-bold tracking-tight">Drivers</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Manage your driver database
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
          Add Driver
        </button>
      </div>

      {showForm && (
        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-900">Add new driver</h2>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className={labelClass}>First name</label>
              <input
                type="text"
                value={first_name}
                onChange={(e) => setFirstName(e.target.value)}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Last name</label>
              <input
                type="text"
                value={last_name}
                onChange={(e) => setLastName(e.target.value)}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>License number</label>
              <input
                type="text"
                value={license_number}
                onChange={(e) => setLicenseNumber(e.target.value)}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>License expiry date</label>
              <input
                type="date"
                value={license_expiry_date}
                onChange={(e) => setLicenseExpiryDate(e.target.value)}
                className={inputClass}
                required
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
            <div>
              <label className={labelClass}>Phone number</label>
              <input
                type="text"
                value={phone_number}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className={inputClass}
              />
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
                {isLoading ? "Saving…" : "Save driver"}
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
          <div className="text-sm font-semibold text-zinc-900">Driver List</div>
          <div className="mt-1 text-xs text-zinc-500">
            {driversLoading ? "Loading…" : `${drivers.length} drivers registered`}
          </div>
        </div>
        {driversLoading ? (
          <div className="px-6 pb-6 text-sm text-zinc-500">Loading drivers…</div>
        ) : driversError ? (
          <div className="px-6 pb-6 text-sm text-red-600">{driversError}</div>
        ) : drivers.length === 0 ? (
          <div className="flex items-center justify-center px-6 pb-10">
            <p className="text-sm text-zinc-500">
              No drivers added yet. Create one to get started.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100 px-6 pb-2">
            {drivers.map((driver) => (
              <li
                key={driver.id ?? driver.license_number}
                className="flex flex-wrap items-center justify-between gap-2 py-4"
              >
                <div>
                  <p className="font-medium text-zinc-900">
                    {driver.first_name} {driver.last_name}
                  </p>
                  <p className="text-sm text-zinc-500">
                    License: {driver.license_number}
                    {driver.license_expiry_date &&
                      ` · Expires ${driver.license_expiry_date}`}
                  </p>
                  {(driver.address || driver.phone_number) && (
                    <p className="mt-1 text-sm text-zinc-600">
                      {[driver.address, driver.phone_number]
                        .filter(Boolean)
                        .join(" · ")}
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
