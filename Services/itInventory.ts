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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ITInventory, ADUser } from "../types";
import { logAudit } from "./auditService";

const COLLECTION = "it_inventory";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatValue = (value: any): string => {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object" && typeof value.toDate === "function") {
    return value.toDate().toLocaleDateString();
  }
  return String(value);
};

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

// ─── CREATE ───────────────────────────────────────────────────────────────────

export const addAsset = async (
  data: Omit<ITInventory, "id" | "createdAt" | "updatedAt">
): Promise<void> => {
  await setDoc(doc(db, COLLECTION, data.assetTag), {
    ...data,
    createdAt: serverTimestamp(),
  });
};

// ─── READ ALL ─────────────────────────────────────────────────────────────────

export const getAllAssets = async (): Promise<ITInventory[]> => {
  const q = query(collection(db, COLLECTION), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as ITInventory[];
};

// ─── UPDATE FULL ──────────────────────────────────────────────────────────────

export const updateAsset = async (
  assetTag: string,
  data: Partial<Omit<ITInventory, "id" | "createdAt">>
): Promise<void> => {
  await updateDoc(doc(db, COLLECTION, assetTag), {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

// ─── UPDATE SINGLE FIELD (with audit) ────────────────────────────────────────

export const updateAssetField = async (
  assetTag: string,
  field: string,
  value: string,
  changedBy?: string,
  changedById?: string
): Promise<void> => {
  // Auto-resolve user from storage if not passed in
  if (!changedBy) {
    const user = await getCurrentUser();
    changedBy = user.name;
    changedById = user.id;
  }

  // Fetch old value before writing
  let oldValue = "—";
  try {
    const snap = await getDoc(doc(db, COLLECTION, assetTag));
    if (snap.exists()) {
      const data = snap.data();
      oldValue = formatValue(data[field]);
    }
  } catch {}

  await updateDoc(doc(db, COLLECTION, assetTag), {
    [field]: value,
    updatedAt: serverTimestamp(),
  });

  await logAudit({
    table: "inventory",
    recordId: assetTag,
    recordLabel: assetTag,
    field,
    oldValue,
    newValue: formatValue(value),
    changedBy: changedBy ?? "Unknown",
    changedById: changedById ?? "",
  });
};

// ─── DELETE ───────────────────────────────────────────────────────────────────

export const deleteAsset = async (assetTag: string): Promise<void> => {
  await deleteDoc(doc(db, COLLECTION, assetTag));
};