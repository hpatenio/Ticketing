import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import {
  getAllConsumables,
  deleteConsumable,
  updateConsumableField,
} from "../../../../Services/consumablesService";
import { ITConsumable } from "../../../../types";
import AddConsumableModal from "./AddAssetModal";
import EditConsumableModal from "./EditAssetModal";
import InlineDropdown from "../../../../components/common/InlineDropdown";

// ─── options ──────────────────────────────────────────────────────────────────

const LOCATION_OPTIONS = [
  { label: "Unit 1 & 2", value: "Unit 1 & 2", color: "bg-pink-500" },
  { label: "Unit 3",     value: "Unit 3",     color: "bg-purple-600" },
  { label: "BDO Makati", value: "BDO Makati", color: "bg-teal-500" },
  { label: "Triumph",    value: "Triumph",    color: "bg-green-500" },
  { label: "WFH",        value: "WFH",        color: "bg-cyan-500" },
];

// ─── ink colors ───────────────────────────────────────────────────────────────

const INK_COLORS: Record<string, { bg: string; text: string }> = {
  black:          { bg: "#f3f4f6", text: "#1f2937" },
  photoBlack:     { bg: "#f3f4f6", text: "#374151" },
  cyan:           { bg: "#ecfeff", text: "#0e7490"  },
  magenta:        { bg: "#fdf2f8", text: "#be185d"  },
  yellow:         { bg: "#fefce8", text: "#a16207"  },
  maintenanceBox: { bg: "#f5f3ff", text: "#6d28d9"  },
};

const InkBadge = ({ value, type }: { value: number; type: string }) => {
  const cfg = INK_COLORS[type] ?? INK_COLORS.black;
  const low = value <= 2;
  const mid = value > 2 && value <= 5;
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: low ? "#fef2f2" : mid ? "#fffbeb" : cfg.bg,
        alignItems: "center",
        minWidth: 36,
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: "700",
          color: low ? "#dc2626" : mid ? "#d97706" : cfg.text,
        }}
      >
        {value}
      </Text>
    </View>
  );
};

const PlainBadge = (value: string) => (
  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: "#f3f4f6", borderRadius: 8 }}>
    <Text style={{ fontSize: 11, color: "#374151" }}>{value || "—"}</Text>
    <Text style={{ fontSize: 11, color: "#9ca3af" }}>▾</Text>
  </View>
);

// ─── column config ────────────────────────────────────────────────────────────
// flex: how much of the remaining space each col takes
// minWidth: minimum before horizontal scroll kicks in

const COLUMNS = [
  { key: "name",           label: "Printer Name", flex: 2,   minWidth: 130, align: "left"   },
  { key: "model",          label: "Model",        flex: 1.5, minWidth: 110, align: "left"   },
  { key: "status",         label: "Status",       flex: 1,   minWidth: 100, align: "center" },
  { key: "location",       label: "Location",     flex: 1.5, minWidth: 110, align: "center" },
  { key: "ipAddress",      label: "IP Address",   flex: 1.5, minWidth: 110, align: "left"   },
  { key: "macAddress",     label: "MAC Address",  flex: 1.8, minWidth: 130, align: "left"   },
  { key: "black",          label: "Black",        flex: 1,   minWidth: 70,  align: "center" },
  { key: "cyan",           label: "Cyan",         flex: 1,   minWidth: 70,  align: "center" },
  { key: "magenta",        label: "Magenta",      flex: 1,   minWidth: 70,  align: "center" },
  { key: "yellow",         label: "Yellow",       flex: 1,   minWidth: 70,  align: "center" },
  { key: "maintenanceBox", label: "Maint. Box",   flex: 1,   minWidth: 70,  align: "center" },
  { key: "photoBlack",     label: "Photo Black",  flex: 1,   minWidth: 70,  align: "center" },
] as const;

const INK_KEYS = ["black", "cyan", "magenta", "yellow", "maintenanceBox", "photoBlack"] as const;

const STATUS_OPTIONS = [
  { label: "Spare", value: "Spare" },
  { label: "Deployed", value: "Deployed" },
  { label: "Defective", value: "Defective" },
];

const renderStatusBadge = (value: string) => {
  const isDefective = value === "Defective";
  const isDeployed = value === "Deployed";
  return (
    <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: isDefective ? "#fee2e2" : isDeployed ? "#dcfce7" : "#e0f2fe" }}>
      <Text style={{ fontSize: 11, fontWeight: "700", color: isDefective ? "#b91c1c" : isDeployed ? "#15803d" : "#0284c7" }}>
        {value || "—"}
      </Text>
    </View>
  );
};

// ─── component ────────────────────────────────────────────────────────────────

const ConsumablesPage: React.FC = () => {
  const [data, setData]             = useState<ITConsumable[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [addVisible, setAddVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ITConsumable | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const result = await getAllConsumables();
    setData(result);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const updateLocalField = (serial: string, field: string, value: string | number) => {
    setData((prev) =>
      prev.map((item) => item.model === serial ? { ...item, [field]: value } : item)
    );
  };

  const handleFieldUpdate = async (serial: string, field: string, value: string | number) => {
    updateLocalField(serial, field, value);
    await updateConsumableField(serial, field, value);
  };

  const handleDelete = async (serial: string) => {
    await deleteConsumable(serial);
    fetchData();
  };

  const handleEdit = (item: ITConsumable) => {
    setSelectedItem(item);
    setEditVisible(true);
  };

  const renderCell = (item: ITConsumable, col: typeof COLUMNS[number]) => {
    const cellKey = `${item.model}-${col.key}`;
    switch (col.key) {
      case "name":
        return (
          <TouchableOpacity
            onPress={() => {
              const now = Date.now();
              const last = lastTapRef.current[cellKey] || 0;
              if (now - last < 300) {
                handleEdit(item);
              }
              lastTapRef.current[cellKey] = now;
            }}
            activeOpacity={0.7}
            style={{ width: "100%" }}
          >
            <Text style={{ fontSize: 12, fontWeight: "600", color: "#111827" }} numberOfLines={1}>
              {item.name}
            </Text>
          </TouchableOpacity>
        );
      case "model":
        return (
          <Text style={{ fontSize: 12, color: "#6b7280", fontFamily: "monospace" }} numberOfLines={1}>
            {item.model || "—"}
          </Text>
        );
      case "status":
        return (
          <InlineDropdown
            value={item.status}
            options={STATUS_OPTIONS}
            onSelect={(val) => handleFieldUpdate(item.model, "status", val)}
            renderBadge={renderStatusBadge}
          />
        );
      case "location":
        return (
          <InlineDropdown
            value={item.location}
            options={LOCATION_OPTIONS}
            onSelect={(val) => handleFieldUpdate(item.model, "location", val)}
            renderBadge={PlainBadge}
          />
        );
      case "ipAddress":
        return (
          <Text style={{ fontSize: 12, color: "#374151", fontFamily: "monospace" }} numberOfLines={1}>
            {item.ipAddress || "—"}
          </Text>
        );
      case "macAddress":
        return (
          <Text style={{ fontSize: 11, color: "#6b7280", fontFamily: "monospace" }} numberOfLines={1}>
            {item.macAddress || "—"}
          </Text>
        );
      default:
        if ((INK_KEYS as readonly string[]).includes(col.key)) {
          const inkKey = col.key as typeof INK_KEYS[number];
          const inkValue = Number(item[inkKey] ?? 0);
          const isEditing = !!editingCells[cellKey];
          return isEditing ? (
            <TextInput
              value={String(inkValue)}
              onChangeText={(v) => {
                const num = Math.max(0, parseInt(v.replace(/[^0-9]/g, ""), 10) || 0);
                handleFieldUpdate(item.model, inkKey, num);
              }}
              keyboardType="numeric"
              autoFocus
              onBlur={() => setEditingCells((s) => ({ ...s, [cellKey]: false }))}
              style={{
                width: 48,
                textAlign: "center",
                fontSize: 12,
                paddingHorizontal: 6,
                paddingVertical: 4,
                borderWidth: 1,
                borderColor: "#93c5fd",
                borderRadius: 6,
                backgroundColor: "#eff6ff",
              }}
            />
          ) : (
            <TouchableOpacity onPress={() => handleCellPress(item.model, inkKey)} activeOpacity={0.7}>
              <InkBadge value={inkValue} type={inkKey} />
            </TouchableOpacity>
          );
        }
        return null;
    }
  };

  // double-tap to edit ink cells
  const lastTapRef = useRef<Record<string, number>>({});
  const [editingCells, setEditingCells] = useState<Record<string, boolean>>({});

  const handleCellPress = (serial: string, field: string) => {
    const key = `${serial}-${field}`;
    const now = Date.now();
    if (now - (lastTapRef.current[key] || 0) < 300) {
      setEditingCells((s) => ({ ...s, [key]: true }));
    }
    lastTapRef.current[key] = now;
  };

  const q = search.toLowerCase().trim();
  const filtered = q
    ? data.filter((item) =>
        [item.name, item.model, item.status, item.location, item.ipAddress, item.macAddress].some((v) =>
          (v ?? "").toLowerCase().includes(q)
        )
      )
    : data;

  return (
    <View style={{ flex: 1, padding: 16 }}>

      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <View>
          <Text style={{ fontSize: 20, fontWeight: "700", color: "#1f2937" }}>IT Consumables</Text>
          <Text style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
            {filtered.length} of {data.length} printers
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setAddVisible(true)}
          style={{ backgroundColor: "#2563eb", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}
        >
          <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>+ Add Printer</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <TextInput
        placeholder="Search printer name, model, IP, location..."
        value={search}
        onChangeText={setSearch}
        style={{
          width: "100%",
          paddingHorizontal: 16,
          paddingVertical: 10,
          marginBottom: 16,
          fontSize: 13,
          borderWidth: 1,
          borderColor: "#d1d5db",
          borderRadius: 8,
          backgroundColor: "#fff",
        }}
      />

      {/* Table */}
      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 80 }}>
          <Text style={{ color: "#9ca3af", fontSize: 13 }}>No printers found.</Text>
        </View>
      ) : (
        <View style={{ flex: 1, borderRadius: 10, borderWidth: 1, borderColor: "#e5e7eb", overflow: "hidden" }}>
          {/* Header row */}
          <View style={{ flexDirection: "row", backgroundColor: "#f9fafb", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" }}>
            {COLUMNS.map((col) => (
              <View
                key={col.key}
                style={{
                  flex: col.flex,
                  minWidth: col.minWidth,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  alignItems: col.align === "center" ? "center" : "flex-start",
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {col.label}
                </Text>
              </View>
            ))}
          </View>

          {/* Rows */}
          <ScrollView showsVerticalScrollIndicator={false} style={{ backgroundColor: "#fff" }}>
            {filtered.map((item, index) => (
              <View
                key={item.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  borderBottomWidth: 1,
                  borderBottomColor: "#f3f4f6",
                  backgroundColor: index % 2 === 0 ? "#fff" : "#fafafa",
                }}
              >
                {COLUMNS.map((col) => (
                  <View
                    key={col.key}
                    style={{
                      flex: col.flex,
                      minWidth: col.minWidth,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      alignItems: col.align === "center" ? "center" : "flex-start",
                    }}
                  >
                    {renderCell(item, col)}
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Modals */}
      <AddConsumableModal
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        onSuccess={fetchData}
      />
      <EditConsumableModal
        visible={editVisible}
        onClose={() => setEditVisible(false)}
        onSuccess={fetchData}
        selectedItem={selectedItem}
        onDelete={handleDelete}
      />
    </View>
  );
};

export default ConsumablesPage;
