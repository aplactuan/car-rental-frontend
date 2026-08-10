"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ModalShell from "@/app/dashboard/components/ModalShell";

export default function AddCustomerTransactionButton({ customerId }) {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [transactionName, setTransactionName] = useState("");
  const [poNumber, setPoNumber] = useState("");
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
    setPoNumber("");
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!customerId) return;

    const trimmedName = transactionName.trim();
    const trimmedPoNumber = poNumber.trim();

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
            ...(trimmedPoNumber ? { po_number: trimmedPoNumber } : {}),
          }),
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const validationMessage =
          data?.errors?.po_number?.[0] ||
          data?.errors?.name?.[0] ||
          (typeof data?.errors === "object"
            ? Object.values(data.errors).flat()?.[0]
            : null);
        setError(
          validationMessage ||
            data?.error ||
            data?.message ||
            "Failed to create transaction.",
        );
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
      setPoNumber("");
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
        <ModalShell
          title="Add transaction"
          description="Enter a name and optional PO number for this customer transaction."
          onClose={closeDialog}
          closeDisabled={isLoading}
          closeLabel="Close add transaction dialog"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
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
              </div>

              <div>
                <label
                  htmlFor="poNumber"
                  className="mb-2 block text-sm font-medium text-zinc-700"
                >
                  PO number{" "}
                  <span className="font-normal text-zinc-400">(optional)</span>
                </label>
                <input
                  id="poNumber"
                  type="text"
                  value={poNumber}
                  onChange={(event) => setPoNumber(event.target.value)}
                  disabled={isLoading}
                  maxLength={255}
                  placeholder="e.g. PO-1001"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-300 focus:ring-2 disabled:cursor-not-allowed disabled:bg-zinc-100"
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
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? "Adding..." : "Create transaction"}
                </button>
              </div>
            </form>
        </ModalShell>
      ) : null}
    </div>
  );
}
