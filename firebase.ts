import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey:            "AIzaSyCXhyCs9jD81npt8vF8lnqJkAT4Ru28wKs",
  authDomain:        "silverdab-corp-3cfe3.firebaseapp.com",
  projectId:         "silverdab-corp-3cfe3",
  storageBucket:     "silverdab-corp-3cfe3.firebasestorage.app",
  messagingSenderId: "42061668106",
  appId:             "1:42061668106:web:f6230fa2fa03e04a6424f3",
  measurementId:     "G-M8L4TF0025",
};

export const app = initializeApp(firebaseConfig);
export const db  = getFirestore(app);

// ─── Connection Test (remove this once confirmed working) ──────────────────────
async function testFirestoreConnection() {
  try {
    console.log("🔥 Testing Firestore connection...");
    const snapshot = await getDocs(collection(db, "IT_Users"));
    console.log("✅ Firestore connected! Docs in IT_Users:", snapshot.size);
    snapshot.forEach(doc => console.log("  →", doc.id, doc.data()));
  } catch (err: any) {
    console.error("❌ Firestore FAILED:", err.code, err.message);
  }
}

testFirestoreConnection();
