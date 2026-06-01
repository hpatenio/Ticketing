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
  getNavColors,
  MENU_BY_ROLE,
} from "./NavItems";
import { useTheme } from "../../theme/ThemeContext";
import { ADUser } from "../../types";
import { LogOut, Sun, Moon, Monitor, Settings } from "lucide-react-native";
import LogoutModal from "../../app/auth/LogoutModal";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "AD_USER_DATA";

type SidebarProps = {
  user: ADUser;
  activeKey: string;
  onNavigate: (key: string) => void;
  onLogout: () => void;
};

const COLLAPSED_W = 64;
const EXPANDED_W = 220;

export default function Sidebar({ user, activeKey, onNavigate, onLogout }: SidebarProps) {
  const [expanded, setExpanded] = useState(false);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { theme, themeMode, setThemeMode } = useTheme();
  const C = getNavColors(theme);
  const items = MENU_BY_ROLE[user.role] ?? MENU_BY_ROLE.employee;

  const animatedWidth = useRef(new Animated.Value(COLLAPSED_W)).current;
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
    setSettingsOpen(false);
    animateSidebar(COLLAPSED_W);
  };

  const webHoverProps =
    Platform.OS === "web"
      ? { onMouseEnter: handleExpand, onMouseLeave: handleCollapse }
      : {};

  const handleLogoutConfirm = async () => {
    setLogoutModalVisible(false);
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error("Logout storage error:", err);
    }
    onLogout();
  };

  const themeOptions = [
    { mode: "light"  as const, label: "Light",  Icon: Sun     },
    { mode: "dark"   as const, label: "Dark",   Icon: Moon    },
    { mode: "system" as const, label: "System", Icon: Monitor },
  ];

  return (
    <>
      <Animated.View
        style={{
          width: animatedWidth,
          minHeight: "100%",
          backgroundColor: theme.sidebarBg,
          borderRightWidth: 0.5,
          borderRightColor: theme.navBorder,
          flexDirection: "column",
          overflow: "hidden",
          zIndex: 100,
        }}
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
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingHorizontal: 16,
            paddingTop: 20,
            paddingBottom: 18,
            borderBottomWidth: 0.5,
            borderBottomColor: theme.navBorder,
            overflow: "hidden",
          }}
        >
          <View style={{ flexShrink: 0 }}>
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
        <View style={{ flex: 1, paddingVertical: 12 }}>
          {items.map((item) => {
            const isActive = item.key === activeKey;
            const isHovered = hoveredKey === item.key;
            const Icon = item.icon;

            const navItemWebProps =
              Platform.OS === "web"
                ? {
                    onMouseEnter: () => { if (!isActive) setHoveredKey(item.key); },
                    onMouseLeave: () => setHoveredKey(null),
                  }
                : {};

            return (
              <TouchableOpacity
                key={item.key}
                onPress={() => onNavigate(item.key)}
                activeOpacity={0.7}
                style={{
                  position: "relative",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  marginHorizontal: 8,
                  marginVertical: 2,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: 10,
                  backgroundColor: isActive
                    ? theme.bgActive
                    : isHovered
                    ? theme.bgHover
                    : "transparent",
                }}
                {...navItemWebProps}
              >
                {isActive && (
                  <View
                    style={{
                      position: "absolute",
                      right: 0,
                      top: "50%",
                      marginTop: -11,
                      width: 3,
                      height: 22,
                      borderTopLeftRadius: 3,
                      borderBottomLeftRadius: 3,
                      backgroundColor: C.activeBar,
                    }}
                  />
                )}
                <View style={{ flexShrink: 0, alignItems: "center", justifyContent: "center" }}>
                  <Icon color={isActive ? C.iconActive : C.iconInactive} size={23} />
                </View>
                <Animated.Text
                  numberOfLines={1}
                  style={{
                    fontFamily: isActive ? "DMSans_600SemiBold" : "DMSans_400Regular",
                    fontSize: 15.5,
                    letterSpacing: -0.1,
                    color: isActive ? C.textActive : C.textInactive,
                    opacity: labelOpacity,
                    transform: [{ translateX: labelTranslateX }],
                    flexShrink: 1,
                  }}
                >
                  {item.label}
                </Animated.Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Logout button */}
        <TouchableOpacity
          onPress={() => setLogoutModalVisible(true)}
          activeOpacity={0.7}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            marginHorizontal: 8,
            marginBottom: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 10,
          }}
        >
          <View style={{ flexShrink: 0, alignItems: "center", justifyContent: "center" }}>
            <LogOut color="#f87171" size={22} />
          </View>
          <Animated.Text
            numberOfLines={1}
            style={{
              fontFamily: "DMSans_400Regular",
              fontSize: 15.5,
              letterSpacing: -0.1,
              color: "#f87171",
              opacity: labelOpacity,
              transform: [{ translateX: labelTranslateX }],
              flexShrink: 1,
            }}
          >
            Log out
          </Animated.Text>
        </TouchableOpacity>

        {/* Theme popout */}
        {settingsOpen && (
          <View
            style={{
              marginHorizontal: 8,
              marginBottom: 6,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.navBorder,
              backgroundColor: theme.surface,
              overflow: "hidden",
            }}
          >
            {themeOptions.map(({ mode, label, Icon }, i) => {
              const isSelected = themeMode === mode;
              return (
                <TouchableOpacity
                  key={mode}
                  onPress={() => setThemeMode(mode)}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    backgroundColor: isSelected ? theme.bgActive : "transparent",
                    borderTopWidth: i === 0 ? 0 : 0.5,
                    borderTopColor: theme.navBorder,
                  }}
                >
                  <Icon
                    color={isSelected ? theme.iconActive : theme.iconInactive}
                    size={16}
                  />
                  <Text
                    style={{
                      fontFamily: isSelected ? "DMSans_600SemiBold" : "DMSans_400Regular",
                      fontSize: 13.5,
                      color: isSelected ? theme.textActive : theme.textInactive,
                      flex: 1,
                    }}
                  >
                    {label}
                  </Text>
                  {isSelected && (
                    <View
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: 999,
                        backgroundColor: theme.iconActive,
                      }}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* User footer */}
        <View
          style={{
            borderTopWidth: 0.5,
            borderTopColor: theme.navBorder,
            padding: 12,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            overflow: "hidden",
          }}
        >
          {/* Avatar */}
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 999,
              backgroundColor: theme.iconActive,
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Text style={{ fontFamily: "DMSans_700Bold", color: "#fff", fontSize: 13 }}>
              {user.displayName?.charAt(0) ?? "U"}
            </Text>
          </View>

          {/* Name + role */}
          <Animated.View
            style={{
              opacity: labelOpacity,
              transform: [{ translateX: labelTranslateX }],
              flex: 1,
              overflow: "hidden",
            }}
          >
            <Text
              numberOfLines={1}
              style={{
                fontFamily: "DMSans_600SemiBold",
                fontSize: 12.5,
                color: theme.textActive,
                lineHeight: 17,
              }}
            >
              {user.displayName}
            </Text>
            <Text
              style={{
                fontFamily: "DMSans_400Regular",
                fontSize: 11,
                color: theme.textInactive,
                textTransform: "capitalize",
              }}
            >
              {user.role}
            </Text>
          </Animated.View>

          {/* Settings icon — visible only when expanded */}
          <Animated.View style={{ opacity: labelOpacity }}>
            <TouchableOpacity
              onPress={() => setSettingsOpen((prev) => !prev)}
              activeOpacity={0.7}
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: settingsOpen ? theme.bgActive : "transparent",
              }}
            >
              <Settings
                color={settingsOpen ? theme.iconActive : theme.iconInactive}
                size={16}
              />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Animated.View>

      <LogoutModal
        visible={logoutModalVisible}
        onConfirm={handleLogoutConfirm}
        onCancel={() => setLogoutModalVisible(false)}
      />
    </>
  );
}