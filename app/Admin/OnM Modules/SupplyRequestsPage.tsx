import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useTheme } from "../../../theme/ThemeContext";
import { ADUser, SupplyRequest, SupplyRequestStatus } from "../../../types";
import {
  getAllSupplyRequests,
  approveSupplyRequest,
  approveSupplyRequestPartial,
  rejectSupplyRequest,
} from "../../../Services/officeInventory";
import PartialApprovalModal from "./Modal/PartialApprovalModal";

// ─── Types ────────────────────────────────────────────────────────────────────

type StatusFilter = "all" | "pending" | "awaiting_stock" | "resolved" | "rejected";

type StockStatus = "available" | "low" | "out_of_stock";

// ─── Status / badge config ───────────────────────────────────────────────────

const STATUS_TABS: { label: string; value: StatusFilter }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Awaiting stock", value: "awaiting_stock" },
  { label: "Resolved", value: "resolved" },
  { label: "Rejected", value: "rejected" },
];

function statusBadgeClass(status: SupplyRequestStatus): string {
  switch (status) {
    case "pending":
      return "bg-sky-100 text-sky-700";
    case "awaiting_stock":
      return "bg-amber-100 text-amber-700";
    case "resolved":
      return "bg-emerald-100 text-emerald-700";
    case "rejected":
      return "bg-rose-100 text-rose-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function statusLabel(status: SupplyRequestStatus): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "awaiting_stock":
      return "Awaiting stock";
    case "resolved":
      return "Resolved";
    case "rejected":
      return "Rejected";
    default:
      return status;
  }
}

function stockBadgeClass(status: StockStatus): string {
  switch (status) {
    case "available":
      return "bg-emerald-100 text-emerald-700";
    case "low":
      return "bg-amber-100 text-amber-700";
    case "out_of_stock":
      return "bg-rose-100 text-rose-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function stockLabel(status: StockStatus): string {
  switch (status) {
    case "available":
      return "In stock";
    case "low":
      return "Low stock";
    case "out_of_stock":
      return "Out of stock";
    default:
      return status;
  }
}

function worstStockStatus(items: SupplyRequest["items"]): StockStatus {
  if (items.some((i) => i.stockStatusAtRequest === "out_of_stock"))
    return "out_of_stock";
  if (items.some((i) => i.stockStatusAtRequest === "low")) return "low";
  return "available";
}

function getInitials(name: string): string {
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

function formatDateFiled(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return (
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    ", " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  );
}

function itemSummary(items: SupplyRequest["items"]): {
  primaryLabel: string;
  extraCount: number;
  qtyLabel: string;
} {
  if (items.length === 0) {
    return { primaryLabel: "—", extraCount: 0, qtyLabel: "—" };
  }
  const first = items[0];
  return {
    primaryLabel: first.itemName,
    extraCount: items.length - 1,
    qtyLabel:
      items.length === 1 ? String(first.quantityRequested) : `${items.length} items`,
  };
}

// ─── Reject reason modal ──────────────────────────────────────────────────────

type RejectModalProps = {
  visible: boolean;
  ticketNumber: string;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
  submitting: boolean;
  theme: any;
};

function RejectModal({
  visible,
  ticketNumber,
  onCancel,
  onConfirm,
  submitting,
  theme,
}: RejectModalProps) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (visible) setReason("");
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div
        style={{ backgroundColor: theme.surface, borderColor: theme.border }}
        className="w-full max-w-sm rounded-xl border p-5"
      >
        <h3 style={{ color: theme.text }} className="text-sm font-semibold mb-1">
          Reject request {ticketNumber}
        </h3>
        <p style={{ color: theme.subtext }} className="text-xs mb-3">
          Let the requester know why this was rejected.
        </p>
        <textarea
          autoFocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Item discontinued, please choose an alternative…"
          style={{
            backgroundColor: theme.inputBg,
            borderColor: theme.inputBorder,
            color: theme.inputText,
          }}
          className="w-full min-h-[80px] rounded-lg border px-3 py-2 text-sm focus:outline-none resize-none"
        />
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onCancel}
            disabled={submitting}
            style={{
              backgroundColor: theme.surface,
              color: theme.text,
              borderColor: theme.border,
            }}
            className="px-3 py-2 text-sm font-medium rounded-lg border"
          >
            Cancel
          </button>
          <button
            onClick={() => reason.trim() && onConfirm(reason.trim())}
            disabled={submitting || !reason.trim()}
            style={{
              backgroundColor: "#E11D48",
              color: "#fff",
              opacity: submitting || !reason.trim() ? 0.6 : 1,
            }}
            className="px-3 py-2 text-sm font-medium rounded-lg"
          >
            {submitting ? "Rejecting…" : "Reject request"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── View detail drawer ────────────────────────────────────────────────────────

type DetailDrawerProps = {
  request: SupplyRequest | null;
  onClose: () => void;
  theme: any;
};

function DetailDrawer({ request, onClose, theme }: DetailDrawerProps) {
  if (!request) return null;
  const totalQty = request.items.reduce((s, i) => s + i.quantityRequested, 0);
  const effStatus: SupplyRequestStatus =
    request.status === "pending" && worstStockStatus(request.items) === "out_of_stock"
      ? ("awaiting_stock" as SupplyRequestStatus)
      : request.status;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div
        style={{ backgroundColor: theme.surface, borderColor: theme.border }}
        className="relative w-full max-w-md h-full border-l overflow-y-auto"
      >
        <div
          style={{ borderColor: theme.border }}
          className="flex items-center justify-between px-5 py-4 border-b sticky top-0"
        >
          <div>
            <p style={{ color: theme.subtext }} className="text-[11px] uppercase tracking-wide">
              Supply request
            </p>
            <h2 style={{ color: theme.text }} className="text-base font-semibold">
              {request.ticketNumber}
            </h2>
          </div>
          <button onClick={onClose} style={{ color: theme.subtext }} className="text-xl leading-none">
            ×
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Summary card */}
          <div
            style={{ borderColor: theme.border, backgroundColor: theme.background }}
            className="rounded-lg border p-4"
          >
            {[
              { label: "Requested by", value: request.requestedByName },
              { label: "Date filed", value: formatDateFiled(request.createdAt) },
              {
                label: "Status",
                value: statusLabel(effStatus),
                badge: statusBadgeClass(effStatus),
              },
              { label: "Total items", value: `${request.items.length}` },
              { label: "Total qty", value: String(totalQty) },
            ].map((row, i, arr) => (
              <div
                key={row.label}
                style={{ borderColor: theme.border }}
                className={`flex justify-between items-center py-2 ${i < arr.length - 1 ? "border-b" : ""}`}
              >
                <span style={{ color: theme.subtext }} className="text-xs">
                  {row.label}
                </span>
                {row.badge ? (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${row.badge}`}>
                    {row.value}
                  </span>
                ) : (
                  <span style={{ color: theme.text }} className="text-xs font-medium">
                    {row.value}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Items */}
          <div>
            <h3 style={{ color: theme.text }} className="text-sm font-semibold mb-2">
              Items ({request.items.length})
            </h3>
            <div className="space-y-2">
              {request.items.map((item, i) => (
                <div
                  key={`${item.itemId}-${i}`}
                  style={{ borderColor: theme.border, backgroundColor: theme.background }}
                  className="flex items-center justify-between rounded-lg border px-3 py-2.5"
                >
                  <div>
                    <p style={{ color: theme.text }} className="text-sm font-medium">
                      {item.itemName}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span style={{ color: theme.subtext }} className="text-xs">
                        {item.itemCode}
                      </span>
                      <span style={{ color: theme.subtext }} className="text-xs">
                        ·
                      </span>
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${stockBadgeClass(item.stockStatusAtRequest as StockStatus)}`}
                      >
                        {stockLabel(item.stockStatusAtRequest as StockStatus)}
                      </span>
                    </div>
                  </div>
                  <span style={{ color: theme.primary }} className="text-sm font-semibold">
                    ×{item.quantityRequested}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          {request.notes ? (
            <div>
              <h3 style={{ color: theme.text }} className="text-sm font-semibold mb-2">
                Notes
              </h3>
              <p
                style={{
                  color: theme.subtext,
                  borderColor: theme.border,
                  backgroundColor: theme.background,
                }}
                className="text-sm rounded-lg border p-3 leading-relaxed"
              >
                {request.notes}
              </p>
            </div>
          ) : null}

          {/* Rejection reason */}
          {request.status === "rejected" && request.rejectionReason ? (
            <div>
              <h3 style={{ color: theme.text }} className="text-sm font-semibold mb-2">
                Rejection reason
              </h3>
              <p className="text-sm rounded-lg border border-rose-200 bg-rose-50 text-rose-700 p-3 leading-relaxed">
                {request.rejectionReason}
              </p>
            </div>
          ) : null}

          {/* Review trail */}
          {request.reviewedByName ? (
            <p style={{ color: theme.subtext }} className="text-xs">
              Reviewed by {request.reviewedByName}
              {request.reviewedAt ? ` on ${formatDateFiled(request.reviewedAt)}` : ""}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ─── Row component ────────────────────────────────────────────────────────────

type RowProps = {
  request: SupplyRequest;
  index: number;
  onApprove: (request: SupplyRequest) => void;
  onReject: (request: SupplyRequest) => void;
  onView: (request: SupplyRequest) => void;
  approvingId: string | null;
  theme: any;
};

function RequestRow({ request, index, onApprove, onReject, onView, approvingId, theme }: RowProps) {
  const stock = worstStockStatus(request.items);
  const { primaryLabel, extraCount, qtyLabel } = itemSummary(request.items);
  const effStatus: SupplyRequestStatus =
    request.status === "pending" && stock === "out_of_stock"
      ? ("awaiting_stock" as SupplyRequestStatus)
      : request.status;
  const isActionable = request.status === "pending" || request.status === "awaiting_stock";
  const isApproving = approvingId === request.id;

  return (
    <tr
      style={{
        backgroundColor: index % 2 === 0 ? theme.surface : theme.background,
        borderBottom: `1px solid ${theme.border}`,
      }}
    >
      <td className="px-3 py-3 whitespace-nowrap">
        <button
          onClick={() => onView(request)}
          style={{ color: theme.text }}
          className="text-sm font-medium hover:opacity-70 transition-opacity"
        >
          #{request.ticketNumber.replace(/^SR-\d+-/, "")}
        </button>
      </td>

      <td className="px-3 py-3 min-w-[150px]">
        <div className="flex items-center gap-2">
          <span
            style={{
              backgroundColor: theme.primary,
              color: theme.primaryText,
              width: 22,
              height: 22,
            }}
            className="flex items-center justify-center rounded-full text-[10px] font-medium flex-shrink-0"
          >
            {getInitials(request.requestedByName)}
          </span>
          <span style={{ color: theme.text }} className="text-sm">
            {request.requestedByName}
          </span>
        </div>
      </td>

      <td className="px-3 py-3 min-w-[180px]">
        <span style={{ color: theme.text }} className="text-sm font-medium">
          {primaryLabel}
        </span>
        {extraCount > 0 && (
          <span style={{ color: theme.subtext }} className="text-xs ml-1.5">
            +{extraCount} more
          </span>
        )}
      </td>

      <td className="px-3 py-3 whitespace-nowrap">
        <span style={{ color: theme.text }} className="text-sm">
          {qtyLabel}
        </span>
      </td>

      <td className="px-3 py-3 whitespace-nowrap">
        <span style={{ color: theme.subtext }} className="text-xs">
          {formatDateFiled(request.createdAt)}
        </span>
      </td>

      <td className="px-3 py-3 whitespace-nowrap">
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${stockBadgeClass(stock)}`}>
          {stockLabel(stock)}
        </span>
      </td>

      <td className="px-3 py-3 whitespace-nowrap">
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusBadgeClass(effStatus)}`}>
          {statusLabel(effStatus)}
        </span>
      </td>

      <td className="px-3 py-3 whitespace-nowrap text-right">
        {isActionable ? (
          <div className="inline-flex items-center gap-1.5">
            {/* Opens the partial-approval modal */}
            <button
              onClick={() => onApprove(request)}
              disabled={isApproving}
              style={{ backgroundColor: theme.primary, color: theme.primaryText }}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg disabled:opacity-60"
            >
              {isApproving ? "Approving…" : "✓ Approve"}
            </button>
            <button
              onClick={() => onReject(request)}
              disabled={isApproving}
              style={{ borderColor: theme.border, color: theme.subtext }}
              className="px-2.5 py-1.5 text-xs font-medium rounded-lg border disabled:opacity-60"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={() => onView(request)}
            style={{ borderColor: theme.border, color: theme.text }}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border"
          >
            👁 View
          </button>
        )}
      </td>
    </tr>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Props = { user?: ADUser };

const HEADERS = [
  "Ticket #",
  "Requested by",
  "Item",
  "Qty",
  "Date filed",
  "Stock status",
  "Ticket status",
  "",
];

export default function SupplyRequestsPage({ user }: Props) {
  const { theme } = useTheme();

  const [requests, setRequests] = useState<SupplyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [detailRequest, setDetailRequest] = useState<SupplyRequest | null>(null);
  const [rejectTarget, setRejectTarget] = useState<SupplyRequest | null>(null);

  // ── Approval state ─────────────────────────────────────────────────────────
  const [approvalTarget, setApprovalTarget] = useState<SupplyRequest | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const [rejecting, setRejecting] = useState(false);
  const [error, setError] = useState("");

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllSupplyRequests();
      setRequests(data);
    } catch (err) {
      console.error("Unable to load supply requests:", err);
      setError("Failed to load supply requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const effectiveStatus = useCallback((r: SupplyRequest): SupplyRequestStatus => {
    if (r.status === "pending" && worstStockStatus(r.items) === "out_of_stock") {
      return "awaiting_stock" as SupplyRequestStatus;
    }
    return r.status;
  }, []);

  const filtered = useMemo(() => {
    let result = requests;
    if (statusFilter !== "all") {
      result = result.filter((r) => effectiveStatus(r) === statusFilter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((r) =>
        [r.ticketNumber, r.requestedByName, ...r.items.map((i) => i.itemName), ...r.items.map((i) => i.itemCode)]
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }
    return result;
  }, [requests, statusFilter, search, effectiveStatus]);

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = {
      all: requests.length,
      pending: 0,
      awaiting_stock: 0,
      resolved: 0,
      rejected: 0,
    };
    requests.forEach((r) => {
      const s = effectiveStatus(r) as StatusFilter;
      if (s in c) c[s] += 1;
    });
    return c;
  }, [requests, effectiveStatus]);

  // ── Approve all (existing behaviour, fires from inside PartialApprovalModal) ──
  const handleApproveAll = async (request: SupplyRequest) => {
    setApprovingId(request.id);
    setError("");
    try {
      await approveSupplyRequest(request.id);
      await loadRequests();
    } catch (err: any) {
      setError(err?.message ?? "Failed to approve request.");
      throw err; // re-throw so the modal can surface it
    } finally {
      setApprovingId(null);
    }
  };

  // ── Approve partial (new, fires from inside PartialApprovalModal) ──────────
  const handleApprovePartial = async (
    requestId: string,
    lines: { itemId: string; qtyToDispense: number }[]
  ) => {
    setApprovingId(requestId);
    setError("");
    try {
      await approveSupplyRequestPartial(requestId, lines);
      await loadRequests();
    } catch (err: any) {
      setError(err?.message ?? "Failed to approve request.");
      throw err;
    } finally {
      setApprovingId(null);
    }
  };

  const handleConfirmReject = async (reason: string) => {
    if (!rejectTarget) return;
    setRejecting(true);
    setError("");
    try {
      await rejectSupplyRequest(rejectTarget.id, reason);
      setRejectTarget(null);
      await loadRequests();
    } catch (err: any) {
      setError(err?.message ?? "Failed to reject request.");
    } finally {
      setRejecting(false);
    }
  };

  return (
    <div style={{ backgroundColor: theme.background }} className="flex flex-col h-full overflow-hidden">
      {/* ── Fixed top bar ── */}
      <div className="flex-shrink-0 px-4 pt-4 pb-0">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div>
            <h1 style={{ color: theme.text }} className="text-xl font-bold">
              Supply requests
            </h1>
            <p style={{ color: theme.subtext }} className="text-xs mt-0.5">
              Pending &amp; history · {filtered.length} of {requests.length}
            </p>
          </div>
        </div>

        {/* Search + status pills row */}
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <div className="relative w-full max-w-md">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: theme.subtext }}
            >
              <path d="m21 21-4.34-4.34" />
              <circle cx="11" cy="11" r="8" />
            </svg>
            <input
              type="text"
              placeholder="Search items…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                backgroundColor: theme.inputBg,
                borderColor: theme.inputBorder,
                color: theme.inputText,
              }}
              className="w-full px-4 py-2.5 pl-9 text-sm border rounded-lg focus:outline-none"
            />
          </div>

          <div
            style={{ backgroundColor: theme.surfaceRaised, borderColor: theme.border }}
            className="inline-flex items-center gap-1 p-1 rounded-lg border"
          >
            {STATUS_TABS.map((tab) => {
              const active = statusFilter === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => setStatusFilter(tab.value)}
                  style={{
                    backgroundColor: active ? theme.primary : "transparent",
                    color: active ? theme.primaryText : theme.subtext,
                  }}
                  className="px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors"
                >
                  {tab.label}
                  {tab.value !== "all" && counts[tab.value] > 0 ? (
                    <span className="ml-1.5 opacity-70">{counts[tab.value]}</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs px-3 py-2 mb-3">
            ⚠ {error}
          </div>
        ) : null}
      </div>

      {/* ── Scrollable content ── */}
      {loading ? (
        <div className="flex flex-1 items-center justify-center py-20">
          <div
            style={{ borderColor: theme.primary }}
            className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-20">
          <p style={{ color: theme.subtext }} className="text-sm">
            No supply requests found.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto overflow-x-auto px-4 pb-4">
          <div style={{ borderColor: theme.border }} className="rounded-lg border">
            <table className="min-w-full text-sm" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {HEADERS.map((h) => (
                    <th
                      key={h}
                      style={{
                        color: theme.subtext,
                        borderColor: theme.border,
                        backgroundColor: theme.surfaceRaised,
                        position: "sticky",
                        top: 0,
                        zIndex: 10,
                      }}
                      className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide whitespace-nowrap border-b"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((request, index) => (
                  <RequestRow
                    key={request.id}
                    request={request}
                    index={index}
                    onApprove={(r) => setApprovalTarget(r)}   // opens modal
                    onReject={(r) => setRejectTarget(r)}
                    onView={(r) => setDetailRequest(r)}
                    approvingId={approvingId}
                    theme={theme}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Partial approval modal ── */}
      <PartialApprovalModal
        visible={approvalTarget !== null}
        request={approvalTarget}
        onClose={() => setApprovalTarget(null)}
        onApproveAll={handleApproveAll}
        onApprovePartial={handleApprovePartial}
        theme={theme}
      />

      {/* ── Detail drawer ── */}
      <DetailDrawer request={detailRequest} onClose={() => setDetailRequest(null)} theme={theme} />

      {/* ── Reject modal ── */}
      <RejectModal
        visible={rejectTarget !== null}
        ticketNumber={rejectTarget?.ticketNumber ?? ""}
        onCancel={() => setRejectTarget(null)}
        onConfirm={handleConfirmReject}
        submitting={rejecting}
        theme={theme}
      />
    </div>
  );
}
