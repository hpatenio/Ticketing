import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { addTicket } from "../../../../Services/ticketService";
import InlineDropdown from "../../../../components/common/InlineDropdown";

interface AssigneeOption {
  label: string;
  value: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  assigneeOptions: readonly AssigneeOption[];
}

const CATEGORY_OPTIONS = [
  { label: "CCTV", value: "CCTV" },
  { label: "Licenses Accounts", value: "Licenses Accounts" },
  { label: "Hardware", value: "Hardware" },
  { label: "Email", value: "Email" },
  { label: "Network", value: "Network" },
  { label: "Maintenance", value: "Maintenance" },
  { label: "Medicine", value: "Medicine" },
  { label: "Office Supplies", value: "Office Supplies" },
  { label: "Software", value: "Software" },
  { label: "Other", value: "Other" },
] as const;

const PRIORITY_OPTIONS = [
  { label: "Low", value: "Low" },
  { label: "Medium", value: "Medium" },
  { label: "High", value: "High" },
] as const;

const STATUS_OPTIONS = [
  { label: "Pending", value: "Pending" },
  { label: "In Progress", value: "In Progress" },
  { label: "Resolved", value: "Resolved" },
] as const;

const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// ── Compact inline calendar rendered directly in the ScrollView ──────────────
const MiniCalendar: React.FC<{
  selected: Date | null;
  onSelect: (d: Date) => void;
  onClose: () => void;
}> = ({ selected, onSelect, onClose }) => {
  const [current, setCurrent] = useState(new Date(selected ?? new Date()));

  const year = current.getFullYear();
  const month = current.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = current.toLocaleString("default", { month: "long", year: "numeric" });

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const isSelected = (day: number) =>
    selected !== null &&
    selected.getFullYear() === year &&
    selected.getMonth() === month &&
    selected.getDate() === day;

  const isToday = (day: number) => {
    const t = new Date();
    return t.getFullYear() === year && t.getMonth() === month && t.getDate() === day;
  };

  return (
    <View style={cal.wrapper}>
      {/* Calendar header */}
      <View style={cal.header}>
        <TouchableOpacity
          onPress={() => setCurrent(new Date(year, month - 1, 1))}
          style={cal.navBtn}
        >
          <Text style={cal.navText}>‹</Text>
        </TouchableOpacity>
        <Text style={cal.monthLabel}>{monthLabel}</Text>
        <TouchableOpacity
          onPress={() => setCurrent(new Date(year, month + 1, 1))}
          style={cal.navBtn}
        >
          <Text style={cal.navText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Day-of-week headers */}
      <View style={cal.row}>
        {DAYS_OF_WEEK.map((d) => (
          <View key={d} style={cal.cell}>
            <Text style={cal.dayHeader}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Day cells */}
      <View style={cal.grid}>
        {cells.map((day, i) => (
          <TouchableOpacity
            key={i}
            disabled={!day}
            onPress={() => {
              if (day) {
                onSelect(new Date(year, month, day));
                onClose();
              }
            }}
            style={[
              cal.cell,
              cal.dayCell,
              day && isSelected(day) ? cal.selectedCell : undefined,
              day && isToday(day) && !isSelected(day) ? cal.todayCell : undefined,
            ]}
          >
            <Text
              style={[
                cal.dayText,
                day && isSelected(day) ? cal.selectedText : undefined,
                day && isToday(day) && !isSelected(day) ? cal.todayText : undefined,
                !day ? { opacity: 0 } : undefined,
              ]}
            >
              {day ?? "·"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

// ── Main modal ────────────────────────────────────────────────────────────────
const AddTicketModal: React.FC<Props> = ({ visible, onClose, onSuccess, assigneeOptions }) => {
  const [summary, setSummary] = useState("");
  const [details, setDetails] = useState("");
  const [category, setCategory] = useState<typeof CATEGORY_OPTIONS[number]["value"]>("Software");
  const [priority, setPriority] = useState<typeof PRIORITY_OPTIONS[number]["value"]>("Medium");
  const [status, setStatus] = useState<typeof STATUS_OPTIONS[number]["value"]>("Pending");
  const [assigneeId, setAssigneeId] = useState("");
  const [assigneeName, setAssigneeName] = useState("");
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showCal, setShowCal] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) {
      setSummary("");
      setDetails("");
      setCategory("Software");
      setPriority("Medium");
      setStatus("Pending");
      setAssigneeId("");
      setAssigneeName("");
      setDueDate(null);
      setShowCal(false);
      setError("");
    }
  }, [visible]);

  const handleSubmit = async () => {
    setError("");
    if (!summary.trim()) { setError("Summary is required."); return; }
    if (!details.trim()) { setError("Details are required."); return; }
    if (!dueDate) { setError("Due date is required."); return; }

    setSaving(true);
    try {
      await addTicket({
        ticketNumber: `CT-${Date.now()}`,
        summary: summary.trim(),
        details: details.trim(),
        requesterId: "admin",
        requesterName: "IT Admin",
        assigneeId,
        assigneeName,
        category,
        priority,
        status,
        dueDate,
      });
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Unable to create ticket.", err);
      setError("Unable to create ticket. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const dueDateLabel = dueDate
    ? dueDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "Select a date";

  return (
    <Modal visible={visible} animationType="slide" transparent  >
      <View style={styles.overlay}>
        <View style={styles.sheet}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Create Ticket</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
          >
            {/* Error banner */}
            {error ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Summary */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Summary *</Text>
              <TextInput
                style={styles.input}
                placeholder="Short summary"
                placeholderTextColor="#9ca3af"
                value={summary}
                onChangeText={setSummary}
              />
            </View>

            {/* Details */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Details *</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder="Describe the issue"
                placeholderTextColor="#9ca3af"
                multiline
                value={details}
                onChangeText={setDetails}
              />
            </View>

            {/* Category */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Category</Text>
              <InlineDropdown
                value={category}
                options={CATEGORY_OPTIONS}
                onSelect={async (val: string) =>
                  setCategory(val as typeof CATEGORY_OPTIONS[number]["value"])
                }
              />
            </View>

            {/* Priority */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Priority</Text>
              <InlineDropdown
                value={priority}
                options={PRIORITY_OPTIONS}
                onSelect={async (val: string) =>
                  setPriority(val as typeof PRIORITY_OPTIONS[number]["value"])
                }
              />
            </View>

            {/* Status */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Status</Text>
              <InlineDropdown
                value={status}
                options={STATUS_OPTIONS}
                onSelect={async (val: string) =>
                  setStatus(val as typeof STATUS_OPTIONS[number]["value"])
                }
              />
            </View>

            {/* Assignee */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Assignee</Text>
              <InlineDropdown
                value={assigneeName || "Unassigned"}
                options={
                  assigneeOptions.length > 0
                    ? assigneeOptions
                    : [{ label: "No employees found", value: "" }]
                }
                onSelect={async (val: string) => {
                  setAssigneeId(val);
                  const found = assigneeOptions.find((item) => item.value === val);
                  setAssigneeName(found?.label ?? "");
                }}
              />
            </View>

            {/* Due Date */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Due Date *</Text>

              {/* Trigger button */}
              <TouchableOpacity
                style={[styles.dateBtn, showCal && styles.dateBtnActive]}
                onPress={() => setShowCal((v) => !v)}
                activeOpacity={0.8}
              >
                <Text style={dueDate ? styles.dateBtnText : styles.dateBtnPlaceholder}>
                  {dueDateLabel}
                </Text>
                <Text style={styles.calIcon}>📅</Text>
              </TouchableOpacity>

              {/* Inline calendar — expands inside the ScrollView, no absolute positioning */}
              {showCal && (
                <MiniCalendar
                  selected={dueDate}
                  onSelect={(d) => setDueDate(d)}
                  onClose={() => setShowCal(false)}
                />
              )}
            </View>

            {/* Footer buttons */}
            <View style={styles.footer}>
              <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, saving && styles.primaryBtnDisabled]}
                onPress={handleSubmit}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Create Ticket</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ── Calendar styles ───────────────────────────────────────────────────────────
const cal = StyleSheet.create({
  wrapper: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  navBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#f1f5f9",
    borderRadius: 6,
  },
  navText: {
    fontSize: 16,
    color: "#374151",
    fontWeight: "600",
  },
  monthLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cell: {
    width: `${100 / 7}%` as any,
    alignItems: "center",
    justifyContent: "center",
  },
  dayHeader: {
    fontSize: 10,
    fontWeight: "600",
    color: "#6b7280",
    textAlign: "center",
    paddingVertical: 2,
  },
  dayCell: {
    height: 34,
    borderRadius: 999,
    marginBottom: 2,
  },
  selectedCell: {
    backgroundColor: "#2563eb",
  },
  todayCell: {
    backgroundColor: "#eff6ff",
  },
  dayText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#111827",
    textAlign: "center",
  },
  selectedText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  todayText: {
    color: "#2563eb",
    fontWeight: "700",
  },
});

// ── Modal styles ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  sheet: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    width: "92%",
    maxWidth: 540,
    maxHeight: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
    padding: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
  },
  closeBtn: { padding: 4 },
  closeBtnText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#9ca3af",
  },
  body: {
    gap: 12,
    paddingBottom: 8,
  },
  errorBanner: {
    backgroundColor: "#fef2f2",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 4,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 13,
  },
  fieldGroup: { gap: 4 },
  label: {
    fontSize: 12,
    fontWeight: "500",
    color: "#4b5563",
    marginBottom: 2,
  },
  input: {
    width: "100%",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
  },
  textarea: {
    height: 96,
    textAlignVertical: "top",
  },
  // Date trigger button
  dateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    backgroundColor: "#ffffff",
  },
  dateBtnActive: {
    borderColor: "#2563eb",
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  dateBtnText: {
    fontSize: 14,
    color: "#111827",
  },
  dateBtnPlaceholder: {
    fontSize: 14,
    color: "#9ca3af",
  },
  calIcon: { fontSize: 16 },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 16,
  },
  cancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#4b5563",
  },
  primaryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
    minWidth: 110,
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#ffffff",
  },
});

export default AddTicketModal;
