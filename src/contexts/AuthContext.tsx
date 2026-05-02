"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { onAuthStateChanged, User, signOut as firebaseSignOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, onSnapshot } from "firebase/firestore";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  userData: UserData | null;
  signOut: () => Promise<void>;
}

export interface UserData {
  uid: string;
  email: string;
  displayName: string;
  houseIds: string[];
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  userData: null,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const docUnsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const authUnsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Clean up previous doc listener whenever auth state changes
      if (docUnsubscribeRef.current) {
        docUnsubscribeRef.current();
        docUnsubscribeRef.current = null;
      }

      setUser(firebaseUser);

      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);

        // Subscribe to real-time user doc updates (catches houseIds changes after joining)
        docUnsubscribeRef.current = onSnapshot(userDocRef, async (snap) => {
          if (snap.exists()) {
            setUserData(snap.data() as UserData);
          } else {
            // First sign-up: create user doc
            const newUserData: UserData = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
              displayName:
                firebaseUser.displayName ||
                firebaseUser.email?.split("@")[0] ||
                "User",
              houseIds: [],
            };
            await setDoc(userDocRef, newUserData);
            setUserData(newUserData);
          }
          setLoading(false);
        });
      } else {
        setUserData(null);
        setLoading(false);
      }
    });

    return () => {
      authUnsubscribe();
      if (docUnsubscribeRef.current) docUnsubscribeRef.current();
    };
  }, []);

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, userData, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
