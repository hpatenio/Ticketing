import React, { useEffect, useState, useRef } from "react";
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

// --- dropdown options ---
const LOCATION_OPTIONS = [
  { label: "Unit 1 & 2", value: "Unit 1 & 2", color: "bg-pink-500" },
  { label: "Unit 3",     value: "Unit 3",     color: "bg-purple-600" },
  { label: "BDO Makati", value: "BDO Makati", color: "bg-teal-500" },
  { label: "Triumph",    value: "Triumph",    color: "bg-green-500" },
  { label: "WFH",        value: "WFH",        color: "bg-cyan-500" },
];

const STATUS_OPTIONS = [
  { label: "Deployed",  value: "Deployed",  color: "bg-green-500" },
  { label: "Spare",     value: "Spare",     color: "bg-blue-500" },
  { label: "Defective", value: "Defective", color: "bg-red-500" },
];

const CATEGORY_OPTIONS = [
  { label: "Laptop",  value: "Laptop",  color: "bg-orange-500" },
  { label: "Monitor", value: "Monitor", color: "bg-yellow-500" },
  { label: "Desktop", value: "Desktop", color: "bg-indigo-500" },
];

const COMPANY_OPTIONS = [
  { label: "OCG", value: "OCG", color: "bg-blue-600" },
  { label: "SDB", value: "SDB", color: "bg-violet-600" },
];

// --- status badge colors ---
const StatusBadge = (value: string) => {
  const styles =
    value === "Deployed"
      ? "bg-green-100 text-green-700"
      : value === "Defective"
      ? "bg-red-100 text-red-700"
      : "bg-gray-100 text-gray-600";

  return (
    <View className={`flex-row items-center gap-1 px-2 py-1 rounded-full ${styles}`}>
      <Text className={`text-xs font-semibold ${styles}`}>{value}</Text>
      <Text className="text-xs opacity-50">▾</Text>
    </View>
  );
};

// --- plain dropdown badge ---
const PlainBadge = (value: string) => (
  <View className="flex-row items-center gap-1 px-2 py-1 bg-gray-100 rounded-lg">
    <Text className="text-xs text-gray-700">{value || "—"}</Text>
    <Text className="text-xs text-gray-400">▾</Text>
  </View>
);

const getSurname = (fullName: string) => {
  const parts = fullName?.trim().split(" ").filter(Boolean) ?? [];
  return parts.length > 0 ? parts[parts.length - 1] : fullName || "—";
};

const ITInventoryPage: React.FC = () => {
  const [data, setData]                   = useState<ITInventory[]>([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState("");
  const [addVisible, setAddVisible]       = useState(false);
  const [editVisible, setEditVisible]     = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<ITInventory | null>(null);

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

  useEffect(() => { fetchData(); }, []);

  // update a single field in local state immediately (optimistic update)
  const updateLocalField = (assetTag: string, field: string, value: string) => {
    setData((prev) =>
      prev.map((item) =>
        item.assetTag === assetTag ? { ...item, [field]: value } : item
      )
    );
  };

  const handleFieldUpdate = async (
    assetTag: string,
    field: string,
    value: string
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

  return (
    <View className="flex-1 p-4" style={{ width: "100%" }}>

      {/* Header */}
      <View className="flex-row items-center justify-between mb-4">
        <View>
          <Text className="text-xl font-bold text-gray-800">IT Inventory</Text>
          <Text className="text-xs text-gray-400 mt-0.5">
            {filtered.length} of {data.length} records
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setAddVisible(true)}
          className="bg-blue-600 px-4 py-2 rounded-lg"
        >
          <Text className="text-white text-sm font-semibold">+ Add Asset</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <TextInput
        placeholder="Search asset tag, brand, model..."
        value={search}
        onChangeText={setSearch}
        className="w-full px-4 py-2.5 mb-4 text-sm border border-gray-300 rounded-lg bg-white"
      />

      {/* Table */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, minWidth: "100%" }}>
          <View style={{ flex: 1, minWidth: "100%" }}>
            {/* Table Header */}
            <View className="flex-row bg-gray-100 rounded-t-lg" style={{ minWidth: "100%" }}>
              {["Asset Tag", "Company", "Serial Number", "Model", "Brand", "Category", "Status", "Assignee", "Location", "Date Purchased", "Notes"].map(
                (header) => (
                  <Text
                    key={header}
                    className="text-xs font-semibold text-gray-600 uppercase px-3 py-3"
                    style={{
                      flex: 1,
                      minWidth:
                        header === "Asset Tag"
                          ? 130
                          : header === "Notes"
                          ? 200
                          : header === "Serial Number"
                          ? 140
                          : header === "Date Purchased"
                          ? 130
                          : 110,
                    }}
                  >
                    {header}
                  </Text>
                )
              )}
            </View>

            {/* Table Rows */}
            <ScrollView showsVerticalScrollIndicator={false}>
              {filtered.map((item, index) => (
                <View
                  key={item.id}
                  className={`flex-row items-center border-b border-gray-100`}
                  style={{ backgroundColor: index % 2 === 0 ? "#fff" : "#f9fafb", minWidth: "100%" }}
                >
                  {/* Asset Tag — double-tap to edit (removed separate edit icon) */}
                  <View
                    className="flex-row items-center gap-1.5 px-3 py-3"
                    style={{ flex: 1, minWidth: 130 }}
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
                      <Text className="text-xs text-gray-700 flex-shrink flex-1" numberOfLines={1}>
                        {item.assetTag}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Company — inline dropdown */}
                  <View className="px-2 py-2" style={{ flex: 1, minWidth: 110 }}>
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
                    className="text-xs text-gray-700 px-3 py-3"
                    style={{ flex: 1, minWidth: 140 }}
                  >
                    {item.serialNumber || "—"}
                  </Text>

                  {/* Model — read only */}
                  <Text
                    className="text-xs text-gray-700 px-3 py-3"
                    style={{ flex: 1, minWidth: 110 }}
                  >
                    {item.model}
                  </Text>

                  {/* Brand — read only */}
                  <Text
                    className="text-xs text-gray-700 px-3 py-3"
                    style={{ flex: 1, minWidth: 110 }}
                  >
                    {item.brand}
                  </Text>

                  {/* Category — inline dropdown */}
                  <View className="px-2 py-2" style={{ flex: 1, minWidth: 110 }}>
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
                  <View className="px-2 py-2" style={{ flex: 1, minWidth: 110 }}>
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
                  <View className="px-2 py-2" style={{ flex: 1, minWidth: 110 }}>
                    <InlineDropdown
                      value={item.assigneeId}
                      options={assigneeOptions}
                      showSearch
                      searchPlaceholder="Search assignees..."
                      onSelect={async (val) => {
                        const selected = employees.find((e) => e.id === val);
                        updateLocalField(item.assetTag, "assigneeId", val);
                        updateLocalField(item.assetTag, "assigneeName", selected?.name ?? "");
                        await updateAssetField(item.assetTag, "assigneeId", val);
                        await updateAssetField(item.assetTag, "assigneeName", selected?.name ?? "");
                      }}
                      renderBadge={(val) => {
                        const name = employees.find((e) => e.id === val)?.name ?? item.assigneeName ?? "—";
                        return PlainBadge(getSurname(name));
                      }}
                    />
                  </View>

                  {/* Location — inline dropdown */}
                  <View className="px-2 py-2" style={{ flex: 1, minWidth: 110 }}>
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
                    className="text-xs text-gray-700 px-3 py-3"
                    style={{ flex: 1, minWidth: 130 }}
                  >
                    {item.datePurchased ? item.datePurchased.toDate().toLocaleDateString() : "—"}
                  </Text>

                  {/* Notes */}
                  <Text
                    className="text-xs text-gray-700 px-3 py-3"
                    style={{ flex: 1, minWidth: 200 }}
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
