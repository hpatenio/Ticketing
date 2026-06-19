import { useState, useEffect } from "react";
import {
  View,
  Text,
  Platform,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ADUser } from "../../types";
import Sidebar from "../../components/Navigations/Sidebar";
import BottomNavBar from "../../components/Navigations/BottmNavBar";
import ITInventoryPage from "../Admin/IT Modules/ITInventory/ITInventoryPage";
import ITInventorySummary, {
  InventoryFilter,
} from "../Admin/IT Modules/ITInventory/ITInventorySummary";
import ConsumablesPage from "../Admin/IT Modules/Consumables/ConsumablesPage";
import TicketsPage from "../Admin/IT Modules/Tickets/TicketsPage";
import UsersPage from "./UsersPage";
import { useTheme } from "../../theme/ThemeContext";
import AuditTrailPage from "./AuditTrailPage";
import OfficeInventoryPage from "../Admin/OnM Modules/OfficeInventoryPage";

// ─── Employee page imports ────────────────────────────────────────────────────
import SubmitTicketPage from "../Employee/SubmitTicketPage";
import MyTicketsPage from "../Admin/IT Modules/Tickets/TicketsPage";
import SupplyRequestsPage from "../Admin/OnM Modules/SupplyRequestsPage";
import ActivityPage from "../Admin/OnM Modules/ActivityPage";
import MonthlyReportPage from "../Admin/OnM Modules/MonthlyReportPage";
// import SupplyInventoryPage from "../Employee/SupplyInventoryPage";

const ACTIVE_KEY_STORAGE = "superadmin_active_key";
const JUST_LOGGED_IN_KEY = "just_logged_in";

type Props = {
  user: ADUser;
  onLogout: () => void;
};

export default function SuperAdminDashboard({ user, onLogout }: Props) {
  const [activeKey, setActiveKey] = useState("dashboard");
  const [hydrated, setHydrated] = useState(false);
  const [inventoryFilter, setInventoryFilter] =
    useState<InventoryFilter | null>(null);
  const { width } = useWindowDimensions();
  const { theme } = useTheme();
  const isMobile =
    Platform.OS === "android" || Platform.OS === "ios" || width < 768;

  useEffect(() => {
    const init = async () => {
      const justLoggedIn = await AsyncStorage.getItem(JUST_LOGGED_IN_KEY);
      if (justLoggedIn === "true") {
        await AsyncStorage.removeItem(JUST_LOGGED_IN_KEY);
        await AsyncStorage.setItem(ACTIVE_KEY_STORAGE, "dashboard");
        setActiveKey("dashboard");
      } else {
        const saved = await AsyncStorage.getItem(ACTIVE_KEY_STORAGE);
        if (saved) setActiveKey(saved);
      }
      setHydrated(true);
    };
    init();
  }, []);

  useEffect(() => {
    if (hydrated) AsyncStorage.setItem(ACTIVE_KEY_STORAGE, activeKey);
  }, [activeKey, hydrated]);

  if (!hydrated) return null;

  const handleFilterNavigate = (filter: InventoryFilter | null) => {
    setInventoryFilter(filter);
    setActiveKey("inventory");
  };

  const renderContent = () => {
    switch (activeKey) {
      // ─── Admin pages ───────────────────────────────────────────────────────
      case "inventory":
        return (
          <ITInventoryPage
            initialFilter={inventoryFilter}
            isSuperAdmin={true}
          />
        );
      case "consumables":
        return <ConsumablesPage isSuperAdmin={true} />;
      case "tickets":
        return <TicketsPage user={user} isSuperAdmin={true} />;
      case "users":
        return <UsersPage currentUser={user} />;
      case "audit":
        return <AuditTrailPage />;
      case "officeinventory":
        return <OfficeInventoryPage />;
      case "supplyrequest":
        return <SupplyRequestsPage user={user} />;
        case "monthlyreport":
        return <MonthlyReportPage />;

      // ─── Employee pages ────────────────────────────────────────────────────
      case "submitticket":
        return <SubmitTicketPage user={user} onNavigate={setActiveKey} />;
      case "mytickets":
        return <MyTicketsPage user={user} />;
      case "activity":
        return <ActivityPage />;

      default:
        return (
          <DashboardHome user={user} onFilterNavigate={handleFilterNavigate} />
        );
    }
  };

  const getTitle = () => {
    switch (activeKey) {
      case "inventory":
        return "IT Inventory";
      case "consumables":
        return "IT Consumables";
      case "tickets":
        return "Concern Tickets";
      case "users":
        return "User Accounts";
      case "audit":
        return "Audit Trail";
      case "submitticket":
        return "Submit Ticket";
      case "mytickets":
        return "My Tickets";
      case "supplyinventory":
        return "Supply Inventory";
      default:
        return "Dashboard";
    }
  };

  const needsScroll = activeKey === "dashboard";

  return (
    <View
      style={{
        flex: 1,
        flexDirection: "row",
        backgroundColor: theme.background,
      }}
    >
      {!isMobile && (
        <Sidebar
          user={user}
          activeKey={activeKey}
          onNavigate={(key) => {
            if (key !== "inventory") setInventoryFilter(null);
            setActiveKey(key);
          }}
          onLogout={onLogout}
        />
      )}

      <View
        style={{
          flex: 1,
          flexDirection: "column",
          backgroundColor: theme.background,
        }}
      >
        {needsScroll ? (
          <ScrollView
            style={{ flex: 1, height: 0 }}
            contentContainerStyle={{ flexGrow: 1 }}
          >
            {renderContent()}
          </ScrollView>
        ) : (
          <View style={{ flex: 1 }}>{renderContent()}</View>
        )}

        {isMobile && (
          <BottomNavBar
            user={user}
            activeKey={activeKey}
            onNavigate={(key) => {
              if (key !== "inventory") setInventoryFilter(null);
              setActiveKey(key);
            }}
          />
        )}
      </View>
    </View>
  );
}

function DashboardHome({
  user,
  onFilterNavigate,
}: {
  user: ADUser;
  onFilterNavigate: (filter: InventoryFilter | null) => void;
}) {
  const { theme } = useTheme();

  return (
    <View style={{ flex: 1, padding: 24, backgroundColor: theme.background }}>
      <Text
        style={{
          fontFamily: "DMSans_700Bold",
          fontSize: 20,
          color: theme.text,
          marginBottom: 4,
        }}
      >
        Welcome, {user.username}!
      </Text>
      <Text
        style={{
          fontFamily: "DMSans_400Regular",
          fontSize: 14,
          color: theme.subtext,
          marginBottom: 24,
        }}
      >
        Here's your admin overview.
      </Text>
      <ITInventorySummary onFilterNavigate={onFilterNavigate} />
    </View>
  );
}
