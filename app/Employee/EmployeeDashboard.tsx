import { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  Platform,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { ADUser, ConcernTicket } from "../../types";
import { clearUserSession, logout } from "../auth/Logout";
import Sidebar from "../../components/Navigations/Sidebar";
import BottomNavBar from "../../components/Navigations/BottmNavBar";
import { getNavItemsForUser } from "../../components/Navigations/NavItems";
import { getTicketsByRequester } from "../../Services/ticketService";
import { useTheme } from "../../theme/ThemeContext";

// ─── Shared page imports ─────────────────────────────────────────────────────
import ITInventoryPage from "../Admin/Modules/ITInventory/ITInventoryPage";
import ConsumablesPage from "../Admin/Modules/Consumables/ConsumablesPage";
import TicketsPage from "../Admin/Modules/Tickets/TicketsPage";
import SubmitTicketPage from "./SubmitTicketPage";

function formatTimestamp(value: any) {
  if (value && typeof value.toDate === "function") {
    return value.toDate().toLocaleDateString();
  }
  if (value instanceof Date) {
    return value.toLocaleDateString();
  }
  return String(value || "-");
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

  const navItems = useMemo(() => getNavItemsForUser(user), [user]);
  const defaultKey = navItems[0]?.key ?? "dashboard";
  const [activeKey, setActiveKey] = useState(defaultKey);

  const [tickets, setTickets] = useState<ConcernTicket[]>([]);
  const [loading, setLoading] = useState(true);

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

  // ─── Dashboard home ─────────────────────────────────────────────────────────
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
            onPress={() => setActiveKey("submitticket")}
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

  // ─── Page router ────────────────────────────────────────────────────────────
  const renderPage = () => {
    switch (activeKey) {
      case "dashboard":
        return renderDashboardHome();

      case "submitticket":
        return (
          <SubmitTicketPage
            user={user}
            onNavigate={setActiveKey}
          />
        );

      // case "mytickets":
      //   return (
      //     <TicketsPage
      //       isSuperAdmin={false}
      //       user={user}
      //     />
      //   );

      case "tickets":
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

      // case "supplyinventory":
      //   return (
      //     <ITInventoryPage
      //       isSuperAdmin={false}
      //     />
      //   );

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
    </View>
  );
}
