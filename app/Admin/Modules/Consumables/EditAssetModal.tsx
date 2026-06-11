import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ITConsumable } from "../../../../types";
import { updateConsumable } from "../../../../Services/consumablesService";
import { logAuditBatch } from "../../../../Services/auditService";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedItem: ITConsumable | null;
  onDelete: (serial: string) => void;
}

const EMPTY_FORM = {
  name:           "",
  status:         "Spare" as ITConsumable["status"],
  location:       "Unit 1 & 2" as ITConsumable["location"],
  ipAddress:      "",
  macAddress:     "",
  black:          0,
  photoBlack:     0,
  cyan:           0,
  magenta:        0,
  yellow:         0,
  maintenanceBox: 0,
};

const INK_FIELDS: { key: keyof typeof EMPTY_FORM; label: string; color: string }[] = [
  { key: "black",          label: "Black",          color: "#1f2937" },
  { key: "photoBlack",     label: "Photo Black",    color: "#374151" },
  { key: "cyan",           label: "Cyan",           color: "#0891b2" },
  { key: "magenta",        label: "Magenta",        color: "#db2777" },
  { key: "yellow",         label: "Yellow",         color: "#ca8a04" },
  { key: "maintenanceBox", label: "Maintenance Box", color: "#7c3aed" },
];

const EditConsumableModal: React.FC<Props> = ({
  visible, onClose, onSuccess, selectedItem, onDelete,
}) => {
  const [form, setForm]             = useState(EMPTY_FORM);
  const [loading, setLoading]       = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [error, setError]           = useState("");

  useEffect(() => {
    if (selectedItem) {
      setForm({
        name:           selectedItem.name,
        status:         selectedItem.status ?? "Spare",
        location:       selectedItem.location,
        ipAddress:      selectedItem.ipAddress      ?? "",
        macAddress:     selectedItem.macAddress     ?? "",
        black:          selectedItem.black          ?? 0,
        photoBlack:     selectedItem.photoBlack     ?? 0,
        cyan:           selectedItem.cyan           ?? 0,
        magenta:        selectedItem.magenta        ?? 0,
        yellow:         selectedItem.yellow         ?? 0,
        maintenanceBox: selectedItem.maintenanceBox ?? 0,
      });
    }
    setError("");
    setConfirmDel(false);
  }, [selectedItem, visible]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const val = e.target.type === "number"
      ? Math.max(0, Number(e.target.value))
      : e.target.value;
    setForm({ ...form, [e.target.name]: val });
  };

  const handleSubmit = async () => {
    if (!form.name) {
      setError("Printer Name is required.");
      return;
    }
    if (!selectedItem) return;
    setLoading(true);
    setError("");

    try {
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

      const original: Record<keyof typeof form, string | number> = {
        name:           selectedItem.name,
        status:         selectedItem.status ?? "Spare",
        location:       selectedItem.location,
        ipAddress:      selectedItem.ipAddress ?? "",
        macAddress:     selectedItem.macAddress ?? "",
        black:          selectedItem.black ?? 0,
        photoBlack:     selectedItem.photoBlack ?? 0,
        cyan:           selectedItem.cyan ?? 0,
        magenta:        selectedItem.magenta ?? 0,
        yellow:         selectedItem.yellow ?? 0,
        maintenanceBox: selectedItem.maintenanceBox ?? 0,
      };

      const changedFields = (Object.keys(form) as (keyof typeof form)[]).filter(
        (key) => form[key] !== original[key]
      );

      if (changedFields.length === 0) {
        onClose();
        return;
      }

      const payload: Partial<typeof form> = {};
      changedFields.forEach((field) => {
        payload[field] = form[field] as any;
      });

      await updateConsumable(selectedItem.model, payload);

      await logAuditBatch({
        table: "consumables",
        recordId: selectedItem.model,
        recordLabel: selectedItem.name || selectedItem.model,
        changedBy,
        changedById,
        changes: changedFields.map((field) => ({
          field,
          oldValue: String(original[field] ?? ""),
          newValue: String(form[field] ?? ""),
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

  const handleDelete = async () => {
    if (!selectedItem) return;
    if (!confirmDel) { setConfirmDel(true); return; }
    setDeleting(true);
    await onDelete(selectedItem.model);
    setDeleting(false);
    onClose();
  };

  const handleClose = () => {
    setError("");
    setConfirmDel(false);
    onClose();
  };

  if (!visible || !selectedItem) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Edit Printer</h2>
            <p className="text-xs text-gray-400 mt-0.5">Model: {selectedItem.model}</p>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
        </div>

        {error && (
          <p className="text-red-500 text-sm mb-4 bg-red-50 px-3 py-2 rounded-md">{error}</p>
        )}

        <div className="flex flex-col gap-3">
          <input
            name="name"
            placeholder="Printer Name *"
            value={form.name}
            onChange={handleChange}
            className={inputClass}
          />
          <select
            name="status"
            value={form.status}
            onChange={handleChange}
            className={inputClass}
          >
            <option value="Spare">Spare</option>
            <option value="Deployed">Deployed</option>
            <option value="Defective">Defective</option>
          </select>
          <select
            name="location"
            value={form.location}
            onChange={handleChange}
            className={inputClass}
          >
            <option value="Unit 1 & 2">Unit 1 & 2</option>
            <option value="Unit 3">Unit 3</option>
            <option value="BDO Makati">BDO Makati</option>
            <option value="Triumph">Triumph</option>
            <option value="WFH">WFH</option>
          </select>

          <input
            name="ipAddress"
            placeholder="IP Address (e.g. 192.168.1.100)"
            value={form.ipAddress}
            onChange={handleChange}
            className={inputClass}
          />
          <input
            name="macAddress"
            placeholder="MAC Address (e.g. AA:BB:CC:DD:EE:FF)"
            value={form.macAddress}
            onChange={handleChange}
            className={inputClass}
          />

          {/* Ink stock fields */}
          <div className="border-t border-gray-100 pt-3 mt-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Ink & Consumable Stock
            </p>
            <div className="grid grid-cols-2 gap-3">
              {INK_FIELDS.map(({ key, label, color }) => (
                <div key={key}>
                  <label className="block text-xs font-medium mb-1" style={{ color }}>
                    {label}
                  </label>
                  <input
                    name={key}
                    type="number"
                    min={0}
                    placeholder="0"
                    value={form[key] as number}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-6">
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                confirmDel
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "text-red-500 bg-red-50 hover:bg-red-100 border border-red-200"
              }`}
            >
              {deleting ? "Deleting..." : confirmDel ? "Confirm Delete" : "Delete"}
            </button>
            {confirmDel && (
              <button onClick={() => setConfirmDel(false)} className="text-xs text-gray-400 hover:text-gray-600">
                Cancel
              </button>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={handleClose} className={cancelBtn}>Cancel</button>
            <button onClick={handleSubmit} disabled={loading} className={primaryBtn}>
              {loading ? "Saving..." : "Update"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const inputClass = "w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
const cancelBtn  = "px-5 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors";
const primaryBtn = "px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors";

export default EditConsumableModal;
