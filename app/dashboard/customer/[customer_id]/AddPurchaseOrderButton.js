"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FileUploadWithCamera from "@/app/dashboard/components/FileUploadWithCamera";
import ModalShell from "@/app/dashboard/components/ModalShell";

const EMPTY_FORM = {
  po_number: "",
  date: "",
  amount: "",
  program_id: "",
  request_person: "",
  description: "",
  status: "pending",
};

const PO_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "ok", label: "OK" },
];

const ATTACHMENT_ACCEPT =
  ".jpg,.jpeg,.png,.webp,.heic,.heif,.pdf,.doc,.docx,.xls,.xlsx,image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function normalizePrograms(payload) {
  const raw = payload?.data ?? payload?.programs ?? payload?.items ?? payload;
  const list = Array.isArray(raw) ? raw : [];

  return list
    .map((record) => {
      const attrs = record?.attributes ?? {};
      const id = String(
        attrs?.id ??
          record?.id ??
          attrs?.program_id ??
          record?.program_id ??
          attrs?.programId ??
          record?.programId ??
          "",
      );
      const name = String(
        attrs?.name ?? record?.name ?? "",
      );

      return { id, name };
    })
    .filter((item) => item.id);
}

export default function AddPurchaseOrderButton({ customerId }) {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [attachmentFiles, setAttachmentFiles] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [isLoadingPrograms, setIsLoadingPrograms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const loadPrograms = async () => {
    if (!customerId) {
      setPrograms([]);
      return;
    }

    setIsLoadingPrograms(true);

    try {
      const authToken = localStorage.getItem("auth_token");
      const response = await fetch(
        `/api/v1/customers/${encodeURIComponent(customerId)}/programs`,
        {
          headers: {
            Accept: "application/json",
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          credentials: "include",
          cache: "no-store",
        },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setPrograms([]);
        return;
      }

      setPrograms(normalizePrograms(data));
    } catch {
      setPrograms([]);
    } finally {
      setIsLoadingPrograms(false);
    }
  };

  const openDialog = () => {
    setError("");
    setAttachmentFiles([]);
    setPrograms([]);
    setForm({
      ...EMPTY_FORM,
      date: new Date().toISOString().slice(0, 10),
    });
    setIsDialogOpen(true);
    void loadPrograms();
  };

  const closeDialog = () => {
    if (isLoading) return;
    setIsDialogOpen(false);
    setForm(EMPTY_FORM);
    setAttachmentFiles([]);
    setPrograms([]);
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
    const programId = form.program_id.trim();
    const requestPerson = form.request_person.trim();
    const description = form.description.trim();
    const status = form.status === "ok" ? "ok" : "pending";

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
      const authHeaders = {
        Accept: "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      };

      let response;

      if (attachmentFiles.length > 0) {
        const body = new FormData();
        body.append("customer_id", customerId);
        body.append("po_number", poNumber);
        body.append("date", date);
        body.append("amount", String(amount));
        body.append("status", status);
        if (programId) {
          body.append("program_id", programId);
        }
        if (requestPerson) {
          body.append("request_person", requestPerson);
        }
        if (description) {
          body.append("description", description);
        }
        for (const file of attachmentFiles) {
          body.append("attachments[]", file);
        }

        response = await fetch("/api/v1/purchase-orders", {
          method: "POST",
          headers: authHeaders,
          credentials: "include",
          body,
        });
      } else {
        response = await fetch("/api/v1/purchase-orders", {
          method: "POST",
          headers: {
            ...authHeaders,
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            customer_id: customerId,
            po_number: poNumber,
            date,
            amount,
            status,
            ...(programId ? { program_id: programId } : {}),
            ...(requestPerson ? { request_person: requestPerson } : {}),
            ...(description ? { description } : {}),
          }),
        });
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const validationMessage =
          data?.errors?.po_number?.[0] ||
          data?.errors?.date?.[0] ||
          data?.errors?.amount?.[0] ||
          data?.errors?.customer_id?.[0] ||
          data?.errors?.program_id?.[0] ||
          data?.errors?.status?.[0] ||
          data?.errors?.["attachments[]"]?.[0] ||
          data?.errors?.attachments?.[0] ||
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
      setAttachmentFiles([]);
      setPrograms([]);
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
        Add purchase order
      </button>

      {isDialogOpen ? (
        <ModalShell
          title="Add purchase order"
          description="Create a purchase order for this customer."
          onClose={closeDialog}
          closeDisabled={isLoading}
          closeLabel="Close add purchase order dialog"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
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
                  htmlFor="poProgram"
                  className="mb-2 block text-sm font-medium text-zinc-700"
                >
                  Program{" "}
                  <span className="font-normal text-zinc-400">(optional)</span>
                </label>
                <select
                  id="poProgram"
                  value={form.program_id}
                  onChange={(event) =>
                    updateField("program_id", event.target.value)
                  }
                  disabled={isLoading || isLoadingPrograms}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-300 focus:ring-2 disabled:cursor-not-allowed disabled:bg-zinc-100"
                >
                  <option value="">None</option>
                  {programs.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.name || program.id}
                    </option>
                  ))}
                </select>
                {isLoadingPrograms ? (
                  <p className="mt-2 text-xs text-zinc-500">Loading programs…</p>
                ) : null}
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
                  htmlFor="poStatus"
                  className="mb-2 block text-sm font-medium text-zinc-700"
                >
                  Status
                </label>
                <select
                  id="poStatus"
                  value={form.status}
                  onChange={(event) => updateField("status", event.target.value)}
                  disabled={isLoading}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-300 focus:ring-2 disabled:cursor-not-allowed disabled:bg-zinc-100"
                >
                  {PO_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
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

              <div>
                <label
                  htmlFor="poAttachments"
                  className="mb-2 block text-sm font-medium text-zinc-700"
                >
                  Attachments{" "}
                  <span className="font-normal text-zinc-400">
                    (optional, images/docs/PDF, max 10 MB each)
                  </span>
                </label>
                <FileUploadWithCamera
                  id="poAttachments"
                  multiple
                  accept={ATTACHMENT_ACCEPT}
                  existingFiles={attachmentFiles}
                  onFilesChange={setAttachmentFiles}
                  disabled={isLoading}
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
                  {isLoading ? "Adding..." : "Create purchase order"}
                </button>
              </div>
            </form>
        </ModalShell>
      ) : null}
    </div>
  );
}
