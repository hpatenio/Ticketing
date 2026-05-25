// @ts-ignore: CSS module import side effect
import "./global.css";
import { useState } from "react";
import { View } from "react-native";
import AuthScreen         from "./app/auth/AuthScreen";
import SuperAdminDashboard from "./app/SuperAdmin/SuperAdminDashboard";
import AdminDashboard      from "./app/Admin/AdminDashboard";
import EmployeeDashboard   from "./app/Employee/EmployeeDashboard";
import { ADUser }          from "./types";

export default function App() {
  const [user, setUser] = useState<ADUser | null>(null);

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
}