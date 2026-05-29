import { Timestamp } from "firebase/firestore";

export type UserRole = "employee" | "admin" | "superadmin";

export type ADUser = {
  username:    string;
  displayName: string;
  email:       string;
  department:  string;
  title:       string;
  phone:       string;
  role:        UserRole;
};

export interface ITInventory {
  id:           string;
  assetTag:     string;
  company:      string;
  serialNumber: string;
  model:        string;
  brand:        string;
  status:       "Deployed" | "Spare" | "Defective";
  assigneeId:   string;
  assigneeName: string;
  category:     "Laptop" | "Monitor" | "Desktop";
  location:     "Unit 1 & 2" | "Unit 3" | "BDO Makati" | "Triumph" | "WFH";
  datePurchased: Timestamp;
  notes:        string;
  createdAt:    Timestamp;
}

export interface ITConsumable {
  id:             string;
  name:           string;
  model:         string;
  status:        "Spare" | "Deployed" | "Defective";
  location:       "Unit 1 & 2" | "Unit 3" | "BDO Makati" | "Triumph" | "WFH";
  ipAddress?:     string;
  macAddress?:    string;
  black:          number;
  photoBlack:     number;
  cyan:           number;
  magenta:        number;
  yellow:         number;
  maintenanceBox: number;
  createdAt?:     Timestamp;
  updatedAt?:     Timestamp;
}

export interface ConcernTicket {
  id:            string;
  ticketNumber:  string;
  summary:       string;
  requesterId:   string;
  requesterName: string;
  assigneeId:    string;
  assigneeName:  string;
  category:      "CCTV" | "Licenses Accounts" | "Hardware" | "Email" | "Network" | "Maintenance" | "Medicine" | "Office Supplies" | "Software" | "Other";
  priority:      "Low" | "Medium" | "High";
  status:        "Pending" | "In Progress" | "Resolved";
  dateCreated:   Timestamp;
  dueDate:       Timestamp;
}

// For the reusable table
export interface Column<T> {
  key:     keyof T;
  label:   string;
  render?: (row: T) => React.ReactNode;
}
