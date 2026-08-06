"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DriverAutocomplete from "./DriverAutocomplete";

function toDateInputValue(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    const asString = String(value);
    return asString.length >= 10 ? asString.slice(0, 10) : asString;
  }
  return parsed.toISOString().slice(0, 10);
}

function getAuthHeaders() {
  const authToken =
    typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  return {
    Accept: "application/json",
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
  };
}

function firstErrorMessage(data, keys = []) {
  for (const key of keys) {
    const value = data?.errors?.[key]?.[0];
    if (value) return value;
  }
  if (typeof data?.errors === "object") {
    const first = Object.values(data.errors).flat()?.[0];
    if (first) return first;
  }
  return data?.error || data?.message || null;
}

function formatPhp(amount) {
  if (typeof amount !== "number" || !Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    currencyDisplay: "code",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);

  return parsed.toLocaleDateString("en-PH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function DetailRow({ label, children }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-x-4 gap-y-1 py-2.5 sm:grid-cols-[9rem_1fr]">
      <dt className="text-sm text-zinc-500">{label}</dt>
      <dd className="text-sm font-medium text-zinc-900">{children}</dd>
    </div>
  );
}

export default function TripReportActions({
  purchaseOrderId,
  tripReport,
  invoiceNumber = "",
}) {
  const router = useRouter();
  const hasInvoice = Boolean(tripReport?.invoiceId);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [form, setForm] = useState({
    trip_report_no: "",
    report_date: "",
    trip_start: "",
    trip_end: "",
    driver: "",
    destinations: "",
    amount: "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  const reportPath =
    purchaseOrderId && tripReport?.id
      ? `/api/v1/purchase-orders/${encodeURIComponent(purchaseOrderId)}/trip-reports/${encodeURIComponent(tripReport.id)}`
      : "";

  const openView = () => {
    setIsViewOpen(true);
  };

  const closeView = () => {
    setIsViewOpen(false);
  };

  const openEdit = () => {
    if (hasInvoice) return;
    setError("");
    setImageFile(null);
    setForm({
      trip_report_no: tripReport.tripReportNo || "",
      report_date: toDateInputValue(tripReport.reportDate),
      trip_start: toDateInputValue(tripReport.tripStart),
      trip_end: toDateInputValue(tripReport.tripEnd),
      driver: tripReport.driver || "",
      destinations: tripReport.destinations || "",
      amount:
        typeof tripReport.amount === "number" ? String(tripReport.amount) : "",
    });
    setIsEditOpen(true);
  };

  const closeEdit = () => {
    if (isSaving) return;
    setIsEditOpen(false);
    setError("");
    setImageFile(null);
  };

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!reportPath || hasInvoice) return;

    const tripReportNo = form.trip_report_no.trim();
    const reportDate = form.report_date.trim();
    const tripStart = form.trip_start.trim();
    const tripEnd = form.trip_end.trim();
    const driver = form.driver.trim();
    const destinations = form.destinations.trim();
    const amountValue = form.amount.trim();

    if (!tripReportNo) {
      setError("Trip report no is required.");
      return;
    }
    if (!reportDate) {
      setError("Report date is required.");
      return;
    }
    if (!tripStart) {
      setError("Trip start is required.");
      return;
    }
    if (!tripEnd) {
      setError("Trip end is required.");
      return;
    }
    if (tripEnd < tripStart) {
      setError("Trip end must be on or after trip start.");
      return;
    }
    if (!driver) {
      setError("Driver is required.");
      return;
    }
    if (!destinations) {
      setError("Destinations is required.");
      return;
    }

    const amount = Number(amountValue);
    if (!Number.isInteger(amount) || amount < 0) {
      setError("Amount must be a whole number of at least 0.");
      return;
    }

    setError("");
    setIsSaving(true);

    try {
      let response;

      if (imageFile) {
        const body = new FormData();
        body.append("trip_report_no", tripReportNo);
        body.append("report_date", reportDate);
        body.append("trip_start", tripStart);
        body.append("trip_end", tripEnd);
        body.append("driver", driver);
        body.append("destinations", destinations);
        body.append("amount", String(amount));
        body.append("trip_report_image", imageFile);

        response = await fetch(reportPath, {
          method: "PUT",
          headers: getAuthHeaders(),
          credentials: "include",
          body,
        });
      } else {
        response = await fetch(reportPath, {
          method: "PUT",
          headers: {
            ...getAuthHeaders(),
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            trip_report_no: tripReportNo,
            report_date: reportDate,
            trip_start: tripStart,
            trip_end: tripEnd,
            driver,
            destinations,
            amount,
          }),
        });
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(
          firstErrorMessage(data, [
            "trip_report_no",
            "report_date",
            "trip_start",
            "trip_end",
            "driver",
            "destinations",
            "amount",
            "trip_report_image",
          ]) || "Failed to update trip report.",
        );
        return;
      }

      setIsEditOpen(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!reportPath || hasInvoice || isDeleting || isSaving) return;

    if (
      !window.confirm(
        "Delete this trip report? This action cannot be undone.",
      )
    ) {
      return;
    }

    setError("");
    setIsDeleting(true);

    try {
      const response = await fetch(reportPath, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      });

      if (!response.ok && response.status !== 204) {
        const data = await response.json().catch(() => ({}));
        setError(firstErrorMessage(data) || "Failed to delete trip report.");
        return;
      }

      setIsEditOpen(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const busy = isSaving || isDeleting;
  const lockedTitle = hasInvoice
    ? "Trip reports linked to an invoice cannot be edited or deleted"
    : undefined;

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={openView}
          disabled={busy}
          className="text-xs font-medium text-zinc-700 transition hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"
        >
          View
        </button>
        <button
          type="button"
          onClick={openEdit}
          disabled={busy || !purchaseOrderId || hasInvoice}
          title={lockedTitle}
          className="text-xs font-medium text-teal-700 transition hover:text-teal-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={busy || !purchaseOrderId || hasInvoice}
          title={lockedTitle}
          className="text-xs font-medium text-red-600 transition hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isDeleting ? "Deleting…" : "Delete"}
        </button>
      </div>
      {error && !isEditOpen ? (
        <p className="max-w-[12rem] text-right text-xs text-red-600">{error}</p>
      ) : null}

      {isViewOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 px-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-zinc-900">
                Trip report details
              </h2>
              <button
                type="button"
                onClick={closeView}
                aria-label="Close trip report details dialog"
                className="rounded-md p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700"
              >
                x
              </button>
            </div>

            <dl className="mt-4 divide-y divide-zinc-100">
              <DetailRow label="Trip report no">
                {tripReport.tripReportNo || "—"}
              </DetailRow>
              <DetailRow label="Report date">
                {formatDate(tripReport.reportDate)}
              </DetailRow>
              <DetailRow label="Trip start">
                {formatDate(tripReport.tripStart)}
              </DetailRow>
              <DetailRow label="Trip end">
                {formatDate(tripReport.tripEnd)}
              </DetailRow>
              <DetailRow label="Driver">
                {tripReport.driver || "—"}
              </DetailRow>
              <DetailRow label="Destinations">
                {tripReport.destinations || "—"}
              </DetailRow>
              <DetailRow label="Amount">
                {formatPhp(tripReport.amount)}
              </DetailRow>
              <DetailRow label="Invoice">
                {hasInvoice ? (
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                    {invoiceNumber || "Invoiced"}
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
                    Unassigned
                  </span>
                )}
              </DetailRow>
              <DetailRow label="Attachment">
                {tripReport.tripReportImageUrl ? (
                  <a
                    href={tripReport.tripReportImageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-teal-700 transition hover:text-teal-800"
                  >
                    View file
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="h-3.5 w-3.5"
                      aria-hidden
                    >
                      <path
                        d="M7 17L17 7M7 7h10v10"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </a>
                ) : (
                  "—"
                )}
              </DetailRow>
            </dl>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={closeView}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isEditOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 px-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900">
                  Edit trip report
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Update trip details for this purchase order.
                </p>
              </div>
              <button
                type="button"
                onClick={closeEdit}
                disabled={isSaving}
                aria-label="Close edit trip report dialog"
                className="rounded-md p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                x
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor={`edit-trip-report-no-${tripReport.id}`}
                  className="mb-2 block text-sm font-medium text-zinc-700"
                >
                  Trip report no
                </label>
                <input
                  id={`edit-trip-report-no-${tripReport.id}`}
                  type="text"
                  value={form.trip_report_no}
                  onChange={(event) =>
                    updateField("trip_report_no", event.target.value)
                  }
                  disabled={isSaving}
                  maxLength={255}
                  required
                  placeholder="e.g. TR-001"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-300 focus:ring-2 disabled:cursor-not-allowed disabled:bg-zinc-100"
                />
              </div>

              <div>
                <label
                  htmlFor={`edit-report-date-${tripReport.id}`}
                  className="mb-2 block text-sm font-medium text-zinc-700"
                >
                  Report date
                </label>
                <input
                  id={`edit-report-date-${tripReport.id}`}
                  type="date"
                  value={form.report_date}
                  onChange={(event) =>
                    updateField("report_date", event.target.value)
                  }
                  disabled={isSaving}
                  required
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-300 focus:ring-2 disabled:cursor-not-allowed disabled:bg-zinc-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor={`edit-trip-start-${tripReport.id}`}
                    className="mb-2 block text-sm font-medium text-zinc-700"
                  >
                    Trip start
                  </label>
                  <input
                    id={`edit-trip-start-${tripReport.id}`}
                    type="date"
                    value={form.trip_start}
                    onChange={(event) =>
                      updateField("trip_start", event.target.value)
                    }
                    disabled={isSaving}
                    required
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-300 focus:ring-2 disabled:cursor-not-allowed disabled:bg-zinc-100"
                  />
                </div>
                <div>
                  <label
                    htmlFor={`edit-trip-end-${tripReport.id}`}
                    className="mb-2 block text-sm font-medium text-zinc-700"
                  >
                    Trip end
                  </label>
                  <input
                    id={`edit-trip-end-${tripReport.id}`}
                    type="date"
                    value={form.trip_end}
                    onChange={(event) =>
                      updateField("trip_end", event.target.value)
                    }
                    disabled={isSaving}
                    required
                    min={form.trip_start || undefined}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-300 focus:ring-2 disabled:cursor-not-allowed disabled:bg-zinc-100"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor={`edit-driver-${tripReport.id}`}
                  className="mb-2 block text-sm font-medium text-zinc-700"
                >
                  Driver
                </label>
                <DriverAutocomplete
                  id={`edit-driver-${tripReport.id}`}
                  value={form.driver}
                  onChange={(nextValue) => updateField("driver", nextValue)}
                  disabled={isSaving}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor={`edit-destinations-${tripReport.id}`}
                  className="mb-2 block text-sm font-medium text-zinc-700"
                >
                  Destinations
                </label>
                <textarea
                  id={`edit-destinations-${tripReport.id}`}
                  value={form.destinations}
                  onChange={(event) =>
                    updateField("destinations", event.target.value)
                  }
                  disabled={isSaving}
                  rows={2}
                  required
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-300 focus:ring-2 disabled:cursor-not-allowed disabled:bg-zinc-100"
                />
              </div>

              <div>
                <label
                  htmlFor={`edit-amount-${tripReport.id}`}
                  className="mb-2 block text-sm font-medium text-zinc-700"
                >
                  Amount
                </label>
                <input
                  id={`edit-amount-${tripReport.id}`}
                  type="number"
                  min="0"
                  step="1"
                  value={form.amount}
                  onChange={(event) => updateField("amount", event.target.value)}
                  disabled={isSaving}
                  required
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-300 focus:ring-2 disabled:cursor-not-allowed disabled:bg-zinc-100"
                />
              </div>

              <div>
                <label
                  htmlFor={`edit-image-${tripReport.id}`}
                  className="mb-2 block text-sm font-medium text-zinc-700"
                >
                  Attachment{" "}
                  <span className="font-normal text-zinc-400">
                    (optional, jpg/png/webp/pdf/doc/xls, max 10 MB)
                  </span>
                </label>
                {tripReport.tripReportImageUrl ? (
                  <p className="mb-2 text-xs text-zinc-500">
                    Current:{" "}
                    <a
                      href={tripReport.tripReportImageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-teal-700 hover:text-teal-800"
                    >
                      View file
                    </a>
                  </p>
                ) : null}
                <input
                  id={`edit-image-${tripReport.id}`}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx,image/jpeg,image/png,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={(event) =>
                    setImageFile(event.target.files?.[0] ?? null)
                  }
                  disabled={isSaving}
                  className="w-full text-sm text-zinc-700 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-800 hover:file:bg-zinc-200 disabled:cursor-not-allowed"
                />
              </div>

              {error ? <p className="text-sm text-red-600">{error}</p> : null}

              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeEdit}
                  disabled={isSaving}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
