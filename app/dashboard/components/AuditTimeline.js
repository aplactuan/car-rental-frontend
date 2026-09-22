import Link from "next/link";

const MODEL_LABELS = {
  "purchase-order": "Purchase Order",
  "trip-report": "Trip Report",
  invoice: "Invoice",
};

const EVENT_STYLES = {
  created: {
    label: "Created",
    dot: "bg-emerald-500 ring-emerald-100",
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  updated: {
    label: "Updated",
    dot: "bg-blue-500 ring-blue-100",
    badge: "bg-blue-50 text-blue-700 ring-blue-200",
  },
  deleted: {
    label: "Deleted",
    dot: "bg-rose-500 ring-rose-100",
    badge: "bg-rose-50 text-rose-700 ring-rose-200",
  },
};

function pick(source, keys, fallback = "") {
  if (!source || typeof source !== "object") return fallback;
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return fallback;
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function toFieldList(value, oldValues, newValues) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (value && typeof value === "object") return Object.keys(value);
  return [...new Set([...Object.keys(oldValues), ...Object.keys(newValues)])];
}

function titleCase(value) {
  return String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatWhen(value) {
  if (!value) return "Time unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatValue(value) {
  if (value === undefined || value === null || value === "") return "Empty";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return "Multiple values";
  const text = String(value);
  return text.length > 44 ? `${text.slice(0, 41)}…` : text;
}

function getActor(raw, attrs) {
  const relationship =
    raw?.relationships?.user?.data ??
    raw?.relationships?.actor?.data ??
    attrs?.user ??
    attrs?.actor ??
    null;
  const actor = relationship?.attributes ?? relationship ?? {};

  return String(
    pick(actor, ["name", "fullName", "full_name", "email"], "System"),
  );
}

export function normalizeAudits(payload) {
  const records = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.audits)
      ? payload.audits
      : Array.isArray(payload)
        ? payload
        : [];

  return records.map((raw, index) => {
    const attrs = raw?.attributes ?? raw ?? {};
    const oldValues = asObject(
      pick(attrs, ["oldValues", "old_values"], {}),
    );
    const newValues = asObject(
      pick(attrs, ["newValues", "new_values"], {}),
    );
    const changedFields = toFieldList(
      pick(attrs, ["changedFields", "changed_fields"], []),
      oldValues,
      newValues,
    ).filter((field) => !["created_at", "updated_at"].includes(field));
    const auditableType = String(
      pick(attrs, ["auditableType", "auditable_type"], "record"),
    ).toLowerCase();
    const event = String(pick(attrs, ["event"], "updated")).toLowerCase();

    return {
      id: String(raw?.id ?? attrs?.id ?? `audit-${index}`),
      event,
      auditableType,
      auditableId: String(
        pick(attrs, ["auditableId", "auditable_id"], ""),
      ),
      customerId: String(
        pick(attrs, ["customerId", "customer_id"], ""),
      ),
      purchaseOrderId: String(
        pick(
          attrs,
          ["purchaseOrderId", "purchase_order_id"],
          pick(
            newValues,
            ["purchaseOrderId", "purchase_order_id"],
            pick(oldValues, ["purchaseOrderId", "purchase_order_id"], ""),
          ),
        ),
      ),
      changedFields,
      oldValues,
      newValues,
      actor: getActor(raw, attrs),
      createdAt: String(pick(attrs, ["createdAt", "created_at"], "")),
    };
  });
}

function auditHref(audit) {
  if (!audit.customerId || audit.event === "deleted") return "";
  const base = `/dashboard/customer/${encodeURIComponent(audit.customerId)}`;

  if (audit.auditableType === "purchase-order" && audit.auditableId) {
    return `${base}/purchase-order/${encodeURIComponent(audit.auditableId)}`;
  }
  if (audit.purchaseOrderId) {
    return `${base}/purchase-order/${encodeURIComponent(audit.purchaseOrderId)}`;
  }
  return base;
}

function ChangeDetails({ audit }) {
  const visibleFields = audit.changedFields.slice(0, 6);
  if (visibleFields.length === 0) return null;

  return (
    <details className="group/details mt-2">
      <summary className="w-fit cursor-pointer list-none text-xs font-medium text-zinc-500 transition hover:text-zinc-800 marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="group-open/details:hidden">View changes</span>
        <span className="hidden group-open/details:inline">Hide changes</span>
      </summary>
      <dl className="mt-2 grid gap-1.5 rounded-lg bg-zinc-50 p-3 text-xs">
        {visibleFields.map((field) => (
          <div
            key={field}
            className="grid gap-0.5 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-3"
          >
            <dt className="font-medium text-zinc-600">{titleCase(field)}</dt>
            <dd className="min-w-0 break-words text-zinc-500">
              {audit.event === "updated" ? (
                <>
                  <span className="line-through decoration-zinc-300">
                    {formatValue(audit.oldValues[field])}
                  </span>{" "}
                  <span aria-hidden>→</span>{" "}
                </>
              ) : null}
              <span className="text-zinc-800">
                {formatValue(
                  audit.event === "deleted"
                    ? audit.oldValues[field]
                    : audit.newValues[field],
                )}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

export default function AuditTimeline({
  audits,
  title = "Recent Changes",
  description = "Latest changes across trip reports, invoices, and purchase orders.",
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 px-4 py-4 sm:px-6">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
          <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
        </div>
        {audits.length > 0 ? (
          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-zinc-600">
            {audits.length} update{audits.length === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      {audits.length === 0 ? (
        <div className="px-4 py-9 text-center sm:px-6">
          <p className="text-sm font-medium text-zinc-700">No changes yet</p>
          <p className="mt-1 text-sm text-zinc-500">
            New activity will appear here as records are changed.
          </p>
        </div>
      ) : (
        <ol className="divide-y divide-zinc-100">
          {audits.map((audit) => {
            const style = EVENT_STYLES[audit.event] ?? EVENT_STYLES.updated;
            const modelLabel =
              MODEL_LABELS[audit.auditableType] ?? titleCase(audit.auditableType);
            const href = auditHref(audit);

            return (
              <li key={audit.id} className="relative px-4 py-4 sm:px-6">
                <div className="flex gap-3">
                  <span
                    className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-4 ${style.dot}`}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="min-w-0 text-sm text-zinc-800">
                        <span className="font-semibold text-zinc-900">
                          {audit.actor}
                        </span>{" "}
                        {style.label.toLowerCase()} {" "}
                        {href ? (
                          <Link
                            href={href}
                            className="font-semibold text-zinc-900 underline-offset-2 hover:text-red-700 hover:underline"
                          >
                            {modelLabel}
                          </Link>
                        ) : (
                          <span className="font-semibold text-zinc-900">
                            {modelLabel}
                          </span>
                        )}
                      </p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${style.badge}`}
                      >
                        {style.label}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <time
                        dateTime={audit.createdAt || undefined}
                        className="text-xs tabular-nums text-zinc-500"
                      >
                        {formatWhen(audit.createdAt)}
                      </time>
                      {audit.changedFields.length > 0 ? (
                        <>
                          <span className="text-zinc-300" aria-hidden>
                            ·
                          </span>
                          <span className="text-xs text-zinc-500">
                            {audit.changedFields
                              .slice(0, 3)
                              .map(titleCase)
                              .join(", ")}
                            {audit.changedFields.length > 3
                              ? ` +${audit.changedFields.length - 3}`
                              : ""}
                          </span>
                        </>
                      ) : null}
                    </div>
                    <ChangeDetails audit={audit} />
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
