import { db } from "../firebase";
import {
  collection,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { ADUser, ITConsumable } from "../types";
import { logAudit } from "./auditService";
import AsyncStorage from "@react-native-async-storage/async-storage";

const COLLECTION = "it_consumables";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getCurrentUser = async (): Promise<{ name: string; id: string }> => {
  try {
    const saved = await AsyncStorage.getItem("AD_USER_DATA");
    if (saved) {
      const user: ADUser = JSON.parse(saved);
      return { name: user.displayName, id: user.username };
    }
  } catch {}
  return { name: "Unknown", id: "" };
};

const formatValue = (value: any): string => {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object" && typeof value.toDate === "function") {
    return value.toDate().toLocaleDateString();
  }
  return String(value);
};

// ─── CREATE ───────────────────────────────────────────────────────────────────

export const addConsumable = async (
  data: Omit<ITConsumable, "id" | "createdAt" | "updatedAt">
): Promise<void> => {
  await setDoc(doc(db, COLLECTION, data.model), {
    ...data,
    createdAt: serverTimestamp(),
  });
};

// ─── READ ALL ─────────────────────────────────────────────────────────────────

export const getAllConsumables = async (): Promise<ITConsumable[]> => {
  const q = query(collection(db, COLLECTION), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as ITConsumable[];
};

// ─── UPDATE FULL ──────────────────────────────────────────────────────────────

export const updateConsumable = async (
  serial: string,
  data: Partial<Omit<ITConsumable, "id" | "createdAt">>
): Promise<void> => {
  await updateDoc(doc(db, COLLECTION, serial), {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

// ─── UPDATE SINGLE FIELD (with audit) ────────────────────────────────────────

export const updateConsumableField = async (
  serial: string,
  field: string,
  value: string | number,
  changedBy?: string,
  changedById?: string
): Promise<void> => {
  // Auto-resolve user from storage if not passed in
  if (!changedBy) {
    const user = await getCurrentUser();
    changedBy = user.name;
    changedById = user.id;
  }

  let oldValue = "—";
  try {
    const snap = await getDoc(doc(db, COLLECTION, serial));
    if (snap.exists()) {
      const data = snap.data();
      oldValue = formatValue(data[field]);
    }
  } catch {}

  await updateDoc(doc(db, COLLECTION, serial), {
    [field]: value,
    updatedAt: serverTimestamp(),
  });

  await logAudit({
    table: "consumables",
    recordId: serial,
    recordLabel: serial,
    field,
    oldValue,
    newValue: formatValue(value),
    changedBy: changedBy ?? "Unknown",
    changedById: changedById ?? "",
  });
};

// ─── DELETE ───────────────────────────────────────────────────────────────────

export const deleteConsumable = async (serial: string): Promise<void> => {
  await deleteDoc(doc(db, COLLECTION, serial));
};
