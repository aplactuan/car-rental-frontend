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
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                  <th className="pb-3 pr-6">Transaction Name</th>
                  <th className="pb-3 pr-6">Status</th>
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
        )}
      </div>
    </div>
  );
}
