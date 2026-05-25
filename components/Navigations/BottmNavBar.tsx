import { View, Text, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MENU_BY_ROLE, C } from "./NavItems";
import { ADUser } from "../../types";

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
  const items = MENU_BY_ROLE[user.role] ?? MENU_BY_ROLE.employee;

  // Limit to 5 items max for bottom nav
  const visibleItems = items.slice(0, 5);

  return (
  <View
    style={{
      paddingBottom: insets.bottom,
      flexDirection: "row",
      backgroundColor: "white",
      borderTopWidth: 0.5,
      borderTopColor: "#E8F4F8",
      height: 60 + insets.bottom,  // ← explicit height
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
          <Icon color={isActive ? C.iconActive : C.iconInactive} size={22} />
          <Text
            style={{
              fontFamily: isActive ? "DMSans_600SemiBold" : "DMSans_400Regular",
              fontSize: 10,
              color: isActive ? C.textActive : C.textInactive,
              marginTop: 3,
            }}
          >
            {item.label}
          </Text>
          {isActive && (
            <View
              style={{
                position: "absolute",
                top: 0,
                alignSelf: "center",
                width: 24,
                height: 2,
                backgroundColor: "#35A2CA",
                borderRadius: 999,
              }}
            />
          )}
        </TouchableOpacity>
      );
    })}
  </View>
);
}
