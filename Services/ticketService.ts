import { db } from "../firebase";
import {
  collection,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
  where,
  Timestamp,
} from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ConcernTicket, ADUser } from "../types";
import { logAudit } from "./auditService";

const COLLECTION = "concern_tickets";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatValue = (value: any): string => {
  if (value === null || value === undefined) return "—";
  if (value instanceof Timestamp) return value.toDate().toISOString().split("T")[0];
  if (typeof value === "object" && typeof value.toDate === "function") {
    return value.toDate().toISOString().split("T")[0];
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

export const addTicket = async (
  data: Omit<ConcernTicket, "id" | "dateCreated" | "dueDate"> & {
    dueDate: Date | Timestamp;
    dateCreated?: Date | Timestamp;
  }
): Promise<void> => {
  await setDoc(doc(db, COLLECTION, data.ticketNumber), {
    ...data,
    dueDate:
      data.dueDate instanceof Date
        ? Timestamp.fromDate(data.dueDate)
        : data.dueDate,
    dateCreated: serverTimestamp(),
  });
};

// ─── READ ALL ─────────────────────────────────────────────────────────────────

export const getAllTickets = async (): Promise<ConcernTicket[]> => {
  const q = query(collection(db, COLLECTION), orderBy("dateCreated", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as ConcernTicket[];
};

export const getTicketsByRequester = async (
  requesterId: string
): Promise<ConcernTicket[]> => {
  const q = query(
    collection(db, COLLECTION),
    where("requesterId", "==", requesterId),
    orderBy("dateCreated", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  })) as ConcernTicket[];
};

// ─── UPDATE FULL TICKET (batch modal save) ─────────────────────────────────

export const updateTicket = async (
  ticketNumber: string,
  data: Partial<Omit<ConcernTicket, "id" | "ticketNumber" | "dateCreated">>
): Promise<void> => {
  const payload: any = { ...data };
  if (payload.dueDate && typeof payload.dueDate === "string") {
    const dateObj = new Date(payload.dueDate);
    if (!Number.isNaN(dateObj.getTime())) {
      payload.dueDate = Timestamp.fromDate(dateObj);
    }
  }
  await updateDoc(doc(db, COLLECTION, ticketNumber), {
    ...payload,
    updatedAt: serverTimestamp(),
  });
};

// ─── UPDATE SINGLE FIELD (with audit) ────────────────────────────────────────

export const updateTicketField = async (
  ticketNumber: string,
  field: string,
  value: any,
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
    const snap = await getDoc(doc(db, COLLECTION, ticketNumber));
    if (snap.exists()) {
      const data = snap.data();
      oldValue = formatValue(data[field]);
    }
  } catch {}

  // Normalise dueDate
  let updateValue = value;
  if (field === "dueDate") {
    if (value instanceof Date) {
      updateValue = Timestamp.fromDate(value);
    } else if (typeof value === "string" && value.trim().length > 0) {
      const dateObj = new Date(value);
      if (!Number.isNaN(dateObj.getTime())) {
        updateValue = Timestamp.fromDate(dateObj);
      }
    }
  }

  await updateDoc(doc(db, COLLECTION, ticketNumber), {
    [field]: updateValue,
  });

  await logAudit({
    table: "tickets",
    recordId: ticketNumber,
    recordLabel: ticketNumber,
    field,
    oldValue,
    newValue: formatValue(value),
    changedBy: changedBy ?? "Unknown",
    changedById: changedById ?? "",
  });
};