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
import { ITConsumable } from "../types";

const COLLECTION = "it_consumables";

// CREATE
export const addConsumable = async (
  data: Omit<ITConsumable, "id" | "createdAt" | "updatedAt">
): Promise<void> => {
  await setDoc(doc(db, COLLECTION, data.model), {
    ...data,
    createdAt: serverTimestamp(),
  });
};

// READ ALL
export const getAllConsumables = async (): Promise<ITConsumable[]> => {
  const q = query(collection(db, COLLECTION), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as ITConsumable[];
};

// UPDATE FULL
export const updateConsumable = async (
  serial: string,
  data: Partial<Omit<ITConsumable, "id" | "createdAt">>
): Promise<void> => {
  await updateDoc(doc(db, COLLECTION, serial), {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

// UPDATE SINGLE FIELD
export const updateConsumableField = async (
  serial: string,
  field: string,
  value: string | number
): Promise<void> => {
  await updateDoc(doc(db, COLLECTION, serial), {
    [field]: value,
    updatedAt: serverTimestamp(),
  });
};

// DELETE
export const deleteConsumable = async (serial: string): Promise<void> => {
  await deleteDoc(doc(db, COLLECTION, serial));
};
