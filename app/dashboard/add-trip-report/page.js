"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import DriverAutocomplete from "@/app/dashboard/customer/[customer_id]/purchase-order/[purchase_order_id]/DriverAutocomplete";
import FileUploadWithCamera from "@/app/dashboard/components/FileUploadWithCamera";
import {
  extractResourceId,
  fetchCustomers,
  fetchPurchaseOrdersOnly,
  getAuthHeaders,
  loadCustomerContext,
} from "./customerContext";

const inputClass =
  "mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-red-600 focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-zinc-100";
const labelClass = "block text-xs font-medium text-zinc-700";

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

const EMPTY_TRIP_FORM = {
  trip_report_no: "",
  report_date: "",
  trip_start: "",
  trip_end: "",
  driver: "",
  destinations: "",
  amount: "",
};

const ATTACHMENT_ACCEPT =
  ".jpg,.jpeg,.png,.webp,.heic,.heif,.pdf,.doc,.docx,.xls,.xlsx,image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

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

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function SectionCard({ step, title, description, children, disabled }) {
  return (
    <section
      className={`overflow-hidden rounded-xl border bg-white shadow-sm ${
        disabled ? "border-zinc-200 opacity-60" : "border-zinc-200"
      }`}
    >
      <div className="border-b border-zinc-100 bg-gradient-to-r from-zinc-50 to-white px-4 py-4 sm:px-6">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-400 text-xs font-bold text-white">
            {step}
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
            <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
          </div>
        </div>
      </div>
      <div className="px-4 py-5 sm:px-6">{children}</div>
    </section>
  );
}

export default function AddTripReportPage() {
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

  const [tripForm, setTripForm] = useState(EMPTY_TRIP_FORM);
  const [tripImage, setTripImage] = useState(null);
  const [tripUploadKey, setTripUploadKey] = useState(0);
  const [tripStartTouched, setTripStartTouched] = useState(false);
  const [tripEndTouched, setTripEndTouched] = useState(false);
  const [submittingTrip, setSubmittingTrip] = useState(false);
  const [tripError, setTripError] = useState("");
  const [tripSuccess, setTripSuccess] = useState(null);

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
        const unprogrammed = !programId;
        const result = await loadCustomerContext(customerId, {
          programId: programId || undefined,
          unprogrammed,
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
    () =>
      purchaseOrders.find((po) => po.id === purchaseOrderId) || null,
    [purchaseOrders, purchaseOrderId],
  );

  const resetDownstreamFromCustomer = () => {
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
    setTripForm({
      ...EMPTY_TRIP_FORM,
      report_date: todayIso(),
      trip_start: todayIso(),
      trip_end: todayIso(),
    });
    setTripImage(null);
    setTripStartTouched(false);
    setTripEndTouched(false);
    setTripError("");
    setTripSuccess(null);
  };

  const handleCustomerChange = (nextId) => {
    setCustomerId(nextId);
    resetDownstreamFromCustomer();
  };

  const handleProgramChange = (nextId) => {
    setProgramId(nextId);
    setPurchaseOrderId("");
    setPoMode(PO_MODE_SELECT);
    setPoError("");
    setTripSuccess(null);
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
      if (createdId) {
        handleProgramChange(createdId);
      }
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
      } else {
        try {
          const refreshed = await fetchPurchaseOrdersOnly(customerId, {
            programId: programId || undefined,
            unprogrammed: !programId,
          });
          setPurchaseOrders(refreshed);
        } catch {
          // Keep local list as-is.
        }
      }

      setPoMode(PO_MODE_SELECT);
      setPoForm({ ...EMPTY_PO_FORM, date: todayIso() });
      setPoAttachments([]);
      setTripSuccess(null);
    } catch {
      setPoError("Network error. Please try again.");
    } finally {
      setCreatingPo(false);
    }
  };

  const updateTripField = (key, value) => {
    setTripForm((current) => ({ ...current, [key]: value }));
  };

  const updateReportDate = (value) => {
    setTripForm((current) => ({
      ...current,
      report_date: value,
      trip_start: tripStartTouched ? current.trip_start : value,
      trip_end: tripEndTouched ? current.trip_end : value,
    }));
  };

  const handleSubmitTrip = async (event) => {
    event.preventDefault();
    if (!purchaseOrderId || submittingTrip) return;

    const tripReportNo = tripForm.trip_report_no.trim();
    const reportDate = tripForm.report_date.trim();
    const tripStart = tripForm.trip_start.trim();
    const tripEnd = tripForm.trip_end.trim();
    const driver = tripForm.driver.trim();
    const destinations = tripForm.destinations.trim();
    const amountValue = tripForm.amount.trim();

    if (!tripReportNo) {
      setTripError("Trip report no is required.");
      return;
    }
    if (!reportDate) {
      setTripError("Report date is required.");
      return;
    }
    if (!tripStart) {
      setTripError("Trip start is required.");
      return;
    }
    if (!tripEnd) {
      setTripError("Trip end is required.");
      return;
    }
    if (tripEnd < tripStart) {
      setTripError("Trip end must be on or after trip start.");
      return;
    }
    if (!driver) {
      setTripError("Driver is required.");
      return;
    }
    if (!destinations) {
      setTripError("Destinations is required.");
      return;
    }
    const amount = Number(amountValue);
    if (!Number.isInteger(amount) || amount < 0) {
      setTripError("Amount must be a whole number of at least 0.");
      return;
    }

    setTripError("");
    setTripSuccess(null);
    setSubmittingTrip(true);

    try {
      const body = new FormData();
      body.append("trip_report_no", tripReportNo);
      body.append("report_date", reportDate);
      body.append("trip_start", tripStart);
      body.append("trip_end", tripEnd);
      body.append("driver", driver);
      body.append("destinations", destinations);
      body.append("amount", String(amount));
      if (tripImage) {
        body.append("trip_report_image", tripImage);
      }

      const response = await fetch(
        `/api/v1/purchase-orders/${encodeURIComponent(purchaseOrderId)}/trip-reports`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          credentials: "include",
          body,
        },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setTripError(
          firstErrorMessage(data, [
            "trip_report_no",
            "report_date",
            "trip_start",
            "trip_end",
            "driver",
            "destinations",
            "amount",
            "trip_report_image",
          ]) || "Failed to create trip report.",
        );
        return;
      }

      const poHref =
        customerId && purchaseOrderId
          ? `/dashboard/customer/${encodeURIComponent(customerId)}/purchase-order/${encodeURIComponent(purchaseOrderId)}`
          : null;

      setTripForm({
        ...EMPTY_TRIP_FORM,
        report_date: todayIso(),
        trip_start: todayIso(),
        trip_end: todayIso(),
      });
      setTripImage(null);
      setTripUploadKey((key) => key + 1);
      setTripStartTouched(false);
      setTripEndTouched(false);
      setTripSuccess({
        message: "Trip report created successfully.",
        poHref,
        poLabel: selectedPo?.poNumber || purchaseOrderId,
      });
    } catch {
      setTripError("Network error. Please try again.");
    } finally {
      setSubmittingTrip(false);
    }
  };

  const busy =
    creatingProgram || creatingPo || submittingTrip || contextLoading;

  return (
    <div className="min-w-0 w-full space-y-6 lg:pr-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
          Add Trip Report
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Select a customer, optional program, and purchase order, then log a
          trip report.
        </p>
      </div>

      <SectionCard
        step="1"
        title="Customer"
        description="Choose the customer this trip report belongs to."
      >
        {customersLoading ? (
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
                onChange={(event) => handleCustomerChange(event.target.value)}
                className={inputClass}
                required
              >
                <option value="">Select a customer…</option>
                {filteredCustomers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name || customer.id}
                  </option>
                ))}
              </select>
              {filteredCustomers.length === 0 ? (
                <p className="mt-2 text-xs text-zinc-500">
                  No customers match this search.
                </p>
              ) : null}
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard
        step="2"
        title="Program"
        description="Optional. Leave empty for unprogrammed purchase orders, or create a new program."
        disabled={!customerId}
      >
        {!customerId ? (
          <p className="text-sm text-zinc-500">Select a customer first.</p>
        ) : (
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
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
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
                      placeholder="e.g. Infrastructure Support 2026"
                    />
                  </div>
                  <div className="sm:col-span-2">
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
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </SectionCard>

      <SectionCard
        step="3"
        title="Purchase order"
        description="Select an existing purchase order or create a new one."
        disabled={!customerId}
      >
        {!customerId ? (
          <p className="text-sm text-zinc-500">Select a customer first.</p>
        ) : (
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
                    setTripSuccess(null);
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
                      maxLength={255}
                      className={inputClass}
                      placeholder="e.g. PO-1001"
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
                      placeholder="0"
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
                      maxLength={255}
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
                        accept={ATTACHMENT_ACCEPT}
                        existingFiles={poAttachments}
                        onFilesChange={setPoAttachments}
                        disabled={creatingPo}
                      />
                    </div>
                  </div>
                </div>
                {programId ? (
                  <p className="text-xs text-zinc-500">
                    New PO will be linked to the selected program.
                  </p>
                ) : (
                  <p className="text-xs text-zinc-500">
                    New PO will be created without a program.
                  </p>
                )}
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
        )}
      </SectionCard>

      <SectionCard
        step="4"
        title="Trip report"
        description="Fill in the trip details and submit."
        disabled={!purchaseOrderId}
      >
        {!purchaseOrderId ? (
          <p className="text-sm text-zinc-500">
            Select or create a purchase order first.
          </p>
        ) : (
          <form onSubmit={handleSubmitTrip} className="space-y-4">
            {selectedPo ? (
              <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                Logging against PO{" "}
                <span className="font-semibold">
                  {selectedPo.poNumber || selectedPo.id}
                </span>
                {selectedCustomer?.name
                  ? ` · ${selectedCustomer.name}`
                  : null}
              </p>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="trip-report-no" className={labelClass}>
                  Trip report no
                </label>
                <input
                  id="trip-report-no"
                  type="text"
                  value={tripForm.trip_report_no}
                  onChange={(event) =>
                    updateTripField("trip_report_no", event.target.value)
                  }
                  disabled={submittingTrip}
                  required
                  maxLength={255}
                  className={inputClass}
                  placeholder="e.g. TR-001"
                />
              </div>
              <div>
                <label htmlFor="report-date" className={labelClass}>
                  Report date
                </label>
                <input
                  id="report-date"
                  type="date"
                  value={tripForm.report_date}
                  onChange={(event) => updateReportDate(event.target.value)}
                  disabled={submittingTrip}
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="trip-start" className={labelClass}>
                  Trip start
                </label>
                <input
                  id="trip-start"
                  type="date"
                  value={tripForm.trip_start}
                  onChange={(event) => {
                    setTripStartTouched(true);
                    updateTripField("trip_start", event.target.value);
                  }}
                  disabled={submittingTrip}
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="trip-end" className={labelClass}>
                  Trip end
                </label>
                <input
                  id="trip-end"
                  type="date"
                  value={tripForm.trip_end}
                  onChange={(event) => {
                    setTripEndTouched(true);
                    updateTripField("trip_end", event.target.value);
                  }}
                  disabled={submittingTrip}
                  required
                  min={tripForm.trip_start || undefined}
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="driver" className={labelClass}>
                  Driver
                </label>
                <div className="mt-1">
                  <DriverAutocomplete
                    id="driver"
                    value={tripForm.driver}
                    onChange={(nextValue) =>
                      updateTripField("driver", nextValue)
                    }
                    disabled={submittingTrip}
                    required
                    placeholder="e.g. Juan Dela Cruz"
                  />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="destinations" className={labelClass}>
                  Destinations
                </label>
                <textarea
                  id="destinations"
                  value={tripForm.destinations}
                  onChange={(event) =>
                    updateTripField("destinations", event.target.value)
                  }
                  disabled={submittingTrip}
                  rows={2}
                  required
                  className={inputClass}
                  placeholder="e.g. Manila to Quezon City"
                />
              </div>
              <div>
                <label htmlFor="trip-amount" className={labelClass}>
                  Amount
                </label>
                <input
                  id="trip-amount"
                  type="number"
                  min="0"
                  step="1"
                  value={tripForm.amount}
                  onChange={(event) =>
                    updateTripField("amount", event.target.value)
                  }
                  disabled={submittingTrip}
                  required
                  className={inputClass}
                  placeholder="0"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="trip-report-image" className={labelClass}>
                  Attachment{" "}
                  <span className="font-normal text-zinc-400">(optional)</span>
                </label>
                <div className="mt-1">
                  <FileUploadWithCamera
                    key={tripUploadKey}
                    id="trip-report-image"
                    accept={ATTACHMENT_ACCEPT}
                    onFilesChange={(files) => setTripImage(files[0] ?? null)}
                    disabled={submittingTrip}
                  />
                </div>
              </div>
            </div>

            {tripError ? (
              <p className="text-sm text-red-600">{tripError}</p>
            ) : null}
            {tripSuccess ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                <p>{tripSuccess.message}</p>
                {tripSuccess.poHref ? (
                  <p className="mt-1">
                    <Link
                      href={tripSuccess.poHref}
                      className="font-medium underline underline-offset-2"
                    >
                      View purchase order {tripSuccess.poLabel}
                    </Link>
                  </p>
                ) : null}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={submittingTrip}
              className="rounded-lg bg-red-400 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-60"
            >
              {submittingTrip ? "Creating…" : "Create trip report"}
            </button>
          </form>
        )}
      </SectionCard>
    </div>
  );
}
