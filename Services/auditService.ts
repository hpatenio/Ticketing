import { db } from "../firebase";
import {
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
  query,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AuditTable = "inventory" | "consumables" | "tickets";

export type AuditEntry = {
  id?: string;
  table: AuditTable;
  recordId: string;       // assetTag / model / ticketNumber
  recordLabel: string;    // human-readable name of the record
  field: string;
  oldValue: string;
  newValue: string;
  changedBy: string;      // displayName of the user
  changedById: string;    // username/id
  timestamp: Timestamp | null;
};

const COLLECTION_MAP: Record<AuditTable, string> = {
  inventory:   "audit_inventory",
  consumables: "audit_consumables",
  tickets:     "audit_tickets",
};

// ─── Write ────────────────────────────────────────────────────────────────────

export const logAudit = async (
  entry: Omit<AuditEntry, "id" | "timestamp">
): Promise<void> => {
  try {
    const col = COLLECTION_MAP[entry.table];
    await addDoc(collection(db, col), {
      ...entry,
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    // Audit failures should never break the main operation
    console.error("[audit] Failed to write audit log:", err);
  }
};

// ─── Read ─────────────────────────────────────────────────────────────────────

export const getAuditLogs = async (
  table: AuditTable,
  maxEntries = 200
): Promise<AuditEntry[]> => {
  const col = COLLECTION_MAP[table];
  const q = query(
    collection(db, col),
    orderBy("timestamp", "desc"),
    limit(maxEntries)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<AuditEntry, "id">),
  }));
};
