import { useEffect, useState } from "react";
import {
  View,
  Text,
  Platform,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  useWindowDimensions,
} from "react-native";
import { ADUser, ConcernTicket } from "../../types";
import { clearUserSession, logout } from "../auth/Logout";
import Sidebar from "../../components/Navigations/Sidebar";
import BottomNavBar from "../../components/Navigations/BottmNavBar";
import {
  addTicket,
  getTicketsByRequester,
} from "../../Services/ticketService";

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

function formatTimestamp(value: any) {
  if (value && typeof value.toDate === "function") {
    return value.toDate().toLocaleDateString();
  }
  if (value instanceof Date) {
    return value.toLocaleDateString();
  }
  return String(value || "-");
}

function parseDueDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const iso = trimmed.includes("-") ? trimmed : trimmed.replace(/\//g, "-");
  const parsed = new Date(iso);
  if (!Number.isNaN(parsed.getTime())) return parsed;

  const legacy = new Date(trimmed.replace(/-/g, "/"));
  if (!Number.isNaN(legacy.getTime())) return legacy;

  return null;
}

type Props = {
  user: ADUser;
  onLogout: () => void;
};

export default function EmployeeDashboard({ user, onLogout }: Props) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "tickets">("dashboard");
  const [tickets, setTickets] = useState<ConcernTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [addVisible, setAddVisible] = useState(false);
  const { width } = useWindowDimensions();
  const isMobile = Platform.OS === "android" || Platform.OS === "ios" || width < 768;
  type CategoryValue = (typeof CATEGORY_OPTIONS)[number];
  type PriorityValue = (typeof PRIORITY_OPTIONS)[number];

  const [summary, setSummary] = useState("");
  const [details, setDetails] = useState("");
  const [category, setCategory] = useState<CategoryValue>("Software");
  const [priority, setPriority] = useState<PriorityValue>("Medium");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const result = await getTicketsByRequester(user.username);
      setTickets(result);
    } catch (err) {
      console.error("Failed to load tickets", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleLogout = async () => {
    const confirmed = await logout();
    if (confirmed) {
      onLogout();
    }
  };

  const handleSidebarLogout = async () => {
    await clearUserSession();
    onLogout();
  };

  const renderContent = () => (
    <View className="p-6">
      <View className="bg-slate-800 rounded-2xl p-5 mb-4">
        <Text className="text-white text-2xl font-bold">
          Welcome, {user.displayName.split(" ")[0]}! 👋
        </Text>
        <Text className="text-slate-400 text-sm mt-1">
          Submit an IT concern ticket for faster resolution.
        </Text>
      </View>

      <View className="flex-row gap-3 mb-4">
        {[
          { key: "dashboard", label: "Dashboard" },
          { key: "tickets", label: "My Tickets" },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key as "dashboard" | "tickets")}
            className={`flex-1 rounded-2xl px-4 py-3 ${activeTab === tab.key ? "bg-blue-600" : "bg-slate-700"}`}
          >
            <Text className={`text-center text-sm font-semibold ${activeTab === tab.key ? "text-white" : "text-slate-300"}`}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === "dashboard" ? (
        <View className="space-y-4">
          <View className="bg-slate-800 rounded-3xl p-5">
            <Text className="text-slate-100 text-lg font-semibold mb-2">Create a new concern ticket</Text>
            <Text className="text-slate-400 text-sm mb-4">
              Use the form below to submit an issue, and the IT admin will be able to see it immediately.
            </Text>
            <TouchableOpacity
              className="bg-blue-600 rounded-2xl px-4 py-3 items-center"
              onPress={() => setAddVisible(true)}
            >
              <Text className="text-white font-semibold">Submit a Ticket</Text>
            </TouchableOpacity>
          </View>

          <View className="bg-slate-800 rounded-3xl p-5">
            <Text className="text-slate-100 text-lg font-semibold mb-2">Latest ticket activity</Text>
            <Text className="text-slate-400 text-sm">
              You can review the tickets you submitted below.
            </Text>
          </View>
        </View>
      ) : (
        <View>
          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text className="text-white text-xl font-bold">My Tickets</Text>
              <Text className="text-slate-400 text-sm">{tickets.length} tickets submitted</Text>
            </View>
            <TouchableOpacity
              className="bg-blue-600 rounded-2xl px-4 py-3"
              onPress={() => setAddVisible(true)}
            >
              <Text className="text-white font-semibold">Add Ticket</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View className="h-72 items-center justify-center">
              <ActivityIndicator size="large" color="#3b82f6" />
            </View>
          ) : tickets.length === 0 ? (
            <View className="rounded-3xl bg-slate-800 p-6 items-center">
              <Text className="text-slate-200 font-semibold mb-2">No tickets yet</Text>
              <Text className="text-slate-400 text-sm text-center">
                Submit your first concern ticket and it will show up here.
              </Text>
            </View>
          ) : (
            <View className="space-y-3">
              {tickets.map((ticket) => (
                <View key={ticket.ticketNumber} className="rounded-3xl bg-slate-800 p-4">
                  <Text className="text-white font-semibold text-base mb-1">{ticket.summary}</Text>
                  <Text className="text-slate-400 text-sm mb-2">{ticket.details}</Text>
                  <View className="flex-row flex-wrap gap-2">
                    <Text className="text-slate-300 text-xs bg-slate-700 px-2 py-1 rounded-full">Category: {ticket.category}</Text>
                    <Text className="text-slate-300 text-xs bg-slate-700 px-2 py-1 rounded-full">Priority: {ticket.priority}</Text>
                    <Text className="text-slate-300 text-xs bg-slate-700 px-2 py-1 rounded-full">Status: {ticket.status}</Text>
                    <Text className="text-slate-300 text-xs bg-slate-700 px-2 py-1 rounded-full">Due: {formatTimestamp(ticket.dueDate)}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      <TouchableOpacity
        className="bg-slate-700 rounded-xl py-3 items-center mt-6"
        onPress={handleLogout}
      >
        <Text className="text-slate-200 text-sm font-semibold">Log out</Text>
      </TouchableOpacity>
    </View>
  );

  const handleSubmitTicket = async () => {
    setError("");
    if (!summary.trim()) {
      setError("Please enter a short summary for the ticket.");
      return;
    }
    if (!details.trim()) {
      setError("Please enter details for your concern.");
      return;
    }
    if (!dueDate.trim()) {
      setError("Please enter a due date (YYYY-MM-DD).");
      return;
    }

    const due = parseDueDate(dueDate);
    if (!due) {
      setError("Please enter a valid due date like YYYY-MM-DD or MM/DD/YYYY.");
      return;
    }

    setSaving(true);

    try {
      await addTicket({
        ticketNumber: `CT-${Date.now()}`,
        summary: summary.trim(),
        details: details.trim(),
        requesterId: user.username,
        requesterName: user.username,
        assigneeId: "",
        assigneeName: "",
        category,
        priority,
        status: "Pending",
        dueDate: due,
      });

      setAddVisible(false);
      setSummary("");
      setDetails("");
      setCategory("Software");
      setPriority("Medium");
      setDueDate("");
      await loadTickets();
    } catch (err: any) {
      console.error("Ticket submit error:", err);
      setError(err?.message ? `Unable to submit ticket: ${err.message}` : "Unable to submit ticket. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, flexDirection: "row" }}>
        {!isMobile && (
          <Sidebar
            user={user}
            activeKey={activeTab}
            onNavigate={(key) => setActiveTab(key as "dashboard" | "tickets")}
            onLogout={handleSidebarLogout}
          />
        )}

        <View style={{ flex: 1, flexDirection: "column", backgroundColor: "#0f172a" }}>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
            {renderContent()}
          </ScrollView>

          {isMobile && (
            <BottomNavBar
              user={user}
              activeKey={activeTab}
              onNavigate={(key) => setActiveTab(key as "dashboard" | "tickets")}
            />
          )}
        </View>
      </View>

      <Modal visible={addVisible} animationType="slide" transparent>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-slate-950 rounded-t-3xl p-6 max-h-[85%]">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-white text-lg font-semibold">Submit IT Concern</Text>
              <TouchableOpacity onPress={() => setAddVisible(false)}>
                <Text className="text-slate-400">Cancel</Text>
              </TouchableOpacity>
            </View>

            <ScrollView className="space-y-4">
              <View>
                <Text className="text-slate-300 text-sm mb-1">Summary</Text>
                <TextInput
                  className="bg-slate-800 rounded-2xl px-4 py-3 text-white"
                  placeholder="Short summary of the concern"
                  placeholderTextColor="#94a3b8"
                  value={summary}
                  onChangeText={setSummary}
                />
              </View>

              <View>
                <Text className="text-slate-300 text-sm mb-1">Details</Text>
                <TextInput
                  className="bg-slate-800 rounded-2xl px-4 py-3 text-white h-28"
                  placeholder="Describe the issue in more detail"
                  placeholderTextColor="#94a3b8"
                  multiline
                  value={details}
                  onChangeText={setDetails}
                />
              </View>

              <View>
                <Text className="text-slate-300 text-sm mb-1">Category</Text>
                <View className="bg-slate-800 rounded-2xl px-4 py-3">
                  {CATEGORY_OPTIONS.map((item) => (
                    <TouchableOpacity
                      key={item}
                      onPress={() => setCategory(item)}
                      className={`rounded-2xl px-3 py-2 mb-2 ${category === item ? "bg-blue-600" : "bg-slate-900"}`}
                    >
                      <Text className={`${category === item ? "text-white" : "text-slate-300"}`}>{item}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View>
                <Text className="text-slate-300 text-sm mb-1">Priority</Text>
                <View className="flex-row gap-2">
                  {PRIORITY_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      onPress={() => setPriority(opt)}
                      className={`flex-1 rounded-2xl px-4 py-3 ${priority === opt ? "bg-blue-600" : "bg-slate-800"}`}
                    >
                      <Text className={`${priority === opt ? "text-white" : "text-slate-300"}`}>{opt}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View>
                <Text className="text-slate-300 text-sm mb-1">Due Date</Text>
                <TextInput
                  className="bg-slate-800 rounded-2xl px-4 py-3 text-white"
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#94a3b8"
                  value={dueDate}
                  onChangeText={setDueDate}
                />
              </View>

              {error ? <Text className="text-rose-400 text-sm">{error}</Text> : null}

              <TouchableOpacity
                onPress={handleSubmitTicket}
                className="bg-blue-600 rounded-2xl px-4 py-3 items-center"
                disabled={saving}
              >
                <Text className="text-white font-semibold">{saving ? "Submitting…" : "Submit Ticket"}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
