export type UserRole = "employee" | "admin" | "superadmin";

export type ADUser = {
  username: string;
  displayName: string;
  email: string;
  department: string;
  title: string;
  phone: string;
  role: UserRole;
};