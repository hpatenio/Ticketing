import { useState } from "react";
import {
  View,
  Text,
  Platform,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { ADUser } from "../../types";
import Sidebar from "../../components/Navigations/Sidebar";
import BottomNavBar from "../../components/Navigations/BottmNavBar";
import TopBar from "../../components/TopBar";
import ITInventoryPage from "./Modules/ITInventory/ITInventoryPage";
import ITInventorySummary from "./Modules/ITInventory/ITInventorySummary";
import ConsumablesPage from "./Modules/Consumables/ConsumablesPage";
import TicketsPage from "./Modules/Tickets/TicketsPage";
import { useTheme } from "../../theme/ThemeContext";

type Props = {
  user: ADUser;
  onLogout: () => void;
};

export default function AdminDashboard({ user, onLogout }: Props) {
  const [activeKey, setActiveKey] = useState("dashboard");
  const { width } = useWindowDimensions();
  const { theme } = useTheme();
  const isMobile = Platform.OS === "android" || Platform.OS === "ios" || width < 768;

  const renderContent = () => {
    switch (activeKey) {
      case "inventory":   return <ITInventoryPage />;
      case "consumables": return <ConsumablesPage />;
      case "tickets":     return <TicketsPage />;
      case "dashboard":
      default:            return <DashboardHome user={user} />;
    }
  };

  const getTitle = () => {
    switch (activeKey) {
      case "inventory":   return "IT Inventory";
      case "consumables": return "IT Consumables";
      case "tickets":     return "Concern Tickets";
      default:            return "Dashboard";
    }
  };

  return (
    <View style={{ flex: 1, flexDirection: "row", backgroundColor: theme.background }}>
      {!isMobile && (
        <Sidebar
          user={user}
          activeKey={activeKey}
          onNavigate={(key) => setActiveKey(key)}
          onLogout={onLogout}
        />
      )}

      <View style={{ flex: 1, flexDirection: "column", backgroundColor: theme.background }}>
        <TopBar
          title={getTitle()}
          onBellPress={() => console.log("bell pressed")}
          onProfilePress={() => console.log("profile pressed")}
        />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          {renderContent()}
        </ScrollView>

        {isMobile && (
          <BottomNavBar
            user={user}
            activeKey={activeKey}
            onNavigate={(key) => setActiveKey(key)}
          />
        )}
      </View>
    </View>
  );
}

function DashboardHome({ user }: { user: ADUser }) {
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
      <ITInventorySummary />
    </View>
  );
}