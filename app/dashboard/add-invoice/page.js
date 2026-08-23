"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import FileUploadWithCamera from "@/app/dashboard/components/FileUploadWithCamera";
import {
  extractResourceId,
  fetchCustomers,
  fetchPurchaseOrdersOnly,
  getAuthHeaders,
  loadCustomerContext,
} from "../add-trip-report/customerContext";
import { fetchUnassignedTripReports } from "./tripReports";

const inputClass =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-red-600 focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-zinc-100";
const labelClass = "block text-xs font-medium text-zinc-700";

const STEPS = [
  { id: 1, title: "Customer", description: "Choose the customer" },
  { id: 2, title: "Program", description: "Optional program" },
  { id: 3, title: "Purchase order", description: "Select or create a PO" },
  { id: 4, title: "Invoice", description: "Create the invoice" },
];

const PROGRAM_NONE = "";
const PO_MODE_SELECT = "select";
const PO_MODE_CREATE = "create";

const EMPTY_PO_FORM = {
  po_number: "",
  date: "",
  amount: "",
  request_person: "",
  description: "",
  status: "pending",
};

const EMPTY_INVOICE_FORM = {
  invoice_number: "",
  lddap_adap_no: "",
  note: "",
  status: "unpaid",
};

const PO_ATTACHMENT_ACCEPT =
  ".jpg,.jpeg,.png,.webp,.heic,.heif,.pdf,.doc,.docx,.xls,.xlsx,image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const INVOICE_FILE_ACCEPT =
  "image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,.heic,.heif,application/pdf";

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

function formatPhp(amount) {
  if (typeof amount !== "number" || !Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    currencyDisplay: "code",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString("en-PH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function StepProgress({ currentStep }) {
  return (
    <ol className="grid gap-2 sm:grid-cols-4">
      {STEPS.map((step) => {
        const isActive = currentStep === step.id;
        const isComplete = currentStep > step.id;
        return (
          <li
            key={step.id}
            className={`rounded-xl border px-3 py-3 ${
              isActive
                ? "border-red-300 bg-red-50"
                : isComplete
                  ? "border-emerald-200 bg-emerald-50/70"
                  : "border-zinc-200 bg-white"
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                  isActive
                    ? "bg-red-400 text-white"
                    : isComplete
                      ? "bg-emerald-500 text-white"
                      : "bg-zinc-200 text-zinc-600"
                }`}
              >
                {step.id}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-zinc-900">
                  {step.title}
                </p>
                <p className="truncate text-[11px] text-zinc-500">
                  {step.description}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default function AddInvoicePage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [stepError, setStepError] = useState("");

  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [customersError, setCustomersError] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [customerId, setCustomerId] = useState("");

  const [programs, setPrograms] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [contextLoading, setContextLoading] = useState(false);
  const [contextError, setContextError] = useState("");

  const [programId, setProgramId] = useState(PROGRAM_NONE);
  const [showNewProgram, setShowNewProgram] = useState(false);
  const [newProgramName, setNewProgramName] = useState("");
  const [newProgramDescription, setNewProgramDescription] = useState("");
  const [creatingProgram, setCreatingProgram] = useState(false);
  const [programError, setProgramError] = useState("");

  const [poMode, setPoMode] = useState(PO_MODE_SELECT);
  const [purchaseOrderId, setPurchaseOrderId] = useState("");
  const [poForm, setPoForm] = useState(EMPTY_PO_FORM);
  const [poAttachments, setPoAttachments] = useState([]);
  const [creatingPo, setCreatingPo] = useState(false);
  const [poError, setPoError] = useState("");

  const [availableTripReports, setAvailableTripReports] = useState([]);
  const [tripReportsLoading, setTripReportsLoading] = useState(false);
  const [tripReportsError, setTripReportsError] = useState("");

  const [invoiceForm, setInvoiceForm] = useState(EMPTY_INVOICE_FORM);
  const [selectedTripReportIds, setSelectedTripReportIds] = useState([]);
  const [paymentReceipt, setPaymentReceipt] = useState(null);
  const [disbursementVoucher, setDisbursementVoucher] = useState(null);
  const [invoicePicture, setInvoicePicture] = useState(null);
  const [fileUploadKey, setFileUploadKey] = useState(0);
  const [submittingInvoice, setSubmittingInvoice] = useState(false);
  const [invoiceError, setInvoiceError] = useState("");
  const [invoiceSuccess, setInvoiceSuccess] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCustomers() {
      setCustomersLoading(true);
      setCustomersError("");
      try {
        const list = await fetchCustomers();
        if (!cancelled) setCustomers(list);
      } catch (error) {
        if (!cancelled) {
          setCustomers([]);
          setCustomersError(
            error instanceof Error ? error.message : "Failed to load customers.",
          );
        }
      } finally {
        if (!cancelled) setCustomersLoading(false);
      }
    }

    loadCustomers();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!customerId) {
      setPrograms([]);
      setPurchaseOrders([]);
      setContextError("");
      return undefined;
    }

    let cancelled = false;

    async function loadContext() {
      setContextLoading(true);
      setContextError("");
      try {
        const result = await loadCustomerContext(customerId, {
          programId: programId || undefined,
          unprogrammed: !programId,
        });
        if (cancelled) return;
        setPrograms(result.programs);
        setPurchaseOrders(result.purchaseOrders);
      } catch (error) {
        if (!cancelled) {
          setPrograms([]);
          setPurchaseOrders([]);
          setContextError(
            error instanceof Error
              ? error.message
              : "Failed to load customer context.",
          );
        }
      } finally {
        if (!cancelled) setContextLoading(false);
      }
    }

    loadContext();
    return () => {
      cancelled = true;
    };
  }, [customerId, programId]);

  useEffect(() => {
    if (!purchaseOrderId || currentStep !== 4) {
      return undefined;
    }

    let cancelled = false;

    async function loadTripReports() {
      setTripReportsLoading(true);
      setTripReportsError("");
      try {
        const reports = await fetchUnassignedTripReports(purchaseOrderId);
        if (!cancelled) {
          setAvailableTripReports(reports);
          setSelectedTripReportIds((current) =>
            current.filter((id) => reports.some((report) => report.id === id)),
          );
        }
      } catch (error) {
        if (!cancelled) {
          setAvailableTripReports([]);
          setTripReportsError(
            error instanceof Error
              ? error.message
              : "Failed to load trip reports.",
          );
        }
      } finally {
        if (!cancelled) setTripReportsLoading(false);
      }
    }

    loadTripReports();
    return () => {
      cancelled = true;
    };
  }, [purchaseOrderId, currentStep]);

  const filteredCustomers = useMemo(() => {
    const q = customerFilter.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((customer) =>
      customer.name.toLowerCase().includes(q),
    );
  }, [customers, customerFilter]);

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === customerId) || null,
    [customers, customerId],
  );

  const selectedPo = useMemo(
    () => purchaseOrders.find((po) => po.id === purchaseOrderId) || null,
    [purchaseOrders, purchaseOrderId],
  );

  const resetFromCustomer = () => {
    setProgramId(PROGRAM_NONE);
    setShowNewProgram(false);
    setNewProgramName("");
    setNewProgramDescription("");
    setProgramError("");
    setPoMode(PO_MODE_SELECT);
    setPurchaseOrderId("");
    setPoForm({ ...EMPTY_PO_FORM, date: todayIso() });
    setPoAttachments([]);
    setPoError("");
    resetInvoiceStep();
  };

  const resetFromProgram = () => {
    setPurchaseOrderId("");
    setPoMode(PO_MODE_SELECT);
    setPoError("");
    resetInvoiceStep();
  };

  const resetInvoiceStep = () => {
    setAvailableTripReports([]);
    setSelectedTripReportIds([]);
    setTripReportsError("");
    setInvoiceForm(EMPTY_INVOICE_FORM);
    setPaymentReceipt(null);
    setDisbursementVoucher(null);
    setInvoicePicture(null);
    setFileUploadKey((key) => key + 1);
    setInvoiceError("");
    setInvoiceSuccess(null);
  };

  const handleCustomerChange = (nextId) => {
    setCustomerId(nextId);
    resetFromCustomer();
    setStepError("");
  };

  const handleProgramChange = (nextId) => {
    setProgramId(nextId);
    resetFromProgram();
    setStepError("");
  };

  const handleCreateProgram = async (event) => {
    event.preventDefault();
    if (!customerId || creatingProgram) return;

    const name = newProgramName.trim();
    if (!name) {
      setProgramError("Program name is required.");
      return;
    }

    setProgramError("");
    setCreatingProgram(true);

    try {
      const response = await fetch("/api/v1/programs", {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        credentials: "include",
        body: JSON.stringify({
          customer_id: customerId,
          name,
          ...(newProgramDescription.trim()
            ? { description: newProgramDescription.trim() }
            : {}),
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setProgramError(
          firstErrorMessage(data, ["name", "description", "customer_id"]) ||
            "Failed to create program.",
        );
        return;
      }

      const createdId = extractResourceId(data);
      const created = {
        id: createdId,
        name,
        description: newProgramDescription.trim(),
      };

      setPrograms((current) => {
        if (createdId && current.some((item) => item.id === createdId)) {
          return current;
        }
        return createdId ? [created, ...current] : current;
      });
      setShowNewProgram(false);
      setNewProgramName("");
      setNewProgramDescription("");
      if (createdId) handleProgramChange(createdId);
    } catch {
      setProgramError("Network error. Please try again.");
    } finally {
      setCreatingProgram(false);
    }
  };

  const updatePoField = (key, value) => {
    setPoForm((current) => ({ ...current, [key]: value }));
  };

  const handleCreatePurchaseOrder = async (event) => {
    event.preventDefault();
    if (!customerId || creatingPo) return;

    const poNumber = poForm.po_number.trim();
    const date = poForm.date.trim();
    const amountValue = poForm.amount.trim();
    const requestPerson = poForm.request_person.trim();
    const description = poForm.description.trim();
    const status = poForm.status === "ok" ? "ok" : "pending";

    if (!poNumber) {
      setPoError("PO number is required.");
      return;
    }
    if (!date) {
      setPoError("Date is required.");
      return;
    }
    const amount = Number(amountValue);
    if (!Number.isInteger(amount) || amount < 0) {
      setPoError("Amount must be a whole number of at least 0.");
      return;
    }

    setPoError("");
    setCreatingPo(true);

    try {
      const authHeaders = getAuthHeaders();
      let response;

      if (poAttachments.length > 0) {
        const body = new FormData();
        body.append("customer_id", customerId);
        body.append("po_number", poNumber);
        body.append("date", date);
        body.append("amount", String(amount));
        body.append("status", status);
        if (programId) body.append("program_id", programId);
        if (requestPerson) body.append("request_person", requestPerson);
        if (description) body.append("description", description);
        for (const file of poAttachments) {
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
        setPoError(
          firstErrorMessage(data, [
            "po_number",
            "date",
            "amount",
            "customer_id",
            "program_id",
            "status",
            "attachments",
            "attachments[]",
          ]) || "Failed to create purchase order.",
        );
        return;
      }

      const createdId = extractResourceId(data);
      const createdPo = {
        id: createdId,
        poNumber,
        date,
        amount,
        status,
        programId: programId || "",
      };

      if (createdId) {
        setPurchaseOrders((current) => {
          if (current.some((item) => item.id === createdId)) return current;
          return [createdPo, ...current];
        });
        setPurchaseOrderId(createdId);
        resetInvoiceStep();
      } else {
        try {
          const refreshed = await fetchPurchaseOrdersOnly(customerId, {
            programId: programId || undefined,
            unprogrammed: !programId,
          });
          setPurchaseOrders(refreshed);
        } catch {
          // Keep local list.
        }
      }

      setPoMode(PO_MODE_SELECT);
      setPoForm({ ...EMPTY_PO_FORM, date: todayIso() });
      setPoAttachments([]);
      setStepError("");
    } catch {
      setPoError("Network error. Please try again.");
    } finally {
      setCreatingPo(false);
    }
  };

  const updateInvoiceField = (key, value) => {
    setInvoiceForm((current) => ({ ...current, [key]: value }));
  };

  const toggleTripReport = (tripReportId) => {
    setSelectedTripReportIds((current) =>
      current.includes(tripReportId)
        ? current.filter((id) => id !== tripReportId)
        : [...current, tripReportId],
    );
  };

  const goNext = () => {
    setStepError("");
    if (currentStep === 1) {
      if (!customerId) {
        setStepError("Select a customer to continue.");
        return;
      }
      setCurrentStep(2);
      return;
    }
    if (currentStep === 2) {
      setCurrentStep(3);
      return;
    }
    if (currentStep === 3) {
      if (!purchaseOrderId) {
        setStepError("Select or create a purchase order to continue.");
        return;
      }
      setCurrentStep(4);
    }
  };

  const goBack = () => {
    setStepError("");
    setCurrentStep((step) => Math.max(1, step - 1));
  };

  const handleSubmitInvoice = async (event) => {
    event.preventDefault();
    if (!purchaseOrderId || submittingInvoice) return;

    const invoiceNumber = invoiceForm.invoice_number.trim();
    const lddapAdapNo = invoiceForm.lddap_adap_no.trim();
    const note = invoiceForm.note.trim();
    const status = invoiceForm.status === "paid" ? "paid" : "unpaid";

    if (!invoiceNumber) {
      setInvoiceError("Invoice number is required.");
      return;
    }

    setInvoiceError("");
    setInvoiceSuccess(null);
    setSubmittingInvoice(true);

    try {
      const body = new FormData();
      body.append("invoice_number", invoiceNumber);
      if (lddapAdapNo) body.append("lddap_adap_no", lddapAdapNo);
      body.append("status", status);
      if (note) body.append("note", note);
      if (paymentReceipt) body.append("payment_receipt", paymentReceipt);
      if (disbursementVoucher) {
        body.append("disbursement_voucher", disbursementVoucher);
      }
      if (invoicePicture) body.append("invoice_picture", invoicePicture);

      const authHeaders = getAuthHeaders();
      const response = await fetch(
        `/api/v1/purchase-orders/${encodeURIComponent(purchaseOrderId)}/invoices`,
        {
          method: "POST",
          headers: authHeaders,
          credentials: "include",
          body,
        },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setInvoiceError(
          firstErrorMessage(data, [
            "invoice_number",
            "lddap_adap_no",
            "note",
            "status",
            "payment_receipt",
            "disbursement_voucher",
            "invoice_picture",
          ]) || "Failed to create invoice.",
        );
        return;
      }

      const invoiceId = extractResourceId(data);
      let attachWarning = "";

      if (selectedTripReportIds.length > 0 && invoiceId) {
        const attachResponse = await fetch(
          `/api/v1/purchase-orders/${encodeURIComponent(purchaseOrderId)}/invoices/${encodeURIComponent(invoiceId)}/trip-reports`,
          {
            method: "POST",
            headers: {
              ...authHeaders,
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              trip_report_ids: selectedTripReportIds,
            }),
          },
        );
        const attachData = await attachResponse.json().catch(() => ({}));
        if (!attachResponse.ok) {
          attachWarning =
            firstErrorMessage(attachData, ["trip_report_ids"]) ||
            "Failed to attach trip reports.";
        }
      }

      const poHref =
        customerId && purchaseOrderId
          ? `/dashboard/customer/${encodeURIComponent(customerId)}/purchase-order/${encodeURIComponent(purchaseOrderId)}`
          : null;

      setInvoiceForm(EMPTY_INVOICE_FORM);
      setSelectedTripReportIds([]);
      setPaymentReceipt(null);
      setDisbursementVoucher(null);
      setInvoicePicture(null);
      setFileUploadKey((key) => key + 1);

      if (attachWarning) {
        setInvoiceError(
          `Invoice created, but trip reports were not attached: ${attachWarning}`,
        );
      }

      setInvoiceSuccess({
        message: attachWarning
          ? "Invoice created (trip report attach incomplete)."
          : "Invoice created successfully.",
        poHref,
        poLabel: selectedPo?.poNumber || purchaseOrderId,
      });

      try {
        const reports = await fetchUnassignedTripReports(purchaseOrderId);
        setAvailableTripReports(reports);
      } catch {
        // Keep previous list.
      }
    } catch {
      setInvoiceError("Network error. Please try again.");
    } finally {
      setSubmittingInvoice(false);
    }
  };

  const busy =
    creatingProgram || creatingPo || submittingInvoice || contextLoading;

  return (
    <div className="min-w-0 w-full space-y-6 lg:pr-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
          Add Invoice
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Follow the steps to select a customer, program, and purchase order,
          then create an invoice.
        </p>
      </div>

      <StepProgress currentStep={currentStep} />

      <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 bg-gradient-to-r from-zinc-50 to-white px-4 py-4 sm:px-6">
          <h2 className="text-sm font-semibold text-zinc-900">
            Step {currentStep}: {STEPS[currentStep - 1].title}
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            {STEPS[currentStep - 1].description}
          </p>
        </div>

        <div className="px-4 py-5 sm:px-6">
          {currentStep === 1 ? (
            customersLoading ? (
              <p className="text-sm text-zinc-500">Loading customers…</p>
            ) : customersError ? (
              <p className="text-sm text-red-600">{customersError}</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="customer-filter" className={labelClass}>
                    Search customers
                  </label>
                  <input
                    id="customer-filter"
                    type="search"
                    value={customerFilter}
                    onChange={(event) => setCustomerFilter(event.target.value)}
                    placeholder="Filter by name"
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="customer-id" className={labelClass}>
                    Customer
                  </label>
                  <select
                    id="customer-id"
                    value={customerId}
                    onChange={(event) =>
                      handleCustomerChange(event.target.value)
                    }
                    className={inputClass}
                  >
                    <option value="">Select a customer…</option>
                    {filteredCustomers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name || customer.id}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )
          ) : null}

          {currentStep === 2 ? (
            <div className="space-y-4">
              {contextError ? (
                <p className="text-sm text-red-600">{contextError}</p>
              ) : null}
              <div>
                <label htmlFor="program-id" className={labelClass}>
                  Program
                </label>
                <select
                  id="program-id"
                  value={programId}
                  onChange={(event) => handleProgramChange(event.target.value)}
                  disabled={busy}
                  className={inputClass}
                >
                  <option value={PROGRAM_NONE}>None (unprogrammed)</option>
                  {programs.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.name || program.id}
                    </option>
                  ))}
                </select>
                {contextLoading ? (
                  <p className="mt-2 text-xs text-zinc-500">Loading programs…</p>
                ) : null}
              </div>

              {!showNewProgram ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowNewProgram(true);
                    setProgramError("");
                  }}
                  disabled={busy}
                  className="text-sm font-medium text-red-700 transition hover:text-red-800 disabled:opacity-50"
                >
                  + Add new program
                </button>
              ) : (
                <form
                  onSubmit={handleCreateProgram}
                  className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-4"
                >
                  <p className="text-sm font-medium text-zinc-800">
                    New program for {selectedCustomer?.name || "this customer"}
                  </p>
                  <div className="mt-3 space-y-3">
                    <div>
                      <label htmlFor="new-program-name" className={labelClass}>
                        Name
                      </label>
                      <input
                        id="new-program-name"
                        type="text"
                        value={newProgramName}
                        onChange={(event) =>
                          setNewProgramName(event.target.value)
                        }
                        disabled={creatingProgram}
                        maxLength={255}
                        required
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="new-program-description"
                        className={labelClass}
                      >
                        Description{" "}
                        <span className="font-normal text-zinc-400">
                          (optional)
                        </span>
                      </label>
                      <textarea
                        id="new-program-description"
                        value={newProgramDescription}
                        onChange={(event) =>
                          setNewProgramDescription(event.target.value)
                        }
                        disabled={creatingProgram}
                        rows={2}
                        className={inputClass}
                      />
                    </div>
                  </div>
                  {programError ? (
                    <p className="mt-3 text-sm text-red-600">{programError}</p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="submit"
                      disabled={creatingProgram}
                      className="rounded-lg bg-red-400 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-500 disabled:opacity-60"
                    >
                      {creatingProgram ? "Creating…" : "Create program"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewProgram(false);
                        setProgramError("");
                      }}
                      disabled={creatingProgram}
                      className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : null}

          {currentStep === 3 ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPoMode(PO_MODE_SELECT);
                    setPoError("");
                  }}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                    poMode === PO_MODE_SELECT
                      ? "bg-zinc-900 text-white"
                      : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
                  }`}
                >
                  Select existing
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPoMode(PO_MODE_CREATE);
                    setPoForm({ ...EMPTY_PO_FORM, date: todayIso() });
                    setPoAttachments([]);
                    setPoError("");
                  }}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                    poMode === PO_MODE_CREATE
                      ? "bg-zinc-900 text-white"
                      : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
                  }`}
                >
                  Create new
                </button>
              </div>

              {poMode === PO_MODE_SELECT ? (
                <div>
                  <label htmlFor="purchase-order-id" className={labelClass}>
                    Purchase order
                  </label>
                  <select
                    id="purchase-order-id"
                    value={purchaseOrderId}
                    onChange={(event) => {
                      setPurchaseOrderId(event.target.value);
                      resetInvoiceStep();
                      setStepError("");
                    }}
                    disabled={busy}
                    className={inputClass}
                  >
                    <option value="">Select a purchase order…</option>
                    {purchaseOrders.map((po) => (
                      <option key={po.id} value={po.id}>
                        {po.poNumber || po.id}
                        {po.date ? ` · ${po.date}` : ""}
                        {typeof po.amount === "number"
                          ? ` · ${formatPhp(po.amount)}`
                          : ""}
                      </option>
                    ))}
                  </select>
                  {contextLoading ? (
                    <p className="mt-2 text-xs text-zinc-500">
                      Loading purchase orders…
                    </p>
                  ) : purchaseOrders.length === 0 ? (
                    <p className="mt-2 text-xs text-zinc-500">
                      No purchase orders for this selection. Create one instead.
                    </p>
                  ) : null}
                </div>
              ) : (
                <form onSubmit={handleCreatePurchaseOrder} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="po-number" className={labelClass}>
                        PO number
                      </label>
                      <input
                        id="po-number"
                        type="text"
                        value={poForm.po_number}
                        onChange={(event) =>
                          updatePoField("po_number", event.target.value)
                        }
                        disabled={creatingPo}
                        required
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label htmlFor="po-date" className={labelClass}>
                        Date
                      </label>
                      <input
                        id="po-date"
                        type="date"
                        value={poForm.date}
                        onChange={(event) =>
                          updatePoField("date", event.target.value)
                        }
                        disabled={creatingPo}
                        required
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label htmlFor="po-amount" className={labelClass}>
                        Amount
                      </label>
                      <input
                        id="po-amount"
                        type="number"
                        min="0"
                        step="1"
                        value={poForm.amount}
                        onChange={(event) =>
                          updatePoField("amount", event.target.value)
                        }
                        disabled={creatingPo}
                        required
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label htmlFor="po-status" className={labelClass}>
                        Status
                      </label>
                      <select
                        id="po-status"
                        value={poForm.status}
                        onChange={(event) =>
                          updatePoField("status", event.target.value)
                        }
                        disabled={creatingPo}
                        className={inputClass}
                      >
                        <option value="pending">Pending</option>
                        <option value="ok">OK</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="po-request-person" className={labelClass}>
                        Request person{" "}
                        <span className="font-normal text-zinc-400">
                          (optional)
                        </span>
                      </label>
                      <input
                        id="po-request-person"
                        type="text"
                        value={poForm.request_person}
                        onChange={(event) =>
                          updatePoField("request_person", event.target.value)
                        }
                        disabled={creatingPo}
                        className={inputClass}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label htmlFor="po-description" className={labelClass}>
                        Description{" "}
                        <span className="font-normal text-zinc-400">
                          (optional)
                        </span>
                      </label>
                      <textarea
                        id="po-description"
                        value={poForm.description}
                        onChange={(event) =>
                          updatePoField("description", event.target.value)
                        }
                        disabled={creatingPo}
                        rows={2}
                        className={inputClass}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label htmlFor="po-attachments" className={labelClass}>
                        Attachments{" "}
                        <span className="font-normal text-zinc-400">
                          (optional)
                        </span>
                      </label>
                      <div className="mt-1">
                        <FileUploadWithCamera
                          id="po-attachments"
                          multiple
                          accept={PO_ATTACHMENT_ACCEPT}
                          existingFiles={poAttachments}
                          onFilesChange={setPoAttachments}
                          disabled={creatingPo}
                        />
                      </div>
                    </div>
                  </div>
                  {poError ? (
                    <p className="text-sm text-red-600">{poError}</p>
                  ) : null}
                  <button
                    type="submit"
                    disabled={creatingPo}
                    className="rounded-lg bg-red-400 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500 disabled:opacity-60"
                  >
                    {creatingPo ? "Creating…" : "Create purchase order"}
                  </button>
                </form>
              )}
            </div>
          ) : null}

          {currentStep === 4 ? (
            <form onSubmit={handleSubmitInvoice} className="space-y-4">
              <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                Invoice for{" "}
                <span className="font-semibold">
                  {selectedCustomer?.name || "customer"}
                </span>
                {" · PO "}
                <span className="font-semibold">
                  {selectedPo?.poNumber || purchaseOrderId}
                </span>
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="invoice-number" className={labelClass}>
                    Invoice number
                  </label>
                  <input
                    id="invoice-number"
                    type="text"
                    value={invoiceForm.invoice_number}
                    onChange={(event) =>
                      updateInvoiceField("invoice_number", event.target.value)
                    }
                    disabled={submittingInvoice}
                    required
                    maxLength={255}
                    className={inputClass}
                    placeholder="e.g. INV-1001"
                  />
                </div>
                <div>
                  <label htmlFor="lddap-adap-no" className={labelClass}>
                    LDDAP/ADAP number{" "}
                    <span className="font-normal text-zinc-400">(optional)</span>
                  </label>
                  <input
                    id="lddap-adap-no"
                    type="text"
                    value={invoiceForm.lddap_adap_no}
                    onChange={(event) =>
                      updateInvoiceField("lddap_adap_no", event.target.value)
                    }
                    disabled={submittingInvoice}
                    maxLength={255}
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="invoice-note" className={labelClass}>
                    Note{" "}
                    <span className="font-normal text-zinc-400">(optional)</span>
                  </label>
                  <textarea
                    id="invoice-note"
                    value={invoiceForm.note}
                    onChange={(event) =>
                      updateInvoiceField("note", event.target.value)
                    }
                    disabled={submittingInvoice}
                    rows={2}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="invoice-status" className={labelClass}>
                    Status
                  </label>
                  <select
                    id="invoice-status"
                    value={invoiceForm.status}
                    onChange={(event) =>
                      updateInvoiceField("status", event.target.value)
                    }
                    disabled={submittingInvoice}
                    className={inputClass}
                  >
                    <option value="unpaid">Unpaid</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
              </div>

              <fieldset>
                <legend className={`${labelClass} mb-2`}>
                  Trip reports{" "}
                  <span className="font-normal text-zinc-400">(optional)</span>
                </legend>
                {tripReportsLoading ? (
                  <p className="text-sm text-zinc-500">Loading trip reports…</p>
                ) : tripReportsError ? (
                  <p className="text-sm text-red-600">{tripReportsError}</p>
                ) : availableTripReports.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-500">
                    No unassigned trip reports available.
                  </p>
                ) : (
                  <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-zinc-200 p-3">
                    {availableTripReports.map((report) => {
                      const checked = selectedTripReportIds.includes(report.id);
                      const inputId = `wizard-trip-report-${report.id}`;
                      return (
                        <label
                          key={report.id}
                          htmlFor={inputId}
                          className={`flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 transition hover:bg-zinc-50 ${
                            submittingInvoice
                              ? "cursor-not-allowed opacity-60"
                              : ""
                          }`}
                        >
                          <input
                            id={inputId}
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleTripReport(report.id)}
                            disabled={submittingInvoice}
                            className="mt-1 h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-400"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium text-zinc-900">
                              {report.tripReportNo
                                ? `${report.tripReportNo} · `
                                : ""}
                              {formatDate(report.reportDate)} ·{" "}
                              {report.driver || "—"}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-zinc-500">
                              {report.destinations || "—"} ·{" "}
                              {formatPhp(report.amount)}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </fieldset>

              <div>
                <label htmlFor="invoice-picture" className={labelClass}>
                  Invoice picture{" "}
                  <span className="font-normal text-zinc-400">(optional)</span>
                </label>
                <div className="mt-1">
                  <FileUploadWithCamera
                    key={`invoice-picture-${fileUploadKey}`}
                    id="invoice-picture"
                    accept={INVOICE_FILE_ACCEPT}
                    onFilesChange={(files) =>
                      setInvoicePicture(files[0] ?? null)
                    }
                    disabled={submittingInvoice}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="payment-receipt" className={labelClass}>
                  Payment receipt{" "}
                  <span className="font-normal text-zinc-400">(optional)</span>
                </label>
                <div className="mt-1">
                  <FileUploadWithCamera
                    key={`payment-receipt-${fileUploadKey}`}
                    id="payment-receipt"
                    accept={INVOICE_FILE_ACCEPT}
                    onFilesChange={(files) =>
                      setPaymentReceipt(files[0] ?? null)
                    }
                    disabled={submittingInvoice}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="disbursement-voucher" className={labelClass}>
                  Disbursement voucher{" "}
                  <span className="font-normal text-zinc-400">(optional)</span>
                </label>
                <div className="mt-1">
                  <FileUploadWithCamera
                    key={`disbursement-voucher-${fileUploadKey}`}
                    id="disbursement-voucher"
                    accept={INVOICE_FILE_ACCEPT}
                    onFilesChange={(files) =>
                      setDisbursementVoucher(files[0] ?? null)
                    }
                    disabled={submittingInvoice}
                  />
                </div>
              </div>

              {invoiceError ? (
                <p className="text-sm text-red-600">{invoiceError}</p>
              ) : null}
              {invoiceSuccess ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  <p>{invoiceSuccess.message}</p>
                  {invoiceSuccess.poHref ? (
                    <p className="mt-1">
                      <Link
                        href={invoiceSuccess.poHref}
                        className="font-medium underline underline-offset-2"
                      >
                        View purchase order {invoiceSuccess.poLabel}
                      </Link>
                    </p>
                  ) : null}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={submittingInvoice}
                className="rounded-lg bg-red-400 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-60"
              >
                {submittingInvoice ? "Creating…" : "Create invoice"}
              </button>
            </form>
          ) : null}

          {stepError ? (
            <p className="mt-4 text-sm text-red-600">{stepError}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={goBack}
            disabled={currentStep === 1 || busy}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Back
          </button>
          {currentStep < 4 ? (
            <button
              type="button"
              onClick={goNext}
              disabled={busy}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60"
            >
              Next
            </button>
          ) : (
            <p className="text-xs text-zinc-500">
              Submit the invoice form above to finish.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
