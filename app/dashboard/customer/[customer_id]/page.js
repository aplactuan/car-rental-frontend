import Link from "next/link";
import { cookies } from "next/headers";
import AddCustomerTransactionButton from "./AddCustomerTransactionButton";

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
    created_at: pick(["created_at", "createdAt"]),
    updated_at: pick(["updated_at", "updatedAt"]),
  };
}

function DetailRow({ label, value }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </div>
      <div className="mt-2 text-sm text-zinc-900">{value || "Not available"}</div>
    </div>
  );
}

function toBillStatusMeta(rawStatus) {
  const status = String(rawStatus ?? "").toLowerCase();

  if (status === "draft") {
    return {
      label: "Draft",
      className: "bg-zinc-100 text-zinc-700",
    };
  }

  if (status === "issued") {
    return {
      label: "Issued",
      className: "bg-blue-100 text-blue-700",
    };
  }

  if (status === "paid") {
    return {
      label: "Paid",
      className: "bg-emerald-100 text-emerald-700",
    };
  }

  if (status === "cancelled") {
    return {
      label: "Cancelled",
      className: "bg-amber-100 text-amber-700",
    };
  }

  return {
    label: "No bill",
    className: "bg-zinc-100 text-zinc-600",
  };
}

function formatIdr(amount) {
  if (typeof amount !== "number" || !Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);

  return parsed.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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

  let customer = null;
  let error = "";
  let transactions = [];
  let transactionsError = "";
  let billByTransactionId = {};
  let billingSummary = {
    noBill: 0,
    draft: 0,
    issued: 0,
    paid: 0,
    cancelled: 0,
  };

  if (customerId) {
    try {
      const res = await fetch(`${baseUrl}/api/v1/customers/${customerId}`, {
        headers: cookieHeader ? { Cookie: cookieHeader } : {},
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
      const txRes = await fetch(
        `${baseUrl}/api/v1/customers/${customerId}/transactions?per_page=15`,
        {
          headers: cookieHeader ? { Cookie: cookieHeader } : {},
          cache: "no-store",
        },
      );
      const txData = await txRes.json().catch(() => ({}));
      if (!txRes.ok) {
        transactionsError =
          txData?.error || txData?.message || "Failed to load transactions.";
      } else {
        const raw =
          txData?.data ?? txData?.transactions ?? txData?.items ?? txData;
        transactions = Array.isArray(raw) ? raw : [];

        const transactionIds = transactions
          .map((tx) => {
            const attrs = tx?.attributes ?? tx ?? {};
            return (
              tx?.id ??
              attrs?.id ??
              attrs?.transaction_id ??
              attrs?.transactionId ??
              null
            );
          })
          .filter(Boolean)
          .map((id) => String(id));

        if (transactionIds.length > 0) {
          const billPairs = await Promise.all(
            transactionIds.map(async (id) => {
              try {
                const billRes = await fetch(
                  `${baseUrl}/api/v1/transactions/${id}/bill`,
                  {
                    headers: cookieHeader ? { Cookie: cookieHeader } : {},
                    cache: "no-store",
                  },
                );

                if (billRes.status === 404) {
                  return [id, null];
                }

                const billData = await billRes.json().catch(() => ({}));
                if (!billRes.ok) return [id, null];

                const source = billData?.data ?? billData ?? {};
                const attrs = source?.attributes ?? source;

                return [
                  id,
                  {
                    status: attrs?.status ?? null,
                    amount: attrs?.amount ?? null,
                    dueAt: attrs?.dueAt ?? attrs?.due_at ?? null,
                  },
                ];
              } catch {
                return [id, null];
              }
            }),
          );

          billByTransactionId = Object.fromEntries(billPairs);

          transactionIds.forEach((id) => {
            const current = billByTransactionId[id];
            const normalizedStatus = String(current?.status ?? "").toLowerCase();
            if (!current) {
              billingSummary.noBill += 1;
              return;
            }
            if (normalizedStatus === "draft") {
              billingSummary.draft += 1;
              return;
            }
            if (normalizedStatus === "issued") {
              billingSummary.issued += 1;
              return;
            }
            if (normalizedStatus === "paid") {
              billingSummary.paid += 1;
              return;
            }
            if (normalizedStatus === "cancelled") {
              billingSummary.cancelled += 1;
              return;
            }
            billingSummary.noBill += 1;
          });
        }
      }
    } catch {
      transactionsError = "Could not reach the transactions endpoint.";
    }
  } else {
    error = "Customer ID was not provided.";
  }

  return (
    <div className="w-full pr-8">
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              href="/dashboard/customer"
              className="text-sm font-medium text-teal-700 transition hover:text-teal-800"
            >
              Back to customer list
            </Link>

            <h1 className="mt-4 text-3xl font-bold tracking-tight">Customer Details</h1>
            <p className="mt-2 text-sm text-zinc-500">
              Customer ID:{" "}
              <span className="font-medium text-zinc-900">{customerId}</span>
            </p>
          </div>
          {customerId ? (
            <AddCustomerTransactionButton customerId={customerId} />
          ) : null}
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        {error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : customer ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <DetailRow label="Name" value={customer.name} />
            <DetailRow label="Type" value={customer.type} />
            <DetailRow label="Email" value={customer.email} />
            <DetailRow label="Phone Number" value={customer.phone_number} />
            <DetailRow label="Address" value={customer.address} />
            <DetailRow label="Created At" value={customer.created_at} />
            <DetailRow label="Updated At" value={customer.updated_at} />
          </div>
        ) : (
          <p className="text-sm text-zinc-500">No customer data returned.</p>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
          Transactions
        </h2>

        {transactionsError ? (
          <p className="mt-4 text-sm text-red-600">{transactionsError}</p>
        ) : transactions.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">No transactions found.</p>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-700">
                No bill: {billingSummary.noBill}
              </div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-700">
                Draft: {billingSummary.draft}
              </div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-700">
                Issued: {billingSummary.issued}
              </div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-700">
                Paid: {billingSummary.paid}
              </div>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-700">
                Cancelled: {billingSummary.cancelled}
              </div>
            </div>

            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                  <th className="pb-3 pr-6">Transaction Name</th>
                  <th className="pb-3 pr-6">Status</th>
                  <th className="pb-3 pr-6">Bill</th>
                  <th className="pb-3 pr-6">Created At</th>
                  <th className="pb-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {transactions.map((tx) => {
                  const attrs = tx?.attributes ?? tx ?? {};
                  const id =
                    tx?.id ??
                    attrs?.id ??
                    attrs?.transaction_id ??
                    attrs?.transactionId;
                  const name =
                    readField(attrs, ["name", "transaction_name", "transactionName"]) ||
                    readField(tx, ["name", "transaction_name", "transactionName"]);
                  const status = attrs?.status ?? attrs?.state ?? "-";
                  const createdAt =
                    attrs?.created_at ??
                    attrs?.createdAt ??
                    tx?.created_at ??
                    "-";
                  const bill = id ? billByTransactionId[String(id)] : null;
                  const billMeta = toBillStatusMeta(bill?.status);
                  const billAmount = formatIdr(bill?.amount);
                  const billDueAt = formatDate(bill?.dueAt);

                  return (
                    <tr key={id} className="group">
                      <td className="py-3 pr-6 text-zinc-700">
                        {name || "Unnamed transaction"}
                      </td>
                      <td className="py-3 pr-6">
                        <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium capitalize text-zinc-700">
                          {status}
                        </span>
                      </td>
                      <td className="py-3 pr-6">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${billMeta.className}`}
                          >
                            {billMeta.label}
                          </span>
                          {bill ? (
                            <span className="text-xs text-zinc-500">
                              {billAmount} • due {billDueAt}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="py-3 pr-6 text-zinc-500">{createdAt}</td>
                      <td className="py-3 text-right">
                        {id ? (
                          <Link
                            href={`/dashboard/customer/${customerId}/transaction/${id}`}
                            className="text-xs font-medium text-teal-700 transition hover:text-teal-800"
                          >
                            View
                          </Link>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </div>
        )}
      </div>
    </div>
  );
}
