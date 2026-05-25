import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  useWindowDimensions, // ← make sure this is here
} from "react-native";
import { ADUser } from "../../types";
import { logout } from "../auth/Logout";
import Sidebar from "../../components/Navigations/Sidebar";
import BottomNavBar from "../../components/Navigations/BottmNavBar";
import TopBar from "../../components/TopBar";

type Props = {
  user: ADUser;
  onLogout: () => void;
};

export default function AdminDashboard({ user, onLogout }: Props) {
  const [activeKey, setActiveKey] = useState("dashboard");
  const { width } = useWindowDimensions();
  const isMobile =
    Platform.OS === "android" || Platform.OS === "ios" || width < 768;
  console.log("isMobile:", isMobile, "width:", width, "platform:", Platform.OS);

  const handleLogout = async () => {
    console.log("Logging out...");
    await logout();
    onLogout();
  };
  console.log("rendering dashboard, isMobile:", isMobile);
  return (
    <View style={{ flex: 1, flexDirection: "row" }}>
      {!isMobile && (
        <Sidebar
          user={user}
          activeKey={activeKey}
          onNavigate={(key) => setActiveKey(key)}
        />
      )}

      <View
        style={{ flex: 1, flexDirection: "column", backgroundColor: "#EEF7FB" }}
      >
        <TopBar
          title="Dashboard"
          onBellPress={() => console.log("bell pressed")}
          onProfilePress={() => console.log("profile pressed")}
        />

        {/* Give ScrollView a flex but NOT flex:1 so it doesn't take all space */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
          <View style={{ padding: 24 }}>
            <TouchableOpacity
              className="bg-slate-700 rounded-xl py-3 items-center"
              onPress={handleLogout}
            >
              <Text className="text-slate-200 text-sm font-semibold">
                Log out
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Force visible for testing */}
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
