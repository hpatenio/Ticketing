import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "../../firebase";
import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { logout } from "./Logout";
import { ADUser, UserRole } from "../../types";

const BACKEND_URL = "http://10.10.10.98:3000";
const STORAGE_KEY = "AD_USER_DATA";

// ─── Derive role from AD department ───────────────────────────────────────────
function getRoleFromDepartment(department: string): UserRole {
  const dept = department.toLowerCase().trim();
  console.log("Department from AD:", dept);
  if (dept.includes("information technology") || dept.includes(" it") || dept === "it") return "superadmin";
  if (dept.includes("admin")) return "admin";
  return "employee";
}

// ─── Get Firestore collection based on role ────────────────────────────────────
function getCollectionForRole(role: UserRole): string {
  const map: Record<UserRole, string> = {
    superadmin: "superadmin_users",
    admin:      "admin_users",
    employee:   "employee_users",
  };
  return map[role];
}

// ─── Role badge styles ─────────────────────────────────────────────────────────
function getRoleStyle(role: UserRole): { bg: string; text: string; label: string } {
  const map: Record<UserRole, { bg: string; text: string; label: string }> = {
    superadmin: { bg: "bg-blue-900",   text: "text-blue-300",   label: "Super Admin" },
    admin:      { bg: "bg-purple-900", text: "text-purple-300", label: "Admin"       },
    employee:   { bg: "bg-slate-700",  text: "text-slate-300",  label: "Employee"    },
  };
  return map[role];
}

// ─── Step 1: Validate credentials against AD backend ──────────────────────────
async function validateWithAD(username: string, password: string) {
  const res = await fetch(`${BACKEND_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return res.json();
}

// ─── Step 2: Save user to role-based Firestore collection ─────────────────────
async function saveUserToFirestore(user: ADUser): Promise<void> {
  try {
    const collectionName = getCollectionForRole(user.role);
    const usersRef = collection(db, collectionName);

    const q = query(usersRef, where("username", "==", user.username.toLowerCase().trim()));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      console.log("Firestore: doc already exists for:", snapshot.docs[0].id);
      return;
    }

    const resolvedEmail = user.email || `${user.username}@ocgbim.com`;
    const newDocRef = doc(db, collectionName, user.displayName);
    await setDoc(newDocRef, {
      username:   user.username,
      email:      resolvedEmail,
      Department: user.department,
      role:       user.role,
    });
    console.log(`Firestore created in ${collectionName}:`, user.displayName);
  } catch (err) {
    console.error("Firestore save error:", err);
  }
}

// ─── Step 3: Fetch profile from correct role collection ───────────────────────
async function fetchProfileFromFirestore(username: string, role: UserRole): Promise<ADUser | null> {
  try {
    const collectionName = getCollectionForRole(role);
    const usersRef = collection(db, collectionName);

    let q = query(usersRef, where("username", "==", username.trim()));
    let snapshot = await getDocs(q);

    if (snapshot.empty) {
      q = query(usersRef, where("username", "==", username.toLowerCase().trim()));
      snapshot = await getDocs(q);
    }

    if (snapshot.empty) return null;

    const docSnap = snapshot.docs[0];
    const data = docSnap.data();

    return {
      username:    data.username    ?? username,
      displayName: docSnap.id,
      email:       data.email       ?? `${username}@ocgbim.com`,
      department:  data.Department  ?? data.department ?? "",
      title:       data.title       ?? "",
      phone:       data.phone       ?? "",
      role:        (data.role as UserRole) ?? "employee",
    };
  } catch (err) {
    console.error("Firestore fetch error:", err);
    return null;
  }
}

// ─── Combined login flow ───────────────────────────────────────────────────────
async function handleSignIn(
  username: string,
  password: string,
): Promise<{ success: boolean; user?: ADUser; message?: string }> {
  const adResult = await validateWithAD(username, password);
  console.log("AD raw response:", JSON.stringify(adResult));

  if (!adResult.success) {
    return { success: false, message: adResult.message || "Login failed. Please try again." };
  }

  const adUser = adResult.user;
  const user: ADUser = {
    username:    adUser?.username    ?? username,
    displayName: adUser?.displayName ?? username,
    email:       adUser?.email       ?? `${username}@ocgbim.com`,
    department:  adUser?.department  ?? "",
    title:       adUser?.title       ?? "",
    phone:       adUser?.phone       ?? "",
    role:        getRoleFromDepartment(adUser?.department ?? ""),
  };

  const firestoreProfile = await fetchProfileFromFirestore(username, user.role);
  console.log("Firestore profile found:", firestoreProfile);

  if (firestoreProfile) {
    user.role = firestoreProfile.role;
    console.log("Firestore role used:", user.role);
  } else {
    saveUserToFirestore(user);
  }

  return { success: true, user };
}

// ─── Component ─────────────────────────────────────────────────────────────────
type Props = {
  onLoginSuccess: (user: ADUser) => void;
  onLogout: () => void;
};

export default function AuthScreen({ onLoginSuccess, onLogout }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [user,     setUser]     = useState<ADUser | null>(null);

  useEffect(() => {
    const restoreUser = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsedUser = JSON.parse(saved);
          setUser(parsedUser);
          onLoginSuccess(parsedUser);
        }
      } catch (err) {
        console.error("Restore auth error:", err);
      }
    };
    restoreUser();
  }, []);

  const handleLogin = async () => {
    setError("");
    if (!username.trim()) { setError("Please enter your username."); return; }
    if (!password)        { setError("Please enter your password.");  return; }

    setLoading(true);
    try {
      const response = await handleSignIn(username.trim(), password);
      if (response.success && response.user) {
        setUser(response.user);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(response.user));
        onLoginSuccess(response.user);
      } else {
        setError(response.message || "Login failed. Please try again.");
      }
    } catch {
      setError("Cannot reach the server. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setUsername("");
    setPassword("");
    setError("");
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      onLogout();
    } catch (err) {
      console.error("Logout storage clear error:", err);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-slate-950"
      contentContainerClassName="flex-grow items-center justify-center p-4"
      keyboardShouldPersistTaps="handled"
    >
      <View className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-7">

        {/* Logo */}
        <View className="flex-row items-center gap-3 mb-7">
          <View className="w-10 h-10 bg-blue-700 rounded-xl items-center justify-center">
            <Text className="text-xl">🎫</Text>
          </View>
          <View>
            <Text className="text-slate-200 text-base font-bold">Silverdab</Text>
            <Text className="text-slate-500 text-xs">Unified Ticketing System</Text>
          </View>
        </View>

        {user ? (
          <>
            <Text className="text-slate-100 text-xl font-bold mb-1">
              Welcome, {user.displayName.split(" ")[0]}! 👋
            </Text>
            <Text className="text-slate-500 text-xs mb-5">
              Authenticated via Active Directory · ocgbim.com
            </Text>

            {/* Role Badge */}
            <View className="flex-row mb-4">
              <View className={`px-3 py-1 rounded-full ${getRoleStyle(user.role).bg}`}>
                <Text className={`text-xs font-semibold uppercase tracking-wider ${getRoleStyle(user.role).text}`}>
                  {getRoleStyle(user.role).label}
                </Text>
              </View>
            </View>

            {/* User Info Card */}
            <View className="bg-slate-800 border border-slate-700 rounded-2xl p-4 mb-4 gap-3">
              <View className="flex-row justify-between items-center">
                <Text className="text-slate-500 text-xs">Full Name</Text>
                <Text className="text-slate-200 text-xs font-semibold">{user.displayName}</Text>
              </View>
              <View className="h-px bg-slate-700" />
              <View className="flex-row justify-between items-center">
                <Text className="text-slate-500 text-xs">Username</Text>
                <Text className="text-slate-200 text-xs font-medium">{user.username}</Text>
              </View>
              <View className="h-px bg-slate-700" />
              <View className="flex-row justify-between items-center">
                <Text className="text-slate-500 text-xs">Email</Text>
                <Text className="text-slate-200 text-xs font-medium">{user.email || `${user.username}@ocgbim.com`}</Text>
              </View>
              <View className="h-px bg-slate-700" />
              <View className="flex-row justify-between items-center">
                <Text className="text-slate-500 text-xs">Department</Text>
                <Text className="text-slate-200 text-xs font-medium">{user.department || "—"}</Text>
              </View>
              {user.title ? (
                <>
                  <View className="h-px bg-slate-700" />
                  <View className="flex-row justify-between items-center">
                    <Text className="text-slate-500 text-xs">Title</Text>
                    <Text className="text-slate-200 text-xs font-medium">{user.title}</Text>
                  </View>
                </>
              ) : null}
              {user.phone ? (
                <>
                  <View className="h-px bg-slate-700" />
                  <View className="flex-row justify-between items-center">
                    <Text className="text-slate-500 text-xs">Phone</Text>
                    <Text className="text-slate-200 text-xs font-medium">{user.phone}</Text>
                  </View>
                </>
              ) : null}
            </View>

            {/* AD + Firestore indicator */}
            <View className="bg-blue-950 border border-blue-900 rounded-xl p-3 mb-4 flex-row items-center gap-2">
              <View className="w-2 h-2 rounded-full bg-green-400" />
              <Text className="text-blue-300 text-xs">
                Connected to AD + Firestore · ocgbim.com
              </Text>
            </View>

            <TouchableOpacity
              className="bg-slate-700 rounded-xl py-3 items-center"
              onPress={handleLogout}
            >
              <Text className="text-slate-200 text-sm font-semibold">Log out</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text className="text-slate-100 text-2xl font-bold mb-1">Sign in</Text>
            <Text className="text-slate-500 text-sm mb-5">Use your company Windows account</Text>

            <View className="bg-blue-950 border border-blue-900 rounded-xl p-3 mb-5 flex-row items-center gap-2">
              <Text className="text-blue-400 text-xs">
                🏢 Login with your AD username · ocgbim.com
              </Text>
            </View>

            {error ? (
              <View className="bg-red-950 border border-red-900 rounded-xl p-3 mb-4">
                <Text className="text-red-300 text-sm">⚠ {error}</Text>
              </View>
            ) : null}

            <Text className="text-slate-400 text-xs font-medium mb-1.5 tracking-wide uppercase">
              Username
            </Text>
            <TextInput
              className="bg-slate-950 border border-slate-800 rounded-xl px-4 text-slate-200 text-sm mb-1"
              style={{ paddingVertical: Platform.OS === "ios" ? 12 : 10 }}
              placeholder="e.g. hpatenio"
              placeholderTextColor="#4B5563"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text className="text-slate-600 text-xs mb-4">
              Your Windows login username (e.g. hpatenio for Henrick Patenio)
            </Text>

            <Text className="text-slate-400 text-xs font-medium mb-1.5 tracking-wide uppercase">
              Password
            </Text>
            <TextInput
              className="bg-slate-950 border border-slate-800 rounded-xl px-4 text-slate-200 text-sm mb-1"
              style={{ paddingVertical: Platform.OS === "ios" ? 12 : 10 }}
              placeholder="Your Windows password"
              placeholderTextColor="#4B5563"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              onSubmitEditing={handleLogin}
            />
            <Text className="text-slate-600 text-xs mb-5">
              Same password you use to log in to your work PC
            </Text>

            <TouchableOpacity
              className={`rounded-xl py-3 items-center ${loading ? "bg-blue-950" : "bg-blue-600"}`}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white text-sm font-semibold">Sign in with AD</Text>
              )}
            </TouchableOpacity>

            <View className="flex-row items-center justify-center mt-5 gap-2">
              <View className="w-2 h-2 rounded-full bg-blue-500" />
              <Text className="text-slate-600 text-xs">
                Authenticating via Active Directory · ocgbim.com
              </Text>
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}