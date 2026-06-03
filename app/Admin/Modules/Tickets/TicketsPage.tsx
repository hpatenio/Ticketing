import React, { useEffect, useRef, useState } from "react";
import { useEmployees, EmployeeOption } from "../../../../hooks/useEmployees";
import { ADUser, ConcernTicket } from "../../../../types";
import { getAllTickets, updateTicketField } from "../../../../Services/ticketService";
import EditAssetModal from "./EditAssetModal";
import AddAssetModal from "./AddAssetModal";
import BadgeSelect from "../../../../components/common/BadgeSelect";
import { useTheme } from "../../../../theme/ThemeContext";

// ─── Options ──────────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS = [
  { label: "CCTV",              value: "CCTV",              badgeClass: "bg-blue-100    text-blue-800    inline-flex justify-center min-w-[130px] px-2 py-1 rounded-full text-sm" },
  { label: "Licenses Accounts", value: "Licenses Accounts", badgeClass: "bg-indigo-100  text-indigo-800  inline-flex justify-center min-w-[130px] px-2 py-1 rounded-full text-sm" },
  { label: "Hardware",          value: "Hardware",           badgeClass: "bg-slate-100   text-slate-800   inline-flex justify-center min-w-[130px] px-2 py-1 rounded-full text-sm" },
  { label: "Email",             value: "Email",              badgeClass: "bg-cyan-100    text-cyan-800    inline-flex justify-center min-w-[130px] px-2 py-1 rounded-full text-sm" },
  { label: "Network",           value: "Network",            badgeClass: "bg-teal-100    text-teal-800    inline-flex justify-center min-w-[130px] px-2 py-1 rounded-full text-sm" },
  { label: "Maintenance",       value: "Maintenance",        badgeClass: "bg-amber-100   text-amber-800   inline-flex justify-center min-w-[130px] px-2 py-1 rounded-full text-sm" },
  { label: "Medicine",          value: "Medicine",           badgeClass: "bg-emerald-100 text-emerald-800 inline-flex justify-center min-w-[130px] px-2 py-1 rounded-full text-sm" },
  { label: "Office Supplies",   value: "Office Supplies",    badgeClass: "bg-fuchsia-100 text-fuchsia-800 inline-flex justify-center min-w-[130px] px-2 py-1 rounded-full text-sm" },
  { label: "Software",          value: "Software",           badgeClass: "bg-sky-100     text-sky-800     inline-flex justify-center min-w-[130px] px-2 py-1 rounded-full text-sm" },
  { label: "Other",             value: "Other",              badgeClass: "bg-gray-100    text-gray-800    inline-flex justify-center min-w-[130px] px-2 py-1 rounded-full text-sm" },
];

const PRIORITY_OPTIONS = [
  { label: "Low",    value: "Low",    badgeClass: "bg-emerald-100 text-emerald-800 inline-flex justify-center min-w-[80px] px-2 py-1 rounded-full text-sm" },
  { label: "Medium", value: "Medium", badgeClass: "bg-yellow-100  text-yellow-800  inline-flex justify-center min-w-[80px] px-2 py-1 rounded-full text-sm" },
  { label: "High",   value: "High",   badgeClass: "bg-red-100     text-red-800     inline-flex justify-center min-w-[80px] px-2 py-1 rounded-full text-sm" },
];

const STATUS_OPTIONS = [
  { label: "Pending",     value: "Pending",     badgeClass: "bg-yellow-100 text-yellow-800 inline-flex justify-center min-w-[100px] px-2 py-1 rounded-full text-sm" },
  { label: "In Progress", value: "In Progress", badgeClass: "bg-blue-100   text-blue-800   inline-flex justify-center min-w-[100px] px-2 py-1 rounded-full text-sm" },
  { label: "Resolved",    value: "Resolved",    badgeClass: "bg-emerald-100 text-emerald-800 inline-flex justify-center min-w-[100px] px-2 py-1 rounded-full text-sm" },
];

// ─── Sort helpers ─────────────────────────────────────────────────────────────

type SortDir = "asc" | "desc" | "default";
type SortKey = "summary" | "requester" | "assignee" | "category" | "priority" | "status" | "dueDate";

const PRIORITY_ORDER: Record<string, number> = { Low: 0, Medium: 1, High: 2 };
const STATUS_ORDER: Record<string, number> = { Pending: 0, "In Progress": 1, Resolved: 2 };

function cycleDir(current: SortDir): SortDir {
  if (current === "default") return "asc";
  if (current === "asc") return "desc";
  return "default";
}

function getTicketValue(t: ConcernTicket, key: SortKey): string | number {
  switch (key) {
    case "requester": return (t.requesterName ?? "").toLowerCase();
    case "assignee":  return (t.assigneeName  ?? "").toLowerCase();
    case "priority":  return PRIORITY_ORDER[t.priority] ?? 0;
    case "status":    return STATUS_ORDER[t.status]     ?? 0;
    case "dueDate":   return t.dueDate ? toDateString(t.dueDate) : "";
    default:          return ((t as any)[key] ?? "").toString().toLowerCase();
  }
}

function sortTickets(arr: ConcernTicket[], key: SortKey, dir: SortDir) {
  if (dir === "default") return arr;
  return [...arr].sort((a, b) => {
    const va = getTicketValue(a, key);
    const vb = getTicketValue(b, key);
    const cmp = typeof va === "number"
      ? (va as number) - (vb as number)
      : (va as string) < (vb as string) ? -1 : (va as string) > (vb as string) ? 1 : 0;
    return dir === "asc" ? cmp : -cmp;
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toDateString = (value: any): string => {
  if (!value) return "";
  if (typeof value.toDate === "function") return value.toDate().toISOString().split("T")[0];
  if (value instanceof Date) return value.toISOString().split("T")[0];
  const d = new Date(value);
  return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
};

// ─── Sort icon ────────────────────────────────────────────────────────────────

const SortIcon = ({ dir }: { dir: SortDir }) => {
  if (dir === "asc")  return <span className="ml-1 text-blue-500">▲</span>;
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

const SearchableSelect = ({ value, displayName, options, placeholder = "—", onChange }: SearchableSelectProps) => {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  const filtered = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

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
      <button type="button" onClick={() => { setOpen((prev) => !prev); setQuery(""); }} className="text-left">
        {value ? (
          <span style={{ backgroundColor: theme.primarySubtle, color: theme.primarySubtleText }}
            className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            {displayName}
          </span>
        ) : (
          <span style={{ backgroundColor: theme.surfaceRaised, color: theme.subtext }}
            className="inline-flex items-center rounded-full px-3 py-1 text-xs italic">
            {placeholder}
          </span>
        )}
      </button>

      {open && (
        <div style={{ backgroundColor: theme.surface, borderColor: theme.border }}
          className="absolute z-50 left-0 mt-1 w-48 border rounded-lg shadow-lg">
          <input
            autoFocus
            type="text"
            value={query}
            placeholder="Search..."
            style={{ backgroundColor: theme.surface, borderColor: theme.border, color: theme.inputText }}
            className="w-full px-3 py-2 text-xs border-b focus:outline-none"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Escape") { setOpen(false); setQuery(""); } }}
          />
          <ul className="max-h-44 overflow-y-auto">
            {filtered.length === 0 ? (
              <li style={{ color: theme.subtext }} className="px-3 py-2 text-xs">No results</li>
            ) : (
              filtered.map((o) => (
                <li
                  key={o.value}
                  onMouseDown={(e) => { e.preventDefault(); onChange(o.value, o.label); setOpen(false); setQuery(""); }}
                  style={{ color: o.value === value ? theme.primary : theme.text }}
                  className={"px-3 py-1.5 text-xs cursor-pointer " + (o.value === value ? "font-semibold" : "")}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.bgHover)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
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

// ─── Row component ────────────────────────────────────────────────────────────

type TicketRowProps = {
  ticket: ConcernTicket;
  index: number;
  assigneeOptions: { label: string; value: string }[];
  onUpdateField: (ticketNumber: string, field: string, value: any) => Promise<void>;
  onOpenDetails: (ticket: ConcernTicket) => void;
};

const TicketRow = ({ ticket, index, assigneeOptions, onUpdateField, onOpenDetails }: TicketRowProps) => {
  const { theme } = useTheme();
  const [dueDate, setDueDate] = useState(toDateString(ticket.dueDate));
  const [clickCount, setClickCount] = useState(0);
  const [clickTimer, setClickTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setDueDate(toDateString(ticket.dueDate)); }, [ticket.dueDate]);

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
      try { await onUpdateField(ticket.ticketNumber, "dueDate", new Date(val)); }
      catch (err) { console.error("Failed to update due date:", err); }
    }
  };

  const resolvedRequester = (() => {
    if (!ticket.requesterId) return ticket.requesterName || "—";
    const byUid = assigneeOptions.find((e) => e.value === ticket.requesterId);
    return byUid ? byUid.label : ticket.requesterName || "—";
  })();

  const resolvedAssignee = (() => {
    if (!ticket.assigneeId) return ticket.assigneeName || "";
    const found = assigneeOptions.find((e) => e.value === ticket.assigneeId);
    return found?.label ?? ticket.assigneeName ?? "";
  })();

  return (
    <tr style={{ backgroundColor: index % 2 === 0 ? theme.surface : theme.background, borderBottom: `1px solid ${theme.border}` }}>

      {/* Summary */}
      <td className="px-3 py-2.5 min-w-[180px]">
        <button onClick={handleSummaryClick} className="text-left w-full group" title="Double-click to open details">
          <p style={{ color: theme.text }} className="text-sm font-semibold group-hover:opacity-70 transition-opacity line-clamp-2">
            {ticket.summary}
          </p>
          <p style={{ color: theme.subtext }} className="text-[11px] mt-0.5">{ticket.ticketNumber}</p>
        </button>
      </td>

      {/* Requester */}
      <td className="px-3 py-2.5 min-w-[140px]">
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
      <td className="text-smpx-3 py-2.5 min-w-[140px]">
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
      <td className="px-3 py-2.5 min-w-[130px]">
        <BadgeSelect value={ticket.category} displayName={ticket.category || "—"} options={CATEGORY_OPTIONS} placeholder="—"
          onChange={async (val) => onUpdateField(ticket.ticketNumber, "category", val)} />
      </td>

      {/* Priority */}
      <td className="px-3 py-2.5 min-w-[90px]">
        <BadgeSelect value={ticket.priority} displayName={ticket.priority} options={PRIORITY_OPTIONS} placeholder="—"
          onChange={async (val) => onUpdateField(ticket.ticketNumber, "priority", val)} />
      </td>

      {/* Status */}
      <td className="px-3 py-2.5 min-w-[110px]">
        <BadgeSelect value={ticket.status} displayName={ticket.status} options={STATUS_OPTIONS} placeholder="—"
          onChange={async (val) => onUpdateField(ticket.ticketNumber, "status", val)} />
      </td>

      {/* Due Date */}
      <td className="px-3 py-2.5 min-w-[120px]">
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

type Props = { user?: ADUser };

export default function TicketsPage({ user }: Props) {
  const { theme } = useTheme();
  const [tickets, setTickets] = useState<ConcernTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingTicket, setEditingTicket] = useState<ConcernTicket | null>(null);

  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("default");

  const { employees, currentUserId, currentUserName } = useEmployees();

  const loadTickets = async () => {
    setLoading(true);
    try   { setTickets(await getAllTickets()); }
    catch (err) { console.error("Unable to load tickets", err); }
    finally     { setLoading(false); }
  };

  useEffect(() => { loadTickets().catch(console.error); }, []);

  const handleSort = (key: SortKey) => {
    if (sortKey !== key) { setSortKey(key); setSortDir("asc"); }
    else {
      const next = cycleDir(sortDir);
      setSortDir(next);
      if (next === "default") setSortKey(null);
    }
  };

  const dirFor = (key: SortKey): SortDir => sortKey === key ? sortDir : "default";

  const filteredTickets = (() => {
    const q = search.trim().toLowerCase();
    const base = q
      ? tickets.filter((t) =>
          [t.summary, t.details || "", t.requesterName, t.assigneeName, t.category, t.priority, t.status]
            .join(" ").toLowerCase().includes(q))
      : tickets;
    return sortKey ? sortTickets(base, sortKey, sortDir) : base;
  })();

  const handleUpdateField = async (ticketNumber: string, field: string, value: any) => {
    try {
      await updateTicketField(ticketNumber, field, value);
      await loadTickets();
    } catch (err) {
      console.error(`Unable to update ${field} for ticket ${ticketNumber}:`, err);
    }
  };

  const openEditModal = (ticket: ConcernTicket) => {
    setEditingTicket(ticket);
    setEditModalVisible(true);
  };

  const handleSaveEditedTicket = async (
    ticketNumber: string,
    updates: { summary: string; details: string; category: string; priority: string; status: string; assigneeId: string; assigneeName: string; dueDate: string },
  ) => {
    try {
      await Promise.all([
        updateTicketField(ticketNumber, "summary",      updates.summary.trim()),
        updateTicketField(ticketNumber, "details",      updates.details.trim()),
        updateTicketField(ticketNumber, "category",     updates.category),
        updateTicketField(ticketNumber, "priority",     updates.priority),
        updateTicketField(ticketNumber, "status",       updates.status),
        updateTicketField(ticketNumber, "assigneeId",   updates.assigneeId),
        updateTicketField(ticketNumber, "assigneeName", updates.assigneeName),
        updateTicketField(ticketNumber, "dueDate",      new Date(updates.dueDate)),
      ]);
      await loadTickets();
    } catch (err) {
      console.error("Unable to save ticket details:", err);
      throw err;
    }
  };

  const assigneeOptions = employees.map((e: EmployeeOption) => ({ label: e.name, value: e.id }));

  const HEADERS: { label: string; key: SortKey }[] = [
    { label: "Summary",   key: "summary"   },
    { label: "Requester", key: "requester" },
    { label: "Assignee",  key: "assignee"  },
    { label: "Category",  key: "category"  },
    { label: "Priority",  key: "priority"  },
    { label: "Status",    key: "status"    },
    { label: "Due Date",  key: "dueDate"   },
  ];

  return (
    <div style={{ backgroundColor: theme.background }} className="flex flex-col h-full p-4">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 style={{ color: theme.text }} className="text-xl font-bold">Concern Tickets</h1>
          <p style={{ color: theme.subtext }} className="text-xs mt-0.5">
            {filteredTickets.length} of {tickets.length} tickets
          </p>
        </div>
        <button
          onClick={() => setModalVisible(true)}
          style={{ backgroundColor: theme.primary, color: theme.primaryText }}
          className="px-4 py-2 text-sm font-semibold rounded-lg transition-colors"
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.primaryHover)}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = theme.primary)}
        >
          + Add Ticket
        </button>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search tickets..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.inputText }}
        className="w-full px-4 py-2.5 mb-4 text-sm border rounded-lg focus:outline-none"
        onFocus={(e) => (e.currentTarget.style.borderColor = theme.inputBorderFocus)}
        onBlur={(e) => (e.currentTarget.style.borderColor = theme.inputBorder)}
      />

      {/* Table */}
      {loading ? (
        <div className="flex flex-1 items-center justify-center py-20">
          <div style={{ borderColor: theme.primary }} className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-20">
          <p style={{ color: theme.subtext }} className="text-sm">No tickets found.</p>
        </div>
      ) : (
        <div style={{ borderColor: theme.border }} className="overflow-auto rounded-lg border flex-1">
          <table className="min-w-full text-sm">
            <thead style={{ backgroundColor: theme.surfaceRaised }} className="sticky top-0 z-10">
              <tr>
                {HEADERS.map(({ label, key }) => (
                  <th
                    key={key}
                    onClick={() => handleSort(key)}
                    style={{ color: theme.subtext, borderColor: theme.border }}
                    className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap border-b cursor-pointer select-none transition-colors"
                    onMouseEnter={(e) => (e.currentTarget.style.color = theme.text)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = theme.subtext)}
                  >
                    <span className="inline-flex items-center gap-1">
                      {label}
                      <SortIcon dir={dirFor(key)} />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredTickets.map((ticket, index) => {
                try {
                  return (
                    <TicketRow
                      key={ticket.ticketNumber}
                      ticket={ticket}
                      index={index}
                      assigneeOptions={assigneeOptions}
                      onUpdateField={handleUpdateField}
                      onOpenDetails={openEditModal}
                    />
                  );
                } catch (err) {
                  console.error("Error rendering ticket row:", err, ticket);
                  return (
                    <tr key={ticket.ticketNumber}>
                      <td colSpan={7} style={{ color: theme.dangerText }} className="px-3 py-2 text-xs">
                        Error rendering ticket
                      </td>
                    </tr>
                  );
                }
              })}
            </tbody>
          </table>
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
    </div>
  );
}