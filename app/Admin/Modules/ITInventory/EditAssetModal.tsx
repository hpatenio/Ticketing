import React, { useEffect, useRef, useState } from "react";
import { ITInventory } from "../../../../types";
import {
  updateAsset,
  updateAssetField,
} from "../../../../Services/itInventory";
import { Timestamp } from "firebase/firestore";
import { useTheme } from "../../../../theme/ThemeContext";
import BadgeSelect from "../../../../components/common/BadgeSelect"; // adjust path
import { logAuditBatch } from "../../../../Services/auditService";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Employee = {
  id: string;
  name: string;
};

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onDelete: (assetTag: string) => Promise<void>;
  selectedAsset: ITInventory | null;
  employees: Employee[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  company: "",
  serialNumber: "",
  model: "",
  brand: "",
  status: "Spare" as ITInventory["status"],
  assigneeId: "",
  assigneeName: "",
  category: "Laptop" as ITInventory["category"],
  location: "Unit 1 & 2" as ITInventory["location"],
  datePurchased: "",
  notes: "",
};

const COMPANY_OPTIONS = [
  {
    label: "OCG",
    value: "OCG",
    badgeClass:
      "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-purple-100 text-purple-800",
  },
  {
    label: "SDB",
    value: "SDB",
    badgeClass:
      "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-blue-100 text-blue-800",
  },
];

const STATUS_OPTIONS = [
  {
    label: "Spare",
    value: "Spare",
    badgeClass:
      "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-sky-100 text-sky-700",
  },
  {
    label: "Deployed",
    value: "Deployed",
    badgeClass:
      "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-green-100 text-green-800",
  },
  {
    label: "Defective",
    value: "Defective",
    badgeClass:
      "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-red-100 text-red-700",
  },
];

const CATEGORY_OPTIONS = [
  {
    label: "Laptop",
    value: "Laptop",
    badgeClass:
      "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-orange-100 text-orange-700",
  },
  {
    label: "Monitor",
    value: "Monitor",
    badgeClass:
      "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-yellow-100 text-yellow-700",
  },
  {
    label: "Desktop",
    value: "Desktop",
    badgeClass:
      "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-teal-100 text-teal-700",
  },
];

const LOCATION_OPTIONS = [
  {
    label: "Unit 1 & 2",
    value: "Unit 1 & 2",
    badgeClass:
      "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-pink-100 text-pink-700",
  },
  {
    label: "Unit 3",
    value: "Unit 3",
    badgeClass:
      "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-pink-100 text-pink-700",
  },
  {
    label: "BDO Makati",
    value: "BDO Makati",
    badgeClass:
      "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-teal-100 text-teal-700",
  },
  {
    label: "Triumph",
    value: "Triumph",
    badgeClass:
      "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-indigo-100 text-indigo-700",
  },
  {
    label: "WFH",
    value: "WFH",
    badgeClass:
      "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-gray-100 text-gray-700",
  },
];

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
                width: 22,
                height: 22,
                borderRadius: "50%",
                backgroundColor: theme.primary,
                color: theme.primaryText,
                fontSize: 10,
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {displayName
                .split(" ")
                .map((w) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </span>
            <span
              style={{
                fontSize: 13,
                color: theme.text,
                flex: 1,
                textAlign: "left",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {displayName}
            </span>
          </>
        ) : (
          <span style={{ fontSize: 13, color: theme.inputPlaceholder }}>
            {placeholder}
          </span>
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
              width: "100%",
              padding: "8px 12px",
              fontSize: 12,
              borderBottom: `1px solid ${theme.border}`,
              outline: "none",
              backgroundColor: theme.inputBg,
              color: theme.inputText,
              boxSizing: "border-box",
            }}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setOpen(false);
                setQuery("");
              }
            }}
          />
          <ul
            style={{
              maxHeight: 176,
              overflowY: "auto",
              margin: 0,
              padding: 0,
              listStyle: "none",
            }}
          >
            {filtered.length === 0 ? (
              <li
                style={{
                  padding: "8px 12px",
                  fontSize: 12,
                  color: theme.subtext,
                }}
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
                    padding: "8px 12px",
                    fontSize: 13,
                    cursor: "pointer",
                    color: o.value === value ? theme.primary : theme.text,
                    fontWeight: o.value === value ? 600 : 400,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    borderBottom: `1px solid ${theme.border}`,
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = theme.bgHover)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "transparent")
                  }
                >
                  {o.value && (
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        backgroundColor: theme.primarySubtle,
                        color: theme.primary,
                        fontSize: 10,
                        fontWeight: 600,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {o.label
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
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

// ─── Field label wrapper ──────────────────────────────────────────────────────

const Field: React.FC<{
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}> = ({ label, icon, children, className = "" }) => {
  const { theme } = useTheme();
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: theme.subtext,
          display: "flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        <span style={{ opacity: 0.7 }}>{icon}</span>
        {label}
      </label>
      {children}
    </div>
  );
};

// ─── inputClass style helper ──────────────────────────────────────────────────

const useInputStyle = (focused = false) => {
  const { theme } = useTheme();
  return {
    width: "100%",
    padding: "0 10px",
    height: 38,
    fontSize: 13,
    borderRadius: 8,
    border: `1px solid ${focused ? theme.inputBorderFocus : theme.inputBorder}`,
    backgroundColor: theme.inputBg,
    color: theme.inputText,
    outline: "none",
    boxSizing: "border-box" as const,
  };
};

// ─── ThemedInput ──────────────────────────────────────────────────────────────

const ThemedInput: React.FC<{
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
}> = ({ name, value, onChange, placeholder, type = "text" }) => {
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <input
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: "100%",
        padding: "0 10px",
        height: 38,
        fontSize: 13,
        borderRadius: 8,
        border: `1px solid ${focused ? theme.inputBorderFocus : theme.inputBorder}`,
        backgroundColor: theme.inputBg,
        color: theme.inputText,
        outline: "none",
        boxSizing: "border-box",
      }}
    />
  );
};

// ─── ThemedTextarea ───────────────────────────────────────────────────────────

const ThemedTextarea: React.FC<{
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
}> = ({ name, value, onChange, placeholder, rows = 3 }) => {
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <textarea
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: "100%",
        padding: "8px 10px",
        fontSize: 13,
        borderRadius: 8,
        border: `1px solid ${focused ? theme.inputBorderFocus : theme.inputBorder}`,
        backgroundColor: theme.inputBg,
        color: theme.inputText,
        outline: "none",
        resize: "none",
        boxSizing: "border-box",
        fontFamily: "inherit",
      }}
    />
  );
};

// ─── Main Modal ───────────────────────────────────────────────────────────────

const EditAssetModal: React.FC<Props> = ({
  visible,
  onClose,
  onSuccess,
  onDelete,
  selectedAsset,
  employees,
}) => {
  const { theme } = useTheme();
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (selectedAsset) {
      setForm({
        company: selectedAsset.company,
        serialNumber: selectedAsset.serialNumber,
        model: selectedAsset.model,
        brand: selectedAsset.brand,
        status: selectedAsset.status,
        assigneeId: selectedAsset.assigneeId,
        assigneeName: selectedAsset.assigneeName,
        category: selectedAsset.category,
        location: selectedAsset.location,
        datePurchased: selectedAsset.datePurchased
          ? selectedAsset.datePurchased.toDate().toISOString().split("T")[0]
          : "",
        notes: selectedAsset.notes,
      });
    }
    setError("");
    setConfirmDelete(false);
  }, [selectedAsset, visible]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!form.company || !form.brand) {
      setError("Company and Brand are required.");
      return;
    }
    if (!selectedAsset) return;

    setLoading(true);
    setError("");

    try {
      // ── 1. Resolve current user (same source as updateAssetField) ──────────
      let changedBy = "Unknown";
      let changedById = "";
      try {
        const saved = await AsyncStorage.getItem("AD_USER_DATA");
        if (saved) {
          const user = JSON.parse(saved);
          changedBy = user.displayName ?? "Unknown";
          changedById = user.username ?? "";
        }
      } catch {}

      // ── 2. Build a map of the original values ──────────────────────────────
      const original: Record<string, string> = {
        company: selectedAsset.company ?? "",
        serialNumber: selectedAsset.serialNumber ?? "",
        model: selectedAsset.model ?? "",
        brand: selectedAsset.brand ?? "",
        status: selectedAsset.status ?? "",
        assigneeId: selectedAsset.assigneeId ?? "",
        assigneeName: selectedAsset.assigneeName ?? "",
        category: selectedAsset.category ?? "",
        location: selectedAsset.location ?? "",
        notes: selectedAsset.notes ?? "",
        datePurchased: selectedAsset.datePurchased
          ? selectedAsset.datePurchased.toDate().toISOString().split("T")[0]
          : "",
      };

      // ── 3. Collect only the fields that actually changed ───────────────────
      const changedFields = (Object.keys(form) as (keyof typeof form)[]).filter(
        (key) => (form[key] ?? "") !== (original[key] ?? ""),
      );

      if (changedFields.length === 0) {
        onClose();
        return;
      }

      // ── 4. Persist each changed field to Firestore ─────────────────────────
      //    Pass changedBy/changedById so updateAssetField skips its own
      //    AsyncStorage lookup — avoids a duplicate read per field.
      await Promise.all(
        changedFields.map((field) =>
          updateAssetField(
            selectedAsset.assetTag,
            field,
            field === "datePurchased" && form.datePurchased
              ? (Timestamp.fromDate(new Date(form.datePurchased)) as any)
              : form[field],
            changedBy,
            changedById,
          ),
        ),
      );

      // ── 5. Write ONE batch audit entry for all changed fields ──────────────
      await logAuditBatch({
        table: "inventory",
        recordId: selectedAsset.assetTag,
        recordLabel: selectedAsset.assetTag,
        changedBy,
        changedById,
        changes: changedFields.map((field) => ({
          field,
          oldValue: original[field] ?? "",
          newValue: (form[field] as string) ?? "",
        })),
      });

      onSuccess();
      onClose();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  const handleDeleteClick = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    handleConfirmDelete();
  };

  const handleConfirmDelete = async () => {
    if (!selectedAsset) return;
    setDeleting(true);
    try {
      await onDelete(selectedAsset.assetTag);
      onClose();
    } catch {
      setError("Failed to delete asset. Please try again.");
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

  if (!visible || !selectedAsset) return null;

  // ── SVG icons ──
  const icons = {
    company: (
      <svg
        className="w-3.5 h-3.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 21h18M9 21V7l6-4v18M9 11H3v10"
        />
      </svg>
    ),
    hash: (
      <svg
        className="w-3.5 h-3.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 9h16M4 15h16M10 3l-1 18M15 3l-1 18"
        />
      </svg>
    ),
    brand: (
      <svg
        className="w-3.5 h-3.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path strokeLinecap="round" d="M8 21h8M12 17v4" />
      </svg>
    ),
    model: (
      <svg
        className="w-3.5 h-3.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path strokeLinecap="round" d="M3 9h18M9 21V9" />
      </svg>
    ),
    category: (
      <svg
        className="w-3.5 h-3.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7 7h.01M11 3H5a2 2 0 00-2 2v6l9 9 7-7-9-9zm0 0"
        />
      </svg>
    ),
    status: (
      <svg
        className="w-3.5 h-3.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
      </svg>
    ),
    location: (
      <svg
        className="w-3.5 h-3.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 21s-6-5.686-6-10a6 6 0 1112 0c0 4.314-6 10-6 10z"
        />
        <circle cx="12" cy="11" r="2" />
      </svg>
    ),
    date: (
      <svg
        className="w-3.5 h-3.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path strokeLinecap="round" d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
    assignee: (
      <svg
        className="w-3.5 h-3.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <circle cx="12" cy="8" r="4" />
        <path strokeLinecap="round" d="M4 20c0-4 3.582-7 8-7s8 3 8 7" />
      </svg>
    ),
    notes: (
      <svg
        className="w-3.5 h-3.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
        />
      </svg>
    ),
  };

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
            <h2
              style={{
                fontSize: 17,
                fontWeight: 600,
                color: theme.text,
                margin: 0,
              }}
            >
              Edit asset
            </h2>
            <p style={{ fontSize: 11, color: theme.subtext, marginTop: 2 }}>
              Asset tag: {selectedAsset.assetTag}
            </p>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: theme.subtext,
              fontSize: 20,
              lineHeight: 1,
              padding: 4,
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
              <p style={{ fontSize: 12, color: theme.dangerText, margin: 0 }}>
                ⚠ {error}
              </p>
            </div>
          )}

          {/* Model + Serial */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="# Serial number" icon={icons.hash}>
              <ThemedInput
                name="serialNumber"
                value={form.serialNumber}
                onChange={handleChange}
                placeholder="Enter serial number"
              />
            </Field>
            <Field label="Model" icon={icons.model}>
              <ThemedInput
                name="model"
                value={form.model}
                onChange={handleChange}
                placeholder="Model"
              />
            </Field>
          </div>

          {/* Brand + Date Purchased */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Brand" icon={icons.brand}>
              <ThemedInput
                name="brand"
                value={form.brand}
                onChange={handleChange}
                placeholder="Brand *"
              />
            </Field>

            <Field label="Date purchased" icon={icons.date}>
              <input
                name="datePurchased"
                type="date"
                value={form.datePurchased}
                onChange={handleChange}
                style={{
                  width: "100%",
                  padding: "0 10px",
                  height: 38,
                  fontSize: 13,
                  borderRadius: 8,
                  border: `1px solid ${theme.inputBorder}`,
                  backgroundColor: theme.inputBg,
                  color: theme.inputText,
                  outline: "none",
                  boxSizing: "border-box",
                  colorScheme: theme.mode === "dark" ? "dark" : "light",
                }}
              />
            </Field>
          </div>

          {/* Category + Company */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Company" icon={icons.company}>
              <BadgeSelect
                value={form.company}
                displayName={form.company}
                options={COMPANY_OPTIONS}
                placeholder="Select company"
                onChange={(val, label) =>
                  setForm((f) => ({ ...f, company: val }))
                }
                className="w-full"
              />
            </Field>
            <Field label="Category" icon={icons.category}>
              <BadgeSelect
                value={form.category}
                displayName={form.category}
                options={CATEGORY_OPTIONS}
                placeholder="Select category"
                onChange={(val) =>
                  setForm((f) => ({
                    ...f,
                    category: val as ITInventory["category"],
                  }))
                }
                className="w-full"
              />
            </Field>
          </div>

          {/* Location + Status */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Location" icon={icons.location}>
              <BadgeSelect
                value={form.location}
                displayName={form.location}
                options={LOCATION_OPTIONS}
                placeholder="Select location"
                onChange={(val) =>
                  setForm((f) => ({
                    ...f,
                    location: val as ITInventory["location"],
                  }))
                }
                className="w-full"
              />
            </Field>
            <Field label="Status" icon={icons.status}>
              <BadgeSelect
                value={form.status}
                displayName={form.status}
                options={STATUS_OPTIONS}
                placeholder="Select status"
                onChange={(val) =>
                  setForm((f) => ({
                    ...f,
                    status: val as ITInventory["status"],
                  }))
                }
                className="w-full"
              />
            </Field>
          </div>

          {/* Assignee */}
          <Field label="Assignee" icon={icons.assignee}>
            <SearchableSelect
              value={form.assigneeId}
              displayName={form.assigneeName}
              options={employees.map((e) => ({ label: e.name, value: e.id }))}
              placeholder="Search assignee..."
              onChange={(id, name) =>
                setForm((f) => ({
                  ...f,
                  assigneeId: id,
                  assigneeName: name === "—" ? "" : name,
                }))
              }
            />
          </Field>

          {/* Notes */}
          <Field label="Notes" icon={icons.notes}>
            <ThemedTextarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              placeholder="Add any notes about this asset..."
              rows={3}
            />
          </Field>
        </div>

        {/* ── Footer ── */}
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderTop: `1px solid ${theme.border}` }}
        >
          <button
            onClick={handleDeleteClick}
            disabled={deleting || loading}
            style={{
              padding: "7px 14px",
              fontSize: 13,
              fontWeight: 500,
              borderRadius: 8,
              cursor: "pointer",
              border: `1px solid ${theme.dangerBorder}`,
              backgroundColor: confirmDelete ? theme.dangerBg : "transparent",
              color: theme.dangerText,
              display: "flex",
              alignItems: "center",
              gap: 6,
              opacity: deleting || loading ? 0.6 : 1,
            }}
          >
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"
              />
            </svg>
            {deleting
              ? "Deleting…"
              : confirmDelete
                ? "Confirm delete"
                : "Delete asset"}
          </button>

          <div className="flex gap-2">
            {confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(false)}
                style={{
                  padding: "7px 16px",
                  fontSize: 13,
                  borderRadius: 8,
                  cursor: "pointer",
                  border: `1px solid ${theme.border}`,
                  backgroundColor: "transparent",
                  color: theme.subtext,
                }}
              >
                Cancel
              </button>
            ) : (
              <>
                <button
                  onClick={handleClose}
                  style={{
                    padding: "7px 16px",
                    fontSize: 13,
                    borderRadius: 8,
                    cursor: "pointer",
                    border: `1px solid ${theme.border}`,
                    backgroundColor: "transparent",
                    color: theme.subtext,
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  style={{
                    padding: "7px 18px",
                    fontSize: 13,
                    fontWeight: 600,
                    borderRadius: 8,
                    cursor: "pointer",
                    border: "none",
                    backgroundColor: theme.primary,
                    color: theme.primaryText,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  <svg
                    className="w-3.5 h-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                    />
                  </svg>
                  {loading ? "Saving…" : "Update asset"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditAssetModal;
