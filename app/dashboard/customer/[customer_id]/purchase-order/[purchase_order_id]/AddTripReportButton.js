"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DriverAutocomplete from "./DriverAutocomplete";
import FileUploadWithCamera from "@/app/dashboard/components/FileUploadWithCamera";
import ModalShell from "@/app/dashboard/components/ModalShell";

const EMPTY_FORM = {
  trip_report_no: "",
  report_date: "",
  trip_start: "",
  trip_end: "",
  driver: "",
  destinations: "",
  amount: "",
};

export default function AddTripReportButton({ purchaseOrderId }) {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageFile, setImageFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [tripStartTouched, setTripStartTouched] = useState(false);
  const [tripEndTouched, setTripEndTouched] = useState(false);

  const openDialog = () => {
    const today = new Date().toISOString().slice(0, 10);
    setError("");
    setImageFile(null);
    setTripStartTouched(false);
    setTripEndTouched(false);
    setForm({
      ...EMPTY_FORM,
      report_date: today,
      trip_start: today,
      trip_end: today,
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    if (isLoading) return;
    setIsDialogOpen(false);
    setForm(EMPTY_FORM);
    setImageFile(null);
    setTripStartTouched(false);
    setTripEndTouched(false);
    setError("");
  };

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const updateReportDate = (value) => {
    setForm((current) => ({
      ...current,
      report_date: value,
      trip_start: tripStartTouched ? current.trip_start : value,
      trip_end: tripEndTouched ? current.trip_end : value,
    }));
  };

  const updateTripStart = (value) => {
    setTripStartTouched(true);
    updateField("trip_start", value);
  };

  const updateTripEnd = (value) => {
    setTripEndTouched(true);
    updateField("trip_end", value);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!purchaseOrderId) return;

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
    setIsLoading(true);

    try {
      const body = new FormData();
      body.append("trip_report_no", tripReportNo);
      body.append("report_date", reportDate);
      body.append("trip_start", tripStart);
      body.append("trip_end", tripEnd);
      body.append("driver", driver);
      body.append("destinations", destinations);
      body.append("amount", String(amount));
      if (imageFile) {
        body.append("trip_report_image", imageFile);
      }

      const authToken = localStorage.getItem("auth_token");
      const response = await fetch(
        `/api/v1/purchase-orders/${encodeURIComponent(purchaseOrderId)}/trip-reports`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          credentials: "include",
          body,
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const validationMessage =
          data?.errors?.trip_report_no?.[0] ||
          data?.errors?.report_date?.[0] ||
          data?.errors?.trip_start?.[0] ||
          data?.errors?.trip_end?.[0] ||
          data?.errors?.driver?.[0] ||
          data?.errors?.destinations?.[0] ||
          data?.errors?.amount?.[0] ||
          data?.errors?.trip_report_image?.[0] ||
          (typeof data?.errors === "object"
            ? Object.values(data.errors).flat()?.[0]
            : null);
        setError(
          validationMessage ||
            data?.error ||
            data?.message ||
            "Failed to create trip report.",
        );
        return;
      }

      setForm(EMPTY_FORM);
      setImageFile(null);
      setIsDialogOpen(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={openDialog}
        disabled={!purchaseOrderId}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-white/25 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition hover:border-white/40 hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          className="h-4 w-4"
          aria-hidden
        >
          <path
            d="M4 19l4.5-9 4 4L20 5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="20" cy="5" r="1.4" />
        </svg>
        Add trip report
      </button>

      {isDialogOpen ? (
        <ModalShell
          title="Add trip report"
          description="Log a trip against this purchase order."
          onClose={closeDialog}
          closeDisabled={isLoading}
          closeLabel="Close add trip report dialog"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="tripReportNo"
                  className="mb-2 block text-sm font-medium text-zinc-700"
                >
                  Trip report no
                </label>
                <input
                  id="tripReportNo"
                  type="text"
                  value={form.trip_report_no}
                  onChange={(event) =>
                    updateField("trip_report_no", event.target.value)
                  }
                  disabled={isLoading}
                  maxLength={255}
                  autoFocus
                  required
                  placeholder="e.g. TR-001"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-300 focus:ring-2 disabled:cursor-not-allowed disabled:bg-zinc-100"
                />
              </div>

              <div>
                <label
                  htmlFor="reportDate"
                  className="mb-2 block text-sm font-medium text-zinc-700"
                >
                  Report date
                </label>
                <input
                  id="reportDate"
                  type="date"
                  value={form.report_date}
                  onChange={(event) => updateReportDate(event.target.value)}
                  disabled={isLoading}
                  required
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-300 focus:ring-2 disabled:cursor-not-allowed disabled:bg-zinc-100"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="tripStart"
                    className="mb-2 block text-sm font-medium text-zinc-700"
                  >
                    Trip start
                  </label>
                  <input
                    id="tripStart"
                    type="date"
                    value={form.trip_start}
                    onChange={(event) => updateTripStart(event.target.value)}
                    disabled={isLoading}
                    required
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-300 focus:ring-2 disabled:cursor-not-allowed disabled:bg-zinc-100"
                  />
                </div>
                <div>
                  <label
                    htmlFor="tripEnd"
                    className="mb-2 block text-sm font-medium text-zinc-700"
                  >
                    Trip end
                  </label>
                  <input
                    id="tripEnd"
                    type="date"
                    value={form.trip_end}
                    onChange={(event) => updateTripEnd(event.target.value)}
                    disabled={isLoading}
                    required
                    min={form.trip_start || undefined}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-300 focus:ring-2 disabled:cursor-not-allowed disabled:bg-zinc-100"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="driver"
                  className="mb-2 block text-sm font-medium text-zinc-700"
                >
                  Driver
                </label>
                <DriverAutocomplete
                  id="driver"
                  value={form.driver}
                  onChange={(nextValue) => updateField("driver", nextValue)}
                  disabled={isLoading}
                  required
                  placeholder="e.g. Juan Dela Cruz"
                />
              </div>

              <div>
                <label
                  htmlFor="destinations"
                  className="mb-2 block text-sm font-medium text-zinc-700"
                >
                  Destinations
                </label>
                <textarea
                  id="destinations"
                  value={form.destinations}
                  onChange={(event) =>
                    updateField("destinations", event.target.value)
                  }
                  disabled={isLoading}
                  rows={2}
                  required
                  placeholder="e.g. Manila to Quezon City"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-300 focus:ring-2 disabled:cursor-not-allowed disabled:bg-zinc-100"
                />
              </div>

              <div>
                <label
                  htmlFor="tripAmount"
                  className="mb-2 block text-sm font-medium text-zinc-700"
                >
                  Amount
                </label>
                <input
                  id="tripAmount"
                  type="number"
                  min="0"
                  step="1"
                  value={form.amount}
                  onChange={(event) => updateField("amount", event.target.value)}
                  disabled={isLoading}
                  required
                  placeholder="0"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-300 focus:ring-2 disabled:cursor-not-allowed disabled:bg-zinc-100"
                />
              </div>

              <div>
                <label
                  htmlFor="tripReportImage"
                  className="mb-2 block text-sm font-medium text-zinc-700"
                >
                  Attachment{" "}
                  <span className="font-normal text-zinc-400">
                    (optional, jpg/png/webp/pdf/doc/xls, max 10 MB)
                  </span>
                </label>
                <FileUploadWithCamera
                  id="tripReportImage"
                  accept=".jpg,.jpeg,.png,.webp,.heic,.heif,.pdf,.doc,.docx,.xls,.xlsx,image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onFilesChange={(files) => setImageFile(files[0] ?? null)}
                  disabled={isLoading}
                />
              </div>

              {error ? <p className="text-sm text-red-600">{error}</p> : null}

              <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeDialog}
                  disabled={isLoading}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="rounded-lg bg-red-400 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? "Adding..." : "Create trip report"}
                </button>
              </div>
            </form>
        </ModalShell>
      ) : null}
    </div>
  );
}
