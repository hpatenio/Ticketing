// Services/officeInventory.ts  — Firestore implementation
// Drop-in replacement for the mock service. OfficeInventoryPage.tsx is unchanged.

import { db } from "../firebase";
import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
  where,
  Timestamp,
} from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ADUser, EditItemInput, NewItemInput, OfficeInventoryItem, StockStatus, StockTransaction } from "../types";
import { logAudit } from "./auditService";

// ─── Collection names ─────────────────────────────────────────────────────────

const ITEMS_COL = "office_inventory";
const TX_COL = "office_stock_transactions";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatValue = (value: any): string => {
  if (value === null || value === undefined) return "—";
  if (value instanceof Timestamp) return value.toDate().toLocaleDateString();
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

export const computeStockStatus = (
  currentStock: number,
  inStockThreshold: number,
): StockStatus => {
  if (currentStock <= 0) return "out_of_stock";
  if (currentStock <= inStockThreshold) return "low_stock";
  return "in_stock";
};

// Converts a Firestore doc snapshot to a typed OfficeInventoryItem
const toItem = (id: string, data: any): OfficeInventoryItem => ({
  id,
  itemCode: data.itemCode,
  name: data.name,
  brand: data.brand ?? "",
  category: data.category,
  unit: data.unit,
  pricePerUnit: data.pricePerUnit,
  currentStock: data.currentStock,
  stockStatus: data.stockStatus,
  lowStockThreshold: data.lowStockThreshold,
  inStockThreshold: data.inStockThreshold,
  isActive: data.isActive,
  createdAt: data.createdAt instanceof Timestamp
    ? data.createdAt.toDate().toISOString()
    : data.createdAt ?? "",
  updatedAt: data.updatedAt instanceof Timestamp
    ? data.updatedAt.toDate().toISOString()
    : data.updatedAt ?? "",
});

// Converts a Firestore doc snapshot to a typed StockTransaction
const toTransaction = (id: string, data: any): StockTransaction => ({
  id,
  itemId: data.itemId,
  itemCode: data.itemCode,
  itemName: data.itemName,
  type: data.type,
  quantityChange: data.quantityChange,
  stockBefore: data.stockBefore,
  stockAfter: data.stockAfter,
  pricePerUnit: data.pricePerUnit,
  totalAmount: data.totalAmount,
  reason: data.reason ?? "",
  performedByName: data.performedByName,
  transactionDate: data.transactionDate,
  createdAt: data.createdAt instanceof Timestamp
    ? data.createdAt.toDate().toISOString()
    : data.createdAt ?? "",
});

// ─── Reads ────────────────────────────────────────────────────────────────────

export async function getAllInventoryItems(): Promise<OfficeInventoryItem[]> {
  const q = query(
    collection(db, ITEMS_COL),
    where("isActive", "==", true),
    // orderBy("createdAt", "desc"),   ← comment this out temporarily
  );
  const snap = await getDocs(q);
  console.log("[getAllInventoryItems] docs:", snap.docs.length);
  return snap.docs.map((d) => toItem(d.id, d.data()));
}

export async function getTransactionsForItem(
  itemId: string,
): Promise<StockTransaction[]> {
  const q = query(
    collection(db, TX_COL),
    where("itemId", "==", itemId),
    orderBy("createdAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => toTransaction(d.id, d.data()));
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

export async function createInventoryItem(input: NewItemInput): Promise<OfficeInventoryItem> {
  // 1. Check duplicate
  const existing = query(collection(db, ITEMS_COL), where("itemCode", "==", input.itemCode));
  const existingSnap = await getDocs(existing);
  if (!existingSnap.empty) throw new Error(`Item code "${input.itemCode}" already exists.`);

  const lowStockThreshold = input.lowStockThreshold ?? 5;
  const inStockThreshold = input.inStockThreshold ?? 10;

  const payload = {
    itemCode: input.itemCode,
    name: input.name,
    brand: input.brand ?? "",
    category: input.category,
    unit: input.unit,
    pricePerUnit: input.pricePerUnit,
    currentStock: input.beginningInventory,
    stockStatus: computeStockStatus(input.beginningInventory, inStockThreshold),
    lowStockThreshold,
    inStockThreshold,
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  console.log("[officeInventory] writing payload:", payload);      // ← add this
  const ref = await addDoc(collection(db, ITEMS_COL), payload);
  console.log("[officeInventory] written with id:", ref.id);      // ← and this

  try {
    const user = await getCurrentUser();
    await logAudit({
      table: "office_inventory",
      recordId: ref.id,
      recordLabel: input.name,
      field: "created",
      oldValue: "—",
      newValue: input.name,
      changedBy: user.name,
      changedById: user.id,
    });
  } catch (auditErr) {
    console.warn("[officeInventory] audit log failed (non-fatal):", auditErr);
  }

  return toItem(ref.id, {
    ...payload,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

export async function updateInventoryItem(
  id: string,
  updates: EditItemInput,
): Promise<void> {
  const ref = doc(db, ITEMS_COL, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Item not found");

  const current = snap.data();
  const currentStock = current.currentStock as number;
  const inStockThreshold = updates.inStockThreshold ?? (current.inStockThreshold as number);

  const payload: Record<string, any> = {
    ...updates,
    stockStatus: computeStockStatus(currentStock, inStockThreshold),
    updatedAt: serverTimestamp(),
  };

  await updateDoc(ref, payload);

  // Audit each changed field
  const user = await getCurrentUser();
  for (const [field, newVal] of Object.entries(updates)) {
    const oldVal = current[field];
    if (formatValue(oldVal) !== formatValue(newVal)) {
      await logAudit({
        table: "office_inventory",
        recordId: id,
        recordLabel: current.name as string,
        field,
        oldValue: formatValue(oldVal),
        newValue: formatValue(newVal),
        changedBy: user.name,
        changedById: user.id,
      });
    }
  }
}

// ─── ARCHIVE ──────────────────────────────────────────────────────────────────

export async function archiveInventoryItem(id: string): Promise<void> {
  const ref = doc(db, ITEMS_COL, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Item not found");

  await updateDoc(ref, { isActive: false, updatedAt: serverTimestamp() });

  const user = await getCurrentUser();
  await logAudit({
    table: "office_inventory",
    recordId: id,
    recordLabel: snap.data().name as string,
    field: "isActive",
    oldValue: "true",
    newValue: "false",
    changedBy: user.name,
    changedById: user.id,
  });
}

// ─── ADJUST STOCK (deduct) ────────────────────────────────────────────────────

export async function adjustStock(
  itemId: string,
  quantityToDeduct: number,
  date: string,
  reason: string,
  performedByName?: string,
): Promise<void> {
  const ref = doc(db, ITEMS_COL, itemId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Item not found");

  const data = snap.data();
  const stockBefore = data.currentStock as number;

  if (quantityToDeduct > stockBefore) {
    throw new Error("Cannot deduct more than current stock.");
  }

  const stockAfter = stockBefore - quantityToDeduct;
  const inStockThreshold = data.inStockThreshold as number;

  await updateDoc(ref, {
    currentStock: stockAfter,
    stockStatus: computeStockStatus(stockAfter, inStockThreshold),
    updatedAt: serverTimestamp(),
  });

  const user = await getCurrentUser();
  const actor = performedByName ?? user.name;

  await addDoc(collection(db, TX_COL), {
    itemId,
    itemCode: data.itemCode,
    itemName: data.name,
    type: "manual_adjustment",
    quantityChange: -quantityToDeduct,
    stockBefore,
    stockAfter,
    pricePerUnit: data.pricePerUnit,
    totalAmount: quantityToDeduct * (data.pricePerUnit as number),
    reason,
    performedByName: actor,
    transactionDate: date,
    createdAt: serverTimestamp(),
  });

  await logAudit({
    table: "office_inventory",
    recordId: itemId,
    recordLabel: data.name as string,
    field: "currentStock",
    oldValue: String(stockBefore),
    newValue: String(stockAfter),
    changedBy: actor,
    changedById: user.id,
  });
}

// ─── ADD DELIVERY (restock) ───────────────────────────────────────────────────

export async function addDelivery(
  itemId: string,
  quantityDelivered: number,
  date: string,
  pricePerUnit: number,
  notes: string,
  performedByName?: string,
): Promise<void> {
  const ref = doc(db, ITEMS_COL, itemId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Item not found");

  const data = snap.data();
  const stockBefore = data.currentStock as number;
  const stockAfter = stockBefore + quantityDelivered;
  const inStockThreshold = data.inStockThreshold as number;

  await updateDoc(ref, {
    currentStock: stockAfter,
    pricePerUnit,                                          // update to latest delivery price
    stockStatus: computeStockStatus(stockAfter, inStockThreshold),
    updatedAt: serverTimestamp(),
  });

  const user = await getCurrentUser();
  const actor = performedByName ?? user.name;

  await addDoc(collection(db, TX_COL), {
    itemId,
    itemCode: data.itemCode,
    itemName: data.name,
    type: "delivery",
    quantityChange: quantityDelivered,
    stockBefore,
    stockAfter,
    pricePerUnit,
    totalAmount: quantityDelivered * pricePerUnit,
    reason: notes,
    performedByName: actor,
    transactionDate: date,
    createdAt: serverTimestamp(),
  });

  await logAudit({
    table: "office_inventory",
    recordId: itemId,
    recordLabel: data.name as string,
    field: "currentStock",
    oldValue: String(stockBefore),
    newValue: String(stockAfter),
    changedBy: actor,
    changedById: user.id,
  });
}