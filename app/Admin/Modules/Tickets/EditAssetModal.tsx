import React, { useEffect, useState } from "react";
import { ConcernTicket } from "../../../../types";

export type TicketEditUpdates = {
  summary: string;
  details: string;
  category: string;
  priority: string;
  status: string;
  assigneeId: string;
  assigneeName: string;
  dueDate: string;
};

interface Props {
  visible: boolean;
  selectedTicket: ConcernTicket | null;
  assigneeOptions: readonly { label: string; value: string }[];
  onClose: () => void;
  onSave: (ticketNumber: string, updates: TicketEditUpdates) => Promise<void>;
  onDelete?: (ticketNumber: string) => Promise<void>;
}

const CATEGORY_OPTIONS = [
  "CCTV", "Licenses Accounts", "Hardware", "Email", "Network",
  "Maintenance", "Medicine", "Office Supplies", "Software", "Other",
] as const;

const PRIORITY_OPTIONS = ["Low", "Medium", "High"] as const;
const STATUS_OPTIONS   = ["Pending", "In Progress", "Resolved"] as const;

// ── Helper: parse whatever dueDate shape comes from Firestore ─────────────────
const parseDueDate = (raw: any): string => {
  if (!raw) return "";
  if (typeof raw.toDate === "function") {
    const d = raw.toDate();
    return d.toISOString().split("T")[0];
  }
  if (raw instanceof Date) return raw.toISOString().split("T")[0];
  const d = new Date(raw);
  return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
};

// ─── component ────────────────────────────────────────────────────────────────
const EditTicketModal: React.FC<Props> = ({
  visible,
  selectedTicket,
  assigneeOptions,
  onClose,
  onSave,
  onDelete,
}) => {
  const [summary, setSummary]           = useState("");
  const [details, setDetails]           = useState("");
  const [category, setCategory]         = useState("");
  const [priority, setPriority]         = useState("");
  const [status, setStatus]             = useState("");
  const [assigneeId, setAssigneeId]     = useState("");
  const [assigneeName, setAssigneeName] = useState("");
  const [dueDate, setDueDate]           = useState("");
  const [error, setError]               = useState("");
  const [saving, setSaving]             = useState(false);
  const [deleting, setDeleting]         = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!selectedTicket) {
      setSummary(""); setDetails(""); setCategory(""); setPriority("");
      setStatus(""); setAssigneeId(""); setAssigneeName("");
      setDueDate(""); setError(""); setConfirmDelete(false);
      return;
    }
    setSummary(selectedTicket.summary);
    setDetails(selectedTicket.details || "");
    setCategory(selectedTicket.category);
    setPriority(selectedTicket.priority);
    setStatus(selectedTicket.status);
    setAssigneeId(selectedTicket.assigneeId || "");
    setAssigneeName(selectedTicket.assigneeName || "");
    setDueDate(parseDueDate(selectedTicket.dueDate));
    setError("");
    setConfirmDelete(false);
  }, [selectedTicket, visible]);

  const handleSave = async () => {
    if (!selectedTicket) return;
    setError("");
    if (!summary.trim()) { setError("Summary is required.");  return; }
    if (!details.trim()) { setError("Details are required."); return; }
    if (!dueDate)        { setError("Due date is required."); return; }

    setSaving(true);
    try {
      await onSave(selectedTicket.ticketNumber, {
        summary: summary.trim(),
        details: details.trim(),
        category,
        priority,
        status,
        assigneeId,
        assigneeName,
        dueDate,
      });
      onClose();
    } catch (err) {
      console.error("Failed to save ticket:", err);
      setError("Unable to save ticket. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePress = async () => {
    if (!selectedTicket || !onDelete) return;
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      await onDelete(selectedTicket.ticketNumber);
      onClose();
    } catch {
      setError("Failed to delete ticket. Please try again.");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleClose = () => {
    setError("");
    setConfirmDelete(false);
    onClose();
  };

  if (!visible || !selectedTicket) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">

        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Ticket Details</h2>
            <p className="text-xs text-gray-400 mt-0.5">{selectedTicket.ticketNumber}</p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Error */}
        {error && (
          <p className="text-red-500 text-sm mb-4 bg-red-50 px-3 py-2 rounded-md">{error}</p>
        )}

        <div className="flex flex-col gap-3">

          {/* Summary */}
          <input
            placeholder="Summary *"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            className={inputClass}
          />

          {/* Details */}
          <textarea
            placeholder="Details *"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={3}
            className={`${inputClass} resize-none`}
          />

          {/* Category */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputClass}
          >
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Priority */}
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className={inputClass}
          >
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          {/* Status */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={inputClass}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Assignee */}
          <select
            value={assigneeId}
            onChange={(e) => {
              const found = assigneeOptions.find((o) => o.value === e.target.value);
              setAssigneeId(e.target.value);
              setAssigneeName(found?.label ?? "");
            }}
            className={inputClass}
          >
            <option value="">Select Assignee</option>
            {assigneeOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Due Date */}
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className={inputClass}
          />

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-6">

          {/* Delete — only if onDelete prop provided */}
          {onDelete ? (
            <button
              onClick={handleDeletePress}
              disabled={deleting || saving}
              className={
                confirmDelete
                  ? "px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  : "px-4 py-2 text-sm font-medium text-red-500 bg-white border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              }
            >
              {deleting ? "Deleting..." : confirmDelete ? "Confirm Delete" : "Delete Ticket"}
            </button>
          ) : (
            <div />
          )}

          <div className="flex gap-3">
            {confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(false)}
                className={cancelBtn}
              >
                Cancel
              </button>
            ) : (
              <>
                <button onClick={handleClose} className={cancelBtn}>Cancel</button>
                <button onClick={handleSave} disabled={saving} className={primaryBtn}>
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

const inputClass =
  "w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
const cancelBtn =
  "px-5 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors";
const primaryBtn =
  "px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors";

export default EditTicketModal;
