"use client";

import { useCallback, useEffect, useState } from "react";

const MAX_DESTINATIONS = 6;

const EMPTY_DESTINATION = { from: "", to: "" };

const EMPTY_FORM = {
  report_date: "",
  po_number: "",
  time_in: "",
  time_out: "",
  rate: "",
  odometer_in: "",
  odometer_out: "",
  fuel_liters: "",
  fuel_amount: "",
  invoice_or_or_number: "",
  collection_amount: "",
  percentage: "",
  destinations: [{ ...EMPTY_DESTINATION }],
};

function getBearerHeaders() {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function toNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function pickField(source, snakeKey, camelKey) {
  if (!source || typeof source !== "object") return "";
  const value = source[snakeKey] ?? source[camelKey];
  if (value === undefined || value === null) return "";
  return value;
}

function normalizeTripReport(record) {
  const source = record?.data ?? record ?? {};
  const attrs = source?.attributes ?? source;

  const destinations = Array.isArray(attrs?.destinations)
    ? attrs.destinations.map((entry) => ({
        from: entry?.from ?? "",
        to: entry?.to ?? "",
      }))
    : [];

  return {
    id: String(source?.id ?? attrs?.id ?? ""),
    reportDate: String(pickField(attrs, "report_date", "reportDate") || ""),
    poNumber: String(pickField(attrs, "po_number", "poNumber") || ""),
    timeIn: String(pickField(attrs, "time_in", "timeIn") || ""),
    timeOut: String(pickField(attrs, "time_out", "timeOut") || ""),
    rate: toNumber(pickField(attrs, "rate", "rate")),
    odometerIn: toNumber(pickField(attrs, "odometer_in", "odometerIn")),
    odometerOut: toNumber(pickField(attrs, "odometer_out", "odometerOut")),
    fuelLiters: toNumber(pickField(attrs, "fuel_liters", "fuelLiters")),
    fuelAmount: toNumber(pickField(attrs, "fuel_amount", "fuelAmount")),
    invoiceOrOrNumber: String(
      pickField(attrs, "invoice_or_or_number", "invoiceOrOrNumber") || "",
    ),
    collectionAmount: toNumber(
      pickField(attrs, "collection_amount", "collectionAmount"),
    ),
    percentage: toNumber(pickField(attrs, "percentage", "percentage")),
    destinations,
    driverNameSnapshot: String(
      pickField(attrs, "driver_name_snapshot", "driverNameSnapshot") || "",
    ),
    carPlateNumberSnapshot: String(
      pickField(attrs, "car_plate_number_snapshot", "carPlateNumberSnapshot") ||
        "",
    ),
    customerNameSnapshot: String(
      pickField(attrs, "customer_name_snapshot", "customerNameSnapshot") || "",
    ),
    transactionNameSnapshot: String(
      pickField(attrs, "transaction_name_snapshot", "transactionNameSnapshot") ||
        "",
    ),
  };
}

function normalizeTripReports(payload) {
  const raw = payload?.data ?? payload;
  const list = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
  return list.map((item) => normalizeTripReport(item)).filter((item) => item.id);
}

function reportToForm(report) {
  return {
    report_date: report.reportDate || "",
    po_number: report.poNumber || "",
    time_in: report.timeIn || "",
    time_out: report.timeOut || "",
    rate: report.rate != null ? String(report.rate) : "",
    odometer_in: report.odometerIn != null ? String(report.odometerIn) : "",
    odometer_out: report.odometerOut != null ? String(report.odometerOut) : "",
    fuel_liters: report.fuelLiters != null ? String(report.fuelLiters) : "",
    fuel_amount: report.fuelAmount != null ? String(report.fuelAmount) : "",
    invoice_or_or_number: report.invoiceOrOrNumber || "",
    collection_amount:
      report.collectionAmount != null ? String(report.collectionAmount) : "",
    percentage: report.percentage != null ? String(report.percentage) : "",
    destinations:
      report.destinations.length > 0
        ? report.destinations.map((entry) => ({
            from: entry.from || "",
            to: entry.to || "",
          }))
        : [{ ...EMPTY_DESTINATION }],
  };
}

function buildPayload(form, { includeReportDate = true } = {}) {
  const payload = {};

  if (includeReportDate && form.report_date.trim()) {
    payload.report_date = form.report_date.trim();
  }

  const optionalStrings = [
    ["po_number", form.po_number],
    ["time_in", form.time_in],
    ["time_out", form.time_out],
    ["invoice_or_or_number", form.invoice_or_or_number],
  ];

  for (const [key, value] of optionalStrings) {
    const trimmed = String(value ?? "").trim();
    if (trimmed) payload[key] = trimmed;
  }

  const optionalNumbers = [
    ["rate", form.rate],
    ["odometer_in", form.odometer_in],
    ["odometer_out", form.odometer_out],
    ["fuel_liters", form.fuel_liters],
    ["fuel_amount", form.fuel_amount],
    ["collection_amount", form.collection_amount],
    ["percentage", form.percentage],
  ];

  for (const [key, value] of optionalNumbers) {
    const trimmed = String(value ?? "").trim();
    if (!trimmed) continue;
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) payload[key] = parsed;
  }

  const destinations = (form.destinations || [])
    .map((entry) => ({
      from: String(entry.from ?? "").trim(),
      to: String(entry.to ?? "").trim(),
    }))
    .filter((entry) => entry.from || entry.to);

  if (destinations.length > 0) {
    payload.destinations = destinations.slice(0, MAX_DESTINATIONS);
  }

  return payload;
}

function formatCurrency(amount) {
  if (typeof amount !== "number" || !Number.isFinite(amount)) return "—";
  return `PHP ${Math.round(amount).toLocaleString("en-US")}`;
}

function formatDate(value) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function formatTimeRange(timeIn, timeOut) {
  if (!timeIn && !timeOut) return "—";
  if (timeIn && timeOut) return `${timeIn} – ${timeOut}`;
  return timeIn || timeOut;
}

function ModalShell({ title, description, onClose, children, wide = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 px-4 py-6">
      <div
        className={`flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl ${
          wide ? "max-w-3xl" : "max-w-lg"
        }`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900">{title}</h3>
            {description ? (
              <p className="mt-1 text-sm text-zinc-500">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-md p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700"
          >
            ×
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function FieldLabel({ htmlFor, children, required = false }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-zinc-700">
      {children}
      {required ? <span className="text-red-500"> *</span> : null}
    </label>
  );
}

function inputClassName(disabled = false) {
  return `w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-300 focus:ring-2 disabled:cursor-not-allowed disabled:bg-zinc-100 ${
    disabled ? "bg-zinc-50" : ""
  }`;
}

function DetailField({ label, value }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2.5">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-zinc-900">{value || "—"}</p>
    </div>
  );
}

function TripReportForm({
  form,
  setForm,
  disabled = false,
  requireReportDate = false,
  lockReportDate = false,
}) {
  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const updateDestination = (index, key, value) => {
    setForm((current) => {
      const next = [...(current.destinations || [])];
      next[index] = { ...next[index], [key]: value };
      return { ...current, destinations: next };
    });
  };

  const addDestination = () => {
    setForm((current) => {
      const list = current.destinations || [];
      if (list.length >= MAX_DESTINATIONS) return current;
      return { ...current, destinations: [...list, { ...EMPTY_DESTINATION }] };
    });
  };

  const removeDestination = (index) => {
    setForm((current) => {
      const list = [...(current.destinations || [])];
      list.splice(index, 1);
      return {
        ...current,
        destinations: list.length > 0 ? list : [{ ...EMPTY_DESTINATION }],
      };
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="report_date" required={requireReportDate}>
            Report date
          </FieldLabel>
          <input
            id="report_date"
            type="date"
            value={form.report_date}
            onChange={(event) => updateField("report_date", event.target.value)}
            disabled={disabled || lockReportDate}
            required={requireReportDate}
            className={inputClassName(disabled || lockReportDate)}
          />
        </div>
        <div>
          <FieldLabel htmlFor="po_number">PO number</FieldLabel>
          <input
            id="po_number"
            type="text"
            value={form.po_number}
            onChange={(event) => updateField("po_number", event.target.value)}
            disabled={disabled}
            className={inputClassName(disabled)}
          />
        </div>
        <div>
          <FieldLabel htmlFor="time_in">Time in</FieldLabel>
          <input
            id="time_in"
            type="time"
            value={form.time_in}
            onChange={(event) => updateField("time_in", event.target.value)}
            disabled={disabled}
            className={inputClassName(disabled)}
          />
        </div>
        <div>
          <FieldLabel htmlFor="time_out">Time out</FieldLabel>
          <input
            id="time_out"
            type="time"
            value={form.time_out}
            onChange={(event) => updateField("time_out", event.target.value)}
            disabled={disabled}
            className={inputClassName(disabled)}
          />
        </div>
        <div>
          <FieldLabel htmlFor="rate">Rate</FieldLabel>
          <input
            id="rate"
            type="number"
            min="0"
            step="0.01"
            value={form.rate}
            onChange={(event) => updateField("rate", event.target.value)}
            disabled={disabled}
            className={inputClassName(disabled)}
          />
        </div>
        <div>
          <FieldLabel htmlFor="collection_amount">Collection amount</FieldLabel>
          <input
            id="collection_amount"
            type="number"
            min="0"
            step="0.01"
            value={form.collection_amount}
            onChange={(event) => updateField("collection_amount", event.target.value)}
            disabled={disabled}
            className={inputClassName(disabled)}
          />
        </div>
        <div>
          <FieldLabel htmlFor="odometer_in">Odometer in</FieldLabel>
          <input
            id="odometer_in"
            type="number"
            min="0"
            step="1"
            value={form.odometer_in}
            onChange={(event) => updateField("odometer_in", event.target.value)}
            disabled={disabled}
            className={inputClassName(disabled)}
          />
        </div>
        <div>
          <FieldLabel htmlFor="odometer_out">Odometer out</FieldLabel>
          <input
            id="odometer_out"
            type="number"
            min="0"
            step="1"
            value={form.odometer_out}
            onChange={(event) => updateField("odometer_out", event.target.value)}
            disabled={disabled}
            className={inputClassName(disabled)}
          />
        </div>
        <div>
          <FieldLabel htmlFor="fuel_liters">Fuel (liters)</FieldLabel>
          <input
            id="fuel_liters"
            type="number"
            min="0"
            step="0.01"
            value={form.fuel_liters}
            onChange={(event) => updateField("fuel_liters", event.target.value)}
            disabled={disabled}
            className={inputClassName(disabled)}
          />
        </div>
        <div>
          <FieldLabel htmlFor="fuel_amount">Fuel amount</FieldLabel>
          <input
            id="fuel_amount"
            type="number"
            min="0"
            step="0.01"
            value={form.fuel_amount}
            onChange={(event) => updateField("fuel_amount", event.target.value)}
            disabled={disabled}
            className={inputClassName(disabled)}
          />
        </div>
        <div>
          <FieldLabel htmlFor="invoice_or_or_number">Invoice / OR number</FieldLabel>
          <input
            id="invoice_or_or_number"
            type="text"
            value={form.invoice_or_or_number}
            onChange={(event) =>
              updateField("invoice_or_or_number", event.target.value)
            }
            disabled={disabled}
            className={inputClassName(disabled)}
          />
        </div>
        <div>
          <FieldLabel htmlFor="percentage">Percentage</FieldLabel>
          <input
            id="percentage"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={form.percentage}
            onChange={(event) => updateField("percentage", event.target.value)}
            disabled={disabled}
            className={inputClassName(disabled)}
          />
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-zinc-700">Destinations</p>
          {!disabled && (form.destinations?.length || 0) < MAX_DESTINATIONS ? (
            <button
              type="button"
              onClick={addDestination}
              className="text-sm font-medium text-teal-700 transition hover:text-teal-800"
            >
              Add destination
            </button>
          ) : null}
        </div>
        <div className="space-y-2">
          {(form.destinations || []).map((entry, index) => (
            <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <input
                type="text"
                placeholder="From"
                value={entry.from}
                onChange={(event) =>
                  updateDestination(index, "from", event.target.value)
                }
                disabled={disabled}
                className={inputClassName(disabled)}
              />
              <input
                type="text"
                placeholder="To"
                value={entry.to}
                onChange={(event) =>
                  updateDestination(index, "to", event.target.value)
                }
                disabled={disabled}
                className={inputClassName(disabled)}
              />
              {!disabled && (form.destinations?.length || 0) > 1 ? (
                <button
                  type="button"
                  onClick={() => removeDestination(index)}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-600 transition hover:bg-zinc-50"
                >
                  Remove
                </button>
              ) : (
                <span className="hidden sm:block" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function BookingTripReportsSection({ transactionId, bookingId }) {
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ ...EMPTY_FORM });
  const [createError, setCreateError] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const [selectedReport, setSelectedReport] = useState(null);
  const [detailMode, setDetailMode] = useState("view");
  const [detailForm, setDetailForm] = useState({ ...EMPTY_FORM });
  const [detailError, setDetailError] = useState("");
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const basePath =
    transactionId && bookingId
      ? `/api/v1/transactions/${encodeURIComponent(transactionId)}/bookings/${encodeURIComponent(bookingId)}/trip-reports`
      : "";

  const loadReports = useCallback(async () => {
    if (!basePath) {
      setReports([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setListError("");

    try {
      const response = await fetch(basePath, {
        headers: {
          Accept: "application/json",
          ...getBearerHeaders(),
        },
        credentials: "include",
        cache: "no-store",
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setReports([]);
        setListError(data?.error || data?.message || "Failed to load trip reports.");
        return;
      }

      setReports(normalizeTripReports(data));
    } catch {
      setReports([]);
      setListError("Network error while loading trip reports.");
    } finally {
      setIsLoading(false);
    }
  }, [basePath]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const openCreateModal = () => {
    setCreateForm({ ...EMPTY_FORM, destinations: [{ ...EMPTY_DESTINATION }] });
    setCreateError("");
    setIsCreateOpen(true);
  };

  const closeCreateModal = () => {
    if (isCreating) return;
    setIsCreateOpen(false);
    setCreateError("");
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!basePath) return;

    if (!createForm.report_date.trim()) {
      setCreateError("Report date is required.");
      return;
    }

    setCreateError("");
    setIsCreating(true);

    try {
      const response = await fetch(basePath, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...getBearerHeaders(),
        },
        credentials: "include",
        body: JSON.stringify(buildPayload(createForm, { includeReportDate: true })),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setCreateError(data?.error || data?.message || "Failed to create trip report.");
        return;
      }

      setIsCreateOpen(false);
      setCreateForm({ ...EMPTY_FORM, destinations: [{ ...EMPTY_DESTINATION }] });
      await loadReports();
    } catch {
      setCreateError("Network error. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const openReportModal = async (reportId) => {
    if (!basePath || !reportId) return;

    setSelectedReport(null);
    setDetailMode("view");
    setDetailError("");
    setIsDetailLoading(true);

    try {
      const response = await fetch(
        `${basePath}/${encodeURIComponent(reportId)}`,
        {
          headers: {
            Accept: "application/json",
            ...getBearerHeaders(),
          },
          credentials: "include",
          cache: "no-store",
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setDetailError(data?.error || data?.message || "Failed to load trip report.");
        setSelectedReport({ id: reportId });
        return;
      }

      const normalized = normalizeTripReport(data);
      setSelectedReport(normalized);
      setDetailForm(reportToForm(normalized));
    } catch {
      setDetailError("Network error while loading trip report.");
      setSelectedReport({ id: reportId });
    } finally {
      setIsDetailLoading(false);
    }
  };

  const closeReportModal = () => {
    if (isSaving || isDeleting) return;
    setSelectedReport(null);
    setDetailMode("view");
    setDetailError("");
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!basePath || !selectedReport?.id) return;

    setDetailError("");
    setIsSaving(true);

    try {
      const response = await fetch(
        `${basePath}/${encodeURIComponent(selectedReport.id)}`,
        {
          method: "PUT",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...getBearerHeaders(),
          },
          credentials: "include",
          body: JSON.stringify(buildPayload(detailForm, { includeReportDate: false })),
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setDetailError(data?.error || data?.message || "Failed to update trip report.");
        return;
      }

      const normalized = normalizeTripReport(data);
      setSelectedReport(normalized);
      setDetailForm(reportToForm(normalized));
      setDetailMode("view");
      await loadReports();
    } catch {
      setDetailError("Network error. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!basePath || !selectedReport?.id) return;
    if (!window.confirm("Delete this trip report? This action cannot be undone.")) {
      return;
    }

    setDetailError("");
    setIsDeleting(true);

    try {
      const response = await fetch(
        `${basePath}/${encodeURIComponent(selectedReport.id)}`,
        {
          method: "DELETE",
          headers: {
            Accept: "application/json",
            ...getBearerHeaders(),
          },
          credentials: "include",
        },
      );

      if (!response.ok && response.status !== 204) {
        const data = await response.json().catch(() => ({}));
        setDetailError(data?.error || data?.message || "Failed to delete trip report.");
        return;
      }

      closeReportModal();
      await loadReports();
    } catch {
      setDetailError("Network error. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!transactionId || !bookingId) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Trip reports are unavailable because this booking is missing a transaction
        reference.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-zinc-500">
            Log daily trip details for this booking. Only admins and the assigned
            driver can manage reports.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-800"
        >
          Add trip report
        </button>
      </div>

      {listError ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {listError}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
          Loading trip reports…
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/70 px-4 py-8 text-center text-sm text-zinc-500">
          No trip reports yet. Add the first report for this booking.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-zinc-600">
                  Date
                </th>
                <th className="px-4 py-3 text-left font-semibold text-zinc-600">
                  PO number
                </th>
                <th className="px-4 py-3 text-left font-semibold text-zinc-600">
                  Time
                </th>
                <th className="px-4 py-3 text-left font-semibold text-zinc-600">
                  Collection
                </th>
                <th className="px-4 py-3 text-left font-semibold text-zinc-600">
                  Rate
                </th>
                <th className="px-4 py-3 text-right font-semibold text-zinc-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-zinc-50/80">
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    {formatDate(report.reportDate)}
                  </td>
                  <td className="px-4 py-3 text-zinc-700">{report.poNumber || "—"}</td>
                  <td className="px-4 py-3 text-zinc-700">
                    {formatTimeRange(report.timeIn, report.timeOut)}
                  </td>
                  <td className="px-4 py-3 text-zinc-700">
                    {formatCurrency(report.collectionAmount)}
                  </td>
                  <td className="px-4 py-3 text-zinc-700">
                    {formatCurrency(report.rate)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openReportModal(report.id)}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-teal-700 transition hover:bg-teal-50"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isCreateOpen ? (
        <ModalShell
          title="Add trip report"
          description="Report date is required. All other fields are optional."
          onClose={closeCreateModal}
          wide
        >
          <form onSubmit={handleCreate}>
            <TripReportForm
              form={createForm}
              setForm={setCreateForm}
              requireReportDate
            />
            {createError ? (
              <p className="mt-4 text-sm text-red-600">{createError}</p>
            ) : null}
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeCreateModal}
                disabled={isCreating}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating}
                className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreating ? "Creating…" : "Create report"}
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {selectedReport ? (
        <ModalShell
          title={detailMode === "edit" ? "Edit trip report" : "Trip report details"}
          description={
            detailMode === "view" && selectedReport.reportDate
              ? formatDate(selectedReport.reportDate)
              : "Update trip report fields for this booking."
          }
          onClose={closeReportModal}
          wide
        >
          {isDetailLoading ? (
            <p className="text-sm text-zinc-500">Loading trip report…</p>
          ) : detailMode === "edit" ? (
            <form onSubmit={handleSave}>
              <TripReportForm form={detailForm} setForm={setDetailForm} lockReportDate />
              {detailError ? (
                <p className="mt-4 text-sm text-red-600">{detailError}</p>
              ) : null}
              <div className="mt-5 flex flex-wrap justify-between gap-3">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isSaving || isDeleting}
                  className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isDeleting ? "Deleting…" : "Delete"}
                </button>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setDetailMode("view");
                      setDetailError("");
                      if (selectedReport) setDetailForm(reportToForm(selectedReport));
                    }}
                    disabled={isSaving || isDeleting}
                    className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving || isDeleting}
                    className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSaving ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div>
              {detailError && !selectedReport.reportDate ? (
                <p className="mb-4 text-sm text-red-600">{detailError}</p>
              ) : null}

              {selectedReport.reportDate ? (
                <>
                  <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <DetailField
                      label="Driver snapshot"
                      value={selectedReport.driverNameSnapshot}
                    />
                    <DetailField
                      label="Plate snapshot"
                      value={selectedReport.carPlateNumberSnapshot}
                    />
                    <DetailField
                      label="Customer snapshot"
                      value={selectedReport.customerNameSnapshot}
                    />
                    <DetailField
                      label="Transaction snapshot"
                      value={selectedReport.transactionNameSnapshot}
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <DetailField label="PO number" value={selectedReport.poNumber} />
                    <DetailField
                      label="Time in / out"
                      value={formatTimeRange(
                        selectedReport.timeIn,
                        selectedReport.timeOut,
                      )}
                    />
                    <DetailField label="Rate" value={formatCurrency(selectedReport.rate)} />
                    <DetailField
                      label="Collection amount"
                      value={formatCurrency(selectedReport.collectionAmount)}
                    />
                    <DetailField
                      label="Odometer in"
                      value={
                        selectedReport.odometerIn != null
                          ? String(selectedReport.odometerIn)
                          : "—"
                      }
                    />
                    <DetailField
                      label="Odometer out"
                      value={
                        selectedReport.odometerOut != null
                          ? String(selectedReport.odometerOut)
                          : "—"
                      }
                    />
                    <DetailField
                      label="Fuel (liters)"
                      value={
                        selectedReport.fuelLiters != null
                          ? String(selectedReport.fuelLiters)
                          : "—"
                      }
                    />
                    <DetailField
                      label="Fuel amount"
                      value={formatCurrency(selectedReport.fuelAmount)}
                    />
                    <DetailField
                      label="Invoice / OR number"
                      value={selectedReport.invoiceOrOrNumber}
                    />
                    <DetailField
                      label="Percentage"
                      value={
                        selectedReport.percentage != null
                          ? `${selectedReport.percentage}%`
                          : "—"
                      }
                    />
                  </div>

                  {selectedReport.destinations.length > 0 ? (
                    <div className="mt-5">
                      <p className="mb-2 text-sm font-medium text-zinc-700">
                        Destinations
                      </p>
                      <div className="space-y-2">
                        {selectedReport.destinations.map((entry, index) => (
                          <div
                            key={index}
                            className="rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2 text-sm text-zinc-800"
                          >
                            {entry.from || "—"} → {entry.to || "—"}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </>
              ) : null}

              <div className="mt-5 flex flex-wrap justify-between gap-3">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting || isDetailLoading}
                  className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isDeleting ? "Deleting…" : "Delete"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDetailMode("edit");
                    setDetailError("");
                  }}
                  disabled={isDetailLoading || !selectedReport.reportDate}
                  className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Edit report
                </button>
              </div>
            </div>
          )}
        </ModalShell>
      ) : null}
    </div>
  );
}
