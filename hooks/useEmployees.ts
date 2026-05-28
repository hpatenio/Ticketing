// src/hooks/useEmployees.ts
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

export interface EmployeeOption {
  id: string;
  name: string;
}

export const useEmployees = () => {
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        // fetch from all 3 user collections
        const [adminSnap, empSnap, superSnap] = await Promise.all([
          getDocs(collection(db, "admin_users")),
          getDocs(collection(db, "employee_users")),
          getDocs(collection(db, "superadmin_users")),
        ]);

        const all: EmployeeOption[] = [
          ...adminSnap.docs,
          ...empSnap.docs,
          ...superSnap.docs,
        ].map((doc) => ({
          id:   doc.id,
          name: doc.data().username || doc.data().name || "Unknown",
        }));

        setEmployees(all);
      } catch (err) {
        console.error("Failed to fetch employees:", err);
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, []);

  return { employees, loading };
};