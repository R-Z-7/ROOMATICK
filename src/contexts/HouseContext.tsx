"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { useAuth } from "./AuthContext";
import { House, HouseMember } from "@/lib/types";

interface HouseContextType {
  activeHouse: House | null;
  houses: House[];
  members: HouseMember[];
  memberProfiles: Record<string, string>; // userId -> displayName
  loading: boolean;
  refreshHouseData: () => Promise<void>;
  setActiveHouseId: (id: string) => void;
}

const HouseContext = createContext<HouseContextType>({
  activeHouse: null,
  houses: [],
  members: [],
  memberProfiles: {},
  loading: true,
  refreshHouseData: async () => {},
  setActiveHouseId: () => {},
});

export const useHouse = () => useContext(HouseContext);

export const HouseProvider = ({ children }: { children: React.ReactNode }) => {
  const { userData } = useAuth();
  const [activeHouse, setActiveHouse] = useState<House | null>(null);
  const [houses, setHouses] = useState<House[]>([]);
  const [members, setMembers] = useState<HouseMember[]>([]);
  const [memberProfiles, setMemberProfiles] = useState<Record<string, string>>({});
  const [selectedHouseId, setSelectedHouseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHouseData = async (houseId?: string) => {
    if (!userData || userData.houseIds.length === 0) {
      setHouses([]);
      setActiveHouse(null);
      setMembers([]);
      setMemberProfiles({});
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const targetId = houseId || selectedHouseId || userData.houseIds[0];
      const houseDoc = await getDoc(doc(db, "houses", targetId));

      if (houseDoc.exists()) {
        const houseData = { houseId: houseDoc.id, ...houseDoc.data() } as House;
        setActiveHouse(houseData);
        setHouses([houseData]);

        // Fetch members
        const membersQ = query(
          collection(db, "houseMembers"),
          where("houseId", "==", houseData.houseId)
        );
        const membersSnapshot = await getDocs(membersQ);
        const membersData = membersSnapshot.docs.map(
          (d) => ({ memberId: d.id, ...d.data() }) as HouseMember
        );
        setMembers(membersData);

        // Fetch display names for all members
        const profiles: Record<string, string> = {};
        await Promise.all(
          membersData.map(async (member) => {
            try {
              const userDoc = await getDoc(doc(db, "users", member.userId));
              if (userDoc.exists()) {
                const data = userDoc.data();
                profiles[member.userId] =
                  data.displayName || data.email?.split("@")[0] || "User";
              }
            } catch {
              profiles[member.userId] = "User";
            }
          })
        );
        setMemberProfiles(profiles);
      }
    } catch (error) {
      console.error("Error fetching house data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch whenever userData changes (covers joining a house, which updates houseIds via onSnapshot)
  useEffect(() => {
    if (userData && userData.houseIds.length > 0) {
      fetchHouseData();
    } else if (userData) {
      setLoading(false);
      setActiveHouse(null);
      setHouses([]);
      setMembers([]);
      setMemberProfiles({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData]);

  const setActiveHouseId = (id: string) => {
    setSelectedHouseId(id);
    fetchHouseData(id);
  };

  return (
    <HouseContext.Provider
      value={{
        activeHouse,
        houses,
        members,
        memberProfiles,
        loading,
        refreshHouseData: fetchHouseData,
        setActiveHouseId,
      }}
    >
      {children}
    </HouseContext.Provider>
  );
};
