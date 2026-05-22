import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { ADUser } from "../../types";
import { logout } from "../auth/Logout";

type Props = {
  user: ADUser;
  onLogout: () => void;
};

export default function AdminDashboard({ user, onLogout }: Props) {
  const handleLogout = async () => {
    console.log("Logging out...");
    await logout();
    onLogout();
  };

  return (
    <ScrollView className="flex-1 bg-slate-950">
      <View className="p-6">
        <View className="bg-slate-800 rounded-2xl p-5 mb-4">
          <Text className="text-white text-2xl font-bold">
            Welcome, {user.displayName.split(" ")[0]}! 👋
          </Text>
          <Text className="text-slate-400 text-sm mt-1">
            Admin Dashboard · {user.department}
          </Text>
        </View>

        <TouchableOpacity
          className="bg-slate-700 rounded-xl py-3 items-center"
          onPress={handleLogout}
        >
          <Text className="text-slate-200 text-sm font-semibold">Log out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}