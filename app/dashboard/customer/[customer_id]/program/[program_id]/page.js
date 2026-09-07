import Link from "next/link";
import { cookies } from "next/headers";
import ProgramActions from "../../ProgramActions";

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

function normalizeProgram(payload) {
  const record = payload?.data ?? payload?.program ?? payload;
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

  const customerRelationship =
    record?.relationships?.customer?.data ??
    attrs?.relationships?.customer?.data ??
    null;
  const customerAttrs =
    customerRelationship?.attributes ??
    payload?.included?.find?.(
      (item) =>
        String(item?.id) === String(customerRelationship?.id) &&
        (item?.type === "customers" || item?.type === "customer"),
    )?.attributes ??
    {};

  return {
    id: String(pick(["id", "program_id", "programId"]) || ""),
    name: String(pick(["name", "program_name", "programName"]) || ""),
    description: String(pick(["description"]) || ""),
    createdAt: String(pick(["created_at", "createdAt"]) || ""),
    customerId: String(
      pick(["customer_id", "customerId"]) || customerRelationship?.id || "",
    ),
    customerName: String(
      readField(customerAttrs, ["name", "customer_name", "customerName"]) || "",
    ),
    purchaseOrderCount: pickNumber([
      "purchase_order_count",
      "purchaseOrderCount",
    ]),
    purchaseOrderTotal: pickNumber([
      "purchase_order_total",
      "purchaseOrderTotal",
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

      const statusRaw = String(pick(["status"]) || "pending").toLowerCase();
      const status = statusRaw === "ok" ? "ok" : "pending";

      return {
        id: String(pick(["id", "purchase_order_id", "purchaseOrderId"]) || ""),
        poNumber: String(pick(["po_number", "poNumber"]) || ""),
        date: String(pick(["date"]) || ""),
        amount: Number.isFinite(amount) ? amount : null,
        requestPerson: String(
          pick(["request_person", "requestPerson"]) || "",
        ),
        description: String(pick(["description"]) || ""),
        status,
      };
    })
    .filter((item) => item.id);
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

export default async function ProgramDetailPage({ params }) {
  const resolvedParams = await params;
  const customerId = resolvedParams?.customer_id;
  const programId = resolvedParams?.program_id;

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

  let program = null;
  let error = "";
  let purchaseOrders = [];
  let purchaseOrdersError = "";

  if (!programId) {
    error = "Program ID was not provided.";
  } else {
    const poQuery = new URLSearchParams({
      program_id: programId,
      per_page: "100",
    });
    if (customerId) {
      poQuery.set("customer_id", customerId);
    }

    const [programResult, poResult] = await Promise.all([
      fetch(`${baseUrl}/api/v1/programs/${encodeURIComponent(programId)}`, {
        headers: fetchHeaders,
        cache: "no-store",
      })
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));
          return { res, data };
        })
        .catch(() => null),
      fetch(`${baseUrl}/api/v1/purchase-orders?${poQuery.toString()}`, {
        headers: fetchHeaders,
        cache: "no-store",
      })
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));
          return { res, data };
        })
        .catch(() => null),
    ]);

    if (!programResult) {
      error = "Could not reach the program details endpoint.";
    } else if (!programResult.res.ok) {
      error =
        programResult.data?.error ||
        programResult.data?.message ||
        "Failed to load program details.";
    } else {
      program = normalizeProgram(programResult.data);
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
  }

  const resolvedCustomerId = customerId || program?.customerId || "";
  const backHref = resolvedCustomerId
    ? `/dashboard/customer/${encodeURIComponent(resolvedCustomerId)}`
    : "/dashboard/customer";
  const displayName = program?.name || "Program";
  const purchaseOrderCount =
    program?.purchaseOrderCount != null
      ? program.purchaseOrderCount
      : purchaseOrdersError
        ? null
        : purchaseOrders.length;
  const purchaseOrderTotal =
    program?.purchaseOrderTotal != null
      ? program.purchaseOrderTotal
      : purchaseOrdersError
        ? null
        : purchaseOrders.reduce(
            (sum, po) =>
              sum + (typeof po.amount === "number" ? po.amount : 0),
            0,
          );

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
                href={backHref}
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
                Back to Customer
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
                      d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M8 7h8M8 11h6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-red-100/80">
                    Program
                  </p>
                  <h1 className="mt-1 break-words text-2xl font-bold tracking-tight sm:text-3xl">
                    {displayName}
                  </h1>
                  {program?.customerName ? (
                    <p className="mt-1 text-sm text-red-50/95">
                      {program.customerName}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-red-50/80">
                      Customer program
                    </p>
                  )}
                </div>
              </div>
            </div>

            {program ? (
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
                <ProgramActions
                  customerId={resolvedCustomerId}
                  program={program}
                  redirectToAfterDelete={backHref}
                />
              </div>
            ) : null}
          </div>

          {error ? (
            <p className="relative mt-5 rounded-lg border border-red-300/40 bg-red-500/20 px-3 py-2 text-sm text-red-50">
              {error}
            </p>
          ) : null}
        </div>

        {!error && program ? (
          <div className="grid gap-px bg-zinc-200 sm:grid-cols-2 lg:grid-cols-3">
            <div className="bg-white px-4 py-5 sm:px-6">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Purchase Orders
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
                {purchaseOrderCount == null
                  ? "—"
                  : purchaseOrderCount.toLocaleString()}
              </p>
            </div>
            <div className="bg-white px-4 py-5 sm:px-6">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                PO Total
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
                {formatPhp(purchaseOrderTotal)}
              </p>
            </div>
            <div className="bg-white px-4 py-5 sm:px-6">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Created
              </p>
              <p className="mt-2 break-words text-lg font-semibold text-zinc-900">
                {formatDate(program.createdAt)}
              </p>
            </div>
          </div>
        ) : null}

        {!error && program?.description ? (
          <div className="border-t border-zinc-100 bg-zinc-50/80 px-6 py-4 sm:px-8">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Description
            </p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-700">
              {program.description}
            </p>
          </div>
        ) : null}
      </header>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-zinc-100 px-4 py-5 sm:px-6">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
              Purchase Orders
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Purchase orders linked to this program.
            </p>
          </div>
          {!purchaseOrdersError && purchaseOrders.length > 0 ? (
            <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
              {purchaseOrders.length} PO
              {purchaseOrders.length === 1 ? "" : "s"} ·{" "}
              {formatPhp(
                purchaseOrders.reduce(
                  (sum, po) =>
                    sum + (typeof po.amount === "number" ? po.amount : 0),
                  0,
                ),
              )}
            </div>
          ) : null}
        </div>

        <div className="px-4 py-5 sm:px-6">
          {purchaseOrdersError ? (
            <p className="text-sm text-red-600">{purchaseOrdersError}</p>
          ) : purchaseOrders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-6 py-10 text-center">
              <p className="text-sm font-medium text-zinc-700">
                No Purchase Orders Yet
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                Link a purchase order to this program from the customer page.
              </p>
            </div>
          ) : (
            <div
              className="overflow-x-auto overscroll-x-contain"
              role="region"
              aria-label="Program Purchase Orders Table"
              tabIndex={0}
            >
              <table className="min-w-[56rem] text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                    <th className="pb-3 pr-6">PO Number</th>
                    <th className="pb-3 pr-6">Date</th>
                    <th className="pb-3 pr-6 text-right">Amount</th>
                    <th className="pb-3 pr-6">Status</th>
                    <th className="pb-3 pr-6">Request Person</th>
                    <th className="pb-3 pr-6">Description</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {purchaseOrders.map((po) => {
                    const purchaseOrderHref =
                      resolvedCustomerId && po.id
                        ? `/dashboard/customer/${encodeURIComponent(resolvedCustomerId)}/purchase-order/${encodeURIComponent(po.id)}`
                        : "";

                    return (
                      <tr
                        key={po.id}
                        className="transition hover:bg-zinc-50/80"
                      >
                        <td className="py-3.5 pr-6 font-medium text-zinc-900">
                          {purchaseOrderHref ? (
                            <Link
                              href={purchaseOrderHref}
                              className="underline-offset-2 transition hover:text-red-700 hover:underline"
                            >
                              {po.poNumber || "View Purchase Order"}
                            </Link>
                          ) : (
                            po.poNumber || "—"
                          )}
                        </td>
                        <td className="py-3.5 pr-6 text-zinc-700">
                          {formatDate(po.date)}
                        </td>
                        <td className="py-3.5 pr-6 text-right tabular-nums text-zinc-700">
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
                          {purchaseOrderHref ? (
                            <Link
                              href={purchaseOrderHref}
                              className="text-xs font-medium text-red-700 transition hover:text-red-800"
                            >
                              View
                            </Link>
                          ) : (
                            <span className="text-xs text-zinc-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
