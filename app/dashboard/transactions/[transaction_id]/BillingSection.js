"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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
  if (typeof amount !== "number" || !Number.isFinite(amount)) return "—";
  return `PHP ${Math.round(amount).toLocaleString("en-US")}`;
};

const formatDate = (dateString) => {
  if (!dateString) return "—";
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) return String(dateString);

  return parsed.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (dateString) => {
  if (!dateString) return "—";
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) return String(dateString);

  return parsed.toLocaleString("en-US", {
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

const getBookingPrice = (booking) => {
  if (!booking || typeof booking !== "object") return 0;

  const candidates = [
    booking.price,
    booking.attributes?.price,
    booking.data?.attributes?.price,
  ];

  for (const value of candidates) {
    if (value === null || value === undefined || value === "") continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return 0;
};

const sumBookingPrices = (bookingList) =>
  (Array.isArray(bookingList) ? bookingList : []).reduce(
    (sum, booking) => sum + getBookingPrice(booking),
    0,
  );

const parseBookingsFromListResponse = (payload) => {
  const raw = payload?.data ?? payload;
  const list = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
  return list.map((item) => {
    const attrs = item?.attributes ?? {};
    return {
      ...item,
      attributes: attrs,
      price: attrs.price ?? item?.price,
    };
  });
};

const parseBookingsFromTransactionResponse = (payload) => {
  const bookingsData =
    payload?.data?.relationships?.bookings?.data ??
    payload?.relationships?.bookings?.data;
  if (!Array.isArray(bookingsData)) return [];

  const includedData = Array.isArray(payload?.included) ? payload.included : [];

  return bookingsData.map((booking, index) => {
    const includedBooking =
      includedData.find(
        (item) =>
          String(item?.id) === String(booking?.id) &&
          (!item?.type || item.type === "bookings" || item.type === "booking"),
      ) ??
      includedData.filter(
        (item) => !item?.type || item.type === "bookings" || item.type === "booking",
      )[index];
    const includedAttributes = includedBooking?.attributes ?? {};
    const price = includedAttributes?.price ?? booking?.attributes?.price ?? booking?.price;

    return {
      ...booking,
      attributes: {
        ...(booking?.attributes ?? {}),
        ...(price !== undefined ? { price } : {}),
      },
      ...(price !== undefined ? { price } : {}),
    };
  });
};

const totalToAmountInput = (total) => {
  const rounded = Math.round(total);
  return Number.isFinite(rounded) && rounded > 0 ? String(rounded) : "";
};

const EMPTY_BOOKINGS = [];

export default function BillingSection({
  transactionId,
  bookings = EMPTY_BOOKINGS,
  className = "",
}) {
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
  const [bookingsForTotal, setBookingsForTotal] = useState(() =>
    Array.isArray(bookings) ? bookings : [],
  );
  const [isLoadingBookingTotal, setIsLoadingBookingTotal] = useState(false);

  const refreshBookingsForTotal = useCallback(async () => {
    if (!transactionId) return [];

    setIsLoadingBookingTotal(true);
    try {
      const headers = getBearerHeaders();
      const listRes = await fetch(
        `/api/v1/transactions/${transactionId}/bookings?per_page=100`,
        {
          headers,
          credentials: "include",
          cache: "no-store",
        },
      );

      if (listRes.ok) {
        const listData = await listRes.json().catch(() => ({}));
        const parsed = parseBookingsFromListResponse(listData);
        if (parsed.length > 0) {
          setBookingsForTotal(parsed);
          return parsed;
        }
      }

      const txRes = await fetch(`/api/v1/transactions/${transactionId}`, {
        headers,
        credentials: "include",
        cache: "no-store",
      });

      if (txRes.ok) {
        const txData = await txRes.json().catch(() => ({}));
        const parsed = parseBookingsFromTransactionResponse(txData);
        setBookingsForTotal(parsed);
        return parsed;
      }
    } catch {
      // Keep the last known booking list when refresh fails.
    } finally {
      setIsLoadingBookingTotal(false);
    }

    return [];
  }, [transactionId]);

  useEffect(() => {
    if (!transactionId) return;
    refreshBookingsForTotal();
    // Only refetch when the transaction changes; avoid syncing `bookings` prop
    // in an effect (new array references each render cause infinite updates).
  }, [transactionId, refreshBookingsForTotal]);

  const defaultBillAmount = useMemo(
    () => sumBookingPrices(bookingsForTotal),
    [bookingsForTotal],
  );
  const defaultAmountInput = totalToAmountInput(defaultBillAmount);

  const normalizedStatus = String(bill?.status ?? "").toLowerCase();
  const isDraftBill = normalizedStatus === "draft";
  const isIssuedBill = normalizedStatus === "issued";
  const isPaidBill = normalizedStatus === "paid";
  const canEditDraft = Boolean(bill) && isDraftBill;
  const canPrintInvoice = Boolean(bill) && (isIssuedBill || isPaidBill);
  const statusMeta = getStatusMeta(bill?.status);

  const resetFormState = (nextAmountInput = "") => {
    setFormError("");
    setAmountInput(nextAmountInput);
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

  const handleCreateToggle = async () => {
    if (showCreateForm) {
      setShowCreateForm(false);
      setFormError("");
      setActionError("");
      return;
    }

    setFormError("");
    setActionError("");
    const latestBookings = await refreshBookingsForTotal();
    const total = sumBookingPrices(latestBookings);
    resetFormState(totalToAmountInput(total));
    setShowCreateForm(true);
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
    <section
      className={`overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm ring-1 ring-zinc-100 ${className}`}
    >
      <div className="border-b border-zinc-100 bg-gradient-to-r from-amber-50/90 via-white to-zinc-50 px-5 py-4">
        <h2 className="text-base font-semibold tracking-tight text-zinc-900">Billing</h2>
        <p className="mt-0.5 text-xs text-zinc-500">Payment for this transaction</p>
      </div>

      {isLoading && (
        <div className="px-5 py-6">
          <p className="text-sm text-zinc-500">Loading billing details...</p>
        </div>
      )}

      {!isLoading && error && (
        <div className="px-5 py-6">
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        </div>
      )}

      {!isLoading && !error && !bill && (
        <div className="px-5 py-6">
          <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/60 px-4 py-8 text-center">
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
                  <p className="mt-1 text-xs text-zinc-500">
                    {isLoadingBookingTotal
                      ? "Calculating total from bookings…"
                      : `Defaulted from ${bookingsForTotal.length} booking${bookingsForTotal.length !== 1 ? "s" : ""}: ${formatCurrency(defaultBillAmount)}`}
                  </p>
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
        <div className="px-5 py-5">
          <div className="mb-3 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Amount
              </p>
              <span
                className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${statusMeta.className}`}
              >
                {statusMeta.label}
              </span>
            </div>
            <p className="text-2xl font-bold tracking-tight text-zinc-900">
              {formatCurrency(bill.amount)}
            </p>
            <p className="text-sm text-zinc-600">
              Due {formatDate(bill.dueAt)}
            </p>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
              {canPrintInvoice ? (
                <a
                  href={`/invoice/${transactionId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                >
                  Print Invoice
                </a>
              ) : null}

              {canEditDraft ? (
                <button
                  type="button"
                  onClick={handleEditToggle}
                  disabled={isSubmitting}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
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
            <dl className="space-y-2.5 border-t border-zinc-100 pt-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="shrink-0 text-zinc-500">Bill ID</dt>
                <dd className="truncate text-right font-mono text-xs text-zinc-800">
                  {bill.id || "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-zinc-500">Created</dt>
                <dd className="text-right text-zinc-800">{formatDateTime(bill.createdAt)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-zinc-500">Updated</dt>
                <dd className="text-right text-zinc-800">{formatDateTime(bill.updatedAt)}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Notes</dt>
                <dd className="mt-1 whitespace-pre-wrap text-zinc-800">
                  {bill.notes?.trim() ? bill.notes : "—"}
                </dd>
              </div>
            </dl>
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
