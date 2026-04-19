"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const { userData, signOut } = useAuth();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-zinc-500">Manage your account and preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-zinc-500">Name</p>
            <p className="font-medium">{userData?.displayName || "N/A"}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-500">Email</p>
            <p className="font-medium">{userData?.email || "N/A"}</p>
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="destructive" onClick={signOut}>Logout</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
