import { useEffect, useState, useMemo } from "react";
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
import { getNavItemsForUser } from "../../components/Navigations/NavItems";
import {
  addTicket,
  getTicketsByRequester,
} from "../../Services/ticketService";
import { useTheme } from "../../theme/ThemeContext";

// ─── Shared page imports (same ones used in AdminDashboard) ──────────────────
import ITInventoryPage from "../Admin/Modules/ITInventory/ITInventoryPage";
import ConsumablesPage from "../Admin/Modules/Consumables/ConsumablesPage";
import TicketsPage from "../Admin/Modules/Tickets/TicketsPage";

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
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const isMobile =
    Platform.OS === "android" || Platform.OS === "ios" || width < 768;

  // Derive nav items for this employee (respects their permissions)
  const navItems = useMemo(() => getNavItemsForUser(user), [user]);
  const defaultKey = navItems[0]?.key ?? "dashboard";
  const [activeKey, setActiveKey] = useState(defaultKey);

  // Dashboard-specific state
  const [tickets, setTickets] = useState<ConcernTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [addVisible, setAddVisible] = useState(false);

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
    if (confirmed) onLogout();
  };

  const handleSidebarLogout = async () => {
    await clearUserSession();
    onLogout();
  };

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
      setError(
        err?.message
          ? `Unable to submit ticket: ${err.message}`
          : "Unable to submit ticket. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  // ─── Dashboard home page ────────────────────────────────────────────────────
  const renderDashboardHome = () => (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
      <View style={{ padding: 24 }}>
        {/* Welcome card */}
        <View
          style={{
            backgroundColor: theme.surface,
            borderRadius: 16,
            padding: 20,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <Text
            style={{
              fontFamily: "Outfit-Bold",
              fontSize: 22,
              color: theme.textActive,
            }}
          >
            Welcome, {user.displayName.split(" ")[0]}! 👋
          </Text>
          <Text
            style={{
              fontFamily: "Outfit",
              fontSize: 13,
              color: theme.subtext,
              marginTop: 4,
            }}
          >
            Submit an IT concern ticket for faster resolution.
          </Text>
        </View>

        {/* Quick actions */}
        <View
          style={{
            backgroundColor: theme.surface,
            borderRadius: 16,
            padding: 20,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <Text
            style={{
              fontFamily: "Outfit-SemiBold",
              fontSize: 16,
              color: theme.textActive,
              marginBottom: 8,
            }}
          >
            Create a new concern ticket
          </Text>
          <Text
            style={{
              fontFamily: "Outfit",
              fontSize: 13,
              color: theme.subtext,
              marginBottom: 16,
            }}
          >
            Use the form below to submit an issue, and the IT admin will be able
            to see it immediately.
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: theme.primary,
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
              alignItems: "center",
            }}
            onPress={() => setAddVisible(true)}
          >
            <Text
              style={{
                fontFamily: "Outfit-SemiBold",
                color: "#fff",
                fontSize: 14,
              }}
            >
              Submit a Ticket
            </Text>
          </TouchableOpacity>
        </View>

        {/* Recent tickets summary */}
        <View
          style={{
            backgroundColor: theme.surface,
            borderRadius: 16,
            padding: 20,
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <Text
            style={{
              fontFamily: "Outfit-SemiBold",
              fontSize: 16,
              color: theme.textActive,
              marginBottom: 8,
            }}
          >
            Latest ticket activity
          </Text>
          {loading ? (
            <ActivityIndicator color={theme.primary} />
          ) : tickets.length === 0 ? (
            <Text
              style={{
                fontFamily: "Outfit",
                fontSize: 13,
                color: theme.subtext,
              }}
            >
              No tickets submitted yet.
            </Text>
          ) : (
            tickets.slice(0, 3).map((ticket) => (
              <View
                key={ticket.ticketNumber}
                style={{
                  borderTopWidth: 1,
                  borderTopColor: theme.border,
                  paddingTop: 10,
                  marginTop: 10,
                }}
              >
                <Text
                  style={{
                    fontFamily: "Outfit-SemiBold",
                    fontSize: 14,
                    color: theme.textActive,
                  }}
                >
                  {ticket.summary}
                </Text>
                <Text
                  style={{
                    fontFamily: "Outfit",
                    fontSize: 12,
                    color: theme.subtext,
                    marginTop: 2,
                  }}
                >
                  {ticket.status} · {ticket.category}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={{
            backgroundColor: theme.surface,
            borderRadius: 12,
            paddingVertical: 12,
            alignItems: "center",
            marginTop: 24,
            borderWidth: 1,
            borderColor: theme.border,
          }}
          onPress={handleLogout}
        >
          <Text
            style={{
              fontFamily: "Outfit-SemiBold",
              fontSize: 13,
              color: theme.subtext,
            }}
          >
            Log out
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // ─── Page router — driven by navItems keys ──────────────────────────────────
  const renderPage = () => {
    switch (activeKey) {
      case "dashboard":
        return renderDashboardHome();

      case "tickets":
        // Employee sees TicketsPage scoped to their own tickets
        return (
          <TicketsPage
            isSuperAdmin={false}
            user={user}
          />
        );

      case "inventory":
        return (
          <ITInventoryPage
            isSuperAdmin={false}
          />
        );

      case "consumables":
        return (
          <ConsumablesPage
            isSuperAdmin={false}
          />
        );

      default:
        return renderDashboardHome();
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, flexDirection: "row" }}>
        {/* Sidebar — web only */}
        {!isMobile && (
          <Sidebar
            user={user}
            activeKey={activeKey}
            onNavigate={setActiveKey}
            onLogout={handleSidebarLogout}
          />
        )}

        {/* Main content */}
        <View
          style={{
            flex: 1,
            flexDirection: "column",
            backgroundColor: theme.background,
          }}
        >
          {renderPage()}

          {/* Bottom nav — mobile only */}
          {isMobile && (
            <BottomNavBar
              user={user}
              activeKey={activeKey}
              onNavigate={setActiveKey}
            />
          )}
        </View>
      </View>

      {/* Submit ticket modal */}
      <Modal visible={addVisible} animationType="slide" transparent>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: theme.surface,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              maxHeight: "85%",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <Text
                style={{
                  fontFamily: "Outfit-SemiBold",
                  fontSize: 17,
                  color: theme.textActive,
                }}
              >
                Submit IT Concern
              </Text>
              <TouchableOpacity onPress={() => setAddVisible(false)}>
                <Text
                  style={{ fontFamily: "Outfit", color: theme.subtext }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Summary */}
              <Text
                style={{
                  fontFamily: "Outfit",
                  fontSize: 13,
                  color: theme.subtext,
                  marginBottom: 4,
                }}
              >
                Summary
              </Text>
              <TextInput
                style={{
                  backgroundColor: theme.background,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  color: theme.textActive,
                  fontFamily: "Outfit",
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
                placeholder="Short summary of the concern"
                placeholderTextColor={theme.subtext}
                value={summary}
                onChangeText={setSummary}
              />

              {/* Details */}
              <Text
                style={{
                  fontFamily: "Outfit",
                  fontSize: 13,
                  color: theme.subtext,
                  marginBottom: 4,
                }}
              >
                Details
              </Text>
              <TextInput
                style={{
                  backgroundColor: theme.background,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  color: theme.textActive,
                  fontFamily: "Outfit",
                  height: 100,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
                placeholder="Describe the issue in more detail"
                placeholderTextColor={theme.subtext}
                multiline
                value={details}
                onChangeText={setDetails}
              />

              {/* Category */}
              <Text
                style={{
                  fontFamily: "Outfit",
                  fontSize: 13,
                  color: theme.subtext,
                  marginBottom: 4,
                }}
              >
                Category
              </Text>
              <View
                style={{
                  backgroundColor: theme.background,
                  borderRadius: 12,
                  padding: 10,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                {CATEGORY_OPTIONS.map((item) => (
                  <TouchableOpacity
                    key={item}
                    onPress={() => setCategory(item)}
                    style={{
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      marginBottom: 4,
                      backgroundColor:
                        category === item ? theme.primary : "transparent",
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Outfit",
                        color:
                          category === item ? "#fff" : theme.textInactive,
                        fontSize: 13,
                      }}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Priority */}
              <Text
                style={{
                  fontFamily: "Outfit",
                  fontSize: 13,
                  color: theme.subtext,
                  marginBottom: 4,
                }}
              >
                Priority
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                {PRIORITY_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    onPress={() => setPriority(opt)}
                    style={{
                      flex: 1,
                      borderRadius: 10,
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      alignItems: "center",
                      backgroundColor:
                        priority === opt ? theme.primary : theme.background,
                      borderWidth: 1,
                      borderColor:
                        priority === opt ? theme.primary : theme.border,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Outfit",
                        color: priority === opt ? "#fff" : theme.textInactive,
                        fontSize: 13,
                      }}
                    >
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Due date */}
              <Text
                style={{
                  fontFamily: "Outfit",
                  fontSize: 13,
                  color: theme.subtext,
                  marginBottom: 4,
                }}
              >
                Due Date
              </Text>
              <TextInput
                style={{
                  backgroundColor: theme.background,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  color: theme.textActive,
                  fontFamily: "Outfit",
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.subtext}
                value={dueDate}
                onChangeText={setDueDate}
              />

              {error ? (
                <Text
                  style={{
                    fontFamily: "Outfit",
                    color: "#f87171",
                    fontSize: 13,
                    marginBottom: 8,
                  }}
                >
                  {error}
                </Text>
              ) : null}

              <TouchableOpacity
                onPress={handleSubmitTicket}
                disabled={saving}
                style={{
                  backgroundColor: theme.primary,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  alignItems: "center",
                  marginBottom: 16,
                  opacity: saving ? 0.6 : 1,
                }}
              >
                <Text
                  style={{
                    fontFamily: "Outfit-SemiBold",
                    color: "#fff",
                    fontSize: 14,
                  }}
                >
                  {saving ? "Submitting…" : "Submit Ticket"}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
