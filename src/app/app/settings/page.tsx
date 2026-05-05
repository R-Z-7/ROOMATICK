"use client";

import { useState } from "react";
import { updateProfile } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useHouse } from "@/contexts/HouseContext";
import {
  Card, CardContent, CardHeader, CardTitle,
  CardDescription, CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export default function SettingsPage() {
  const { userData, signOut, user } = useAuth();
  const { activeHouse } = useHouse();

  const [displayName, setDisplayName] = useState(userData?.displayName || "");
  const [saving, setSaving] = useState(false);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userData || !displayName.trim()) return;

    setSaving(true);
    try {
      // Update Firebase Auth profile
      await updateProfile(user, { displayName: displayName.trim() });
      // Update Firestore user doc (AuthContext onSnapshot will pick this up)
      await updateDoc(doc(db, "users", user.uid), {
        displayName: displayName.trim(),
      });
      toast.success("Name updated!");
    } catch (error: any) {
      toast.error(error.message || "Failed to update name");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-zinc-500">Manage your account and preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Update your display name</CardDescription>
        </CardHeader>
        <form onSubmit={handleUpdateName}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                required
              />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500">Email</p>
              <p className="font-medium">{userData?.email || "N/A"}</p>
            </div>
          </CardContent>
          <CardFooter className="gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {activeHouse && (
        <Card>
          <CardHeader>
            <CardTitle>House</CardTitle>
            <CardDescription>Your current house details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium text-zinc-500">House Name</p>
              <p className="font-medium">{activeHouse.houseName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-500">Invite Code</p>
              <p className="font-mono font-bold tracking-widest">{"Hidden"}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Manage your session</CardDescription>
        </CardHeader>
        <CardContent>
          <Separator className="mb-4" />
          <Button variant="destructive" onClick={signOut}>
            Log Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
