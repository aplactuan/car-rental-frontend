"use client";

import { useState, useEffect } from "react";

const inputClass =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";
const labelClass = "block text-sm font-medium text-zinc-700 dark:text-zinc-300";

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
      setDrivers(Array.isArray(data) ? data : data?.drivers ?? []);
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
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Drivers</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Manage drivers and license information.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowForm(true);
            resetForm();
          }}
          className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Add driver
        </button>
      </div>

      {showForm && (
        <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-lg font-medium">Add new driver</h2>
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
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
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
                className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          Drivers
        </h2>
        {driversLoading ? (
          <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-500">
            Loading drivers…
          </p>
        ) : driversError ? (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400">
            {driversError}
          </p>
        ) : drivers.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-500">
            No drivers yet. Add one with the button above.
          </p>
        ) : (
          
          <ul className="mt-4 divide-y divide-zinc-200 dark:divide-zinc-800">
            {drivers.map((driver) => (
              <li
                key={driver.id ?? driver.attributes.license_number}
                className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">
                    {driver.attributes.first_name} {driver.attributes.last_name}
                  </p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-500">
                    License: {driver.license_number}
                    {driver.license_expiry_date &&
                      ` · Expires ${driver.license_expiry_date}`}
                  </p>
                  {(driver.address || driver.phone_number) && (
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
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
