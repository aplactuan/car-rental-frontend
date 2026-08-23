import { getAuthHeaders } from "../add-trip-report/customerContext";

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

function toAmount(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function normalizeTripReports(payload) {
  const raw =
    payload?.data ?? payload?.trip_reports ?? payload?.items ?? payload;
  const list = Array.isArray(raw) ? raw : [];

  return list
    .map((record) => {
      const attrs = record?.attributes ?? {};
      const pick = (keys) =>
        readField(attrs, keys) || readField(record, keys);
      const invoiceRelationship =
        record?.relationships?.invoice?.data ??
        attrs?.relationships?.invoice?.data ??
        null;
      const invoiceId = String(
        pick(["invoice_id", "invoiceId"]) ||
          (invoiceRelationship && invoiceRelationship.id != null
            ? invoiceRelationship.id
            : "") ||
          "",
      );

      return {
        id: String(pick(["id", "trip_report_id", "tripReportId"]) || ""),
        tripReportNo: String(
          pick(["trip_report_no", "tripReportNo"]) || "",
        ),
        reportDate: String(pick(["report_date", "reportDate"]) || ""),
        driver: String(pick(["driver"]) || ""),
        destinations: String(pick(["destinations"]) || ""),
        amount: toAmount(attrs?.amount ?? record?.amount),
        invoiceId,
      };
    })
    .filter((item) => item.id);
}

export async function fetchUnassignedTripReports(purchaseOrderId) {
  const response = await fetch(
    `/api/v1/purchase-orders/${encodeURIComponent(purchaseOrderId)}/trip-reports`,
    {
      headers: getAuthHeaders(),
      credentials: "include",
      cache: "no-store",
    },
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      data?.error || data?.message || "Failed to load trip reports.",
    );
  }
  return normalizeTripReports(data).filter((report) => !report.invoiceId);
}
