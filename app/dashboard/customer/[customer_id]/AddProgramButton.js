"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ModalShell from "@/app/dashboard/components/ModalShell";

const EMPTY_FORM = {
  name: "",
  description: "",
};

export default function AddProgramButton({ customerId }) {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const openDialog = () => {
    setError("");
    setForm(EMPTY_FORM);
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

    const name = form.name.trim();
    const description = form.description.trim();

    if (!name) {
      setError("Program name is required.");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const authToken = localStorage.getItem("auth_token");
      const response = await fetch("/api/v1/programs", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          customer_id: customerId,
          name,
          ...(description ? { description } : {}),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const validationMessage =
          data?.errors?.name?.[0] ||
          data?.errors?.customer_id?.[0] ||
          data?.errors?.description?.[0] ||
          (typeof data?.errors === "object"
            ? Object.values(data.errors).flat()?.[0]
            : null);
        setError(
          validationMessage ||
            data?.error ||
            data?.message ||
            "Failed to create program.",
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
        className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        Add program
      </button>

      {isDialogOpen ? (
        <ModalShell
          title="Add program"
          description="Create a program for this customer."
          onClose={closeDialog}
          closeDisabled={isLoading}
          closeLabel="Close add program dialog"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="programName"
                  className="mb-2 block text-sm font-medium text-zinc-700"
                >
                  Name
                </label>
                <input
                  id="programName"
                  type="text"
                  value={form.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  disabled={isLoading}
                  maxLength={255}
                  autoFocus
                  required
                  placeholder="e.g. Infrastructure Support 2026"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-300 focus:ring-2 disabled:cursor-not-allowed disabled:bg-zinc-100"
                />
              </div>

              <div>
                <label
                  htmlFor="programDescription"
                  className="mb-2 block text-sm font-medium text-zinc-700"
                >
                  Description{" "}
                  <span className="font-normal text-zinc-400">(optional)</span>
                </label>
                <textarea
                  id="programDescription"
                  value={form.description}
                  onChange={(event) =>
                    updateField("description", event.target.value)
                  }
                  disabled={isLoading}
                  rows={3}
                  placeholder="Optional notes for this program"
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
                  {isLoading ? "Adding..." : "Create program"}
                </button>
              </div>
            </form>
        </ModalShell>
      ) : null}
    </div>
  );
}
