import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  getAllInventoryItems,
  archiveInventoryItem,
} from "../../../Services/officeInventory";
import {
  OfficeInventoryItem,
  OfficeCategory,
  StockStatus,
} from "../../../types";
import { useTheme } from "../../../theme/ThemeContext";
import BadgeSelect from "../../../components/common/BadgeSelect";
import {
  useTableFilter,
  TableFilterButton,
  TableFilterPanel,
} from "../../../components/common/TableFilterPanel";
import AuditTrailModal from "../../../components/common/AuditTrailModal";
import AddItemModal from "./Modal/AddItemModal";
import EditItemModal from "./Modal/EditItemModal";
import AdjustStockModal from "./Modal/AdjustStockModal";
import AddDeliveryModal from "./Modal/AddDeliveryModal";

// NOTE ON PATHS: import depths above assume this file lives at the same
// folder depth as your existing ITInventoryPage.tsx. Adjust the "../"
// counts to match wherever you drop this module in.

// ─── Dropdown options ───────────────────────────────────────────────────

const CATEGORY_OPTIONS = [
  {
    label: "Office Supplies",
    value: "office_supplies",
    badgeClass:
      "bg-blue-100 text-blue-800 inline-flex justify-center min-w-[120px] px-2 py-1 rounded-lg text-sm font-medium",
    bgColor: "#dbeafe",
    textColor: "#1e40af",
  },
  {
    label: "Printer Supplies",
    value: "printer_supplies",
    badgeClass:
      "bg-slate-100 text-slate-800 inline-flex justify-center min-w-[120px] px-2 py-1 rounded-lg text-sm font-medium",
    bgColor: "#f1f5f9",
    textColor: "#1e293b",
  },
  {
    label: "Cleaning",
    value: "cleaning",
    badgeClass:
      "bg-violet-100 text-violet-800 inline-flex justify-center min-w-[120px] px-2 py-1 rounded-lg text-sm font-medium",
    bgColor: "#ede9fe",
    textColor: "#5b21b6",
  },
  {
    label: "PPE",
    value: "ppe",
    badgeClass:
      "bg-pink-100 text-pink-800 inline-flex justify-center min-w-[120px] px-2 py-1 rounded-lg text-sm font-medium",
    bgColor: "#fce7f3",
    textColor: "#9d174d",
  },
  {
    label: "Medicine",
    value: "medicine",
    badgeClass:
      "bg-teal-100 text-teal-800 inline-flex justify-center min-w-[120px] px-2 py-1 rounded-lg text-sm font-medium",
    bgColor: "#ccfbf1",
    textColor: "#115e59",
  },
];

const STATUS_FILTER_OPTIONS = [
  { label: "In Stock", value: "in_stock", badgeClass: "" },
  { label: "Low Stock", value: "low_stock", badgeClass: "" },
  { label: "Out of Stock", value: "out_of_stock", badgeClass: "" },
];

const CATEGORY_LABELS: Record<OfficeCategory, string> = {
  office_supplies: "Office Supplies",
  printer_supplies: "Printer Supplies",
  cleaning: "Cleaning",
  ppe: "PPE",
  medicine: "Medicine",
};

// ─── Sort helpers ─────────────────────────────────────────────────────────

type SortDir = "asc" | "desc" | "default";

type InventorySortKey =
  | "itemCode"
  | "name"
  | "brand"
  | "category"
  | "unit"
  | "currentStock"
  | "stockStatus"
  | "pricePerUnit";

const STATUS_ORDER: Record<StockStatus, number> = {
  in_stock: 0,
  low_stock: 1,
  out_of_stock: 2,
};

function cycleDir(current: SortDir): SortDir {
  if (current === "default") return "asc";
  if (current === "asc") return "desc";
  return "default";
}

const TABLE_HEADERS: { label: string; key: InventorySortKey }[] = [
  { label: "Item Code", key: "itemCode" },
  { label: "Item Name", key: "name" },
  { label: "Brand", key: "brand" },
  { label: "Category", key: "category" },
  { label: "Unit", key: "unit" },
  { label: "Stock", key: "currentStock" },
  { label: "Status", key: "stockStatus" },
  { label: "Price/Unit", key: "pricePerUnit" },
];

const SortIcon = ({ dir }: { dir: SortDir }) => {
  if (dir === "asc") return <span className="ml-1 text-blue-500">▲</span>;
  if (dir === "desc") return <span className="ml-1 text-blue-500">▼</span>;
  return <span className="ml-1 text-gray-300">▲▼</span>;
};

const normalizeValue = (value: any) => {
  if (value == null) return "";
  if (typeof value === "number") return value;
  return String(value).toLowerCase();
};

const formatPeso = (amount: number) =>
  `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

// ─── Status badge (read-only — auto computed, not user-editable) ─────────

const StockStatusBadge = ({ status }: { status: StockStatus }) => {
  const map: Record<
    StockStatus,
    { bg: string; text: string; dot: string; label: string }
  > = {
    in_stock: {
      bg: "#dcfce7",
      text: "#166534",
      dot: "#22c55e",
      label: "In Stock",
    },
    low_stock: {
      bg: "#fef3c7",
      text: "#92400e",
      dot: "#f59e0b",
      label: "Low Stock",
    },
    out_of_stock: {
      bg: "#fee2e2",
      text: "#991b1b",
      dot: "#ef4444",
      label: "Out of Stock",
    },
  };
  const s = map[status];
  return (
    <span
      style={{ backgroundColor: s.bg, color: s.text }}
      className="inline-flex items-center gap-1.5 min-w-[100px] justify-center px-2 py-1 rounded-lg text-xs font-medium whitespace-nowrap"
    >
      <span
        style={{
          backgroundColor: s.dot,
          width: 6,
          height: 6,
          borderRadius: "50%",
        }}
      />
      {s.label}
    </span>
  );
};

// ─── Small inline icon buttons ─────────────────────────────────────────────

const IconBtn = ({
  title,
  onClick,
  disabled,
  children,
}: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) => {
  const { theme } = useTheme();
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      style={{
        borderColor: theme.border,
        color: theme.text,
        opacity: disabled ? 0.35 : 1,
      }}
      className="w-7 h-7 flex items-center justify-center rounded-md border transition-colors"
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.backgroundColor = theme.bgHover;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "transparent";
      }}
    >
      {children}
    </button>
  );
};

const MinusIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" d="M5 12h14" />
  </svg>
);
const PlusIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" d="M12 5v14M5 12h14" />
  </svg>
);
const EditIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M11 4h4M16.5 3.5a1.5 1.5 0 0 1 2.12 2.12L8 16.25 4 17l.75-4L15.38 2.38a1.5 1.5 0 0 1 1.12-.38z"
    />
  </svg>
);
const TrashIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 7h16M9 7V4h6v3m-7 0 1 13h8l1-13"
    />
  </svg>
);

// ─── Page ─────────────────────────────────────────────────────────────────

export type InventoryFilter = {
  field: keyof OfficeInventoryItem;
  value: string;
} | null;

type Props = {
  initialFilter?: InventoryFilter;
  isSuperAdmin?: boolean;
};

const OfficeInventoryPage: React.FC<Props> = ({
  initialFilter = null,
  isSuperAdmin = false,
}) => {
  const { theme } = useTheme();

  const inventoryFilter = useTableFilter({
    fields: [
      { key: "category", label: "Category", options: CATEGORY_OPTIONS },
      { key: "stockStatus", label: "Status", options: STATUS_FILTER_OPTIONS },
    ],
    showDateRange: false,
  });

  const [data, setData] = useState<OfficeInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] =
    useState<InventoryFilter>(initialFilter);
  const [sortKey, setSortKey] = useState<InventorySortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("default");

  const [addVisible, setAddVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<OfficeInventoryItem | null>(
    null,
  );
  const [adjustTarget, setAdjustTarget] = useState<OfficeInventoryItem | null>(
    null,
  );
  const [deliverTarget, setDeliverTarget] =
    useState<OfficeInventoryItem | null>(null);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [deliverModalOpen, setDeliverModalOpen] = useState(false);
  const [auditModal, setAuditModal] = useState<{
    recordId?: string;
    recordLabel?: string;
  } | null>(null);
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAllInventoryItems();
      console.log("[fetchData] got", result.length, "items", result); // ← add
      setData(result);
    } catch (err) {
      console.error("Unable to load office inventory", err); // already there
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleArchive = useCallback(
    async (id: string) => {
      await archiveInventoryItem(id);
      fetchData();
    },
    [fetchData],
  );

  const dirFor = (key: InventorySortKey): SortDir =>
    sortKey === key ? sortDir : "default";

  // ─── Filtered + sorted items ─────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let result = activeFilter
      ? data.filter(
          (item) => (item[activeFilter.field] ?? "") === activeFilter.value,
        )
      : data;

    result = inventoryFilter.applyToData(result, {
      category: "category",
      stockStatus: "stockStatus",
    });

    if (!q) return result;
    return result.filter((item) =>
      [item.itemCode, item.name, item.brand, CATEGORY_LABELS[item.category]]
        .map((v) => (v ?? "").toString().toLowerCase())
        .some((v) => v.includes(q)),
    );
  }, [data, activeFilter, inventoryFilter.appliedFilters, search]);

  const sortedFiltered = useMemo(() => {
    if (!sortKey || sortDir === "default") return filtered;
    return [...filtered].sort((a, b) => {
      const aVal =
        sortKey === "stockStatus"
          ? STATUS_ORDER[a.stockStatus]
          : normalizeValue(a[sortKey]);
      const bVal =
        sortKey === "stockStatus"
          ? STATUS_ORDER[b.stockStatus]
          : normalizeValue(b[sortKey]);
      const cmp =
        typeof aVal === "number" && typeof bVal === "number"
          ? aVal - bVal
          : aVal < bVal
            ? -1
            : aVal > bVal
              ? 1
              : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const handleSort = useCallback(
    (key: InventorySortKey) => {
      if (sortKey !== key) {
        setSortKey(key);
        setSortDir("asc");
      } else {
        const next = cycleDir(sortDir);
        setSortDir(next);
        if (next === "default") setSortKey(null);
      }
    },
    [sortKey, sortDir],
  );

  const renderTableHead = useCallback(
    () => (
      <thead>
        <tr>
          {TABLE_HEADERS.map(({ label, key }) => (
            <th
              key={key}
              onClick={() => handleSort(key)}
              style={{
                color: theme.subtext,
                borderColor: theme.border,
                backgroundColor: theme.surfaceRaised,
                position: "sticky",
                top: 0,
                zIndex: 10,
              }}
              className="px-3 py-1 text-left text-xs font-medium uppercase tracking-wide whitespace-nowrap border-b cursor-pointer select-none transition-colors"
              onMouseEnter={(e) => (e.currentTarget.style.color = theme.text)}
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = theme.subtext)
              }
            >
              <span className="inline-flex items-center gap-1">
                {label}
                <SortIcon dir={dirFor(key)} />
              </span>
            </th>
          ))}
          <th
            style={{
              color: theme.subtext,
              borderColor: theme.border,
              backgroundColor: theme.surfaceRaised,
              position: "sticky",
              top: 0,
              zIndex: 10,
            }}
            className="px-3 py-1 text-left text-xs font-medium uppercase tracking-wide whitespace-nowrap border-b"
          >
            Actions
          </th>
        </tr>
      </thead>
    ),
    [theme, sortKey, sortDir, handleSort],
  );

  const renderTableBody = useCallback(
    (rowItems: OfficeInventoryItem[]) =>
      rowItems.map((item, index) => (
        <tr
          key={item.id}
          style={{
            backgroundColor: index % 2 === 0 ? theme.surface : theme.background,
            borderBottom: `1px solid ${theme.border}`,
          }}
        >
          <td className="px-3 py-1.5 min-w-[90px]">
            <span style={{ color: theme.subtext }} className="text-xs">
              {item.itemCode}
            </span>
          </td>

          <td className="px-3 py-1.5 min-w-[160px]">
            <span style={{ color: theme.text }} className="text-sm font-medium">
              {item.name}
            </span>
          </td>

          <td className="px-3 py-1.5 min-w-[110px]">
            <span style={{ color: theme.text }} className="text-sm">
              {item.brand || "—"}
            </span>
          </td>

          <td className="px-3 py-1.5 min-w-[150px]">
            <BadgeSelect
              value={item.category}
              displayName={CATEGORY_LABELS[item.category]}
              options={CATEGORY_OPTIONS}
              placeholder="—"
              onChange={() => {
                // Category changes go through Edit Item for now so price/
                // threshold context stays together — wire directly if you'd
                // rather allow inline changes.
                setEditTarget(item);
              }}
            />
          </td>

          <td className="px-3 py-1.5 min-w-[80px]">
            <span style={{ color: theme.subtext }} className="text-sm">
              {item.unit}
            </span>
          </td>

          <td className="px-3 py-1.5 min-w-[70px]">
            <span
              style={{
                color:
                  item.stockStatus === "out_of_stock"
                    ? "#ef4444"
                    : item.stockStatus === "low_stock"
                      ? "#f59e0b"
                      : theme.text,
              }}
              className="text-sm font-semibold"
            >
              {item.currentStock}
            </span>
          </td>

          <td className="px-3 py-1.5 min-w-[120px]">
            <StockStatusBadge status={item.stockStatus} />
          </td>

          <td className="px-3 py-1.5 min-w-[100px]">
            <span style={{ color: theme.text }} className="text-sm">
              {formatPeso(item.pricePerUnit)}
            </span>
          </td>

          <td className="px-3 py-1.5 min-w-[170px]">
            <div className="flex gap-1.5">
              <IconBtn
                title="Adjust stock"
                disabled={item.currentStock === 0}
                onClick={() => {
                  setAdjustTarget(item);
                  setAdjustModalOpen(true);
                }}
              >
                <MinusIcon />
              </IconBtn>
              <IconBtn
                title="Add delivery"
                onClick={() => {
                  setDeliverTarget(item);
                  setDeliverModalOpen(true);
                }}
              >
                <PlusIcon />
              </IconBtn>
              <IconBtn title="Edit item" onClick={() => setEditTarget(item)}>
                <EditIcon />
              </IconBtn>
              <IconBtn
                title="Archive item"
                onClick={() => handleArchive(item.id)}
              >
                <TrashIcon />
              </IconBtn>
            </div>
          </td>
        </tr>
      )),
    [theme, handleArchive],
  );

  return (
    <div
      style={{ backgroundColor: theme.background }}
      className="flex flex-col h-full overflow-hidden"
    >
      {/* ── Fixed top bar ── */}
      <div className="flex-shrink-0 px-4 pt-4 pb-0">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div>
            <h1 style={{ color: theme.text }} className="text-2xl font-bold">
              Office Inventory
            </h1>
            <p style={{ color: theme.subtext }} className="text-xs mt-0.5">
              Track consumable stock — supplies, printer, cleaning, PPE, and
              medicine
            </p>
            <p style={{ color: theme.subtext }} className="text-xs mt-0.5">
              {sortedFiltered.length} of {data.length} items
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setAuditModal({})}
              style={{
                backgroundColor: theme.surface,
                color: theme.text,
                borderColor: theme.border,
              }}
              className="px-3 py-2 text-sm font-medium rounded-lg border whitespace-nowrap"
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = theme.bgHover)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = theme.surface)
              }
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  display: "inline",
                  verticalAlign: "middle",
                  marginRight: 5,
                }}
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              Audit Trail
            </button>

            <button
              onClick={() => {
                setDeliverTarget(null);
                setDeliverModalOpen(true);
              }}
              style={{
                backgroundColor: theme.surface,
                color: theme.text,
                borderColor: theme.border,
              }}
              className="px-3 py-2 text-sm font-medium rounded-lg border whitespace-nowrap"
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = theme.bgHover)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = theme.surface)
              }
            >
              + Add Delivery
            </button>

            <button
              onClick={() => setAddVisible(true)}
              style={{
                backgroundColor: theme.primary,
                color: theme.primaryText,
              }}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = theme.primaryHover)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = theme.primary)
              }
            >
              + Add Item
            </button>
          </div>
        </div>

        {/* Row 2: Search + filter */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1">
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
                placeholder="Search item code, name, brand..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  backgroundColor: theme.inputBg,
                  borderColor: theme.inputBorder,
                  color: theme.inputText,
                }}
                className="w-full px-4 py-2.5 pl-9 text-sm border rounded-lg focus:outline-none"
                onFocus={(e) =>
                  (e.currentTarget.style.borderColor = theme.inputBorderFocus)
                }
                onBlur={(e) =>
                  (e.currentTarget.style.borderColor = theme.inputBorder)
                }
              />
            </div>
          </div>

          <TableFilterButton
            btnRef={inventoryFilter.filterBtnRef}
            onClick={inventoryFilter.handleFilterButtonClick}
            activeCount={inventoryFilter.activeCount}
            hasActive={inventoryFilter.hasActive()}
          />
        </div>

        {activeFilter && (
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span style={{ color: theme.subtext }} className="text-xs">
              Filtered by:
            </span>
            <div
              style={{
                backgroundColor: theme.primarySubtle,
                color: theme.primarySubtleText,
              }}
              className="flex items-center gap-2 px-3 py-1 rounded-full"
            >
              <span className="text-xs font-medium">
                {activeFilter.field}: {activeFilter.value}
              </span>
              <button
                type="button"
                onClick={() => setActiveFilter(null)}
                className="text-xs font-bold"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Scrollable table ── */}
      {loading ? (
        <div className="flex flex-1 items-center justify-center py-20">
          <div
            style={{ borderColor: theme.primary }}
            className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
          />
        </div>
      ) : sortedFiltered.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-20">
          <p style={{ color: theme.subtext }} className="text-sm">
            No inventory items found.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto overflow-x-auto px-4 pb-4">
          <div
            style={{ borderColor: theme.border }}
            className="rounded-lg border"
          >
            <table
              className="min-w-full text-sm"
              style={{ borderCollapse: "collapse" }}
            >
              {renderTableHead()}
              <tbody>{renderTableBody(sortedFiltered)}</tbody>
            </table>
          </div>
        </div>
      )}

      <TableFilterPanel
        visible={inventoryFilter.filterPanelVisible}
        config={{
          fields: [
            { key: "category", label: "Category", options: CATEGORY_OPTIONS },
            {
              key: "stockStatus",
              label: "Status",
              options: STATUS_FILTER_OPTIONS,
            },
          ],
          showDateRange: false,
        }}
        pendingFilters={inventoryFilter.pendingFilters}
        setPendingFilters={inventoryFilter.setPendingFilters}
        onFilterChange={(updated) => inventoryFilter.setAppliedFilters(updated)}
        onClear={inventoryFilter.handleClear}
        onClose={() => inventoryFilter.setFilterPanelVisible(false)}
        panelPos={inventoryFilter.filterPanelPos}
      />

      <AddItemModal
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        onSuccess={fetchData}
      />

      <EditItemModal
        visible={editTarget !== null}
        item={editTarget}
        onClose={() => setEditTarget(null)}
        onSuccess={fetchData}
      />

      <AdjustStockModal
        visible={adjustModalOpen}
        item={adjustTarget}
        items={data}
        onSelectItem={setAdjustTarget}
        onClose={() => {
          setAdjustModalOpen(false);
          setAdjustTarget(null);
        }}
        onSuccess={fetchData}
      />

      <AddDeliveryModal
        visible={deliverModalOpen}
        item={deliverTarget}
        items={data}
        onSelectItem={setDeliverTarget}
        onClose={() => {
          setDeliverModalOpen(false);
          setDeliverTarget(null);
        }}
        onSuccess={fetchData}
      />

      <AuditTrailModal
        visible={auditModal !== null}
        onClose={() => setAuditModal(null)}
        table="office_inventory"
        recordId={auditModal?.recordId}
        recordLabel={auditModal?.recordLabel}
      />
    </div>
  );
};

export default OfficeInventoryPage;
