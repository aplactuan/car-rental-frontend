import Link from "next/link";
import { cookies } from "next/headers";
import AddProgramButton from "./AddProgramButton";
import AddPurchaseOrderButton from "./AddPurchaseOrderButton";
import ProgramActions from "./ProgramActions";
import PurchaseOrdersSection from "./PurchaseOrdersSection";

function readField(source, keys) {
  if (!source || typeof source !== "object") return "";

  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }

  const normalizedMap = Object.fromEntries(
    Object.entries(source).map(([k, v]) => [
      k.toLowerCase().replace(/[_\s]/g, ""),
      v,
    ]),
  );

  for (const key of keys) {
    const normalizedKey = key.toLowerCase().replace(/[_\s]/g, "");
    const value = normalizedMap[normalizedKey];
    if (value !== undefined && value !== null && value !== "") return value;
  }

  return "";
}

function readNumber(source, keys) {
  if (!source || typeof source !== "object") return null;

  const tryValue = (value) => {
    if (value === undefined || value === null || value === "") return null;
    const number = typeof value === "number" ? value : Number(value);
    return Number.isFinite(number) ? number : null;
  };

  for (const key of keys) {
    const number = tryValue(source[key]);
    if (number !== null) return number;
  }

  const normalizedMap = Object.fromEntries(
    Object.entries(source).map(([k, v]) => [
      k.toLowerCase().replace(/[_\s]/g, ""),
      v,
    ]),
  );

  for (const key of keys) {
    const normalizedKey = key.toLowerCase().replace(/[_\s]/g, "");
    const number = tryValue(normalizedMap[normalizedKey]);
    if (number !== null) return number;
  }

  return null;
}

function normalizeCustomer(payload) {
  const record = payload?.data ?? payload?.customer ?? payload;
  const attrs = record?.attributes ?? {};
  const pick = (keys) => {
    const fromAttrs = readField(attrs, keys);
    if (fromAttrs !== "") return fromAttrs;
    return readField(record, keys);
  };
  const pickNumber = (keys) => {
    const fromAttrs = readNumber(attrs, keys);
    if (fromAttrs !== null) return fromAttrs;
    return readNumber(record, keys);
  };

  return {
    id: pick(["id", "customer_id", "customerId"]),
    name: pick(["name", "customer_name", "customerName"]),
    type: pick(["type", "customer_type", "customerType"]),
    email: pick(["email", "email_address", "emailAddress"]),
    phone_number: pick(["phone_number", "phoneNumber"]),
    address: pick(["address", "full_address", "fullAddress"]),
    contact_person: pick(["contact_person", "contactPerson"]),
    contact_mobile_number: pick([
      "contact_mobile_number",
      "contactMobileNumber",
    ]),
    contact_email: pick(["contact_email", "contactEmail"]),
    created_at: pick(["created_at", "createdAt"]),
    updated_at: pick(["updated_at", "updatedAt"]),
    purchaseOrderCount: pickNumber([
      "purchase_order_count",
      "purchaseOrderCount",
    ]),
    purchaseOrderTotal: pickNumber([
      "purchase_order_total",
      "purchaseOrderTotal",
    ]),
    unprogrammedPurchaseOrderCount: pickNumber([
      "unprogrammed_purchase_order_count",
      "unprogrammedPurchaseOrderCount",
    ]),
    unprogrammedPurchaseOrderTotal: pickNumber([
      "unprogrammed_purchase_order_total",
      "unprogrammedPurchaseOrderTotal",
    ]),
    programCount: pickNumber(["program_count", "programCount"]),
    tripReportCount: pickNumber(["trip_report_count", "tripReportCount"]),
    unattachedTripReportCount: pickNumber([
      "unattached_trip_report_count",
      "unattachedTripReportCount",
    ]),
    unpaidInvoiceTotal: pickNumber([
      "unpaid_invoice_total",
      "unpaidInvoiceTotal",
    ]),
  };
}

function normalizePurchaseOrders(payload) {
  const raw =
    payload?.data ?? payload?.purchase_orders ?? payload?.items ?? payload;
  const list = Array.isArray(raw) ? raw : [];

  return list
    .map((record) => {
      const attrs = record?.attributes ?? {};
      const pick = (keys) =>
        readField(attrs, keys) || readField(record, keys);
      const amountRaw = attrs?.amount ?? record?.amount;
      const amount =
        typeof amountRaw === "number"
          ? amountRaw
          : amountRaw !== undefined && amountRaw !== null && amountRaw !== ""
            ? Number(amountRaw)
            : null;

      const programRelationship =
        record?.relationships?.program?.data ??
        attrs?.relationships?.program?.data ??
        null;
      const programAttrs = programRelationship?.attributes ?? {};

      return {
        id: String(pick(["id", "purchase_order_id", "purchaseOrderId"]) || ""),
        poNumber: String(pick(["po_number", "poNumber"]) || ""),
        date: String(pick(["date"]) || ""),
        amount: Number.isFinite(amount) ? amount : null,
        requestPerson: String(
          pick(["request_person", "requestPerson"]) || "",
        ),
        description: String(pick(["description"]) || ""),
        programId: String(
          pick(["program_id", "programId"]) || programRelationship?.id || "",
        ),
        programName: String(
          readField(programAttrs, ["name", "program_name", "programName"]) ||
            pick(["program_name", "programName"]) ||
            "",
        ),
        status:
          String(pick(["status"]) || "pending").toLowerCase() === "ok"
            ? "ok"
            : "pending",
      };
    })
    .filter((item) => item.id);
}

function normalizePrograms(payload) {
  const raw = payload?.data ?? payload?.programs ?? payload?.items ?? payload;
  const list = Array.isArray(raw) ? raw : [];

  const programs = list
    .map((record) => {
      const attrs = record?.attributes ?? {};
      const pick = (keys) =>
        readField(attrs, keys) || readField(record, keys);
      const pickNumber = (keys) => {
        const fromAttrs = readNumber(attrs, keys);
        if (fromAttrs !== null) return fromAttrs;
        return readNumber(record, keys);
      };

      return {
        id: String(pick(["id", "program_id", "programId"]) || ""),
        name: String(pick(["name"]) || ""),
        description: String(pick(["description"]) || ""),
        createdAt: String(pick(["created_at", "createdAt"]) || ""),
        purchaseOrderCount:
          pickNumber(["purchase_order_count", "purchaseOrderCount"]) ?? 0,
        purchaseOrderTotal:
          pickNumber(["purchase_order_total", "purchaseOrderTotal"]) ?? 0,
      };
    })
    .filter((item) => item.id);

  const meta = payload?.meta ?? {};
  const unprogrammedPurchaseOrderCount =
    readNumber(meta, [
      "unprogrammed_purchase_order_count",
      "unprogrammedPurchaseOrderCount",
    ]) ?? 0;
  const unprogrammedPurchaseOrderTotal =
    readNumber(meta, [
      "unprogrammed_purchase_order_total",
      "unprogrammedPurchaseOrderTotal",
    ]) ?? 0;

  return {
    programs,
    unprogrammedPurchaseOrderCount,
    unprogrammedPurchaseOrderTotal,
  };
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

function SummaryCell({ label, children }) {
  return (
    <div className="bg-white px-4 py-5 sm:px-6">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <div className="mt-2 min-w-0">{children}</div>
    </div>
  );
}

function SectionEmptyState({ title, description }) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-10 text-center sm:px-6">
      <p className="text-sm font-medium text-zinc-700">{title}</p>
      <p className="mt-1 text-sm text-zinc-500">{description}</p>
    </div>
  );
}

export default async function CustomerDetailPage({ params }) {
  const resolvedParams = await params;
  const customerId = resolvedParams?.customer_id;

  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");
  const fetchHeaders = cookieHeader ? { Cookie: cookieHeader } : {};

  let customer = null;
  let error = "";
  let purchaseOrders = [];
  let purchaseOrdersError = "";
  let programs = [];
  let programsError = "";
  let programsUnprogrammedCount = 0;
  let programsUnprogrammedTotal = 0;

  if (customerId) {
    const [customerResult, poResult, programsResult] = await Promise.all([
      fetch(`${baseUrl}/api/v1/customers/${customerId}`, {
        headers: fetchHeaders,
        cache: "no-store",
      })
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));
          return { res, data };
        })
        .catch(() => null),
      fetch(
        `${baseUrl}/api/v1/purchase-orders?customer_id=${encodeURIComponent(customerId)}&per_page=100`,
        {
          headers: fetchHeaders,
          cache: "no-store",
        },
      )
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));
          return { res, data };
        })
        .catch(() => null),
      fetch(
        `${baseUrl}/api/v1/customers/${encodeURIComponent(customerId)}/programs`,
        {
          headers: fetchHeaders,
          cache: "no-store",
        },
      )
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));
          return { res, data };
        })
        .catch(() => null),
    ]);

    if (!customerResult) {
      error = "Could not reach the customer details endpoint.";
    } else if (!customerResult.res.ok) {
      error =
        customerResult.data?.error ||
        customerResult.data?.message ||
        "Failed to load customer details.";
    } else {
      customer = normalizeCustomer(customerResult.data);
    }

    if (!poResult) {
      purchaseOrdersError = "Could not reach the purchase orders endpoint.";
    } else if (!poResult.res.ok) {
      purchaseOrdersError =
        poResult.data?.error ||
        poResult.data?.message ||
        "Failed to load purchase orders.";
    } else {
      purchaseOrders = normalizePurchaseOrders(poResult.data);
    }

    if (!programsResult) {
      programsError = "Could not reach the programs endpoint.";
    } else if (!programsResult.res.ok) {
      programsError =
        programsResult.data?.error ||
        programsResult.data?.message ||
        "Failed to load programs.";
    } else {
      const normalizedPrograms = normalizePrograms(programsResult.data);
      programs = normalizedPrograms.programs;
      programsUnprogrammedCount =
        normalizedPrograms.unprogrammedPurchaseOrderCount;
      programsUnprogrammedTotal =
        normalizedPrograms.unprogrammedPurchaseOrderTotal;
    }
  } else {
    error = "Customer ID was not provided.";
  }

  const displayName = customer?.name || "Customer";
  const purchaseOrderCount =
    customer?.purchaseOrderCount != null
      ? customer.purchaseOrderCount
      : purchaseOrdersError
        ? null
        : purchaseOrders.length;
  const purchaseOrderTotal =
    customer?.purchaseOrderTotal != null
      ? customer.purchaseOrderTotal
      : purchaseOrdersError
        ? null
        : purchaseOrders.reduce(
            (sum, po) => sum + (typeof po.amount === "number" ? po.amount : 0),
            0,
          );
  const unprogrammedPurchaseOrderCount =
    customer?.unprogrammedPurchaseOrderCount != null
      ? customer.unprogrammedPurchaseOrderCount
      : programsUnprogrammedCount;
  const unprogrammedPurchaseOrderTotal =
    customer?.unprogrammedPurchaseOrderTotal != null
      ? customer.unprogrammedPurchaseOrderTotal
      : programsUnprogrammedTotal;
  const programCount =
    customer?.programCount != null
      ? customer.programCount
      : programsError
        ? null
        : programs.length;
  const unpaidInvoiceTotal = customer?.unpaidInvoiceTotal ?? null;
  const tripReportCount = customer?.tripReportCount ?? null;
  const unattachedTripReportCount = customer?.unattachedTripReportCount ?? null;

  return (
    <div className="min-w-0 w-full space-y-6 lg:pr-8">
      <header className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm ring-1 ring-zinc-100">
        <div className="relative bg-gradient-to-br from-red-800 via-red-900 to-zinc-900 px-4 py-6 text-white sm:px-8">
          <div
            className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-16 left-1/3 h-32 w-32 rounded-full bg-red-500/20 blur-2xl"
            aria-hidden
          />

          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <Link
                href="/dashboard/customer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-red-100/90 transition hover:text-white"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-4 w-4"
                  aria-hidden
                >
                  <path
                    d="M15 18l-6-6 6-6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Back to Customer List
              </Link>

              <div className="mt-4 flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    className="h-6 w-6"
                    aria-hidden
                  >
                    <path
                      d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="9" cy="7" r="4" />
                    <path
                      d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-red-100/80">
                    Customer
                  </p>
                  <h1 className="mt-1 truncate text-2xl font-bold tracking-tight sm:text-3xl">
                    {displayName}
                  </h1>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {customer?.type ? (
                      <span className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium text-red-50 ring-1 ring-white/20">
                        {customer.type}
                      </span>
                    ) : null}
                    {customerId ? (
                      <p className="truncate text-xs text-red-100/80">
                        ID{" "}
                        <span className="font-medium text-red-50">
                          {customerId}
                        </span>
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            {customerId ? (
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
                <AddProgramButton customerId={customerId} />
                <AddPurchaseOrderButton customerId={customerId} />
              </div>
            ) : null}
          </div>

          {error ? (
            <p className="relative mt-5 rounded-lg border border-red-300/40 bg-red-500/20 px-3 py-2 text-sm text-red-50">
              {error}
            </p>
          ) : null}
        </div>

        {!error && customer ? (
          <div className="grid gap-px bg-zinc-200 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCell label="Purchase Orders">
              <p className="text-2xl font-semibold tracking-tight text-zinc-900">
                {purchaseOrderCount == null
                  ? "—"
                  : purchaseOrderCount.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {purchaseOrderCount == null
                  ? "Unavailable"
                  : purchaseOrderCount === 0
                    ? "No POs yet"
                    : unprogrammedPurchaseOrderCount > 0
                      ? `${unprogrammedPurchaseOrderCount.toLocaleString()} unprogrammed`
                      : "All linked to programs"}
              </p>
            </SummaryCell>
            <SummaryCell label="PO Value">
              <p className="text-2xl font-semibold tracking-tight text-zinc-900">
                {purchaseOrderTotal == null
                  ? "—"
                  : formatPhp(purchaseOrderTotal)}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {programCount == null
                  ? unprogrammedPurchaseOrderTotal > 0
                    ? `${formatPhp(unprogrammedPurchaseOrderTotal)} unprogrammed`
                    : "Sum of PO amounts"
                  : programCount === 0
                    ? unprogrammedPurchaseOrderTotal > 0
                      ? `${formatPhp(unprogrammedPurchaseOrderTotal)} unprogrammed`
                      : "No programs with POs"
                    : `Across ${programCount.toLocaleString()} program${
                        programCount === 1 ? "" : "s"
                      }${
                        unprogrammedPurchaseOrderTotal > 0
                          ? ` · ${formatPhp(unprogrammedPurchaseOrderTotal)} unprogrammed`
                          : ""
                      }`}
              </p>
            </SummaryCell>
            <SummaryCell label="Outstanding">
              <p className="text-2xl font-semibold tracking-tight text-zinc-900">
                {unpaidInvoiceTotal == null
                  ? "—"
                  : formatPhp(unpaidInvoiceTotal)}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {unpaidInvoiceTotal == null
                  ? "Unavailable"
                  : unpaidInvoiceTotal === 0
                    ? "No unpaid invoices"
                    : "Unpaid invoice trip totals"}
              </p>
            </SummaryCell>
            <SummaryCell label="Trip Reports">
              <p className="text-2xl font-semibold tracking-tight text-zinc-900">
                {tripReportCount == null
                  ? "—"
                  : tripReportCount.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {tripReportCount == null
                  ? "Unavailable"
                  : tripReportCount === 0
                    ? "No trip reports yet"
                    : unattachedTripReportCount > 0
                      ? `${unattachedTripReportCount.toLocaleString()} unattached`
                      : "All attached to invoices"}
              </p>
            </SummaryCell>
          </div>
        ) : null}
      </header>

      {!error && customer ? (
        <details className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-4 py-5 marker:content-none sm:px-6 [&::-webkit-details-marker]:hidden">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
                Profile Details
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Contact information and record metadata for this customer.
              </p>
            </div>
            <span
              className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-600 transition group-open:rotate-180"
              aria-hidden
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-4 w-4"
              >
                <path
                  d="M6 9l6 6 6-6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </summary>

          <div className="grid gap-px border-t border-zinc-100 bg-zinc-100 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: "Contact person", value: customer.contact_person },
              {
                label: "Contact mobile",
                value: customer.contact_mobile_number,
              },
              { label: "Contact email", value: customer.contact_email },
              { label: "Email", value: customer.email },
              { label: "Phone number", value: customer.phone_number },
              { label: "Address", value: customer.address },
              { label: "Created at", value: formatDate(customer.created_at) },
              { label: "Updated at", value: formatDate(customer.updated_at) },
              {
                label: "Programs",
                value: programsError ? "—" : String(programs.length),
              },
            ].map((item) => (
              <div key={item.label} className="min-w-0 bg-white px-4 py-5 sm:px-6">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  {item.label}
                </p>
                <p className="mt-2 break-words text-sm leading-relaxed text-zinc-900">
                  {item.value || "—"}
                </p>
              </div>
            ))}
          </div>
        </details>
      ) : null}

      {!error && !customer ? (
        <section className="rounded-2xl border border-zinc-200 bg-white px-6 py-10 shadow-sm">
          <p className="text-sm text-zinc-500">No customer data returned.</p>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-zinc-100 px-4 py-5 sm:px-6">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
              Programs
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Programs linked to this customer.
            </p>
          </div>
          {!programsError && programs.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
                {programs.length} program{programs.length === 1 ? "" : "s"}
              </div>
              {unprogrammedPurchaseOrderCount > 0 ? (
                <div className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
                  {unprogrammedPurchaseOrderCount.toLocaleString()} unprogrammed
                  · {formatPhp(unprogrammedPurchaseOrderTotal)}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="px-4 py-5 sm:px-6">
          {programsError ? (
            <p className="text-sm text-red-600">{programsError}</p>
          ) : programs.length === 0 ? (
            <SectionEmptyState
              title="No Programs Yet"
              description="Add the first program for this customer."
            />
          ) : (
            <div
              className="overflow-x-auto overscroll-x-contain"
              role="region"
              aria-label="Customer Programs Table"
              tabIndex={0}
            >
              <table className="min-w-[44rem] text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                    <th className="pb-3 pr-6">Name</th>
                    <th className="pb-3 pr-6">Description</th>
                    <th className="pb-3 pr-6 text-right">Purchase Orders</th>
                    <th className="pb-3 pr-6 text-right">PO Total</th>
                    <th className="pb-3 pr-6">Created At</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {programs.map((program) => (
                    <tr
                      key={program.id}
                      className="transition hover:bg-zinc-50/80"
                    >
                      <td className="py-3.5 pr-6 font-medium text-zinc-900">
                        {program.name || "—"}
                      </td>
                      <td className="max-w-md py-3.5 pr-6 text-zinc-700">
                        {program.description || "—"}
                      </td>
                      <td className="py-3.5 pr-6 text-right tabular-nums text-zinc-700">
                        {program.purchaseOrderCount.toLocaleString()}
                      </td>
                      <td className="py-3.5 pr-6 text-right tabular-nums text-zinc-700">
                        {formatPhp(program.purchaseOrderTotal)}
                      </td>
                      <td className="py-3.5 pr-6 text-zinc-700">
                        {formatDate(program.createdAt)}
                      </td>
                      <td className="py-3.5 text-right">
                        <ProgramActions
                          customerId={customerId}
                          program={program}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <PurchaseOrdersSection
        customerId={customerId}
        initialPurchaseOrders={purchaseOrders}
        programs={programs}
        initialError={purchaseOrdersError}
      />
    </div>
  );
}
