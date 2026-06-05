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
import ITInventoryPage from "./Modules/ITInventory/ITInventoryPage";
import ITInventorySummary, {
  InventoryFilter,
} from "./Modules/ITInventory/ITInventorySummary";
import ConsumablesPage from "./Modules/Consumables/ConsumablesPage";
import TicketsPage from "./Modules/Tickets/TicketsPage";
import { useTheme } from "../../theme/ThemeContext";

const ACTIVE_KEY_STORAGE = "admin_active_key";
const JUST_LOGGED_IN_KEY = "just_logged_in";

type Props = {
  user: ADUser;
  onLogout: () => void;
};

export default function AdminDashboard({ user, onLogout }: Props) {
  const [activeKey, setActiveKey] = useState("dashboard");
  const [hydrated, setHydrated] = useState(false);
  const [inventoryFilter, setInventoryFilter] =
    useState<InventoryFilter | null>(null);
  const { width } = useWindowDimensions();
  const { theme } = useTheme();
  const isMobile =
    Platform.OS === "android" || Platform.OS === "ios" || width < 768;

  // On mount: if fresh login → go to dashboard; if refresh → restore last page
  useEffect(() => {
    const init = async () => {
      const justLoggedIn = await AsyncStorage.getItem(JUST_LOGGED_IN_KEY);

      if (justLoggedIn === "true") {
        // Fresh login — reset to dashboard and clear the flag
        await AsyncStorage.removeItem(JUST_LOGGED_IN_KEY);
        await AsyncStorage.setItem(ACTIVE_KEY_STORAGE, "dashboard");
        setActiveKey("dashboard");
      } else {
        // Page refresh — restore last visited page
        const saved = await AsyncStorage.getItem(ACTIVE_KEY_STORAGE);
        if (saved) setActiveKey(saved);
      }

      setHydrated(true);
    };

    init();
  }, []);

  // Save active page whenever it changes (only after hydration)
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
      case "inventory":
        return <ITInventoryPage initialFilter={inventoryFilter} />;
      case "consumables":
        return <ConsumablesPage />;
      case "tickets":
        return <TicketsPage user={user} />;
      case "dashboard":
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
      default:
        return "Dashboard";
    }
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
        {activeKey === "dashboard" ? (
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