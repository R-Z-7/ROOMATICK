"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { useAuth } from "./AuthContext";

export interface House {
  id: string;
  name: string;
  inviteCode: string;
  ownerId: string;
  createdAt: any;
}

export interface HouseMember {
  id: string;
  houseId: string;
  userId: string;
  role: "admin" | "member";
  joinedAt: any;
}

interface HouseContextType {
  activeHouse: House | null;
  houses: House[];
  members: HouseMember[];
  loading: boolean;
  refreshHouseData: () => Promise<void>;
  setActiveHouseId: (id: string) => void;
}

const HouseContext = createContext<HouseContextType>({
  activeHouse: null,
  houses: [],
  members: [],
  loading: true,
  refreshHouseData: async () => {},
  setActiveHouseId: () => {},
});

export const useHouse = () => useContext(HouseContext);

export const HouseProvider = ({ children }: { children: React.ReactNode }) => {
  const { userData, user } = useAuth();
  const [activeHouse, setActiveHouse] = useState<House | null>(null);
  const [houses, setHouses] = useState<House[]>([]);
  const [members, setMembers] = useState<HouseMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHouseData = async () => {
    if (!userData || userData.houseIds.length === 0) {
      setHouses([]);
      setActiveHouse(null);
      setMembers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // For MVP, just load the first house
      const firstHouseId = userData.houseIds[0];
      const houseDoc = await getDoc(doc(db, "houses", firstHouseId));
      
      if (houseDoc.exists()) {
        const houseData = { id: houseDoc.id, ...houseDoc.data() } as House;
        setActiveHouse(houseData);
        setHouses([houseData]);

        // Fetch members
        const membersQ = query(collection(db, "houseMembers"), where("houseId", "==", houseData.id));
        const membersSnapshot = await getDocs(membersQ);
        const membersData = membersSnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as HouseMember[];
        setMembers(membersData);
      }
    } catch (error) {
      console.error("Error fetching house data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userData) {
      fetchHouseData();
    } else {
      setLoading(false);
      setActiveHouse(null);
      setHouses([]);
      setMembers([]);
    }
  }, [userData]);

  const setActiveHouseId = (id: string) => {
    // Implement if supporting multiple houses
  };

  return (
    <HouseContext.Provider value={{ activeHouse, houses, members, loading, refreshHouseData: fetchHouseData, setActiveHouseId }}>
      {children}
    </HouseContext.Provider>
  );
};
