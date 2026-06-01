import { View, Text, TouchableOpacity, Modal, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MENU_BY_ROLE, getNavColors } from "./NavItems";
import { ADUser } from "../../types";
import { useTheme } from "../../theme/ThemeContext";
import { Sun, Moon, Monitor, Settings } from "lucide-react-native";
import { useState } from "react";

type BottomNavBarProps = {
  user: ADUser;
  activeKey: string;
  onNavigate: (key: string) => void;
};

export default function BottomNavBar({
  user,
  activeKey,
  onNavigate,
}: BottomNavBarProps) {
  const insets = useSafeAreaInsets();
  const { theme, themeMode, setThemeMode } = useTheme();
  const C = getNavColors(theme);
  const [themePickerOpen, setThemePickerOpen] = useState(false);

  const items = MENU_BY_ROLE[user.role] ?? MENU_BY_ROLE.employee;
  const visibleItems = items.slice(0, 4);

  const themeOptions = [
    { mode: "light" as const, label: "Light", Icon: Sun },
    { mode: "dark" as const, label: "Dark", Icon: Moon },
    { mode: "system" as const, label: "System", Icon: Monitor },
  ];

  const ActiveThemeIcon =
    themeMode === "dark" ? Moon : themeMode === "light" ? Sun : Monitor;

  return (
    <>
      {/* Theme picker popout — sits just above the nav bar */}
      {themePickerOpen && (
        <>
          {/* Backdrop to dismiss */}
          <Pressable
            onPress={() => setThemePickerOpen(false)}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 98,
            }}
          />

          {/* Popout panel */}
          <View
            style={{
              position: "absolute",
              bottom: 60 + insets.bottom + 8,
              right: 8,
              width: 160,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: theme.navBorder,
              backgroundColor: theme.surface,
              overflow: "hidden",
              zIndex: 99,
              shadowColor: "#000",
              shadowOpacity: 0.08,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 6,
            }}
          >
            {themeOptions.map(({ mode, label, Icon }, i) => {
              const isSelected = themeMode === mode;
              return (
                <TouchableOpacity
                  key={mode}
                  onPress={() => {
                    setThemeMode(mode);
                    setThemePickerOpen(false);
                  }}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    backgroundColor: isSelected
                      ? theme.bgActive
                      : "transparent",
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
                      fontFamily: isSelected
                        ? "DMSans_600SemiBold"
                        : "DMSans_400Regular",
                      fontSize: 14,
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
        </>
      )}

      {/* Bottom nav bar */}
      <View
        style={{
          paddingBottom: insets.bottom,
          flexDirection: "row",
          backgroundColor: C.sidebarBg,
          borderTopWidth: 0.5,
          borderTopColor: C.border,
          height: 60 + insets.bottom,
        }}
      >
        {visibleItems.map((item) => {
          const isActive = item.key === activeKey;
          const Icon = item.icon;

          return (
            <TouchableOpacity
              key={item.key}
              onPress={() => onNavigate(item.key)}
              activeOpacity={0.7}
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 8,
              }}
            >
              {isActive && (
                <View
                  style={{
                    position: "absolute",
                    top: 0,
                    alignSelf: "center",
                    width: 24,
                    height: 2,
                    backgroundColor: C.activeBar,
                    borderRadius: 999,
                  }}
                />
              )}
              <Icon
                color={isActive ? C.iconActive : C.iconInactive}
                size={22}
              />
              <Text
                style={{
                  fontFamily: isActive
                    ? "DMSans_600SemiBold"
                    : "DMSans_400Regular",
                  fontSize: 10,
                  color: isActive ? C.textActive : C.textInactive,
                  marginTop: 3,
                }}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* Theme button */}
        <TouchableOpacity
          onPress={() => setThemePickerOpen((prev) => !prev)}
          activeOpacity={0.7}
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 8,
          }}
        >
          {themePickerOpen && (
            <View
              style={{
                position: "absolute",
                top: 0,
                alignSelf: "center",
                width: 24,
                height: 2,
                backgroundColor: C.activeBar,
                borderRadius: 999,
              }}
            />
          )}
          <ActiveThemeIcon
            color={themePickerOpen ? C.iconActive : C.iconInactive}
            size={22}
          />
          <Text
            style={{
              fontFamily: themePickerOpen
                ? "DMSans_600SemiBold"
                : "DMSans_400Regular",
              fontSize: 10,
              color: themePickerOpen ? C.textActive : C.textInactive,
              marginTop: 3,
            }}
          >
            Theme
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );
}
