import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { db } from "./firebase"; // adjust path as needed
import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";

// ─── Config ────────────────────────────────────────────────────────────────────
const BACKEND_URL = "http://10.10.10.1:3000";

// ─── Types ─────────────────────────────────────────────────────────────────────
type UserRole = "employee" | "it" | "admin";

type ADUser = {
  username: string;
  displayName: string;
  email: string;
  department: string;
  title: string;
  phone: string;
  role: UserRole;
};

type ADLoginResponse = {
  success: boolean;
  token?: string;
  message?: string;
  user?: ADUser;
  displayName?: string;
};

// ─── Firestore structure written after AD login ────────────────────────────────
//
//  IT_Users                          <- collection
//  └── "Henrick Patenio"             <- document ID = Full Name (displayName)
//       username:   "hpatenio"
//       email:      "hpatenio@ocgbim.com"
//       Department: "Information Technology"
//       role:       "it"

// ─── Step 1: Validate credentials against AD backend ──────────────────────────
async function validateWithAD(
  username: string,
  password: string
): Promise<ADLoginResponse> {
  const res = await fetch(`${BACKEND_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return res.json();
}

// ─── Step 2: Save/update AD user data into Firestore IT_Users ─────────────────
// Uses the Full Name (displayName) as the document ID.
// setDoc with merge:true updates existing docs without overwriting other fields.
async function saveUserToFirestore(user: ADUser): Promise<void> {
  try {
    const usersRef = collection(db, "IT_Users");

    // Find the existing doc by matching the username field
    // This handles the case where the doc was manually created with the Full Name as ID
    const q = query(usersRef, where("username", "==", user.username.toLowerCase().trim()));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      // Doc already exists — do nothing, just let them log in
      console.log("Firestore: doc already exists for:", snapshot.docs[0].id);
      return;
    }

    // First time login — create new doc using Full Name (displayName) as doc ID
    const resolvedEmail = user.email || `${user.username}@ocgbim.com`;
    const newDocRef = doc(db, "IT_Users", user.displayName);
    await setDoc(newDocRef, {
      username:   user.username,
      email:      resolvedEmail,
      Department: user.department,
      role:       user.role,
    });
    console.log("Firestore created:", user.displayName);
  } catch (err) {
    // Non-fatal — user is still logged in even if Firestore write fails
    console.error("Firestore save error:", err);
  }
}

// ─── Step 3: Fetch existing profile from Firestore (optional enrichment) ───────
async function fetchProfileFromFirestore(
  username: string
): Promise<ADUser | null> {
  try {
    const usersRef = collection(db, "IT_Users");

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
      username:    data.username   ?? username,
      displayName: docSnap.id,                        // doc ID = Full Name
      email:       data.email      ?? `${username}@ocgbim.com`,
      department:  data.Department ?? data.department ?? "",
      title:       data.title      ?? "",
      phone:       data.phone      ?? "",
      role:        (data.role as UserRole) ?? "it",
    };
  } catch (err) {
    console.error("Firestore fetch error:", err);
    return null;
  }
}

// ─── Combined login flow ───────────────────────────────────────────────────────
//
//  1. POST /auth/login  ->  AD validates password
//  2. Build ADUser from AD response
//  3. saveUserToFirestore()  ->  writes/updates IT_Users/{Full Name}
//  4. Return user to the app
//
async function handleSignIn(
  username: string,
  password: string
): Promise<{ success: boolean; user?: ADUser; message?: string }> {
  // 1. Authenticate against AD
  const adResult = await validateWithAD(username, password);
  console.log("AD raw response:", JSON.stringify(adResult));
  if (!adResult.success) {
    return { success: false, message: adResult.message || "Login failed. Please try again." };
  }

  // 2. Build the user object from the AD backend response
  const adUser = adResult.user;
  const user: ADUser = {
    username:    adUser?.username                          ?? username,
    displayName: adUser?.displayName                       ?? username,
    email:       adUser?.email                             ?? `${username}@ocgbim.com`,
    department:  adUser?.department                        ?? "",
    title:       adUser?.title                             ?? "",
    phone:       adUser?.phone                             ?? "",
    role:        (adUser?.role as UserRole)                ?? "it",
  };

  // 3. Fetch Firestore profile — role in Firestore overrides AD role
  const firestoreProfile = await fetchProfileFromFirestore(username);
  if (firestoreProfile) {
    // Doc exists — use Firestore role (so you can manually change it for testing)
    user.role = firestoreProfile.role;
    console.log("Firestore role used:", user.role);
  } else {
    // No doc yet — create it in the background with AD data
    saveUserToFirestore(user);
  }

  // 4. Return the fully populated user
  return { success: true, user };
}

// ─── Role styles ───────────────────────────────────────────────────────────────
function getRoleStyle(role: UserRole): { bg: string; text: string; label: string } {
  const map: Record<UserRole, { bg: string; text: string; label: string }> = {
    it:       { bg: "bg-blue-900",   text: "text-blue-300",   label: "IT" },
    admin:    { bg: "bg-purple-900", text: "text-purple-300", label: "Admin" },
    employee: { bg: "bg-slate-700",  text: "text-slate-300",  label: "Employee" },
  };
  return map[role];
}

// ─── Component ─────────────────────────────────────────────────────────────────
export default function AuthScreen() {
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading]   = useState<boolean>(false);
  const [error, setError]       = useState<string>("");
  const [user, setUser]         = useState<ADUser | null>(null);

  const handleLogin = async (): Promise<void> => {
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
      } else {
        setError(response.message || "Login failed. Please try again.");
      }
    } catch {
      setError("Cannot reach the server. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = (): void => {
    setUser(null);
    setUsername("");
    setPassword("");
    setError("");
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
                <Text className="text-slate-200 text-xs font-medium">
                  {user.email || `${user.username}@ocgbim.com`}
                </Text>
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
            <Text className="text-slate-500 text-sm mb-5">
              Use your company Windows account
            </Text>

            <View className="bg-blue-950 border border-blue-900 rounded-xl p-3 mb-5 flex-row items-center gap-2">
              <Text className="text-blue-400 text-xs">
                🏢  Login with your AD username · ocgbim.com
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
              onChangeText={(text: string) => setUsername(text)}
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
              onChangeText={(text: string) => setPassword(text)}
              secureTextEntry
              autoCapitalize="none"
              onSubmitEditing={handleLogin}
            />
            <Text className="text-slate-600 text-xs mb-5">
              Same password you use to log in to your work PC
            </Text>

            <TouchableOpacity
              className={`rounded-xl py-3 items-center ${
                loading ? "bg-blue-950" : "bg-blue-600"
              }`}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white text-sm font-semibold">
                  Sign in with AD
                </Text>
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
