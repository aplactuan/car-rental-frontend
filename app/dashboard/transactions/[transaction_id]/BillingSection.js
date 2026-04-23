"use client";

import { useEffect, useState } from "react";

const getBearerHeaders = () => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const normalizeBill = (payload) => {
  const source = payload?.data ?? payload ?? {};
  const attributes = source?.attributes ?? source;

  return {
    id: source?.id ?? attributes?.id ?? null,
    amount: attributes?.amount ?? null,
    dueAt: attributes?.dueAt ?? attributes?.due_at ?? null,
    notes: attributes?.notes ?? "",
    status: attributes?.status ?? null,
    createdAt: attributes?.createdAt ?? attributes?.created_at ?? null,
    updatedAt: attributes?.updatedAt ?? attributes?.updated_at ?? null,
  };
};

const formatCurrency = (amount) => {
  if (typeof amount !== "number") return "—";

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateString) => {
  if (!dateString) return "—";
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) return String(dateString);

  return parsed.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (dateString) => {
  if (!dateString) return "—";
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) return String(dateString);

  return parsed.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getStatusMeta = (rawStatus) => {
  const status = String(rawStatus ?? "").toLowerCase();

  if (status === "draft") {
    return {
      label: "Draft",
      className: "bg-zinc-100 text-zinc-700 border-zinc-200",
    };
  }

  if (status === "issued") {
    return {
      label: "Issued",
      className: "bg-blue-100 text-blue-700 border-blue-200",
    };
  }

  if (status === "paid") {
    return {
      label: "Paid",
      className: "bg-emerald-100 text-emerald-700 border-emerald-200",
    };
  }

  if (status === "cancelled") {
    return {
      label: "Cancelled",
      className: "bg-amber-100 text-amber-700 border-amber-200",
    };
  }

  return {
    label: rawStatus ? String(rawStatus) : "Unknown",
    className: "bg-zinc-100 text-zinc-700 border-zinc-200",
  };
};

export default function BillingSection({ transactionId }) {
  const [bill, setBill] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [dueAtInput, setDueAtInput] = useState("");
  const [notesInput, setNotesInput] = useState("");
  const [actionError, setActionError] = useState("");

  const normalizedStatus = String(bill?.status ?? "").toLowerCase();
  const isDraftBill = normalizedStatus === "draft";
  const isIssuedBill = normalizedStatus === "issued";
  const canEditDraft = Boolean(bill) && isDraftBill;
  const statusMeta = getStatusMeta(bill?.status);

  const resetFormState = () => {
    setFormError("");
    setAmountInput("");
    setDueAtInput("");
    setNotesInput("");
    setActionError("");
  };

  const syncFormFromBill = (nextBill) => {
    const normalizedAmount = nextBill?.amount;
    const normalizedDueAt = nextBill?.dueAt;
    setAmountInput(
      typeof normalizedAmount === "number" && Number.isFinite(normalizedAmount)
        ? String(normalizedAmount)
        : "",
    );
    setDueAtInput(
      normalizedDueAt && String(normalizedDueAt).length >= 10
        ? String(normalizedDueAt).slice(0, 10)
        : "",
    );
    setNotesInput(nextBill?.notes ? String(nextBill.notes) : "");
  };

  useEffect(() => {
    if (!transactionId) {
      setIsLoading(false);
      setError("Transaction ID is missing.");
      return;
    }

    const controller = new AbortController();

    const fetchBill = async () => {
      setIsLoading(true);
      setError("");

      try {
        const response = await fetch(`/api/v1/transactions/${transactionId}/bill`, {
          method: "GET",
          headers: getBearerHeaders(),
          credentials: "include",
          signal: controller.signal,
        });

        if (response.status === 404) {
          setBill(null);
          return;
        }

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          setError(data?.error ?? data?.message ?? "Failed to load bill.");
          return;
        }

        const normalizedBill = normalizeBill(data);
        setBill(normalizedBill);
        syncFormFromBill(normalizedBill);
      } catch (requestError) {
        if (requestError?.name === "AbortError") return;
        setError("Network error. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBill();

    return () => controller.abort();
  }, [transactionId]);

  const handleCreateToggle = () => {
    setShowCreateForm((prev) => !prev);
    setFormError("");
    setActionError("");
    if (!showCreateForm) resetFormState();
  };

  const handleEditToggle = () => {
    if (!canEditDraft) return;
    if (isEditing) {
      setIsEditing(false);
      setFormError("");
      setActionError("");
      syncFormFromBill(bill);
      return;
    }
    setIsEditing(true);
    setFormError("");
    setActionError("");
    syncFormFromBill(bill);
  };

  const buildPayload = () => {
    const trimmedAmount = amountInput.trim();
    const trimmedDueAt = dueAtInput.trim();
    const amountValue = Number(trimmedAmount);

    if (!trimmedAmount) return { error: "Amount is required." };
    if (!Number.isInteger(amountValue) || amountValue <= 0) {
      return { error: "Amount must be a positive whole number." };
    }
    if (!trimmedDueAt) return { error: "Due date is required." };

    return {
      payload: {
        amount: amountValue,
        due_at: trimmedDueAt,
        notes: notesInput.trim(),
      },
    };
  };

  const handleCreateSubmit = async (event) => {
    event.preventDefault();
    if (!transactionId) return;

    const { payload, error: payloadError } = buildPayload();
    if (payloadError) {
      setFormError(payloadError);
      return;
    }

    setFormError("");
    setActionError("");
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/v1/transactions/${transactionId}/bill`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getBearerHeaders(),
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setFormError(data?.error ?? data?.message ?? "Failed to create bill.");
        return;
      }

      const normalizedBill = normalizeBill(data);
      setBill(normalizedBill);
      syncFormFromBill(normalizedBill);
      setShowCreateForm(false);
      setError("");
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSubmit = async (event) => {
    event.preventDefault();
    if (!transactionId || !canEditDraft) return;

    const { payload, error: payloadError } = buildPayload();
    if (payloadError) {
      setFormError(payloadError);
      return;
    }

    setFormError("");
    setActionError("");
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/v1/transactions/${transactionId}/bill`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getBearerHeaders(),
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setFormError(data?.error ?? data?.message ?? "Failed to update bill.");
        return;
      }

      const normalizedBill = normalizeBill(data);
      setBill(normalizedBill);
      syncFormFromBill(normalizedBill);
      setIsEditing(false);
      setError("");
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (nextStatus, confirmMessage) => {
    if (!transactionId || !bill || isSubmitting) return;
    if (confirmMessage && !window.confirm(confirmMessage)) return;

    setFormError("");
    setActionError("");
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/v1/transactions/${transactionId}/bill`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getBearerHeaders(),
        },
        credentials: "include",
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setActionError(
          data?.error ?? data?.message ?? `Failed to set status to ${nextStatus}.`,
        );
        return;
      }

      const normalizedBill = normalizeBill(data);
      setBill(normalizedBill);
      syncFormFromBill(normalizedBill);
      setIsEditing(false);
      setError("");
    } catch {
      setActionError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDraft = async () => {
    if (!transactionId || !bill || !isDraftBill || isSubmitting) return;
    if (!window.confirm("Delete this draft bill? This cannot be undone.")) return;

    setFormError("");
    setActionError("");
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/v1/transactions/${transactionId}/bill`, {
        method: "DELETE",
        headers: getBearerHeaders(),
        credentials: "include",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setActionError(data?.error ?? data?.message ?? "Failed to delete bill.");
        return;
      }

      setBill(null);
      setIsEditing(false);
      setShowCreateForm(false);
      resetFormState();
      setError("");
    } catch {
      setActionError("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm ring-1 ring-zinc-100">
      <div className="border-b border-zinc-100 bg-gradient-to-r from-amber-50/80 via-white to-zinc-50 px-6 py-5">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900">Billing</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Bill details for this transaction
        </p>
      </div>

      {isLoading && (
        <div className="px-6 py-8">
          <p className="text-sm text-zinc-500">Loading billing details...</p>
        </div>
      )}

      {!isLoading && error && (
        <div className="px-6 py-8">
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        </div>
      )}

      {!isLoading && !error && !bill && (
        <div className="px-6 py-10">
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/60 px-6 py-10 text-center">
            <p className="text-sm font-medium text-zinc-700">
              No bill has been created yet
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              Create a bill to start tracking payment for this transaction.
            </p>
            <button
              type="button"
              onClick={handleCreateToggle}
              className="mt-4 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              {showCreateForm ? "Close form" : "Create bill"}
            </button>
          </div>

          {showCreateForm && (
            <form
              onSubmit={handleCreateSubmit}
              className="mt-4 rounded-2xl border border-zinc-200 bg-white p-5"
            >
              <h3 className="text-sm font-semibold text-zinc-900">Create bill</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Amount
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={amountInput}
                    onChange={(event) => setAmountInput(event.target.value)}
                    disabled={isSubmitting}
                    required
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-300 focus:ring-2 disabled:cursor-not-allowed disabled:bg-zinc-100"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Due date
                  </span>
                  <input
                    type="date"
                    value={dueAtInput}
                    onChange={(event) => setDueAtInput(event.target.value)}
                    disabled={isSubmitting}
                    required
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-300 focus:ring-2 disabled:cursor-not-allowed disabled:bg-zinc-100"
                  />
                </label>
              </div>
              <label className="mt-4 block">
                <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Notes
                </span>
                <textarea
                  value={notesInput}
                  onChange={(event) => setNotesInput(event.target.value)}
                  disabled={isSubmitting}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-300 focus:ring-2 disabled:cursor-not-allowed disabled:bg-zinc-100"
                />
              </label>
              {formError ? (
                <p className="mt-3 text-sm text-red-600">{formError}</p>
              ) : null}
              <div className="mt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Saving..." : "Save bill"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {!isLoading && !error && bill && (
        <div className="px-6 py-6">
          <div className="mb-4 flex items-center justify-end">
            <div className="flex flex-wrap justify-end gap-2">
              {canEditDraft ? (
                <button
                  type="button"
                  onClick={handleEditToggle}
                  disabled={isSubmitting}
                  className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isEditing ? "Cancel edit" : "Edit bill"}
                </button>
              ) : null}

              {isDraftBill ? (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      handleStatusChange("issued", "Issue this bill to the customer?")
                    }
                    disabled={isSubmitting || isEditing}
                    className="rounded-xl border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Issue
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleStatusChange(
                        "cancelled",
                        "Cancel this draft bill? This action cannot be easily undone.",
                      )
                    }
                    disabled={isSubmitting || isEditing}
                    className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteDraft}
                    disabled={isSubmitting || isEditing}
                    className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Delete
                  </button>
                </>
              ) : null}

              {isIssuedBill ? (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      handleStatusChange("paid", "Mark this issued bill as paid?")
                    }
                    disabled={isSubmitting}
                    className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Mark paid
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleStatusChange(
                        "cancelled",
                        "Cancel this issued bill? This action cannot be easily undone.",
                      )
                    }
                    disabled={isSubmitting}
                    className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </>
              ) : null}
            </div>
          </div>

          {isEditing ? (
            <form
              onSubmit={handleUpdateSubmit}
              className="rounded-2xl border border-zinc-200 bg-white p-5"
            >
              <h3 className="text-sm font-semibold text-zinc-900">Update draft bill</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Amount
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={amountInput}
                    onChange={(event) => setAmountInput(event.target.value)}
                    disabled={isSubmitting}
                    required
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-300 focus:ring-2 disabled:cursor-not-allowed disabled:bg-zinc-100"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Due date
                  </span>
                  <input
                    type="date"
                    value={dueAtInput}
                    onChange={(event) => setDueAtInput(event.target.value)}
                    disabled={isSubmitting}
                    required
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-300 focus:ring-2 disabled:cursor-not-allowed disabled:bg-zinc-100"
                  />
                </label>
              </div>
              <label className="mt-4 block">
                <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Notes
                </span>
                <textarea
                  value={notesInput}
                  onChange={(event) => setNotesInput(event.target.value)}
                  disabled={isSubmitting}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-300 focus:ring-2 disabled:cursor-not-allowed disabled:bg-zinc-100"
                />
              </label>
              {formError ? (
                <p className="mt-3 text-sm text-red-600">{formError}</p>
              ) : null}
              <div className="mt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                  Bill ID
                </p>
                <p className="mt-1 break-all text-sm font-medium text-zinc-800">
                  {bill.id || "—"}
                </p>
              </div>

              <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                  Amount
                </p>
                <p className="mt-1 text-sm font-medium text-zinc-800">
                  {formatCurrency(bill.amount)}
                </p>
              </div>

              <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                  Due Date
                </p>
                <p className="mt-1 text-sm font-medium text-zinc-800">
                  {formatDate(bill.dueAt)}
                </p>
              </div>

              <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                  Status
                </p>
                <span
                  className={`mt-1 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusMeta.className}`}
                >
                  {statusMeta.label}
                </span>
              </div>

              <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                  Created
                </p>
                <p className="mt-1 text-sm font-medium text-zinc-800">
                  {formatDateTime(bill.createdAt)}
                </p>
              </div>

              <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                  Last Updated
                </p>
                <p className="mt-1 text-sm font-medium text-zinc-800">
                  {formatDateTime(bill.updatedAt)}
                </p>
              </div>

              <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 px-4 py-3 sm:col-span-2 lg:col-span-4">
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                  Notes
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-700">
                  {bill.notes?.trim() ? bill.notes : "—"}
                </p>
              </div>
            </div>
          )}
          {formError && !isEditing ? (
            <p className="mt-3 text-sm text-red-600">{formError}</p>
          ) : null}
          {actionError ? (
            <p className="mt-3 text-sm text-red-600">{actionError}</p>
          ) : null}
          {!canEditDraft ? (
            <p className="mt-3 text-sm text-zinc-500">
              This bill is no longer in draft and cannot be edited here.
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
