// src/hooks/useEmployees.ts
import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { db, auth } from "../firebase";

export interface EmployeeOption {
  id: string;
  name: string;
}

const USER_COLLECTIONS = ["admin_users", "employee_users", "superadmin_users"];

// Fetch the current user's full name by searching all collections for their email
const resolveCurrentUserName = async (user: User): Promise<string> => {
  const email = user.email ?? "";

  for (const col of USER_COLLECTIONS) {
    try {
      const snap = await getDocs(
        query(collection(db, col), where("email", "==", email))
      );
      if (!snap.empty) {
        const data = snap.docs[0].data();
        const name = data.name || data.username || snap.docs[0].id;
        if (name) return name;
      }
    } catch {
      // collection may not have an email field index — continue
    }
  }

  // Final fallbacks
  return user.displayName || email || "Unknown";
};

export const useEmployees = () => {
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading, setLoading]     = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);

  // Track the logged-in Firebase Auth user and resolve their name
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUserId(user?.uid ?? null);
      if (user) {
        const name = await resolveCurrentUserName(user);
        setCurrentUserName(name);
      } else {
        setCurrentUserName(null);
      }
    });
    return unsubscribe;
  }, []);

  // Fetch all employees from all 3 collections for the assignee/requester dropdowns
  useEffect(() => {
    const fetch = async () => {
      try {
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
          name: doc.data().name || doc.data().username || doc.id,
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

  return { employees, loading, currentUserId, currentUserName };
};
