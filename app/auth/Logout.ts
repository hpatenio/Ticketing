// auth.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "AD_USER_DATA";

export async function logout(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error("Logout error:", err);
  }
}