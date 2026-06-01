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
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [user, setUser] = useState<ADUser | null>(null);

  const [fontsLoaded] = useFonts({
    DMSans_400Regular: require("./components/fonts/DMSans-Regular.ttf"),
    DMSans_600SemiBold: require("./components/fonts/DMSans-SemiBold.ttf"),
    DMSans_700Bold: require("./components/fonts/DMSans-Bold.ttf"),
    Raleway_400Regular: require("./components/fonts/Raleway-Regular.ttf"),
    Raleway_600SemiBold: require("./components/fonts/Raleway-SemiBold.ttf"),
    Raleway_700Bold: require("./components/fonts/Raleway-Bold.ttf"),
    Outfit_400Regular: require("./components/fonts/Outfit-Regular.ttf"),
    Outfit_600SemiBold: require("./components/fonts/Outfit-SemiBold.ttf"),
    Outfit_700Bold: require("./components/fonts/Outfit-Bold.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
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
      <ThemeProvider>
        {renderContent()}
      </ThemeProvider>
    </SafeAreaProvider>
  );
}