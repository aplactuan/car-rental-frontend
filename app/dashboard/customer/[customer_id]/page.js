import Link from "next/link";
import { cookies } from "next/headers";
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

  return parsed.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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
  const fetchHeaders = cookieHeader ? { Cookie: cookieHeader } : {};

  let customer = null;
  let error = "";
  let purchaseOrders = [];
  let purchaseOrdersError = "";

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

            <h1 className="mt-4 text-3xl font-bold tracking-tight">
              Customer Details
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              Customer ID:{" "}
              <span className="font-medium text-zinc-900">{customerId}</span>
            </p>
          </div>
          {customerId ? (
            <AddPurchaseOrderButton customerId={customerId} />
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
            <DetailRow label="Contact Person" value={customer.contact_person} />
            <DetailRow
              label="Contact Mobile Number"
              value={customer.contact_mobile_number}
            />
            <DetailRow label="Contact Email" value={customer.contact_email} />
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
          Purchase Orders
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Purchase orders linked to this customer.
        </p>

        {purchaseOrdersError ? (
          <p className="mt-4 text-sm text-red-600">{purchaseOrdersError}</p>
        ) : purchaseOrders.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">No purchase orders found.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                  <th className="pb-3 pr-6">PO Number</th>
                  <th className="pb-3 pr-6">Date</th>
                  <th className="pb-3 pr-6">Amount</th>
                  <th className="pb-3 pr-6">Request Person</th>
                  <th className="pb-3 pr-6">Description</th>
                  <th className="pb-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {purchaseOrders.map((po) => (
                  <tr key={po.id}>
                    <td className="py-3 pr-6 font-medium text-zinc-900">
                      {po.poNumber || "—"}
                    </td>
                    <td className="py-3 pr-6 text-zinc-700">
                      {formatDate(po.date)}
                    </td>
                    <td className="py-3 pr-6 text-zinc-700">
                      {formatPhp(po.amount)}
                    </td>
                    <td className="py-3 pr-6 text-zinc-700">
                      {po.requestPerson || "—"}
                    </td>
                    <td className="py-3 pr-6 text-zinc-700">
                      {po.description || "—"}
                    </td>
                    <td className="py-3 text-right">
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
    </div>
  );
}
