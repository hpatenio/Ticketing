import { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { loadUsers as loadADUsers, clearEmployeeUsers } from "./utils/adUsers";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import { ADUser } from "../../types";
import { useTheme } from "../../theme/ThemeContext";

type EnrichedUser = ADUser & { hasLoggedIn: boolean };

type Props = {
  currentUser: ADUser;
};

function getRoleStyle(role: string): {
  bg: string;
  text: string;
  label: string;
} {
  switch (role) {
    case "superadmin":
      return { bg: "#1e3a5f", text: "#93c5fd", label: "Super Admin" };
    case "admin":
      return { bg: "#3b1f5e", text: "#d8b4fe", label: "Admin" };
    default:
      return { bg: "#2d3748", text: "#cbd5e0", label: "Employee" };
  }
}

function getInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  const first = parts[0][0];
  const last = parts[parts.length - 1][0];
  return `${first}${last}`.toUpperCase();
}

export default function UsersPage({ currentUser }: Props) {
  const { theme } = useTheme();
  const [users, setUsers] = useState<EnrichedUser[]>([]);
  const [filtered, setFiltered] = useState<EnrichedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [lastSynced, setLastSynced] = useState<string>("");
  const [clearing, setClearing] = useState(false);
  async function handleClearAndResync() {
    setClearing(true);
    try {
      await clearEmployeeUsers();
      await fetchUsers(true);
    } catch (err) {
      console.error("Clear error:", err);
    } finally {
      setClearing(false);
    }
  }
  const [roleFilter, setRoleFilter] = useState<
    "all" | "superadmin" | "admin" | "employee"
  >("all");

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    let result = users;
    if (roleFilter !== "all") {
      result = result.filter((u) => u.role === roleFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (u) =>
          u.displayName?.toLowerCase().includes(q) ||
          u.username?.toLowerCase().includes(q) ||
          u.department?.toLowerCase().includes(q),
      );
    }
    setFiltered(result);
  }, [search, roleFilter, users]);

  async function fetchUsers(forceSync = false) {
    if (forceSync) {
      setSyncing(true);
    } else {
      setLoading(true);
    }
    setError("");

    try {
      const { users: adUsers, synced } = await loadADUsers(forceSync);
      console.log(
        synced ? "✅ Synced from AD" : "⚡ Loaded from Firestore cache",
      );

      if (synced) {
        setLastSynced(new Date().toLocaleTimeString());
      }

      // Check who has logged in
      const snap = await getDocs(collection(db, "employee_users"));
      const loggedInUsernames = new Set<string>();
      snap.forEach((doc) => {
        const username = doc.data().username?.toLowerCase().trim();
        if (username) loggedInUsernames.add(username);
      });

      const enriched: EnrichedUser[] = adUsers.map((u) => ({
        ...u,
        hasLoggedIn: loggedInUsernames.has(u.username.toLowerCase().trim()),
      }));

      setUsers(enriched);
    } catch (err) {
      setError("Failed to load users. Check backend connection.");
      console.error(err);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }

  const totalSuperAdmin = users.filter((u) => u.role === "superadmin").length;
  const totalAdmin = users.filter((u) => u.role === "admin").length;
  const totalEmployee = users.filter((u) => u.role === "employee").length;
  const totalLoggedIn = users.filter((u) => u.hasLoggedIn).length;

  const roleTabs: Array<{ key: typeof roleFilter; label: string }> = [
    { key: "all", label: `All (${users.length})` },
    { key: "superadmin", label: `Super Admin (${totalSuperAdmin})` },
    { key: "admin", label: `Admin (${totalAdmin})` },
    { key: "employee", label: `Employee (${totalEmployee})` },
  ];

  if (loading) {
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
        <Text style={{ color: theme.subtext, marginTop: 12, fontSize: 13 }}>
          Fetching users from Active Directory...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          backgroundColor: theme.background,
        }}
      >
        <Text
          style={{
            color: "#f87171",
            fontSize: 14,
            textAlign: "center",
            marginBottom: 16,
          }}
        >
          ⚠ {error}
        </Text>
        <TouchableOpacity
          onPress={() => fetchUsers()}
          style={{
            backgroundColor: theme.iconActive,
            borderRadius: 10,
            paddingHorizontal: 20,
            paddingVertical: 10,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>
            Retry
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* ── Header ── */}
      <View
        style={{
          padding: 20,
          paddingBottom: 12,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View>
          <Text style={{ color: theme.text, fontSize: 20, fontWeight: "700" }}>
            User Accounts
          </Text>
          <Text style={{ color: theme.subtext, fontSize: 12, marginTop: 2 }}>
            {lastSynced
              ? `Last synced from AD · ${lastSynced}`
              : "Loaded from cache · ocgbim.com"}
          </Text>
        </View>

        {/* Sync button */}
        <TouchableOpacity
          onPress={() => fetchUsers(true)}
          disabled={syncing}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: theme.surface,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 7,
          }}
        >
          {syncing ? (
            <ActivityIndicator size="small" color={theme.iconActive} />
          ) : (
            <Text style={{ fontSize: 13 }}>🔄</Text>
          )}
          <Text style={{ color: theme.text, fontSize: 12, fontWeight: "600" }}>
            {syncing ? "Syncing..." : "Sync AD"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Stat Cards ── */}
      <View
        style={{
          flexDirection: "row",
          gap: 10,
          paddingHorizontal: 20,
          marginBottom: 16,
        }}
      >
        {[
          { label: "Total", value: users.length, color: theme.text },
          { label: "Super Admin", value: totalSuperAdmin, color: "#93c5fd" },
          { label: "Admin", value: totalAdmin, color: "#d8b4fe" },
          { label: "Logged In", value: totalLoggedIn, color: "#4ade80" },
        ].map((stat) => (
          <View
            key={stat.label}
            style={{
              flex: 1,
              backgroundColor: theme.surface,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 12,
              padding: 12,
            }}
          >
            <Text
              style={{ color: theme.subtext, fontSize: 10, marginBottom: 4 }}
            >
              {stat.label}
            </Text>
            <Text
              style={{ color: stat.color, fontSize: 22, fontWeight: "700" }}
            >
              {stat.value}
            </Text>
          </View>
        ))}
      </View>

      {/* ── Search ── */}
      <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search name, username, department…"
          placeholderTextColor={theme.subtext}
          style={{
            backgroundColor: theme.surface,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 9,
            color: theme.text,
            fontSize: 13,
          }}
        />
      </View>

      {/* ── Role Filter Tabs ── */}
      <View
        style={{
          flexDirection: "row",
          gap: 6,
          paddingHorizontal: 20,
          marginBottom: 12,
        }}
      >
        {roleTabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setRoleFilter(tab.key)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 8,
              backgroundColor:
                roleFilter === tab.key ? theme.iconActive : theme.surface,
              borderWidth: 1,
              borderColor:
                roleFilter === tab.key ? theme.iconActive : theme.border,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: "600",
                color: roleFilter === tab.key ? "#fff" : theme.subtext,
              }}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── User List ── */}
      {filtered.length === 0 ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ color: theme.subtext, fontSize: 13 }}>
            No users found.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.username}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: 32,
            gap: 8,
          }}
          renderItem={({ item }) => {
            const role = getRoleStyle(item.role);
            return (
              <View
                style={{
                  backgroundColor: theme.surface,
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 14,
                  padding: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                {/* Avatar */}
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: role.bg,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      color: role.text,
                      fontSize: 13,
                      fontWeight: "700",
                    }}
                  >
                    {getInitials(item.displayName || item.username)}
                  </Text>
                </View>

                {/* Info */}
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: theme.text,
                      fontSize: 13,
                      fontWeight: "600",
                    }}
                  >
                    {item.displayName || item.username}
                  </Text>
                  <Text
                    style={{ color: theme.subtext, fontSize: 11, marginTop: 1 }}
                  >
                    {item.username} · {item.department || "No department"}
                  </Text>
                </View>

                {/* Badges */}
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <View
                    style={{
                      backgroundColor: role.bg,
                      borderRadius: 99,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                    }}
                  >
                    <Text
                      style={{
                        color: role.text,
                        fontSize: 10,
                        fontWeight: "600",
                      }}
                    >
                      {role.label}
                    </Text>
                  </View>
                  <View
                    style={{
                      backgroundColor: item.hasLoggedIn
                        ? "#052e16"
                        : theme.bgActive,
                      borderRadius: 99,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                    }}
                  >
                    <Text
                      style={{
                        color: item.hasLoggedIn ? "#4ade80" : theme.subtext,
                        fontSize: 10,
                        fontWeight: "600",
                      }}
                    >
                      {item.hasLoggedIn ? "Logged in" : "Never logged in"}
                    </Text>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}
