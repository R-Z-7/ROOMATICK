"use client";

import { useState, useEffect } from "react";
import { useHouse } from "@/contexts/HouseContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  doc, collection, addDoc, updateDoc, arrayUnion,
  query, where, getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Task, TaskCompletion } from "@/lib/types";
import { isToday, isPast, format } from "date-fns";
import { CheckCircle2, Clock, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  const { houses, activeHouse, loading, refreshHouseData, memberProfiles } = useHouse();
  const { user, userData } = useAuth();

  const [houseName, setHouseName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [completions, setCompletions] = useState<TaskCompletion[]>([]);

  const fetchData = async () => {
    if (!activeHouse) return;
    try {
      const q = query(
        collection(db, "tasks"),
        where("houseId", "==", activeHouse.id),
        where("status", "in", ["pending", "overdue"])
      );
      const snapshot = await getDocs(q);
      setTasks(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Task[]);

      const compQ = query(
        collection(db, "taskCompletions"),
        where("houseId", "==", activeHouse.id),
        where("dateString", "==", format(new Date(), "yyyy-MM-dd"))
      );
      const compSnap = await getDocs(compQ);
      const comps = compSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as TaskCompletion[];
      comps.sort((a, b) => b.completedAt.toMillis() - a.completedAt.toMillis());
      setCompletions(comps);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeHouse]);

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
        houseIds: arrayUnion(houseRef.id),
      });

      toast.success("House created! Welcome home.");
      setHouseName("");
      // AuthContext onSnapshot will pick up the houseIds change and HouseContext will auto-refresh
    } catch (error: any) {
      toast.error(error.message || "Failed to create house");
    } finally {
      setActionLoading(false);
    }
  };

  const handleJoinHouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userData) return;

    const code = inviteCode.trim().toUpperCase();
    if (!code) return;

    setActionLoading(true);
    try {
      // Find the house with this invite code
      const q = query(
        collection(db, "houses"),
        where("inviteCode", "==", code)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        toast.error("Invalid invite code. Please check and try again.");
        return;
      }

      const houseDoc = snapshot.docs[0];
      const houseId = houseDoc.id;

      // Check if user is already a member
      if (userData.houseIds.includes(houseId)) {
        toast.error("You are already a member of this house.");
        return;
      }

      // Add user to houseMembers
      await addDoc(collection(db, "houseMembers"), {
        houseId,
        userId: user.uid,
        role: "member",
        joinedAt: new Date(),
      });

      // Update user's houseIds — AuthContext onSnapshot will detect this and propagate
      await updateDoc(doc(db, "users", user.uid), {
        houseIds: arrayUnion(houseId),
      });

      toast.success(`Joined "${houseDoc.data().name}" successfully!`);
      setInviteCode("");
    } catch (error: any) {
      toast.error(error.message || "Failed to join house");
    } finally {
      setActionLoading(false);
    }
  };

  const handleBinFull = async () => {
    if (!activeHouse || !user) return;
    setActionLoading(true);
    try {
      await addDoc(collection(db, "tasks"), {
        houseId: activeHouse.id,
        title: "Take out the bin (Bin Full!)",
        category: "rubbish/bin",
        assigneeId: "",
        frequency: "once",
        priority: "urgent",
        status: "pending",
        dueDate: new Date(),
        createdAt: new Date(),
      });
      toast.success("Urgent bin task created!");
      fetchData();
    } catch {
      toast.error("Failed to create bin task");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="flex h-full items-center justify-center">Loading dashboard...</div>;
  }

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
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    maxLength={6}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" variant="outline" disabled={actionLoading}>
                  {actionLoading ? "Joining..." : "Join House"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  const dueTodayTasks = tasks.filter(
    (t) => isToday(t.dueDate.toDate()) && t.status !== "completed"
  );
  const overdueTasks = tasks.filter(
    (t) => isPast(t.dueDate.toDate()) && !isToday(t.dueDate.toDate()) && t.status !== "completed"
  );
  const userCompletions = completions.filter((c) => c.completedBy === user?.uid).length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-zinc-500">Welcome to {activeHouse?.name}</p>
        </div>
        <Button
          className="bg-red-600 hover:bg-red-700 text-white gap-2 font-bold shadow-lg"
          onClick={handleBinFull}
          disabled={actionLoading}
        >
          <Trash2 className="h-5 w-5" /> Bin Full!
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks Due Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dueTodayTasks.length}</div>
          </CardContent>
        </Card>
        <Card className={overdueTasks.length > 0 ? "border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-900/10" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${overdueTasks.length > 0 ? "text-red-600 dark:text-red-400" : ""}`}>
              {overdueTasks.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">House Completions Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Completions Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userCompletions}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Today&apos;s Focus</CardTitle>
            <CardDescription>Chores that need attention right now</CardDescription>
          </CardHeader>
          <CardContent>
            {dueTodayTasks.length === 0 && overdueTasks.length === 0 ? (
              <div className="py-8 text-center text-zinc-500 flex flex-col items-center">
                <CheckCircle2 className="h-8 w-8 text-zinc-300 mb-2" />
                No tasks due today. Great job!
              </div>
            ) : (
              <div className="space-y-3">
                {[...overdueTasks, ...dueTodayTasks].slice(0, 5).map((task) => {
                  const overdue = isPast(task.dueDate.toDate()) && !isToday(task.dueDate.toDate());
                  return (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 border rounded-lg bg-white dark:bg-zinc-900"
                    >
                      <div className="flex items-center gap-3">
                        {task.priority === "urgent" ? (
                          <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                        ) : overdue ? (
                          <Clock className="w-4 h-4 text-red-500" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-amber-500" />
                        )}
                        <div>
                          <p className="font-medium text-sm">{task.title}</p>
                          <p className="text-xs text-zinc-500 capitalize">{task.category}</p>
                        </div>
                      </div>
                      <Badge variant={overdue || task.priority === "urgent" ? "destructive" : "secondary"}>
                        {overdue ? "Overdue" : "Due Today"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent House Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {completions.length === 0 ? (
              <div className="py-8 text-center text-zinc-500">No activity today yet.</div>
            ) : (
              <div className="space-y-4">
                {completions.map((c) => {
                  const name = c.completedBy === user?.uid
                    ? "You"
                    : memberProfiles[c.completedBy] || c.completedByName || "A roommate";
                  return (
                    <div key={c.id} className="flex items-start gap-3">
                      <div className="mt-0.5 bg-green-100 dark:bg-green-900/30 p-1.5 rounded-full">
                        <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm">
                          <span className="font-medium">{name}</span> completed{" "}
                          <span className="font-medium">{c.taskTitle || "a task"}</span>
                        </p>
                        <p className="text-xs text-zinc-500">{format(c.completedAt.toDate(), "h:mm a")}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
