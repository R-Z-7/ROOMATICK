"use client";

import { useHouse } from "@/contexts/HouseContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export default function RoommatesPage() {
  const { activeHouse, members } = useHouse();

  if (!activeHouse) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Roommates</h1>
        <p className="text-zinc-500">Manage members of {activeHouse.name}</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>House Members</CardTitle>
            <CardDescription>{members.length} people live here</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {members.map(member => (
                <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-green-100 text-green-700">U</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">User {member.userId.substring(0, 5)}</p>
                      <p className="text-xs text-zinc-500">Joined {new Date(member.joinedAt.toDate()).toLocaleDateString()}</p>
                    </div>
                  </div>
                  {member.role === "admin" && <Badge>Admin</Badge>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invite Code</CardTitle>
            <CardDescription>Share this code to invite others</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-3xl font-mono font-bold tracking-widest bg-zinc-100 dark:bg-zinc-800 p-4 rounded-lg">
              {activeHouse.inviteCode}
            </div>
            <p className="text-sm text-zinc-500 mt-4">
              New roommates can enter this code when signing up to join your house.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
