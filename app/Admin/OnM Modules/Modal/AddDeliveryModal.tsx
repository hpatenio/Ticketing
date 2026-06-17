import React, { useEffect, useState } from "react";
import { useTheme } from "../../../../theme/ThemeContext";
import { addDelivery } from "../../../../Services/officeInventory";
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

const AddDeliveryModal: React.FC<Props> = ({
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
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setQuantity("");
      setDate(todayStr());
      setPrice(item ? String(item.pricePerUnit) : "");
      setNotes("");
      setError(null);
    }
  }, [visible, item]);

  if (!visible) return null;

  const inputStyle = {
    backgroundColor: theme.inputBg,
    borderColor: theme.inputBorder,
    color: theme.inputText,
  };

  const handleSelect = (id: string) => {
    const selected = items.find((i) => i.id === id) ?? null;
    onSelectItem(selected);
    if (selected) setPrice(String(selected.pricePerUnit));
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
    const unitPrice = Number(price);
    if (!unitPrice || unitPrice <= 0) {
      setError("Enter a valid price per unit.");
      return;
    }
    setSubmitting(true);
    try {
      await addDelivery(item.id, qty, date, unitPrice, notes.trim());
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message ?? "Unable to record delivery.");
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
            Record delivery
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
              onChange={(e) => handleSelect(e.target.value)}
              style={inputStyle}
              className="px-2.5 py-2 text-sm border rounded-md focus:outline-none"
            >
              <option value="">Select an item…</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.itemCode})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label style={{ color: theme.subtext }} className="text-xs font-medium">
                Quantity delivered
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
                Date of delivery
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
              Price per unit (₱)
            </label>
            <input
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              style={inputStyle}
              className="px-2.5 py-2 text-sm border rounded-md focus:outline-none"
            />
            <span style={{ color: theme.subtext }} className="text-[11px]">
              May differ from the item's current price — delivery total is auto-computed
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <label style={{ color: theme.subtext }} className="text-xs font-medium">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Supplier name, delivery reference number, etc."
              style={inputStyle}
              className="px-2.5 py-2 text-sm border rounded-md focus:outline-none min-h-[60px] resize-y"
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
            {submitting ? "Saving…" : "Save delivery"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddDeliveryModal;
