import { db } from "@/lib/firebase";
import { 
  collection, doc, setDoc, 
  Timestamp, runTransaction
} from "firebase/firestore";
import { House, HouseMember, Invite } from "../types";

export const createHouse = async (houseName: string, userId: string) => {
  const houseRef = doc(collection(db, "houses"));
  const houseId = houseRef.id;

  const newHouse: Omit<House, "houseId"> = {
    houseName,
    createdBy: userId,
    taskEditMode: "creator_and_admin",
    allowAllMembersAdmin: false,
    createdAt: Timestamp.now(),
    active: true,
  };

  await setDoc(houseRef, newHouse);

  // Automatically add creator as admin
  const memberId = `${houseId}_${userId}`;
  const memberRef = doc(db, "houseMembers", memberId);
  const newMember: Omit<HouseMember, "memberId"> = {
    houseId,
    userId,
    role: "admin",
    joinedAt: Timestamp.now(),
    status: "active",
  };

  await setDoc(memberRef, newMember);

  return houseId;
};

export const generateInvite = async (houseId: string, adminId: string) => {
  const inviteRef = doc(collection(db, "invites"));
  const inviteToken = Math.random().toString(36).substring(2, 10).toUpperCase();
  
  // Invite expires in 7 days
  const expiresDate = new Date();
  expiresDate.setDate(expiresDate.getDate() + 7);

  const newInvite: Omit<Invite, "inviteId"> = {
    houseId,
    createdBy: adminId,
    inviteToken,
    used: false,
    createdAt: Timestamp.now(),
    expiresAt: Timestamp.fromDate(expiresDate),
  };

  await setDoc(inviteRef, newInvite);
  
  return inviteToken; 
};

export const joinHouse = async (inviteToken: string, userId: string) => {
  // To keep transaction logic clean, we assume the caller already found the invite doc ID by token
  // For MVP: this will be updated in the UI to first query the token, then pass the inviteId
};
