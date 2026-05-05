"use client";

import { useState } from "react";
import { useHouse } from "@/contexts/HouseContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

export default function RoommatesPage() {
  const { activeHouse, members, memberProfiles } = useHouse();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  if (!activeHouse) return null;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText("Generate new link via Admin panel");
      setCopied(true);
      toast.success("Invite code copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy code");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Roommates</h1>
        <p className="text-zinc-500">Manage members of {activeHouse.houseName}</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>House Members</CardTitle>
            <CardDescription>{members.length} {members.length === 1 ? "person lives" : "people live"} here</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {members.map((member) => {
                const name = memberProfiles[member.userId] || "User";
                const initials = name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2);
                const isCurrentUser = member.userId === user?.uid;

                return (
                  <div key={member.memberId} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-green-100 text-green-700 font-semibold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {name}
                          {isCurrentUser && (
                            <span className="ml-2 text-xs text-zinc-400">(you)</span>
                          )}
                        </p>
                        <p className="text-xs text-zinc-500">
                          Joined {new Date(member.joinedAt.toDate()).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                    {member.role === "admin" && <Badge>Admin</Badge>}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invite Code</CardTitle>
            <CardDescription>Share this code with your roommates</CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="text-3xl font-mono font-bold tracking-widest bg-zinc-100 dark:bg-zinc-800 p-4 rounded-lg select-all">
              {"Hidden"}
            </div>
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={handleCopyCode}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-600" /> Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" /> Copy Code
                </>
              )}
            </Button>
            <p className="text-sm text-zinc-500">
              New roommates enter this code on the dashboard to join your house.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
