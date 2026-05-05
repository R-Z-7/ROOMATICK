"use client";

import { useState, useEffect } from "react";
import { useHouse } from "@/contexts/HouseContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { query, where, getDocs, collection, Timestamp, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Task, TaskCompletion } from "@/lib/types";
import { createHouse, joinHouse } from "@/lib/services/houseService";
import { triggerBinFull } from "@/lib/services/taskService";
import { isToday, isPast, format, startOfDay, endOfDay } from "date-fns";
import { CheckCircle2, Clock, Trash2, Home, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  const { houses, activeHouse, loading, refreshHouseData } = useHouse();
  const { user, userData } = useAuth();
  
  const [houseName, setHouseName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [completions, setCompletions] = useState<TaskCompletion[]>([]);

  const fetchData = async () => {
    if (!activeHouse) return;
    try {
      // Fetch Tasks
      const q = query(
        collection(db, "tasks"), 
        where("houseId", "==", activeHouse.id)
      );
      const snapshot = await getDocs(q);
      const allFetchedTasks = snapshot.docs.map(d => ({ taskId: d.id, ...d.data() })) as Task[];
      const fetchedTasks = allFetchedTasks.filter(t => t.status === "pending" || t.status === "overdue");
      setTasks(fetchedTasks);

      // Fetch Recent Completions (Today)
      const todayStart = Timestamp.fromDate(startOfDay(new Date()));
      const todayEnd = Timestamp.fromDate(endOfDay(new Date()));
      
      const compQ = query(
        collection(db, "taskCompletions"),
        where("houseId", "==", activeHouse.id)
      );
      const compSnap = await getDocs(compQ);
      
      // Filter in memory to avoid needing a Firestore Composite Index
      const allCompletions = compSnap.docs.map(d => ({ completionId: d.id, ...d.data() })) as TaskCompletion[];
      const todayCompletions = allCompletions.filter(c => {
        const d = c.completedAt.toDate();
        return d >= todayStart.toDate() && d <= todayEnd.toDate();
      });
      
      setCompletions(todayCompletions);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeHouse]);

  const handleCreateHouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userData) return;
    
    setActionLoading(true);
    try {
      const houseId = await createHouse(houseName, user.uid);
      await updateDoc(doc(db, "users", user.uid), {
        houseIds: arrayUnion(houseId)
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
    if (!user || !userData) return;

    setActionLoading(true);
    try {
      await joinHouse(inviteCode, user.uid);
      const inviteDoc = await getDocs(query(collection(db, "invites"), where("__name__", "==", inviteCode)));
      const houseId = inviteDoc.docs[0]?.data().houseId;
      if (houseId) {
        await updateDoc(doc(db, "users", user.uid), {
          houseIds: arrayUnion(houseId)
        });
      }
      toast.success("Successfully joined the house!");
      await refreshHouseData();
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
      await triggerBinFull(activeHouse.id);
      toast.success("Bin full event triggered! House notified.");
      fetchData();
    } catch (error) {
      toast.error("Failed to trigger bin full event.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center min-h-[50vh]">
        <div className="animate-pulse flex flex-col items-center">
          <Home className="w-12 h-12 text-zinc-300 mb-4" />
          <p className="text-zinc-500 font-medium">Loading your space...</p>
        </div>
      </div>
    );
  }

  if (houses.length === 0) {
    return (
      <div className="max-w-4xl mx-auto mt-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-3">Welcome to RoomaTick</h1>
          <p className="text-lg text-zinc-500 max-w-lg mx-auto">Get your flat organized. Start by creating a new house or joining an existing one with an invite code.</p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8">
          <Card className="border-2 border-primary/10 shadow-lg hover:border-primary/30 transition-colors">
            <CardHeader>
              <CardTitle className="text-2xl">Create a House</CardTitle>
              <CardDescription>Start a new shared space and invite your flatmates.</CardDescription>
            </CardHeader>
            <form onSubmit={handleCreateHouse}>
              <CardContent>
                <div className="space-y-3">
                  <Label htmlFor="houseName" className="text-sm font-semibold">House Name</Label>
                  <Input 
                    id="houseName" 
                    placeholder="e.g. 221B Baker St" 
                    required 
                    value={houseName}
                    onChange={(e) => setHouseName(e.target.value)}
                    className="h-12"
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={actionLoading} className="w-full h-12 text-md font-semibold">
                  {actionLoading ? "Creating..." : "Create House"}
                </Button>
              </CardFooter>
            </form>
          </Card>

          <Card className="border-2 border-zinc-200 shadow-sm hover:border-zinc-300 transition-colors dark:border-zinc-800 dark:hover:border-zinc-700">
            <CardHeader>
              <CardTitle className="text-2xl">Join a House</CardTitle>
              <CardDescription>Have an invite link? Enter the code below.</CardDescription>
            </CardHeader>
            <form onSubmit={handleJoinHouse}>
              <CardContent>
                <div className="space-y-3">
                  <Label htmlFor="inviteCode" className="text-sm font-semibold">Invite Code</Label>
                  <Input 
                    id="inviteCode" 
                    placeholder="Paste code here..." 
                    required 
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    className="h-12"
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" variant="secondary" disabled={actionLoading} className="w-full h-12 text-md font-semibold">
                  {actionLoading ? "Joining..." : "Join House"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  const dueTodayTasks = tasks.filter(t => isToday(t.dueDate.toDate()) && t.status !== "completed");
  const overdueTasks = tasks.filter(t => isPast(t.dueDate.toDate()) && !isToday(t.dueDate.toDate()) && t.status !== "completed");
  const userCompletions = completions.filter(c => c.completedBy === user?.uid).length;

  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">Dashboard</h1>
          <p className="text-zinc-500 mt-1 text-lg">Welcome home, {userData?.displayName.split(' ')[0]}</p>
        </div>
        <Button 
          size="lg"
          className="bg-red-500 hover:bg-red-600 text-white gap-2 font-bold shadow-xl hover:shadow-red-500/20 transition-all"
          onClick={handleBinFull}
          disabled={actionLoading}
        >
          <Trash2 className="h-5 w-5" /> Bin Full!
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-zinc-950 border-blue-100 dark:border-blue-900/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-800 dark:text-blue-300">Due Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-blue-900 dark:text-blue-100">{dueTodayTasks.length}</div>
          </CardContent>
        </Card>
        <Card className={overdueTasks.length > 0 ? "bg-gradient-to-br from-red-50 to-white dark:from-red-950/20 dark:to-zinc-950 border-red-200 dark:border-red-900/50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-800 dark:text-red-300">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-black ${overdueTasks.length > 0 ? "text-red-600 dark:text-red-400" : "text-zinc-400"}`}>
              {overdueTasks.length}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-zinc-950 border-emerald-100 dark:border-emerald-900/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-800 dark:text-emerald-300">House Completions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{completions.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-zinc-950 border-purple-100 dark:border-purple-900/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-800 dark:text-purple-300">Your Completions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-purple-600 dark:text-purple-400">{userCompletions}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 border-zinc-200/60 shadow-md">
          <CardHeader className="pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <CardTitle className="text-xl">Today's Focus</CardTitle>
            <CardDescription>Chores that need attention right now</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {dueTodayTasks.length === 0 && overdueTasks.length === 0 ? (
              <div className="py-16 text-center flex flex-col items-center">
                <div className="bg-green-100 dark:bg-green-900/20 p-4 rounded-full mb-4">
                  <CheckCircle2 className="h-10 w-10 text-green-500" />
                </div>
                <h3 className="text-lg font-semibold mb-1">All caught up!</h3>
                <p className="text-zinc-500">No tasks due today. Great job!</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {[...overdueTasks, ...dueTodayTasks].slice(0, 5).map(task => {
                  const overdue = isPast(task.dueDate.toDate()) && !isToday(task.dueDate.toDate());
                  return (
                    <div key={task.taskId} className="flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                      <div className="flex items-center gap-4">
                        {task.taskSource === "event" ? (
                          <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse" />
                        ) : overdue ? (
                          <Clock className="w-5 h-5 text-red-500" />
                        ) : (
                          <div className="w-3 h-3 rounded-full bg-amber-400" />
                        )}
                        <div>
                          <p className="font-semibold text-zinc-900 dark:text-zinc-100">{task.title}</p>
                          <p className="text-sm text-zinc-500 capitalize flex items-center gap-2">
                            {task.category}
                            {task.taskSource === "template" && <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">Rotating</span>}
                          </p>
                        </div>
                      </div>
                      <Badge variant={overdue ? "destructive" : task.taskSource === "event" ? "destructive" : "secondary"} className="ml-2">
                        {overdue ? "Overdue" : "Due Today"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="col-span-3 border-zinc-200/60 shadow-md">
          <CardHeader className="pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <CardTitle className="text-xl">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {completions.length === 0 ? (
              <div className="py-12 text-center text-zinc-500">
                <p>No activity today yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {completions.map(c => (
                  <div key={c.completionId} className="flex items-start gap-3 p-4">
                    <div className="mt-1 bg-green-100 dark:bg-green-900/30 p-1.5 rounded-full shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-zinc-900 dark:text-zinc-100">
                        <span className="font-semibold">{c.completedBy === user?.uid ? "You" : "Someone"}</span> completed a task
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">{format(c.completedAt.toDate(), "h:mm a")}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
