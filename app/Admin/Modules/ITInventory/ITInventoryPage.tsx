import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  getAllAssets,
  deleteAsset,
  updateAssetField,
} from "../../../../Services/itInventory";
import { useEmployees } from "../../../../hooks/useEmployees";
import { ITInventory } from "../../../../types";
import { InventoryFilter } from "./ITInventorySummary";
import AddAssetModal from "./AddAssetModal";
import EditAssetModal from "./EditAssetModal";
import BadgeSelect from "../../../../components/common/BadgeSelect";
import { useTheme } from "../../../../theme/ThemeContext";

// ─── Dropdown options ─────────────────────────────────────────────────────────

const LOCATION_OPTIONS = [
  { label: "-", value: "" },
  {
    label: "Unit 1 & 2",
    value: "Unit 1 & 2",
    badgeClass:
      "bg-pink-100   text-pink-800   inline-flex justify-center min-w-[100px] px-2 py-1 rounded-lg text-sm font-semibold",
  },
  {
    label: "Unit 3",
    value: "Unit 3",
    badgeClass:
      "bg-purple-100 text-purple-800 inline-flex justify-center min-w-[100px] px-2 py-1 rounded-lg text-sm font-semibold",
  },
  {
    label: "BDO Makati",
    value: "BDO Makati",
    badgeClass:
      "bg-teal-100   text-teal-800   inline-flex justify-center min-w-[100px] px-2 py-1 rounded-lg text-sm font-semibold",
  },
  {
    label: "Triumph",
    value: "Triumph",
    badgeClass:
      "bg-green-100  text-green-800  inline-flex justify-center min-w-[100px] px-2 py-1 rounded-lg text-sm font-semibold",
  },
  {
    label: "WFH",
    value: "WFH",
    badgeClass:
      "bg-cyan-100   text-cyan-800   inline-flex justify-center min-w-[100px] px-2 py-1 rounded-lg text-sm font-semibold",
  },
];

const STATUS_OPTIONS = [
  {
    label: "Deployed",
    value: "Deployed",
    badgeClass:
      "bg-emerald-100 text-emerald-800 inline-flex justify-center min-w-[90px] px-2 py-1 rounded-lg text-sm font-semibold",
  },
  {
    label: "Spare",
    value: "Spare",
    badgeClass:
      "bg-blue-100    text-blue-800    inline-flex justify-center min-w-[90px] px-2 py-1 rounded-lg text-sm font-semibold",
  },
  {
    label: "Defective",
    value: "Defective",
    badgeClass:
      "bg-red-100     text-red-800     inline-flex justify-center min-w-[90px] px-2 py-1 rounded-lg text-sm font-semibold",
  },
];

const CATEGORY_OPTIONS = [
  { label: "-", value: "" },
  {
    label: "Laptop",
    value: "Laptop",
    badgeClass:
      "bg-orange-100  text-orange-800  inline-flex justify-center min-w-[130px] px-2 py-1 rounded-lg text-sm font-semibold",
  },
  {
    label: "Monitor",
    value: "Monitor",
    badgeClass:
      "bg-yellow-100  text-yellow-800  inline-flex justify-center min-w-[130px] px-2 py-1 rounded-lg text-sm font-semibold",
  },
  {
    label: "Desktop",
    value: "Desktop",
    badgeClass:
      "bg-indigo-100  text-indigo-800  inline-flex justify-center min-w-[130px] px-2 py-1 rounded-lg text-sm font-semibold",
  },
  {
    label: "UPS",
    value: "UPS",
    badgeClass:
      "bg-cyan-100    text-cyan-800    inline-flex justify-center min-w-[130px] px-2 py-1 rounded-lg text-sm font-semibold",
  },
  {
    label: "Network Device",
    value: "Network Device",
    badgeClass:
      "bg-emerald-100 text-emerald-800 inline-flex justify-center min-w-[130px] px-2 py-1 rounded-lg text-sm font-semibold",
  },
  {
    label: "Server",
    value: "Server",
    badgeClass:
      "bg-violet-100  text-violet-800  inline-flex justify-center min-w-[130px] px-2 py-1 rounded-lg text-sm font-semibold",
  },
];

const COMPANY_OPTIONS = [
  { label: "-", value: "" },
  {
    label: "OCG",
    value: "OCG",
    badgeClass:
      "bg-blue-100   text-blue-800   inline-flex justify-center min-w-[60px] px-2 py-1 rounded-lg text-sm font-semibold",
  },
  {
    label: "SDB",
    value: "SDB",
    badgeClass:
      "bg-violet-100 text-violet-800 inline-flex justify-center min-w-[60px] px-2 py-1 rounded-lg text-sm font-semibold",
  },
];

// ─── Sort helpers ─────────────────────────────────────────────────────────────

type SortDir = "asc" | "desc" | "default";

type InventorySortKey =
  | "assetTag"
  | "company"
  | "serialNumber"
  | "model"
  | "brand"
  | "category"
  | "status"
  | "assigneeName"
  | "location"
  | "datePurchased"
  | "notes";

const STATUS_ORDER: Record<string, number> = {
  Deployed: 0,
  Spare: 1,
  Defective: 2,
};

function cycleDir(current: SortDir): SortDir {
  if (current === "default") return "asc";
  if (current === "asc") return "desc";
  return "default";
}

const TABLE_HEADERS: { label: string; key: InventorySortKey }[] = [
  { label: "Asset Tag", key: "assetTag" },
  { label: "Company", key: "company" },
  { label: "Serial Number", key: "serialNumber" },
  { label: "Model", key: "model" },
  { label: "Brand", key: "brand" },
  { label: "Category", key: "category" },
  { label: "Status", key: "status" },
  { label: "Assignee", key: "assigneeName" },
  { label: "Location", key: "location" },
  { label: "Date Purchased", key: "datePurchased" },
  { label: "Notes", key: "notes" },
];

const SortIcon = ({ dir }: { dir: SortDir }) => {
  if (dir === "asc") return <span className="ml-1 text-blue-500">▲</span>;
  if (dir === "desc") return <span className="ml-1 text-blue-500">▼</span>;
  return <span className="ml-1 text-gray-300">▲▼</span>;
};

// ─── Tab types ────────────────────────────────────────────────────────────────

type MainTab = "all" | "grouped" | "filter";

// ─── SearchableSelect ─────────────────────────────────────────────────────────

type SearchableSelectProps = {
  value: string;
  displayName: string;
  options: { label: string; value: string }[];
  placeholder?: string;
  onChange: (value: string, label: string) => void;
};

const SearchableSelect = ({
  value,
  displayName,
  options,
  placeholder = "Unassigned",
  onChange,
}: SearchableSelectProps) => {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const getInitials = (name: string) => {
    const parts = name.trim().split(" ").filter(Boolean);
    if (parts.length === 0) return "?";

    const first = parts[0]?.[0] ?? "";
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";

    return (first + last).toUpperCase();
  };
  const allOptions = [{ label: "—", value: "" }, ...options];

  const filtered = query
    ? allOptions.filter((o) =>
        o.label.toLowerCase().includes(query.toLowerCase()),
      )
    : allOptions;

  const openDropdown = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropdownH = Math.min(220, filtered.length * 28 + 40);
      const showAbove = spaceBelow < dropdownH && rect.top > dropdownH;

      setDropdownStyle({
        position: "fixed",
        left: rect.left,
        width: rect.width, // ✅ MATCH BUTTON WIDTH
        zIndex: 9999,
        ...(showAbove
          ? { bottom: window.innerHeight - rect.top + 4 }
          : { top: rect.bottom + 4 }),
      });
    }

    setQuery("");
    setOpen(true);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={wrapRef} className="relative min-w-[120px]">
      <button
        ref={triggerRef}
        type="button"
        onClick={openDropdown}
        className="text-left w-full"
      >
        {value ? (
          <span
            style={{
              backgroundColor: theme.primarySubtle,
              color: theme.primarySubtleText,
            }}
            className="inline-flex items-center justify-center gap-2 rounded-full px-3 py-1 text-xs font-semibold max-w-full whitespace-nowrap"
          >
            {/* INITIALS CIRCLE */}
            <span
              className="flex items-center justify-center rounded-full"
              style={{
                width: 22,
                height: 22,
                backgroundColor: theme.primary,
                color: theme.primaryText,
                fontSize: 10,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {getInitials(displayName)}
            </span>

            {displayName}
          </span>
        ) : (
          // ─── Unassigned state (ICON ONLY) ───
          <span
            style={{
              backgroundColor: theme.surfaceRaised,
              color: theme.subtext,
            }}
            className="inline-flex items-center justify-center rounded-full p-2"
            title={placeholder}
          >
            {/* OUTLINE ICON (unassigned) */}
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-3.33 0-8 1.67-8 5v1h16v-1c0-3.33-4.67-5-8-5z"
              />
            </svg>
          </span>
        )}
      </button>

      {open && (
        <div
          style={dropdownStyle}
          className="bg-white border border-gray-200 rounded-lg shadow-lg"
        >
          <input
            autoFocus
            type="text"
            value={query}
            placeholder="Search..."
            className="w-full px-3 py-2 text-xs border-b border-gray-100 focus:outline-none"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setOpen(false);
                setQuery("");
              }
            }}
          />

          <ul className="max-h-44 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-xs text-gray-400">No results</li>
            ) : (
              filtered.map((o) => (
                <li
                  key={o.value}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(o.value, o.label);
                    setOpen(false);
                    setQuery("");
                  }}
                  style={{
                    color: o.value === value ? theme.primary : theme.text,
                  }}
                  className={
                    "px-3 py-1.5 text-xs cursor-pointer " +
                    (o.value === value ? "font-semibold" : "")
                  }
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = theme.bgHover)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "transparent")
                  }
                >
                  {o.label}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
};
// ─── Date helpers ─────────────────────────────────────────────────────────────

const toDateString = (value: any) => {
  if (!value) return "";
  if (typeof value.toDate === "function")
    return value.toDate().toISOString().split("T")[0];
  if (value instanceof Date) return value.toISOString().split("T")[0];
  const date = new Date(value);
  return isNaN(date.getTime()) ? "" : date.toISOString().split("T")[0];
};

const formatDisplayDate = (value: any) => {
  if (!value) return "—";
  if (typeof value.toDate === "function")
    return value.toDate().toLocaleDateString();
  if (value instanceof Date) return value.toLocaleDateString();
  const date = new Date(value);
  return isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
};

const normalizeValue = (value: any) => {
  if (value == null) return "";
  if (typeof value === "number") return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value.toDate === "function") return value.toDate().getTime();
  return String(value).toLowerCase();
};

// ─── StatusSection — outside ITInventoryPage so React never remounts it ───────

type StatusGroupDef = {
  key: "Deployed" | "Defective" | "Spare";
  label: string;
  icon: string;
  headerBg: string;
  headerText: string;
  badgeBg: string;
  badgeText: string;
};

type StatusSectionProps = {
  group: StatusGroupDef;
  items: ITInventory[];
  isCollapsed: boolean;
  theme: ReturnType<typeof useTheme>["theme"];
  onToggle: (key: string) => void;
  renderTableHead: (stickyTop: number) => React.ReactNode;
  renderTableBody: (items: ITInventory[]) => React.ReactNode;
};

const StatusSection: React.FC<StatusSectionProps> = React.memo(
  ({
    group,
    items,
    isCollapsed,
    theme,
    onToggle,
    renderTableHead,
    renderTableBody,
  }) => {
    const headerRef = useRef<HTMLDivElement>(null);
    const measuredRef = useRef(false);
    const [headerHeight, setHeaderHeight] = useState(37);

    useEffect(() => {
      if (measuredRef.current) return;
      if (headerRef.current) {
        measuredRef.current = true;
        setHeaderHeight(headerRef.current.getBoundingClientRect().height);
      }
    }, []);

    return (
      <div className="mb-3">
        <div
          ref={headerRef}
          style={{
            backgroundColor: group.headerBg,
            position: "sticky",
            top: 0,
            zIndex: 20,
            borderRadius: isCollapsed ? 8 : "8px 8px 0 0",
            border: `0.5px solid ${theme.border}`,
          }}
        >
          <button
            type="button"
            onClick={() => onToggle(group.key)}
            className="w-full flex items-center gap-2 px-3 py-2 text-left select-none"
          >
            <span
              style={{ color: group.headerText, fontSize: 13, fontWeight: 600 }}
            >
              {isCollapsed ? "▶" : "▼"}
            </span>
            <span
              style={{
                color: group.headerText,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.05em",
              }}
            >
              {group.label}
            </span>
            <span
              className="px-2 py-0.5 rounded-full text-xs font-semibold ml-1"
              style={{ backgroundColor: group.badgeBg, color: group.badgeText }}
            >
              {items.length}
            </span>
          </button>
        </div>

        {!isCollapsed && (
          <div
            style={{
              border: `0.5px solid ${theme.border}`,
              borderTop: "none",
              borderRadius: "0 0 8px 8px",
            }}
          >
            {items.length === 0 ? (
              <p style={{ color: theme.subtext }} className="text-sm px-4 py-3">
                No {group.key.toLowerCase()} assets.
              </p>
            ) : (
              <table
                className="min-w-full text-sm"
                style={{ borderCollapse: "collapse" }}
              >
                {renderTableHead(headerHeight)}
                <tbody>{renderTableBody(items)}</tbody>
              </table>
            )}
          </div>
        )}
      </div>
    );
  },
);

// ─── Status group definitions ─────────────────────────────────────────────────

const STATUS_GROUPS: StatusGroupDef[] = [
  {
    key: "Deployed",
    label: "DEPLOYED",
    icon: "✓",
    headerBg: "#d1fae5",
    headerText: "#065f46",
    badgeBg: "#a7f3d0",
    badgeText: "#065f46",
  },
  {
    key: "Defective",
    label: "DEFECTIVE",
    icon: "!",
    headerBg: "#fee2e2",
    headerText: "#991b1b",
    badgeBg: "#fecaca",
    badgeText: "#991b1b",
  },
  {
    key: "Spare",
    label: "SPARE",
    icon: "◎",
    headerBg: "#ede9fe",
    headerText: "#4c1d95",
    badgeBg: "#ddd6fe",
    badgeText: "#4c1d95",
  },
];

// ─── Filter tab dropdown — opens immediately on click ─────────────────────────

type FilterTabDropdownProps = {
  isActive: boolean;
  filterStatus: string;
  counts: Record<string, number>;
  theme: ReturnType<typeof useTheme>["theme"];
  onActivate: () => void;
  onChange: (val: string) => void;
};

const FilterTabDropdown: React.FC<FilterTabDropdownProps> = ({
  isActive,
  filterStatus,
  counts,
  theme,
  onActivate,
  onChange,
}) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const options = [
    { label: "All statuses", value: "", dot: undefined },
    { label: "Deployed", value: "Deployed", dot: "#10b981" },
    { label: "Defective", value: "Defective", dot: "#ef4444" },
    { label: "Spare", value: "Spare", dot: "#8b5cf6" },
  ];

  const selected = options.find((o) => o.value === filterStatus) ?? options[0];

  const handleClick = () => {
    onActivate();
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setPos({
      position: "fixed",
      top: r.bottom + 4,
      left: r.left,
      minWidth: r.width,
      zIndex: 9999,
    });
    setOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (
        !triggerRef.current?.contains(e.target as Node) &&
        !dropdownRef.current?.contains(e.target as Node)
      )
        setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const displayCount = filterStatus ? (counts[filterStatus] ?? 0) : counts.all;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleClick}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
        style={{
          backgroundColor: isActive ? theme.primary : theme.surface,
          color: isActive ? theme.primaryText : theme.subtext,
          borderColor: isActive ? theme.primary : theme.border,
        }}
      >
        <span>⊟</span>
        {isActive && filterStatus ? selected.label : "Filter"}
        {isActive && selected.dot && (
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: selected.dot }}
          />
        )}
        <span
          className="px-1.5 py-0.5 rounded-full"
          style={{
            backgroundColor: isActive
              ? "rgba(255,255,255,0.25)"
              : theme.surfaceRaised,
            color: isActive ? theme.primaryText : theme.subtext,
          }}
        >
          {displayCount}
        </span>
        <span style={{ opacity: 0.7 }}>▾</span>
      </button>

      {open && (
        <div
          ref={dropdownRef}
          style={{
            ...pos,
            backgroundColor: theme.surface,
            border: `1px solid ${theme.border}`,
          }}
          className="rounded-lg shadow-lg overflow-hidden"
        >
          {options.map((opt) => {
            const isSelected = opt.value === filterStatus;
            const cnt = opt.value ? (counts[opt.value] ?? 0) : counts.all;
            return (
              <button
                key={opt.value}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(opt.value);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left"
                style={{
                  backgroundColor: isSelected
                    ? theme.surfaceRaised
                    : "transparent",
                  color: theme.text,
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = theme.surfaceRaised)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = isSelected
                    ? theme.surfaceRaised
                    : "transparent")
                }
              >
                {opt.dot ? (
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: opt.dot }}
                  />
                ) : (
                  <span className="w-2 h-2 flex-shrink-0" />
                )}
                <span className="flex-1">{opt.label}</span>
                <span style={{ color: theme.subtext }}>{cnt}</span>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

type Props = { initialFilter?: InventoryFilter | null };

const ITInventoryPage: React.FC<Props> = ({ initialFilter = null }) => {
  const { theme } = useTheme();
  const [data, setData] = useState<ITInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<InventoryFilter | null>(
    initialFilter,
  );
  const [sortKey, setSortKey] = useState<InventorySortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("default");
  const [mainTab, setMainTab] = useState<MainTab>("all");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [addVisible, setAddVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<ITInventory | null>(null);
  const [editingNoteTag, setEditingNoteTag] = useState<string | null>(null);

  const { employees, currentUserId } = useEmployees();

  const assigneeOptions = employees.map((e) => ({
    label: e.name,
    value: e.id,
    isMe: e.id === currentUserId,
  }));

  // ─── Data ──────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getAllAssets();
      setData(result);
    } catch (err) {
      console.error("Unable to load inventory", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const updateLocalField = useCallback(
    (assetTag: string, field: string, value: string) => {
      setData((prev) =>
        prev.map((item) =>
          item.assetTag === assetTag ? { ...item, [field]: value } : item,
        ),
      );
    },
    [],
  );

  const handleFieldUpdate = useCallback(
    async (assetTag: string, field: string, value: string) => {
      updateLocalField(assetTag, field, value);
      try {
        await updateAssetField(assetTag, field, value);
      } catch (err) {
        console.error(`Unable to update ${field} for ${assetTag}:`, err);
        fetchData();
      }
    },
    [updateLocalField, fetchData],
  );

  const handleAssigneeChange = useCallback(
    async (assetTag: string, assigneeId: string) => {
      const selected = employees.find((e) => e.id === assigneeId);
      updateLocalField(assetTag, "assigneeId", assigneeId);
      updateLocalField(assetTag, "assigneeName", selected?.name ?? "");
      try {
        await updateAssetField(assetTag, "assigneeId", assigneeId);
        await updateAssetField(assetTag, "assigneeName", selected?.name ?? "");
      } catch (err) {
        console.error(`Unable to update assignee for ${assetTag}:`, err);
        fetchData();
      }
    },
    [employees, updateLocalField, fetchData],
  );

  const handleDelete = useCallback(
    async (assetTag: string) => {
      await deleteAsset(assetTag);
      fetchData();
    },
    [fetchData],
  );

  const handleEdit = useCallback((asset: ITInventory) => {
    setSelectedAsset(asset);
    setEditVisible(true);
  }, []);

  const toggleCollapsed = useCallback(
    (key: string) => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] })),
    [],
  );

  // ─── Sort ──────────────────────────────────────────────────────────────────

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

  const dirFor = (key: InventorySortKey): SortDir =>
    sortKey === key ? sortDir : "default";

  // ─── Filter + sort ─────────────────────────────────────────────────────────

  const q = search.toLowerCase().trim();

  const filtered = useMemo(() => {
    const filterApplied = activeFilter
      ? data.filter(
          (item) => (item[activeFilter.field] ?? "") === activeFilter.value,
        )
      : data;
    if (!q) return filterApplied;
    return filterApplied.filter((item) => {
      const assigneeName =
        employees.find((e) => e.id === item.assigneeId)?.name ??
        item.assigneeName ??
        "";
      return [
        item.assetTag,
        item.brand,
        item.model,
        item.company,
        item.category,
        item.location,
        item.status,
        item.serialNumber,
        assigneeName,
        item.notes,
        item.datePurchased ? formatDisplayDate(item.datePurchased) : "",
      ]
        .map((v) => (v ?? "").toString().toLowerCase())
        .some((v) => v.includes(q));
    });
  }, [data, activeFilter, q, employees]);

  const sortedFiltered = useMemo(() => {
    if (!sortKey || sortDir === "default") return filtered;
    return [...filtered].sort((a, b) => {
      const aVal =
        sortKey === "status"
          ? (STATUS_ORDER[a.status] ?? 0)
          : sortKey === "assigneeName"
            ? normalizeValue(
                employees.find((e) => e.id === a.assigneeId)?.name ??
                  a.assigneeName,
              )
            : normalizeValue(a[sortKey]);
      const bVal =
        sortKey === "status"
          ? (STATUS_ORDER[b.status] ?? 0)
          : sortKey === "assigneeName"
            ? normalizeValue(
                employees.find((e) => e.id === b.assigneeId)?.name ??
                  b.assigneeName,
              )
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
  }, [filtered, sortKey, sortDir, employees]);

  // ─── Stable per-group arrays ───────────────────────────────────────────────

  const groupedDeployed = useMemo(
    () => sortedFiltered.filter((i) => i.status === "Deployed"),
    [sortedFiltered],
  );
  const groupedDefective = useMemo(
    () => sortedFiltered.filter((i) => i.status === "Defective"),
    [sortedFiltered],
  );
  const groupedSpare = useMemo(
    () => sortedFiltered.filter((i) => i.status === "Spare"),
    [sortedFiltered],
  );

  const groupedItemsMap = useMemo(
    () => ({
      Deployed: groupedDeployed,
      Defective: groupedDefective,
      Spare: groupedSpare,
    }),
    [groupedDeployed, groupedDefective, groupedSpare],
  );

  const filterTabItems = useMemo(
    () =>
      filterStatus
        ? sortedFiltered.filter((i) => i.status === filterStatus)
        : sortedFiltered,
    [sortedFiltered, filterStatus],
  );

  const counts = {
    all: sortedFiltered.length,
    Deployed: groupedDeployed.length,
    Defective: groupedDefective.length,
    Spare: groupedSpare.length,
  };

  // ─── Table head ────────────────────────────────────────────────────────────

  const renderTableHead = useCallback(
    (stickyTop: number = 0) => (
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
                top: stickyTop,
                zIndex: 10,
              }}
              className="px-3 py-1 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap border-b cursor-pointer select-none transition-colors"
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
        </tr>
      </thead>
    ),
    [theme, sortKey, sortDir, handleSort],
  );

  // ─── Table body ────────────────────────────────────────────────────────────

  const renderTableBody = useCallback(
    (items: ITInventory[]) =>
      items.map((item, index) => (
        <tr
          key={item.assetTag}
          style={{
            backgroundColor: index % 2 === 0 ? theme.surface : theme.background,
            borderBottom: `1px solid ${theme.border}`,
          }}
        >
          {/* Asset Tag */}
          <td className="px-3 py-1 min-w-[130px]">
            <button
              type="button"
              onDoubleClick={() => handleEdit(item)}
              className="text-left w-full"
            >
              <p
                style={{ color: theme.text }}
                className="text-sm font-semibold transition-opacity hover:opacity-70"
              >
                {item.assetTag}
              </p>
            </button>
          </td>

          {/* Company */}
          <td className="text-sm px-3 py-1 min-w-[110px]">
            <BadgeSelect
              value={item.company}
              displayName={item.company || "—"}
              options={COMPANY_OPTIONS}
              placeholder="—"
              onChange={(val) =>
                handleFieldUpdate(item.assetTag, "company", val)
              }
            />
          </td>

          {/* Serial Number */}
          <td className="px-3 py-1 min-w-[140px]">
            <span style={{ color: theme.text }} className="text-sm">
              {item.serialNumber || "—"}
            </span>
          </td>

          {/* Model */}
          <td className="px-3 py-1 min-w-[110px]">
            <span style={{ color: theme.text }} className="text-sm">
              {item.model || "—"}
            </span>
          </td>

          {/* Brand */}
          <td className="px-3 py-1 min-w-[110px]">
            <span style={{ color: theme.text }} className="text-sm">
              {item.brand || "—"}
            </span>
          </td>

          {/* Category */}
          <td className="px-3 py-1 min-w-[160px]">
            <BadgeSelect
              value={item.category}
              displayName={item.category || "—"}
              options={CATEGORY_OPTIONS}
              placeholder="—"
              onChange={(val) =>
                handleFieldUpdate(item.assetTag, "category", val)
              }
            />
          </td>

          {/* Status */}
          <td className="px-3 py-1 min-w-[120px]">
            <BadgeSelect
              value={item.status}
              displayName={item.status || "—"}
              options={STATUS_OPTIONS}
              placeholder="—"
              onChange={(val) =>
                handleFieldUpdate(item.assetTag, "status", val)
              }
            />
          </td>

          {/* Assignee */}
          <td className="px-3 py-1 min-w-[140px]">
            <SearchableSelect
              value={item.assigneeId ?? ""}
              displayName={
                employees.find((e) => e.id === item.assigneeId)?.name ??
                item.assigneeName ??
                "Unassigned"
              }
              options={assigneeOptions.map((a) => ({
                label: a.label,
                value: a.value,
              }))}
              placeholder="Unassigned"
              onChange={async (value) => {
                await handleAssigneeChange(item.assetTag, value);
              }}
            />
          </td>

          {/* Location */}
          <td className="px-3 py-1 min-w-[120px]">
            <BadgeSelect
              value={item.location}
              displayName={item.location || "—"}
              options={LOCATION_OPTIONS}
              placeholder="—"
              onChange={(val) =>
                handleFieldUpdate(item.assetTag, "location", val)
              }
            />
          </td>

          {/* Date Purchased */}
          <td className="px-3 py-1 min-w-[130px]">
            <input
              type="date"
              value={toDateString(item.datePurchased)}
              onChange={(e) =>
                handleFieldUpdate(
                  item.assetTag,
                  "datePurchased",
                  e.target.value,
                )
              }
              onClick={(e) => (e.target as HTMLInputElement).showPicker()}
              style={{ color: theme.text, colorScheme: theme.mode }}
              className="text-sm bg-transparent border-none outline-none cursor-pointer w-full"
            />
          </td>

          {/* Notes */}
          <td className="px-3 py-1 min-w-[200px]">
            {editingNoteTag === item.assetTag ? (
              <input
                type="text"
                value={item.notes ?? ""}
                onChange={(e) =>
                  handleFieldUpdate(item.assetTag, "notes", e.target.value)
                }
                autoFocus
                placeholder="Notes"
                style={{
                  backgroundColor: theme.inputBg,
                  borderColor: theme.inputBorder,
                  color: theme.inputText,
                }}
                className="w-full px-2 py-1.5 text-xs border rounded-md focus:outline-none"
                onFocus={(e) =>
                  (e.currentTarget.style.borderColor = theme.inputBorderFocus)
                }
                onBlur={(e) => {
                  setEditingNoteTag(null);
                  e.currentTarget.style.borderColor = theme.inputBorder;
                }}
              />
            ) : (
              <button
                type="button"
                onDoubleClick={() => setEditingNoteTag(item.assetTag)}
                className="text-left w-full"
                title="Double-click to edit"
              >
                <span
                  style={{ color: theme.text }}
                  className="text-xs line-clamp-2"
                >
                  {item.notes || "—"}
                </span>
              </button>
            )}
          </td>
        </tr>
      )),
    [
      theme,
      employees,
      assigneeOptions,
      editingNoteTag,
      handleFieldUpdate,
      handleAssigneeChange,
      handleEdit,
      setEditingNoteTag,
    ],
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      style={{ backgroundColor: theme.background }}
      className="flex flex-col h-full overflow-hidden"
    >
      {/* ── Fixed top bar ── */}
      <div className="flex-shrink-0 px-4 pt-4 pb-0">
        {/* Header + Search */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h1 style={{ color: theme.text }} className="text-xl font-bold">
              IT Inventory
            </h1>
            <p style={{ color: theme.subtext }} className="text-xs mt-0.5">
              {sortedFiltered.length} of {data.length} records
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search asset tag, brand, model..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                backgroundColor: theme.inputBg,
                borderColor: theme.inputBorder,
                color: theme.inputText,
              }}
              className="w-80 px-4 py-2.5 text-sm border rounded-lg focus:outline-none"
              onFocus={(e) =>
                (e.currentTarget.style.borderColor = theme.inputBorderFocus)
              }
              onBlur={(e) =>
                (e.currentTarget.style.borderColor = theme.inputBorder)
              }
            />

            <button
              onClick={() => setAddVisible(true)}
              style={{
                backgroundColor: theme.primary,
                color: theme.primaryText,
              }}
              className="px-4 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = theme.primaryHover)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = theme.primary)
              }
            >
              + Add Asset
            </button>
          </div>
        </div>

        {/* Active filter pill */}
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
              <span className="text-xs font-semibold">
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
            <span style={{ color: theme.subtext }} className="text-xs">
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}

        {/* Tab bar */}
        <div className="flex items-center gap-2 mb-3">
          {(["all", "grouped"] as const).map((key) => {
            const isActive = mainTab === key;
            const label = key === "all" ? "All" : "By Status";
            return (
              <button
                key={key}
                type="button"
                onClick={() => setMainTab(key)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                style={{
                  backgroundColor: isActive ? theme.primary : theme.surface,
                  color: isActive ? theme.primaryText : theme.subtext,
                  borderColor: isActive ? theme.primary : theme.border,
                }}
              >
                {key === "all" && <span>☰</span>}
                {key === "grouped" && <span>▤</span>}
                {label}
                <span
                  className="px-1.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: isActive
                      ? "rgba(255,255,255,0.25)"
                      : theme.surfaceRaised,
                    color: isActive ? theme.primaryText : theme.subtext,
                  }}
                >
                  {counts.all}
                </span>
              </button>
            );
          })}

          {/* Filter tab — opens dropdown immediately on click */}
          <FilterTabDropdown
            isActive={mainTab === "filter"}
            filterStatus={filterStatus}
            counts={counts}
            theme={theme}
            onActivate={() => setMainTab("filter")}
            onChange={(val) => {
              setMainTab("filter");
              setFilterStatus(val);
            }}
          />
        </div>
      </div>

      {/* ── Scrollable content ── */}
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
            No inventory records found.
          </p>
        </div>
      ) : mainTab === "grouped" ? (
        /* ── By Status: collapsible sections ── */
        <div className="flex-1 overflow-y-auto overflow-x-auto px-4 pb-4">
          {STATUS_GROUPS.map((group) => (
            <StatusSection
              key={group.key}
              group={group}
              items={groupedItemsMap[group.key]}
              isCollapsed={!!collapsed[group.key]}
              theme={theme}
              onToggle={toggleCollapsed}
              renderTableHead={renderTableHead}
              renderTableBody={renderTableBody}
            />
          ))}
        </div>
      ) : mainTab === "filter" && filterTabItems.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-20">
          <p style={{ color: theme.subtext }} className="text-sm">
            No {filterStatus || "assets"} found.
          </p>
        </div>
      ) : (
        /* ── All / Filter: flat table ── */
        <div className="flex-1 overflow-y-auto overflow-x-auto px-4 pb-4">
          <div
            style={{ borderColor: theme.border }}
            className="rounded-lg border"
          >
            <table
              className="min-w-full text-sm"
              style={{ borderCollapse: "collapse" }}
            >
              {renderTableHead(0)}
              <tbody>
                {renderTableBody(
                  mainTab === "filter" ? filterTabItems : sortedFiltered,
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AddAssetModal
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        onSuccess={fetchData}
      />
      <EditAssetModal
        visible={editVisible}
        onClose={() => setEditVisible(false)}
        onSuccess={fetchData}
        selectedAsset={selectedAsset}
        onDelete={handleDelete}
        employees={employees}
      />
    </div>
  );
};

export default ITInventoryPage;
