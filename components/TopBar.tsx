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

// ─── Icons ────────────────────────────────────────────────────────────────────

const SearchIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Circle cx="11" cy="11" r="8" stroke="#669BAE" strokeWidth="2" />
    <Path
      d="M21 21l-4.35-4.35"
      stroke="#669BAE"
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
  const isMobile = width < 768;

  if (isMobile) {
    return (
      <View
        style={{
          backgroundColor: "#EEF7FB",
          borderBottomWidth: 0.5,
          borderBottomColor: "#E8F4F8",
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
            className="text-[#1D4B5C] text-2xl"
            style={{ fontFamily: "Outfit_600SemiBold" }}
          >
            {title}
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity
              onPress={onBellPress}
              className="w-10 h-10 items-center justify-center rounded-xl border border-[#E8F4F8]"
            >
              <BellIcon color="#669BAE" size={22} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onProfilePress}
              className="w-10 h-10 items-center justify-center rounded-xl border border-[#E8F4F8]"
            >
              <ProfileIcon color="#669BAE" size={22} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Row 2 */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "white",
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 10,
              gap: 8,
              borderWidth: 0.5,
              borderColor: "#E8F4F8",
            }}
          >
            <SearchIcon />
            <TextInput
              placeholder="Search tickets, items, user..."
              placeholderTextColor="#93D3EA"
              style={{
                fontFamily: "DMSans_400Regular",
                fontSize: 14,
                color: "#1D4B5C",
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
        backgroundColor: "#EEF7FB",
        borderBottomWidth: 0.5,
        borderBottomColor: "#E8F4F8",
        gap: 16,
        marginTop: 12,
      }}
    >
      <Text
        className="text-[#1D4B5C] text-4xl flex-1"
        style={{ fontFamily: "Outfit_600SemiBold" }}
      >
        {title}
      </Text>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "white",
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 14,
          gap: 8,
          borderWidth: 0.5,
          borderColor: "#E8F4F8",
          width: 500,
        }}
      >
        <SearchIcon />
        <TextInput
          placeholder="Search tickets, items, user..."
          placeholderTextColor="#93D3EA"
          style={{
            fontFamily: "DMSans_400Regular",
            fontSize: 15,
            color: "#1D4B5C",
            flex: 1,
            padding: 0,
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
          borderColor: "#E8F4F8",
        }}
        activeOpacity={0.7}
      >
        <BellIcon color="#669BAE" />
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
          borderColor: "#E8F4F8",
        }}
        activeOpacity={0.7}
      >
        <ProfileIcon color="#669BAE" />
      </TouchableOpacity>
    </View>
  );
}
