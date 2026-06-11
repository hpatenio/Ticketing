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
import ManageColumnsModal, {
  ColumnConfig,
  DropdownOption,
} from "../../../SuperAdmin/ManageColumnsModal";
import { getAllDropdownConfigs } from "../../../../Services/dropdownConfigs";
import AuditTrailModal from "../../../../components/common/AuditTrailModal";

// ─── Default dropdown options (Firestore seeding fallbacks only) ─────────────

const DEFAULT_STATUS_OPTIONS: DropdownOption[] = [
  {
    label: "Deployed",
    value: "Deployed",
    badgeClass:
      "bg-emerald-100 text-emerald-800 inline-flex justify-center min-w-[90px] px-2 py-1 rounded-lg text-sm font-medium",
    bgColor: "#d1fae5",
    textColor: "#065f46",
  },
  {
    label: "Spare",
    value: "Spare",
    badgeClass:
      "bg-blue-100 text-blue-800 inline-flex justify-center min-w-[90px] px-2 py-1 rounded-lg text-sm font-medium",
    bgColor: "#dbeafe",
    textColor: "#1e40af",
  },
  {
    label: "Defective",
    value: "Defective",
    badgeClass:
      "bg-red-100 text-red-800 inline-flex justify-center min-w-[90px] px-2 py-1 rounded-lg text-sm font-medium",
    bgColor: "#fee2e2",
    textColor: "#991b1b",
  },
];

const DEFAULT_CATEGORY_OPTIONS: DropdownOption[] = [
  {
    label: "Laptop",
    value: "Laptop",
    badgeClass:
      "bg-orange-100 text-orange-800 inline-flex justify-center min-w-[130px] px-2 py-1 rounded-lg text-sm font-medium",
    bgColor: "#ffedd5",
    textColor: "#9a3412",
  },
  {
    label: "Monitor",
    value: "Monitor",
    badgeClass:
      "bg-yellow-100 text-yellow-800 inline-flex justify-center min-w-[130px] px-2 py-1 rounded-lg text-sm font-medium",
    bgColor: "#fef9c3",
    textColor: "#854d0e",
  },
  {
    label: "Desktop",
    value: "Desktop",
    badgeClass:
      "bg-indigo-100 text-indigo-800 inline-flex justify-center min-w-[130px] px-2 py-1 rounded-lg text-sm font-medium",
    bgColor: "#e0e7ff",
    textColor: "#3730a3",
  },
  {
    label: "UPS",
    value: "UPS",
    badgeClass:
      "bg-cyan-100 text-cyan-800 inline-flex justify-center min-w-[130px] px-2 py-1 rounded-lg text-sm font-medium",
    bgColor: "#cffafe",
    textColor: "#155e75",
  },
  {
    label: "Network Device",
    value: "Network Device",
    badgeClass:
      "bg-emerald-100 text-emerald-800 inline-flex justify-center min-w-[130px] px-2 py-1 rounded-lg text-sm font-medium",
    bgColor: "#d1fae5",
    textColor: "#065f46",
  },
  {
    label: "Server",
    value: "Server",
    badgeClass:
      "bg-violet-100 text-violet-800 inline-flex justify-center min-w-[130px] px-2 py-1 rounded-lg text-sm font-medium",
    bgColor: "#ede9fe",
    textColor: "#5b21b6",
  },
];

const DEFAULT_LOCATION_OPTIONS: DropdownOption[] = [
  {
    label: "Unit 1 & 2",
    value: "Unit 1 & 2",
    badgeClass:
      "bg-pink-100 text-pink-800 inline-flex justify-center min-w-[100px] px-2 py-1 rounded-lg text-sm font-medium",
    bgColor: "#fce7f3",
    textColor: "#9d174d",
  },
  {
    label: "Unit 3",
    value: "Unit 3",
    badgeClass:
      "bg-purple-100 text-purple-800 inline-flex justify-center min-w-[100px] px-2 py-1 rounded-lg text-sm font-medium",
    bgColor: "#f3e8ff",
    textColor: "#6b21a8",
  },
  {
    label: "BDO Makati",
    value: "BDO Makati",
    badgeClass:
      "bg-teal-100 text-teal-800 inline-flex justify-center min-w-[100px] px-2 py-1 rounded-lg text-sm font-medium",
    bgColor: "#ccfbf1",
    textColor: "#115e59",
  },
  {
    label: "Triumph",
    value: "Triumph",
    badgeClass:
      "bg-green-100 text-green-800 inline-flex justify-center min-w-[100px] px-2 py-1 rounded-lg text-sm font-medium",
    bgColor: "#dcfce7",
    textColor: "#166534",
  },
  {
    label: "WFH",
    value: "WFH",
    badgeClass:
      "bg-cyan-100 text-cyan-800 inline-flex justify-center min-w-[100px] px-2 py-1 rounded-lg text-sm font-medium",
    bgColor: "#cffafe",
    textColor: "#155e75",
  },
];

const DEFAULT_COMPANY_OPTIONS: DropdownOption[] = [
  {
    label: "OCG",
    value: "OCG",
    badgeClass:
      "bg-blue-100 text-blue-800 inline-flex justify-center min-w-[60px] px-2 py-1 rounded-lg text-sm font-medium",
    bgColor: "#dbeafe",
    textColor: "#1e40af",
  },
  {
    label: "SDB",
    value: "SDB",
    badgeClass:
      "bg-violet-100 text-violet-800 inline-flex justify-center min-w-[60px] px-2 py-1 rounded-lg text-sm font-medium",
    bgColor: "#ede9fe",
    textColor: "#5b21b6",
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

// ─── Filter panel state ───────────────────────────────────────────────────────

type FilterState = {
  categories: string[];
  statuses: string[];
  companies: string[];
  locations: string[];
  dateFrom: string;
  dateTo: string;
};

const EMPTY_FILTER: FilterState = {
  categories: [],
  statuses: [],
  companies: [],
  locations: [],
  dateFrom: "",
  dateTo: "",
};

const hasActiveFilters = (f: FilterState) =>
  f.categories.length > 0 ||
  f.statuses.length > 0 ||
  f.companies.length > 0 ||
  f.locations.length > 0 ||
  !!f.dateFrom ||
  !!f.dateTo;

// ─── FilterPanel ──────────────────────────────────────────────────────────────

type FilterPanelProps = {
  visible: boolean;
  filters: FilterState;
  pendingFilters: FilterState;
  setPendingFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  onFilterChange: (updated: FilterState) => void;
  onClear: () => void;
  onClose: () => void;
  categoryOptions: DropdownOption[];
  statusOptions: DropdownOption[];
  companyOptions: DropdownOption[];
  locationOptions: DropdownOption[];
  theme: ReturnType<typeof useTheme>["theme"];
  panelPos: React.CSSProperties;
};

const FilterPanel: React.FC<FilterPanelProps> = ({
  visible,
  filters,
  pendingFilters,
  setPendingFilters,
  onFilterChange,
  onClear,
  onClose,
  categoryOptions,
  statusOptions,
  companyOptions,
  locationOptions,
  theme,
  panelPos,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // slight delay so the button click that opened it doesn't immediately close it
    const t = setTimeout(
      () => document.addEventListener("mousedown", handler),
      50,
    );
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", handler);
    };
  }, [visible, onClose]);

  if (!visible) return null;

  const toggleChip = (
    key: keyof Pick<
      FilterState,
      "categories" | "statuses" | "companies" | "locations"
    >,
    value: string,
  ) => {
    setPendingFilters((prev) => {
      const arr = prev[key];
      const exists = arr.includes(value);
      const updated = {
        ...prev,
        [key]: exists ? arr.filter((v) => v !== value) : [...arr, value],
      };
      onFilterChange(updated);
      return updated;
    });
  };

  const SectionLabel = ({ label }: { label: string }) => (
    <p
      style={{ color: theme.subtext }}
      className="text-xs font-semibold uppercase tracking-wider mb-2"
    >
      {label}
    </p>
  );

  const ChipGroup = ({
    options,
    selected,
    onToggle,
  }: {
    options: DropdownOption[];
    selected: string[];
    onToggle: (val: string) => void;
  }) => (
    <div className="flex flex-wrap gap-1.5 mb-4">
      {options.map((opt) => {
        const isActive = selected.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onToggle(opt.value)}
            className="px-3 py-1 rounded-full text-xs font-medium border transition-all"
            style={
              isActive
                ? {
                    backgroundColor: opt.bgColor,
                    color: opt.textColor,
                    borderColor: opt.textColor + "55",
                  }
                : {
                    backgroundColor: theme.surface,
                    color: theme.subtext,
                    borderColor: theme.border,
                  }
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <div
      ref={panelRef}
      style={{
        ...panelPos,
        backgroundColor: theme.surface,
        borderColor: theme.border,
        boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
        zIndex: 9999,
        width: 280,
      }}
      className="fixed rounded-xl border overflow-hidden"
    >
      {/* Header */}
      <div
        style={{ borderBottomColor: theme.border }}
        className="flex items-center justify-between px-4 py-3 border-b"
      >
        <div className="flex items-center gap-2">
          <span style={{ color: theme.text }} className="text-sm font-semibold">
            ⊟ Filters
          </span>
        </div>
        <button
          type="button"
          onClick={onClear}
          style={{ color: theme.subtext }}
          className="text-xs hover:underline"
        >
          Clear all
        </button>
      </div>

      {/* Body */}
      <div className="px-4 pt-3 pb-2 max-h-[70vh] overflow-y-auto inventory-scroll">
        <SectionLabel label="Category" />
        <ChipGroup
          options={categoryOptions}
          selected={pendingFilters.categories}
          onToggle={(v) => toggleChip("categories", v)}
        />

        <SectionLabel label="Status" />
        <ChipGroup
          options={statusOptions}
          selected={pendingFilters.statuses}
          onToggle={(v) => toggleChip("statuses", v)}
        />

        <SectionLabel label="Company" />
        <ChipGroup
          options={companyOptions}
          selected={pendingFilters.companies}
          onToggle={(v) => toggleChip("companies", v)}
        />

        <SectionLabel label="Location" />
        <ChipGroup
          options={locationOptions}
          selected={pendingFilters.locations}
          onToggle={(v) => toggleChip("locations", v)}
        />

        <SectionLabel label="Date Purchased" />
        <div className="flex items-center gap-2 mb-4">
          <input
            type="date"
            value={pendingFilters.dateFrom}
            onChange={(e) => {
              const updated = { ...pendingFilters, dateFrom: e.target.value };
              setPendingFilters(updated);
              onFilterChange(updated);
            }}
            style={{
              backgroundColor: theme.inputBg,
              borderColor: theme.inputBorder,
              color: theme.inputText,
              colorScheme: theme.mode,
            }}
            className="flex-1 text-xs px-2 py-1.5 border rounded-lg focus:outline-none"
          />
          <span style={{ color: theme.subtext }} className="text-xs">
            —
          </span>
          <input
            type="date"
            value={pendingFilters.dateTo}
            onChange={(e) => {
              const updated = { ...pendingFilters, dateTo: e.target.value };
              setPendingFilters(updated);
              onFilterChange(updated);
            }}
            style={{
              backgroundColor: theme.inputBg,
              borderColor: theme.inputBorder,
              color: theme.inputText,
              colorScheme: theme.mode,
            }}
            className="flex-1 text-xs px-2 py-1.5 border rounded-lg focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
};

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
        width: rect.width,
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
            className="inline-flex items-center justify-center gap-2 rounded-full px-3 py-1 text-xs font-medium max-w-full whitespace-nowrap"
          >
            <span
              className="flex items-center justify-center rounded-full"
              style={{
                width: 22,
                height: 22,
                backgroundColor: theme.primary,
                color: theme.primaryText,
                fontSize: 10,
                fontWeight: 500,
                flexShrink: 0,
              }}
            >
              {getInitials(displayName)}
            </span>
            {displayName}
          </span>
        ) : (
          <span
            style={{
              backgroundColor: theme.surfaceRaised,
              color: theme.subtext,
            }}
            className="inline-flex items-center justify-center rounded-full p-2"
            title={placeholder}
          >
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
          style={{
            ...dropdownStyle,
            backgroundColor: theme.surface,
            borderColor: theme.border,
          }}
          className="rounded-lg shadow-lg border"
        >
          <input
            autoFocus
            type="text"
            value={query}
            placeholder="Search..."
            style={{
              backgroundColor: theme.surface,
              color: theme.text,
              borderBottomColor: theme.border,
            }}
            className="w-full px-3 py-2 text-xs border-b focus:outline-none"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setOpen(false);
                setQuery("");
              }
            }}
          />
          <ul className="inventory-scroll max-h-44 overflow-y-auto">
            {filtered.length === 0 ? (
              <li
                style={{ color: theme.subtext }}
                className="px-3 py-2 text-xs"
              >
                No results
              </li>
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
                    (o.value === value ? "font-medium" : "")
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

// ─── Page ─────────────────────────────────────────────────────────────────────

type Props = {
  initialFilter?: InventoryFilter | null;
  isSuperAdmin?: boolean;
};

const ITInventoryPage: React.FC<Props> = ({
  initialFilter = null,
  isSuperAdmin = false,
}) => {
  const { theme } = useTheme();
  const [data, setData] = useState<ITInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<InventoryFilter | null>(
    initialFilter,
  );
  const [sortKey, setSortKey] = useState<InventorySortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("default");
  const [addVisible, setAddVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<ITInventory | null>(null);
  const [editingNoteTag, setEditingNoteTag] = useState<string | null>(null);
  const [manageColumnsVisible, setManageColumnsVisible] = useState(false);

  // Filter panel state
  const [filterPanelVisible, setFilterPanelVisible] = useState(false);
  const [pendingFilters, setPendingFilters] =
    useState<FilterState>(EMPTY_FILTER);
  const [appliedFilters, setAppliedFilters] =
    useState<FilterState>(EMPTY_FILTER);
  const [filterPanelPos, setFilterPanelPos] = useState<React.CSSProperties>({});
  const filterBtnRef = useRef<HTMLButtonElement>(null);

  // Column configs from Firestore
  const [columnConfigs, setColumnConfigs] = useState<ColumnConfig[]>([
    {
      id: "status",
      docId: "inventory_status",
      label: "Status",
      editable: true,
      options: [],
    },
    {
      id: "category",
      docId: "inventory_category",
      label: "Category",
      editable: true,
      options: [],
    },
    {
      id: "location",
      docId: "inventory_location",
      label: "Location",
      editable: true,
      options: [],
    },
    {
      id: "company",
      docId: "inventory_company",
      label: "Company",
      editable: true,
      options: [],
    },
    {
      id: "assignee",
      docId: "",
      label: "Assignee",
      editable: false,
      options: [],
    },
  ]);
  const [auditModal, setAuditModal] = useState<{
    recordId?: string;
    recordLabel?: string;
  } | null>(null);
  useEffect(() => {
    getAllDropdownConfigs({
      status: DEFAULT_STATUS_OPTIONS,
      category: DEFAULT_CATEGORY_OPTIONS,
      location: DEFAULT_LOCATION_OPTIONS,
      company: DEFAULT_COMPANY_OPTIONS,
    })
      .then(({ status, category, location, company }) => {
        setColumnConfigs((prev) =>
          prev.map((col) => {
            if (col.id === "status") return { ...col, options: status };
            if (col.id === "category") return { ...col, options: category };
            if (col.id === "location") return { ...col, options: location };
            if (col.id === "company") return { ...col, options: company };
            return col;
          }),
        );
      })
      .catch((err) => {
        console.error("Failed to load dropdown configs from Firestore:", err);
      });
  }, []);

  // Themed scrollbar
  useEffect(() => {
    const style = document.createElement("style");
    style.id = "inventory-scrollbar-style";
    style.textContent = `
      .inventory-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
      .inventory-scroll::-webkit-scrollbar-track { background: ${theme.background}; }
      .inventory-scroll::-webkit-scrollbar-thumb { background: ${theme.border}; border-radius: 999px; }
      .inventory-scroll::-webkit-scrollbar-thumb:hover { background: ${theme.subtext}; }
      .inventory-scroll::-webkit-scrollbar-corner { background: ${theme.background}; }
    `;
    const existing = document.getElementById("inventory-scrollbar-style");
    if (existing) existing.remove();
    document.head.appendChild(style);
    return () => {
      document.getElementById("inventory-scrollbar-style")?.remove();
    };
  }, [theme]);

  const { employees, currentUserId } = useEmployees();

  const assigneeOptions = employees.map((e) => ({
    label: e.name,
    value: e.id,
    isMe: e.id === currentUserId,
  }));

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

  // ── Filter button click → calculate panel position ────────────────────────
  const handleFilterButtonClick = () => {
    if (filterPanelVisible) {
      setFilterPanelVisible(false);
      return;
    }
    if (filterBtnRef.current) {
      const rect = filterBtnRef.current.getBoundingClientRect();
      const panelWidth = 280;
      // Anchor to right edge of button
      const left = Math.min(
        rect.right - panelWidth,
        window.innerWidth - panelWidth - 8,
      );
      setFilterPanelPos({
        top: rect.bottom + 6,
        left: Math.max(8, left),
      });
    }
    // Sync pending with currently applied
    setPendingFilters(appliedFilters);
    setFilterPanelVisible(true);
  };

  const handleFilterChange = (updated: FilterState) => {
    setAppliedFilters(updated);
  };

  const handleClearFilters = () => {
    setPendingFilters(EMPTY_FILTER);
    setAppliedFilters(EMPTY_FILTER);
    setFilterPanelVisible(false);
  };

  const q = search.toLowerCase().trim();

  const filtered = useMemo(() => {
    let result = activeFilter
      ? data.filter(
          (item) => (item[activeFilter.field] ?? "") === activeFilter.value,
        )
      : data;

    // Apply filter panel filters
    const af = appliedFilters;
    if (af.categories.length)
      result = result.filter((i) => af.categories.includes(i.category));
    if (af.statuses.length)
      result = result.filter((i) => af.statuses.includes(i.status));
    if (af.companies.length)
      result = result.filter((i) => af.companies.includes(i.company));
    if (af.locations.length)
      result = result.filter((i) => af.locations.includes(i.location));
    if (af.dateFrom)
      result = result.filter(
        (i) => toDateString(i.datePurchased) >= af.dateFrom,
      );
    if (af.dateTo)
      result = result.filter((i) => toDateString(i.datePurchased) <= af.dateTo);

    if (!q) return result;
    return result.filter((item) => {
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
  }, [data, activeFilter, appliedFilters, q, employees]);

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

  const categoryOptions =
    columnConfigs.find((c) => c.id === "category")?.options ??
    DEFAULT_CATEGORY_OPTIONS;
  const statusOptions =
    columnConfigs.find((c) => c.id === "status")?.options ??
    DEFAULT_STATUS_OPTIONS;
  const companyOptions =
    columnConfigs.find((c) => c.id === "company")?.options ??
    DEFAULT_COMPANY_OPTIONS;
  const locationOptions =
    columnConfigs.find((c) => c.id === "location")?.options ??
    DEFAULT_LOCATION_OPTIONS;

  const activeFilterCount = [
    appliedFilters.categories.length > 0,
    appliedFilters.statuses.length > 0,
    appliedFilters.companies.length > 0,
    appliedFilters.locations.length > 0,
    !!appliedFilters.dateFrom || !!appliedFilters.dateTo,
  ].filter(Boolean).length;

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
        </tr>
      </thead>
    ),
    [theme, sortKey, sortDir, handleSort],
  );

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
          <td className="px-3 py-1 min-w-[130px]">
            <button
              type="button"
              onDoubleClick={() => handleEdit(item)}
              className="text-left w-full"
            >
              <p
                style={{ color: theme.text }}
                className="text-sm font-medium transition-opacity hover:opacity-70"
              >
                {item.assetTag}
              </p>
            </button>
          </td>

          <td className="text-sm px-3 py-1 min-w-[110px]">
            <BadgeSelect
              value={item.company}
              displayName={item.company || "—"}
              options={companyOptions}
              placeholder="—"
              onChange={(val) =>
                handleFieldUpdate(item.assetTag, "company", val)
              }
            />
          </td>

          <td className="px-3 py-1 min-w-[140px]">
            <span style={{ color: theme.text }} className="text-sm">
              {item.serialNumber || "—"}
            </span>
          </td>

          <td className="px-3 py-1 min-w-[110px]">
            <span style={{ color: theme.text }} className="text-sm">
              {item.model || "—"}
            </span>
          </td>

          <td className="px-3 py-1 min-w-[110px]">
            <span style={{ color: theme.text }} className="text-sm">
              {item.brand || "—"}
            </span>
          </td>

          <td className="px-3 py-1 min-w-[160px]">
            <BadgeSelect
              value={item.category}
              displayName={item.category || "—"}
              options={categoryOptions}
              placeholder="—"
              onChange={(val) =>
                handleFieldUpdate(item.assetTag, "category", val)
              }
            />
          </td>

          <td className="px-3 py-1 min-w-[120px]">
            <BadgeSelect
              value={item.status}
              displayName={item.status || "—"}
              options={statusOptions}
              placeholder="—"
              onChange={(val) =>
                handleFieldUpdate(item.assetTag, "status", val)
              }
            />
          </td>

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

          <td className="px-3 py-1 min-w-[120px]">
            <BadgeSelect
              value={item.location}
              displayName={item.location || "—"}
              options={locationOptions}
              placeholder="—"
              onChange={(val) =>
                handleFieldUpdate(item.assetTag, "location", val)
              }
            />
          </td>

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
      categoryOptions,
      statusOptions,
      companyOptions,
      locationOptions,
      handleFieldUpdate,
      handleAssigneeChange,
      handleEdit,
      setEditingNoteTag,
      setAuditModal,
    ],
  );

  return (
    <div
      style={{ backgroundColor: theme.background }}
      className="flex flex-col h-full overflow-hidden"
    >
      {/* ── Fixed top bar ── */}
      <div className="flex-shrink-0 px-4 pt-4 pb-0">
        {/* Row 1: Title + action buttons */}
        <div className="flex items-center justify-between gap-4 mb-3">
          <div>
            <h1 style={{ color: theme.text }} className="text-2xl font-bold">
              IT Inventory
            </h1>
            <p style={{ color: theme.subtext }} className="text-xs mt-0.5">
              View and manage all IT equipment stock
            </p>
            <p style={{ color: theme.subtext }} className="text-xs mt-0.5">
              {sortedFiltered.length} of {data.length} records
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setAuditModal({})} // no recordId = full-table mode
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
            {isSuperAdmin && (
              <button
                onClick={() => setManageColumnsVisible(true)}
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
                ⚙ Manage columns
              </button>
            )}

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
              + Add Asset
            </button>
          </div>
        </div>

        {/* Row 2: Search bar (left) + Filter button (right) */}
        <div className="flex items-center gap-2 mb-3">
          {/* Search — takes remaining space */}
          <div className="flex-1">
            <div className="relative w-full max-w-md">
              {/* Search Icon */}
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
                placeholder="Search asset tag, brand, model..."
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

          {/* Filter button */}
          <button
            ref={filterBtnRef}
            type="button"
            onClick={handleFilterButtonClick}
            style={{
              backgroundColor: hasActiveFilters(appliedFilters)
                ? theme.primary
                : theme.surface,
              color: hasActiveFilters(appliedFilters)
                ? theme.primaryText
                : theme.subtext,
              borderColor: hasActiveFilters(appliedFilters)
                ? theme.primary
                : theme.border,
            }}
            className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium rounded-lg border whitespace-nowrap transition-all"
            onMouseEnter={(e) => {
              if (!hasActiveFilters(appliedFilters))
                e.currentTarget.style.backgroundColor = theme.bgHover;
            }}
            onMouseLeave={(e) => {
              if (!hasActiveFilters(appliedFilters))
                e.currentTarget.style.backgroundColor = theme.surface;
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z" />
            </svg>
            Filter
            {activeFilterCount > 0 && (
              <span
                className="px-1.5 py-0.5 rounded-full text-xs font-semibold"
                style={{
                  backgroundColor: "rgba(255,255,255,0.25)",
                  color: theme.primaryText,
                }}
              >
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Active filter pill from ITInventorySummary navigation */}
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
            <span style={{ color: theme.subtext }} className="text-xs">
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </span>
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
            No inventory records found.
          </p>
        </div>
      ) : (
        <div className="inventory-scroll flex-1 overflow-y-auto overflow-x-auto px-4 pb-4">
          <div
            style={{ borderColor: theme.border }}
            className="rounded-lg border"
          >
            <table
              className="min-w-full text-sm"
              style={{ borderCollapse: "collapse" }}
            >
              {renderTableHead(0)}
              <tbody>{renderTableBody(sortedFiltered)}</tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Filter panel dropdown ── */}
      <FilterPanel
        visible={filterPanelVisible}
        filters={appliedFilters}
        pendingFilters={pendingFilters}
        setPendingFilters={setPendingFilters}
        onFilterChange={handleFilterChange}
        onClear={handleClearFilters}
        onClose={() => setFilterPanelVisible(false)}
        categoryOptions={categoryOptions}
        statusOptions={statusOptions}
        companyOptions={companyOptions}
        locationOptions={locationOptions}
        theme={theme}
        panelPos={filterPanelPos}
      />

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
      <ManageColumnsModal
        visible={manageColumnsVisible}
        onClose={() => setManageColumnsVisible(false)}
        columns={columnConfigs}
        onSave={(updated) => setColumnConfigs(updated)}
      />

      <AuditTrailModal
        visible={auditModal !== null}
        onClose={() => setAuditModal(null)}
        table="inventory"
        recordId={auditModal?.recordId}
        recordLabel={auditModal?.recordLabel}
      />
    </div>
  );
};

export default ITInventoryPage;
