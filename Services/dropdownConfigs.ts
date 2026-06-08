import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { DropdownOption } from "../app/SuperAdmin/ManageColumnsModal";

const COLLECTION = "dropdown_configs";

export type DropdownNamespace = "inventory" | "ticket" | "consumable";

// ─── Builds the Firestore document ID, e.g. "inventory_status", "ticket_category" ──
function buildDocId(namespace: DropdownNamespace, columnId: string): string {
  return `inventory_${namespace === "inventory" ? "" : `${namespace}_`}${columnId}`;
  // Results:
  //   inventory  + status   → "inventory_status"
  //   ticket     + status   → "inventory_ticket_status"
  //   consumable + location → "inventory_consumable_location"
}

// ─── Fetch one column's options ───────────────────────────────────────────────
export async function getDropdownOptions(
  docIdStr: string,
  fallback: DropdownOption[],
): Promise<DropdownOption[]> {
  try {
    const ref = doc(db, COLLECTION, docIdStr);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data().options as DropdownOption[];
    }
    setDoc(ref, { options: fallback }).catch((err) =>
      console.warn(`Could not seed default options for ${docIdStr}:`, err),
    );
    return fallback;
  } catch (err) {
    console.error(`Failed to fetch dropdown config for ${docIdStr}:`, err);
    return fallback;
  }
}

// ─── Save one column's options ────────────────────────────────────────────────
export async function saveDropdownOptions(
  docIdStr: string,
  options: DropdownOption[],
): Promise<void> {
  try {
    const ref = doc(db, COLLECTION, docIdStr);
    await setDoc(ref, { options });
  } catch (err) {
    console.error(`Failed to save dropdown config for ${docIdStr}:`, err);
    throw err;
  }
}

// ─── Fetch all editable columns at once ───────────────────────────────────────
export async function getAllDropdownConfigs(defaults: any) {
  // Support two calling shapes used across the app:
  // 1) Nested defaults for all namespaces: { inventory: {...}, ticket: {...}, consumable: {...} }
  //    -> returns { inventory: {...}, ticket: {...}, consumable: {...} }
  // 2) Inventory-only flat defaults: { status, category, location, company }
  //    -> returns flat object { status, category, location, company }

  if (defaults && defaults.inventory) {
    const [
      inventoryStatus, inventoryCategory, inventoryLocation, inventoryCompany,
      ticketStatus,    ticketCategory,    ticketPriority,
      consumableStatus, consumableLocation,
    ] = await Promise.all([
      // inventory_*
      getDropdownOptions(buildDocId("inventory", "status"),   defaults.inventory.status),
      getDropdownOptions(buildDocId("inventory", "category"), defaults.inventory.category),
      getDropdownOptions(buildDocId("inventory", "location"), defaults.inventory.location),
      getDropdownOptions(buildDocId("inventory", "company"),  defaults.inventory.company),
      // inventory_ticket_*
      getDropdownOptions(buildDocId("ticket", "status"),   defaults.ticket.status),
      getDropdownOptions(buildDocId("ticket", "category"), defaults.ticket.category),
      getDropdownOptions(buildDocId("ticket", "priority"), defaults.ticket.priority),
      // inventory_consumable_*
      getDropdownOptions(buildDocId("consumable", "status"),   defaults.consumable.status),
      getDropdownOptions(buildDocId("consumable", "location"), defaults.consumable.location),
    ]);

    return {
      inventory:  { status: inventoryStatus, category: inventoryCategory, location: inventoryLocation, company: inventoryCompany },
      ticket:     { status: ticketStatus,    category: ticketCategory,    priority: ticketPriority },
      consumable: { status: consumableStatus, location: consumableLocation },
      // Also expose flat inventory keys for callers that expect { status, category, ... }
      status: inventoryStatus,
      category: inventoryCategory,
      location: inventoryLocation,
      company: inventoryCompany,
    };
  }

  // Inventory-only flow (flat defaults)
  const [status, category, location, company] = await Promise.all([
    getDropdownOptions("inventory_status", defaults.status),
    getDropdownOptions("inventory_category", defaults.category),
    getDropdownOptions("inventory_location", defaults.location),
    getDropdownOptions("inventory_company", defaults.company),
  ]);

  return { status, category, location, company };
}