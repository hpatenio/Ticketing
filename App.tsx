// @ts-ignore: CSS module import side effect
import "./global.css"; 
import { useState } from "react";
import AuthScreen from "./app/auth/AuthScreen";
import SuperAdminDashboard from "./app/SuperAdmin/SuperAdminDashboard";
import EmployeeDashboard from "./app/Employee/EmployeeDashboard";
import AdminDashboard from "./app/Admin/AdminDashboard";
import { ADUser } from "./types";

export default function App() {
  const [user, setUser] = useState<ADUser | null>(null);

  if (user?.role === "it") {
    return <SuperAdminDashboard user={user} onLogout={() => setUser(null)} />;
  }

  if (user?.role === "employee") {
    return <EmployeeDashboard user={user} onLogout={() => setUser(null)} />;
  }

  if (user?.role === "hr" || user?.role === "accounting" || user?.role === "admin") {
    return <AdminDashboard user={user} onLogout={() => setUser(null)} />;
  }

  return <AuthScreen 
  onLoginSuccess={(u) => setUser(u)} 
  onLogout={() => setUser(null)}
/>;
}