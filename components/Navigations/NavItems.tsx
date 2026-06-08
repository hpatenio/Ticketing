import React from "react";
import Svg, { Rect, Path, Circle } from "react-native-svg";
import { ChartColumn } from "lucide-react-native";
import { Theme } from "../../theme/ThemeContext";

export type NavItem = {
  key: string;
  label: string;
  icon: React.FC<{ color: string; size?: number }>;
};

// Replace the static C object with a function that takes the theme
export const getNavColors = (theme: Theme) => ({
  iconActive: theme.iconActive,
  iconInactive: theme.iconInactive,
  textActive: theme.textActive,
  textInactive: theme.textInactive,
  bgActive: theme.bgActive,
  bgHover: theme.bgHover,
  activeBar: theme.activeBar,
  sidebarBg: theme.sidebarBg,
  border: theme.navBorder,
});

// ─── Icons ────────────────────────────────────────────────────────────────────

export const DashboardIcon: React.FC<{ color: string; size?: number }> = ({
  color,
  size = 20,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="3" width="8" height="8" rx="1.5" fill={color} />
    <Rect
      x="13"
      y="3"
      width="8"
      height="8"
      rx="1.5"
      fill={color}
      opacity="0.7"
    />
    <Rect
      x="3"
      y="13"
      width="8"
      height="8"
      rx="1.5"
      fill={color}
      opacity="0.7"
    />
    <Rect
      x="13"
      y="13"
      width="8"
      height="8"
      rx="1.5"
      fill={color}
      opacity="0.4"
    />
  </Svg>
);

export const TicketsIcon: React.FC<{ color: string; size?: number }> = ({
  color,
  size = 20,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
    <Rect
      x="9"
      y="3"
      width="6"
      height="4"
      rx="1"
      stroke={color}
      strokeWidth="2"
    />
    <Path
      d="M9 12h6M9 16h4"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
  </Svg>
);

export const InventoryIcon: React.FC<{ color: string; size?: number }> = ({
  color,
  size = 20,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20 7H4a1 1 0 00-1 1v11a1 1 0 001 1h16a1 1 0 001-1V8a1 1 0 00-1-1z"
      stroke={color}
      strokeWidth="2"
    />
    <Path
      d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"
      stroke={color}
      strokeWidth="2"
    />
    <Path
      d="M12 12v4M10 14h4"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
  </Svg>
);

export const ConsumablesIcon: React.FC<{ color: string; size?: number }> = ({
  color,
  size = 20,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {/* Printer body */}
    <Rect
      x="4"
      y="8"
      width="16"
      height="9"
      rx="1.5"
      stroke={color}
      strokeWidth="2"
    />
    {/* Paper tray top */}
    <Path
      d="M7 8V5a1 1 0 011-1h8a1 1 0 011 1v3"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
    {/* Paper output */}
    <Path
      d="M7 17v2a1 1 0 001 1h8a1 1 0 001-1v-2"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
    {/* Ink dot */}
    <Circle cx="17" cy="12.5" r="1.2" fill={color} />
  </Svg>
);

export const AnalyticsIcon: React.FC<{ color: string; size?: number }> = ({
  color,
  size = 20,
}) => <ChartColumn color={color} size={size} />;

export const ReportsIcon: React.FC<{ color: string; size?: number }> = ({
  color,
  size = 20,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
    <Path
      d="M14 2v6h6M16 13H8M16 17H8M10 9H8"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
  </Svg>
);

export const UsersIcon: React.FC<{ color: string; size?: number }> = ({
  color,
  size = 20,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="9" cy="7" r="4" stroke={color} strokeWidth="2" />
    <Path
      d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
    <Path
      d="M16 3.13a4 4 0 010 7.75M21 21v-2a4 4 0 00-3-3.87"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
  </Svg>
);

export const SettingsIcon: React.FC<{ color: string; size?: number }> = ({
  color,
  size = 20,
}) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth="2" />
    <Path
      d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
      stroke={color}
      strokeWidth="2"
    />
  </Svg>
);

// ─── Menu config ──────────────────────────────────────────────────────────────

export const MENU_BY_ROLE: Record<string, NavItem[]> = {
  superadmin: [
    { key: "dashboard", label: "Dashboard", icon: DashboardIcon },
    { key: "tickets", label: "Tickets", icon: TicketsIcon },
    { key: "inventory", label: "IT Inventory", icon: InventoryIcon },
    { key: "consumables", label: "IT Consumables", icon: ConsumablesIcon },
    //{ key: "analytics", label: "Analytics", icon: AnalyticsIcon },
    //{ key: "reports", label: "Reports", icon: ReportsIcon },
    { key: "users", label: "Users", icon: UsersIcon },
    //{ key: "settings", label: "Settings", icon: SettingsIcon },
  ],
  admin: [
    { key: "dashboard", label: "Dashboard", icon: DashboardIcon },
    { key: "tickets", label: "Tickets", icon: TicketsIcon },
    { key: "inventory", label: "IT Inventory", icon: InventoryIcon },
    { key: "consumables", label: "IT Consumables", icon: ConsumablesIcon },
  ],
  employee: [
    { key: "dashboard", label: "Dashboard", icon: DashboardIcon },
    { key: "tickets", label: "Tickets", icon: TicketsIcon },
    { key: "reports", label: "Reports", icon: ReportsIcon },
  ],
};
