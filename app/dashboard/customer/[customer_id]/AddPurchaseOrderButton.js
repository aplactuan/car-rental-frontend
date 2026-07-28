"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const EMPTY_FORM = {
  po_number: "",
  date: "",
  amount: "",
  request_person: "",
  description: "",
};

export default function AddPurchaseOrderButton({ customerId }) {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const openDialog = () => {
    setError("");
    setForm({
      ...EMPTY_FORM,
      date: new Date().toISOString().slice(0, 10),
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    if (isLoading) return;
    setIsDialogOpen(false);
    setForm(EMPTY_FORM);
    setError("");
  };

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!customerId) return;

    const poNumber = form.po_number.trim();
    const date = form.date.trim();
    const amountValue = form.amount.trim();
    const requestPerson = form.request_person.trim();
    const description = form.description.trim();

    if (!poNumber) {
      setError("PO number is required.");
      return;
    }

    if (!date) {
      setError("Date is required.");
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
      const authToken = localStorage.getItem("auth_token");
      const response = await fetch("/api/v1/purchase-orders", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          customer_id: customerId,
          po_number: poNumber,
          date,
          amount,
          ...(requestPerson ? { request_person: requestPerson } : {}),
          ...(description ? { description } : {}),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const validationMessage =
          data?.errors?.po_number?.[0] ||
          data?.errors?.date?.[0] ||
          data?.errors?.amount?.[0] ||
          data?.errors?.customer_id?.[0] ||
          (typeof data?.errors === "object"
            ? Object.values(data.errors).flat()?.[0]
            : null);
        setError(
          validationMessage ||
            data?.error ||
            data?.message ||
            "Failed to create purchase order.",
        );
        return;
      }

      setForm(EMPTY_FORM);
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
        disabled={!customerId}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Add purchase order
      </button>

      {isDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900">
                  Add purchase order
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Create a purchase order for this customer.
                </p>
              </div>

              <button
                type="button"
                onClick={closeDialog}
                disabled={isLoading}
                aria-label="Close add purchase order dialog"
                className="rounded-md p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                x
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="poNumber"
                  className="mb-2 block text-sm font-medium text-zinc-700"
                >
                  PO number
                </label>
                <input
                  id="poNumber"
                  type="text"
                  value={form.po_number}
                  onChange={(event) =>
                    updateField("po_number", event.target.value)
                  }
                  disabled={isLoading}
                  maxLength={255}
                  autoFocus
                  required
                  placeholder="e.g. PO-1001"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-300 focus:ring-2 disabled:cursor-not-allowed disabled:bg-zinc-100"
                />
              </div>

              <div>
                <label
                  htmlFor="poDate"
                  className="mb-2 block text-sm font-medium text-zinc-700"
                >
                  Date
                </label>
                <input
                  id="poDate"
                  type="date"
                  value={form.date}
                  onChange={(event) => updateField("date", event.target.value)}
                  disabled={isLoading}
                  required
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-300 focus:ring-2 disabled:cursor-not-allowed disabled:bg-zinc-100"
                />
              </div>

              <div>
                <label
                  htmlFor="poAmount"
                  className="mb-2 block text-sm font-medium text-zinc-700"
                >
                  Amount
                </label>
                <input
                  id="poAmount"
                  type="number"
                  min="0"
                  step="1"
                  value={form.amount}
                  onChange={(event) =>
                    updateField("amount", event.target.value)
                  }
                  disabled={isLoading}
                  required
                  placeholder="0"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-300 focus:ring-2 disabled:cursor-not-allowed disabled:bg-zinc-100"
                />
              </div>

              <div>
                <label
                  htmlFor="requestPerson"
                  className="mb-2 block text-sm font-medium text-zinc-700"
                >
                  Request person{" "}
                  <span className="font-normal text-zinc-400">(optional)</span>
                </label>
                <input
                  id="requestPerson"
                  type="text"
                  value={form.request_person}
                  onChange={(event) =>
                    updateField("request_person", event.target.value)
                  }
                  disabled={isLoading}
                  maxLength={255}
                  placeholder="e.g. Jane Doe"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-300 focus:ring-2 disabled:cursor-not-allowed disabled:bg-zinc-100"
                />
              </div>

              <div>
                <label
                  htmlFor="poDescription"
                  className="mb-2 block text-sm font-medium text-zinc-700"
                >
                  Description{" "}
                  <span className="font-normal text-zinc-400">(optional)</span>
                </label>
                <textarea
                  id="poDescription"
                  value={form.description}
                  onChange={(event) =>
                    updateField("description", event.target.value)
                  }
                  disabled={isLoading}
                  rows={3}
                  placeholder="Optional notes for this purchase order"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-300 focus:ring-2 disabled:cursor-not-allowed disabled:bg-zinc-100"
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
                  {isLoading ? "Adding..." : "Create purchase order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
