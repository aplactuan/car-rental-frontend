"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddCustomerTransactionButton({ customerId }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleClick = async () => {
    if (!customerId) return;
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
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          credentials: "include",
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
        onClick={handleClick}
        disabled={isLoading || !customerId}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? "Adding…" : "Add transaction"}
      </button>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
