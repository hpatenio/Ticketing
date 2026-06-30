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
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import { ADUser } from "../../types";
import { useTheme } from "../../theme/ThemeContext";
import { UserPermissions } from "../../types";

type EnrichedUser = ADUser & { hasLoggedIn: boolean };
type Props = { currentUser: ADUser };

// ✅ Cache stores username + permissions
let employeeUsersCache:
  | { username: string; permissions: UserPermissions }[]
  | null = null;

function getRoleStyle(role: string) {
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
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
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
  const [permissionUser, setPermissionUser] = useState<EnrichedUser | null>(
    null,
  );
  const [savingPermissions, setSavingPermissions] = useState(false);

  const PERMISSION_LABELS: {
    key: keyof EnrichedUser["permissions"];
    label: string;
  }[] = [
    { key: "itAccess", label: "IT Access" },
    { key: "officeSupplies", label: "Office Supplies" },
  ];

  const [roleFilter, setRoleFilter] = useState<
    "all" | "superadmin" | "admin" | "employee"
  >("all");

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    let result = users;
    if (roleFilter !== "all")
      result = result.filter((u) => u.role === roleFilter);
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

  async function savePermissions(
    user: EnrichedUser,
    permissions: UserPermissions,
  ) {
    setSavingPermissions(true);
    try {
      const usernameKey = user.username.toLowerCase().trim();
      const documentIds = Array.from(
        new Set(
          [usernameKey, (user.displayName || user.username).trim()].filter(
            Boolean,
          ),
        ),
      );

      const payload = {
        username: usernameKey,
        displayName: user.displayName,
        email: user.email || `${usernameKey}@ocgbim.com`,
        department: user.department ?? "",
        title: user.title ?? "",
        phone: user.phone ?? "",
        permissions,
      };

      await Promise.all(
        documentIds.map((docId) =>
          setDoc(doc(db, "employee_users", docId), payload, { merge: true }),
        ),
      );

      // ✅ Update cache in-place instead of just nulling it
      if (employeeUsersCache) {
        const key = usernameKey;
        const idx = employeeUsersCache.findIndex((u) => u.username === key);
        if (idx !== -1) {
          employeeUsersCache[idx] = { ...employeeUsersCache[idx], permissions };
        }
      }

      setUsers((prev) =>
        prev.map((u) =>
          u.username === user.username ? { ...u, permissions } : u,
        ),
      );
      setPermissionUser(null);
    } catch (err) {
      console.error("Failed to save permissions:", err);
    } finally {
      setSavingPermissions(false);
    }
  }

  async function handleClearAndResync() {
    setClearing(true);
    employeeUsersCache = null;
    try {
      await clearEmployeeUsers();
      await fetchUsers(true, true); // ← second arg = resetRoles
    } catch (err) {
      console.error("Clear error:", err);
    } finally {
      setClearing(false);
    }
  }

  async function fetchUsers(forceSync = false, resetRoles = false) {
    // ← NEW param
    forceSync ? setSyncing(true) : setLoading(true);
    setError("");

    try {
      const { users: adUsers, synced } = await loadADUsers(
        forceSync,
        resetRoles,
      ); // ← pass through
      // ...rest unchanged
      // Deduplicate by username just in case AD has duplicates
      const deduped = Array.from(
        new Map(
          adUsers.map((u) => [u.username.toLowerCase().trim(), u]),
        ).values(),
      );

      // adUsers from loadADUsers already have correct permissions + role from Firestore
      // We only need to determine hasLoggedIn (whether they exist in employee_users)
      if (!employeeUsersCache || forceSync) {
        const snap = await getDocs(collection(db, "employee_users"));
        const mergedMap = new Map<
          string,
          { username: string; permissions: UserPermissions }
        >();

        snap.docs.forEach((d) => {
          const username = d.data().username?.toLowerCase().trim() ?? "";
          if (!username) return;

          const p = d.data().permissions ?? {};
          const permissions = {
            itAccess:
              Boolean(p.itAccess) ||
              Boolean(p.itInventory) ||
              Boolean(p.consumables) ||
              Boolean(p.tickets),
            itInventory: Boolean(p.itInventory),
            consumables: Boolean(p.consumables),
            tickets: Boolean(p.tickets),
            officeSupplies:
              Boolean(p.officeSupplies) || Boolean(p.officesupplies),
          };

          const existing = mergedMap.get(username);
          if (!existing) {
            mergedMap.set(username, { username, permissions });
            return;
          }

          existing.permissions = {
            itAccess: existing.permissions.itAccess || permissions.itAccess,
            itInventory:
              existing.permissions.itInventory || permissions.itInventory,
            consumables:
              existing.permissions.consumables || permissions.consumables,
            tickets: existing.permissions.tickets || permissions.tickets,
            officeSupplies:
              existing.permissions.officeSupplies || permissions.officeSupplies,
          };
        });

        employeeUsersCache = Array.from(mergedMap.values());
        console.log(
          `📦 Read ${employeeUsersCache.length} user records from employee_users`,
        );
      } else {
        console.log("⚡ Using cached employee_users — 0 Firestore reads");
      }

      const firestoreMap = new Map(
        employeeUsersCache.map((u) => [u.username, u]),
      );

      const enriched: EnrichedUser[] = deduped.map((u) => {
        const key = u.username.toLowerCase().trim();
        const firestoreUser = firestoreMap.get(key);
        return {
          ...u,
          hasLoggedIn: !!firestoreUser,
          // ✅ Firestore permissions win — adUsers already has them from loadADUsers
          permissions: {
            itAccess:
              firestoreUser?.permissions?.itAccess ??
              u.permissions?.itAccess ??
              false,
            itInventory:
              firestoreUser?.permissions?.itInventory ??
              u.permissions?.itInventory ??
              false,
            consumables:
              firestoreUser?.permissions?.consumables ??
              u.permissions?.consumables ??
              false,
            tickets:
              firestoreUser?.permissions?.tickets ??
              u.permissions?.tickets ??
              false,
            officeSupplies:
              firestoreUser?.permissions?.officeSupplies ??
              u.permissions?.officeSupplies ??
              false,
          },
        };
      });

      setUsers(enriched);
    } catch (err) {
      setError("Failed to load users. Check backend connection.");
      console.error(err);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }

  // ... rest of your JSX stays exactly the same

  const totalSuperAdmin = users.filter((u) => u.role === "superadmin").length;
  const totalAdmin = users.filter((u) => u.role === "admin").length;
  const totalEmployee = users.filter((u) => u.role === "employee").length;
  const totalLoggedIn = users.filter((u) => u.hasLoggedIn).length;

  const roleTabs: Array<{ key: typeof roleFilter; label: string }> = [
    { key: "all", label: `All (${users.length})` },
    { key: "superadmin", label: `Super Admin (${totalSuperAdmin})` },
    // { key: "admin", label: `Admin (${totalAdmin})` },
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
      {/* TEMP: remove after use */}
      {/* <TouchableOpacity
        onPress={handleClearAndResync}
        disabled={clearing}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          backgroundColor: "#2e0f0f",
          borderWidth: 1,
          borderColor: "#7f1d1d",
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 7,
          marginLeft: 6,
        }}
      >
        {clearing ? (
          <ActivityIndicator size="small" color="#f87171" />
        ) : (
          <Text style={{ fontSize: 13 }}>🗑️</Text>
        )}
        <Text style={{ color: "#f87171", fontSize: 12, fontWeight: "600" }}>
          {clearing ? "Clearing..." : "Clear & Resync"}
        </Text>
      </TouchableOpacity> */}
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
            const isSuperAdmin = currentUser.role === "superadmin";

            const card = (
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
                  {/* Permission pills under name */}
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: 4,
                      marginTop: 6,
                    }}
                  >
                    {PERMISSION_LABELS.map(({ key, label }) => {
                      const granted = item.permissions?.[key] ?? false;
                      return (
                        <View
                          key={key}
                          style={{
                            backgroundColor: granted
                              ? "#052e16"
                              : theme.bgActive,
                            borderRadius: 99,
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                          }}
                        >
                          <Text
                            style={{
                              color: granted ? "#4ade80" : theme.subtext,
                              fontSize: 10,
                              fontWeight: "600",
                            }}
                          >
                            {granted ? "✓ " : "✗ "}
                            {label}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
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
                  {isSuperAdmin && (
                    <Text
                      style={{
                        color: theme.subtext,
                        fontSize: 10,
                        marginTop: 2,
                      }}
                    >
                      Tap to edit →
                    </Text>
                  )}
                </View>
              </View>
            );

            if (!isSuperAdmin) return card;

            return (
              <TouchableOpacity
                key={item.username}
                onPress={() => setPermissionUser(item)}
                activeOpacity={0.75}
              >
                {card}
              </TouchableOpacity>
            );
          }}
        />
      )}
      {/* ── Permission Modal ── */}
      {permissionUser && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            justifyContent: "center",
            alignItems: "center",
            padding: 24,
          }}
        >
          <View
            style={{
              backgroundColor: theme.surface,
              borderRadius: 20,
              padding: 24,
              width: "100%",
              maxWidth: 400,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            {/* Header */}
            <Text
              style={{
                color: theme.text,
                fontSize: 16,
                fontWeight: "700",
                marginBottom: 4,
              }}
            >
              Edit Permissions
            </Text>
            <Text
              style={{ color: theme.subtext, fontSize: 12, marginBottom: 20 }}
            >
              {permissionUser.displayName} · {permissionUser.username}
            </Text>

            {/* Toggles */}
            {(["itAccess", "officeSupplies"] as const).map((key) => {
              const labels: Record<
                string,
                { label: string; description: string }
              > = {
                itAccess: {
                  label: "IT Access",
                  description:
                    "Shows Tickets, IT Inventory, Consumables under IT section",
                },
                officeSupplies: {
                  label: "Office Supplies",
                  description:
                    "Shows full Office Supplies section in the sidebar",
                },
              };
              const granted = permissionUser.permissions?.[key] ?? false;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() =>
                    setPermissionUser((prev) =>
                      prev
                        ? {
                            ...prev,
                            permissions: {
                              ...prev.permissions,
                              [key]: !granted,
                            },
                          }
                        : prev,
                    )
                  }
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    backgroundColor: theme.bgActive,
                    borderRadius: 12,
                    padding: 14,
                    marginBottom: 10,
                    borderWidth: 1,
                    borderColor: granted ? "#4ade80" : theme.border,
                  }}
                >
                  <View>
                    <Text
                      style={{
                        color: theme.text,
                        fontSize: 13,
                        fontWeight: "600",
                      }}
                    >
                      {labels[key].label}
                    </Text>
                    <Text
                      style={{
                        color: theme.subtext,
                        fontSize: 11,
                        marginTop: 2,
                      }}
                    >
                      {labels[key].description}
                    </Text>
                  </View>
                  <View
                    style={{
                      width: 44,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: granted ? "#4ade80" : theme.border,
                      justifyContent: "center",
                      paddingHorizontal: 3,
                      alignItems: granted ? "flex-end" : "flex-start",
                    }}
                  >
                    <View
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 9,
                        backgroundColor: "#fff",
                      }}
                    />
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* Buttons */}
            <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
              <TouchableOpacity
                onPress={() => setPermissionUser(null)}
                style={{
                  flex: 1,
                  backgroundColor: theme.bgActive,
                  borderRadius: 12,
                  paddingVertical: 12,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <Text
                  style={{ color: theme.text, fontSize: 13, fontWeight: "600" }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() =>
                  savePermissions(permissionUser, permissionUser.permissions)
                }
                disabled={savingPermissions}
                style={{
                  flex: 1,
                  backgroundColor: theme.iconActive,
                  borderRadius: 12,
                  paddingVertical: 12,
                  alignItems: "center",
                }}
              >
                {savingPermissions ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text
                    style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}
                  >
                    Save
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
