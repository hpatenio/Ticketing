import { db } from "../firebase";
import {
  collection,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { ITInventory } from "../types";

const COLLECTION = "it_inventory";

// CREATE
export const addAsset = async (
  data: Omit<ITInventory, "id" | "createdAt" | "updatedAt">
): Promise<void> => {
  await setDoc(doc(db, COLLECTION, data.assetTag), {
    ...data,
    createdAt: serverTimestamp(),
  });
};

// READ ALL
export const getAllAssets = async (): Promise<ITInventory[]> => {
  const q = query(
    collection(db, COLLECTION),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as ITInventory[];
};

// UPDATE
export const updateAsset = async (
  assetTag: string,
  data: Partial<Omit<ITInventory, "id" | "createdAt">>
): Promise<void> => {
  await updateDoc(doc(db, COLLECTION, assetTag), {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

// DELETE
export const deleteAsset = async (assetTag: string): Promise<void> => {
  await deleteDoc(doc(db, COLLECTION, assetTag));
};

// add this to your existing itInventoryService.ts
export const updateAssetField = async (
  assetTag: string,
  field: string,
  value: string
): Promise<void> => {
  await updateDoc(doc(db, COLLECTION, assetTag), {
    [field]: value,
    updatedAt: serverTimestamp(),
  });
};