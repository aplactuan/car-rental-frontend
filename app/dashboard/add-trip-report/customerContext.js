/**
 * Customer context for the Add Trip Report wizard.
 *
 * Backend request (preferred when available):
 *   GET /api/v1/customers/{customer_id}/trip-report-context
 *   Optional query: program_id, unprogrammed=1
 *   Response: { data: { customer, programs[], purchase_orders[] } }
 *
 * Until that exists, we fall back to:
 *   GET /api/v1/customers/{id}/programs
 *   GET /api/v1/purchase-orders?customer_id=…&program_id=…|unprogrammed=1
 */

function getAuthHeaders(extra = {}) {
  const authToken =
    typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  return {
    Accept: "application/json",
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...extra,
  };
}

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

export function normalizeCustomers(payload) {
  const raw = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.customers)
        ? payload.customers
        : [];

  return raw
    .map((record) => {
      const attrs = record?.attributes ?? {};
      const pick = (keys) =>
        readField(attrs, keys) || readField(record, keys);
      return {
        id: String(pick(["id", "customer_id", "customerId"]) || ""),
        name: String(pick(["name", "customer_name", "customerName"]) || ""),
      };
    })
    .filter((item) => item.id);
}

export function normalizePrograms(payload) {
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
      };
    })
    .filter((item) => item.id);
}

export function normalizePurchaseOrders(payload) {
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
        record?.relationships?.program?.data ?? null;

      return {
        id: String(pick(["id", "purchase_order_id", "purchaseOrderId"]) || ""),
        poNumber: String(pick(["po_number", "poNumber"]) || ""),
        date: String(pick(["date"]) || ""),
        amount: Number.isFinite(amount) ? amount : null,
        status:
          String(pick(["status"]) || "pending").toLowerCase() === "ok"
            ? "ok"
            : "pending",
        programId: String(
          pick(["program_id", "programId"]) || programRelationship?.id || "",
        ),
      };
    })
    .filter((item) => item.id);
}

export function extractResourceId(payload) {
  return String(
    payload?.data?.id ??
      payload?.id ??
      payload?.data?.attributes?.id ??
      payload?.program_id ??
      payload?.purchase_order_id ??
      "",
  );
}

export async function fetchCustomers() {
  const response = await fetch("/api/v1/customers?per_page=100", {
    headers: getAuthHeaders(),
    credentials: "include",
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      data?.error || data?.message || "Failed to load customers.",
    );
  }
  return normalizeCustomers(data);
}

/**
 * Loads programs + purchase orders for a customer.
 * Tries trip-report-context first; falls back to two GETs.
 *
 * @param {string} customerId
 * @param {{ programId?: string, unprogrammed?: boolean }} [options]
 */
export async function loadCustomerContext(customerId, options = {}) {
  const programId = options.programId ? String(options.programId) : "";
  const unprogrammed = Boolean(options.unprogrammed);

  const contextParams = new URLSearchParams();
  if (programId) contextParams.set("program_id", programId);
  if (unprogrammed) contextParams.set("unprogrammed", "1");
  const contextQuery = contextParams.toString();
  const contextUrl = `/api/v1/customers/${encodeURIComponent(customerId)}/trip-report-context${
    contextQuery ? `?${contextQuery}` : ""
  }`;

  try {
    const contextRes = await fetch(contextUrl, {
      headers: getAuthHeaders(),
      credentials: "include",
      cache: "no-store",
    });

    if (contextRes.ok) {
      const contextData = await contextRes.json().catch(() => ({}));
      const root = contextData?.data ?? contextData;
      const programs = normalizePrograms(
        root?.programs ?? { data: root?.programs },
      );
      const purchaseOrders = normalizePurchaseOrders(
        root?.purchase_orders ??
          root?.purchaseOrders ?? { data: root?.purchase_orders },
      );
      return { programs, purchaseOrders, fromContextEndpoint: true };
    }
  } catch {
    // Fall through to dual GET.
  }

  const [programsRes, poRes] = await Promise.all([
    fetch(`/api/v1/customers/${encodeURIComponent(customerId)}/programs`, {
      headers: getAuthHeaders(),
      credentials: "include",
      cache: "no-store",
    }),
    (() => {
      const params = new URLSearchParams({
        customer_id: customerId,
        per_page: "100",
      });
      if (programId) params.set("program_id", programId);
      if (unprogrammed) params.set("unprogrammed", "1");
      return fetch(`/api/v1/purchase-orders?${params}`, {
        headers: getAuthHeaders(),
        credentials: "include",
        cache: "no-store",
      });
    })(),
  ]);

  const programsData = await programsRes.json().catch(() => ({}));
  const poData = await poRes.json().catch(() => ({}));

  if (!programsRes.ok) {
    throw new Error(
      programsData?.error ||
        programsData?.message ||
        "Failed to load programs.",
    );
  }
  if (!poRes.ok) {
    throw new Error(
      poData?.error || poData?.message || "Failed to load purchase orders.",
    );
  }

  return {
    programs: normalizePrograms(programsData),
    purchaseOrders: normalizePurchaseOrders(poData),
    fromContextEndpoint: false,
  };
}

export async function fetchPurchaseOrdersOnly(customerId, options = {}) {
  const programId = options.programId ? String(options.programId) : "";
  const unprogrammed = Boolean(options.unprogrammed);
  const params = new URLSearchParams({
    customer_id: customerId,
    per_page: "100",
  });
  if (programId) params.set("program_id", programId);
  if (unprogrammed) params.set("unprogrammed", "1");

  const response = await fetch(`/api/v1/purchase-orders?${params}`, {
    headers: getAuthHeaders(),
    credentials: "include",
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      data?.error || data?.message || "Failed to load purchase orders.",
    );
  }
  return normalizePurchaseOrders(data);
}

export { getAuthHeaders };
