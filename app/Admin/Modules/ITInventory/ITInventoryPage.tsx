import React, { useEffect, useMemo, useRef, useState } from "react";
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
  { label: "Unit 1 & 2", value: "Unit 1 & 2", badgeClass: "bg-pink-100   text-pink-800   inline-flex justify-center min-w-[100px] px-2 py-1 rounded-full text-sm" },
  { label: "Unit 3",     value: "Unit 3",     badgeClass: "bg-purple-100 text-purple-800 inline-flex justify-center min-w-[100px] px-2 py-1 rounded-full text-sm" },
  { label: "BDO Makati", value: "BDO Makati", badgeClass: "bg-teal-100   text-teal-800   inline-flex justify-center min-w-[100px] px-2 py-1 rounded-full text-sm" },
  { label: "Triumph",    value: "Triumph",    badgeClass: "bg-green-100  text-green-800  inline-flex justify-center min-w-[100px] px-2 py-1 rounded-full text-sm" },
  { label: "WFH",        value: "WFH",        badgeClass: "bg-cyan-100   text-cyan-800   inline-flex justify-center min-w-[100px] px-2 py-1 rounded-full text-sm" },
];

const STATUS_OPTIONS = [
  { label: "Deployed",  value: "Deployed",  badgeClass: "bg-emerald-100 text-emerald-800 inline-flex justify-center min-w-[90px] px-2 py-1 rounded-full text-sm" },
  { label: "Spare",     value: "Spare",     badgeClass: "bg-blue-100    text-blue-800    inline-flex justify-center min-w-[90px] px-2 py-1 rounded-full text-sm" },
  { label: "Defective", value: "Defective", badgeClass: "bg-red-100     text-red-800     inline-flex justify-center min-w-[90px] px-2 py-1 rounded-full text-sm" },
];

const CATEGORY_OPTIONS = [
  { label: "Laptop",         value: "Laptop",         badgeClass: "bg-orange-100  text-orange-800  inline-flex justify-center min-w-[130px] px-2 py-1 rounded-full text-sm" },
  { label: "Monitor",        value: "Monitor",        badgeClass: "bg-yellow-100  text-yellow-800  inline-flex justify-center min-w-[130px] px-2 py-1 rounded-full text-sm" },
  { label: "Desktop",        value: "Desktop",        badgeClass: "bg-indigo-100  text-indigo-800  inline-flex justify-center min-w-[130px] px-2 py-1 rounded-full text-sm" },
  { label: "UPS",            value: "UPS",            badgeClass: "bg-cyan-100    text-cyan-800    inline-flex justify-center min-w-[130px] px-2 py-1 rounded-full text-sm" },
  { label: "Network Device", value: "Network Device", badgeClass: "bg-emerald-100 text-emerald-800 inline-flex justify-center min-w-[130px] px-2 py-1 rounded-full text-sm" },
  { label: "Server",         value: "Server",         badgeClass: "bg-violet-100  text-violet-800  inline-flex justify-center min-w-[130px] px-2 py-1 rounded-full text-sm" },
];

const COMPANY_OPTIONS = [
  { label: "OCG", value: "OCG", badgeClass: "bg-blue-100   text-blue-800   inline-flex justify-center min-w-[60px] px-2 py-1 rounded-full text-sm" },
  { label: "SDB", value: "SDB", badgeClass: "bg-violet-100 text-violet-800 inline-flex justify-center min-w-[60px] px-2 py-1 rounded-full text-sm" },
];

// ─── Sort helpers (tri-state: default → asc → desc → default) ────────────────

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

const cellSelect =
  "w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white cursor-pointer";
const cellInput =
  "w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white";

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
      <button
        type="button"
        onClick={() => {
          setOpen((prev) => !prev);
          setQuery("");
        }}
        className="text-left"
      >
        {value ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-800 px-3 py-1 text-xs font-semibold">
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            {displayName}
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-gray-100 text-gray-500 px-3 py-1 text-xs italic">
            {placeholder}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute z-50 left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg">
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
                  className={
                    "px-3 py-1.5 text-xs cursor-pointer hover:bg-blue-50 " +
                    (o.value === value
                      ? "font-semibold text-blue-600"
                      : "text-gray-800")
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

type Props = {
  initialFilter?: InventoryFilter | null;
};

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
  const [addVisible, setAddVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<ITInventory | null>(null);
  const [editingNoteTag, setEditingNoteTag] = useState<string | null>(null);

  const { employees, currentUserId } = useEmployees();

  const assigneeOptions = employees.map((employee) => ({
    label: employee.name,
    value: employee.id,
    isMe: employee.id === currentUserId,
  }));

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await getAllAssets();
      setData(result);
    } catch (err) {
      console.error("Unable to load inventory", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const updateLocalField = (assetTag: string, field: string, value: string) => {
    setData((prev) =>
      prev.map((item) =>
        item.assetTag === assetTag ? { ...item, [field]: value } : item,
      ),
    );
  };

  const handleFieldUpdate = async (
    assetTag: string,
    field: string,
    value: string,
  ) => {
    updateLocalField(assetTag, field, value);
    try {
      await updateAssetField(assetTag, field, value);
    } catch (err) {
      console.error(`Unable to update ${field} for ${assetTag}:`, err);
      fetchData();
    }
  };

  const handleAssigneeChange = async (assetTag: string, assigneeId: string) => {
    const selected = employees.find((employee) => employee.id === assigneeId);
    updateLocalField(assetTag, "assigneeId", assigneeId);
    updateLocalField(assetTag, "assigneeName", selected?.name ?? "");
    try {
      await updateAssetField(assetTag, "assigneeId", assigneeId);
      await updateAssetField(assetTag, "assigneeName", selected?.name ?? "");
    } catch (err) {
      console.error(`Unable to update assignee for ${assetTag}:`, err);
      fetchData();
    }
  };

  const handleDelete = async (assetTag: string) => {
    await deleteAsset(assetTag);
    fetchData();
  };

  const handleEdit = (asset: ITInventory) => {
    setSelectedAsset(asset);
    setEditVisible(true);
  };

  const handleSort = (key: InventorySortKey) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
    } else {
      const next = cycleDir(sortDir);
      setSortDir(next);
      if (next === "default") setSortKey(null);
    }
  };

  const dirFor = (key: InventorySortKey): SortDir =>
    sortKey === key ? sortDir : "default";

  const q = search.toLowerCase().trim();

  const filterApplied = activeFilter
    ? data.filter(
        (item) => (item[activeFilter.field] ?? "") === activeFilter.value,
      )
    : data;

  const filtered = q
    ? filterApplied.filter((item) => {
        const assigneeName =
          employees.find((employee) => employee.id === item.assigneeId)?.name ??
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
          .map((value) => (value ?? "").toString().toLowerCase())
          .some((value) => value.includes(q));
      })
    : filterApplied;

  const sortedFiltered = useMemo(() => {
    if (!sortKey || sortDir === "default") return filtered;
    return [...filtered].sort((a, b) => {
      const aVal =
        sortKey === "status"
          ? (STATUS_ORDER[a.status] ?? 0)
          : sortKey === "assigneeName"
            ? normalizeValue(
                employees.find((employee) => employee.id === a.assigneeId)
                  ?.name ?? a.assigneeName,
              )
            : normalizeValue(a[sortKey]);
      const bVal =
        sortKey === "status"
          ? (STATUS_ORDER[b.status] ?? 0)
          : sortKey === "assigneeName"
            ? normalizeValue(
                employees.find((employee) => employee.id === b.assigneeId)
                  ?.name ?? b.assigneeName,
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

  return (
    <div
      style={{ backgroundColor: theme.background }}
      className="flex flex-col h-full p-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 style={{ color: theme.text }} className="text-xl font-bold">
            IT Inventory
          </h1>
          <p style={{ color: theme.subtext }} className="text-xs mt-0.5">
            {sortedFiltered.length} of {data.length} records
          </p>
        </div>
        <button
          onClick={() => setAddVisible(true)}
          style={{ backgroundColor: theme.primary, color: theme.primaryText }}
          className="px-4 py-2 text-sm font-semibold rounded-lg transition-colors"
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

      {/* Search */}
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
        className="w-full px-4 py-2.5 mb-4 text-sm border rounded-lg focus:outline-none"
        onFocus={(e) =>
          (e.currentTarget.style.borderColor = theme.inputBorderFocus)
        }
        onBlur={(e) => (e.currentTarget.style.borderColor = theme.inputBorder)}
      />

      {/* Active filter pill */}
      {activeFilter && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
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

      {/* Loading */}
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
        <div
          style={{ borderColor: theme.border }}
          className="overflow-auto rounded-lg border flex-1"
        >
          <table className="min-w-full text-sm">
            <thead
              style={{ backgroundColor: theme.surfaceRaised }}
              className="sticky top-0 z-10"
            >
              <tr>
                {TABLE_HEADERS.map(({ label, key }) => (
                  <th
                    key={key}
                    onClick={() => handleSort(key)}
                    style={{ color: theme.subtext, borderColor: theme.border }}
                    className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap border-b cursor-pointer select-none transition-colors"
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = theme.text)
                    }
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
            <tbody>
              {sortedFiltered.map((item, index) => (
                <tr
                  key={item.assetTag}
                  style={{
                    backgroundColor:
                      index % 2 === 0 ? theme.surface : theme.background,
                    borderBottom: `1px solid ${theme.border}`,
                  }}
                >
                  {/* Asset Tag */}
                  <td className="px-3 py-2.5 min-w-[130px]">
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
                  <td className="text-sm px-3 py-2.5 min-w-[110px]">
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
                  <td className="px-3 py-2.5 min-w-[140px]">
                    <span style={{ color: theme.text }} className="text-sm">
                      {item.serialNumber || "—"}
                    </span>
                  </td>

                  {/* Model */}
                  <td className="px-3 py-2.5 min-w-[110px]">
                    <span style={{ color: theme.text }} className="text-sm">
                      {item.model || "—"}
                    </span>
                  </td>

                  {/* Brand */}
                  <td className="px-3 py-2.5 min-w-[110px]">
                    <span style={{ color: theme.text }} className="text-sm">
                      {item.brand || "—"}
                    </span>
                  </td>

                  {/* Category */}
                  <td className="px-3 py-2.5 min-w-[160px]">
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
                  <td className="px-3 py-2.5 min-w-[120px]">
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
                  <td className="px-3 py-2.5 min-w-[140px]">
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
                  <td className="px-3 py-2.5 min-w-[120px]">
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
                  <td className="px-3 py-2.5 min-w-[130px]">
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
                      onClick={(e) =>
                        (e.target as HTMLInputElement).showPicker()
                      }
                      style={{ color: theme.text, colorScheme: theme.mode }}
                      className="text-sm bg-transparent border-none outline-none cursor-pointer w-full"
                    />
                  </td>

                  {/* Notes */}
                  <td className="px-3 py-2.5 min-w-[200px]">
                    {editingNoteTag === item.assetTag ? (
                      <input
                        type="text"
                        value={item.notes ?? ""}
                        onChange={(e) =>
                          handleFieldUpdate(
                            item.assetTag,
                            "notes",
                            e.target.value,
                          )
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
                          (e.currentTarget.style.borderColor =
                            theme.inputBorderFocus)
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
              ))}
            </tbody>
          </table>
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
      />
    </div>
  );
};

export default ITInventoryPage;
