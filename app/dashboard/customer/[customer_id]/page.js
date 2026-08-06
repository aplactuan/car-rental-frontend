import Link from "next/link";
import { cookies } from "next/headers";
import AddProgramButton from "./AddProgramButton";
import AddPurchaseOrderButton from "./AddPurchaseOrderButton";

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

function normalizeCustomer(payload) {
  const record = payload?.data ?? payload?.customer ?? payload;
  const attrs = record?.attributes ?? {};
  const pick = (keys) => {
    const fromAttrs = readField(attrs, keys);
    if (fromAttrs !== "") return fromAttrs;
    return readField(record, keys);
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

      return {
        id: String(pick(["id", "purchase_order_id", "purchaseOrderId"]) || ""),
        poNumber: String(pick(["po_number", "poNumber"]) || ""),
        date: String(pick(["date"]) || ""),
        amount: Number.isFinite(amount) ? amount : null,
        requestPerson: String(
          pick(["request_person", "requestPerson"]) || "",
        ),
        description: String(pick(["description"]) || ""),
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

  return list
    .map((record) => {
      const attrs = record?.attributes ?? {};
      const pick = (keys) =>
        readField(attrs, keys) || readField(record, keys);

      return {
        id: String(pick(["id", "program_id", "programId"]) || ""),
        name: String(pick(["name"]) || ""),
        description: String(pick(["description"]) || ""),
        createdAt: String(pick(["created_at", "createdAt"]) || ""),
      };
    })
    .filter((item) => item.id);
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

function PurchaseOrderStatusBadge({ status }) {
  const isOk = status === "ok";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isOk
          ? "bg-emerald-50 text-emerald-800"
          : "bg-amber-50 text-amber-800"
      }`}
    >
      {isOk ? "OK" : "Pending"}
    </span>
  );
}

function SummaryCell({ label, children }) {
  return (
    <div className="bg-white px-6 py-5">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <div className="mt-2 min-w-0">{children}</div>
    </div>
  );
}

function SectionEmptyState({ title, description }) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-6 py-10 text-center">
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

  if (customerId) {
    try {
      const res = await fetch(`${baseUrl}/api/v1/customers/${customerId}`, {
        headers: fetchHeaders,
        cache: "no-store",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        error =
          data?.error || data?.message || "Failed to load customer details.";
      } else {
        customer = normalizeCustomer(data);
      }
    } catch {
      error = "Could not reach the customer details endpoint.";
    }

    try {
      const poRes = await fetch(
        `${baseUrl}/api/v1/purchase-orders?customer_id=${encodeURIComponent(customerId)}&per_page=100`,
        {
          headers: fetchHeaders,
          cache: "no-store",
        },
      );
      const poData = await poRes.json().catch(() => ({}));

      if (!poRes.ok) {
        purchaseOrdersError =
          poData?.error ||
          poData?.message ||
          "Failed to load purchase orders.";
      } else {
        purchaseOrders = normalizePurchaseOrders(poData);
      }
    } catch {
      purchaseOrdersError = "Could not reach the purchase orders endpoint.";
    }

    try {
      const programsRes = await fetch(
        `${baseUrl}/api/v1/customers/${encodeURIComponent(customerId)}/programs`,
        {
          headers: fetchHeaders,
          cache: "no-store",
        },
      );
      const programsData = await programsRes.json().catch(() => ({}));

      if (!programsRes.ok) {
        programsError =
          programsData?.error ||
          programsData?.message ||
          "Failed to load programs.";
      } else {
        programs = normalizePrograms(programsData);
      }
    } catch {
      programsError = "Could not reach the programs endpoint.";
    }
  } else {
    error = "Customer ID was not provided.";
  }

  const displayName = customer?.name || "Customer";
  const purchaseOrderTotal = purchaseOrders.reduce(
    (sum, po) => sum + (typeof po.amount === "number" ? po.amount : 0),
    0,
  );
  const pendingPurchaseOrders = purchaseOrders.filter(
    (po) => po.status !== "ok",
  ).length;

  return (
    <div className="w-full space-y-6 pr-8">
      <header className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm ring-1 ring-zinc-100">
        <div className="relative bg-gradient-to-br from-teal-800 via-emerald-700 to-zinc-900 px-6 py-6 text-white sm:px-8">
          <div
            className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-16 left-1/3 h-32 w-32 rounded-full bg-emerald-300/20 blur-2xl"
            aria-hidden
          />

          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <Link
                href="/dashboard/customer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-100/90 transition hover:text-white"
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
                Back to customer list
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
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-100/80">
                    Customer
                  </p>
                  <h1 className="mt-1 truncate text-2xl font-bold tracking-tight sm:text-3xl">
                    {displayName}
                  </h1>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {customer?.type ? (
                      <span className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium text-emerald-50 ring-1 ring-white/20">
                        {customer.type}
                      </span>
                    ) : null}
                    {customerId ? (
                      <p className="truncate text-xs text-emerald-100/80">
                        ID{" "}
                        <span className="font-medium text-emerald-50">
                          {customerId}
                        </span>
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            {customerId ? (
              <div className="flex flex-wrap items-center gap-2">
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
            <SummaryCell label="Contact person">
              <p className="truncate text-lg font-semibold text-zinc-900">
                {customer.contact_person || "—"}
              </p>
            </SummaryCell>
            <SummaryCell label="Contact mobile">
              <p className="truncate text-lg font-semibold text-zinc-900">
                {customer.contact_mobile_number || "—"}
              </p>
            </SummaryCell>
            <SummaryCell label="Programs">
              <p className="text-2xl font-semibold tracking-tight text-zinc-900">
                {programsError ? "—" : programs.length}
              </p>
            </SummaryCell>
            <SummaryCell label="Purchase orders">
              <p className="text-2xl font-semibold tracking-tight text-zinc-900">
                {purchaseOrdersError ? "—" : purchaseOrders.length}
              </p>
              {!purchaseOrdersError && purchaseOrders.length > 0 ? (
                <p className="mt-1 text-xs text-zinc-500">
                  {formatPhp(purchaseOrderTotal)}
                  {pendingPurchaseOrders > 0
                    ? ` · ${pendingPurchaseOrders} pending`
                    : ""}
                </p>
              ) : null}
            </SummaryCell>
          </div>
        ) : null}
      </header>

      {!error && customer ? (
        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 px-6 py-5">
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
              Profile details
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Contact information and record metadata for this customer.
            </p>
          </div>

          <div className="grid gap-px bg-zinc-100 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: "Email", value: customer.email },
              { label: "Phone number", value: customer.phone_number },
              { label: "Contact email", value: customer.contact_email },
              { label: "Address", value: customer.address },
              { label: "Created at", value: formatDate(customer.created_at) },
              { label: "Updated at", value: formatDate(customer.updated_at) },
            ].map((item) => (
              <div key={item.label} className="bg-white px-6 py-5">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  {item.label}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-zinc-900">
                  {item.value || "—"}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {!error && !customer ? (
        <section className="rounded-2xl border border-zinc-200 bg-white px-6 py-10 shadow-sm">
          <p className="text-sm text-zinc-500">No customer data returned.</p>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-zinc-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
              Programs
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Programs linked to this customer.
            </p>
          </div>
          {!programsError && programs.length > 0 ? (
            <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
              {programs.length} program{programs.length === 1 ? "" : "s"}
            </div>
          ) : null}
        </div>

        <div className="px-6 py-5">
          {programsError ? (
            <p className="text-sm text-red-600">{programsError}</p>
          ) : programs.length === 0 ? (
            <SectionEmptyState
              title="No programs yet"
              description="Add the first program for this customer."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                    <th className="pb-3 pr-6">Name</th>
                    <th className="pb-3 pr-6">Description</th>
                    <th className="pb-3">Created at</th>
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
                      <td className="py-3.5 text-zinc-700">
                        {formatDate(program.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-zinc-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
              Purchase orders
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Purchase orders linked to this customer.
            </p>
          </div>
          {!purchaseOrdersError && purchaseOrders.length > 0 ? (
            <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
              {purchaseOrders.length} order
              {purchaseOrders.length === 1 ? "" : "s"}
            </div>
          ) : null}
        </div>

        <div className="px-6 py-5">
          {purchaseOrdersError ? (
            <p className="text-sm text-red-600">{purchaseOrdersError}</p>
          ) : purchaseOrders.length === 0 ? (
            <SectionEmptyState
              title="No purchase orders yet"
              description="Add the first purchase order for this customer."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                    <th className="pb-3 pr-6">PO number</th>
                    <th className="pb-3 pr-6">Date</th>
                    <th className="pb-3 pr-6">Amount</th>
                    <th className="pb-3 pr-6">Status</th>
                    <th className="pb-3 pr-6">Request person</th>
                    <th className="pb-3 pr-6">Description</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {purchaseOrders.map((po) => (
                    <tr key={po.id} className="transition hover:bg-zinc-50/80">
                      <td className="py-3.5 pr-6 font-medium text-zinc-900">
                        {po.poNumber || "—"}
                      </td>
                      <td className="py-3.5 pr-6 text-zinc-700">
                        {formatDate(po.date)}
                      </td>
                      <td className="py-3.5 pr-6 text-zinc-700">
                        {formatPhp(po.amount)}
                      </td>
                      <td className="py-3.5 pr-6">
                        <PurchaseOrderStatusBadge status={po.status} />
                      </td>
                      <td className="py-3.5 pr-6 text-zinc-700">
                        {po.requestPerson || "—"}
                      </td>
                      <td className="max-w-xs py-3.5 pr-6 text-zinc-700">
                        {po.description || "—"}
                      </td>
                      <td className="py-3.5 text-right">
                        <Link
                          href={`/dashboard/customer/${encodeURIComponent(customerId)}/purchase-order/${encodeURIComponent(po.id)}`}
                          className="text-xs font-medium text-teal-700 transition hover:text-teal-800"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
