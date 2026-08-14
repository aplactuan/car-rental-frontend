"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DriverAutocomplete from "./DriverAutocomplete";
import FileUploadWithCamera from "@/app/dashboard/components/FileUploadWithCamera";
import ModalShell from "@/app/dashboard/components/ModalShell";

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
    <div className="grid gap-1 py-2.5 min-[400px]:grid-cols-[7.5rem_1fr] min-[400px]:gap-x-4 sm:grid-cols-[9rem_1fr]">
      <dt className="text-sm text-zinc-500">{label}</dt>
      <dd className="min-w-0 break-words text-sm font-medium text-zinc-900">{children}</dd>
    </div>
  );
}

function DocumentLink({ href, label }) {
  if (!href) {
    return <span className="text-zinc-400">—</span>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex max-w-full min-w-0 items-center gap-1 break-all text-xs font-medium text-red-700 transition hover:text-red-800"
    >
      {label}
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
  );
}

export default function TripReportActions({
  purchaseOrderId,
  tripReport,
  invoiceNumber = "",
  isViewOpen: isViewOpenProp,
  onViewOpenChange,
}) {
  const router = useRouter();
  const hasInvoice = Boolean(tripReport?.invoiceId);
  const [internalViewOpen, setInternalViewOpen] = useState(false);
  const isViewControlled = typeof onViewOpenChange === "function";
  const isViewOpen = isViewControlled ? Boolean(isViewOpenProp) : internalViewOpen;
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
    if (isViewControlled) {
      onViewOpenChange(true);
      return;
    }
    setInternalViewOpen(true);
  };

  const closeView = () => {
    if (isViewControlled) {
      onViewOpenChange(false);
      return;
    }
    setInternalViewOpen(false);
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
          className="text-xs font-medium text-red-700 transition hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-40"
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
        <ModalShell
          title="Trip report details"
          onClose={closeView}
          closeLabel="Close trip report details dialog"
        >
            <dl className="divide-y divide-zinc-100">
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
                    className="inline-flex items-center gap-1 font-medium text-red-700 transition hover:text-red-800"
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
        </ModalShell>
      ) : null}

      {isEditOpen ? (
        <ModalShell
          title="Edit trip report"
          description="Update trip details for this purchase order."
          onClose={closeEdit}
          closeDisabled={isSaving}
          closeLabel="Close edit trip report dialog"
        >
            <form onSubmit={handleSave} className="space-y-4">
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

              <div className="grid gap-3 sm:grid-cols-2">
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
                      className="font-medium text-red-700 hover:text-red-800"
                    >
                      View file
                    </a>
                  </p>
                ) : null}
                <FileUploadWithCamera
                  id={`edit-image-${tripReport.id}`}
                  accept=".jpg,.jpeg,.png,.webp,.heic,.heif,.pdf,.doc,.docx,.xls,.xlsx,image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onFilesChange={(files) => setImageFile(files[0] ?? null)}
                  disabled={isSaving}
                />
              </div>

              {error ? <p className="text-sm text-red-600">{error}</p> : null}

              <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
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
                  className="rounded-lg bg-red-400 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
        </ModalShell>
      ) : null}
    </div>
  );
}

export function TripReportRow({ purchaseOrderId, tripReport, linkedInvoice }) {
  const [isViewOpen, setIsViewOpen] = useState(false);
  const invoiceNumber = linkedInvoice?.invoiceNumber || "";

  return (
    <tr className="transition hover:bg-zinc-50/80">
      <td className="py-3.5 pr-6 font-medium text-zinc-900">
        <button
          type="button"
          onClick={() => setIsViewOpen(true)}
          className="text-left underline-offset-2 transition hover:text-red-700 hover:underline"
        >
          {tripReport.tripReportNo || "View trip report"}
        </button>
      </td>
      <td className="py-3.5 pr-6 text-zinc-700">
        {formatDate(tripReport.reportDate)}
      </td>
      <td className="py-3.5 pr-6 text-zinc-700">
        {formatDate(tripReport.tripStart)}
      </td>
      <td className="py-3.5 pr-6 text-zinc-700">
        {formatDate(tripReport.tripEnd)}
      </td>
      <td className="py-3.5 pr-6 text-zinc-700">
        {tripReport.driver || "—"}
      </td>
      <td className="max-w-xs py-3.5 pr-6 text-zinc-700">
        {tripReport.destinations || "—"}
      </td>
      <td className="py-3.5 pr-6 font-medium text-zinc-900">
        {formatPhp(tripReport.amount)}
      </td>
      <td className="py-3.5 pr-6">
        {tripReport.invoiceId ? (
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
            {linkedInvoice?.invoiceNumber || "Invoiced"}
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
            Unassigned
          </span>
        )}
      </td>
      <td className="py-3.5 pr-6">
        <DocumentLink href={tripReport.tripReportImageUrl} label="View" />
      </td>
      <td className="py-3.5 text-right">
        <TripReportActions
          purchaseOrderId={purchaseOrderId}
          tripReport={tripReport}
          invoiceNumber={invoiceNumber}
          isViewOpen={isViewOpen}
          onViewOpenChange={setIsViewOpen}
        />
      </td>
    </tr>
  );
}
