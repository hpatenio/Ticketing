import React, { useEffect, useState } from "react";
import { addTicket } from "../../../../Services/ticketService";

interface AssigneeOption {
  label: string;
  value: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  assigneeOptions: readonly AssigneeOption[];
  currentUserId: string;
  currentUserName: string;
}

const CATEGORY_OPTIONS = [
  "CCTV",
  "Licenses Accounts",
  "Hardware",
  "Email",
  "Network",
  "Maintenance",
  "Medicine",
  "Office Supplies",
  "Software",
  "Other",
] as const;

const PRIORITY_OPTIONS = ["Low", "Medium", "High"] as const;
const STATUS_OPTIONS   = ["Pending", "In Progress", "Resolved"] as const;

type Category = typeof CATEGORY_OPTIONS[number];
type Priority = typeof PRIORITY_OPTIONS[number];
type Status   = typeof STATUS_OPTIONS[number];

const EMPTY_FORM = {
  summary:      "",
  details:      "",
  category:     "Software" as Category,
  priority:     "Medium"   as Priority,
  status:       "Pending"  as Status,
  assigneeId:   "",
  assigneeName: "",
  dueDate:      "",
};

// ─── component ────────────────────────────────────────────────────────────────

const AddTicketModal: React.FC<Props> = ({
  visible,
  onClose,
  onSuccess,
  assigneeOptions,
  currentUserId,
  currentUserName,
}) => {
  const [form, setForm]     = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  // Requester — auto-set from the logged-in user, not editable
  const requesterId   = currentUserId;
  const requesterName = currentUserName;

  useEffect(() => {
    if (!visible) {
      setForm(EMPTY_FORM);
      setError("");
    }
  }, [visible]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    setError("");
    if (!form.summary.trim()) { setError("Summary is required.");  return; }
    if (!form.details.trim()) { setError("Details are required."); return; }
    if (!form.dueDate)        { setError("Due date is required."); return; }

    setSaving(true);
    try {
      const assignee = assigneeOptions.find((o) => o.value === form.assigneeId);
      await addTicket({
        ticketNumber: `CT-${Date.now()}`,
        summary:      form.summary.trim(),
        details:      form.details.trim(),
        requesterId,
        requesterName,
        assigneeId:   form.assigneeId,
        assigneeName: assignee?.label ?? form.assigneeName,
        category:     form.category,
        priority:     form.priority,
        status:       form.status,
        dueDate:      new Date(form.dueDate),
      });
      setForm(EMPTY_FORM);
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Unable to create ticket.", err);
      setError("Unable to create ticket. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setForm(EMPTY_FORM);
    setError("");
    onClose();
  };

  if (!visible) return null;

  // Requester initials for badge
  const initials = requesterName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-semibold text-gray-800">Create Ticket</h2>
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
            name="summary"
            placeholder="Summary *"
            value={form.summary}
            onChange={handleChange}
            className={inputClass}
          />

          {/* Details */}
          <textarea
            name="details"
            placeholder="Details *"
            value={form.details}
            onChange={handleChange}
            rows={3}
            className={`${inputClass} resize-none`}
          />

          {/* Requester — read-only badge */}
          <div className="flex items-center gap-2 w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-bold shrink-0">
              {initials}
            </span>
            <span className="text-gray-700 font-medium">
              {requesterName || "Loading..."}
            </span>
            <span className="ml-auto text-xs text-gray-400">Requester</span>
          </div>

          {/* Category */}
          <select name="category" value={form.category} onChange={handleChange} className={inputClass}>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Priority */}
          <select name="priority" value={form.priority} onChange={handleChange} className={inputClass}>
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          {/* Status */}
          <select name="status" value={form.status} onChange={handleChange} className={inputClass}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Assignee */}
          <select
            name="assigneeId"
            value={form.assigneeId}
            onChange={(e) => {
              const found = assigneeOptions.find((o) => o.value === e.target.value);
              setForm({ ...form, assigneeId: e.target.value, assigneeName: found?.label ?? "" });
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
            name="dueDate"
            type="date"
            value={form.dueDate}
            onChange={handleChange}
            className={inputClass}
          />

        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={handleClose} className={cancelBtn}>Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className={primaryBtn}>
            {saving ? "Saving..." : "Create Ticket"}
          </button>
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

export default AddTicketModal;
