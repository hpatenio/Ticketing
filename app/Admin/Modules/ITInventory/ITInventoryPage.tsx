import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import {
  getAllAssets,
  deleteAsset,
  updateAssetField,
} from "../../../../Services/itInventory";
import { useEmployees } from "../../../../hooks/useEmployees";
import { ITInventory } from "../../../../types";
import AddAssetModal from "./AddAssetModal";
import EditAssetModal from "./EditAssetModal";
import InlineDropdown from "../../../../components/common/InlineDropdown";
import { useTheme } from "../../../../theme/ThemeContext";

// --- dropdown options ---
const LOCATION_OPTIONS = [
  { label: "Unit 1 & 2", value: "Unit 1 & 2", color: "bg-pink-500" },
  { label: "Unit 3", value: "Unit 3", color: "bg-purple-600" },
  { label: "BDO Makati", value: "BDO Makati", color: "bg-teal-500" },
  { label: "Triumph", value: "Triumph", color: "bg-green-500" },
  { label: "WFH", value: "WFH", color: "bg-cyan-500" },
];

const STATUS_OPTIONS = [
  { label: "Deployed", value: "Deployed", color: "bg-green-500" },
  { label: "Spare", value: "Spare", color: "bg-blue-500" },
  { label: "Defective", value: "Defective", color: "bg-red-500" },
];

const CATEGORY_OPTIONS = [
  { label: "Laptop", value: "Laptop", color: "bg-orange-500" },
  { label: "Monitor", value: "Monitor", color: "bg-yellow-500" },
  { label: "Desktop", value: "Desktop", color: "bg-indigo-500" },
];

const COMPANY_OPTIONS = [
  { label: "OCG", value: "OCG", color: "bg-blue-600" },
  { label: "SDB", value: "SDB", color: "bg-violet-600" },
];

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

const TABLE_HEADERS: { label: string; key: InventorySortKey; width: number }[] =
  [
    { label: "Asset Tag", key: "assetTag", width: 130 },
    { label: "Company", key: "company", width: 110 },
    { label: "Serial Number", key: "serialNumber", width: 140 },
    { label: "Model", key: "model", width: 110 },
    { label: "Brand", key: "brand", width: 110 },
    { label: "Category", key: "category", width: 110 },
    { label: "Status", key: "status", width: 110 },
    { label: "Assignee", key: "assigneeName", width: 110 },
    { label: "Location", key: "location", width: 110 },
    { label: "Date Purchased", key: "datePurchased", width: 130 },
    { label: "Notes", key: "notes", width: 200 },
  ];

// --- status badge colors ---
const StatusBadge = (value: string) => {
  const bgColor =
    value === "Deployed" ? "#dcfce7" : value === "Defective" ? "#fee2e2" : "#f3f4f6";
  const textColor =
    value === "Deployed" ? "#15803d" : value === "Defective" ? "#b91c1c" : "#4b5563";

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: bgColor }}>
      <Text style={{ fontSize: 11, fontWeight: "600", color: textColor }}>{value}</Text>
      <Text style={{ fontSize: 11, color: textColor, opacity: 0.5 }}>▾</Text>
    </View>
  );
};

// --- plain dropdown badge ---
const PlainBadge = (value: string) => (
  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: "#f3f4f6", borderRadius: 8 }}>
    <Text style={{ fontSize: 11, color: "#374151" }}>{value || "—"}</Text>
    <Text style={{ fontSize: 11, color: "#9ca3af" }}>▾</Text>
  </View>
);

const getSurname = (fullName: string) => {
  const parts = fullName?.trim().split(" ").filter(Boolean) ?? [];
  return parts.length > 0 ? parts[parts.length - 1] : fullName || "—";
};

const ITInventoryPage: React.FC = () => {
  const [data, setData] = useState<ITInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<InventorySortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [addVisible, setAddVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<ITInventory | null>(null);
  const { theme } = useTheme();
  const { employees } = useEmployees();

  const assigneeOptions = employees.map((e) => ({
    label: getSurname(e.name),
    value: e.id,
  }));

  const fetchData = async () => {
    setLoading(true);
    const result = await getAllAssets();
    setData(result);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // update a single field in local state immediately (optimistic update)
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
    updateLocalField(assetTag, field, value); // update UI instantly
    await updateAssetField(assetTag, field, value); // then save to Firestore
  };

  const handleDelete = async (assetTag: string) => {
    await deleteAsset(assetTag);
    fetchData();
  };

  const handleEdit = (row: ITInventory) => {
    setSelectedAsset(row);
    setEditVisible(true);
  };

  // track last tap times per assetTag to detect double-tap
  const lastTapRef = useRef<Record<string, number>>({});

  const q = search.toLowerCase().trim();
  const filtered = q
    ? data.filter((item) => {
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
        ]
          .map((v) => (v ?? "").toLowerCase())
          .some((v) => v.includes(q));
      })
    : data;

  const normalizeValue = (value: any) => {
    if (value == null) return "";
    if (typeof value === "number") return value;
    if (value instanceof Date) return value.getTime();
    if (typeof value.toDate === "function") return value.toDate().getTime();
    return String(value).toLowerCase();
  };

  const getAssigneeName = (item: ITInventory) =>
    employees.find((e) => e.id === item.assigneeId)?.name ??
    item.assigneeName ??
    "";

  const sortedFiltered = useMemo(() => {
    if (!sortKey) return filtered;

    return [...filtered].sort((a, b) => {
      const aValue =
        sortKey === "assigneeName"
          ? normalizeValue(getAssigneeName(a))
          : normalizeValue(a[sortKey]);
      const bValue =
        sortKey === "assigneeName"
          ? normalizeValue(getAssigneeName(b))
          : normalizeValue(b[sortKey]);

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDirection, employees]);

  const toggleSort = (key: InventorySortKey) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDirection("asc");
      return;
    }

    if (sortDirection === "asc") {
      setSortDirection("desc");
      return;
    }

    setSortKey(null);
  };

  return (
    <View style={{ flex: 1, padding: 16, width: "100%", backgroundColor: theme.background }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <View>
          <Text style={{ fontSize: 20, fontWeight: "700", color: theme.text }}>IT Inventory</Text>
          <Text style={{ fontSize: 12, color: theme.subtext, marginTop: 2 }}>
            {filtered.length} of {data.length} records
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setAddVisible(true)}
          style={{ backgroundColor: theme.iconActive, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}
        >
          <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>+ Add Asset</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <TextInput
        placeholder="Search asset tag, brand, model..."
        placeholderTextColor={theme.subtext}
        value={search}
        onChangeText={setSearch}
        style={{
          width: "100%",
          paddingHorizontal: 16,
          paddingVertical: 10,
          marginBottom: 16,
          fontSize: 13,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 8,
          backgroundColor: theme.surface,
          color: theme.text,
        }}
      />

      {/* Table */}
      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={theme.iconActive} />
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, minWidth: "100%" }}
        >
          <View style={{ flex: 1, minWidth: "100%" }}>
            {/* Table Header */}
            <View
              style={{ flexDirection: "row", backgroundColor: theme.surface, borderRadius: 8, minWidth: "100%", borderBottomWidth: 1, borderBottomColor: theme.border }}
            >
              {TABLE_HEADERS.map((header) => {
                const isSorted = sortKey === header.key;
                const icon = isSorted
                  ? sortDirection === "asc"
                    ? "▲"
                    : "▼"
                  : "⇅";
                return (
                  <TouchableOpacity
                    key={header.key}
                    onPress={() => toggleSort(header.key)}
                    activeOpacity={0.7}
                    style={{
                      flex: 1,
                      minWidth: header.width,
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 12,
                      paddingVertical: 12,
                    }}
                  >
                    <Text
                      style={{ fontSize: 11, fontWeight: "600", color: theme.subtext, textTransform: "uppercase", letterSpacing: 0.5, marginRight: 4 }}
                    >
                      {header.label}
                    </Text>
                    <Text style={{ color: theme.subtext, fontSize: 11 }}>{icon}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Table Rows */}
            <ScrollView showsVerticalScrollIndicator={false}>
              {sortedFiltered.map((item, index) => (
                <View
                  key={item.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    borderBottomWidth: 1,
                    borderBottomColor: theme.border,
                    backgroundColor: index % 2 === 0 ? theme.background : theme.surface,
                    minWidth: "100%",
                  }}
                >
                  {/* Asset Tag — double-tap to edit (removed separate edit icon) */}
                  <View
                    style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 12, flex: 1, minWidth: 130 }}
                  >
                    <TouchableOpacity
                      onPress={() => {
                        const now = Date.now();
                        const last = lastTapRef.current[item.assetTag] || 0;
                        if (now - last < 300) {
                          handleEdit(item);
                        }
                        lastTapRef.current[item.assetTag] = now;
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={{ flex: 1 }}
                    >
                      <Text
                        style={{ fontSize: 12, color: theme.text, flexShrink: 1 }}
                        numberOfLines={1}
                      >
                        {item.assetTag}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Company — inline dropdown */}
                  <View
                    style={{ paddingHorizontal: 8, paddingVertical: 8, flex: 1, minWidth: 110 }}
                  >
                    <InlineDropdown
                      value={item.company}
                      options={COMPANY_OPTIONS}
                      onSelect={(val) =>
                        handleFieldUpdate(item.assetTag, "company", val)
                      }
                      renderBadge={PlainBadge}
                    />
                  </View>

                  {/* Serial Number */}
                  <Text
                    style={{ fontSize: 12, color: theme.text, paddingHorizontal: 12, paddingVertical: 12, flex: 1, minWidth: 140 }}
                  >
                    {item.serialNumber || "—"}
                  </Text>

                  {/* Model — read only */}
                  <Text
                    style={{ fontSize: 12, color: theme.text, paddingHorizontal: 12, paddingVertical: 12, flex: 1, minWidth: 110 }}
                  >
                    {item.model}
                  </Text>

                  {/* Brand — read only */}
                  <Text
                    style={{ fontSize: 12, color: theme.text, paddingHorizontal: 12, paddingVertical: 12, flex: 1, minWidth: 110 }}
                  >
                    {item.brand}
                  </Text>

                  {/* Category — inline dropdown */}
                  <View
                    style={{ paddingHorizontal: 8, paddingVertical: 8, flex: 1, minWidth: 110 }}
                  >
                    <InlineDropdown
                      value={item.category}
                      options={CATEGORY_OPTIONS}
                      onSelect={(val) =>
                        handleFieldUpdate(item.assetTag, "category", val)
                      }
                      renderBadge={PlainBadge}
                    />
                  </View>

                  {/* Status — inline dropdown with badge */}
                  <View
                    style={{ paddingHorizontal: 8, paddingVertical: 8, flex: 1, minWidth: 110 }}
                  >
                    <InlineDropdown
                      value={item.status}
                      options={STATUS_OPTIONS}
                      onSelect={(val) =>
                        handleFieldUpdate(item.assetTag, "status", val)
                      }
                      renderBadge={StatusBadge}
                    />
                  </View>

                  {/* Assignee — inline dropdown from Firebase users */}
                  <View
                    style={{ paddingHorizontal: 8, paddingVertical: 8, flex: 1, minWidth: 110 }}
                  >
                    <InlineDropdown
                      value={item.assigneeId}
                      options={assigneeOptions}
                      showSearch
                      searchPlaceholder="Search assignees..."
                      onSelect={async (val) => {
                        const selected = employees.find((e) => e.id === val);
                        updateLocalField(item.assetTag, "assigneeId", val);
                        updateLocalField(
                          item.assetTag,
                          "assigneeName",
                          selected?.name ?? "",
                        );
                        await updateAssetField(
                          item.assetTag,
                          "assigneeId",
                          val,
                        );
                        await updateAssetField(
                          item.assetTag,
                          "assigneeName",
                          selected?.name ?? "",
                        );
                      }}
                      renderBadge={(val) => {
                        const name =
                          employees.find((e) => e.id === val)?.name ??
                          item.assigneeName ??
                          "—";
                        return PlainBadge(getSurname(name));
                      }}
                    />
                  </View>

                  {/* Location — inline dropdown */}
                  <View
                    style={{ paddingHorizontal: 8, paddingVertical: 8, flex: 1, minWidth: 110 }}
                  >
                    <InlineDropdown
                      value={item.location}
                      options={LOCATION_OPTIONS}
                      onSelect={(val) =>
                        handleFieldUpdate(item.assetTag, "location", val)
                      }
                      renderBadge={PlainBadge}
                    />
                  </View>

                  {/* Date Purchased */}
                  <Text
                    style={{ fontSize: 12, color: theme.text, paddingHorizontal: 12, paddingVertical: 12, flex: 1, minWidth: 130 }}
                  >
                    {item.datePurchased
                      ? item.datePurchased.toDate().toLocaleDateString()
                      : "—"}
                  </Text>

                  {/* Notes */}
                  <Text
                    style={{ fontSize: 12, color: theme.text, paddingHorizontal: 12, paddingVertical: 12, flex: 1, minWidth: 200 }}
                    numberOfLines={2}
                  >
                    {item.notes || "—"}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </ScrollView>
      )}

      {/* Modals */}
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
    </View>
  );
};

export default ITInventoryPage;
