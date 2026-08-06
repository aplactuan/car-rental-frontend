"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FileUploadWithCamera from "@/app/dashboard/components/FileUploadWithCamera";

const PO_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "ok", label: "OK" },
];

const ATTACHMENT_ACCEPT =
  ".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx,image/jpeg,image/png,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function toDateInputValue(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    const asString = String(value);
    return asString.length >= 10 ? asString.slice(0, 10) : asString;
  }
  return parsed.toISOString().slice(0, 10);
}

function getAuthHeaders() {
  const authToken =
    typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  return {
    Accept: "application/json",
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
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
      const name = String(attrs?.name ?? record?.name ?? "");

      return { id, name };
    })
    .filter((item) => item.id);
}

export default function PurchaseOrderActions({ purchaseOrder, customerId }) {
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [form, setForm] = useState({
    po_number: "",
    date: "",
    amount: "",
    program_id: "",
    request_person: "",
    description: "",
    status: "pending",
  });
  const [programs, setPrograms] = useState([]);
  const [isLoadingPrograms, setIsLoadingPrograms] = useState(false);
  const [attachmentFiles, setAttachmentFiles] = useState([]);
  const [removeAttachmentIds, setRemoveAttachmentIds] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const resolvedCustomerId =
    customerId || purchaseOrder?.customerId || "";

  const purchaseOrderPath = purchaseOrder?.id
    ? `/api/v1/purchase-orders/${encodeURIComponent(purchaseOrder.id)}`
    : "";

  const loadPrograms = async () => {
    if (!resolvedCustomerId) {
      setPrograms([]);
      return;
    }

    setIsLoadingPrograms(true);

    try {
      const response = await fetch(
        `/api/v1/customers/${encodeURIComponent(resolvedCustomerId)}/programs`,
        {
          headers: getAuthHeaders(),
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

  const openEdit = () => {
    setError("");
    setAttachmentFiles([]);
    setRemoveAttachmentIds([]);
    setPrograms([]);
    setForm({
      po_number: purchaseOrder.poNumber || "",
      date: toDateInputValue(purchaseOrder.date),
      amount:
        typeof purchaseOrder.amount === "number"
          ? String(purchaseOrder.amount)
          : "",
      program_id: purchaseOrder.programId || "",
      request_person: purchaseOrder.requestPerson || "",
      description: purchaseOrder.description || "",
      status: purchaseOrder.status === "ok" ? "ok" : "pending",
    });
    setIsEditOpen(true);
    void loadPrograms();
  };

  const closeEdit = () => {
    if (isSaving) return;
    setIsEditOpen(false);
    setError("");
    setAttachmentFiles([]);
    setRemoveAttachmentIds([]);
    setPrograms([]);
  };

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const toggleRemoveAttachment = (attachmentId) => {
    setRemoveAttachmentIds((current) =>
      current.includes(attachmentId)
        ? current.filter((id) => id !== attachmentId)
        : [...current, attachmentId],
    );
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!purchaseOrderPath) return;

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
    setIsSaving(true);

    try {
      const authHeaders = getAuthHeaders();
      const hasFileChanges =
        attachmentFiles.length > 0 || removeAttachmentIds.length > 0;

      let response;

      if (hasFileChanges) {
        const body = new FormData();
        body.append("po_number", poNumber);
        body.append("date", date);
        body.append("amount", String(amount));
        body.append("program_id", programId);
        body.append("request_person", requestPerson);
        body.append("description", description);
        body.append("status", status);
        for (const file of attachmentFiles) {
          body.append("attachments[]", file);
        }
        for (const id of removeAttachmentIds) {
          body.append("remove_attachment_ids[]", id);
        }

        response = await fetch(purchaseOrderPath, {
          method: "PUT",
          headers: authHeaders,
          credentials: "include",
          body,
        });
      } else {
        response = await fetch(purchaseOrderPath, {
          method: "PUT",
          headers: {
            ...authHeaders,
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            po_number: poNumber,
            date,
            amount,
            program_id: programId || null,
            request_person: requestPerson,
            description,
            status,
          }),
        });
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(
          firstErrorMessage(data, [
            "po_number",
            "date",
            "amount",
            "program_id",
            "request_person",
            "description",
            "status",
            "attachments",
            "attachments[]",
            "remove_attachment_ids",
            "remove_attachment_ids[]",
          ]) || "Failed to update purchase order.",
        );
        return;
      }

      setIsEditOpen(false);
      setPrograms([]);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const existingAttachments = Array.isArray(purchaseOrder?.attachments)
    ? purchaseOrder.attachments
    : [];

  return (
    <div>
      <button
        type="button"
        onClick={openEdit}
        disabled={!purchaseOrder?.id}
        className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Edit purchase order
      </button>

      {error && !isEditOpen ? (
        <p className="mt-2 max-w-[12rem] text-right text-xs text-red-100">
          {error}
        </p>
      ) : null}

      {isEditOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 px-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900">
                  Edit purchase order
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Update details, status, and attachments.
                </p>
              </div>
              <button
                type="button"
                onClick={closeEdit}
                disabled={isSaving}
                aria-label="Close edit purchase order dialog"
                className="rounded-md p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                x
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="edit-po-number"
                  className="mb-2 block text-sm font-medium text-zinc-700"
                >
                  PO number
                </label>
                <input
                  id="edit-po-number"
                  type="text"
                  value={form.po_number}
                  onChange={(event) =>
                    updateField("po_number", event.target.value)
                  }
                  disabled={isSaving}
                  maxLength={255}
                  required
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-300 focus:ring-2 disabled:cursor-not-allowed disabled:bg-zinc-100"
                />
              </div>

              <div>
                <label
                  htmlFor="edit-po-program"
                  className="mb-2 block text-sm font-medium text-zinc-700"
                >
                  Program{" "}
                  <span className="font-normal text-zinc-400">(optional)</span>
                </label>
                <select
                  id="edit-po-program"
                  value={form.program_id}
                  onChange={(event) =>
                    updateField("program_id", event.target.value)
                  }
                  disabled={isSaving || isLoadingPrograms}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-300 focus:ring-2 disabled:cursor-not-allowed disabled:bg-zinc-100"
                >
                  <option value="">None</option>
                  {form.program_id &&
                  !programs.some((program) => program.id === form.program_id) ? (
                    <option value={form.program_id}>
                      {purchaseOrder.programName || form.program_id}
                    </option>
                  ) : null}
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
                  htmlFor="edit-po-date"
                  className="mb-2 block text-sm font-medium text-zinc-700"
                >
                  Date
                </label>
                <input
                  id="edit-po-date"
                  type="date"
                  value={form.date}
                  onChange={(event) => updateField("date", event.target.value)}
                  disabled={isSaving}
                  required
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-300 focus:ring-2 disabled:cursor-not-allowed disabled:bg-zinc-100"
                />
              </div>

              <div>
                <label
                  htmlFor="edit-po-amount"
                  className="mb-2 block text-sm font-medium text-zinc-700"
                >
                  Amount
                </label>
                <input
                  id="edit-po-amount"
                  type="number"
                  min="0"
                  step="1"
                  value={form.amount}
                  onChange={(event) =>
                    updateField("amount", event.target.value)
                  }
                  disabled={isSaving}
                  required
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-300 focus:ring-2 disabled:cursor-not-allowed disabled:bg-zinc-100"
                />
              </div>

              <div>
                <label
                  htmlFor="edit-po-status"
                  className="mb-2 block text-sm font-medium text-zinc-700"
                >
                  Status
                </label>
                <select
                  id="edit-po-status"
                  value={form.status}
                  onChange={(event) => updateField("status", event.target.value)}
                  disabled={isSaving}
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
                  htmlFor="edit-request-person"
                  className="mb-2 block text-sm font-medium text-zinc-700"
                >
                  Request person
                </label>
                <input
                  id="edit-request-person"
                  type="text"
                  value={form.request_person}
                  onChange={(event) =>
                    updateField("request_person", event.target.value)
                  }
                  disabled={isSaving}
                  maxLength={255}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-300 focus:ring-2 disabled:cursor-not-allowed disabled:bg-zinc-100"
                />
              </div>

              <div>
                <label
                  htmlFor="edit-po-description"
                  className="mb-2 block text-sm font-medium text-zinc-700"
                >
                  Description
                </label>
                <textarea
                  id="edit-po-description"
                  value={form.description}
                  onChange={(event) =>
                    updateField("description", event.target.value)
                  }
                  disabled={isSaving}
                  rows={3}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-300 focus:ring-2 disabled:cursor-not-allowed disabled:bg-zinc-100"
                />
              </div>

              {existingAttachments.length > 0 ? (
                <div>
                  <p className="mb-2 text-sm font-medium text-zinc-700">
                    Current attachments
                  </p>
                  <ul className="space-y-2">
                    {existingAttachments.map((attachment) => {
                      const marked = removeAttachmentIds.includes(
                        attachment.id,
                      );
                      return (
                        <li
                          key={attachment.id}
                          className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 px-3 py-2"
                        >
                          <a
                            href={attachment.url || undefined}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`min-w-0 truncate text-sm ${
                              marked
                                ? "text-zinc-400 line-through"
                                : "font-medium text-teal-700 hover:text-teal-800"
                            }`}
                          >
                            {attachment.fileName || "Attachment"}
                          </a>
                          <button
                            type="button"
                            onClick={() =>
                              toggleRemoveAttachment(attachment.id)
                            }
                            disabled={isSaving}
                            className="shrink-0 text-xs font-medium text-red-600 transition hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {marked ? "Undo" : "Remove"}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}

              <div>
                <label
                  htmlFor="edit-po-attachments"
                  className="mb-2 block text-sm font-medium text-zinc-700"
                >
                  Add attachments{" "}
                  <span className="font-normal text-zinc-400">
                    (optional, does not replace existing)
                  </span>
                </label>
                <FileUploadWithCamera
                  id="edit-po-attachments"
                  multiple
                  accept={ATTACHMENT_ACCEPT}
                  existingFiles={attachmentFiles}
                  onFilesChange={setAttachmentFiles}
                  disabled={isSaving}
                />
              </div>

              {error ? <p className="text-sm text-red-600">{error}</p> : null}

              <div className="mt-5 flex justify-end gap-3">
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
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
