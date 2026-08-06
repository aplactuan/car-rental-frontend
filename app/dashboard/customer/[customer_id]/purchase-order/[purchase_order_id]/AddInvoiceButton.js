"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const EMPTY_FORM = {
  invoice_number: "",
  lddap_adap_no: "",
  note: "",
  status: "unpaid",
};

const FILE_ACCEPT = "image/jpeg,image/jpg,image/png,image/webp,application/pdf";
const INVOICE_STATUS_OPTIONS = [
  { value: "unpaid", label: "Unpaid" },
  { value: "paid", label: "Paid" },
];

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

export default function AddInvoiceButton({
  purchaseOrderId,
  availableTripReports = [],
}) {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [paymentReceipt, setPaymentReceipt] = useState(null);
  const [disbursementVoucher, setDisbursementVoucher] = useState(null);
  const [selectedTripReportIds, setSelectedTripReportIds] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [invoiceCreated, setInvoiceCreated] = useState(false);

  const openDialog = () => {
    setError("");
    setPaymentReceipt(null);
    setDisbursementVoucher(null);
    setSelectedTripReportIds([]);
    setInvoiceCreated(false);
    setForm(EMPTY_FORM);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    if (isLoading) return;
    setIsDialogOpen(false);
    setForm(EMPTY_FORM);
    setPaymentReceipt(null);
    setDisbursementVoucher(null);
    setSelectedTripReportIds([]);
    setInvoiceCreated(false);
    setError("");
  };

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const toggleTripReport = (tripReportId) => {
    setSelectedTripReportIds((current) =>
      current.includes(tripReportId)
        ? current.filter((id) => id !== tripReportId)
        : [...current, tripReportId],
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!purchaseOrderId) return;

    const invoiceNumber = form.invoice_number.trim();
    const lddapAdapNo = form.lddap_adap_no.trim();
    const note = form.note.trim();
    const status = form.status === "paid" ? "paid" : "unpaid";

    if (!invoiceNumber) {
      setError("Invoice number is required.");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const body = new FormData();
      body.append("invoice_number", invoiceNumber);
      if (lddapAdapNo) {
        body.append("lddap_adap_no", lddapAdapNo);
      }
      body.append("status", status);
      if (note) {
        body.append("note", note);
      }
      if (paymentReceipt) {
        body.append("payment_receipt", paymentReceipt);
      }
      if (disbursementVoucher) {
        body.append("disbursement_voucher", disbursementVoucher);
      }

      const authToken = localStorage.getItem("auth_token");
      const authHeaders = {
        Accept: "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      };

      const response = await fetch(
        `/api/v1/purchase-orders/${encodeURIComponent(purchaseOrderId)}/invoices`,
        {
          method: "POST",
          headers: authHeaders,
          credentials: "include",
          body,
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const validationMessage =
          data?.errors?.invoice_number?.[0] ||
          data?.errors?.lddap_adap_no?.[0] ||
          data?.errors?.note?.[0] ||
          data?.errors?.status?.[0] ||
          data?.errors?.payment_receipt?.[0] ||
          data?.errors?.disbursement_voucher?.[0] ||
          (typeof data?.errors === "object"
            ? Object.values(data.errors).flat()?.[0]
            : null);
        setError(
          validationMessage ||
            data?.error ||
            data?.message ||
            "Failed to create invoice.",
        );
        return;
      }

      const invoiceId = String(data?.data?.id ?? data?.id ?? "");

      if (selectedTripReportIds.length > 0 && invoiceId) {
        const attachResponse = await fetch(
          `/api/v1/purchase-orders/${encodeURIComponent(purchaseOrderId)}/invoices/${encodeURIComponent(invoiceId)}/trip-reports`,
          {
            method: "POST",
            headers: {
              ...authHeaders,
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              trip_report_ids: selectedTripReportIds,
            }),
          },
        );

        const attachData = await attachResponse.json().catch(() => ({}));

        if (!attachResponse.ok) {
          const attachMessage =
            attachData?.errors?.trip_report_ids?.[0] ||
            (typeof attachData?.errors === "object"
              ? Object.values(attachData.errors).flat()?.[0]
              : null) ||
            attachData?.error ||
            attachData?.message ||
            "Failed to attach trip reports.";
          setError(
            `Invoice created, but trip reports were not attached: ${attachMessage}`,
          );
          setInvoiceCreated(true);
          setForm(EMPTY_FORM);
          setPaymentReceipt(null);
          setDisbursementVoucher(null);
          setSelectedTripReportIds([]);
          router.refresh();
          return;
        }
      }

      setForm(EMPTY_FORM);
      setPaymentReceipt(null);
      setDisbursementVoucher(null);
      setSelectedTripReportIds([]);
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
        className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Add invoice
      </button>

      {isDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 px-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900">
                  Add invoice
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Create a purchase order invoice.
                </p>
              </div>

              <button
                type="button"
                onClick={closeDialog}
                disabled={isLoading}
                aria-label="Close add invoice dialog"
                className="rounded-md p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                x
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="invoiceNumber"
                  className="mb-2 block text-sm font-medium text-zinc-700"
                >
                  Invoice number
                </label>
                <input
                  id="invoiceNumber"
                  type="text"
                  value={form.invoice_number}
                  onChange={(event) =>
                    updateField("invoice_number", event.target.value)
                  }
                  disabled={isLoading}
                  maxLength={255}
                  autoFocus
                  required
                  placeholder="e.g. INV-1001"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-300 focus:ring-2 disabled:cursor-not-allowed disabled:bg-zinc-100"
                />
              </div>

              <div>
                <label
                  htmlFor="lddapAdapNo"
                  className="mb-2 block text-sm font-medium text-zinc-700"
                >
                  LDDAP/ADAP number{" "}
                  <span className="font-normal text-zinc-400">(optional)</span>
                </label>
                <input
                  id="lddapAdapNo"
                  type="text"
                  value={form.lddap_adap_no}
                  onChange={(event) =>
                    updateField("lddap_adap_no", event.target.value)
                  }
                  disabled={isLoading}
                  maxLength={255}
                  placeholder="e.g. LDDAP-2026-001"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-300 focus:ring-2 disabled:cursor-not-allowed disabled:bg-zinc-100"
                />
              </div>

              <div>
                <label
                  htmlFor="invoiceNote"
                  className="mb-2 block text-sm font-medium text-zinc-700"
                >
                  Note{" "}
                  <span className="font-normal text-zinc-400">(optional)</span>
                </label>
                <textarea
                  id="invoiceNote"
                  value={form.note}
                  onChange={(event) => updateField("note", event.target.value)}
                  disabled={isLoading}
                  rows={2}
                  placeholder="e.g. Payment for July trips"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-300 focus:ring-2 disabled:cursor-not-allowed disabled:bg-zinc-100"
                />
              </div>

              <div>
                <label
                  htmlFor="invoiceStatus"
                  className="mb-2 block text-sm font-medium text-zinc-700"
                >
                  Status
                </label>
                <select
                  id="invoiceStatus"
                  value={form.status}
                  onChange={(event) => updateField("status", event.target.value)}
                  disabled={isLoading}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-300 focus:ring-2 disabled:cursor-not-allowed disabled:bg-zinc-100"
                >
                  {INVOICE_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <fieldset>
                <legend className="mb-2 block text-sm font-medium text-zinc-700">
                  Trip reports{" "}
                  <span className="font-normal text-zinc-400">(optional)</span>
                </legend>
                {availableTripReports.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-500">
                    No unassigned trip reports available.
                  </p>
                ) : (
                  <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-zinc-200 p-3">
                    {availableTripReports.map((report) => {
                      const checked = selectedTripReportIds.includes(report.id);
                      const inputId = `trip-report-${report.id}`;

                      return (
                        <label
                          key={report.id}
                          htmlFor={inputId}
                          className={`flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 transition hover:bg-zinc-50 ${
                            isLoading ? "cursor-not-allowed opacity-60" : ""
                          }`}
                        >
                          <input
                            id={inputId}
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleTripReport(report.id)}
                            disabled={isLoading}
                            className="mt-1 h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-400"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium text-zinc-900">
                              {report.tripReportNo
                                ? `${report.tripReportNo} · `
                                : ""}
                              {formatDate(report.reportDate)} ·{" "}
                              {report.driver || "—"}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-zinc-500">
                              {report.destinations || "—"} ·{" "}
                              {formatPhp(report.amount)}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </fieldset>

              <div>
                <label
                  htmlFor="paymentReceipt"
                  className="mb-2 block text-sm font-medium text-zinc-700"
                >
                  Payment receipt{" "}
                  <span className="font-normal text-zinc-400">
                    (optional, image/PDF, max 10 MB)
                  </span>
                </label>
                <input
                  id="paymentReceipt"
                  type="file"
                  accept={FILE_ACCEPT}
                  onChange={(event) =>
                    setPaymentReceipt(event.target.files?.[0] ?? null)
                  }
                  disabled={isLoading}
                  className="w-full text-sm text-zinc-700 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-zinc-800 hover:file:bg-zinc-200 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label
                  htmlFor="disbursementVoucher"
                  className="mb-2 block text-sm font-medium text-zinc-700"
                >
                  Disbursement voucher{" "}
                  <span className="font-normal text-zinc-400">
                    (optional, image/PDF, max 10 MB)
                  </span>
                </label>
                <input
                  id="disbursementVoucher"
                  type="file"
                  accept={FILE_ACCEPT}
                  onChange={(event) =>
                    setDisbursementVoucher(event.target.files?.[0] ?? null)
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
                  disabled={isLoading || invoiceCreated}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? "Adding..." : "Create invoice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
