// app/Admin/OfficeInventory/MonthlyReportPage.tsx
//
// Changes from original:
//  1. Added import of exportMonthlyReportPdf
//  2. exportCsv kept but both buttons now call exportMonthlyReportPdf (allRows variant & filtered variant)
//  3. "CSV" button renamed "Export PDF", "Print / PDF" button wires to same export but for all categories
//  4. A loading/generating state is shown while the PDF is being built
//  5. No other logic changes — all existing data fetching & computation is untouched

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useTheme } from "../../../theme/ThemeContext";
import { ADUser } from "../../../types";
import {
  getAllInventoryItems,
  getAllStockTransactions,
} from "../../../Services/officeInventory";
import { OfficeInventoryItem, StockTransaction } from "../../../types";
import { exportMonthlyReportPdf } from "../../../Services/exportMonthlyReportPdf";

// ─── Types ────────────────────────────────────────────────────────────────────

type CategoryTab = "office_supplies" | "cleaning" | "ppe" | "medicine";

type MonthlyItemRow = {
  id: string;
  itemCode: string;
  name: string;
  brand: string;
  category: string;
  unit: string;
  pricePerUnit: number;
  beginningInventory: number;
  totalConsumed: number;
  consumptionAmount: number;
  totalDelivered: number;
  deliveryAmount: number;
  endingInventory: number;
  activityDots: { type: "consumed" | "delivered" | "none"; date: string }[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_TABS: { label: string; value: CategoryTab | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Office supplies", value: "office_supplies" },
  { label: "Cleaning", value: "cleaning" },
  { label: "PPE", value: "ppe" },
  { label: "Medicine", value: "medicine" },
];

const CATEGORY_MAP: Record<string, string> = {
  office_supplies: "Office Supplies",
  cleaning: "Cleaning",
  ppe: "PPE",
  medicine: "Medicine",
};

function formatPeso(amount: number): string {
  return `₱${Math.abs(amount).toLocaleString("en-PH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function getYYYYMM(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function parseYYYYMM(yyyymm: string): { year: number; month: number } {
  const [y, m] = yyyymm.split("-").map(Number);
  return { year: y, month: m };
}

function monthLabel(yyyymm: string): string {
  const { year, month } = parseYYYYMM(yyyymm);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function prevMonth(yyyymm: string): string {
  const { year, month } = parseYYYYMM(yyyymm);
  const d = new Date(year, month - 2, 1);
  return getYYYYMM(d);
}

function nextMonth(yyyymm: string): string {
  const { year, month } = parseYYYYMM(yyyymm);
  const d = new Date(year, month, 1);
  return getYYYYMM(d);
}

function isCurrentOrFuture(yyyymm: string): boolean {
  return yyyymm >= getYYYYMM(new Date());
}

function buildActivityDots(
  txs: StockTransaction[],
  yyyymm: string,
): { type: "consumed" | "delivered" | "none"; date: string }[] {
  const { year, month } = parseYYYYMM(yyyymm);
  const daysInMonth = new Date(year, month, 0).getDate();
  const dots: { type: "consumed" | "delivered" | "none"; date: string }[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const dayStr = `${yyyymm}-${String(d).padStart(2, "0")}`;
    const dayTxs = txs.filter(
      (tx) => (tx.transactionDate ?? tx.createdAt?.slice(0, 10)) === dayStr,
    );
    const hasDelivery = dayTxs.some((tx) => tx.type === "delivery");
    const hasConsumed = dayTxs.some(
      (tx) =>
        tx.type === "manual_adjustment" ||
        tx.type === "supply_request_fulfilled" ||
        tx.type === "ticket_deduction",
    );
    if (hasDelivery) dots.push({ type: "delivered", date: dayStr });
    else if (hasConsumed) dots.push({ type: "consumed", date: dayStr });
    else dots.push({ type: "none", date: dayStr });
  }
  return dots;
}

// ─── Activity Sparkline ───────────────────────────────────────────────────────

function ActivitySparkline({
  dots,
  theme,
}: {
  dots: { type: "consumed" | "delivered" | "none"; date: string }[];
  theme: any;
}) {
  return (
    <div className="flex items-center gap-[2px] flex-wrap" style={{ maxWidth: 220 }}>
      {dots.map((dot, i) => (
        <span
          key={i}
          title={dot.date}
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            flexShrink: 0,
            backgroundColor:
              dot.type === "delivered"
                ? "#3b82f6"
                : dot.type === "consumed"
                ? "#94a3b8"
                : theme.border,
            opacity: dot.type === "none" ? 0.4 : 1,
          }}
        />
      ))}
    </div>
  );
}

// ─── KPI Cards ────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  valueColor,
  theme,
}: {
  label: string;
  value: string;
  sub?: string;
  valueColor?: string;
  theme: any;
}) {
  return (
    <div
      style={{
        backgroundColor: theme.surface,
        borderColor: theme.border,
        flex: 1,
        minWidth: 160,
      }}
      className="rounded-xl border p-4"
    >
      <p
        style={{ color: theme.subtext }}
        className="text-[10px] font-semibold uppercase tracking-wide mb-1"
      >
        {label}
      </p>
      <p
        style={{ color: valueColor ?? theme.text }}
        className="text-2xl font-bold leading-none mb-1"
      >
        {value}
      </p>
      {sub && (
        <p style={{ color: theme.subtext }} className="text-xs mt-1">
          {sub}
        </p>
      )}
    </div>
  );
}

// ─── Month Selector ───────────────────────────────────────────────────────────

function MonthSelector({
  value,
  onChange,
  theme,
}: {
  value: string;
  onChange: (v: string) => void;
  theme: any;
}) {
  const options: string[] = [];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push(getYYYYMM(d));
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onChange(prevMonth(value))}
        style={{
          backgroundColor: theme.surface,
          borderColor: theme.border,
          color: theme.text,
        }}
        className="w-8 h-9 flex items-center justify-center rounded-lg border text-sm"
      >
        ‹
      </button>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          backgroundColor: theme.surface,
          borderColor: theme.border,
          color: theme.text,
        }}
        className="h-9 px-3 text-sm font-medium border rounded-lg focus:outline-none"
      >
        {options.map((m) => (
          <option key={m} value={m}>
            {monthLabel(m)}
          </option>
        ))}
      </select>
      <button
        onClick={() => onChange(nextMonth(value))}
        disabled={isCurrentOrFuture(nextMonth(value))}
        style={{
          backgroundColor: theme.surface,
          borderColor: theme.border,
          color: theme.text,
          opacity: isCurrentOrFuture(nextMonth(value)) ? 0.35 : 1,
        }}
        className="w-8 h-9 flex items-center justify-center rounded-lg border text-sm"
      >
        ›
      </button>
    </div>
  );
}

// ─── PDF Export Icon ──────────────────────────────────────────────────────────

function IconPdf() {
  return (
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
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function IconPrint() {
  return (
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
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Props = { user?: ADUser };

export default function MonthlyReportPage({ user }: Props) {
  const { theme } = useTheme();

  const [selectedMonth, setSelectedMonth] = useState<string>(getYYYYMM(new Date()));
  const [activeTab, setActiveTab] = useState<CategoryTab | "all">("all");
  const [items, setItems] = useState<OfficeInventoryItem[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [inv, txs] = await Promise.all([
        getAllInventoryItems(),
        getAllStockTransactions(),
      ]);
      setItems(inv);
      setTransactions(txs);
    } catch (err) {
      console.error("Failed to load report data:", err);
      setError("Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Compute monthly rows ──────────────────────────────────────────────────
  const monthlyRows = useMemo((): MonthlyItemRow[] => {
    console.log("first item raw:", JSON.stringify(items[0]));
    const { year, month } = parseYYYYMM(selectedMonth);
    const startISO = new Date(year, month - 1, 1).toISOString().slice(0, 10);
    const endISO   = new Date(year, month, 0).toISOString().slice(0, 10);

    const monthTxs = transactions.filter((tx) => {
      const d = tx.transactionDate ?? tx.createdAt?.slice(0, 10) ?? "";
      return d >= startISO && d <= endISO;
    });
 console.log("sample tx totalAmount:", transactions[0]?.totalAmount, typeof transactions[0]?.totalAmount);
    return items.map((item) => {
      const monthForItem = monthTxs.filter((tx) => tx.itemId === item.id);

      const sumFromStart = transactions
        .filter((tx) => {
          const d = tx.transactionDate ?? tx.createdAt?.slice(0, 10) ?? "";
          return d >= startISO && tx.itemId === item.id;
        })
        .reduce((acc, tx) => acc + tx.quantityChange, 0);

      const beginningInventory = Math.max(0, item.currentStock - sumFromStart);

      const totalConsumed = monthForItem
        .filter(
          (tx) =>
            tx.type === "manual_adjustment" ||
            tx.type === "supply_request_fulfilled" ||
            tx.type === "ticket_deduction",
        )
        .reduce((acc, tx) => acc + Math.abs(tx.quantityChange), 0);

      const consumptionAmount = monthForItem
        .filter(
          (tx) =>
            tx.type === "manual_adjustment" ||
            tx.type === "supply_request_fulfilled" ||
            tx.type === "ticket_deduction",
        )
        .reduce((acc, tx) => acc + Number(tx.totalAmount), 0);

      const totalDelivered = monthForItem
        .filter((tx) => tx.type === "delivery")
        .reduce((acc, tx) => acc + tx.quantityChange, 0);

      const deliveryAmount = monthForItem
        .filter((tx) => tx.type === "delivery")
        .reduce((acc, tx) => acc + Number(tx.totalAmount), 0);

      const endingInventory = beginningInventory - totalConsumed + totalDelivered;
      const activityDots    = buildActivityDots(monthForItem, selectedMonth);

      return {
        id: item.id,
        itemCode: item.itemCode,
        name: item.name,
        brand: item.brand ?? "",
        category: item.category,
        unit: item.unit,
        pricePerUnit: item.pricePerUnit,
        beginningInventory,
        totalConsumed,
        consumptionAmount,
        totalDelivered,
        deliveryAmount,
        endingInventory,
        activityDots,
      };
    });
  }, [items, transactions, selectedMonth]);

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { all: monthlyRows.length };
    monthlyRows.forEach((r) => {
      counts[r.category] = (counts[r.category] ?? 0) + 1;
    });
    return counts;
  }, [monthlyRows]);

  const filteredRows = useMemo(() => {
    const rows = activeTab === "all"
      ? monthlyRows
      : monthlyRows.filter((r) => r.category === activeTab);
    return [...rows].sort((a, b) => a.name.localeCompare(b.name));
  }, [monthlyRows, activeTab]);

  const kpi = useMemo(() => {
    const totalConsumptionValue = monthlyRows.reduce((s, r) => s + r.consumptionAmount, 0);
    const totalDeliveryValue    = monthlyRows.reduce((s, r) => s + r.deliveryAmount, 0);
    const itemsConsumed         = monthlyRows.filter((r) => r.totalConsumed > 0).length;
    const netStockChange        = totalDeliveryValue - totalConsumptionValue;
    return { totalConsumptionValue, totalDeliveryValue, itemsConsumed, netStockChange };
  }, [monthlyRows]);

  const tabTotals = useMemo(() => {
    const totalConsumedP  = filteredRows.reduce((s, r) => s + r.consumptionAmount, 0);
    const totalDeliveredP = filteredRows.reduce((s, r) => s + r.deliveryAmount, 0);
    return { totalConsumedP, totalDeliveredP };
  }, [filteredRows]);

  // ── PDF export handler ────────────────────────────────────────────────────
  // "Export PDF" exports only the currently visible tab (filtered).
  // "Print / PDF" always exports ALL categories (full report).
  const handleExportPdf = useCallback(
    async (exportAll: boolean) => {
      if (generating) return;
      setGenerating(true);
      try {
        const rows = exportAll ? monthlyRows : filteredRows;
        await exportMonthlyReportPdf(rows, selectedMonth);
      } catch (err) {
        console.error("PDF generation failed:", err);
      } finally {
        setGenerating(false);
      }
    },
    [generating, monthlyRows, filteredRows, selectedMonth],
  );

  // ── Button shared style helper ────────────────────────────────────────────
  const btnStyle = {
    backgroundColor: theme.surface,
    color: theme.text,
    borderColor: theme.border,
  };

  return (
    <div
      style={{ backgroundColor: theme.background }}
      className="flex flex-col h-full overflow-hidden"
    >
      {/* ── Header ── */}
      <div className="flex-shrink-0 px-4 pt-4 pb-0">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 style={{ color: theme.text }} className="text-2xl font-bold leading-tight">
              Monthly consumables report
            </h1>
            <p style={{ color: theme.subtext }} className="text-xs mt-0.5">
              Generated{" "}
              {new Date().toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
              {user ? ` · ${user.displayName}` : ""}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <MonthSelector value={selectedMonth} onChange={setSelectedMonth} theme={theme} />

            {/* ── Export PDF (current tab / filtered) ── */}
            <button
              onClick={() => handleExportPdf(false)}
              disabled={filteredRows.length === 0 || generating}
              style={btnStyle}
              className="flex items-center gap-1.5 h-9 px-3 text-sm font-medium rounded-lg border disabled:opacity-50 whitespace-nowrap relative"
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.bgHover)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = theme.surface)}
              title={
                activeTab === "all"
                  ? "Export all categories as PDF"
                  : `Export ${CATEGORY_MAP[activeTab] ?? activeTab} as PDF`
              }
            >
              {generating ? (
                <>
                  <svg
                    className="animate-spin"
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                  Generating…
                </>
              ) : (
                <>
                  <IconPdf />
                  Export PDF
                </>
              )}
            </button>

            {/* ── Print / Full PDF (always all categories) ── */}
            <button
              onClick={() => handleExportPdf(true)}
              disabled={monthlyRows.length === 0 || generating}
              style={btnStyle}
              className="flex items-center gap-1.5 h-9 px-3 text-sm font-medium rounded-lg border disabled:opacity-50 whitespace-nowrap"
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.bgHover)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = theme.surface)}
              title="Download full report PDF (all categories)"
            >
              <IconPrint />
              Print / PDF
            </button>
          </div>
        </div>

        {/* ── KPI Cards ── */}
        {!loading && (
          <div className="flex gap-3 mb-4 flex-wrap">
            <KpiCard
              label="Total Consumption Value"
              value={formatPeso(kpi.totalConsumptionValue)}
              sub="Office + Cleaning + PPE + Medicine"
              theme={theme}
            />
            <KpiCard
              label="Total Delivery Value"
              value={formatPeso(kpi.totalDeliveryValue)}
              sub="Restocked this month"
              valueColor="#16a34a"
              theme={theme}
            />
            <KpiCard
              label="Items Consumed"
              value={String(kpi.itemsConsumed)}
              sub="Unique items moved"
              theme={theme}
            />
            <KpiCard
              label="Net Stock Change"
              value={`${kpi.netStockChange >= 0 ? "+" : "−"}${formatPeso(kpi.netStockChange)}`}
              sub="Consumed minus restocked"
              valueColor={kpi.netStockChange >= 0 ? "#16a34a" : "#dc2626"}
              theme={theme}
            />
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs px-3 py-2 mb-3">
            ⚠ {error}
          </div>
        )}

        {/* Generating banner */}
        {generating && (
          <div
            style={{ backgroundColor: theme.surface, borderColor: theme.border }}
            className="rounded-lg border px-3 py-2 mb-3 flex items-center gap-2 text-xs"
          >
            <svg
              className="animate-spin"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              style={{ color: theme.primary }}
            >
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            <span style={{ color: theme.text }}>
              Building PDF report — this may take a moment…
            </span>
          </div>
        )}

        {/* ── Category tabs ── */}
        <div
          style={{ borderBottom: `1px solid ${theme.border}` }}
          className="flex items-end gap-0 -mb-px overflow-x-auto"
        >
          {CATEGORY_TABS.map((tab) => {
            const isActive = activeTab === tab.value;
            const count    = tabCounts[tab.value] ?? 0;
            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                style={{
                  color: isActive ? theme.primary : theme.subtext,
                  borderBottom: isActive
                    ? `2px solid ${theme.primary}`
                    : "2px solid transparent",
                  backgroundColor: "transparent",
                  flexShrink: 0,
                }}
                className="px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors focus:outline-none"
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.color = theme.text;
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.color = theme.subtext;
                }}
              >
                {tab.label}
                <span
                  style={{
                    backgroundColor: isActive ? theme.primary : theme.inputBg,
                    color: isActive ? theme.primaryText : theme.subtext,
                  }}
                  className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div className="flex flex-1 items-center justify-center py-20">
          <div
            style={{ borderColor: theme.primary }}
            className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
          />
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-20">
          <p style={{ color: theme.subtext }} className="text-sm">
            No data for this period.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto overflow-x-auto px-4 pb-4">
          <table
            className="min-w-full text-sm"
            style={{ borderCollapse: "separate", borderSpacing: 0 }}
          >
            <thead>
              <tr>
                {[
                  { label: "ITEM", align: "left" },
                  { label: "BEG. INVTY", align: "right" },
                  { label: "ACTIVITY", align: "left" },
                  { label: "CONSUMED", align: "right" },
                  { label: "CONSUMED ₱", align: "right" },
                  { label: "DELIVERED", align: "right" },
                  { label: "DELIVERY ₱", align: "right" },
                  { label: "END INVTY", align: "right" },
                ].map(({ label, align }) => (
                  <th
                    key={label}
                    style={{
                      color: theme.subtext,
                      borderBottom: `1px solid ${theme.border}`,
                      backgroundColor: theme.surfaceRaised,
                      position: "sticky",
                      top: 0,
                      zIndex: 10,
                      textAlign: align as any,
                    }}
                    className="px-3 py-2 text-xs font-semibold uppercase tracking-wide whitespace-nowrap"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, index) => (
                <tr
                  key={row.id}
                  style={{
                    backgroundColor:
                      index % 2 === 0 ? theme.surface : theme.background,
                    borderBottom: `1px solid ${theme.border}`,
                  }}
                >
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <div>
                      <p style={{ color: theme.text }} className="text-sm font-medium">
                        {row.name}
                      </p>
                      <p style={{ color: theme.subtext }} className="text-[11px]">
                        {formatPeso(row.pricePerUnit)}
                      </p>
                    </div>
                  </td>

                  <td className="px-3 py-2.5 whitespace-nowrap text-right">
                    <span style={{ color: theme.text }} className="text-sm font-medium">
                      {row.beginningInventory}
                    </span>
                  </td>

                  <td className="px-3 py-2.5" style={{ minWidth: 220 }}>
                    <ActivitySparkline dots={row.activityDots} theme={theme} />
                  </td>

                  <td className="px-3 py-2.5 whitespace-nowrap text-right">
                    <span
                      style={{
                        color: row.totalConsumed > 0 ? "#dc2626" : theme.subtext,
                      }}
                      className="text-sm font-semibold"
                    >
                      {row.totalConsumed > 0 ? `-${row.totalConsumed}` : "0"}
                    </span>
                  </td>

                  <td className="px-3 py-2.5 whitespace-nowrap text-right">
                    <span
                      style={{
                        color:
                          row.consumptionAmount > 0 ? "#dc2626" : theme.subtext,
                      }}
                      className="text-sm"
                    >
                      {row.consumptionAmount > 0
                        ? formatPeso(row.consumptionAmount)
                        : "—"}
                    </span>
                  </td>

                  <td className="px-3 py-2.5 whitespace-nowrap text-right">
                    <span
                      style={{
                        color: row.totalDelivered > 0 ? "#16a34a" : theme.subtext,
                      }}
                      className="text-sm font-semibold"
                    >
                      {row.totalDelivered > 0 ? `+${row.totalDelivered}` : "0"}
                    </span>
                  </td>

                  <td className="px-3 py-2.5 whitespace-nowrap text-right">
                    <span
                      style={{
                        color:
                          row.deliveryAmount > 0 ? "#16a34a" : theme.subtext,
                      }}
                      className="text-sm"
                    >
                      {row.deliveryAmount > 0
                        ? formatPeso(row.deliveryAmount)
                        : "—"}
                    </span>
                  </td>

                  <td className="px-3 py-2.5 whitespace-nowrap text-right">
                    <span
                      style={{
                        color:
                          row.endingInventory === 0
                            ? "#dc2626"
                            : row.endingInventory <= 5
                            ? "#d97706"
                            : theme.text,
                      }}
                      className="text-sm font-semibold"
                    >
                      {row.endingInventory}
                    </span>
                  </td>
                </tr>
              ))}

              {/* ── Footer totals row ── */}
              <tr
                style={{
                  backgroundColor: theme.surfaceRaised,
                  borderTop: `2px solid ${theme.border}`,
                  position: "sticky",
                  bottom: 0,
                }}
              >
                <td colSpan={3} className="px-3 py-2.5" />
                <td className="px-3 py-2.5 text-right">
                  <span style={{ color: "#dc2626" }} className="text-sm font-bold">
                    -{filteredRows.reduce((s, r) => s + r.totalConsumed, 0)}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right">
                  <span style={{ color: "#dc2626" }} className="text-sm font-bold">
                    {formatPeso(tabTotals.totalConsumedP)}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right">
                  <span style={{ color: "#16a34a" }} className="text-sm font-bold">
                    +{filteredRows.reduce((s, r) => s + r.totalDelivered, 0)}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right">
                  <span style={{ color: "#16a34a" }} className="text-sm font-bold">
                    {tabTotals.totalDeliveredP > 0
                      ? formatPeso(tabTotals.totalDeliveredP)
                      : "—"}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right" />
              </tr>
            </tbody>
          </table>

          {/* ── Activity legend ── */}
          <div className="flex items-center gap-4 mt-3 px-1">
            <span
              style={{ color: theme.subtext }}
              className="text-[11px] font-medium uppercase tracking-wide"
            >
              Activity legend:
            </span>
            <div className="flex items-center gap-1.5">
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  backgroundColor: "#3b82f6",
                  display: "inline-block",
                }}
              />
              <span style={{ color: theme.subtext }} className="text-[11px]">
                Delivery
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  backgroundColor: "#94a3b8",
                  display: "inline-block",
                }}
              />
              <span style={{ color: theme.subtext }} className="text-[11px]">
                Consumed
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  backgroundColor: "#e2e8f0",
                  display: "inline-block",
                }}
              />
              <span style={{ color: theme.subtext }} className="text-[11px]">
                No activity
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
