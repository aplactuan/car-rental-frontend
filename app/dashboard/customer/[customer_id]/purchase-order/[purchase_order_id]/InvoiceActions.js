"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FileUploadWithCamera from "@/app/dashboard/components/FileUploadWithCamera";

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

function getAuthHeaders(extra = {}) {
  const authToken =
    typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  return {
    Accept: "application/json",
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...extra,
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

export default function InvoiceActions({
  purchaseOrderId,
  invoice,
  availableTripReports = [],
  attachedTripReports = [],
}) {
  const router = useRouter();
  const isPaid = invoice?.status === "paid";
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [form, setForm] = useState({
    invoice_number: "",
    lddap_adap_no: "",
    note: "",
    status: "unpaid",
  });
  const [paymentReceipt, setPaymentReceipt] = useState(null);
  const [disbursementVoucher, setDisbursementVoucher] = useState(null);
  const [removePaymentReceipt, setRemovePaymentReceipt] = useState(false);
  const [removeDisbursementVoucher, setRemoveDisbursementVoucher] =
    useState(false);
  const [selectedTripReportIds, setSelectedTripReportIds] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  const invoiceBasePath = purchaseOrderId
    ? `/api/v1/purchase-orders/${encodeURIComponent(purchaseOrderId)}/invoices/${encodeURIComponent(invoice.id)}`
    : "";

  const selectableTripReports = [
    ...attachedTripReports,
    ...availableTripReports.filter(
      (report) =>
        !attachedTripReports.some((attached) => attached.id === report.id),
    ),
  ];

  const openEdit = () => {
    if (isPaid) return;
    setError("");
    setPaymentReceipt(null);
    setDisbursementVoucher(null);
    setRemovePaymentReceipt(false);
    setRemoveDisbursementVoucher(false);
    setForm({
      invoice_number: invoice.invoiceNumber || "",
      lddap_adap_no: invoice.lddapAdapNo || "",
      note: invoice.note || "",
      status: invoice.status === "paid" ? "paid" : "unpaid",
    });
    setSelectedTripReportIds(attachedTripReports.map((report) => report.id));
    setIsEditOpen(true);
  };

  const closeEdit = () => {
    if (isSaving) return;
    setIsEditOpen(false);
    setError("");
    setPaymentReceipt(null);
    setDisbursementVoucher(null);
    setRemovePaymentReceipt(false);
    setRemoveDisbursementVoucher(false);
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

  const syncTripReports = async (authHeaders) => {
    const previouslyAttached = new Set(
      attachedTripReports.map((report) => report.id),
    );
    const currentlySelected = new Set(selectedTripReportIds);

    const toAttach = selectedTripReportIds.filter(
      (id) => !previouslyAttached.has(id),
    );
    const toDetach = [...previouslyAttached].filter(
      (id) => !currentlySelected.has(id),
    );

    if (toAttach.length > 0) {
      const attachResponse = await fetch(`${invoiceBasePath}/trip-reports`, {
        method: "POST",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ trip_report_ids: toAttach }),
      });
      const attachData = await attachResponse.json().catch(() => ({}));
      if (!attachResponse.ok) {
        throw new Error(
          firstErrorMessage(attachData, ["trip_report_ids"]) ||
            "Failed to attach trip reports.",
        );
      }
    }

    if (toDetach.length > 0) {
      const detachResponse = await fetch(`${invoiceBasePath}/trip-reports`, {
        method: "DELETE",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ trip_report_ids: toDetach }),
      });
      const detachData = await detachResponse.json().catch(() => ({}));
      if (!detachResponse.ok) {
        throw new Error(
          firstErrorMessage(detachData, ["trip_report_ids"]) ||
            "Failed to detach trip reports.",
        );
      }
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!purchaseOrderId || !invoice?.id || isPaid) return;

    const invoiceNumber = form.invoice_number.trim();
    const lddapAdapNo = form.lddap_adap_no.trim();
    const note = form.note.trim();
    const status = form.status === "paid" ? "paid" : "unpaid";

    if (!invoiceNumber) {
      setError("Invoice number is required.");
      return;
    }
    if (paymentReceipt && removePaymentReceipt) {
      setError("Cannot upload and remove the payment receipt in one request.");
      return;
    }
    if (disbursementVoucher && removeDisbursementVoucher) {
      setError(
        "Cannot upload and remove the disbursement voucher in one request.",
      );
      return;
    }

    setError("");
    setIsSaving(true);

    try {
      const authHeaders = getAuthHeaders();
      const hasFileChanges =
        Boolean(paymentReceipt) ||
        Boolean(disbursementVoucher) ||
        removePaymentReceipt ||
        removeDisbursementVoucher;

      let response;

      if (hasFileChanges) {
        const body = new FormData();
        body.append("invoice_number", invoiceNumber);
        body.append("lddap_adap_no", lddapAdapNo);
        body.append("note", note);
        body.append("status", status);
        if (paymentReceipt) {
          body.append("payment_receipt", paymentReceipt);
        }
        if (disbursementVoucher) {
          body.append("disbursement_voucher", disbursementVoucher);
        }
        if (removePaymentReceipt) {
          body.append("remove_payment_receipt", "1");
        }
        if (removeDisbursementVoucher) {
          body.append("remove_disbursement_voucher", "1");
        }

        response = await fetch(invoiceBasePath, {
          method: "PUT",
          headers: authHeaders,
          credentials: "include",
          body,
        });
      } else {
        response = await fetch(invoiceBasePath, {
          method: "PUT",
          headers: {
            ...authHeaders,
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            invoice_number: invoiceNumber,
            lddap_adap_no: lddapAdapNo,
            note,
            status,
          }),
        });
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(
          firstErrorMessage(data, [
            "invoice_number",
            "lddap_adap_no",
            "note",
            "status",
            "payment_receipt",
            "disbursement_voucher",
            "remove_payment_receipt",
            "remove_disbursement_voucher",
          ]) || "Failed to update invoice.",
        );
        return;
      }

      try {
        await syncTripReports(authHeaders);
      } catch (syncError) {
        setError(
          syncError?.message ||
            "Invoice updated, but trip report changes failed.",
        );
        router.refresh();
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
    if (!purchaseOrderId || !invoice?.id || isDeleting || isSaving || isPaid)
      return;

    const label = invoice.invoiceNumber || "this invoice";
    if (
      !window.confirm(
        `Delete ${label}? Related trip reports will be unassigned. This cannot be undone.`,
      )
    ) {
      return;
    }

    setError("");
    setIsDeleting(true);

    try {
      const response = await fetch(invoiceBasePath, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      });

      if (!response.ok && response.status !== 204) {
        const data = await response.json().catch(() => ({}));
        setError(firstErrorMessage(data) || "Failed to delete invoice.");
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
  const lockedTitle = isPaid
    ? "Paid invoices cannot be edited or deleted"
    : undefined;

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={openEdit}
          disabled={busy || !purchaseOrderId || isPaid}
          title={lockedTitle}
          className="text-xs font-medium text-teal-700 transition hover:text-teal-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={busy || !purchaseOrderId || isPaid}
          title={lockedTitle}
          className="text-xs font-medium text-red-600 transition hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isDeleting ? "Deleting…" : "Delete"}
        </button>
      </div>
      {error && !isEditOpen ? (
        <p className="max-w-[12rem] text-right text-xs text-red-600">{error}</p>
      ) : null}

      {isEditOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 px-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900">
                  Edit invoice
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Update details, documents, and trip report assignment.
                </p>
              </div>
              <button
                type="button"
                onClick={closeEdit}
                disabled={isSaving}
                aria-label="Close edit invoice dialog"
                className="rounded-md p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                x
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor={`edit-invoice-number-${invoice.id}`}
                  className="mb-2 block text-sm font-medium text-zinc-700"
                >
                  Invoice number
                </label>
                <input
                  id={`edit-invoice-number-${invoice.id}`}
                  type="text"
                  value={form.invoice_number}
                  onChange={(event) =>
                    updateField("invoice_number", event.target.value)
                  }
                  disabled={isSaving}
                  maxLength={255}
                  required
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-300 focus:ring-2 disabled:cursor-not-allowed disabled:bg-zinc-100"
                />
              </div>

              <div>
                <label
                  htmlFor={`edit-lddap-${invoice.id}`}
                  className="mb-2 block text-sm font-medium text-zinc-700"
                >
                  LDDAP/ADAP number{" "}
                  <span className="font-normal text-zinc-400">(optional)</span>
                </label>
                <input
                  id={`edit-lddap-${invoice.id}`}
                  type="text"
                  value={form.lddap_adap_no}
                  onChange={(event) =>
                    updateField("lddap_adap_no", event.target.value)
                  }
                  disabled={isSaving}
                  maxLength={255}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-300 focus:ring-2 disabled:cursor-not-allowed disabled:bg-zinc-100"
                />
              </div>

              <div>
                <label
                  htmlFor={`edit-note-${invoice.id}`}
                  className="mb-2 block text-sm font-medium text-zinc-700"
                >
                  Note{" "}
                  <span className="font-normal text-zinc-400">(optional)</span>
                </label>
                <textarea
                  id={`edit-note-${invoice.id}`}
                  value={form.note}
                  onChange={(event) => updateField("note", event.target.value)}
                  disabled={isSaving}
                  rows={2}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-300 focus:ring-2 disabled:cursor-not-allowed disabled:bg-zinc-100"
                />
              </div>

              <div>
                <label
                  htmlFor={`edit-status-${invoice.id}`}
                  className="mb-2 block text-sm font-medium text-zinc-700"
                >
                  Status
                </label>
                <select
                  id={`edit-status-${invoice.id}`}
                  value={form.status}
                  onChange={(event) => updateField("status", event.target.value)}
                  disabled={isSaving}
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
                {selectableTripReports.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-500">
                    No trip reports available to assign.
                  </p>
                ) : (
                  <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-zinc-200 p-3">
                    {selectableTripReports.map((report) => {
                      const checked = selectedTripReportIds.includes(report.id);
                      const inputId = `edit-trip-report-${invoice.id}-${report.id}`;

                      return (
                        <label
                          key={report.id}
                          htmlFor={inputId}
                          className={`flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 transition hover:bg-zinc-50 ${
                            isSaving ? "cursor-not-allowed opacity-60" : ""
                          }`}
                        >
                          <input
                            id={inputId}
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleTripReport(report.id)}
                            disabled={isSaving}
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
                  htmlFor={`edit-receipt-${invoice.id}`}
                  className="mb-2 block text-sm font-medium text-zinc-700"
                >
                  Payment receipt{" "}
                  <span className="font-normal text-zinc-400">
                    (optional, image/PDF, max 10 MB)
                  </span>
                </label>
                {invoice.paymentReceiptUrl ? (
                  <p className="mb-2 text-xs text-zinc-500">
                    Current:{" "}
                    <a
                      href={invoice.paymentReceiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-teal-700 hover:text-teal-800"
                    >
                      View file
                    </a>
                  </p>
                ) : null}
                <FileUploadWithCamera
                  id={`edit-receipt-${invoice.id}`}
                  accept={FILE_ACCEPT}
                  onFilesChange={(files) => {
                    const next = files[0] ?? null;
                    setPaymentReceipt(next);
                    if (next) setRemovePaymentReceipt(false);
                  }}
                  disabled={isSaving || removePaymentReceipt}
                />
                {invoice.paymentReceiptUrl ? (
                  <label className="mt-2 flex items-center gap-2 text-sm text-zinc-700">
                    <input
                      type="checkbox"
                      checked={removePaymentReceipt}
                      onChange={(event) => {
                        setRemovePaymentReceipt(event.target.checked);
                        if (event.target.checked) setPaymentReceipt(null);
                      }}
                      disabled={isSaving || Boolean(paymentReceipt)}
                      className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-400"
                    />
                    Remove current payment receipt
                  </label>
                ) : null}
              </div>

              <div>
                <label
                  htmlFor={`edit-voucher-${invoice.id}`}
                  className="mb-2 block text-sm font-medium text-zinc-700"
                >
                  Disbursement voucher{" "}
                  <span className="font-normal text-zinc-400">
                    (optional, image/PDF, max 10 MB)
                  </span>
                </label>
                {invoice.disbursementVoucherUrl ? (
                  <p className="mb-2 text-xs text-zinc-500">
                    Current:{" "}
                    <a
                      href={invoice.disbursementVoucherUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-teal-700 hover:text-teal-800"
                    >
                      View file
                    </a>
                  </p>
                ) : null}
                <FileUploadWithCamera
                  id={`edit-voucher-${invoice.id}`}
                  accept={FILE_ACCEPT}
                  onFilesChange={(files) => {
                    const next = files[0] ?? null;
                    setDisbursementVoucher(next);
                    if (next) setRemoveDisbursementVoucher(false);
                  }}
                  disabled={isSaving || removeDisbursementVoucher}
                />
                {invoice.disbursementVoucherUrl ? (
                  <label className="mt-2 flex items-center gap-2 text-sm text-zinc-700">
                    <input
                      type="checkbox"
                      checked={removeDisbursementVoucher}
                      onChange={(event) => {
                        setRemoveDisbursementVoucher(event.target.checked);
                        if (event.target.checked) setDisbursementVoucher(null);
                      }}
                      disabled={isSaving || Boolean(disbursementVoucher)}
                      className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-400"
                    />
                    Remove current disbursement voucher
                  </label>
                ) : null}
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
