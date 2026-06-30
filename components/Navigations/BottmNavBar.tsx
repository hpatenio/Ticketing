import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Modal,
  Pressable,
  Animated,
  Easing,
  ScrollView,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getNavColors,
  getNavSectionsForUser,
  NavItem,
} from "./NavItems";
import { useTheme } from "../../theme/ThemeContext";
import { ADUser } from "../../types";
import { Menu, X, LogOut, Sun, Moon, Monitor, Settings } from "lucide-react-native";
import LogoutModal from "../../app/auth/LogoutModal";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "AD_USER_DATA";
const DRAWER_W = Math.min(280, Dimensions.get("window").width * 0.8);

const THEME_CYCLE = ["light", "dark", "system"] as const;
type ThemeMode = (typeof THEME_CYCLE)[number];

const THEME_META: Record<ThemeMode, { label: string; Icon: typeof Sun; next: ThemeMode }> = {
  light:  { label: "Light",  Icon: Sun,     next: "dark"   },
  dark:   { label: "Dark",   Icon: Moon,    next: "system" },
  system: { label: "System", Icon: Monitor, next: "light"  },
};

type MobileNavBarProps = {
  user: ADUser;
  activeKey: string;
  onNavigate: (key: string) => void;
  onLogout: () => void;
};

export default function MobileNavBar({
  user,
  activeKey,
  onNavigate,
  onLogout,
}: MobileNavBarProps) {
  const insets = useSafeAreaInsets();
  const { theme, themeMode, setThemeMode } = useTheme();
  const C = getNavColors(theme);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [renderDrawer, setRenderDrawer] = useState(false); // keeps Modal mounted during close anim
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  const translateX = useRef(new Animated.Value(-DRAWER_W)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // ✅ Same permission normalization as desktop Sidebar
  const normalizedUser: ADUser = {
    ...user,
    permissions: {
      itAccess:
        Boolean(user.permissions?.itAccess) ||
        Boolean(user.permissions?.itInventory) ||
        Boolean(user.permissions?.consumables) ||
        Boolean(user.permissions?.tickets),
      itInventory:    user.permissions?.itInventory    ?? false,
      consumables:    user.permissions?.consumables    ?? false,
      tickets:        user.permissions?.tickets        ?? false,
      officeSupplies: Boolean(
        user.permissions?.officeSupplies || (user.permissions as any)?.officesupplies,
      ),
    },
  };

  const sections = getNavSectionsForUser(normalizedUser);

  const openDrawer = () => {
    setRenderDrawer(true);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setSettingsOpen(false);
    setDrawerOpen(false);
  };

  useEffect(() => {
    if (drawerOpen) {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (renderDrawer) {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: -DRAWER_W,
          duration: 180,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start(() => setRenderDrawer(false));
    }
  }, [drawerOpen]);

  const handleNavigate = (key: string) => {
    closeDrawer();
    onNavigate(key);
  };

  const handleLogoutConfirm = async () => {
    setLogoutModalVisible(false);
    closeDrawer();
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error("Logout storage error:", err);
    }
    onLogout();
  };

  const handleThemeCycle = () => {
    const next = THEME_META[themeMode as ThemeMode]?.next ?? "light";
    setThemeMode(next);
  };

  const currentTheme = THEME_META[themeMode as ThemeMode] ?? THEME_META.system;
  const ThemeIcon = currentTheme.Icon;

  const renderNavItem = (item: NavItem) => {
    const isActive = item.key === activeKey;
    const Icon = item.icon;

    return (
      <TouchableOpacity
        key={item.key}
        onPress={() => handleNavigate(item.key)}
        activeOpacity={0.7}
        style={{
          position: "relative",
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          marginHorizontal: 8,
          marginVertical: 2,
          paddingHorizontal: 12,
          paddingVertical: 12,
          borderRadius: 10,
          backgroundColor: isActive ? theme.bgActive : "transparent",
        }}
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
          <Icon color={isActive ? C.iconActive : C.iconInactive} size={22} />
        </View>
        <Text
          numberOfLines={1}
          style={{
            fontFamily: isActive ? "Outfit-SemiBold" : "Outfit",
            fontSize: 15.5,
            letterSpacing: -0.1,
            color: isActive ? C.textActive : C.textInactive,
            flexShrink: 1,
          }}
        >
          {item.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <>
      {/* ── Top bar with hamburger ── */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingTop: insets.top + 10,
          paddingBottom: 10,
          paddingHorizontal: 14,
          backgroundColor: theme.sidebarBg,
          borderBottomWidth: 0.5,
          borderBottomColor: theme.navBorder,
        }}
      >
        <TouchableOpacity
          onPress={openDrawer}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{
            width: 36,
            height: 36,
            borderRadius: 9,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Menu color={C.iconActive} size={22} />
        </TouchableOpacity>

        <Image
          source={require("../icons/silverdab-logo.png")}
          style={{ width: 26, height: 26 }}
          resizeMode="contain"
        />
        <Text
          style={{
            fontFamily: "Outfit-SemiBold",
            fontSize: 15,
            color: C.textActive,
            letterSpacing: -0.3,
          }}
        >
          Silverdab
        </Text>
      </View>

      {/* ── Drawer ── */}
      {renderDrawer && (
        <Modal
          visible
          transparent
          animationType="none"
          onRequestClose={closeDrawer}
        >
          {/* Backdrop */}
          <Animated.View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.45)",
              opacity: backdropOpacity,
            }}
          >
            <Pressable style={{ flex: 1 }} onPress={closeDrawer} />
          </Animated.View>

          {/* Sliding panel */}
          <Animated.View
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              width: DRAWER_W,
              backgroundColor: theme.sidebarBg,
              borderRightWidth: 0.5,
              borderRightColor: theme.navBorder,
              transform: [{ translateX }],
              shadowColor: "#000",
              shadowOpacity: 0.15,
              shadowRadius: 16,
              shadowOffset: { width: 4, height: 0 },
              elevation: 12,
            }}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                paddingTop: insets.top + 16,
                paddingBottom: 16,
                paddingHorizontal: 16,
                borderBottomWidth: 0.5,
                borderBottomColor: theme.navBorder,
              }}
            >
              <Image
                source={require("../icons/silverdab-logo.png")}
                style={{ width: 32, height: 32 }}
                resizeMode="contain"
              />
              <Text
                style={{
                  flex: 1,
                  fontFamily: "Outfit-SemiBold",
                  fontSize: 16,
                  color: C.textActive,
                  letterSpacing: -0.3,
                }}
                numberOfLines={1}
              >
                Silverdab
              </Text>
              <TouchableOpacity
                onPress={closeDrawer}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X color={C.iconInactive} size={18} />
              </TouchableOpacity>
            </View>

            {/* User info — now at the top, right under the header */}
            <View
              style={{
                borderBottomWidth: 0.5,
                borderBottomColor: theme.navBorder,
                paddingHorizontal: 12,
                paddingVertical: 12,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
              }}
            >
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
                <Text style={{ fontFamily: "Outfit-Bold", color: "#fff", fontSize: 13 }}>
                  {user.displayName?.charAt(0) ?? "U"}
                </Text>
              </View>

              <View style={{ flex: 1, overflow: "hidden" }}>
                <Text
                  numberOfLines={1}
                  style={{
                    fontFamily: "Outfit-SemiBold",
                    fontSize: 12.5,
                    color: theme.textActive,
                    lineHeight: 17,
                  }}
                >
                  {user.displayName}
                </Text>
                <Text
                  style={{
                    fontFamily: "Outfit",
                    fontSize: 11,
                    color: theme.textInactive,
                    textTransform: "capitalize",
                  }}
                >
                  {user.role}
                </Text>
              </View>

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
            </View>

            {/* Settings popout — anchored under the user info row */}
            {settingsOpen && (
              <View
                style={{
                  marginHorizontal: 8,
                  marginTop: 6,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.navBorder,
                  backgroundColor: theme.surface,
                  overflow: "hidden",
                }}
              >
                <TouchableOpacity
                  onPress={handleThemeCycle}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                  }}
                >
                  <ThemeIcon color={theme.iconActive} size={16} />
                  <Text
                    style={{
                      fontFamily: "Outfit-SemiBold",
                      fontSize: 13.5,
                      color: theme.textActive,
                      flex: 1,
                    }}
                  >
                    {currentTheme.label}
                  </Text>
                  <View
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 999,
                      backgroundColor: theme.iconActive,
                    }}
                  />
                </TouchableOpacity>

                <View style={{ height: 0.5, backgroundColor: theme.navBorder }} />

                <TouchableOpacity
                  onPress={() => {
                    setSettingsOpen(false);
                    setLogoutModalVisible(true);
                  }}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                  }}
                >
                  <LogOut color="#f87171" size={16} />
                  <Text
                    style={{
                      fontFamily: "Outfit",
                      fontSize: 13.5,
                      color: "#f87171",
                      flex: 1,
                    }}
                  >
                    Log out
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Scrollable nav */}
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{
                paddingVertical: 12,
                paddingBottom: insets.bottom + 12,
              }}
              showsVerticalScrollIndicator={false}
            >
              {sections.map((section, sIdx) => (
                <View
                  key={sIdx}
                  style={
                    sIdx > 0
                      ? {
                          marginTop: 8,
                          borderTopWidth: 0.5,
                          borderTopColor: theme.navBorder,
                          paddingTop: 8,
                        }
                      : undefined
                  }
                >
                  {section.sectionLabel && (
                    <Text
                      style={{
                        fontFamily: "Outfit-SemiBold",
                        fontSize: 10,
                        letterSpacing: 0.8,
                        color: C.textInactive,
                        textTransform: "uppercase",
                        paddingHorizontal: 20,
                        paddingBottom: 4,
                      }}
                    >
                      {section.sectionLabel}
                    </Text>
                  )}
                  {section.items.map(renderNavItem)}
                </View>
              ))}
            </ScrollView>
          </Animated.View>
        </Modal>
      )}

      <LogoutModal
        visible={logoutModalVisible}
        onConfirm={handleLogoutConfirm}
        onCancel={() => setLogoutModalVisible(false)}
      />
    </>
  );
}