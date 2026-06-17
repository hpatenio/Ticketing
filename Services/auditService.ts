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
  where,
} from "firebase/firestore";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AuditTable = "inventory" | "consumables" | "tickets"   | "office_inventory" ;

/** A single field change within a batch */
export type AuditFieldChange = {
  field: string;
  oldValue: string;
  newValue: string;
};

/**
 * A grouped/batch audit entry — one document in Firestore that holds
 * an array of field changes made in a single user action (e.g. saving
 * the Edit Asset modal).
 */
export type AuditBatchEntry = {
  id?: string;
  table: AuditTable;
  recordId: string;       // assetTag / model / ticketNumber
  recordLabel: string;    // human-readable label shown in the UI
  changes: AuditFieldChange[];  // ← array of changed fields
  changedBy: string;      // displayName
  changedById: string;    // username / uid
  timestamp: Timestamp | null;
  /** Discriminator so the UI can tell batch from legacy single-field entries */
  entryType: "batch";
};

/**
 * Legacy single-field entry shape — kept for backward-compat when
 * reading old documents that don't have `entryType`.
 */
export type AuditEntry = {
  id?: string;
  table: AuditTable;
  recordId: string;
  recordLabel: string;
  field: string;
  oldValue: string;
  newValue: string;
  changedBy: string;
  changedById: string;
  timestamp: Timestamp | null;
  entryType?: "single";   // optional — old docs won't have this
};

/** Union of both shapes — what the UI works with */
export type AnyAuditEntry = AuditEntry | AuditBatchEntry;

/**
 * Raw shape of a Firestore audit document before we know which variant it is.
 * All fields from both entry types are present but optional (except the shared
 * required ones), so the cast in getAuditLogs is always safe.
 */
type RawAuditDoc = {
  id: string;
  table: AuditTable;
  recordId: string;
  recordLabel: string;
  changedBy: string;
  changedById: string;
  timestamp: Timestamp | null;
  entryType?: "single" | "batch";
  // single-entry fields
  field?: string;
  oldValue?: string;
  newValue?: string;
  // batch-entry fields
  changes?: AuditFieldChange[];
};

const COLLECTION_MAP: Record<AuditTable, string> = {
  inventory:   "audit_inventory",
  consumables: "audit_consumables",
  tickets:     "audit_tickets",
  office_inventory: "audit_office_inventory",
};

// ─── Write — single field (legacy / inline edits) ─────────────────────────────

export const logAudit = async (
  entry: Omit<AuditEntry, "id" | "timestamp">
): Promise<void> => {
  try {
    const col = COLLECTION_MAP[entry.table];
    await addDoc(collection(db, col), {
      ...entry,
      entryType: "single",
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    console.error("[audit] Failed to write audit log:", err);
  }
};

// ─── Write — batch (Edit modal saves) ─────────────────────────────────────────

/**
 * Writes a single Firestore document that groups all changed fields
 * from one save action.  Call this instead of calling `logAudit`
 * once per field.
 *
 * @param entry  Everything except `id`, `timestamp`, and `entryType`
 */
export const logAuditBatch = async (
  entry: Omit<AuditBatchEntry, "id" | "timestamp" | "entryType">
): Promise<void> => {
  if (!entry.changes.length) return; // nothing changed — skip
  try {
    const col = COLLECTION_MAP[entry.table];
    await addDoc(collection(db, col), {
      ...entry,
      entryType: "batch",
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    console.error("[audit] Failed to write batch audit log:", err);
  }
};

// ─── Read ─────────────────────────────────────────────────────────────────────

export const getAuditLogs = async (
  table: AuditTable,
  maxEntries = 200,
  recordId?: string
): Promise<AnyAuditEntry[]> => {
  const col = COLLECTION_MAP[table];
  const constraints = [
    ...(recordId ? [where("recordId", "==", recordId)] : []),
    orderBy("timestamp", "desc"),
    limit(maxEntries),
  ];
  const q = query(collection(db, col), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d): AnyAuditEntry => {
    const raw = { id: d.id, ...d.data() } as RawAuditDoc;

    if (raw.entryType === "batch") {
      return {
        ...raw,
        entryType: "batch",
        changes: raw.changes ?? [],
      } as AuditBatchEntry;
    }

    return {
      ...raw,
      entryType: "single",
      field:    raw.field    ?? "",
      oldValue: raw.oldValue ?? "",
      newValue: raw.newValue ?? "",
    } as AuditEntry;
  });
};

// ─── Type guards ──────────────────────────────────────────────────────────────

export const isBatchEntry = (e: AnyAuditEntry): e is AuditBatchEntry =>
  (e as AuditBatchEntry).entryType === "batch";

export const isSingleEntry = (e: AnyAuditEntry): e is AuditEntry =>
  !isBatchEntry(e);