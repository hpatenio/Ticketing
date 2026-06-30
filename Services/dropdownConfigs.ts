import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { DropdownOption } from "../app/SuperAdmin/ManageColumnsModal";

const COLLECTION = "dropdown_configs";

export type DropdownNamespace = "inventory" | "ticket" | "consumable";

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

function buildDocId(namespace: DropdownNamespace, columnId: string): string {
  return `${namespace}_${columnId}`;
}

// ── In-memory cache: reads happen once per session ──────────────────────────
const dropdownCache: Record<string, DropdownOption[]> = {};

export async function getDropdownOptions(key: string): Promise<DropdownOption[]> {
  if (dropdownCache[key]) return dropdownCache[key];

  try {
    const snap = await getDoc(doc(db, COLLECTION, key));
    const options: DropdownOption[] = snap.exists()
      ? (snap.data().options ?? [])
      : [];
    const result = withNoValueOption(options);
    dropdownCache[key] = result;
    return result;
  } catch (err) {
    console.error(`Failed to fetch dropdown config for ${key}:`, err);
    return [];
  }
}

export async function saveDropdownOptions(
  docIdStr: string,
  options: DropdownOption[],
): Promise<void> {
  try {
    const ref = doc(db, COLLECTION, docIdStr);
    const cleaned = options.filter((o) => o.value !== "");
    await setDoc(ref, { options: cleaned });

    // ── Invalidate cache so next read gets fresh data ──
    delete dropdownCache[docIdStr];
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
      getDropdownOptions(buildDocId("inventory",  "status")),
      getDropdownOptions(buildDocId("inventory",  "category")),
      getDropdownOptions(buildDocId("inventory",  "location")),
      getDropdownOptions(buildDocId("inventory",  "company")),
      getDropdownOptions(buildDocId("ticket",     "status")),
      getDropdownOptions(buildDocId("ticket",     "category")),
      getDropdownOptions(buildDocId("ticket",     "priority")),
      getDropdownOptions(buildDocId("consumable", "status")),
      getDropdownOptions(buildDocId("consumable", "location")),
    ]);

    return {
      inventory:  { status: inventoryStatus, category: inventoryCategory, location: inventoryLocation, company: inventoryCompany },
      ticket:     { status: ticketStatus, category: ticketCategory, priority: ticketPriority },
      consumable: { status: consumableStatus, location: consumableLocation },
      status:     inventoryStatus,
      category:   inventoryCategory,
      location:   inventoryLocation,
      company:    inventoryCompany,
    };
  }

  // Flat inventory-only call
  const [status, category, location, company] = await Promise.all([
    getDropdownOptions(buildDocId("inventory", "status")),
    getDropdownOptions(buildDocId("inventory", "category")),
    getDropdownOptions(buildDocId("inventory", "location")),
    getDropdownOptions(buildDocId("inventory", "company")),
  ]);

  return { status, category, location, company };
}