import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import { useEmployees, EmployeeOption } from "../../../../hooks/useEmployees";
import { ADUser, ConcernTicket } from "../../../../types";
import {
  getAllTickets,
  updateTicketField,
} from "../../../../Services/ticketService";
import EditAssetModal from "./EditAssetModal";
import AddAssetModal from "./AddAssetModal";
import BadgeSelect from "../../../../components/common/BadgeSelect";
import { useTheme } from "../../../../theme/ThemeContext";
import { getAllDropdownConfigs } from "../../../../Services/dropdownConfigs";
import ManageColumnsModal, {
  ColumnConfig,
  DropdownOption,
} from "../../../SuperAdmin/ManageColumnsModal";
import AuditTrailModal from "../../../../components/common/AuditTrailModal";
// ─── Options ──────────────────────────────────────────────────────────────────

const DEFAULT_CATEGORY_OPTIONS: DropdownOption[] = [
  {
    label: "CCTV",
    value: "CCTV",
    badgeClass:
      "bg-blue-100    text-blue-800    inline-flex justify-center min-w-[130px] whitespace-nowrap px-2 py-1 rounded-lg text-sm font-medium",
  },
  {
    label: "Licenses Accounts",
    value: "Licenses Accounts",
    badgeClass:
      "bg-indigo-100  text-indigo-800  inline-flex justify-center min-w-[130px] whitespace-nowrap px-2 py-1 rounded-lg text-sm font-medium",
  },
  {
    label: "Hardware",
    value: "Hardware",
    badgeClass:
      "bg-slate-100   text-slate-800   inline-flex justify-center min-w-[130px] whitespace-nowrap px-2 py-1 rounded-lg text-sm font-medium",
  },
  {
    label: "Email",
    value: "Email",
    badgeClass:
      "bg-cyan-100    text-cyan-800    inline-flex justify-center min-w-[130px] whitespace-nowrap px-2 py-1 rounded-lg text-sm font-medium",
  },
  {
    label: "Network",
    value: "Network",
    badgeClass:
      "bg-teal-100    text-teal-800    inline-flex justify-center min-w-[130px] whitespace-nowrap px-2 py-1 rounded-lg text-sm font-medium",
  },
  {
    label: "Maintenance",
    value: "Maintenance",
    badgeClass:
      "bg-amber-100   text-amber-800   inline-flex justify-center min-w-[130px] whitespace-nowrap px-2 py-1 rounded-lg text-sm font-medium",
  },
  {
    label: "Medicine",
    value: "Medicine",
    badgeClass:
      "bg-emerald-100 text-emerald-800 inline-flex justify-center min-w-[130px] whitespace-nowrap px-2 py-1 rounded-lg text-sm font-medium",
  },
  {
    label: "Office Supplies",
    value: "Office Supplies",
    badgeClass:
      "bg-fuchsia-100 text-fuchsia-800 inline-flex justify-center min-w-[130px] whitespace-nowrap px-2 py-1 rounded-lg text-sm font-medium",
  },
  {
    label: "Software",
    value: "Software",
    badgeClass:
      "bg-sky-100     text-sky-800     inline-flex justify-center min-w-[130px] whitespace-nowrap px-2 py-1 rounded-lg text-sm font-medium",
  },
  {
    label: "Other",
    value: "Other",
    badgeClass:
      "bg-gray-100    text-gray-800    inline-flex justify-center min-w-[130px] whitespace-nowrap px-2 py-1 rounded-lg text-sm font-medium",
  },
];

const DEFAULT_PRIORITY_OPTIONS: DropdownOption[] = [
  {
    label: "Low",
    value: "Low",
    badgeClass:
      "bg-emerald-100 text-emerald-800 inline-flex justify-center min-w-[80px] px-2 py-1 rounded-lg text-sm font-medium",
  },
  {
    label: "Medium",
    value: "Medium",
    badgeClass:
      "bg-yellow-100  text-yellow-800  inline-flex justify-center min-w-[80px] px-2 py-1 rounded-lg text-sm font-medium",
  },
  {
    label: "High",
    value: "High",
    badgeClass:
      "bg-red-100     text-red-800     inline-flex justify-center min-w-[80px] px-2 py-1 rounded-lg text-sm font-medium",
  },
];

const DEFAULT_STATUS_OPTIONS: DropdownOption[] = [
  {
    label: "Pending",
    value: "Pending",
    badgeClass:
      "bg-yellow-100 text-yellow-800 inline-flex justify-center min-w-[100px] px-2 py-1 rounded-lg text-sm font-medium",
  },
  {
    label: "In Progress",
    value: "In Progress",
    badgeClass:
      "bg-blue-100   text-blue-800   inline-flex justify-center min-w-[100px] px-2 py-1 rounded-lg text-sm font-medium",
  },
  {
    label: "Resolved",
    value: "Resolved",
    badgeClass:
      "bg-emerald-100 text-emerald-800 inline-flex justify-center min-w-[100px] px-2 py-1 rounded-lg text-sm font-medium",
  },
];

// ─── Sort helpers ─────────────────────────────────────────────────────────────

type SortDir = "asc" | "desc" | "default";
type SortKey =
  | "summary"
  | "requester"
  | "assignee"
  | "category"
  | "priority"
  | "status"
  | "dueDate";

type MainTab = "all" | "grouped" | "filter";

const PRIORITY_ORDER: Record<string, number> = { Low: 0, Medium: 1, High: 2 };
const STATUS_ORDER: Record<string, number> = {
  Pending: 0,
  "In Progress": 1,
  Resolved: 2,
};

function cycleDir(current: SortDir): SortDir {
  if (current === "default") return "asc";
  if (current === "asc") return "desc";
  return "default";
}

function getTicketValue(t: ConcernTicket, key: SortKey): string | number {
  switch (key) {
    case "requester":
      return (t.requesterName ?? "").toLowerCase();
    case "assignee":
      return (t.assigneeName ?? "").toLowerCase();
    case "priority":
      return PRIORITY_ORDER[t.priority] ?? 0;
    case "status":
      return STATUS_ORDER[t.status] ?? 0;
    case "dueDate":
      return t.dueDate ? toDateString(t.dueDate) : "";
    default:
      return ((t as any)[key] ?? "").toString().toLowerCase();
  }
}

function sortTickets(arr: ConcernTicket[], key: SortKey, dir: SortDir) {
  if (dir === "default") return arr;
  return [...arr].sort((a, b) => {
    const va = getTicketValue(a, key);
    const vb = getTicketValue(b, key);
    const cmp =
      typeof va === "number"
        ? (va as number) - (vb as number)
        : (va as string) < (vb as string)
          ? -1
          : (va as string) > (vb as string)
            ? 1
            : 0;
    return dir === "asc" ? cmp : -cmp;
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toDateString = (value: any): string => {
  if (!value) return "";
  if (typeof value.toDate === "function")
    return value.toDate().toISOString().split("T")[0];
  if (value instanceof Date) return value.toISOString().split("T")[0];
  const d = new Date(value);
  return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
};

// ─── Sort icon ────────────────────────────────────────────────────────────────

const SortIcon = ({ dir }: { dir: SortDir }) => {
  if (dir === "asc") return <span className="ml-1 text-blue-500">▲</span>;
  if (dir === "desc") return <span className="ml-1 text-blue-500">▼</span>;
  return <span className="ml-1 text-gray-300">▲▼</span>;
};

// ─── Searchable dropdown ──────────────────────────────────────────────────────

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
  placeholder = "—",
  onChange,
}: SearchableSelectProps) => {
  const { theme } = useTheme();

  // Themed scrollbar
  useEffect(() => {
    const style = document.createElement("style");
    style.id = "inventory-scrollbar-style";
    style.textContent = `
      .inventory-scroll::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }
      .inventory-scroll::-webkit-scrollbar-track {
        background: ${theme.background};
      }
      .inventory-scroll::-webkit-scrollbar-thumb {
        background: ${theme.border};
        border-radius: 999px;
      }
      .inventory-scroll::-webkit-scrollbar-thumb:hover {
        background: ${theme.subtext};
      }
      .inventory-scroll::-webkit-scrollbar-corner {
        background: ${theme.background};
      }
    `;

    const existing = document.getElementById("inventory-scrollbar-style");
    if (existing) existing.remove();
    document.head.appendChild(style);

    return () => {
      document.getElementById("inventory-scrollbar-style")?.remove();
    };
  }, [theme]);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

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
        type="button"
        onClick={() => {
          setOpen((prev) => !prev);
          setQuery("");
        }}
        className="text-left"
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
            <span className="truncate">{displayName}</span>
          </span>
        ) : (
          <span
            style={{
              backgroundColor: theme.surfaceRaised,
              color: theme.subtext,
            }}
            className="inline-flex items-center justify-center rounded-full p-2"
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
          style={{ backgroundColor: theme.surface, borderColor: theme.border }}
          className="absolute z-50 left-0 mt-1 w-48 border rounded-lg shadow-lg"
        >
          <input
            autoFocus
            type="text"
            value={query}
            placeholder="Search..."
            style={{
              backgroundColor: theme.surface,
              borderColor: theme.border,
              color: theme.inputText,
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
                  key={o.value || "__unassigned"}
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

// ─── Status group definitions ─────────────────────────────────────────────────

type StatusGroupDef = {
  key: "Pending" | "In Progress" | "Resolved";
  label: string;
  headerBg: string;
  headerText: string;
  badgeBg: string;
  badgeText: string;
};

const STATUS_GROUPS: StatusGroupDef[] = [
  {
    key: "Pending",
    label: "PENDING",
    headerBg: "#fef9c3",
    headerText: "#854d0e",
    badgeBg: "#fef08a",
    badgeText: "#854d0e",
  },
  {
    key: "In Progress",
    label: "IN PROGRESS",
    headerBg: "#dbeafe",
    headerText: "#1e40af",
    badgeBg: "#bfdbfe",
    badgeText: "#1e40af",
  },
  {
    key: "Resolved",
    label: "RESOLVED",
    headerBg: "#d1fae5",
    headerText: "#065f46",
    badgeBg: "#a7f3d0",
    badgeText: "#065f46",
  },
];

// ─── StatusSection ────────────────────────────────────────────────────────────

type StatusSectionProps = {
  group: StatusGroupDef;
  items: ConcernTicket[];
  isCollapsed: boolean;
  theme: ReturnType<typeof useTheme>["theme"];
  onToggle: (key: string) => void;
  renderTableHead: (stickyTop: number) => React.ReactNode;
  renderTableBody: (items: ConcernTicket[]) => React.ReactNode;
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
                fontWeight: 500,
                letterSpacing: "0.05em",
              }}
            >
              {group.label}
            </span>
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium ml-1"
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
                No {group.key.toLowerCase()} tickets.
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

// ─── FilterTabDropdown ────────────────────────────────────────────────────────

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
    { label: "Pending", value: "Pending", dot: "#eab308" },
    { label: "In Progress", value: "In Progress", dot: "#3b82f6" },
    { label: "Resolved", value: "Resolved", dot: "#10b981" },
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
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
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

// ─── Row component ────────────────────────────────────────────────────────────

type TicketRowProps = {
  ticket: ConcernTicket;
  index: number;
  assigneeOptions: { label: string; value: string }[];
  categoryOptions: DropdownOption[]; // ← add
  priorityOptions: DropdownOption[]; // ← add
  statusOptions: DropdownOption[]; // ← add
  onUpdateField: (
    ticketNumber: string,
    field: string,
    value: any,
  ) => Promise<void>;
  onOpenDetails: (ticket: ConcernTicket) => void;
};

const TicketRow = ({
  ticket,
  index,
  assigneeOptions,
  categoryOptions,
  priorityOptions,
  statusOptions,
  onUpdateField,
  onOpenDetails,
}: TicketRowProps) => {
  const { theme } = useTheme();
  const [dueDate, setDueDate] = useState(toDateString(ticket.dueDate));
  const [clickCount, setClickCount] = useState(0);
  const [clickTimer, setClickTimer] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);

  useEffect(() => {
    setDueDate(toDateString(ticket.dueDate));
  }, [ticket.dueDate]);

  const handleSummaryClick = () => {
    const newCount = clickCount + 1;
    setClickCount(newCount);
    if (clickTimer) clearTimeout(clickTimer);
    if (newCount >= 2) {
      setClickCount(0);
      onOpenDetails(ticket);
    } else {
      const t = setTimeout(() => setClickCount(0), 300);
      setClickTimer(t);
    }
  };

  const handleDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDueDate(val);
    if (val) {
      try {
        await onUpdateField(ticket.ticketNumber, "dueDate", new Date(val));
      } catch (err) {
        console.error("Failed to update due date:", err);
      }
    }
  };

  const resolvedRequester = (() => {
    if (ticket.requesterId) {
      const byId = assigneeOptions.find((e) => e.value === ticket.requesterId);
      if (byId) return byId.label;
    }
    return ticket.requesterName || "—";
  })();

  const resolvedAssignee = (() => {
    if (ticket.assigneeId) {
      const byId = assigneeOptions.find((e) => e.value === ticket.assigneeId);
      if (byId) return byId.label;
    }
    return ticket.assigneeName ?? "";
  })();

  return (
    <tr
      style={{
        backgroundColor: index % 2 === 0 ? theme.surface : theme.background,
        borderBottom: `1px solid ${theme.border}`,
      }}
    >
      {/* Summary */}
      <td className="px-3 py-1.5 min-w-[180px]">
        <button
          onClick={handleSummaryClick}
          className="text-left w-full group"
          title="Double-click to open details"
        >
          <p
            style={{ color: theme.text }}
            className="text-sm font-medium group-hover:opacity-70 transition-opacity line-clamp-2"
          >
            {ticket.summary}
          </p>
          <p style={{ color: theme.subtext }} className="text-[11px] mt-0.5">
            {ticket.ticketNumber}
          </p>
        </button>
      </td>

      {/* Requester */}
      <td className="px-3 py-1.5 min-w-[140px]">
        <SearchableSelect
          value={ticket.requesterId || ""}
          displayName={resolvedRequester}
          options={assigneeOptions}
          placeholder="—"
          onChange={async (val, label) => {
            await onUpdateField(ticket.ticketNumber, "requesterId", val);
            await onUpdateField(ticket.ticketNumber, "requesterName", label);
          }}
        />
      </td>

      {/* Assignee */}
      <td className="text-sm px-3 py-2.5 min-w-[140px]">
        <SearchableSelect
          value={ticket.assigneeId || ""}
          displayName={resolvedAssignee}
          options={assigneeOptions}
          placeholder="Unassigned"
          onChange={async (val, label) => {
            await onUpdateField(ticket.ticketNumber, "assigneeId", val);
            await onUpdateField(ticket.ticketNumber, "assigneeName", label);
          }}
        />
      </td>

      {/* Category */}
      <td className="px-3 py-1.5 min-w-[130px]">
        <BadgeSelect
          value={ticket.category}
          displayName={ticket.category || "—"}
          options={categoryOptions}
          placeholder="—"
          badgeWidth={170}
          onChange={async (val) =>
            onUpdateField(ticket.ticketNumber, "category", val)
          }
        />
      </td>

      {/* Priority */}
      <td className="px-3 py-1.5 min-w-[90px]">
        <BadgeSelect
          value={ticket.priority}
          displayName={ticket.priority}
          options={priorityOptions}
          placeholder="—"
          onChange={async (val) =>
            onUpdateField(ticket.ticketNumber, "priority", val)
          }
        />
      </td>

      {/* Status */}
      <td className="px-3 py-1.5 min-w-[110px]">
        <BadgeSelect
          value={ticket.status}
          displayName={ticket.status}
          options={statusOptions}
          placeholder="—"
          onChange={async (val) =>
            onUpdateField(ticket.ticketNumber, "status", val)
          }
        />
      </td>

      {/* Due Date */}
      <td className="px-3 py-1.5 min-w-[120px]">
        <input
          type="date"
          value={dueDate}
          onChange={handleDateChange}
          onClick={(e) => (e.target as HTMLInputElement).showPicker()}
          style={{ color: theme.text, colorScheme: theme.mode }}
          className="text-sm bg-transparent border-none outline-none cursor-pointer w-full"
        />
      </td>
    </tr>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

type Props = { user?: ADUser; isSuperAdmin?: boolean };

const HEADERS: { label: string; key: SortKey }[] = [
  { label: "Summary", key: "summary" },
  { label: "Requester", key: "requester" },
  { label: "Assignee", key: "assignee" },
  { label: "Category", key: "category" },
  { label: "Priority", key: "priority" },
  { label: "Status", key: "status" },
  { label: "Due Date", key: "dueDate" },
];

export default function TicketsPage({ user, isSuperAdmin = false }: Props) {
  const { theme } = useTheme();
  const [tickets, setTickets] = useState<ConcernTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingTicket, setEditingTicket] = useState<ConcernTicket | null>(
    null,
  );
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [auditModal, setAuditModal] = useState<
    | { recordId?: string; recordLabel?: string }
    | null
  >(null);

  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("default");

  const { employees, currentUserId, currentUserName } = useEmployees();
  const [manageColumnsVisible, setManageColumnsVisible] = useState(false);
  const [columnConfigs, setColumnConfigs] = useState<ColumnConfig[]>([
    {
      id: "ticket_category",
      docId: "ticket_category",
      label: "Category",
      editable: true,
      options: [],
    },
    {
      id: "ticket_priority",
      docId: "ticket_priority",
      label: "Priority",
      editable: true,
      options: [],
    },
    {
      id: "ticket_status",
      docId: "ticket_status",
      label: "Status",
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

  const loadTickets = async () => {
    setLoading(true);
    try {
      setTickets(await getAllTickets());
    } catch (err) {
      console.error("Unable to load tickets", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets().catch(console.error);
  }, []);
  const [dropdownOptions, setDropdownOptions] = useState({
    category: DEFAULT_CATEGORY_OPTIONS,
    priority: DEFAULT_PRIORITY_OPTIONS,
    status: DEFAULT_STATUS_OPTIONS,
  });

  useEffect(() => {
    getAllDropdownConfigs({
      inventory: { status: [], category: [], location: [], company: [] },
      ticket: { status: [], category: [], priority: [] },
      consumable: { status: [], location: [] },
    })
      .then((result) => {
        const ticket = result.ticket;
        if (!ticket) return;

        setDropdownOptions({
          category: ticket.category,
          priority: ticket.priority,
          status: ticket.status,
        });
        setColumnConfigs((prev) =>
          prev.map((col) => {
            if (col.id === "ticket_category")
              return { ...col, options: ticket.category };
            if (col.id === "ticket_priority")
              return { ...col, options: ticket.priority };
            if (col.id === "ticket_status")
              return { ...col, options: ticket.status };
            return col;
          }),
        );
      })
      .catch((err) =>
        console.error("Failed to load ticket dropdown configs:", err),
      );
  }, []);
  const handleSort = (key: SortKey) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
    } else {
      const next = cycleDir(sortDir);
      setSortDir(next);
      if (next === "default") setSortKey(null);
    }
  };

  const dirFor = (key: SortKey): SortDir =>
    sortKey === key ? sortDir : "default";

  const filteredTickets = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = q
      ? tickets.filter((t) =>
          [
            t.summary,
            t.details || "",
            t.requesterName,
            t.assigneeName,
            t.category,
            t.priority,
            t.status,
          ]
            .join(" ")
            .toLowerCase()
            .includes(q),
        )
      : tickets;
    return sortKey ? sortTickets(base, sortKey, sortDir) : base;
  }, [tickets, search, sortKey, sortDir]);

  const toggleCollapsed = useCallback(
    (key: string) => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] })),
    [],
  );

  // ─── Grouped arrays ──────────────────────────────────────────────────────

  const groupedPending = useMemo(
    () => filteredTickets.filter((t) => t.status === "Pending"),
    [filteredTickets],
  );
  const groupedInProgress = useMemo(
    () => filteredTickets.filter((t) => t.status === "In Progress"),
    [filteredTickets],
  );
  const groupedResolved = useMemo(
    () => filteredTickets.filter((t) => t.status === "Resolved"),
    [filteredTickets],
  );

  const groupedItemsMap = useMemo(
    () => ({
      Pending: groupedPending,
      "In Progress": groupedInProgress,
      Resolved: groupedResolved,
    }),
    [groupedPending, groupedInProgress, groupedResolved],
  );

  const counts = {
    all: filteredTickets.length,
    Pending: groupedPending.length,
    "In Progress": groupedInProgress.length,
    Resolved: groupedResolved.length,
  };

  const filterTabItems = useMemo(
    () =>
      filterStatus
        ? filteredTickets.filter((t) => t.status === filterStatus)
        : filteredTickets,
    [filteredTickets, filterStatus],
  );

  const displayTickets = useMemo(
    () =>
      filterStatus
        ? filteredTickets.filter((t) => t.status === filterStatus)
        : filteredTickets,
    [filteredTickets, filterStatus],
  );

  // ─── Field update ─────────────────────────────────────────────────────────

  const handleUpdateField = async (
    ticketNumber: string,
    field: string,
    value: any,
  ) => {
    try {
      await updateTicketField(ticketNumber, field, value);
      await loadTickets();
    } catch (err) {
      console.error(
        `Unable to update ${field} for ticket ${ticketNumber}:`,
        err,
      );
    }
  };

  const openEditModal = (ticket: ConcernTicket) => {
    setEditingTicket(ticket);
    setEditModalVisible(true);
  };

const handleSaveEditedTicket = async (
  ticketNumber: string,
  updates: {
    summary: string;
    details: string;
    category: string;
    priority: string;
    status: string;
    assigneeId: string;
    assigneeName: string;
    dueDate: string;
  },
) => {
  try {
    await loadTickets(); // ← just refresh, writes already done in EditTicketModal
  } catch (err) {
    console.error("Unable to refresh tickets:", err);
    throw err;
  }
};
  // Deduplicated assignee options
  const assigneeOptions = useMemo(() => {
    const seen = new Set<string>();
    return employees
      .filter((e) => {
        if (seen.has(e.name)) return false;
        seen.add(e.name);
        return true;
      })
      .map((e) => ({ label: e.name, value: e.id }));
  }, [employees]);

  // ─── Table head ───────────────────────────────────────────────────────────

  const renderTableHead = useCallback(
    (stickyTop: number = 0) => (
      <thead>
        <tr>
          {HEADERS.map(({ label, key }) => (
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
              className="px-3 py-1.5 text-left text-xs font-medium uppercase tracking-wide whitespace-nowrap border-b cursor-pointer select-none transition-colors"
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

  // ─── Table body ───────────────────────────────────────────────────────────

  const renderTableBody = useCallback(
    (items: ConcernTicket[]) =>
      items.map((ticket, index) => {
        try {
          return (
            <TicketRow
              key={ticket.ticketNumber}
              ticket={ticket}
              index={index}
              assigneeOptions={assigneeOptions}
              categoryOptions={dropdownOptions.category} // ← add
              priorityOptions={dropdownOptions.priority} // ← add
              statusOptions={dropdownOptions.status} // ← add
              onUpdateField={handleUpdateField}
              onOpenDetails={openEditModal}
            />
          );
        } catch (err) {
          console.error("Error rendering ticket row:", err, ticket);
          return (
            <tr key={ticket.ticketNumber}>
              <td
                colSpan={7}
                style={{ color: theme.dangerText }}
                className="px-3 py-2 text-xs"
              >
                Error rendering ticket
              </td>
            </tr>
          );
        }
      }),
    [assigneeOptions, dropdownOptions, handleUpdateField, openEditModal, theme],
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      style={{ backgroundColor: theme.background }}
      className="flex flex-col h-full overflow-hidden"
    >
      {/* ── Fixed top bar ── */}
      <div className="flex-shrink-0 px-4 pt-4 pb-0">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div>
            <h1 style={{ color: theme.text }} className="text-xl font-bold">
              Concern Tickets
            </h1>
            <p style={{ color: theme.subtext }} className="text-xs mt-0.5">
              {displayTickets.length} of {tickets.length} tickets
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
              onClick={() => setModalVisible(true)}
              style={{
                backgroundColor: theme.primary,
                color: theme.primaryText,
              }}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = theme.primaryHover)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = theme.primary)
              }
            >
              + Add Ticket
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <input
            type="text"
            placeholder="Search tickets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              backgroundColor: theme.inputBg,
              borderColor: theme.inputBorder,
              color: theme.inputText,
            }}
            className="flex-1 px-4 py-2.5 text-sm border rounded-lg focus:outline-none"
            onFocus={(e) =>
              (e.currentTarget.style.borderColor = theme.inputBorderFocus)
            }
            onBlur={(e) =>
              (e.currentTarget.style.borderColor = theme.inputBorder)
            }
          />
          <FilterTabDropdown
            isActive={!!filterStatus}
            filterStatus={filterStatus}
            counts={counts}
            theme={theme}
            onActivate={() => {}}
            onChange={(val) => setFilterStatus(val)}
          />
        </div>

        {filterStatus && (
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
                Status: {filterStatus}
              </span>
              <button
                type="button"
                onClick={() => setFilterStatus("")}
                className="text-xs font-bold"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Scrollable content ── */}
      {loading ? (
        <div className="flex flex-1 items-center justify-center py-20">
          <div
            style={{ borderColor: theme.primary }}
            className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
          />
        </div>
      ) : displayTickets.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-20">
          <p style={{ color: theme.subtext }} className="text-sm">
            No tickets found.
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
              <tbody>{renderTableBody(displayTickets)}</tbody>
            </table>
          </div>
        </div>
      )}

      <AddAssetModal
        visible={modalVisible}
        assigneeOptions={assigneeOptions}
        currentUserId={user?.username ?? currentUserId ?? ""}
        currentUserName={user?.username ?? currentUserName ?? ""}
        onClose={() => setModalVisible(false)}
        onSuccess={loadTickets}
      />

      <EditAssetModal
        visible={editModalVisible}
        selectedTicket={editingTicket}
        assigneeOptions={assigneeOptions}
        onClose={() => setEditModalVisible(false)}
        onSave={async (ticketNumber, updates) => {
          await handleSaveEditedTicket(ticketNumber, updates);
          setEditModalVisible(false);
        }}
      />

      <ManageColumnsModal
        visible={manageColumnsVisible}
        onClose={() => setManageColumnsVisible(false)}
        columns={columnConfigs}
        onSave={(updated) => {
          setColumnConfigs(updated);
          const cat =
            updated.find((c) => c.id === "ticket_category")?.options ?? [];
          const pri =
            updated.find((c) => c.id === "ticket_priority")?.options ?? [];
          const sta =
            updated.find((c) => c.id === "ticket_status")?.options ?? [];
          setDropdownOptions({ category: cat, priority: pri, status: sta });
        }}
      />
      <AuditTrailModal
        visible={auditModal !== null}
        onClose={() => setAuditModal(null)}
        table="tickets"
        recordId={auditModal?.recordId}
        recordLabel={auditModal?.recordLabel}
      />
    </div>
  );
}
