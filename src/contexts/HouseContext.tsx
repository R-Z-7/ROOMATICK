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
  const { user, loading: authLoading } = useAuth();
  const [activeHouse, setActiveHouse] = useState<House | null>(null);
  const [houses, setHouses] = useState<House[]>([]);
  const [members, setMembers] = useState<HouseMember[]>([]);
  const [memberProfiles, setMemberProfiles] = useState<Record<string, string>>({});
  const [selectedHouseId, setSelectedHouseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHouseData = async (houseId?: string) => {
    if (authLoading) {
      return;
    }
    if (!user) {
      setHouses([]);
      setActiveHouse(null);
      setMembers([]);
      setMemberProfiles({});
      setLoading(false);
      return;
    }

    setLoading(true);
    console.log(`[HouseContext] Fetching house data for Auth UID: ${user.uid}`);

    try {
      // Query houseMembers where userId == currentUser.uid and status == "active"
      const memberQuery = query(
        collection(db, "houseMembers"),
        where("userId", "==", user.uid),
        where("status", "==", "active")
      );
      
      const memberSnapshot = await getDocs(memberQuery);
      
      if (memberSnapshot.empty) {
        console.log("[HouseContext] No active house membership found for user. Showing Create or Join state.");
        setHouses([]);
        setActiveHouse(null);
        setMembers([]);
        setMemberProfiles({});
        setLoading(false);
        return;
      }

      const userMemberships = memberSnapshot.docs.map(
        (d) => ({ memberId: d.id, ...d.data() }) as HouseMember
      );
      
      userMemberships.forEach((m) => {
        console.log(`[HouseContext] Found houseMember: memberId=${m.memberId}, houseId=${m.houseId}, role=${m.role}, status=${m.status}`);
      });

      // Fetch all houses this user belongs to
      const fetchedHouses: House[] = [];
      await Promise.all(
        userMemberships.map(async (m) => {
          try {
            const houseDoc = await getDoc(doc(db, "houses", m.houseId));
            if (houseDoc.exists()) {
              fetchedHouses.push({ houseId: houseDoc.id, ...houseDoc.data() } as House);
            }
          } catch (err) {
            console.error(`[HouseContext] Error fetching house ${m.houseId}:`, err);
          }
        })
      );

      setHouses(fetchedHouses);

      if (fetchedHouses.length > 0) {
        const targetId = houseId || selectedHouseId || fetchedHouses[0].houseId;
        console.log(`[HouseContext] Target active houseId: ${targetId}`);

        let activeHouseData = fetchedHouses.find((h) => h.houseId === targetId);
        if (!activeHouseData) {
          activeHouseData = fetchedHouses[0];
        }
        
        setActiveHouse(activeHouseData);

        // Fetch members for this specific active house
        const membersQ = query(
          collection(db, "houseMembers"),
          where("houseId", "==", activeHouseData.houseId)
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
      } else {
        console.log("[HouseContext] No house document found matching active memberships.");
        setActiveHouse(null);
        setMembers([]);
        setMemberProfiles({});
      }
    } catch (error) {
      console.error("[HouseContext] Error fetching house data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch whenever auth loading completes or user changes
  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!user) {
      setHouses([]);
      setActiveHouse(null);
      setMembers([]);
      setMemberProfiles({});
      setLoading(false);
      return;
    }

    fetchHouseData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

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
