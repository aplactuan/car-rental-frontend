"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const EMPTY_FORM = {
  report_date: "",
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

  const openDialog = () => {
    setError("");
    setImageFile(null);
    setForm({
      ...EMPTY_FORM,
      report_date: new Date().toISOString().slice(0, 10),
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    if (isLoading) return;
    setIsDialogOpen(false);
    setForm(EMPTY_FORM);
    setImageFile(null);
    setError("");
  };

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!purchaseOrderId) return;

    const reportDate = form.report_date.trim();
    const driver = form.driver.trim();
    const destinations = form.destinations.trim();
    const amountValue = form.amount.trim();

    if (!reportDate) {
      setError("Report date is required.");
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
      body.append("report_date", reportDate);
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
          data?.errors?.report_date?.[0] ||
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
        className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Add trip report
      </button>

      {isDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 px-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900">
                  Add trip report
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Log a trip against this purchase order.
                </p>
              </div>

              <button
                type="button"
                onClick={closeDialog}
                disabled={isLoading}
                aria-label="Close add trip report dialog"
                className="rounded-md p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                x
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
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
                  onChange={(event) =>
                    updateField("report_date", event.target.value)
                  }
                  disabled={isLoading}
                  required
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-300 focus:ring-2 disabled:cursor-not-allowed disabled:bg-zinc-100"
                />
              </div>

              <div>
                <label
                  htmlFor="driver"
                  className="mb-2 block text-sm font-medium text-zinc-700"
                >
                  Driver
                </label>
                <input
                  id="driver"
                  type="text"
                  value={form.driver}
                  onChange={(event) => updateField("driver", event.target.value)}
                  disabled={isLoading}
                  maxLength={255}
                  autoFocus
                  required
                  placeholder="e.g. Juan Dela Cruz"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-300 focus:ring-2 disabled:cursor-not-allowed disabled:bg-zinc-100"
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
                  Image{" "}
                  <span className="font-normal text-zinc-400">
                    (optional, jpg/png/webp, max 10 MB)
                  </span>
                </label>
                <input
                  id="tripReportImage"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={(event) =>
                    setImageFile(event.target.files?.[0] ?? null)
                  }
                  disabled={isLoading}
                  className="w-full text-sm text-zinc-700 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-800 hover:file:bg-zinc-200 disabled:cursor-not-allowed"
                />
              </div>

              {error ? <p className="text-sm text-red-600">{error}</p> : null}

              <div className="mt-5 flex justify-end gap-3">
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
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? "Adding..." : "Create trip report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
