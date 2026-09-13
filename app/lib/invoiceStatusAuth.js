export const INVOICE_STATUS_UNPAID = "unpaid";
export const INVOICE_STATUS_PAID = "paid";

export const INVOICE_STATUS_OPTIONS = [
  { value: INVOICE_STATUS_UNPAID, label: "Unpaid" },
  { value: INVOICE_STATUS_PAID, label: "Paid" },
];

export function canChangeInvoiceStatus(role) {
  return String(role || "").trim().toLowerCase() === "owner";
}

export function invoiceStatusOptions(roleOrCanChange) {
  const allowPaid =
    typeof roleOrCanChange === "boolean"
      ? roleOrCanChange
      : canChangeInvoiceStatus(roleOrCanChange);

  if (allowPaid) return INVOICE_STATUS_OPTIONS;
  return INVOICE_STATUS_OPTIONS.filter(
    (option) => option.value === INVOICE_STATUS_UNPAID,
  );
}

export function resolveInvoiceCreateStatus(roleOrCanChange, requested) {
  const allowPaid =
    typeof roleOrCanChange === "boolean"
      ? roleOrCanChange
      : canChangeInvoiceStatus(roleOrCanChange);
  const status = String(requested || "")
    .trim()
    .toLowerCase();

  if (allowPaid && status === INVOICE_STATUS_PAID) {
    return INVOICE_STATUS_PAID;
  }
  return INVOICE_STATUS_UNPAID;
}

export function readInvoiceStatus(source) {
  if (!source || typeof source !== "object") {
    return { present: false, value: "" };
  }

  if (typeof source.has === "function" && typeof source.get === "function") {
    if (!source.has("status")) {
      return { present: false, value: "" };
    }
    return {
      present: true,
      value: String(source.get("status") || "").trim().toLowerCase(),
    };
  }

  if (!Object.prototype.hasOwnProperty.call(source, "status")) {
    return { present: false, value: "" };
  }

  return {
    present: true,
    value: String(source.status ?? "").trim().toLowerCase(),
  };
}

export function invoiceStatusPolicyError({
  role,
  isCreate,
  statusPresent,
  status,
}) {
  if (!statusPresent) return null;
  if (canChangeInvoiceStatus(role)) return null;

  if (isCreate && status === INVOICE_STATUS_UNPAID) return null;
  if (isCreate && status === INVOICE_STATUS_PAID) {
    return "Only an owner can mark an invoice as paid.";
  }
  return "Only an owner can update invoice status.";
}
