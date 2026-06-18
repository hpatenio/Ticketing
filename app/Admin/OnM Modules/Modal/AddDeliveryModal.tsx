import React, { useEffect, useRef, useState } from "react";
//@ts-ignore 
import { createPortal } from "react-dom";
import { useTheme } from "../../../../theme/ThemeContext";
import { addDelivery } from "../../../../Services/officeInventory";
import { OfficeInventoryItem, } from "../../../../types";



type Props = {
  visible: boolean;
  item: OfficeInventoryItem | null;
  items: OfficeInventoryItem[];
  onSelectItem: (item: OfficeInventoryItem | null) => void;
  onClose: () => void;
  onSuccess: () => void;
};

type DeliveryRow = {
  id: string;
  itemId: string;
  quantity: string;
  price: string;
};

const todayStr = () => new Date().toISOString().split("T")[0];
const uid = () => Math.random().toString(36).slice(2, 8);

const emptyRow = (): DeliveryRow => ({
  id: uid(),
  itemId: "",
  quantity: "",
  price: "",
});

// ─── Searchable item picker ───────────────────────────────────────────────────

type ItemPickerProps = {
  items: OfficeInventoryItem[];
  value: string;
  onChange: (id: string) => void;
  inputStyle: React.CSSProperties;
  theme: any;
};

function ItemPicker({ items, value, onChange, inputStyle, theme }: ItemPickerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const selected = items.find((i) => i.id === value);

  const filtered = query
    ? items.filter(
        (i) =>
          i.name.toLowerCase().includes(query.toLowerCase()) ||
          i.itemCode.toLowerCase().includes(query.toLowerCase())
      )
    : items;

  const openDropdown = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropdownH = Math.min(220, items.length * 37 + 8);
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
    setOpen(true);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!wrapRef.current?.contains(target) && !popoverRef.current?.contains(target)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%" }}>
      {/* Trigger — acts as both display and search input */}
      <div
        style={{
          width: "100%",
          backgroundColor: inputStyle.backgroundColor,
          border: `1px solid ${inputStyle.borderColor}`,
          borderRadius: 8,
          padding: "0 10px",
          height: 38,
          display: "flex",
          alignItems: "center",
          boxSizing: "border-box",
        }}
      >
        <input
          ref={inputRef}
          type="text"
          placeholder="Select an item…"
          value={open ? query : selected ? `${selected.name} (${selected.itemCode})` : ""}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) openDropdown();
          }}
          onFocus={() => {
            setQuery("");
            openDropdown();
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              setQuery("");
              inputRef.current?.blur();
            }
          }}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            fontSize: 13,
            color: selected && !open ? inputStyle.color : open ? inputStyle.color : theme.subtext,
            cursor: "text",
            minWidth: 0,
          }}
        />
      </div>

      {open &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              ...dropdownStyle,
              backgroundColor: theme.surface,
              border: `1px solid ${theme.border}`,
              borderRadius: 8,
              boxShadow: `0 4px 16px ${theme.shadow ?? "rgba(0,0,0,0.12)"}`,
              overflow: "hidden",
            }}
          >
            <ul style={{ maxHeight: 200, overflowY: "auto", margin: 0, padding: 0, listStyle: "none" }}>
              {filtered.length === 0 ? (
                <li style={{ padding: "10px 12px", fontSize: 12, color: theme.subtext }}>
                  No items match.
                </li>
              ) : (
                filtered.map((i) => (
                  <li
                    key={i.id}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onChange(i.id);
                      setOpen(false);
                      setQuery("");
                    }}
                    style={{
                      padding: "8px 12px",
                      fontSize: 13,
                      cursor: "pointer",
                      color: i.id === value ? theme.primary : theme.text,
                      fontWeight: i.id === value ? 600 : 400,
                      borderBottom: `1px solid ${theme.border}`,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.bgHover)}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <span>{i.name}</span>
                    <span style={{ color: theme.subtext, fontSize: 11 }}>{i.itemCode}</span>
                  </li>
                ))
              )}
            </ul>
          </div>,
          document.body
        )}
    </div>
  );
}




// ─── Main modal ───────────────────────────────────────────────────────────────

const AddDeliveryModal: React.FC<Props> = ({
  visible,
  item,
  items,
  onSelectItem,
  onClose,
  onSuccess,
}) => {
  const { theme } = useTheme();

  // ── Mode: single | bulk ──────────────────────────────────────────────────
  const [mode, setMode] = useState<"single" | "bulk">("single");

  // ── Single-mode state ────────────────────────────────────────────────────
  const [quantity, setQuantity] = useState("");
  const [date, setDate] = useState(todayStr());
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");

  // ── Bulk-mode state ──────────────────────────────────────────────────────
  const [bulkDate, setBulkDate] = useState(todayStr());
  const [bulkNotes, setBulkNotes] = useState("");
  const [rows, setRows] = useState<DeliveryRow[]>([emptyRow()]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setQuantity("");
      setDate(todayStr());
      setPrice(item ? String(item.pricePerUnit) : "");
      setNotes("");
      setBulkDate(todayStr());
      setBulkNotes("");
      setRows([emptyRow()]);
      setError(null);
      setMode("single");
    }
  }, [visible, item]);

  if (!visible) return null;

  const inputStyle: React.CSSProperties = {
    backgroundColor: theme.inputBg,
    borderColor: theme.inputBorder,
    color: theme.inputText,
  };

  // ── Bulk row helpers ─────────────────────────────────────────────────────
  const updateRow = (id: string, field: keyof DeliveryRow, val: string) =>
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: val } : r))
    );

  const addRow = () => setRows((prev) => [...prev, emptyRow()]);
  const removeRow = (id: string) =>
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));

  const handleRowItemChange = (rowId: string, itemId: string) => {
    const selected = items.find((i) => i.id === itemId);
    setRows((prev) =>
      prev.map((r) =>
        r.id === rowId
          ? { ...r, itemId, price: selected ? String(selected.pricePerUnit) : "" }
          : r
      )
    );
  };

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setError(null);

    if (mode === "single") {
      if (!item) return setError("Select an item.");
      const qty = Number(quantity);
      if (!qty || qty <= 0) return setError("Enter a quantity greater than 0.");
      const unitPrice = Number(price);
      if (!unitPrice || unitPrice <= 0) return setError("Enter a valid price per unit.");

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
    } else {
      // Validate all rows
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        if (!r.itemId) return setError(`Row ${i + 1}: select an item.`);
        if (!Number(r.quantity) || Number(r.quantity) <= 0)
          return setError(`Row ${i + 1}: enter a quantity greater than 0.`);
        if (!Number(r.price) || Number(r.price) <= 0)
          return setError(`Row ${i + 1}: enter a valid price per unit.`);
      }

      setSubmitting(true);
      try {
        await Promise.all(
          rows.map((r) =>
            addDelivery(r.itemId, Number(r.quantity), bulkDate, Number(r.price), bulkNotes.trim())
          )
        );
        onSuccess();
        onClose();
      } catch (err: any) {
        setError(err?.message ?? "Unable to record deliveries.");
      } finally {
        setSubmitting(false);
      }
    }
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ backgroundColor: "rgba(0,0,0,0.35)" }}
      className="fixed inset-0 z-[100] flex items-center justify-center"
    >
      <div
        style={{
          backgroundColor: theme.surface,
          borderColor: theme.border,
          width: mode === "bulk" ? 580 : 420,
          maxWidth: "95vw",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
        }}
        className="rounded-xl border shadow-xl"
      >
        {/* Header */}
        <div
          style={{ borderColor: theme.border }}
          className="flex items-center justify-between px-5 py-4 border-b"
        >
          <div className="flex items-center gap-3">
            <span style={{ color: theme.text }} className="text-sm font-semibold">
              Record delivery
            </span>

            {/* Mode toggle */}
            <div
              style={{
                display: "flex",
                backgroundColor: theme.inputBg,
                border: `1px solid ${theme.border}`,
                borderRadius: 8,
                padding: 2,
                gap: 2,
              }}
            >
              {(["single", "bulk"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setError(null); }}
                  style={{
                    padding: "3px 10px",
                    fontSize: 11,
                    fontWeight: 500,
                    borderRadius: 6,
                    border: "none",
                    cursor: "pointer",
                    backgroundColor: mode === m ? theme.primary : "transparent",
                    color: mode === m ? theme.primaryText : theme.subtext,
                    transition: "all 0.15s",
                  }}
                >
                  {m === "single" ? "Single" : "Bulk"}
                </button>
              ))}
            </div>
          </div>

          <button onClick={onClose} style={{ color: theme.subtext }} className="text-lg leading-none">
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", flex: 1 }} className="px-5 py-4 flex flex-col gap-3.5">
          {error && (
            <div className="text-xs px-3 py-2 rounded-md bg-red-50 text-red-700 border border-red-200">
              {error}
            </div>
          )}

          {/* ── SINGLE mode ─────────────────────────────────────────────── */}
          {mode === "single" && (
            <>
              <div className="flex flex-col gap-1">
                <label style={{ color: theme.subtext }} className="text-xs font-medium">Item</label>
                <ItemPicker
                  items={items}
                  value={item?.id ?? ""}
                  onChange={(id) => {
                    const selected = items.find((i) => i.id === id) ?? null;
                    onSelectItem(selected);
                    if (selected) setPrice(String(selected.pricePerUnit));
                  }}
                  inputStyle={inputStyle}
                  theme={theme}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label style={{ color: theme.subtext }} className="text-xs font-medium">Quantity delivered</label>
                  <input
                    type="number" min="1" value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="0" style={inputStyle}
                    className="px-2.5 py-2 text-sm border rounded-md focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label style={{ color: theme.subtext }} className="text-xs font-medium">Date of delivery</label>
                  <input
                    type="date" value={date}
                    onChange={(e) => setDate(e.target.value)}
                    style={inputStyle}
                    className="px-2.5 py-2 text-sm border rounded-md focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label style={{ color: theme.subtext }} className="text-xs font-medium">Price per unit (₱)</label>
                <input
                  type="number" step="0.01" value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00" style={inputStyle}
                  className="px-2.5 py-2 text-sm border rounded-md focus:outline-none"
                />
                <span style={{ color: theme.subtext }} className="text-[11px]">
                  May differ from the item's current price — delivery total is auto-computed
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <label style={{ color: theme.subtext }} className="text-xs font-medium">Notes</label>
                <textarea
                  value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder="Supplier name, delivery reference number, etc."
                  style={inputStyle}
                  className="px-2.5 py-2 text-sm border rounded-md focus:outline-none min-h-[60px] resize-y"
                />
              </div>
            </>
          )}

          {/* ── BULK mode ───────────────────────────────────────────────── */}
          {mode === "bulk" && (
            <>
              {/* Shared date + notes */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label style={{ color: theme.subtext }} className="text-xs font-medium">Date of delivery</label>
                  <input
                    type="date" value={bulkDate}
                    onChange={(e) => setBulkDate(e.target.value)}
                    style={inputStyle}
                    className="px-2.5 py-2 text-sm border rounded-md focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label style={{ color: theme.subtext }} className="text-xs font-medium">Notes (applies to all)</label>
                  <input
                    type="text" value={bulkNotes}
                    onChange={(e) => setBulkNotes(e.target.value)}
                    placeholder="Supplier, reference…"
                    style={inputStyle}
                    className="px-2.5 py-2 text-sm border rounded-md focus:outline-none"
                  />
                </div>
              </div>

              {/* Column headers */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 90px 100px 32px",
                  gap: 8,
                  paddingBottom: 4,
                  borderBottom: `1px solid ${theme.border}`,
                }}
              >
                {["Item", "Qty", "Price / unit (₱)", ""].map((h) => (
                  <span key={h} style={{ color: theme.subtext, fontSize: 11, fontWeight: 500 }}>{h}</span>
                ))}
              </div>

              {/* Rows */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {rows.map((row, idx) => (
                  <div
                    key={row.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 90px 100px 32px",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    <ItemPicker
                      items={items}
                      value={row.itemId}
                      onChange={(id) => handleRowItemChange(row.id, id)}
                      inputStyle={inputStyle}
                      theme={theme}
                    />
                    <input
                      type="number" min="1" value={row.quantity}
                      onChange={(e) => updateRow(row.id, "quantity", e.target.value)}
                      placeholder="0"
                      style={{ ...inputStyle, padding: "7px 8px", fontSize: 13, border: `1px solid ${inputStyle.borderColor}`, borderRadius: 6, outline: "none", width: "100%", boxSizing: "border-box" }}
                    />
                    <input
                      type="number" step="0.01" value={row.price}
                      onChange={(e) => updateRow(row.id, "price", e.target.value)}
                      placeholder="0.00"
                      style={{ ...inputStyle, padding: "7px 8px", fontSize: 13, border: `1px solid ${inputStyle.borderColor}`, borderRadius: 6, outline: "none", width: "100%", boxSizing: "border-box" }}
                    />
                    <button
                      onClick={() => removeRow(row.id)}
                      title="Remove row"
                      style={{
                        width: 28, height: 28, borderRadius: 6,
                        border: `1px solid ${theme.border}`,
                        backgroundColor: "transparent",
                        color: rows.length === 1 ? theme.subtext : "#f87171",
                        cursor: rows.length === 1 ? "not-allowed" : "pointer",
                        fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                      disabled={rows.length === 1}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              {/* Add row */}
              <button
                onClick={addRow}
                style={{
                  alignSelf: "flex-start",
                  fontSize: 12,
                  fontWeight: 500,
                  color: theme.primary,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "2px 0",
                }}
              >
                + Add another item
              </button>

              <span style={{ color: theme.subtext }} className="text-[11px]">
                Each row is saved as a separate delivery. Prices default to the item's current unit price.
              </span>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{ borderColor: theme.border }}
          className="flex justify-end gap-2 px-5 py-3.5 border-t"
        >
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
            {submitting
              ? "Saving…"
              : mode === "bulk"
              ? `Save ${rows.length} deliver${rows.length === 1 ? "y" : "ies"}`
              : "Save delivery"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddDeliveryModal;
