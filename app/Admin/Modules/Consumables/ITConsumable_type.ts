// ─── Add or replace ITConsumable in your types.ts ────────────────────────────

export interface ITConsumable {
  id:             string;
  name:           string;
  serial:         string;
  location:       "Unit 1 & 2" | "Unit 3" | "BDO Makati" | "Triumph" | "WFH";
  black:          number;
  photoBlack:     number;
  cyan:           number;
  magenta:        number;
  yellow:         number;
  maintenanceBox: number;
  createdAt?:     any;
  updatedAt?:     any;
}
