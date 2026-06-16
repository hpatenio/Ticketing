import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { DropdownOption } from "../app/SuperAdmin/ManageColumnsModal";

const COLLECTION = "dropdown_configs";

export type DropdownNamespace = "inventory" | "ticket" | "consumable";

// Virtual "no value" entry — never stored in Firestore, always re-applied on read
// so every dropdown gets a way to clear/skip the field.
const NO_VALUE_OPTION: DropdownOption = {
  label: "-",
  value: "",
  badgeClass:
    "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-gray-100 text-gray-500",
} as DropdownOption;

function withNoValueOption(options: DropdownOption[]): DropdownOption[] {
  const hasBlank = options.some((o) => o.value === "");
  return hasBlank ? options : [NO_VALUE_OPTION, ...options];
}

// Matches your actual Firestore doc IDs exactly:
// inventory → inventory_status, inventory_category, inventory_location, inventory_company
// ticket    → ticket_status, ticket_category, ticket_priority
// consumable→ consumable_status, consumable_location
function buildDocId(namespace: DropdownNamespace, columnId: string): string {
  return `${namespace}_${columnId}`;
}

export async function getDropdownOptions(
  docIdStr: string,
  fallback: DropdownOption[],
): Promise<DropdownOption[]> {
  try {
    const ref = doc(db, COLLECTION, docIdStr);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const options = snap.data().options as DropdownOption[];
      return withNoValueOption(options);
    }
    return withNoValueOption(fallback);
  } catch (err) {
    console.error(`Failed to fetch dropdown config for ${docIdStr}:`, err);
    return withNoValueOption(fallback);
  }
}

export async function saveDropdownOptions(
  docIdStr: string,
  options: DropdownOption[],
): Promise<void> {
  try {
    const ref = doc(db, COLLECTION, docIdStr);
    // Strip the virtual "no value" entry before persisting — it's re-applied
    // on every read, so we never want a duplicate (or a stale one) saved.
    const cleaned = options.filter((o) => o.value !== "");
    await setDoc(ref, { options: cleaned });
  } catch (err) {
    console.error(`Failed to save dropdown config for ${docIdStr}:`, err);
    throw err;
  }
}

export async function getAllDropdownConfigs(defaults: any) {
  if (defaults && defaults.inventory) {
    const [
      inventoryStatus, inventoryCategory, inventoryLocation, inventoryCompany,
      ticketStatus, ticketCategory, ticketPriority,
      consumableStatus, consumableLocation,
    ] = await Promise.all([
      getDropdownOptions(buildDocId("inventory", "status"),    defaults.inventory.status),
      getDropdownOptions(buildDocId("inventory", "category"),  defaults.inventory.category),
      getDropdownOptions(buildDocId("inventory", "location"),  defaults.inventory.location),
      getDropdownOptions(buildDocId("inventory", "company"),   defaults.inventory.company),
      getDropdownOptions(buildDocId("ticket",    "status"),    defaults.ticket.status),
      getDropdownOptions(buildDocId("ticket",    "category"),  defaults.ticket.category),
      getDropdownOptions(buildDocId("ticket",    "priority"),  defaults.ticket.priority),
      getDropdownOptions(buildDocId("consumable","status"),    defaults.consumable.status),
      getDropdownOptions(buildDocId("consumable","location"),  defaults.consumable.location),
    ]);

    return {
      inventory:  { status: inventoryStatus, category: inventoryCategory, location: inventoryLocation, company: inventoryCompany },
      ticket:     { status: ticketStatus, category: ticketCategory, priority: ticketPriority },
      consumable: { status: consumableStatus, location: consumableLocation },
      // Flat aliases for callers that use { status, category, ... } directly
      status:   inventoryStatus,
      category: inventoryCategory,
      location: inventoryLocation,
      company:  inventoryCompany,
    };
  }

  // Flat inventory-only call
  const [status, category, location, company] = await Promise.all([
    getDropdownOptions(buildDocId("inventory", "status"),   defaults.status),
    getDropdownOptions(buildDocId("inventory", "category"), defaults.category),
    getDropdownOptions(buildDocId("inventory", "location"), defaults.location),
    getDropdownOptions(buildDocId("inventory", "company"),  defaults.company),
  ]);

  return { status, category, location, company };
}