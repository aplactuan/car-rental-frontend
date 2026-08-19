"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ModalShell from "@/app/dashboard/components/ModalShell";

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

export default function ProgramActions({ customerId, program }) {
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  const programPath = program?.id
    ? `/api/v1/programs/${encodeURIComponent(program.id)}`
    : "";

  const openEdit = () => {
    setError("");
    setForm({
      name: program?.name || "",
      description: program?.description || "",
    });
    setIsEditOpen(true);
  };

  const closeEdit = () => {
    if (isSaving) return;
    setIsEditOpen(false);
    setError("");
  };

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!programPath || isSaving || isDeleting) return;

    const name = form.name.trim();
    const description = form.description.trim();

    if (!name) {
      setError("Program name is required.");
      return;
    }

    setError("");
    setIsSaving(true);

    try {
      const response = await fetch(programPath, {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        credentials: "include",
        body: JSON.stringify({
          name,
          description: description || null,
          ...(customerId ? { customer_id: customerId } : {}),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(
          firstErrorMessage(data, ["name", "description", "customer_id"]) ||
            "Failed to update program.",
        );
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
    if (!programPath || isDeleting || isSaving) return;

    const label = program?.name ? `"${program.name}"` : "this program";
    if (
      !window.confirm(`Delete ${label}? This action cannot be undone.`)
    ) {
      return;
    }

    setError("");
    setIsDeleting(true);

    try {
      const response = await fetch(programPath, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      });

      if (!response.ok && response.status !== 204) {
        const data = await response.json().catch(() => ({}));
        setError(firstErrorMessage(data) || "Failed to delete program.");
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

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={openEdit}
          disabled={busy || !programPath}
          className="text-xs font-medium text-red-700 transition hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={busy || !programPath}
          className="text-xs font-medium text-red-600 transition hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isDeleting ? "Deleting…" : "Delete"}
        </button>
      </div>
      {error && !isEditOpen ? (
        <p className="max-w-[12rem] text-right text-xs text-red-600">{error}</p>
      ) : null}

      {isEditOpen ? (
        <ModalShell
          title="Edit Program"
          description="Update the name or description for this program."
          onClose={closeEdit}
          closeDisabled={isSaving}
          closeLabel="Close Edit Program Dialog"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="editProgramName"
                className="mb-2 block text-sm font-medium text-zinc-700"
              >
                Name
              </label>
              <input
                id="editProgramName"
                type="text"
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                disabled={isSaving}
                maxLength={255}
                autoFocus
                required
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-300 focus:ring-2 disabled:cursor-not-allowed disabled:bg-zinc-100"
              />
            </div>

            <div>
              <label
                htmlFor="editProgramDescription"
                className="mb-2 block text-sm font-medium text-zinc-700"
              >
                Description{" "}
                <span className="font-normal text-zinc-400">(optional)</span>
              </label>
              <textarea
                id="editProgramDescription"
                value={form.description}
                onChange={(event) =>
                  updateField("description", event.target.value)
                }
                disabled={isSaving}
                rows={3}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-300 focus:ring-2 disabled:cursor-not-allowed disabled:bg-zinc-100"
              />
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
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
                className="rounded-lg bg-red-400 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}
    </div>
  );
}
