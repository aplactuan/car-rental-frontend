"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddCustomerTransactionButton({ customerId }) {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [transactionName, setTransactionName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const openDialog = () => {
    setError("");
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    if (isLoading) return;
    setIsDialogOpen(false);
    setTransactionName("");
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!customerId) return;

    const trimmedName = transactionName.trim();

    if (!trimmedName) {
      setError("Transaction name is required.");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const authToken = localStorage.getItem("auth_token");
      const response = await fetch(
        `/api/v1/customers/${encodeURIComponent(customerId)}/transactions`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          credentials: "include",
          body: JSON.stringify({
            name: trimmedName,
          }),
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data?.error || data?.message || "Failed to create transaction.");
        return;
      }

      const transactionId =
        data?.id ??
        data?.transaction_id ??
        data?.data?.id ??
        data?.data?.transaction_id;

      if (!transactionId) {
        setError("Transaction created but no transaction ID was returned.");
        return;
      }

      setTransactionName("");
      setIsDialogOpen(false);
      router.push(
        `/dashboard/customer/${encodeURIComponent(customerId)}/transaction/${encodeURIComponent(transactionId)}`,
      );
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
        Add transaction
      </button>

      {isDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900">
                  Add transaction
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Enter a name for this customer transaction.
                </p>
              </div>

              <button
                type="button"
                onClick={closeDialog}
                disabled={isLoading}
                aria-label="Close add transaction dialog"
                className="rounded-md p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                x
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5">
              <label
                htmlFor="transactionName"
                className="mb-2 block text-sm font-medium text-zinc-700"
              >
                Transaction name
              </label>
              <input
                id="transactionName"
                type="text"
                value={transactionName}
                onChange={(event) => setTransactionName(event.target.value)}
                disabled={isLoading}
                maxLength={255}
                autoFocus
                required
                placeholder="Enter transaction name"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-300 focus:ring-2 disabled:cursor-not-allowed disabled:bg-zinc-100"
              />

              {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

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
                  {isLoading ? "Adding..." : "Create transaction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
