import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useEmployees, EmployeeOption } from "../../../../hooks/useEmployees";
import { ConcernTicket, Column } from "../../../../types";
import {
  getAllTickets,
  updateTicketField,
} from "../../../../Services/ticketService";
import InlineDropdown from "../../../../components/common/InlineDropdown";
import InlineDatePicker from "../../../../components/common/InlineDatePicker";
import DataTable from "../../../../components/common/DataTable";
import EditAssetModal from "./EditAssetModal";
import AddAssetModal from "./AddAssetModal";

const CATEGORY_OPTIONS = [
  { label: "CCTV", value: "CCTV", color: "bg-blue-600" },
  { label: "Licenses Accounts", value: "Licenses Accounts", color: "bg-violet-600" },
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


function formatTimestamp(value: any) {
  if (value && typeof value.toDate === "function") {
    return value.toDate().toLocaleDateString();
  }
  if (value instanceof Date) {
    return value.toLocaleDateString();
  }
  return String(value || "-");
}

function formatDateForInput(value: any) {
  if (value && typeof value.toDate === "function") {
    return value.toDate().toISOString().split("T")[0];
  }
  if (value instanceof Date) {
    return value.toISOString().split("T")[0];
  }
  const date = new Date(value as any);
  return !Number.isNaN(date.getTime()) ? date.toISOString().split("T")[0] : "";
}

type TicketRowProps = {
  ticket: ConcernTicket;
  assigneeOptions: readonly { label: string; value: string }[];
  employeeOptions: readonly { label: string; value: string }[];
  onUpdateField: (ticketNumber: string, field: string, value: any) => Promise<void>;
  onOpenDetails: (ticket: ConcernTicket) => void;
};

const TicketRow = ({ ticket, assigneeOptions, employeeOptions, onUpdateField, onOpenDetails }: TicketRowProps) => {
  const [lastSummaryTap, setLastSummaryTap] = useState(0);

  const handleSummaryPress = () => {
    const now = Date.now();
    if (now - lastSummaryTap < 300) {
      onOpenDetails(ticket);
    }
    setLastSummaryTap(now);
  };
  const getDateValue = () => {
    try {
      if (ticket.dueDate instanceof Date) {
        return ticket.dueDate;
      }
      if (typeof ticket.dueDate === "object" && ticket.dueDate?.toDate) {
        return ticket.dueDate.toDate();
      }
      const date = new Date(ticket.dueDate as any);
      return !Number.isNaN(date.getTime()) ? date : new Date();
    } catch {
      return new Date();
    }
  };

  const [dueDate, setDueDate] = useState(formatTimestamp(ticket.dueDate));

  useEffect(() => {
    setDueDate(formatTimestamp(ticket.dueDate));
  }, [ticket.dueDate]);

  const handleDateConfirm = async (newDate: Date) => {
    const formattedDate = newDate.toLocaleDateString();
    setDueDate(formattedDate);
    try {
      await onUpdateField(ticket.ticketNumber, "dueDate", newDate.toISOString().split("T")[0]);
    } catch (err) {
      console.error("Failed to update due date:", err);
    }
  };

  return (
    <View className="flex-row items-center border-b border-slate-200 px-4 py-3">
      <View className="flex-1 min-w-[150px] pr-2">
        <TouchableOpacity onPress={handleSummaryPress} activeOpacity={0.7}>
          <Text className="text-slate-900 font-semibold text-xs" numberOfLines={2}>{ticket.summary}</Text>
          <Text className="text-slate-500 text-[10px] mt-0.5">Double tap to edit</Text>
        </TouchableOpacity>
        <Text className="text-slate-500 text-xs mt-0.5">{ticket.ticketNumber}</Text>
      </View>

      <View className="flex-1 min-w-[100px] pr-2">
        <Text className="text-slate-600 text-xs mb-1">Requester</Text>
        <InlineDropdown
          value={ticket.requesterName || "Unknown"}
          options={employeeOptions}
          onSelect={async (val: string) => {
            const selected = employeeOptions.find((item) => item.value === val);
            await onUpdateField(ticket.ticketNumber, "requesterId", val);
            await onUpdateField(ticket.ticketNumber, "requesterName", selected?.label ?? "");
          }}
        />
      </View>

      <View className="flex-1 min-w-[100px] pr-2">
        <Text className="text-slate-600 text-xs mb-1">Assignee</Text>
        <InlineDropdown
          value={ticket.assigneeName || "Unassigned"}
          options={[{ label: "Unassigned", value: "" }, ...assigneeOptions]}
          onSelect={async (val: string) => {
            const selected = assigneeOptions.find((item) => item.value === val);
            await onUpdateField(ticket.ticketNumber, "assigneeId", val);
            await onUpdateField(ticket.ticketNumber, "assigneeName", selected?.label ?? "");
          }}
        />
      </View>

      <View className="flex-1 min-w-[80px] pr-2">
        <Text className="text-slate-600 text-xs mb-1">Category</Text>
        <InlineDropdown
          value={ticket.category}
          options={CATEGORY_OPTIONS}
          onSelect={async (val: string) => onUpdateField(ticket.ticketNumber, "category", val)}
        />
      </View>

      <View className="flex-1 min-w-[70px] pr-2">
        <Text className="text-slate-600 text-xs mb-1">Priority</Text>
        <InlineDropdown
          value={ticket.priority}
          options={PRIORITY_OPTIONS}
          onSelect={async (val: string) => onUpdateField(ticket.ticketNumber, "priority", val)}
        />
      </View>

      <View className="flex-1 min-w-[80px] pr-2">
        <Text className="text-slate-600 text-xs mb-1">Status</Text>
        <InlineDropdown
          value={ticket.status}
          options={STATUS_OPTIONS}
          onSelect={async (val: string) => onUpdateField(ticket.ticketNumber, "status", val)}
          renderBadge={(value: string) => (
            <View className={`px-2 py-1 rounded-full ${value === "Resolved" ? "bg-emerald-100" : value === "In Progress" ? "bg-blue-100" : "bg-yellow-100"}`}>
              <Text className={`text-xs ${value === "Resolved" ? "text-emerald-700" : value === "In Progress" ? "text-blue-700" : "text-yellow-800"}`}>{value}</Text>
            </View>
          )}
        />
      </View>

      <View className="flex-1 min-w-[90px]">
        <Text className="text-slate-600 text-xs mb-1">Due</Text>
        <InlineDatePicker
          value={dueDate}
          initialDate={getDateValue()}
          onConfirm={handleDateConfirm}
        />
      </View>
    </View>
  );
};

export default function TicketsPage() {
  const [tickets, setTickets] = useState<ConcernTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingTicket, setEditingTicket] = useState<ConcernTicket | null>(null);
  type CategoryValue = (typeof CATEGORY_OPTIONS)[number]["value"];
  type PriorityValue = (typeof PRIORITY_OPTIONS)[number]["value"];
  type StatusValue = (typeof STATUS_OPTIONS)[number]["value"];
  const { employees, loading: employeesLoading } = useEmployees();

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
        [ticket.summary, ticket.details || "", ticket.requesterName, ticket.assigneeName, ticket.category, ticket.priority, ticket.status]
          .join(" ")
          .toLowerCase()
          .includes(search.trim().toLowerCase())
      )
    : tickets;


  const handleUpdateField = async (ticketNumber: string, field: string, value: any) => {
    try {
      await updateTicketField(ticketNumber, field, value);
      await loadTickets();
    } catch (err) {
      console.error(`Unable to update ${field} for ticket ${ticketNumber}:`, err);
    }
  };

  const openEditModal = (ticket: ConcernTicket) => {
    setEditingTicket(ticket);
    setEditModalVisible(true);
  };

  const handleSaveEditedTicket = async (ticketNumber: string, updates: {
    summary: string;
    details: string;
    category: string;
    priority: string;
    status: string;
    assigneeId: string;
    assigneeName: string;
    dueDate: string;
  }) => {
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

  const assigneeOptions = employees.map((employee: EmployeeOption) => ({
    label: employee.name,
    value: employee.id,
  }));

  const employeeOptions = employees.map((employee: EmployeeOption) => ({
    label: employee.name,
    value: employee.id,
  }));

  const handleDeleteTicket = (_id: string) => {
    // DataTable currently includes an actions column by default.
    // Ticket deletion is not supported from this page today.
  };

  const ticketTableColumns: Column<ConcernTicket>[] = [
    {
      key: "summary",
      label: "Summary",
      render: (row) => (
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => openEditModal(row)}
            className="text-slate-900 font-semibold text-xs text-left"
          >
            {row.summary}
          </button>
          <span className="text-slate-500 text-[10px]">{row.ticketNumber}</span>
        </div>
      ),
    },
    {
      key: "requesterName",
      label: "Requester",
      render: (row) => (
        <InlineDropdown
          value={row.requesterName || "Unknown"}
          options={employeeOptions}
          onSelect={async (val: string) => {
            const selected = employeeOptions.find((item) => item.value === val);
            await handleUpdateField(row.ticketNumber, "requesterId", val);
            await handleUpdateField(row.ticketNumber, "requesterName", selected?.label ?? "");
          }}
        />
      ),
    },
    {
      key: "assigneeName",
      label: "Assignee",
      render: (row) => (
        <InlineDropdown
          value={row.assigneeName || "Unassigned"}
          options={[{ label: "Unassigned", value: "" }, ...assigneeOptions]}
          onSelect={async (val: string) => {
            const selected = assigneeOptions.find((item) => item.value === val);
            await handleUpdateField(row.ticketNumber, "assigneeId", val);
            await handleUpdateField(row.ticketNumber, "assigneeName", selected?.label ?? "");
          }}
        />
      ),
    },
    {
      key: "category",
      label: "Category",
      render: (row) => (
        <InlineDropdown
          value={row.category}
          options={CATEGORY_OPTIONS}
          onSelect={async (val: string) => handleUpdateField(row.ticketNumber, "category", val)}
        />
      ),
    },
    {
      key: "priority",
      label: "Priority",
      render: (row) => (
        <InlineDropdown
          value={row.priority}
          options={PRIORITY_OPTIONS}
          onSelect={async (val: string) => handleUpdateField(row.ticketNumber, "priority", val)}
        />
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <InlineDropdown
          value={row.status}
          options={STATUS_OPTIONS}
          onSelect={async (val: string) => handleUpdateField(row.ticketNumber, "status", val)}
          renderBadge={(value: string) => (
            <div className={`px-2 py-1 rounded-full ${
              value === "Resolved"
                ? "bg-emerald-100"
                : value === "In Progress"
                ? "bg-blue-100"
                : "bg-yellow-100"
            }`}
            >
              <span className={`text-xs ${
                value === "Resolved"
                  ? "text-emerald-700"
                  : value === "In Progress"
                  ? "text-blue-700"
                  : "text-yellow-800"
              }`}
              >
                {value}
              </span>
            </div>
          )}
        />
      ),
    },
    {
      key: "dueDate",
      label: "Due",
      render: (row) => {
        const initialDue = row.dueDate && typeof (row.dueDate as any).toDate === "function"
          ? (row.dueDate as any).toDate()
          : (row.dueDate as any);

        return (
          <InlineDatePicker
            value={formatTimestamp(row.dueDate)}
            initialDate={new Date(initialDue)}
            onConfirm={async (newDate: Date) => {
              await handleUpdateField(row.ticketNumber, "dueDate", newDate.toISOString().split("T")[0]);
            }}
          />
        );
      },
    },
  ];

  return (
    <View className="flex-1 p-4 bg-slate-100" style={{ minHeight: "100%" }}>
      <View className="flex-row items-center justify-between mb-4">
        <View>
          <Text className="text-xl font-bold text-slate-900">Concern Tickets</Text>
          <Text className="text-sm text-slate-500">Monitor employee-submitted tickets and create new concerns.</Text>
        </View>
        <TouchableOpacity
          className="bg-blue-600 px-4 py-2 rounded-2xl"
          onPress={() => setModalVisible(true)}
        >
          <Text className="text-white font-semibold">+ Add Ticket</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        className="bg-white rounded-3xl px-4 py-3 mb-4 border border-slate-200"
        placeholder="Search tickets..."
        placeholderTextColor="#94a3b8"
        value={search}
        onChangeText={setSearch}
      />

      {loading ? (
        <View className="flex-1 items-center justify-center mt-16">
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : filteredTickets.length === 0 ? (
        <View className="rounded-3xl bg-white p-6 items-center mt-8">
          <Text className="text-slate-600">No tickets found.</Text>
        </View>
      ) : Platform.OS === "web" ? (
        <DataTable
          columns={ticketTableColumns}
          data={filteredTickets}
          loading={loading}
          onEdit={openEditModal}
          onDelete={handleDeleteTicket}
          showActions={false}
        />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="bg-white rounded-3xl overflow-hidden">
            <View className="flex-row items-center bg-slate-200 px-4 py-3 border-b border-slate-300">
              <Text className="flex-1 min-w-[150px] text-slate-600 text-xs font-semibold">Summary</Text>
              <Text className="flex-1 min-w-[100px] text-slate-600 text-xs font-semibold">Requester</Text>
              <Text className="flex-1 min-w-[100px] text-slate-600 text-xs font-semibold">Assignee</Text>
              <Text className="flex-1 min-w-[80px] text-slate-600 text-xs font-semibold">Category</Text>
              <Text className="flex-1 min-w-[70px] text-slate-600 text-xs font-semibold">Priority</Text>
              <Text className="flex-1 min-w-[80px] text-slate-600 text-xs font-semibold">Status</Text>
              <Text className="flex-1 min-w-[90px] text-slate-600 text-xs font-semibold">Due</Text>
            </View>

            {filteredTickets.map((ticket) => {
              try {
                return (
                  <TicketRow
                    key={ticket.ticketNumber}
                    ticket={ticket}
                    assigneeOptions={assigneeOptions}
                    employeeOptions={employeeOptions}
                    onUpdateField={handleUpdateField}
                    onOpenDetails={openEditModal}
                  />
                );
              } catch (err) {
                console.error("Error rendering ticket row:", err, ticket);
                return (
                  <View key={ticket.ticketNumber} className="px-4 py-3 border-b border-slate-200">
                    <Text className="text-red-600 text-xs">Error rendering ticket</Text>
                  </View>
                );
              }
            })}
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
