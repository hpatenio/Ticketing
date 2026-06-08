import React, { useState } from "react";
import { useTheme } from "../../theme/ThemeContext";
import { saveDropdownOptions } from "../../Services/dropdownConfigs";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DropdownOption = {
  label: string;
  value: string;
  /** Tailwind badge class string — used for display in the table cells */
  badgeClass: string;
  /**
   * Raw hex values stored alongside badgeClass so Firestore holds
   * both the Tailwind string (for the table badge) and the actual
   * color hex values (for any custom renderers / non-Tailwind uses).
   */
  bgColor?: string;
  textColor?: string;
};

export type ColumnConfig = {
  id: string;
  label: string;
  editable: boolean;
  options: DropdownOption[];
};

type Props = {
  visible: boolean;
  onClose: () => void;
  columns: ColumnConfig[];
  onSave: (columns: ColumnConfig[]) => void;
};

// ─── Tailwind color presets for badge options ─────────────────────────────────

const COLOR_PRESETS = [
  { bg: "bg-emerald-100", text: "text-emerald-800", bgHex: "#d1fae5", textHex: "#065f46", label: "Green" },
  { bg: "bg-blue-100",    text: "text-blue-800",    bgHex: "#dbeafe", textHex: "#1e40af", label: "Blue" },
  { bg: "bg-red-100",     text: "text-red-800",     bgHex: "#fee2e2", textHex: "#991b1b", label: "Red" },
  { bg: "bg-orange-100",  text: "text-orange-800",  bgHex: "#ffedd5", textHex: "#9a3412", label: "Orange" },
  { bg: "bg-yellow-100",  text: "text-yellow-800",  bgHex: "#fef9c3", textHex: "#854d0e", label: "Yellow" },
  { bg: "bg-purple-100",  text: "text-purple-800",  bgHex: "#f3e8ff", textHex: "#6b21a8", label: "Purple" },
  { bg: "bg-pink-100",    text: "text-pink-800",    bgHex: "#fce7f3", textHex: "#9d174d", label: "Pink" },
  { bg: "bg-teal-100",    text: "text-teal-800",    bgHex: "#ccfbf1", textHex: "#115e59", label: "Teal" },
  { bg: "bg-cyan-100",    text: "text-cyan-800",    bgHex: "#cffafe", textHex: "#155e75", label: "Cyan" },
  { bg: "bg-indigo-100",  text: "text-indigo-800",  bgHex: "#e0e7ff", textHex: "#3730a3", label: "Indigo" },
  { bg: "bg-violet-100",  text: "text-violet-800",  bgHex: "#ede9fe", textHex: "#5b21b6", label: "Violet" },
  { bg: "bg-gray-100",    text: "text-gray-800",    bgHex: "#f3f4f6", textHex: "#1f2937", label: "Gray" },
];

const BASE_BADGE =
  "inline-flex justify-center px-2 py-1 rounded-lg text-sm font-semibold";

function makeBadgeClass(bg: string, text: string, minW: string = "min-w-[90px]") {
  return `${bg} ${text} ${BASE_BADGE} ${minW}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

const ManageColumnsModal: React.FC<Props> = ({
  visible,
  onClose,
  columns,
  onSave,
}) => {
  const { theme } = useTheme();
  const [localCols, setLocalCols] = useState<ColumnConfig[]>(
    JSON.parse(JSON.stringify(columns)),
  );
  const [activeColId, setActiveColId] = useState(
    columns.find((c) => c.editable)?.id ?? columns[0]?.id,
  );
  const [colorPickerIdx, setColorPickerIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (!visible) return null;

  const activeCol = localCols.find((c) => c.id === activeColId)!;

  const updateOption = (idx: number, patch: Partial<DropdownOption>) => {
    setLocalCols((prev) =>
      prev.map((col) =>
        col.id !== activeColId
          ? col
          : {
              ...col,
              options: col.options.map((opt, i) =>
                i === idx ? { ...opt, ...patch } : opt,
              ),
            },
      ),
    );
  };

  const addOption = () => {
    const preset = COLOR_PRESETS[0];
    setLocalCols((prev) =>
      prev.map((col) =>
        col.id !== activeColId
          ? col
          : {
              ...col,
              options: [
                ...col.options,
                {
                  label: "New option",
                  value: "New option",
                  badgeClass: makeBadgeClass(preset.bg, preset.text),
                  bgColor: preset.bgHex,
                  textColor: preset.textHex,
                },
              ],
            },
      ),
    );
  };

  const removeOption = (idx: number) => {
    setLocalCols((prev) =>
      prev.map((col) =>
        col.id !== activeColId
          ? col
          : { ...col, options: col.options.filter((_, i) => i !== idx) },
      ),
    );
  };

  const applyColor = (optIdx: number, preset: (typeof COLOR_PRESETS)[0]) => {
    const current = activeCol.options[optIdx];
    const minW =
      current.badgeClass.match(/min-w-\[[^\]]+\]/)?.[0] ?? "min-w-[90px]";
    updateOption(optIdx, {
      badgeClass: makeBadgeClass(preset.bg, preset.text, minW),
      bgColor: preset.bgHex,
      textColor: preset.textHex,
    });
    setColorPickerIdx(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);

    // Sync value to match label for all options
    const synced = localCols.map((col) => ({
      ...col,
      options: col.options.map((opt) => ({ ...opt, value: opt.label })),
    }));

    try {
      // Persist every editable column to Firestore
      await Promise.all(
        synced
          .filter((col) => col.editable)
          .map((col) => saveDropdownOptions(col.id, col.options)),
      );

      onSave(synced);
      onClose();
    } catch {
      setSaveError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setLocalCols(JSON.parse(JSON.stringify(columns)));
    setSaveError(null);
  };

  const getBadgeColors = (badgeClass: string) => {
    const bgMatch = badgeClass.match(/bg-\S+/);
    const textMatch = badgeClass.match(/text-\S+/);
    return {
      bg: bgMatch?.[0] ?? "bg-gray-100",
      text: textMatch?.[0] ?? "text-gray-800",
    };
  };

  return (
    <div
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: theme.surface,
          borderColor: theme.border,
          width: 660,
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
        }}
        className="rounded-xl border shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div
          style={{ borderBottomColor: theme.border }}
          className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
        >
          <div>
            <h2 style={{ color: theme.text }} className="text-base font-bold">
              Manage column dropdowns
            </h2>
            <p style={{ color: theme.subtext }} className="text-xs mt-0.5">
              Changes are saved to Firestore and applied immediately to all users
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ color: theme.subtext, backgroundColor: theme.surfaceRaised }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold hover:opacity-70"
          >
            ✕
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* Sidebar */}
          <div
            style={{ borderRightColor: theme.border, backgroundColor: theme.background }}
            className="w-44 flex-shrink-0 border-r overflow-y-auto py-2"
          >
            <p
              style={{ color: theme.subtext }}
              className="text-[10px] font-semibold uppercase tracking-widest px-4 pb-2"
            >
              Columns
            </p>
            {localCols.map((col) => (
              <button
                key={col.id}
                type="button"
                onClick={() => {
                  setActiveColId(col.id);
                  setColorPickerIdx(null);
                }}
                className="w-full flex items-center justify-between px-4 py-2 text-xs text-left"
                style={{
                  backgroundColor:
                    col.id === activeColId ? theme.surfaceRaised : "transparent",
                  color: col.id === activeColId ? theme.text : theme.subtext,
                  fontWeight: col.id === activeColId ? 600 : 400,
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor =
                    col.id === activeColId ? theme.surfaceRaised : theme.bgHover)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor =
                    col.id === activeColId ? theme.surfaceRaised : "transparent")
                }
              >
                <span>{col.label}</span>
                {col.editable ? (
                  <span
                    style={{
                      backgroundColor: theme.primarySubtle,
                      color: theme.primarySubtleText,
                    }}
                    className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                  >
                    {col.options.length}
                  </span>
                ) : (
                  <span
                    style={{ color: theme.subtext, backgroundColor: theme.surfaceRaised }}
                    className="text-[10px] px-1.5 py-0.5 rounded-full"
                  >
                    locked
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Editor */}
          <div className="flex-1 overflow-y-auto p-5">
            {!activeCol.editable ? (
              <div className="flex flex-col items-center justify-center h-full gap-2">
                <span style={{ fontSize: 28 }}>🔒</span>
                <p style={{ color: theme.subtext }} className="text-sm">
                  This column is managed automatically
                </p>
              </div>
            ) : (
              <>
                <p style={{ color: theme.text }} className="text-sm font-semibold mb-1">
                  {activeCol.label} options
                </p>
                <p style={{ color: theme.subtext }} className="text-xs mb-4">
                  Add, rename, or remove options. Click the color swatch to change badge color.
                </p>

                {/* Preview */}
                <div
                  style={{ backgroundColor: theme.background, borderColor: theme.border }}
                  className="rounded-lg border px-4 py-3 mb-4"
                >
                  <p style={{ color: theme.subtext }} className="text-[10px] uppercase tracking-widest font-semibold mb-2">
                    Preview
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {activeCol.options.length === 0 ? (
                      <span style={{ color: theme.subtext }} className="text-xs">No options yet</span>
                    ) : (
                      activeCol.options.map((opt, i) => (
                        <span key={i} className={opt.badgeClass}>
                          {opt.label || "…"}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Option rows */}
                <div className="flex flex-col gap-2 mb-3">
                  {activeCol.options.map((opt, idx) => {
                    const { bg, text } = getBadgeColors(opt.badgeClass);
                    const previewColor =
                      COLOR_PRESETS.find((p) => p.bg === bg)?.bg ?? "bg-gray-100";

                    return (
                      <div key={idx}>
                        <div
                          style={{ borderColor: theme.border, backgroundColor: theme.surface }}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg border"
                        >
                          {/* Color swatch */}
                          <button
                            type="button"
                            title="Change color"
                            onClick={() =>
                              setColorPickerIdx(colorPickerIdx === idx ? null : idx)
                            }
                            className={`w-5 h-5 rounded flex-shrink-0 border ${previewColor}`}
                            style={{ borderColor: theme.border }}
                          />

                          {/* Label input */}
                          <input
                            type="text"
                            value={opt.label}
                            onChange={(e) =>
                              updateOption(idx, { label: e.target.value })
                            }
                            style={{
                              backgroundColor: "transparent",
                              color: theme.text,
                              borderColor: "transparent",
                            }}
                            className="flex-1 text-xs outline-none border-b focus:border-b"
                            onFocus={(e) =>
                              (e.currentTarget.style.borderColor = theme.primary)
                            }
                            onBlur={(e) =>
                              (e.currentTarget.style.borderColor = "transparent")
                            }
                          />

                          {/* Color hex preview (read-only) */}
                          {opt.bgColor && (
                            <span
                              title={`bg: ${opt.bgColor} · text: ${opt.textColor}`}
                              className="text-[10px] font-mono opacity-40 flex-shrink-0"
                              style={{ color: theme.subtext }}
                            >
                              {opt.bgColor}
                            </span>
                          )}

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => removeOption(idx)}
                            style={{ color: theme.subtext }}
                            className="text-xs hover:opacity-60 flex-shrink-0"
                            title="Remove option"
                          >
                            ✕
                          </button>
                        </div>

                        {/* Color picker inline */}
                        {colorPickerIdx === idx && (
                          <div
                            style={{
                              backgroundColor: theme.surface,
                              borderColor: theme.border,
                            }}
                            className="flex flex-wrap gap-2 px-3 py-2 border border-t-0 rounded-b-lg"
                          >
                            {COLOR_PRESETS.map((preset) => (
                              <button
                                key={preset.label}
                                type="button"
                                title={preset.label}
                                onClick={() => applyColor(idx, preset)}
                                className={`w-5 h-5 rounded ${preset.bg} border`}
                                style={{
                                  borderColor:
                                    bg === preset.bg ? theme.primary : theme.border,
                                  outline:
                                    bg === preset.bg
                                      ? `2px solid ${theme.primary}`
                                      : "none",
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Add option */}
                <button
                  type="button"
                  onClick={addOption}
                  style={{ borderColor: theme.border, color: theme.subtext }}
                  className="w-full flex items-center gap-2 px-3 py-2 border border-dashed rounded-lg text-xs hover:opacity-70 mb-4"
                >
                  <span className="text-base leading-none">+</span> Add option
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div
          style={{ borderTopColor: theme.border }}
          className="flex items-center justify-between px-5 py-3 border-t flex-shrink-0"
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleReset}
              disabled={saving}
              style={{ color: theme.subtext, borderColor: theme.border }}
              className="px-3 py-1.5 text-xs border rounded-lg hover:opacity-70 disabled:opacity-40"
            >
              Reset to saved
            </button>
            {saveError && (
              <span className="text-xs text-red-500">{saveError}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={{ color: theme.text, borderColor: theme.border }}
              className="px-3 py-1.5 text-xs border rounded-lg hover:opacity-70 disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{ backgroundColor: theme.primary, color: theme.primaryText }}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg hover:opacity-90 disabled:opacity-60 flex items-center gap-2"
            >
              {saving && (
                <span
                  className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: theme.primaryText, borderTopColor: "transparent" }}
                />
              )}
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageColumnsModal;
