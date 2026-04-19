"use client";

import { useState } from "react";
import { useHouse } from "@/contexts/HouseContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { doc, setDoc, getDoc, collection, addDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function DashboardPage() {
  const { houses, activeHouse, loading, refreshHouseData } = useHouse();
  const { user, userData } = useAuth();
  
  const [houseName, setHouseName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  if (loading) {
    return <div className="flex h-full items-center justify-center">Loading dashboard...</div>;
  }

  const handleCreateHouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userData) return;
    
    setActionLoading(true);
    try {
      const generatedCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const houseRef = await addDoc(collection(db, "houses"), {
        name: houseName,
        inviteCode: generatedCode,
        ownerId: user.uid,
        createdAt: new Date(),
      });

      await addDoc(collection(db, "houseMembers"), {
        houseId: houseRef.id,
        userId: user.uid,
        role: "admin",
        joinedAt: new Date(),
      });

      await updateDoc(doc(db, "users", user.uid), {
        houseIds: arrayUnion(houseRef.id)
      });

      toast.success("House created successfully!");
      await refreshHouseData();
    } catch (error: any) {
      toast.error(error.message || "Failed to create house");
    } finally {
      setActionLoading(false);
    }
  };

  const handleJoinHouse = async (e: React.FormEvent) => {
    e.preventDefault();
    // Implementation for joining house using invite code
    toast.error("Joining via invite code not fully implemented yet in MVP");
  };

  if (houses.length === 0) {
    return (
      <div className="max-w-4xl mx-auto mt-10">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome to RoomaTick!</h1>
          <p className="text-zinc-500">To get started, create a new house or join an existing one.</p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Create a House</CardTitle>
              <CardDescription>Start a new shared space for you and your roommates.</CardDescription>
            </CardHeader>
            <form onSubmit={handleCreateHouse}>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="houseName">House / Flat Name</Label>
                  <Input 
                    id="houseName" 
                    placeholder="e.g. The Green House" 
                    required 
                    value={houseName}
                    onChange={(e) => setHouseName(e.target.value)}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={actionLoading}>
                  {actionLoading ? "Creating..." : "Create House"}
                </Button>
              </CardFooter>
            </form>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Join a House</CardTitle>
              <CardDescription>Have an invite code? Enter it below to join your roommates.</CardDescription>
            </CardHeader>
            <form onSubmit={handleJoinHouse}>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="inviteCode">Invite Code</Label>
                  <Input 
                    id="inviteCode" 
                    placeholder="e.g. A1B2C3" 
                    required 
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" variant="outline" disabled={actionLoading}>
                  Join House
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  // Dashboard View
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-zinc-500">Welcome to {activeHouse?.name}</p>
        </div>
        <Button className="bg-red-600 hover:bg-red-700 text-white gap-2">
          🗑️ Bin Full!
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks Due Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">1</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">2</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">85%</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Today's Chores</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-500">Task list will appear here.</p>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-500">Activity feed will appear here.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
