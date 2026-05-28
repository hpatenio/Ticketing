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
import { clearUserSession, logout } from "../auth/Logout";
import LogoutModal from "../auth/LogoutModal";
import Sidebar from "../../components/Navigations/Sidebar";
import BottomNavBar from "../../components/Navigations/BottmNavBar";
import TopBar from "../../components/TopBar";


type Props = {
  user: ADUser;
  onLogout: () => void;
};

export default function SuperAdminDashboard({ user, onLogout }: Props) {
  const [activeKey, setActiveKey] = useState("dashboard");
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const { width } = useWindowDimensions();
  const isMobile =
    Platform.OS === "android" || Platform.OS === "ios" || width < 768;

  const handleConfirmLogout = async () => {
    await clearUserSession();
    setShowLogoutModal(false);
    onLogout();
  };
  return (
    <View style={{ flex: 1, flexDirection: "row" }}>
      <LogoutModal
        visible={showLogoutModal}
        onConfirm={handleConfirmLogout}
        onCancel={() => setShowLogoutModal(false)}
      />

      

      <View
        style={{ flex: 1, flexDirection: "column", backgroundColor: "#EEF7FB" }}
      >
        <TopBar
          title="Dashboard"
          onBellPress={() => console.log("bell pressed")}
          onProfilePress={() => console.log("profile pressed")}
        />

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
          <View style={{ padding: 24 }}>
            <TouchableOpacity
              className="bg-slate-700 rounded-xl py-3 items-center"
              onPress={() => setShowLogoutModal(true)}
            >
              <Text className="text-slate-200 text-sm font-semibold">
                Log out
              </Text>
            </TouchableOpacity>
          </View>
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
