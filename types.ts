// types.ts
export type UserRole = "employee" | "it" | "admin" | "hr" | "accounting";

export type ADUser = {
  username: string;
  displayName: string;
  email: string;
  department: string;
  title: string;
  phone: string;
  role: UserRole;
};