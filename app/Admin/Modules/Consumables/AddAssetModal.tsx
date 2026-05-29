import React, { useState } from "react";
import { ITConsumable } from "../../../../types";
import { addConsumable } from "../../../../Services/consumablesService";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const EMPTY_FORM = {
  name:           "",
  model:          "",
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

const AddConsumableModal: React.FC<Props> = ({ visible, onClose, onSuccess }) => {
  const [form, setForm]       = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

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
    setLoading(true);
    setError("");
    try {
      await addConsumable(form);
      setForm(EMPTY_FORM);
      onSuccess();
      onClose();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setForm(EMPTY_FORM);
    setError("");
    onClose();
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Add Printer</h2>
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
          <input
            name="model"
            placeholder="Model Number"
            value={form.model}
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
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={handleClose} className={cancelBtn}>Cancel</button>
          <button onClick={handleSubmit} disabled={loading} className={primaryBtn}>
            {loading ? "Saving..." : "Add Printer"}
          </button>
        </div>
      </div>
    </div>
  );
};

const inputClass = "w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
const cancelBtn  = "px-5 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors";
const primaryBtn = "px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors";

export default AddConsumableModal;
