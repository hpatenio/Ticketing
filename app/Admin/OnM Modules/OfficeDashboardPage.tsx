// app/Admin/OfficeInventory/OfficeDashboardPage.tsx
//
// Main dashboard for the Office Supplies module.
// Mirrors the layout from the design reference (screenshot) and reuses
// the same theme.* token pattern used across SupplyRequestsPage,
// OfficeInventoryPage, MonthlyReportPage, and ActivityPage.
//
// Props expected:
//   user?         — ADUser (for display name)
//   onNavigate?   — (tab: "inventory" | "supply_requests" | "monthly_report" | "activity") => void
//
// Data:
//   Loads from officeInventory service functions already used elsewhere.

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useTheme } from "../../../theme/ThemeContext";
import {
  ADUser,
  OfficeInventoryItem,
  StockTransaction,
  SupplyRequest,
  SupplyRequestStatus,
} from "../../../types";
import {
  getAllInventoryItems,
  getAllStockTransactions,
  getAllSupplyRequests,
} from "../../../Services/officeInventory";
import { query, collection, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../../../firebase";
import PartialApprovalModal from "./Modal/PartialApprovalModal"; // adjust path as needed

// ─── Types ────────────────────────────────────────────────────────────────────

type NavTarget =
  | "inventory"
  | "supply_requests"
  | "monthly_report"
  | "activity";

export type NavPayload = {
  tab: NavTarget;
  approvalRequest?: SupplyRequest;
};

// Matches the InventoryFilter type in OfficeInventoryPage
export type DashboardInventoryFilter = {
  field: keyof OfficeInventoryItem;
  value: string;
} | null;

type Props = {
  user?: ADUser;
  onNavigate?: (tab: NavTarget, filter?: DashboardInventoryFilter) => void;
  onNavigateWithPayload?: (payload: NavPayload) => void;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPeso(amount: number): string {
  return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatDateTime(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return (
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    " · " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  );
}

function getInitials(name: string): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (
    (parts[0][0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")
  ).toUpperCase();
}

const AVATAR_COLORS = [
  { bg: "#dbeafe", text: "#1e40af" },
  { bg: "#fce7f3", text: "#9d174d" },
  { bg: "#d1fae5", text: "#065f46" },
  { bg: "#ede9fe", text: "#5b21b6" },
  { bg: "#fef9c3", text: "#854d0e" },
  { bg: "#cffafe", text: "#155e75" },
  { bg: "#ffedd5", text: "#9a3412" },
];
function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function effectiveStatus(r: SupplyRequest): string {
  const hasOutOfStock = r.items.some(
    (i) => i.stockStatusAtRequest === "out_of_stock",
  );
  if (r.status === "pending" && hasOutOfStock) return "awaiting_stock";
  return r.status;
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case "pending":
      return "bg-sky-100 text-sky-700";
    case "awaiting_stock":
      return "bg-amber-100 text-amber-700";
    case "out_for_delivery":
      return "bg-blue-100 text-blue-700";
    case "resolved":
      return "bg-emerald-100 text-emerald-700";
    case "failed_delivery":
      return "bg-rose-100 text-rose-700";
    case "rejected":
      return "bg-rose-100 text-rose-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "awaiting_stock":
      return "Awaiting stock";
    case "out_for_delivery":
      return "Out for delivery";
    case "resolved":
      return "Delivered";
    case "failed_delivery":
      return "Failed delivery";
    case "rejected":
      return "Rejected";
    default:
      return status;
  }
}

const CATEGORY_LABELS: Record<string, string> = {
  office_supplies: "Office Supplies",
  cleaning: "Cleaning",
  ppe: "PPE",
  medicine: "Medicine",
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  office_supplies: { bg: "#dbeafe", text: "#1e40af" },
  cleaning: { bg: "#ede9fe", text: "#5b21b6" },
  ppe: { bg: "#fce7f3", text: "#9d174d" },
  medicine: { bg: "#ccfbf1", text: "#115e59" },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  icon,
  label,
  value,
  sub,
  valueColor,
  onClick,
  theme,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  valueColor?: string;
  onClick?: () => void;
  theme: any;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: theme.surface,
        borderColor: theme.border,
        cursor: onClick ? "pointer" : "default",
      }}
      className="rounded-xl border p-4 flex flex-col gap-2 flex-1 min-w-[150px] transition-shadow"
      onMouseEnter={(e) => {
        if (onClick)
          e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.primary}33`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div className="flex items-center justify-between">
        <span
          style={{ color: theme.subtext }}
          className="text-[11px] font-semibold uppercase tracking-wide"
        >
          {label}
        </span>
        <span style={{ color: theme.subtext }}>{icon}</span>
      </div>
      <p
        style={{ color: valueColor ?? theme.text }}
        className="text-3xl font-bold leading-none"
      >
        {value}
      </p>
      {sub && (
        <p style={{ color: theme.subtext }} className="text-xs">
          {sub}
        </p>
      )}
    </div>
  );
}

function SectionHeader({
  title,
  action,
  actionLabel,
  theme,
}: {
  title: string;
  action?: () => void;
  actionLabel?: string;
  theme: any;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 style={{ color: theme.text }} className="text-sm font-semibold">
        {title}
      </h2>
      {action && actionLabel && (
        <button
          onClick={action}
          style={{ color: theme.primary }}
          className="text-xs font-medium hover:underline"
        >
          {actionLabel} →
        </button>
      )}
    </div>
  );
}

// ─── Alert Banner ─────────────────────────────────────────────────────────────

function AlertBanner({
  items,
  pendingCount,
  onViewRequests,
  theme,
}: {
  items: OfficeInventoryItem[];
  pendingCount: number;
  onViewRequests?: () => void;
  theme: any;
}) {
  const outOfStockWithPending = items.filter(
    (i) => i.stockStatus === "out_of_stock",
  );
  if (outOfStockWithPending.length === 0 || pendingCount === 0) return null;

  const firstName = outOfStockWithPending[0].name;
  const extra = outOfStockWithPending.length - 1;

  return (
    <div
      style={{ backgroundColor: "#fffbeb", borderColor: "#fde68a" }}
      className="rounded-lg border px-4 py-3 flex items-center justify-between gap-3 mb-4 flex-shrink-0"
    >
      <div className="flex items-center gap-2">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#d97706"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <p className="text-xs text-amber-800">
          <strong>
            {pendingCount} pending {pendingCount === 1 ? "request" : "requests"}
          </strong>{" "}
          for <strong>{firstName}</strong>
          {extra > 0 ? ` and ${extra} other${extra > 1 ? "s" : ""}` : ""} —
          stock now out.
        </p>
      </div>
      {onViewRequests && (
        <button
          onClick={onViewRequests}
          style={{ borderColor: "#fcd34d", color: "#92400e" }}
          className="text-xs font-medium px-3 py-1.5 rounded-lg border whitespace-nowrap flex-shrink-0"
        >
          View requests
        </button>
      )}
    </div>
  );
}

// ─── Stock status badge ───────────────────────────────────────────────────────

function StockBadge({ status }: { status: string }) {
  const map: Record<
    string,
    { bg: string; text: string; dot: string; label: string }
  > = {
    in_stock: {
      bg: "#dcfce7",
      text: "#166534",
      dot: "#22c55e",
      label: "In stock",
    },
    low_stock: {
      bg: "#fef3c7",
      text: "#92400e",
      dot: "#f59e0b",
      label: "Low stock",
    },
    out_of_stock: {
      bg: "#fee2e2",
      text: "#991b1b",
      dot: "#ef4444",
      label: "Out of stock",
    },
  };
  const s = map[status] ?? {
    bg: "#f1f5f9",
    text: "#475569",
    dot: "#94a3b8",
    label: status,
  };
  return (
    <span
      style={{ backgroundColor: s.bg, color: s.text }}
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap"
    >
      <span
        style={{
          backgroundColor: s.dot,
          width: 5,
          height: 5,
          borderRadius: "50%",
          flexShrink: 0,
          display: "inline-block",
        }}
      />
      {s.label}
    </span>
  );
}

// ─── Activity type config ─────────────────────────────────────────────────────

const ACTION_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; icon: React.ReactNode }
> = {
  delivery: {
    label: "Delivery received",
    bg: "#dcfce7",
    text: "#15803d",
    icon: (
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
  },
  manual_adjustment: {
    label: "Stock adjusted",
    bg: "#e2e8f0",
    text: "#334155",
    icon: (
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    ),
  },
  supply_request_fulfilled: {
    label: "Request approved",
    bg: "#dbeafe",
    text: "#1d4ed8",
    icon: (
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
  },
  ticket_deduction: {
    label: "Stock deducted",
    bg: "#fef3c7",
    text: "#92400e",
    icon: (
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    ),
  },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OfficeDashboardPage({ user, onNavigate, onNavigateWithPayload }: Props) {
  const { theme } = useTheme();

  const [items, setItems] = useState<OfficeInventoryItem[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [requests, setRequests] = useState<SupplyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvalRequest, setApprovalRequest] = useState<SupplyRequest | null>(
    null,
  );
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const loadAll = useCallback(async () => {
    try {
      const [inv, txs, reqs] = await Promise.all([
        getAllInventoryItems(),
        getAllStockTransactions(),
        getAllSupplyRequests(),
      ]);
      setItems(inv);
      setTransactions(txs);
      setRequests(reqs);
    } catch (err) {
      console.error("Dashboard load error:", err);
    }
  }, []);

  useEffect(() => {
    setLoading(true);

    // Listen to supply_requests — fires whenever an employee submits,
    // or any status changes (approved, delivered, failed, rejected)
    const supplyQ = query(
      collection(db, "supply_requests"),
      orderBy("createdAt", "desc"),
    );

    // Listen to office_inventory — fires when stock changes (delivery, adjustment, fulfillment)
    const inventoryQ = query(
      collection(db, "office_inventory"),
      orderBy("name", "asc"),
    );

    // Listen to stock_transactions — fires when activity log updates
    const txQ = query(
      collection(db, "stock_transactions"),
      orderBy("createdAt", "desc"),
    );

    let settled = 0;
    const onSettle = () => {
      settled++;
      if (settled === 1) setLoading(false); // show UI after first collection resolves
    };

    const unsubRequests = onSnapshot(
      supplyQ,
      async () => {
        try {
          const reqs = await getAllSupplyRequests();
          setRequests(reqs);
        } catch (err) {
          console.error("Dashboard supply_requests listener error:", err);
        } finally {
          onSettle();
        }
      },
      (err) => {
        console.error("Dashboard supply_requests listener error:", err);
        onSettle();
      },
    );

    const unsubInventory = onSnapshot(
      inventoryQ,
      async () => {
        try {
          const inv = await getAllInventoryItems();
          setItems(inv);
        } catch (err) {
          console.error("Dashboard inventory listener error:", err);
        } finally {
          onSettle();
        }
      },
      (err) => {
        console.error("Dashboard inventory listener error:", err);
        onSettle();
      },
    );

    const unsubTransactions = onSnapshot(
      txQ,
      async () => {
        try {
          const txs = await getAllStockTransactions();
          setTransactions(txs);
        } catch (err) {
          console.error("Dashboard transactions listener error:", err);
        } finally {
          onSettle();
        }
      },
      (err) => {
        console.error("Dashboard transactions listener error:", err);
        onSettle();
      },
    );

    return () => {
      unsubRequests();
      unsubInventory();
      unsubTransactions();
    };
  }, []);

  // ── KPI computations ────────────────────────────────────────────────────────

  const kpi = useMemo(() => {
    const total = items.length;
    const inStock = items.filter((i) => i.stockStatus === "in_stock").length;
    const lowStock = items.filter((i) => i.stockStatus === "low_stock").length;
    const outOfStock = items.filter(
      (i) => i.stockStatus === "out_of_stock",
    ).length;

    // In the kpi useMemo, update pendingReqs:
    const pendingReqs = requests.filter(
      (r) =>
        r.status === "pending" ||
        r.status === "awaiting_stock" ||
        r.status === "out_for_delivery",
    ).length;

    const outOfStockWithPendingReqs = items.filter(
      (i) => i.stockStatus === "out_of_stock",
    );

    return {
      total,
      inStock,
      lowStock,
      outOfStock,
      pendingReqs,
      outOfStockWithPendingReqs,
    };
  }, [items, requests]);

  // ── Category breakdown ──────────────────────────────────────────────────────

  const categoryBreakdown = useMemo(() => {
    const counts: Record<
      string,
      { total: number; inStock: number; lowStock: number; outOfStock: number }
    > = {};
    items.forEach((item) => {
      if (!counts[item.category])
        counts[item.category] = {
          total: 0,
          inStock: 0,
          lowStock: 0,
          outOfStock: 0,
        };
      counts[item.category].total++;
      if (item.stockStatus === "in_stock") counts[item.category].inStock++;
      else if (item.stockStatus === "low_stock")
        counts[item.category].lowStock++;
      else if (item.stockStatus === "out_of_stock")
        counts[item.category].outOfStock++;
    });
    return Object.entries(counts).map(([cat, c]) => ({ category: cat, ...c }));
  }, [items]);

  // ── Recent requests ─────────────────────────────────────────────────────────

  const recentRequests = useMemo(() => {
    return [...requests]
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
      .slice(0, 5);
  }, [requests]);

  // ── Recent activity ─────────────────────────────────────────────────────────

  const recentActivity = useMemo(() => {
    return [...transactions]
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
      .slice(0, 6);
  }, [transactions]);

  // ── Inventory table (recent items) ─────────────────────────────────────────

  const inventoryPreview = useMemo(() => {
    const pendingItemIds = new Set(
      requests
        .filter((r) => r.status === "pending" || r.status === "awaiting_stock")
        .flatMap((r) => r.items.map((i) => i.itemId)),
    );

    const pendingCountByItemId = requests
      .filter((r) => r.status === "pending" || r.status === "awaiting_stock")
      .flatMap((r) => r.items.map((i) => i.itemId))
      .reduce<Record<string, number>>((acc, id) => {
        acc[id] = (acc[id] ?? 0) + 1;
        return acc;
      }, {});

    const sevenDaysAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const recentlyActiveIds = new Set(
      transactions
        .filter((t) => t.createdAt >= sevenDaysAgo)
        .map((t) => t.itemId),
    );

    const priorityScore = (item: OfficeInventoryItem): number => {
      const hasPending = pendingItemIds.has(item.id);
      if (item.stockStatus === "out_of_stock" && hasPending) return 0;
      if (item.stockStatus === "out_of_stock") return 1;
      if (item.stockStatus === "low_stock" && hasPending) return 2;
      if (item.stockStatus === "low_stock") return 3;
      if (recentlyActiveIds.has(item.id)) return 4;
      return 5;
    };

    return [...items]
      .map((item) => ({
        ...item,
        _priority: priorityScore(item),
        _pendingCount: pendingCountByItemId[item.id] ?? 0,
      }))
      .filter((item) => item._priority < 5)
      .sort((a, b) => a._priority - b._priority || a.name.localeCompare(b.name))
      .slice(0, 10);
  }, [items, requests, transactions]);

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div
        style={{ backgroundColor: theme.background }}
        className="flex flex-1 items-center justify-center h-full"
      >
        <div
          style={{ borderColor: theme.primary }}
          className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
        />
      </div>
    );
  }

  return (
    <div
      style={{ backgroundColor: theme.background }}
      className="flex flex-col h-full overflow-hidden"
    >
      {/* ── Fixed header ── */}
      <div className="flex-shrink-0 px-5 pt-5 pb-0">
        {/* Title row */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h1
              style={{ color: theme.text }}
              className="text-xl font-bold leading-tight"
            >
              Dashboard
            </h1>
            <p style={{ color: theme.subtext }} className="text-xs mt-0.5">
              Overview for {today}
            </p>
          </div>

          {/* Quick-action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate?.("inventory")}
              style={{
                backgroundColor: theme.surface,
                color: theme.text,
                borderColor: theme.border,
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border whitespace-nowrap"
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = theme.bgHover)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = theme.surface)
              }
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <line x1="12" y1="5" x2="12" y2="19" />
              </svg>
              Add delivery
            </button>
            <button
              onClick={() => onNavigate?.("inventory")}
              style={{
                backgroundColor: theme.surface,
                color: theme.text,
                borderColor: theme.border,
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border whitespace-nowrap"
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = theme.bgHover)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = theme.surface)
              }
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              Adjust stock
            </button>
            <button
              onClick={() => onNavigate?.("inventory")}
              style={{
                backgroundColor: theme.primary,
                color: theme.primaryText,
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap"
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = theme.primaryHover)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = theme.primary)
              }
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New item
            </button>
          </div>
        </div>

        {/* Alert banner */}
        <AlertBanner
          items={items}
          pendingCount={kpi.pendingReqs}
          onViewRequests={() => onNavigate?.("supply_requests")}
          theme={theme}
        />

        {/* ── KPI row ── */}
        <div className="flex gap-3 mb-5 flex-wrap">
          <KpiCard
            icon={
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            }
            label="Total items"
            value={kpi.total}
            sub={`Across ${categoryBreakdown.length} categories`}
            onClick={() => onNavigate?.("inventory", null)}
            theme={theme}
          />
          <KpiCard
            icon={
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#22c55e"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            }
            label="In stock"
            value={kpi.inStock}
            sub="Available"
            valueColor="#16a34a"
            onClick={() =>
              onNavigate?.("inventory", {
                field: "stockStatus",
                value: "in_stock",
              })
            }
            theme={theme}
          />
          <KpiCard
            icon={
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#f59e0b"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            }
            label="Low stock"
            value={kpi.lowStock}
            sub="Needs restocking"
            valueColor="#d97706"
            onClick={() =>
              onNavigate?.("inventory", {
                field: "stockStatus",
                value: "low_stock",
              })
            }
            theme={theme}
          />
          <KpiCard
            icon={
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ef4444"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            }
            label="Out of stock"
            value={kpi.outOfStock}
            sub={
              kpi.pendingReqs > 0
                ? `${kpi.pendingReqs} with pending requests`
                : undefined
            }
            valueColor="#dc2626"
            onClick={() =>
              onNavigate?.("inventory", {
                field: "stockStatus",
                value: "out_of_stock",
              })
            }
            theme={theme}
          />
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <style>{`
        .office-dashboard-scroll::-webkit-scrollbar { width: 6px; }
        .office-dashboard-scroll::-webkit-scrollbar-track { background: transparent; }
        .office-dashboard-scroll::-webkit-scrollbar-thumb { background: ${theme.border}; border-radius: 99px; }
        .office-dashboard-scroll::-webkit-scrollbar-thumb:hover { background: ${theme.subtext}; }
      `}</style>
      <div className="office-dashboard-scroll flex-1 overflow-y-auto px-5 pb-5">
        {/* ── Two-column layout ── */}
        <div className="flex gap-4 items-start">
          {/* ── Left column: inventory overview + needs attention ── */}
          <div className="flex flex-col gap-4 flex-1 min-w-0">
            {/* Needs Attention table */}
            <div
              style={{
                backgroundColor: theme.surface,
                borderColor: theme.border,
              }}
              className="rounded-xl border"
            >
              {/* Card header */}
              <div className="flex items-center justify-between px-4 pt-4 pb-3">
                <div>
                  <h2
                    style={{ color: theme.text }}
                    className="text-sm font-semibold"
                  >
                    Needs attention
                  </h2>
                  <p
                    style={{ color: theme.subtext }}
                    className="text-[11px] mt-0.5"
                  >
                    Sorted by urgency · out of stock, low stock, and recent
                    activity
                  </p>
                </div>
                <button
                  onClick={() => onNavigate?.("inventory")}
                  style={{ color: theme.primary }}
                  className="text-xs font-medium hover:underline whitespace-nowrap"
                >
                  Full inventory →
                </button>
              </div>

              {inventoryPreview.length === 0 ? (
                <div className="px-4 pb-5 pt-2 text-center">
                  <p style={{ color: theme.subtext }} className="text-xs">
                    🎉 All items are well-stocked. No action needed.
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table
                      className="w-full text-sm"
                      style={{ borderCollapse: "collapse" }}
                    >
                      <thead>
                        <tr>
                          {[
                            "PRIORITY",
                            "ITEM",
                            "CATEGORY",
                            "STOCK",
                            "STATUS",
                            "PENDING REQS",
                            "₱/UNIT",
                            "",
                          ].map((h) => (
                            <th
                              key={h}
                              style={{
                                color: theme.subtext,
                                borderTop: `1px solid ${theme.border}`,
                                borderBottom: `1px solid ${theme.border}`,
                                backgroundColor: theme.surfaceRaised,
                              }}
                              className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {inventoryPreview.map((item, index) => {
                          const catColor = CATEGORY_COLORS[item.category] ?? {
                            bg: "#f1f5f9",
                            text: "#475569",
                          };
                          const isOutOfStock =
                            item.stockStatus === "out_of_stock";
                          const isLowStock = item.stockStatus === "low_stock";

                          // Priority pill config
                          const priorityConfig =
                            item._priority === 0
                              ? {
                                  label: "Critical",
                                  bg: "#fee2e2",
                                  text: "#991b1b",
                                }
                              : item._priority === 1
                                ? {
                                    label: "Out of stock",
                                    bg: "#fee2e2",
                                    text: "#991b1b",
                                  }
                                : item._priority === 2
                                  ? {
                                      label: "Low + pending",
                                      bg: "#fef3c7",
                                      text: "#92400e",
                                    }
                                  : item._priority === 3
                                    ? {
                                        label: "Low stock",
                                        bg: "#fef3c7",
                                        text: "#92400e",
                                      }
                                    : {
                                        label: "Recent activity",
                                        bg: "#dbeafe",
                                        text: "#1e40af",
                                      };

                          return (
                            <tr
                              key={item.id}
                              style={{
                                backgroundColor:
                                  index % 2 === 0
                                    ? theme.surface
                                    : theme.background,
                                borderBottom: `1px solid ${theme.border}`,
                              }}
                            >
                              {/* Priority */}
                              <td className="px-4 py-2.5 whitespace-nowrap">
                                <span
                                  style={{
                                    backgroundColor: priorityConfig.bg,
                                    color: priorityConfig.text,
                                  }}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                                >
                                  {item._priority <= 1 && (
                                    <span
                                      style={{
                                        width: 5,
                                        height: 5,
                                        borderRadius: "50%",
                                        backgroundColor: "#ef4444",
                                        display: "inline-block",
                                        flexShrink: 0,
                                      }}
                                    />
                                  )}
                                  {item._priority === 2 ||
                                  item._priority === 3 ? (
                                    <span
                                      style={{
                                        width: 5,
                                        height: 5,
                                        borderRadius: "50%",
                                        backgroundColor: "#f59e0b",
                                        display: "inline-block",
                                        flexShrink: 0,
                                      }}
                                    />
                                  ) : null}
                                  {priorityConfig.label}
                                </span>
                              </td>

                              {/* Item name + code */}
                              <td className="px-4 py-2.5 min-w-[160px]">
                                <p
                                  style={{ color: theme.text }}
                                  className="text-sm font-medium leading-tight"
                                >
                                  {item.name}
                                </p>
                                <p
                                  style={{ color: theme.subtext }}
                                  className="text-[11px] font-mono mt-0.5"
                                >
                                  {item.itemCode}
                                </p>
                              </td>

                              {/* Category */}
                              <td className="px-4 py-2.5 whitespace-nowrap">
                                <span
                                  style={{
                                    backgroundColor: catColor.bg,
                                    color: catColor.text,
                                  }}
                                  className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium"
                                >
                                  {CATEGORY_LABELS[item.category] ??
                                    item.category}
                                </span>
                              </td>

                              {/* Stock qty + unit merged */}
                              <td className="px-4 py-2.5 whitespace-nowrap">
                                <span
                                  style={{
                                    color: isOutOfStock
                                      ? "#ef4444"
                                      : isLowStock
                                        ? "#f59e0b"
                                        : theme.text,
                                    fontWeight: 700,
                                  }}
                                  className="text-sm"
                                >
                                  {item.currentStock}
                                </span>
                                <span
                                  style={{ color: theme.subtext }}
                                  className="text-xs ml-1"
                                >
                                  {item.unit}
                                </span>
                              </td>

                              {/* Status badge */}
                              <td className="px-4 py-2.5 whitespace-nowrap">
                                <StockBadge status={item.stockStatus} />
                              </td>

                              {/* Pending requests count */}
                              <td className="px-4 py-2.5 whitespace-nowrap">
                                {item._pendingCount > 0 ? (
                                  <button
                                    onClick={() =>
                                      onNavigate?.("supply_requests")
                                    }
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                                    style={{
                                      backgroundColor: "#fee2e2",
                                      color: "#991b1b",
                                    }}
                                  >
                                    <svg
                                      width="10"
                                      height="10"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth={2.5}
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <circle cx="12" cy="12" r="10" />
                                      <line x1="12" y1="8" x2="12" y2="12" />
                                      <line
                                        x1="12"
                                        y1="16"
                                        x2="12.01"
                                        y2="16"
                                      />
                                    </svg>
                                    {item._pendingCount} pending
                                  </button>
                                ) : (
                                  <span
                                    style={{ color: theme.subtext }}
                                    className="text-xs"
                                  >
                                    —
                                  </span>
                                )}
                              </td>

                              {/* Price */}
                              <td className="px-4 py-2.5 whitespace-nowrap">
                                <span
                                  style={{ color: theme.text }}
                                  className="text-sm"
                                >
                                  ₱{item.pricePerUnit.toLocaleString("en-PH")}
                                </span>
                              </td>

                              {/* Quick actions */}
                              <td className="px-4 py-2.5 whitespace-nowrap text-right">
                                <button
                                  onClick={() => onNavigate?.("inventory")}
                                  style={{
                                    backgroundColor: theme.primary,
                                    color: theme.primaryText,
                                  }}
                                  className="text-[10px] font-medium px-2.5 py-1 rounded-md whitespace-nowrap"
                                >
                                  + Add stock
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div
                    style={{ borderTop: `1px solid ${theme.border}` }}
                    className="px-4 py-2.5 flex items-center justify-between"
                  >
                    <p style={{ color: theme.subtext }} className="text-[11px]">
                      Showing {inventoryPreview.length} items that need action
                    </p>
                    <button
                      onClick={() => onNavigate?.("inventory")}
                      style={{ color: theme.primary }}
                      className="text-xs font-medium hover:underline"
                    >
                      View all {items.length} items →
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Category breakdown */}
            <div
              style={{
                backgroundColor: theme.surface,
                borderColor: theme.border,
              }}
              className="rounded-xl border p-4"
            >
              <SectionHeader
                title="Category breakdown"
                action={() => onNavigate?.("inventory")}
                actionLabel="Full inventory"
                theme={theme}
              />
              <div className="space-y-2.5">
                {categoryBreakdown.map((cat) => {
                  const pct =
                    cat.total > 0
                      ? Math.round((cat.inStock / cat.total) * 100)
                      : 0;
                  const color = CATEGORY_COLORS[cat.category] ?? {
                    bg: "#f1f5f9",
                    text: "#475569",
                  };
                  return (
                    <div key={cat.category}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span
                            style={{
                              backgroundColor: color.bg,
                              color: color.text,
                            }}
                            className="px-2 py-0.5 rounded-md text-[11px] font-medium"
                          >
                            {CATEGORY_LABELS[cat.category] ?? cat.category}
                          </span>
                          <span
                            style={{ color: theme.subtext }}
                            className="text-xs"
                          >
                            {cat.total} items
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          {cat.lowStock > 0 && (
                            <span style={{ color: "#d97706" }}>
                              ⚠ {cat.lowStock} low
                            </span>
                          )}
                          {cat.outOfStock > 0 && (
                            <span style={{ color: "#dc2626" }}>
                              ✕ {cat.outOfStock} out
                            </span>
                          )}
                          <span style={{ color: theme.subtext }}>
                            {pct}% in stock
                          </span>
                        </div>
                      </div>
                      <div
                        style={{
                          backgroundColor: theme.border,
                          height: 6,
                          borderRadius: 99,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${pct}%`,
                            height: "100%",
                            borderRadius: 99,
                            backgroundColor:
                              pct < 40
                                ? "#ef4444"
                                : pct < 70
                                  ? "#f59e0b"
                                  : "#22c55e",
                            transition: "width 0.5s ease",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Right column: pending requests + activity ── */}
          <div className="flex flex-col gap-4 w-[300px] flex-shrink-0">
            {/* Pending supply requests */}
            <div
              style={{
                backgroundColor: theme.surface,
                borderColor: theme.border,
              }}
              className="rounded-xl border p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <h2
                  style={{ color: theme.text }}
                  className="text-sm font-semibold"
                >
                  Pending requests
                </h2>
                <div className="flex items-center gap-2">
                  {kpi.pendingReqs > 0 && (
                    <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {kpi.pendingReqs}
                    </span>
                  )}
                  <button
                    onClick={() => onNavigate?.("supply_requests")}
                    style={{ color: theme.primary }}
                    className="text-xs font-medium hover:underline"
                  >
                    All →
                  </button>
                </div>
              </div>

              {recentRequests.filter(
                (r) =>
                  r.status === "pending" ||
                  r.status === "awaiting_stock" ||
                  r.status === "out_for_delivery",
              ).length === 0 ? (
                <p
                  style={{ color: theme.subtext }}
                  className="text-xs text-center py-4"
                >
                  No pending requests.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {recentRequests
                    .filter(
                      (r) =>
                        r.status === "pending" ||
                        r.status === "awaiting_stock" ||
                        r.status === "out_for_delivery",
                    )
                    .slice(0, 4)
                    .map((r) => {
                      const colors = avatarColor(r.requestedByName);
                      const effStatus = effectiveStatus(r);
                      const firstItem = r.items[0];
                      const extra = r.items.length - 1;
                      const isOutForDelivery = r.status === "out_for_delivery";
                      return (
                        <div key={r.id} className="flex items-start gap-2.5">
                          <div
                            style={{
                              backgroundColor: colors.bg,
                              color: colors.text,
                              width: 28,
                              height: 28,
                              flexShrink: 0,
                            }}
                            className="rounded-full flex items-center justify-center text-[10px] font-bold"
                          >
                            {getInitials(r.requestedByName)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              style={{ color: theme.text }}
                              className="text-xs font-medium"
                            >
                              {r.requestedByName}
                            </p>
                            <p
                              style={{ color: theme.subtext }}
                              className="text-[11px] truncate"
                            >
                              {firstItem?.itemName ?? "—"}
                              {extra > 0 ? ` · +${extra} more` : ""}
                            </p>
                            <span
                              className={`inline-flex mt-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${statusBadgeClass(effStatus)}`}
                            >
                              {statusLabel(effStatus)}
                            </span>
                          </div>
                          {/* Out for delivery: no action buttons, status badge is enough */}
                          {!isOutForDelivery && (
  <button
    onClick={() => onNavigateWithPayload?.({ tab: "supply_requests", approvalRequest: r })}
    style={{
      backgroundColor: theme.primary,
      color: theme.primaryText,
    }}
    className="text-[10px] font-medium px-2 py-1 rounded-md flex-shrink-0"
  >
    Details
  </button>
)}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Recent activity */}
            <div
              style={{
                backgroundColor: theme.surface,
                borderColor: theme.border,
              }}
              className="rounded-xl border p-4"
            >
              <SectionHeader
                title="Recent activity"
                action={() => onNavigate?.("activity")}
                actionLabel="View all"
                theme={theme}
              />

              {recentActivity.length === 0 ? (
                <p
                  style={{ color: theme.subtext }}
                  className="text-xs text-center py-4"
                >
                  No activity yet.
                </p>
              ) : (
                <div className="divide-y" style={{ borderColor: theme.border }}>
                  {recentActivity.map((tx) => {
                    const cfg = ACTION_CONFIG[tx.type] ?? {
                      label: tx.type,
                      bg: "#f1f5f9",
                      text: "#475569",
                      icon: null,
                    };
                    return (
                      <div
                        key={tx.id}
                        className="flex items-start gap-3 py-3 px-1"
                      >
                        {/* Icon circle */}
                        <div
                          style={{
                            backgroundColor: cfg.bg,
                            color: cfg.text,
                            width: 30,
                            height: 30,
                            flexShrink: 0,
                            marginTop: 1,
                          }}
                          className="rounded-full flex items-center justify-center"
                        >
                          {cfg.icon}
                        </div>

                        {/* Text content */}
                        <div className="flex-1 min-w-0 space-y-0.5">
                          {/* Type label + qty badge on same line */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <p
                              style={{ color: theme.text }}
                              className="text-xs font-medium"
                            >
                              {cfg.label}
                            </p>
                            {tx.quantityChange !== 0 && (
                              <span
                                style={{
                                  backgroundColor:
                                    tx.quantityChange > 0
                                      ? "rgba(34,197,94,0.12)"
                                      : "rgba(239,68,68,0.12)",
                                  color:
                                    tx.quantityChange > 0
                                      ? "#16a34a"
                                      : "#dc2626",
                                }}
                                className="inline-block px-1.5 py-px rounded text-[11px] font-medium leading-tight"
                              >
                                {tx.quantityChange > 0 ? "+" : ""}
                                {tx.quantityChange}
                              </span>
                            )}
                          </div>

                          {/* Item name + code */}
                          <p
                            style={{ color: theme.subtext }}
                            className="text-[11px] truncate"
                          >
                            {tx.itemName}
                            {tx.itemCode ? (
                              <span
                                style={{
                                  backgroundColor: theme.bgActive,
                                  color: theme.subtext,
                                  borderColor: theme.border,
                                }}
                                className="inline-block ml-1.5 px-1.5 py-px rounded border font-mono text-[10px]"
                              >
                                {tx.itemCode}
                              </span>
                            ) : null}
                          </p>

                          {/* Date + performer */}
                          <p
                            style={{ color: theme.subtext }}
                            className="text-[10px]"
                          >
                            {formatDateTime(tx.createdAt)} ·{" "}
                            {tx.performedByName}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <PartialApprovalModal
  visible={approvalRequest !== null}
  request={approvalRequest}
  onClose={() => setApprovalRequest(null)}
  onApproveAll={async (req) => { /* your handler */ }}
  onApprovePartial={async (requestId, lines) => { /* your handler */ }}
  onReject={async (requestId) => { /* your reject service call here */ }}
  theme={theme}
/>
    </div>
  );
}
