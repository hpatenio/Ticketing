import { db } from "../firebase";
import {
  collection,
  getDocs,
  setDoc,
  updateDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
  where,
  Timestamp,
} from "firebase/firestore";
import { ConcernTicket } from "../types";

const COLLECTION = "concern_tickets";

export const addTicket = async (
  data: Omit<ConcernTicket, "id" | "dateCreated" | "dueDate"> & {
    dueDate: Date | Timestamp;
    dateCreated?: Date | Timestamp;
  }
): Promise<void> => {
  await setDoc(doc(db, COLLECTION, data.ticketNumber), {
    ...data,
    dueDate: data.dueDate instanceof Date ? Timestamp.fromDate(data.dueDate) : data.dueDate,
    dateCreated: serverTimestamp(),
  });
};

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

export const updateTicketField = async (
  ticketNumber: string,
  field: string,
  value: any
): Promise<void> => {
  let updateValue = value;

  // Handle date conversions for dueDate field
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
};
