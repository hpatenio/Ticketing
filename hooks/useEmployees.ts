// src/hooks/useEmployees.ts
import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { db, auth } from "../firebase";

export interface EmployeeOption {
  id: string;   // lookup key stored in tickets (doc.id OR uid field)
  name: string; // full display name
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
        // doc.id is the full name in this schema; prefer it over username
        const name = snap.docs[0].id || data.name || data.username;
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

  // Track the logged-in Firebase Auth user and resolve their full name
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

  // Fetch all employees from all 3 collections for assignee/requester dropdowns.
  //
  // Firestore schema:  document ID = full name (e.g. "Mikaela Joan Sy")
  //                    fields: email, role, username, Department
  //                    optional field: uid  (Firebase Auth UID)
  //
  // Tickets may store EITHER the doc.id OR the Auth uid in requesterId/assigneeId.
  // We create one entry keyed by doc.id and, when a uid field exists, a second
  // entry keyed by that uid — both pointing to the same full name so the display
  // lookup succeeds regardless of which key was persisted.
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const [adminSnap, empSnap, superSnap] = await Promise.all([
          getDocs(collection(db, "admin_users")),
          getDocs(collection(db, "employee_users")),
          getDocs(collection(db, "superadmin_users")),
        ]);

        const allDocs = [...adminSnap.docs, ...empSnap.docs, ...superSnap.docs];
        const result: EmployeeOption[] = [];
        const seen = new Set<string>();

        for (const doc of allDocs) {
          const data = doc.data();
          // doc.id IS the full name in this schema (e.g. "Mikaela Joan Sy").
          // Fall back to name/username fields just in case.
          const fullName: string = doc.id || data.name || data.username || "Unknown";

          // Entry keyed by doc.id (canonical key)
          if (!seen.has(doc.id)) {
            result.push({ id: doc.id, name: fullName });
            seen.add(doc.id);
          }

          // Entry keyed by Firebase Auth uid field, if present on the document
          const uid: string | undefined = data.uid;
          if (uid && !seen.has(uid)) {
            result.push({ id: uid, name: fullName });
            seen.add(uid);
          }
        }

        setEmployees(result);
      } catch (err) {
        console.error("Failed to fetch employees:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  return { employees, loading, currentUserId, currentUserName };
};
