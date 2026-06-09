// @ts-ignore: CSS module import side effect
import "./global.css";
import { useState } from "react";
import { View } from "react-native";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AuthScreen from "./app/auth/AuthScreen";
import SuperAdminDashboard from "./app/SuperAdmin/SuperAdminDashboard";
import AdminDashboard from "./app/Admin/AdminDashboard";
import EmployeeDashboard from "./app/Employee/EmployeeDashboard";
import { ADUser } from "./types";
import { ThemeProvider } from "./theme/ThemeContext";
import { registerForPushNotificationsAsync } from "./notification";

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [user, setUser] = useState<ADUser | null>(null);

 const [fontsLoaded] = useFonts({
  Outfit: require("./components/fonts/Outfit-Regular.ttf"),
  "Outfit-Medium": require("./components/fonts/Outfit-Medium.ttf"),
  "Outfit-SemiBold": require("./components/fonts/Outfit-SemiBold.ttf"),
  "Outfit-Bold": require("./components/fonts/Outfit-Bold.ttf"),
});

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
    registerForPushNotificationsAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  const renderContent = () => {
    if (user?.role === "superadmin") {
      return <SuperAdminDashboard user={user} onLogout={() => setUser(null)} />;
    }
    if (user?.role === "admin") {
      return <AdminDashboard user={user} onLogout={() => setUser(null)} />;
    }
    if (user?.role === "employee") {
      return <EmployeeDashboard user={user} onLogout={() => setUser(null)} />;
    }
    return (
      <View style={{ flex: 1, minHeight: "100vh" } as any}>
        <AuthScreen
          onLoginSuccess={(u) => setUser(u)}
          onLogout={() => setUser(null)}
        />
      </View>
    );
  };

  return (
    <SafeAreaProvider>
      <ThemeProvider>{renderContent()}</ThemeProvider>
    </SafeAreaProvider>
  );
}
