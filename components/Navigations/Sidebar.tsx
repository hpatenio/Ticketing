import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Platform,
  Animated,
  Easing,
} from "react-native";
import {
  NavItem,
  C,
  MENU_BY_ROLE,
  DashboardIcon,
  TicketsIcon,
  InventoryIcon,
  AnalyticsIcon,
  ReportsIcon,
  UsersIcon,
  SettingsIcon,
} from "./NavItems";

// remove all the local icon definitions and MENU_BY_ROLE from Sidebar.tsx
import Svg, { Rect, Path, Circle } from "react-native-svg";
import { ADUser } from "../../types";
import { ChartNoAxesCombined } from "lucide-react-native";
import { ChartColumn } from "lucide-react-native";

// ─── Types ────────────────────────────────────────────────────────────────────


type SidebarProps = {
  user: ADUser;
  activeKey: string;
  onNavigate: (key: string) => void;
};

// ─── Color tokens ─────────────────────────────────────────────────────────────

// ─── Widths ───────────────────────────────────────────────────────────────────

const COLLAPSED_W = 64;
const EXPANDED_W = 220;


// ─── Sidebar ──────────────────────────────────────────────────────────────────

export default function Sidebar({ user, activeKey, onNavigate }: SidebarProps) {
  const [expanded, setExpanded] = useState(false);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const items = MENU_BY_ROLE[user.role] ?? MENU_BY_ROLE.employee;

  // ─── Animated Values ───────────────────────────────────────────────────────

  const animatedWidth = useRef(new Animated.Value(COLLAPSED_W)).current;

  // Drives all label/content transitions: 0 = collapsed, 1 = expanded
  const animatedExpand = useRef(new Animated.Value(0)).current;

  const labelOpacity = animatedExpand;
  const labelTranslateX = animatedExpand.interpolate({
    inputRange: [0, 1],
    outputRange: [-6, 0],
  });

  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const animateSidebar = (toValue: number) => {
    const expandTo = toValue === EXPANDED_W ? 1 : 0;

    Animated.parallel([
      Animated.timing(animatedWidth, {
        toValue,
        duration: 240,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }),
      Animated.timing(animatedExpand, {
        toValue: expandTo,
        // Labels fade in slightly after width starts growing,
        // and fade out faster than the width collapses.
        duration: expandTo === 1 ? 180 : 120,
        delay: expandTo === 1 ? 60 : 0,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleExpand = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    hoverTimeout.current = setTimeout(() => {
      setExpanded(true);
      animateSidebar(EXPANDED_W);
    }, 150);
  };

  const handleCollapse = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    setExpanded(false);
    animateSidebar(COLLAPSED_W);
  };

  const webHoverProps =
    Platform.OS === "web"
      ? {
          onMouseEnter: handleExpand,
          onMouseLeave: handleCollapse,
        }
      : {};

  return (
    <Animated.View
      className="min-h-full bg-white border-r border-[#E8F4F8] flex-col overflow-hidden z-[100]"
      style={{ width: animatedWidth }}
      {...webHoverProps}
    >
      {/* Logo */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => {
          if (Platform.OS !== "web") {
            const next = !expanded;
            setExpanded(next);
            animateSidebar(next ? EXPANDED_W : COLLAPSED_W);
          }
        }}
        className="flex-row items-center gap-x-2.5 px-4 pt-5 pb-[18px] border-b border-[#E8F4F8] overflow-hidden"
      >
        <View className="shrink-0">
          <Image
            source={require("../icons/silverdab-logo.png")}
            style={{ width: 35, height: 35 }}
            resizeMode="contain"
          />
        </View>

        <Animated.Text
          style={{
            fontFamily: "Raleway_600SemiBold",
            fontSize: 16,
            color: C.textActive,
            letterSpacing: -0.3,
            opacity: labelOpacity,
            transform: [{ translateX: labelTranslateX }],
          }}
          numberOfLines={1}
        >
          Silverdab
        </Animated.Text>
      </TouchableOpacity>

      {/* Nav items */}
      <View className="flex-1 py-3">
        {items.map((item) => {
          const isActive = item.key === activeKey;
          const isHovered = hoveredKey === item.key;
          const Icon = item.icon;

          const navItemWebProps =
            Platform.OS === "web"
              ? {
                  onMouseEnter: () => {
                    if (!isActive) setHoveredKey(item.key);
                  },
                  onMouseLeave: () => setHoveredKey(null),
                }
              : {};

          return (
            <TouchableOpacity
              key={item.key}
              onPress={() => onNavigate(item.key)}
              activeOpacity={0.7}
              className={`
                relative flex-row items-center gap-x-3 mx-2 my-0.5 px-3 py-2.5 rounded-[10px]
                ${
                  isActive
                    ? "bg-[#F4FBFE]"
                    : isHovered
                      ? "bg-[#F0F9FF]"
                      : "bg-transparent"
                }
              `}
              {...navItemWebProps}
            >
              {/* Active bar */}
              {isActive && (
                <View
                  className="absolute right-0 w-[3px] h-[22px] rounded-tl-[3px] rounded-bl-[3px] bg-[#35A2CA]"
                  style={{ top: "50%", marginTop: -11 }}
                />
              )}

              {/* Icon */}
              <View className="shrink-0 items-center justify-center">
                <Icon
                  color={isActive ? C.iconActive : C.iconInactive}
                  size={20}
                />
              </View>

              {/* Label — always mounted, transitions in/out smoothly */}
              <Animated.Text
                numberOfLines={1}
                style={{
                  fontFamily: isActive
                    ? "DMSans_600SemiBold"
                    : "DMSans_400Regular",
                  fontSize: 13.5,
                  letterSpacing: -0.1,
                  color: isActive ? C.textActive : C.textInactive,
                  opacity: labelOpacity,
                  transform: [{ translateX: labelTranslateX }],
                  // Prevent the invisible label from stealing layout space
                  // when collapsed — pointerEvents handled by parent overflow:hidden
                  flexShrink: 1,
                }}
              >
                {item.label}
              </Animated.Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* User footer */}
      <View className="border-t border-[#E8F4F8] p-4 flex-row items-center gap-x-2.5 overflow-hidden">
        <View className="w-8 h-8 rounded-full bg-[#35A2CA] items-center justify-center shrink-0">
          <Text
            style={{
              fontFamily: "DMSans_700Bold",
              color: "#fff",
              fontSize: 13,
            }}
          >
            {user.displayName?.charAt(0) ?? "U"}
          </Text>
        </View>

        {/* User info fades + slides in */}
        <Animated.View
          style={{
            opacity: labelOpacity,
            transform: [{ translateX: labelTranslateX }],
            flexShrink: 1,
          }}
        >
          <Text
            numberOfLines={1}
            style={{
              fontFamily: "DMSans_600SemiBold",
              fontSize: 12.5,
              color: C.textActive,
              lineHeight: 17,
            }}
          >
            {user.displayName}
          </Text>

          <Text
            style={{
              fontFamily: "DMSans_400Regular",
              fontSize: 11,
              color: C.textInactive,
              textTransform: "capitalize",
            }}
          >
            {user.role}
          </Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}
