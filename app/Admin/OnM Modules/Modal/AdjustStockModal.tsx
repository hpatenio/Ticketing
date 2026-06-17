import React, { useEffect, useState } from "react";
import { useTheme } from "../../../../theme/ThemeContext";
import { adjustStock } from "../../../../Services/officeInventory";
import { OfficeInventoryItem } from "../../../../types";

type Props = {
  visible: boolean;
  item: OfficeInventoryItem | null;
  items: OfficeInventoryItem[];
  onSelectItem: (item: OfficeInventoryItem | null) => void;
  onClose: () => void;
  onSuccess: () => void;
};

const todayStr = () => new Date().toISOString().split("T")[0];

const AdjustStockModal: React.FC<Props> = ({
  visible,
  item,
  items,
  onSelectItem,
  onClose,
  onSuccess,
}) => {
  const { theme } = useTheme();
  const [quantity, setQuantity] = useState("");
  const [date, setDate] = useState(todayStr());
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setQuantity("");
      setDate(todayStr());
      setReason("");
      setError(null);
    }
  }, [visible, item]);

  if (!visible) return null;

  const inputStyle = {
    backgroundColor: theme.inputBg,
    borderColor: theme.inputBorder,
    color: theme.inputText,
  };

  const handleSubmit = async () => {
    setError(null);
    if (!item) {
      setError("Select an item.");
      return;
    }
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      setError("Enter a quantity greater than 0.");
      return;
    }
    if (!reason.trim()) {
      setError("A reason or note is required for manual adjustments.");
      return;
    }
    setSubmitting(true);
    try {
      await adjustStock(item.id, qty, date, reason.trim());
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message ?? "Unable to adjust stock.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{ backgroundColor: "rgba(0,0,0,0.35)" }}
      className="fixed inset-0 z-[100] flex items-center justify-center"
    >
      <div
        style={{ backgroundColor: theme.surface, borderColor: theme.border }}
        className="w-[420px] max-w-[95vw] rounded-xl border shadow-xl"
      >
        <div style={{ borderColor: theme.border }} className="flex items-center justify-between px-5 py-4 border-b">
          <span style={{ color: theme.text }} className="text-sm font-semibold">
            Adjust stock
          </span>
          <button onClick={onClose} style={{ color: theme.subtext }} className="text-lg leading-none">
            ✕
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-3.5">
          {error && (
            <div className="text-xs px-3 py-2 rounded-md bg-red-50 text-red-700 border border-red-200">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label style={{ color: theme.subtext }} className="text-xs font-medium">
              Item
            </label>
            <select
              value={item?.id ?? ""}
              onChange={(e) => onSelectItem(items.find((i) => i.id === e.target.value) ?? null)}
              style={inputStyle}
              className="px-2.5 py-2 text-sm border rounded-md focus:outline-none"
            >
              <option value="">Select an item…</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.itemCode}) — {i.currentStock} {i.unit}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label style={{ color: theme.subtext }} className="text-xs font-medium">
                Quantity to deduct
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
                style={inputStyle}
                className="px-2.5 py-2 text-sm border rounded-md focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label style={{ color: theme.subtext }} className="text-xs font-medium">
                Date of consumption
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={inputStyle}
                className="px-2.5 py-2 text-sm border rounded-md focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label style={{ color: theme.subtext }} className="text-xs font-medium">
              Reason / note
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Walk-in request by Juan Santos, internal use for meeting, correction of entry"
              style={inputStyle}
              className="px-2.5 py-2 text-sm border rounded-md focus:outline-none min-h-[70px] resize-y"
            />
          </div>
        </div>

        <div style={{ borderColor: theme.border }} className="flex justify-end gap-2 px-5 py-3.5 border-t">
          <button
            onClick={onClose}
            style={{ backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }}
            className="px-3.5 py-2 text-sm font-medium rounded-lg border"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{ backgroundColor: theme.primary, color: theme.primaryText, opacity: submitting ? 0.6 : 1 }}
            className="px-3.5 py-2 text-sm font-medium rounded-lg"
          >
            {submitting ? "Saving…" : "Save adjustment"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdjustStockModal;
