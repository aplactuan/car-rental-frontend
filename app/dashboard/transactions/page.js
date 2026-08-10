"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TransactionsPage() {
  const router = useRouter();
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleTransactionSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const authToken = localStorage.getItem("auth_token");
      const response = await fetch("/api/v1/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          customer_name: customerName.trim(),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data?.error || data?.message || "Failed to save transaction.");
        return;
      }

      const transactionId =
        data?.id ?? data?.transaction_id ?? data?.data?.id ?? data?.data?.transaction_id;

      if (!transactionId) {
        setError("Transaction saved but no transaction ID was returned.");
        return;
      }

      setCustomerName("");
      setShowTransactionForm(false);
      router.push(`/dashboard/transactions/${transactionId}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-w-0 w-full">
      <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Transactions</h1>
          <p className="mt-2 break-words text-sm text-zinc-500">
            View and manage rental transactions and billing
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowTransactionForm((prev) => !prev)}
            className="min-h-11 w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 sm:w-auto"
          >
            Add Transaction
          </button>
        </div>
      </div>

      {showTransactionForm && (
        <form
          onSubmit={handleTransactionSubmit}
          className="mt-6 min-w-0 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6"
        >
          <h2 className="text-sm font-semibold text-zinc-900">New Transaction</h2>
          <div className="mt-4">
            <label
              htmlFor="customerName"
              className="mb-1 block text-sm font-medium text-zinc-700"
            >
              Customer Name
            </label>
            <input
              id="customerName"
              type="text"
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              disabled={isLoading}
              required
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-zinc-300 focus:ring-2"
              placeholder="Enter customer name"
            />
          </div>
          {error && <p className="mt-3 break-words text-sm text-red-600">{error}</p>}
          <div className="mt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="min-h-11 w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 sm:w-auto"
            >
              {isLoading ? "Saving..." : "Save Transaction"}
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 min-w-0 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="px-4 py-5 sm:px-6">
          <div className="text-sm font-semibold text-zinc-900">
            Transaction List
          </div>
          <div className="mt-1 text-xs text-zinc-500">0 transactions</div>
        </div>
        <div className="flex items-center justify-center px-4 pb-10 sm:px-6">
          <p className="break-words text-center text-sm text-zinc-500">
            Transaction history and management will go here.
          </p>
        </div>
      </div>
    </div>
  );
}
