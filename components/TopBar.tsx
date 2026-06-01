import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import { Bell } from "lucide-react-native";
import { UserRound } from "lucide-react-native";
import { useTheme } from "../theme/ThemeContext";

// ─── Icons ────────────────────────────────────────────────────────────────────

const SearchIcon = ({ color }: { color: string }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Circle cx="11" cy="11" r="8" stroke={color} strokeWidth="2" />
    <Path
      d="M21 21l-4.35-4.35"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
  </Svg>
);

const BellIcon: React.FC<{ color: string; size?: number }> = ({
  color,
  size = 30,
}) => <Bell color={color} size={size} />;

const ProfileIcon: React.FC<{ color: string; size?: number }> = ({
  color,
  size = 30,
}) => <UserRound color={color} size={size} />;

// ─── TopBar ───────────────────────────────────────────────────────────────────

type TopBarProps = {
  title: string;
  onBellPress?: () => void;
  onProfilePress?: () => void;
};

export default function TopBar({
  title,
  onBellPress,
  onProfilePress,
}: TopBarProps) {
  const { width } = useWindowDimensions();
  const { theme } = useTheme();
  const isMobile = width < 768;

  if (isMobile) {
    return (
      <View
        style={{
          backgroundColor: theme.background,
          marginTop: 12,
        }}
      >
        {/* Row 1 */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: 8,
          }}
        >
          <Text
            style={{
              fontFamily: "Outfit_600SemiBold",
              fontSize: 24,
              color: theme.text,
            }}
          >
            {title}
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity
              onPress={onBellPress}
              style={{
                width: 40,
                height: 40,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.surface,
              }}
            >
              <BellIcon color={theme.subtext} size={22} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onProfilePress}
              style={{
                width: 40,
                height: 40,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.surface,
              }}
            >
              <ProfileIcon color={theme.subtext} size={22} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Row 2 — Search */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: theme.surface,
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 10,
              gap: 8,
              borderWidth: 0.5,
              borderColor: theme.border,
            }}
          >
            <SearchIcon color={theme.subtext} />
            <TextInput
              placeholder="Search tickets, items, user..."
              placeholderTextColor={theme.iconInactive}
              style={{
                fontFamily: "DMSans_400Regular",
                fontSize: 14,
                color: theme.text,
                flex: 1,
                padding: 0,
              }}
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 24,
        paddingVertical: 16,
        backgroundColor: theme.background,
        gap: 16,
        marginTop: 12,
      }}
    >
      <Text
        style={{
          fontFamily: "Outfit_600SemiBold",
          fontSize: 36,
          color: theme.text,
          flex: 1,
        }}
      >
        {title}
      </Text>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: theme.surface,
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 14,
          gap: 8,
          borderWidth: 0.5,
          borderColor: theme.border,
          width: 500,
        }}
      >
        <SearchIcon color={theme.subtext} />
        <TextInput
          placeholder="Search tickets, items, user..."
          placeholderTextColor={theme.iconInactive}
          style={{
            fontFamily: "DMSans_400Regular",
            fontSize: 15,
            color: theme.text,
            flex: 1,
            padding: 3,
          }}
        />
      </View>

      <TouchableOpacity
        onPress={onBellPress}
        style={{
          width: 40,
          height: 40,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 12,
          borderWidth: 0.5,
          borderColor: theme.border,
          backgroundColor: theme.surface,
        }}
        activeOpacity={0.7}
      >
        <BellIcon color={theme.subtext} />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onProfilePress}
        style={{
          width: 40,
          height: 40,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 12,
          borderWidth: 0.5,
          borderColor: theme.border,
          backgroundColor: theme.surface,
        }}
        activeOpacity={0.7}
      >
        <ProfileIcon color={theme.subtext} />
      </TouchableOpacity>
    </View>
  );
}
