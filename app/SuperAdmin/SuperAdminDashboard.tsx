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
import MobileNavBar from "../../components/Navigations/BottmNavBar";
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
import MyTicketsPage from "../Employee/MyTicketsPage";
import SupplyRequestsPage from "../Admin/OnM Modules/SupplyRequestsPage";
import ActivityPage from "../Admin/OnM Modules/ActivityPage";
import MonthlyReportPage from "../Admin/OnM Modules/MonthlyReportPage";
import OfficeDashboardPage, {
  DashboardInventoryFilter,
} from "../Admin/OnM Modules/OfficeDashboardPage";
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
  const [inventoryFilter, setInventoryFilter] = useState<InventoryFilter | null>(null);
  const [officeInventoryFilter, setOfficeInventoryFilter] = useState<DashboardInventoryFilter>(null);
  const [pendingApproval, setPendingApproval] = useState<import("../../types").SupplyRequest | null>(null);
  const [pendingDeliverItem, setPendingDeliverItem] = useState<import("../../types").OfficeInventoryItem | null>(null); // ← moved here

  const { width } = useWindowDimensions();
  const { theme } = useTheme();
  const isMobile = Platform.OS === "android" || Platform.OS === "ios" || width < 768;

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

  // ── Single early return, after ALL hooks ──────────────────────────────────
  if (!hydrated) return null;

  // ── Handlers and renderContent below (not hooks, so fine after return) ────
  const handleFilterNavigate = (filter: InventoryFilter | null) => {
    setInventoryFilter(filter);
    setActiveKey("inventory");
  };

  const handleOfficeDashboardNavigate = (
    tab: "inventory" | "supply_requests" | "monthly_report" | "activity",
    filter?: DashboardInventoryFilter,
  ) => {
    const keyMap = {
      inventory:       "officeinventory",
      supply_requests: "supplyrequest",
      monthly_report:  "monthlyreport",
      activity:        "activity",
    } as const;

    if (tab === "inventory") {
      setOfficeInventoryFilter(filter ?? null);
    }

    setActiveKey(keyMap[tab]);
  };

  const handleOfficeDashboardNavigateWithPayload = (payload: {
    tab: "inventory" | "supply_requests" | "monthly_report" | "activity" | "inventory_deliver";
    approvalRequest?: import("../../types").SupplyRequest;
    deliverItem?: import("../../types").OfficeInventoryItem;
  }) => {
    if (payload.approvalRequest) setPendingApproval(payload.approvalRequest);
    if (payload.deliverItem) setPendingDeliverItem(payload.deliverItem);

    const tab =
      payload.tab === "inventory_deliver"
        ? ("inventory" as const)
        : payload.tab;

    handleOfficeDashboardNavigate(tab);
  };

  const renderContent = () => {
    switch (activeKey) {
      // ─── IT pages ──────────────────────────────────────────────────────────
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

      case "officedashboard":
        return (
          <OfficeDashboardPage
            user={user}
            onNavigate={handleOfficeDashboardNavigate}
            onNavigateWithPayload={handleOfficeDashboardNavigateWithPayload}
          />
        );
     case "officeinventory":
  return (
    <OfficeInventoryPage
      initialFilter={officeInventoryFilter}
      initialDeliverItem={pendingDeliverItem}
      onDeliverModalOpened={() => setPendingDeliverItem(null)}
      isSuperAdmin={true}
    />
  );
 case "supplyrequest":
        return (
          <SupplyRequestsPage
            user={user}
            initialApprovalRequest={pendingApproval}
            onApprovalModalOpened={() => setPendingApproval(null)}
          />
        );
      case "monthlyreport":
        return <MonthlyReportPage />;
      case "activity":
        return <ActivityPage />;

      // ─── Employee pages ────────────────────────────────────────────────────
      case "submitticket":
        return <SubmitTicketPage user={user} onNavigate={setActiveKey} />;
      case "mytickets":
        return <MyTicketsPage user={user} />;

      default:
        return (
          <DashboardHome user={user} onFilterNavigate={handleFilterNavigate} />
        );
    }
  };

  const getTitle = () => {
    switch (activeKey) {
      case "inventory":        return "IT Inventory";
      case "consumables":      return "IT Consumables";
      case "tickets":          return "Concern Tickets";
      case "users":            return "User Accounts";
      case "audit":            return "Audit Trail";
      case "officedashboard":  return "Office Dashboard";
      case "officeinventory":  return "Office Supplies";
      case "supplyrequest":    return "Supply Requests";
      case "monthlyreport":    return "Monthly Report";
      case "activity":         return "Activity";
      case "submitticket":     return "Submit Ticket";
      case "mytickets":        return "My Tickets";
      case "supplyinventory":  return "Supply Inventory";
      default:                 return "Dashboard";
    }
  };

  const needsScroll = activeKey === "dashboard";

  const handleNavigate = (key: string) => {
    // Clear IT inventory filter when leaving that page
    if (key !== "inventory") setInventoryFilter(null);
    // Clear office inventory filter when leaving that page
    if (key !== "officeinventory") setOfficeInventoryFilter(null);
    setActiveKey(key);
  };

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
          onNavigate={handleNavigate}
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
        {/* ── Mobile top bar (hamburger + logo) renders FIRST, above content ── */}
        {isMobile && (
          <MobileNavBar
            user={user}
            activeKey={activeKey}
            onNavigate={handleNavigate}
            onLogout={onLogout}
          />
        )}

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
