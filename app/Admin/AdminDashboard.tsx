import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  useWindowDimensions,
} from "react-native";
import { ADUser } from "../../types";
import Sidebar from "../../components/Navigations/Sidebar";
import BottomNavBar from "../../components/Navigations/BottmNavBar";
import TopBar from "../../components/TopBar";
import ITInventoryPage from "./Modules/ITInventory/ITInventoryPage";

type Props = {
  user: ADUser;
  onLogout: () => void;
};

export default function AdminDashboard({ user, onLogout }: Props) {
  const [activeKey, setActiveKey] = useState("dashboard");
  const { width } = useWindowDimensions();
  const isMobile = Platform.OS === "android" || Platform.OS === "ios" || width < 768;

  const renderContent = () => {
    switch (activeKey) {
      case "inventory":   return <ITInventoryPage />;
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
    <View style={{ flex: 1, flexDirection: "row" }}>
      {!isMobile && (
        <Sidebar
          user={user}
          activeKey={activeKey}
          onNavigate={(key) => setActiveKey(key)}
          onLogout={onLogout}   // ← passed directly; Sidebar owns the modal
        />
      )}

      <View style={{ flex: 1, flexDirection: "column", backgroundColor: "#EEF7FB" }}>
        <TopBar
          title={getTitle()}
          onBellPress={() => console.log("bell pressed")}
          onProfilePress={() => console.log("profile pressed")}
        />

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
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
  return (
    <View className="p-6">
      <Text className="text-xl font-bold text-gray-800 mb-2">
        Welcome, {user.username}!
      </Text>
      <Text className="text-sm text-gray-500 mb-6">
        Here's your admin overview.
      </Text>

      <View className="flex-row flex-wrap gap-4 mb-6">
        <View className="bg-white rounded-xl p-4 flex-1 min-w-[140px] shadow-sm">
          <Text className="text-xs text-gray-500">Total Assets</Text>
          <Text className="text-2xl font-bold text-blue-600 mt-1">--</Text>
        </View>
        <View className="bg-white rounded-xl p-4 flex-1 min-w-[140px] shadow-sm">
          <Text className="text-xs text-gray-500">Open Tickets</Text>
          <Text className="text-2xl font-bold text-orange-500 mt-1">--</Text>
        </View>
        <View className="bg-white rounded-xl p-4 flex-1 min-w-[140px] shadow-sm">
          <Text className="text-xs text-gray-500">Printers</Text>
          <Text className="text-2xl font-bold text-green-600 mt-1">--</Text>
        </View>
      </View>
    </View>
  );
}
