import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey:            "AIzaSyCXhyCs9jD81npt8vF8lnqJkAT4Ru28wKs",
  authDomain:        "silverdab-corp-3cfe3.firebaseapp.com",
  projectId:         "silverdab-corp-3cfe3",
  storageBucket:     "silverdab-corp-3cfe3.firebasestorage.app",
  messagingSenderId: "42061668106",
  appId:             "1:42061668106:web:f6230fa2fa03e04a6424f3",
};

export const app = initializeApp(firebaseConfig);
export const db  = getFirestore(app);
export const auth = getAuth(app);   