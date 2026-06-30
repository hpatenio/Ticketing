// utils/adUsers.ts
import { ADUser, UserRole, UserPermissions } from "../../../types";
import { db } from "../../../firebase";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  writeBatch,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";

const BACKEND_URL = "http://10.10.100.112:3000";
const INTERNAL_SECRET = "silverdab_internal_2024";
const CACHE_MINUTES = 10;

let _serviceToken: string | null = null;

const DEFAULT_PERMISSIONS: UserPermissions = {
   itAccess: false,
  itInventory: false,
  consumables: false,
  tickets: false,
  officeSupplies: false,
};

async function getServiceToken(): Promise<string> {
  if (_serviceToken) return _serviceToken;
  const res = await fetch(`${BACKEND_URL}/auth/service-token`, {
    headers: { "x-internal-secret": INTERNAL_SECRET },
  });
  const data = await res.json();
  if (!data.success) throw new Error("Could not get service token");
  _serviceToken = data.token;
  return _serviceToken!;
}

export async function fetchAllADUsers(): Promise<ADUser[]> {
  try {
    const token = await getServiceToken();
    const res = await fetch(`${BACKEND_URL}/employees`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!data.success) return [];
    return data.employees.map(
      (u: any): ADUser => ({
        username: u.username ?? "",
        displayName: u.displayName ?? u.username ?? "",
        email: u.email ?? `${u.username}@ocgbim.com`,
        department: u.department ?? "",
        title: u.title ?? "",
        phone: u.phone ?? "",
        role: "employee",
        permissions: DEFAULT_PERMISSIONS,
      }),
    );
  } catch (err) {
    console.error("fetchAllADUsers error:", err);
    return [];
  }
}
async function syncADToFirestore(
  adUsers: ADUser[],
  resetRoles = false,   // ← NEW
): Promise<void> {
  const BATCH_SIZE = 400;

  const existing = await getDocs(collection(db, "employee_users"));
  const existingData = new Map
    <string,
    { role: string; permissions: UserPermissions }
  >();
  existing.docs.forEach((d) => {
    const username = d.data().username?.toLowerCase().trim();
    if (username) {
      existingData.set(username, {
        role: d.data().role ?? "employee",
        permissions: {
          itAccess: d.data().permissions?.itAccess ?? false,        // ← keep in sync
          itInventory: d.data().permissions?.itInventory ?? false,
          consumables: d.data().permissions?.consumables ?? false,
          tickets: d.data().permissions?.tickets ?? false,
          officeSupplies: d.data().permissions?.officeSupplies ?? false,
        },
      });
    }
  });

  for (let i = 0; i < existing.docs.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    existing.docs.slice(i, i + BATCH_SIZE).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  for (let i = 0; i < adUsers.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = adUsers.slice(i, i + BATCH_SIZE);
    for (const u of chunk) {
      const docId = (u.displayName || u.username).trim();
      const ref = doc(db, "employee_users", docId);
      const usernameKey = u.username.toLowerCase().trim();
      const preserved = existingData.get(usernameKey);

      batch.set(ref, {
        username: usernameKey,
        displayName: u.displayName ?? u.username,
        email: u.email || `${u.username}@ocgbim.com`,
        department: u.department ?? "",
        title: u.title ?? "",
        phone: u.phone ?? "",
        // ✅ Force "employee" when resetRoles is true, otherwise preserve as before
        role: resetRoles ? "employee" : (preserved?.role ?? "employee"),
        permissions: preserved?.permissions ?? DEFAULT_PERMISSIONS,
      });
    }
    await batch.commit();
  }

  await setDoc(doc(db, "meta", "ad_sync"), {
    lastSync: serverTimestamp(),
    count: adUsers.length,
  });
}

async function getUsersFromFirestore(): Promise<ADUser[]> {
  const snap = await getDocs(collection(db, "employee_users"));
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      username: data.username ?? d.id,
      displayName: data.displayName ?? d.id,
      email: data.email ?? `${d.id}@ocgbim.com`,
      department: data.department ?? "",
      title: data.title ?? "",
      phone: data.phone ?? "",
      role: (data.role as UserRole) ?? "employee",
      permissions: {
        itAccess:      data.permissions?.itAccess      ?? false,
        itInventory: data.permissions?.itInventory ?? false,
        consumables: data.permissions?.consumables ?? false,
        tickets: data.permissions?.tickets ?? false,
        officeSupplies:
          data.permissions?.officeSupplies ??
          data.permissions?.officesupplies ??
          false,
      },
    };
  });
}

async function isCacheStale(): Promise<boolean> {
  try {
    const metaSnap = await getDoc(doc(db, "meta", "ad_sync"));
    if (!metaSnap.exists()) return true;
    const lastSync = metaSnap.data().lastSync?.toDate();
    if (!lastSync) return true;
    const diffMinutes = (Date.now() - lastSync.getTime()) / 1000 / 60;
    return diffMinutes > CACHE_MINUTES;
  } catch {
    return true;
  }
}
export async function loadUsers(
  forceSync = false,
  resetRoles = false,   // ← NEW
): Promise<{ users: ADUser[]; synced: boolean }> {
  const stale = forceSync || (await isCacheStale());

  if (stale) {
    const adUsers = await fetchAllADUsers();
    if (adUsers.length > 0) {
      await syncADToFirestore(adUsers, resetRoles);
      const synced = await getUsersFromFirestore();
      return { users: synced, synced: true };
    }
  }

  const cached = await getUsersFromFirestore();
  return { users: cached, synced: false };
}

export async function clearEmployeeUsers(): Promise<void> {
  const BATCH_SIZE = 400;
  const existing = await getDocs(collection(db, "employee_users"));
  for (let i = 0; i < existing.docs.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    existing.docs.slice(i, i + BATCH_SIZE).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  await setDoc(doc(db, "meta", "ad_sync"), { lastSync: null, count: 0 });
  console.log("✅ employee_users cleared");
}
