import React, { useEffect, useRef, useState } from "react";
import { ConcernTicket } from "../../../../types";
import { useTheme } from "../../../../theme/ThemeContext";
import BadgeSelect from "../../../../components/common/BadgeSelect";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TicketEditUpdates = {
  summary: string;
  details: string;
  category: string;
  priority: string;
  status: string;
  assigneeId: string;
  assigneeName: string;
  dueDate: string;
};

interface Props {
  visible: boolean;
  selectedTicket: ConcernTicket | null;
  assigneeOptions: readonly { label: string; value: string }[];
  onClose: () => void;
  onSave: (ticketNumber: string, updates: TicketEditUpdates) => Promise<void>;
  onDelete?: (ticketNumber: string) => Promise<void>;
}

// ─── Options ──────────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS = [
  { label: "-", value: "" },
  { label: "CCTV",             value: "CCTV",             badgeClass: "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-blue-100 text-blue-800" },
  { label: "Licenses Accounts",value: "Licenses Accounts",badgeClass: "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-indigo-100 text-indigo-800" },
  { label: "Hardware",         value: "Hardware",         badgeClass: "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-slate-100 text-slate-800" },
  { label: "Email",            value: "Email",            badgeClass: "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-cyan-100 text-cyan-800" },
  { label: "Network",          value: "Network",          badgeClass: "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-teal-100 text-teal-800" },
  { label: "Maintenance",      value: "Maintenance",      badgeClass: "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-amber-100 text-amber-800" },
  { label: "Medicine",         value: "Medicine",         badgeClass: "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-emerald-100 text-emerald-800" },
  { label: "Office Supplies",  value: "Office Supplies",  badgeClass: "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-fuchsia-100 text-fuchsia-800" },
  { label: "Software",         value: "Software",         badgeClass: "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-sky-100 text-sky-800" },
  { label: "Other",            value: "Other",            badgeClass: "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-gray-100 text-gray-800" },
];

const PRIORITY_OPTIONS = [
  { label: "Low",    value: "Low",    badgeClass: "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-emerald-100 text-emerald-800" },
  { label: "Medium", value: "Medium", badgeClass: "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800" },
  { label: "High",   value: "High",   badgeClass: "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-red-100 text-red-800" },
];

const STATUS_OPTIONS = [
  { label: "Pending",     value: "Pending",     badgeClass: "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800" },
  { label: "In Progress", value: "In Progress", badgeClass: "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-blue-100 text-blue-800" },
  { label: "Resolved",    value: "Resolved",    badgeClass: "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-emerald-100 text-emerald-800" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const parseDueDate = (raw: any): string => {
  if (!raw) return "";
  if (typeof raw.toDate === "function") return raw.toDate().toISOString().split("T")[0];
  if (raw instanceof Date) return raw.toISOString().split("T")[0];
  const d = new Date(raw);
  return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
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

  const allOptions = [{ label: "—", value: "" }, ...options];
  const filtered = query
    ? allOptions.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
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
    <div ref={wrapRef} className="relative w-full">
      <button
        ref={triggerRef}
        type="button"
        onClick={openDropdown}
        className="w-full"
        style={{
          backgroundColor: theme.inputBg,
          border: `1px solid ${theme.inputBorder}`,
          borderRadius: 8,
          padding: "0 10px",
          height: 38,
          display: "flex",
          alignItems: "center",
          gap: 8,
          cursor: "pointer",
        }}
      >
        {value ? (
          <>
            <span
              style={{
                width: 22, height: 22,
                borderRadius: "50%",
                backgroundColor: theme.primary,
                color: theme.primaryText,
                fontSize: 10, fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {displayName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
            </span>
            <span
              style={{
                fontSize: 13, color: theme.text,
                flex: 1, textAlign: "left",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}
            >
              {displayName}
            </span>
          </>
        ) : (
          <span style={{ fontSize: 13, color: theme.inputPlaceholder }}>{placeholder}</span>
        )}
      </button>

      {open && (
        <div
          style={{
            ...dropdownStyle,
            backgroundColor: theme.surface,
            border: `1px solid ${theme.border}`,
            borderRadius: 8,
            boxShadow: `0 4px 16px ${theme.shadow}`,
          }}
        >
          <input
            autoFocus
            type="text"
            value={query}
            placeholder="Search..."
            style={{
              width: "100%", padding: "8px 12px", fontSize: 12,
              borderBottom: `1px solid ${theme.border}`,
              outline: "none",
              backgroundColor: theme.inputBg,
              color: theme.inputText,
              boxSizing: "border-box",
            }}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Escape") { setOpen(false); setQuery(""); } }}
          />
          <ul style={{ maxHeight: 176, overflowY: "auto", margin: 0, padding: 0, listStyle: "none" }}>
            {filtered.length === 0 ? (
              <li style={{ padding: "8px 12px", fontSize: 12, color: theme.subtext }}>No results</li>
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
                    padding: "8px 12px", fontSize: 13, cursor: "pointer",
                    color: o.value === value ? theme.primary : theme.text,
                    fontWeight: o.value === value ? 600 : 400,
                    display: "flex", alignItems: "center", gap: 8,
                    borderBottom: `1px solid ${theme.border}`,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.bgHover)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  {o.value && (
                    <span
                      style={{
                        width: 22, height: 22, borderRadius: "50%",
                        backgroundColor: theme.primarySubtle,
                        color: theme.primary,
                        fontSize: 10, fontWeight: 600,
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {o.label.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                    </span>
                  )}
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

// ─── Field wrapper ────────────────────────────────────────────────────────────

const Field: React.FC<{
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}> = ({ label, icon, children, className = "" }) => {
  const { theme } = useTheme();
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label style={{ fontSize: 12, fontWeight: 500, color: theme.subtext, display: "flex", alignItems: "center", gap: 5 }}>
        <span style={{ opacity: 0.7 }}>{icon}</span>
        {label}
      </label>
      {children}
    </div>
  );
};

// ─── ThemedInput ──────────────────────────────────────────────────────────────

const ThemedInput: React.FC<{
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
}> = ({ value, onChange, placeholder, type = "text" }) => {
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: "100%", padding: "0 10px", height: 38, fontSize: 13,
        borderRadius: 8,
        border: `1px solid ${focused ? theme.inputBorderFocus : theme.inputBorder}`,
        backgroundColor: theme.inputBg, color: theme.inputText,
        outline: "none", boxSizing: "border-box",
      }}
    />
  );
};

// ─── ThemedTextarea ───────────────────────────────────────────────────────────

const ThemedTextarea: React.FC<{
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
}> = ({ value, onChange, placeholder, rows = 3 }) => {
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: "100%", padding: "8px 10px", fontSize: 13,
        borderRadius: 8,
        border: `1px solid ${focused ? theme.inputBorderFocus : theme.inputBorder}`,
        backgroundColor: theme.inputBg, color: theme.inputText,
        outline: "none", resize: "none",
        boxSizing: "border-box", fontFamily: "inherit",
      }}
    />
  );
};

// ─── Icons ────────────────────────────────────────────────────────────────────

const icons = {
  summary: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  details: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h10" />
    </svg>
  ),
  category: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M11 3H5a2 2 0 00-2 2v6l9 9 7-7-9-9zm0 0" />
    </svg>
  ),
  priority: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9M3 12h5m10-4l-4 4 4 4" />
    </svg>
  ),
  status: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
    </svg>
  ),
  assignee: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="12" cy="8" r="4" />
      <path strokeLinecap="round" d="M4 20c0-4 3.582-7 8-7s8 3 8 7" />
    </svg>
  ),
  date: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path strokeLinecap="round" d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  ),
};

// ─── Modal ────────────────────────────────────────────────────────────────────

const EditTicketModal: React.FC<Props> = ({
  visible,
  selectedTicket,
  assigneeOptions,
  onClose,
  onSave,
  onDelete,
}) => {
  const { theme } = useTheme();

  const [summary, setSummary]           = useState("");
  const [details, setDetails]           = useState("");
  const [category, setCategory]         = useState("");
  const [priority, setPriority]         = useState("");
  const [status, setStatus]             = useState("");
  const [assigneeId, setAssigneeId]     = useState("");
  const [assigneeName, setAssigneeName] = useState("");
  const [dueDate, setDueDate]           = useState("");
  const [error, setError]               = useState("");
  const [saving, setSaving]             = useState(false);
  const [deleting, setDeleting]         = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!selectedTicket) {
      setSummary(""); setDetails(""); setCategory(""); setPriority("");
      setStatus(""); setAssigneeId(""); setAssigneeName("");
      setDueDate(""); setError(""); setConfirmDelete(false);
      return;
    }
    setSummary(selectedTicket.summary);
    setDetails(selectedTicket.details || "");
    setCategory(selectedTicket.category);
    setPriority(selectedTicket.priority);
    setStatus(selectedTicket.status);
    setAssigneeId(selectedTicket.assigneeId || "");
    setAssigneeName(selectedTicket.assigneeName || "");
    setDueDate(parseDueDate(selectedTicket.dueDate));
    setError("");
    setConfirmDelete(false);
  }, [selectedTicket, visible]);

  const handleSave = async () => {
    if (!selectedTicket) return;
    setError("");
    if (!summary.trim()) { setError("Summary is required.");  return; }
    if (!details.trim()) { setError("Details are required."); return; }
    if (!dueDate)        { setError("Due date is required."); return; }
    setSaving(true);
    try {
      await onSave(selectedTicket.ticketNumber, {
        summary: summary.trim(),
        details: details.trim(),
        category, priority, status,
        assigneeId, assigneeName, dueDate,
      });
      onClose();
    } catch (err) {
      console.error("Failed to save ticket:", err);
      setError("Unable to save ticket. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePress = async () => {
    if (!selectedTicket || !onDelete) return;
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      await onDelete(selectedTicket.ticketNumber);
      onClose();
    } catch {
      setError("Failed to delete ticket. Please try again.");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleClose = () => {
    setError("");
    setConfirmDelete(false);
    onClose();
  };

  if (!visible || !selectedTicket) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: theme.overlay }}
    >
      <div
        className="w-full max-w-lg flex flex-col"
        style={{
          backgroundColor: theme.surface,
          borderRadius: 16,
          maxHeight: "90vh",
          boxShadow: `0 20px 60px ${theme.shadow}`,
          border: `1px solid ${theme.border}`,
        }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-start justify-between px-5 pt-5 pb-4"
          style={{ borderBottom: `1px solid ${theme.border}` }}
        >
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 600, color: theme.text, margin: 0 }}>
              Ticket Details
            </h2>
            <p style={{ fontSize: 11, color: theme.subtext, marginTop: 2 }}>
              {selectedTicket.ticketNumber}
            </p>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: theme.subtext, fontSize: 20, lineHeight: 1, padding: 4,
            }}
          >
            ×
          </button>
        </div>

        {/* ── Body ── */}
        <div
          className="overflow-y-auto flex-1 px-5 py-4"
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
        >
          {error && (
            <div
              style={{
                backgroundColor: theme.dangerBg,
                border: `1px solid ${theme.dangerBorder}`,
                borderRadius: 8,
                padding: "8px 12px",
              }}
            >
              <p style={{ fontSize: 12, color: theme.dangerText, margin: 0 }}>⚠ {error}</p>
            </div>
          )}

          {/* Summary */}
          <Field label="Summary" icon={icons.summary}>
            <ThemedInput
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Enter summary *"
            />
          </Field>

          {/* Details */}
          <Field label="Details" icon={icons.details}>
            <ThemedTextarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Describe the issue or request *"
              rows={3}
            />
          </Field>

          {/* Category + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category" icon={icons.category}>
              <BadgeSelect
                value={category}
                displayName={category || "—"}
                options={CATEGORY_OPTIONS}
                placeholder="Select category"
                onChange={(val) => setCategory(val)}
                className="w-full"
              />
            </Field>
            <Field label="Priority" icon={icons.priority}>
              <BadgeSelect
                value={priority}
                displayName={priority || "—"}
                options={PRIORITY_OPTIONS}
                placeholder="Select priority"
                onChange={(val) => setPriority(val)}
                className="w-full"
              />
            </Field>
          </div>

          {/* Status + Due Date */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Status" icon={icons.status}>
              <BadgeSelect
                value={status}
                displayName={status || "—"}
                options={STATUS_OPTIONS}
                placeholder="Select status"
                onChange={(val) => setStatus(val)}
                className="w-full"
              />
            </Field>
            <Field label="Due date" icon={icons.date}>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={{
                  width: "100%", padding: "0 10px", height: 38, fontSize: 13,
                  borderRadius: 8,
                  border: `1px solid ${theme.inputBorder}`,
                  backgroundColor: theme.inputBg, color: theme.inputText,
                  outline: "none", boxSizing: "border-box",
                  colorScheme: theme.mode === "dark" ? "dark" : "light",
                }}
              />
            </Field>
          </div>

          {/* Assignee */}
          <Field label="Assignee" icon={icons.assignee}>
            <SearchableSelect
              value={assigneeId}
              displayName={assigneeName}
              options={assigneeOptions as { label: string; value: string }[]}
              placeholder="Search assignee..."
              onChange={(id, name) => {
                setAssigneeId(id);
                setAssigneeName(name === "—" ? "" : name);
              }}
            />
          </Field>
        </div>

        {/* ── Footer ── */}
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderTop: `1px solid ${theme.border}` }}
        >
          {/* Delete */}
          {onDelete ? (
            <button
              onClick={handleDeletePress}
              disabled={deleting || saving}
              style={{
                padding: "7px 14px", fontSize: 13, fontWeight: 500,
                borderRadius: 8, cursor: "pointer",
                border: `1px solid ${theme.dangerBorder}`,
                backgroundColor: confirmDelete ? theme.dangerBg : "transparent",
                color: theme.dangerText,
                display: "flex", alignItems: "center", gap: 6,
                opacity: deleting || saving ? 0.6 : 1,
              }}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
              </svg>
              {deleting ? "Deleting…" : confirmDelete ? "Confirm delete" : "Delete ticket"}
            </button>
          ) : (
            <div />
          )}

          <div className="flex gap-2">
            {confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(false)}
                style={{
                  padding: "7px 16px", fontSize: 13, borderRadius: 8, cursor: "pointer",
                  border: `1px solid ${theme.border}`,
                  backgroundColor: "transparent", color: theme.subtext,
                }}
              >
                Cancel
              </button>
            ) : (
              <>
                <button
                  onClick={handleClose}
                  style={{
                    padding: "7px 16px", fontSize: 13, borderRadius: 8, cursor: "pointer",
                    border: `1px solid ${theme.border}`,
                    backgroundColor: "transparent", color: theme.subtext,
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    padding: "7px 18px", fontSize: 13, fontWeight: 600,
                    borderRadius: 8, cursor: "pointer", border: "none",
                    backgroundColor: theme.primary, color: theme.primaryText,
                    display: "flex", alignItems: "center", gap: 6,
                    opacity: saving ? 0.6 : 1,
                  }}
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditTicketModal;
