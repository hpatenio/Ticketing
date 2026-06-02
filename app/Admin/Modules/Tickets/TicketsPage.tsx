import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useEmployees, EmployeeOption } from "../../../../hooks/useEmployees";
import { ConcernTicket } from "../../../../types";
import {
  getAllTickets,
  updateTicketField,
} from "../../../../Services/ticketService";
import AssigneeDropdown from "../../../../components/common/AssigneeDropdown";
import InlineDropdown from "../../../../components/common/InlineDropdown";
import InlineDatePicker from "../../../../components/common/InlineDatePicker";
import EditAssetModal from "./EditAssetModal";
import AddAssetModal from "./AddAssetModal";
import { useTheme } from "../../../../theme/ThemeContext";

// ─── Options ──────────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS = [
  { label: "CCTV", value: "CCTV", color: "bg-blue-600" },
  {
    label: "Licenses Accounts",
    value: "Licenses Accounts",
    color: "bg-violet-600",
  },
  { label: "Hardware", value: "Hardware", color: "bg-slate-600" },
  { label: "Email", value: "Email", color: "bg-cyan-600" },
  { label: "Network", value: "Network", color: "bg-emerald-600" },
  { label: "Maintenance", value: "Maintenance", color: "bg-amber-600" },
  { label: "Medicine", value: "Medicine", color: "bg-rose-600" },
  { label: "Office Supplies", value: "Office Supplies", color: "bg-slate-500" },
  { label: "Software", value: "Software", color: "bg-indigo-600" },
  { label: "Other", value: "Other", color: "bg-gray-600" },
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

// ─── Column config ────────────────────────────────────────────────────────────

const COLUMNS = [
  { key: "summary", label: "Summary", flex: 2, minWidth: 180 },
  { key: "requesterName", label: "Requester", flex: 1.5, minWidth: 120 },
  { key: "assigneeName", label: "Assignee", flex: 1.5, minWidth: 120 },
  { key: "category", label: "Category", flex: 1.5, minWidth: 130 },
  { key: "priority", label: "Priority", flex: 1, minWidth: 90 },
  { key: "status", label: "Status", flex: 1.2, minWidth: 110 },
  { key: "dueDate", label: "Due Date", flex: 1.2, minWidth: 110 },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTimestamp(value: any) {
  if (value && typeof value.toDate === "function") {
    return value.toDate().toLocaleDateString();
  }
  if (value instanceof Date) {
    return value.toLocaleDateString();
  }
  return String(value || "-");
}

const renderStatusBadge = (value: string) => {
  const bg =
    value === "Resolved"
      ? "#d1fae5"
      : value === "In Progress"
        ? "#dbeafe"
        : "#fef9c3";
  const color =
    value === "Resolved"
      ? "#065f46"
      : value === "In Progress"
        ? "#1d4ed8"
        : "#92400e";
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: bg,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: "700", color }}>
        {value || "—"}
      </Text>
    </View>
  );
};

const renderPriorityBadge = (value: string) => {
  const bg =
    value === "High" ? "#fee2e2" : value === "Medium" ? "#fef9c3" : "#f0fdf4";
  const color =
    value === "High" ? "#b91c1c" : value === "Medium" ? "#92400e" : "#166534";
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: bg,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: "700", color }}>
        {value || "—"}
      </Text>
    </View>
  );
};

// ─── Row component ────────────────────────────────────────────────────────────

type TicketRowProps = {
  ticket: ConcernTicket;
  index: number;
  assigneeOptions: { label: string; value: string; isMe?: boolean }[];
  onUpdateField: (
    ticketNumber: string,
    field: string,
    value: any,
  ) => Promise<void>;
  onOpenDetails: (ticket: ConcernTicket) => void;
};

const TicketRow = ({
  ticket,
  index,
  assigneeOptions,
  onUpdateField,
  onOpenDetails,
}: TicketRowProps) => {
  const { theme } = useTheme();
  const [lastTap, setLastTap] = useState(0);
  const [dueDate, setDueDate] = useState(formatTimestamp(ticket.dueDate));

  useEffect(() => {
    setDueDate(formatTimestamp(ticket.dueDate));
  }, [ticket.dueDate]);

  const handleSummaryPress = () => {
    const now = Date.now();
    if (now - lastTap < 300) onOpenDetails(ticket);
    setLastTap(now);
  };

  const getDateValue = () => {
    try {
      if (ticket.dueDate instanceof Date) return ticket.dueDate;
      if (
        typeof ticket.dueDate === "object" &&
        (ticket.dueDate as any)?.toDate
      ) {
        return (ticket.dueDate as any).toDate();
      }
      const d = new Date(ticket.dueDate as any);
      return !Number.isNaN(d.getTime()) ? d : new Date();
    } catch {
      return new Date();
    }
  };

  const handleDateConfirm = async (newDate: Date) => {
    setDueDate(newDate.toLocaleDateString());
    try {
      await onUpdateField(
        ticket.ticketNumber,
        "dueDate",
        newDate.toISOString().split("T")[0],
      );
    } catch (err) {
      console.error("Failed to update due date:", err);
    }
  };

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
        backgroundColor: index % 2 === 0 ? theme.background : theme.surface,
      }}
    >
      {/* Summary */}
      <View
        style={{
          flex: 2,
          minWidth: 180,
          paddingHorizontal: 12,
          paddingVertical: 10,
        }}
      >
        <TouchableOpacity onPress={handleSummaryPress} activeOpacity={0.7}>
          <Text
            style={{ fontSize: 12, fontWeight: "600", color: theme.text }}
            numberOfLines={2}
          >
            {ticket.summary}
          </Text>
          <Text style={{ fontSize: 10, color: theme.subtext, marginTop: 2 }}>
            {ticket.ticketNumber}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Requester — people picker */}
      <View
        style={{
          flex: 1.5,
          minWidth: 120,
          paddingHorizontal: 8,
          paddingVertical: 8,
        }}
      >
        <AssigneeDropdown
          value={
            ticket.requesterId ||
            assigneeOptions.find(
              (e) =>
                e.label.toLowerCase() ===
                (ticket.requesterName ?? "").toLowerCase(),
            )?.value ||
            ""
          }
          fallbackName={ticket.requesterName || undefined}
          options={assigneeOptions}
          placeholder="Requester"
          onSelect={async (val) => {
            const selected = assigneeOptions.find((e) => e.value === val);
            await onUpdateField(ticket.ticketNumber, "requesterId", val);
            await onUpdateField(
              ticket.ticketNumber,
              "requesterName",
              selected?.label ?? "",
            );
          }}
        />
      </View>

      {/* Assignee — people picker */}
      <View
        style={{
          flex: 1.5,
          minWidth: 120,
          paddingHorizontal: 8,
          paddingVertical: 8,
        }}
      >
        <AssigneeDropdown
          value={ticket.assigneeId}
          options={assigneeOptions}
          placeholder="Unassigned"
          onSelect={async (val) => {
            const selected = assigneeOptions.find((e) => e.value === val);
            await onUpdateField(ticket.ticketNumber, "assigneeId", val);
            await onUpdateField(
              ticket.ticketNumber,
              "assigneeName",
              selected?.label ?? "",
            );
          }}
        />
      </View>

      {/* Category */}
      <View
        style={{
          flex: 1.5,
          minWidth: 130,
          paddingHorizontal: 12,
          paddingVertical: 10,
        }}
      >
        <InlineDropdown
          value={ticket.category}
          options={CATEGORY_OPTIONS}
          onSelect={async (val: string) =>
            onUpdateField(ticket.ticketNumber, "category", val)
          }
        />
      </View>

      {/* Priority */}
      <View
        style={{
          flex: 1,
          minWidth: 90,
          paddingHorizontal: 12,
          paddingVertical: 10,
        }}
      >
        <InlineDropdown
          value={ticket.priority}
          options={PRIORITY_OPTIONS}
          onSelect={async (val: string) =>
            onUpdateField(ticket.ticketNumber, "priority", val)
          }
          renderBadge={renderPriorityBadge}
        />
      </View>

      {/* Status */}
      <View
        style={{
          flex: 1.2,
          minWidth: 110,
          paddingHorizontal: 12,
          paddingVertical: 10,
        }}
      >
        <InlineDropdown
          value={ticket.status}
          options={STATUS_OPTIONS}
          onSelect={async (val: string) =>
            onUpdateField(ticket.ticketNumber, "status", val)
          }
          renderBadge={renderStatusBadge}
        />
      </View>

      {/* Due Date */}
      <View
        style={{
          flex: 1.2,
          minWidth: 110,
          paddingHorizontal: 12,
          paddingVertical: 10,
        }}
      >
        <InlineDatePicker
          value={dueDate}
          initialDate={getDateValue()}
          onConfirm={handleDateConfirm}
        />
      </View>
    </View>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TicketsPage() {
  const { theme } = useTheme();
  const [tickets, setTickets] = useState<ConcernTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingTicket, setEditingTicket] = useState<ConcernTicket | null>(
    null,
  );
  const { employees, currentUserId } = useEmployees();

  const loadTickets = async () => {
    setLoading(true);
    try {
      const result = await getAllTickets();
      setTickets(result);
    } catch (err) {
      console.error("Unable to load tickets", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets().catch((err) => console.error("Error loading tickets:", err));
  }, []);

  const filteredTickets = search.trim()
    ? tickets.filter((ticket) =>
        [
          ticket.summary,
          ticket.details || "",
          ticket.requesterName,
          ticket.assigneeName,
          ticket.category,
          ticket.priority,
          ticket.status,
        ]
          .join(" ")
          .toLowerCase()
          .includes(search.trim().toLowerCase()),
      )
    : tickets;

  const handleUpdateField = async (
    ticketNumber: string,
    field: string,
    value: any,
  ) => {
    try {
      await updateTicketField(ticketNumber, field, value);
      await loadTickets();
    } catch (err) {
      console.error(
        `Unable to update ${field} for ticket ${ticketNumber}:`,
        err,
      );
    }
  };

  const openEditModal = (ticket: ConcernTicket) => {
    setEditingTicket(ticket);
    setEditModalVisible(true);
  };

  const handleSaveEditedTicket = async (
    ticketNumber: string,
    updates: {
      summary: string;
      details: string;
      category: string;
      priority: string;
      status: string;
      assigneeId: string;
      assigneeName: string;
      dueDate: string;
    },
  ) => {
    try {
      const due = new Date(updates.dueDate);
      await Promise.all([
        updateTicketField(ticketNumber, "summary", updates.summary.trim()),
        updateTicketField(ticketNumber, "details", updates.details.trim()),
        updateTicketField(ticketNumber, "category", updates.category),
        updateTicketField(ticketNumber, "priority", updates.priority),
        updateTicketField(ticketNumber, "status", updates.status),
        updateTicketField(ticketNumber, "assigneeId", updates.assigneeId),
        updateTicketField(ticketNumber, "assigneeName", updates.assigneeName),
        updateTicketField(ticketNumber, "dueDate", due),
      ]);
      await loadTickets();
    } catch (err) {
      console.error("Unable to save ticket details:", err);
      throw err;
    }
  };

  // Full name + isMe flag for the people picker
  const assigneeOptions = employees.map((e: EmployeeOption) => ({
    label: e.name,
    value: e.id,
    isMe: e.id === currentUserId,
  }));

  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: theme.background }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <View>
          <Text style={{ fontSize: 20, fontWeight: "700", color: theme.text }}>
            Concern Tickets
          </Text>
          <Text style={{ fontSize: 12, color: theme.subtext, marginTop: 2 }}>
            {filteredTickets.length} of {tickets.length} tickets
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          style={{
            backgroundColor: theme.iconActive,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>
            + Add Ticket
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <TextInput
        placeholder="Search tickets..."
        placeholderTextColor={theme.subtext}
        value={search}
        onChangeText={setSearch}
        style={{
          width: "100%",
          paddingHorizontal: 16,
          paddingVertical: 10,
          marginBottom: 16,
          fontSize: 13,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 8,
          backgroundColor: theme.surface,
          color: theme.text,
        }}
      />

      {/* Table */}
      {loading ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator size="large" color={theme.iconActive} />
        </View>
      ) : filteredTickets.length === 0 ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 80,
          }}
        >
          <Text style={{ color: theme.subtext, fontSize: 13 }}>
            No tickets found.
          </Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, minWidth: "100%" }}
        >
          <View
            style={{
              flex: 1,
              minWidth: "100%",
              borderRadius: 10,
              borderWidth: 1,
              borderColor: theme.border,
              overflow: "hidden",
            }}
          >
            {/* Header row */}
            <View
              style={{
                flexDirection: "row",
                backgroundColor: theme.surface,
                borderBottomWidth: 1,
                borderBottomColor: theme.border,
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
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "600",
                      color: theme.subtext,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    {col.label}
                  </Text>
                </View>
              ))}
            </View>

            {/* Rows */}
            <ScrollView showsVerticalScrollIndicator={true}>
              {filteredTickets.map((ticket, index) => {
                try {
                  return (
                    <TicketRow
                      key={ticket.ticketNumber}
                      ticket={ticket}
                      index={index}
                      assigneeOptions={assigneeOptions}
                      onUpdateField={handleUpdateField}
                      onOpenDetails={openEditModal}
                    />
                  );
                } catch (err) {
                  console.error("Error rendering ticket row:", err, ticket);
                  return (
                    <View
                      key={ticket.ticketNumber}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        borderBottomWidth: 1,
                        borderBottomColor: theme.border,
                      }}
                    >
                      <Text style={{ color: "#dc2626", fontSize: 12 }}>
                        Error rendering ticket
                      </Text>
                    </View>
                  );
                }
              })}
            </ScrollView>
          </View>
        </ScrollView>
      )}

      <AddAssetModal
        visible={modalVisible}
        assigneeOptions={assigneeOptions}
        onClose={() => setModalVisible(false)}
        onSuccess={loadTickets}
      />

      <EditAssetModal
        visible={editModalVisible}
        selectedTicket={editingTicket}
        assigneeOptions={assigneeOptions}
        onClose={() => setEditModalVisible(false)}
        onSave={async (ticketNumber, updates) => {
          await handleSaveEditedTicket(ticketNumber, updates);
          setEditModalVisible(false);
        }}
      />
    </View>
  );
}
