import React, { useEffect, useState, useMemo, useCallback } from "react";
import { ActivityIndicator } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { getAuditLogs, AuditEntry, AuditTable } from "../../Services/auditService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatTimestamp = (ts: any): string => {
  if (!ts) return "—";
  const date = typeof ts.toDate === "function" ? ts.toDate() : new Date(ts);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const FIELD_LABEL: Record<string, string> = {
  status:        "Status",
  priority:      "Priority",
  category:      "Category",
  assigneeId:    "Assignee ID",
  assigneeName:  "Assignee",
  requesterId:   "Requester ID",
  requesterName: "Requester",
  dueDate:       "Due Date",
  summary:       "Summary",
  details:       "Details",
  location:      "Location",
  company:       "Company",
  model:         "Model",
  quantity:      "Quantity",
  updatedAt:     "Updated At",
};

const friendlyField = (f: string) =>
  FIELD_LABEL[f] ?? f.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());

// ─── Tab config ───────────────────────────────────────────────────────────────

type Tab = { key: AuditTable; label: string; icon: string };

const TABS: Tab[] = [
  { key: "inventory",   label: "IT Inventory",   icon: "🖥" },
  { key: "consumables", label: "Consumables",     icon: "🖨" },
  { key: "tickets",     label: "Tickets",         icon: "🎫" },
];

// ─── Single log row ───────────────────────────────────────────────────────────

type RowProps = { entry: AuditEntry; theme: ReturnType<typeof useTheme>["theme"]; index: number };

const AuditRow: React.FC<RowProps> = React.memo(({ entry, theme, index }) => (
  <tr
    style={{
      backgroundColor: index % 2 === 0 ? theme.surface : theme.background,
      borderBottom: `1px solid ${theme.border}`,
    }}
  >
    {/* Timestamp */}
    <td
      className="px-4 py-2.5 whitespace-nowrap text-xs"
      style={{ color: theme.subtext, minWidth: 150 }}
    >
      {formatTimestamp(entry.timestamp)}
    </td>

    {/* Record */}
    <td className="px-4 py-2.5 min-w-[120px]">
      <span
        className="inline-block px-2 py-0.5 rounded text-xs font-mono font-medium"
        style={{ backgroundColor: theme.surfaceRaised, color: theme.text }}
      >
        {entry.recordId}
      </span>
    </td>

    {/* Field */}
    <td
      className="px-4 py-2.5 text-xs whitespace-nowrap"
      style={{ color: theme.text, minWidth: 110 }}
    >
      {friendlyField(entry.field)}
    </td>

    {/* Old → New */}
    <td className="px-4 py-2.5 min-w-[220px]">
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className="inline-block px-2 py-0.5 rounded text-xs max-w-[120px] truncate"
          style={{
            backgroundColor: "#fef2f2",
            color: "#b91c1c",
            border: "1px solid #fecaca",
          }}
          title={entry.oldValue}
        >
          {entry.oldValue || "—"}
        </span>
        <span style={{ color: theme.subtext, fontSize: 11 }}>→</span>
        <span
          className="inline-block px-2 py-0.5 rounded text-xs max-w-[120px] truncate"
          style={{
            backgroundColor: "#f0fdf4",
            color: "#15803d",
            border: "1px solid #bbf7d0",
          }}
          title={entry.newValue}
        >
          {entry.newValue || "—"}
        </span>
      </div>
    </td>

    {/* Changed by */}
    <td
      className="px-4 py-2.5 text-xs whitespace-nowrap"
      style={{ color: theme.text, minWidth: 120 }}
    >
      <div className="flex items-center gap-1.5">
        <span
          className="inline-flex items-center justify-center rounded-full text-[10px] font-bold flex-shrink-0"
          style={{
            width: 22,
            height: 22,
            backgroundColor: theme.primarySubtle ?? theme.bgActive,
            color: theme.primary,
          }}
        >
          {(entry.changedBy ?? "?")[0]?.toUpperCase()}
        </span>
        <span style={{ color: theme.text }}>{entry.changedBy || "—"}</span>
      </div>
    </td>
  </tr>
));

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AuditTrailPage() {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<AuditTable>("inventory");
  const [logs, setLogs] = useState<Record<AuditTable, AuditEntry[]>>({
    inventory:   [],
    consumables: [],
    tickets:     [],
  });
  const [loadingTab, setLoadingTab] = useState<AuditTable | null>(null);
  const [loadedTabs, setLoadedTabs] = useState<Set<AuditTable>>(new Set());
  const [search, setSearch] = useState("");
  const [fieldFilter, setFieldFilter] = useState("");

  const fetchTab = useCallback(
    async (tab: AuditTable) => {
      if (loadedTabs.has(tab)) return;
      setLoadingTab(tab);
      try {
        const entries = await getAuditLogs(tab, 300);
        setLogs((prev) => ({ ...prev, [tab]: entries }));
        setLoadedTabs((prev) => new Set(prev).add(tab));
      } catch (err) {
        console.error(`[audit] Failed to load ${tab} logs:`, err);
      } finally {
        setLoadingTab(null);
      }
    },
    [loadedTabs]
  );

  // Load initial tab
  useEffect(() => {
    fetchTab("inventory");
  }, []);

  const handleTabChange = (tab: AuditTable) => {
    setActiveTab(tab);
    setSearch("");
    setFieldFilter("");
    fetchTab(tab);
  };

  const currentLogs = logs[activeTab];

  // Unique field names for filter dropdown
  const uniqueFields = useMemo(() => {
    const fields = new Set(currentLogs.map((e) => e.field));
    return Array.from(fields).sort();
  }, [currentLogs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return currentLogs.filter((e) => {
      const matchesField = fieldFilter ? e.field === fieldFilter : true;
      const matchesSearch = q
        ? [e.recordId, e.field, e.oldValue, e.newValue, e.changedBy]
            .join(" ")
            .toLowerCase()
            .includes(q)
        : true;
      return matchesField && matchesSearch;
    });
  }, [currentLogs, search, fieldFilter]);

  const isLoading = loadingTab === activeTab;

  return (
    <div
      style={{ backgroundColor: theme.background, height: "100%" }}
      className="flex flex-col overflow-hidden"
    >
      {/* ── Header ── */}
      <div className="flex-shrink-0 px-5 pt-5 pb-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1
              style={{ color: theme.text }}
              className="text-xl font-bold"
            >
              Audit Trail
            </h1>
            <p style={{ color: theme.subtext }} className="text-xs mt-0.5">
              Full history of field-level changes across all tables
            </p>
          </div>
          <span
            className="text-xs px-2.5 py-1 rounded-full font-medium"
            style={{
              backgroundColor: theme.surfaceRaised,
              color: theme.subtext,
              border: `1px solid ${theme.border}`,
            }}
          >
            SuperAdmin only
          </span>
        </div>

        {/* ── Tabs ── */}
        <div className="flex items-center gap-2 mb-4">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const count = logs[tab.key].length;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabChange(tab.key)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
                style={{
                  backgroundColor: isActive ? theme.primary : theme.surface,
                  color: isActive ? theme.primaryText : theme.subtext,
                  borderColor: isActive ? theme.primary : theme.border,
                }}
              >
                <span>{tab.icon}</span>
                {tab.label}
                {loadedTabs.has(tab.key) && (
                  <span
                    className="px-1.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: isActive
                        ? "rgba(255,255,255,0.25)"
                        : theme.surfaceRaised,
                      color: isActive ? theme.primaryText : theme.subtext,
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Search + Field filter ── */}
        <div className="flex items-center gap-2 mb-3">
          <input
            type="text"
            placeholder="Search by record, field, value, or user…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              backgroundColor: theme.inputBg,
              borderColor: theme.inputBorder,
              color: theme.inputText,
            }}
            className="flex-1 px-3 py-2 text-sm border rounded-lg focus:outline-none"
            onFocus={(e) =>
              (e.currentTarget.style.borderColor = theme.inputBorderFocus)
            }
            onBlur={(e) =>
              (e.currentTarget.style.borderColor = theme.inputBorder)
            }
          />
          <select
            value={fieldFilter}
            onChange={(e) => setFieldFilter(e.target.value)}
            style={{
              backgroundColor: theme.surface,
              borderColor: theme.border,
              color: fieldFilter ? theme.text : theme.subtext,
            }}
            className="px-3 py-2 text-xs border rounded-lg focus:outline-none"
          >
            <option value="">All fields</option>
            {uniqueFields.map((f) => (
              <option key={f} value={f}>
                {friendlyField(f)}
              </option>
            ))}
          </select>
        </div>

        {/* ── Result count ── */}
        <p style={{ color: theme.subtext }} className="text-xs mb-2">
          {isLoading ? "Loading…" : `${filtered.length} entries`}
        </p>
      </div>

      {/* ── Table ── */}
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <div
            style={{ borderColor: theme.primary }}
            className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <p style={{ color: theme.subtext }} className="text-sm">
            {currentLogs.length === 0
              ? "No audit logs yet for this table."
              : "No entries match your search."}
          </p>
        </div>
      ) : (
        <div
          className="inventory-scroll flex-1 overflow-y-auto overflow-x-auto px-5 pb-5"
        >
          <div
            style={{ borderColor: theme.border }}
            className="rounded-lg border"
          >
            <table
              className="min-w-full text-sm"
              style={{ borderCollapse: "collapse" }}
            >
              <thead>
                <tr>
                  {["Timestamp", "Record", "Field", "Old → New", "Changed By"].map(
                    (h) => (
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
                        className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide whitespace-nowrap border-b"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry, i) => (
                  <AuditRow
                    key={entry.id ?? i}
                    entry={entry}
                    theme={theme}
                    index={i}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
