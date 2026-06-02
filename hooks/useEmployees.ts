// src/hooks/useEmployees.ts
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../firebase";

export interface EmployeeOption {
  id: string;
  name: string;
}

export const useEmployees = () => {
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading, setLoading]     = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Track the logged-in user so we can mark "Me" in the assignee picker
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUserId(user?.uid ?? null);
    });
    return unsubscribe;
  }, []);

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

  return { employees, loading, currentUserId };
};
