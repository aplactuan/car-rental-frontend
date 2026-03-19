import Link from "next/link";
import { cookies } from "next/headers";

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
  } else {
    error = "Customer ID was not provided.";
  }

  return (
    <div className="w-full pr-8">
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <Link
          href="/dashboard/customer"
          className="text-sm font-medium text-teal-700 transition hover:text-teal-800"
        >
          Back to customer list
        </Link>

        <h1 className="mt-4 text-3xl font-bold tracking-tight">Customer Details</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Customer ID: <span className="font-medium text-zinc-900">{customerId}</span>
        </p>
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
    </div>
  );
}
