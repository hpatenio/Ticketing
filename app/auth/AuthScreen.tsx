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
import { useTheme } from "../../theme/ThemeContext";

const BACKEND_URL = "http://10.10.10.98:3000";
const STORAGE_KEY = "AD_USER_DATA";

// ─── Role badge colors ─────────────────────────────────────────────────────────
function getRoleStyle(role: UserRole): {
  bg: string;
  text: string;
  label: string;
} {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    superadmin: { bg: "#1e3a5f", text: "#93c5fd", label: "Super Admin" },
    admin: { bg: "#3b1f5e", text: "#d8b4fe", label: "Admin" },
    employee: { bg: "#2d3748", text: "#cbd5e0", label: "Employee" },
  };
  return map[role] ?? { bg: "#2d3748", text: "#cbd5e0", label: "Employee" };
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

// ─── Step 2: Fetch role from Firestore employee_users ─────────────────────────
// Role is ONLY set by the superadmin in Firestore, never derived from AD
async function fetchRoleFromFirestore(username: string): Promise<UserRole> {
  try {
    const usersRef = collection(db, "employee_users");
    const q = query(
      usersRef,
      where("username", "==", username.toLowerCase().trim()),
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return "employee";
    const data = snapshot.docs[0].data();
    return (data.role as UserRole) ?? "employee";
  } catch (err) {
    console.error("Firestore role fetch error:", err);
    return "employee";
  }
}

// ─── Step 3: Save user to Firestore employee_users if not yet saved ───────────
async function saveUserToFirestore(user: ADUser): Promise<void> {
  try {
    const usersRef = collection(db, "employee_users");
    const q = query(
      usersRef,
      where("username", "==", user.username.toLowerCase().trim()),
    );
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      console.log("Firestore: user already exists:", snapshot.docs[0].id);
      return;
    }

    const newDocRef = doc(
      db,
      "employee_users",
      user.displayName || user.username,
    );
    await setDoc(newDocRef, {
      username: user.username.toLowerCase().trim(),
      displayName: user.displayName,
      email: user.email || `${user.username}@ocgbim.com`,
      department: user.department ?? "",
      title: user.title ?? "",
      phone: user.phone ?? "",
      role: "employee", // always default to employee, superadmin promotes later
    });
    console.log("Firestore: created employee_users doc for:", user.displayName);
  } catch (err) {
    console.error("Firestore save error:", err);
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
    return {
      success: false,
      message: adResult.message || "Login failed. Please try again.",
    };
  }

  const adUser = adResult.user;

  // Build user with employee role by default
  const user: ADUser = {
    username: adUser?.username ?? username,
    displayName: adUser?.displayName ?? username,
    email: adUser?.email ?? `${username}@ocgbim.com`,
    department: adUser?.department ?? "",
    title: adUser?.title ?? "",
    phone: adUser?.phone ?? "",
    role: "employee", // always start as employee
  };

  // Save to Firestore if first time (role stays "employee" until superadmin changes it)
  await saveUserToFirestore(user);

  // Read the role back from Firestore (superadmin may have already set it)
  const firestoreRole = await fetchRoleFromFirestore(username);
  user.role = firestoreRole;
  console.log("✅ Final role from Firestore:", user.role);

  return { success: true, user };
}

// ─── Component ─────────────────────────────────────────────────────────────────
type Props = {
  onLoginSuccess: (user: ADUser) => void;
  onLogout: () => void;
};

export default function AuthScreen({ onLoginSuccess, onLogout }: Props) {
  const { theme } = useTheme();
  const [restoring, setRestoring] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState<ADUser | null>(null);

  useEffect(() => {
    const restoreUser = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsedUser = JSON.parse(saved);
          const freshRole = await fetchRoleFromFirestore(parsedUser.username);
          parsedUser.role = freshRole;
          setUser(parsedUser);
          onLoginSuccess(parsedUser);
        }
      } catch (err) {
        console.error("Restore auth error:", err);
      } finally {
        setRestoring(false);
      }
    };
    restoreUser();
  }, []);
  const handleLogin = async () => {
    setError("");
    if (!username.trim()) {
      setError("Please enter your username.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);
    try {
      const response = await handleSignIn(username.trim(), password);
      if (response.success && response.user) {
        setUser(response.user);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(response.user)); // add back
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
  if (restoring) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.background,
        }}
      >
        <ActivityIndicator color={theme.iconActive} size="large" />
      </View>
    );
  }
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{
        flexGrow: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      keyboardShouldPersistTaps="handled"
    >
      <View
        style={{
          width: "100%",
          maxWidth: 384,
          backgroundColor: theme.surface,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 24,
          padding: 28,
        }}
      >
        {/* Logo */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            marginBottom: 28,
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              backgroundColor: theme.iconActive,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 20 }}>🎫</Text>
          </View>
          <View>
            <Text
              style={{ color: theme.text, fontSize: 15, fontWeight: "700" }}
            >
              Silverdab
            </Text>
            <Text style={{ color: theme.subtext, fontSize: 11 }}>
              Unified Ticketing System
            </Text>
          </View>
        </View>

        {user ? (
          <>
            <Text
              style={{
                color: theme.text,
                fontSize: 20,
                fontWeight: "700",
                marginBottom: 4,
              }}
            >
              Welcome, {user.displayName.split(" ")[0]}! 👋
            </Text>
            <Text
              style={{ color: theme.subtext, fontSize: 11, marginBottom: 20 }}
            >
              Authenticated via Active Directory · ocgbim.com
            </Text>

            {/* Role Badge */}
            <View style={{ flexDirection: "row", marginBottom: 16 }}>
              <View
                style={{
                  backgroundColor: getRoleStyle(user.role).bg,
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                  borderRadius: 99,
                }}
              >
                <Text
                  style={{
                    color: getRoleStyle(user.role).text,
                    fontSize: 10,
                    fontWeight: "600",
                    textTransform: "uppercase",
                    letterSpacing: 0.8,
                  }}
                >
                  {getRoleStyle(user.role).label}
                </Text>
              </View>
            </View>

            {/* User Info Card */}
            <View
              style={{
                backgroundColor: theme.bgActive,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 16,
                padding: 16,
                marginBottom: 16,
                gap: 12,
              }}
            >
              {[
                { label: "Full Name", value: user.displayName },
                { label: "Username", value: user.username },
                {
                  label: "Email",
                  value: user.email || `${user.username}@ocgbim.com`,
                },
                { label: "Department", value: user.department || "—" },
                ...(user.title ? [{ label: "Title", value: user.title }] : []),
                ...(user.phone ? [{ label: "Phone", value: user.phone }] : []),
              ].map((row, i, arr) => (
                <View key={row.label}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: theme.subtext, fontSize: 11 }}>
                      {row.label}
                    </Text>
                    <Text
                      style={{
                        color: theme.text,
                        fontSize: 11,
                        fontWeight: "600",
                      }}
                    >
                      {row.value}
                    </Text>
                  </View>
                  {i < arr.length - 1 && (
                    <View
                      style={{
                        height: 1,
                        backgroundColor: theme.border,
                        marginTop: 12,
                      }}
                    />
                  )}
                </View>
              ))}
            </View>

            {/* Status indicator */}
            <View
              style={{
                backgroundColor: theme.bgActive,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 12,
                padding: 12,
                marginBottom: 16,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 99,
                  backgroundColor: "#4ade80",
                }}
              />
              <Text style={{ color: theme.iconActive, fontSize: 11 }}>
                Connected to AD + Firestore · ocgbim.com
              </Text>
            </View>

            <TouchableOpacity
              style={{
                backgroundColor: theme.bgHover,
                borderRadius: 12,
                paddingVertical: 12,
                alignItems: "center",
              }}
              onPress={handleLogout}
            >
              <Text
                style={{ color: theme.text, fontSize: 13, fontWeight: "600" }}
              >
                Log out
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text
              style={{
                color: theme.text,
                fontSize: 22,
                fontWeight: "700",
                marginBottom: 4,
              }}
            >
              Sign in
            </Text>
            <Text
              style={{ color: theme.subtext, fontSize: 13, marginBottom: 20 }}
            >
              Use your company Windows account
            </Text>

            {/* AD info banner */}
            <View
              style={{
                backgroundColor: theme.bgActive,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 12,
                padding: 12,
                marginBottom: 20,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Text style={{ color: theme.iconActive, fontSize: 11 }}>
                🏢 Login with your AD username · ocgbim.com
              </Text>
            </View>

            {/* Error */}
            {error ? (
              <View
                style={{
                  backgroundColor:
                    theme.mode === "dark" ? "#2e0f0f" : "#fef2f2",
                  borderWidth: 1,
                  borderColor: theme.mode === "dark" ? "#7f1d1d" : "#fecaca",
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 16,
                }}
              >
                <Text
                  style={{
                    color: theme.mode === "dark" ? "#f87171" : "#b91c1c",
                    fontSize: 13,
                  }}
                >
                  ⚠ {error}
                </Text>
              </View>
            ) : null}

            {/* Username */}
            <Text
              style={{
                color: theme.subtext,
                fontSize: 10,
                fontWeight: "500",
                marginBottom: 6,
                textTransform: "uppercase",
                letterSpacing: 0.8,
              }}
            >
              Username
            </Text>
            <TextInput
              style={{
                backgroundColor: theme.background,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: Platform.OS === "ios" ? 12 : 10,
                color: theme.text,
                fontSize: 13,
                marginBottom: 4,
              }}
              placeholder="e.g. hpatenio"
              placeholderTextColor={theme.subtext}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text
              style={{ color: theme.subtext, fontSize: 11, marginBottom: 16 }}
            >
              Your Windows login username (e.g. hpatenio for Henrick Patenio)
            </Text>

            {/* Password */}
            <Text
              style={{
                color: theme.subtext,
                fontSize: 10,
                fontWeight: "500",
                marginBottom: 6,
                textTransform: "uppercase",
                letterSpacing: 0.8,
              }}
            >
              Password
            </Text>
            <TextInput
              style={{
                backgroundColor: theme.background,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: Platform.OS === "ios" ? 12 : 10,
                color: theme.text,
                fontSize: 13,
                marginBottom: 4,
              }}
              placeholder="Your Windows password"
              placeholderTextColor={theme.subtext}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              onSubmitEditing={handleLogin}
            />
            <Text
              style={{ color: theme.subtext, fontSize: 11, marginBottom: 20 }}
            >
              Same password you use to log in to your work PC
            </Text>

            {/* Sign in button */}
            <TouchableOpacity
              style={{
                backgroundColor: loading ? theme.bgActive : theme.iconActive,
                borderRadius: 12,
                paddingVertical: 12,
                alignItems: "center",
              }}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={theme.iconActive} />
              ) : (
                <Text
                  style={{ color: "#ffffff", fontSize: 13, fontWeight: "600" }}
                >
                  Sign in with AD
                </Text>
              )}
            </TouchableOpacity>

            {/* Footer */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                marginTop: 20,
                gap: 8,
              }}
            >
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 99,
                  backgroundColor: theme.iconActive,
                }}
              />
              <Text style={{ color: theme.subtext, fontSize: 11 }}>
                Authenticating via Active Directory · ocgbim.com
              </Text>
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}
