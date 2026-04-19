"use client";

import { useState, useEffect } from "react";
import { useHouse } from "@/contexts/HouseContext";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, addDoc, updateDoc, doc, orderBy } from "firebase/firestore";
import { Task } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format, isPast, isToday, addDays, addWeeks, addMonths } from "date-fns";
import { CheckCircle2, Clock, CalendarIcon, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function TasksPage() {
  const { activeHouse, members } = useHouse();
  const { user } = useAuth();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Form state
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Task["category"]>("kitchen");
  const [assigneeId, setAssigneeId] = useState("any");
  const [frequency, setFrequency] = useState<Task["frequency"]>("once");
  const [priority, setPriority] = useState<Task["priority"]>("medium");
  const [dueDate, setDueDate] = useState("");

  const fetchTasks = async () => {
    if (!activeHouse) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, "tasks"), 
        where("houseId", "==", activeHouse.id),
        where("status", "in", ["pending", "overdue"])
      );
      const snapshot = await getDocs(q);
      const fetchedTasks = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Task[];
      
      // Sort in memory since we didn't setup composite indexes yet
      fetchedTasks.sort((a, b) => a.dueDate.toMillis() - b.dueDate.toMillis());
      
      setTasks(fetchedTasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [activeHouse]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeHouse || !user) return;

    try {
      const taskDueDate = new Date(dueDate);
      
      const newTask = {
        houseId: activeHouse.id,
        title,
        category,
        assigneeId: assigneeId === "any" ? "" : assigneeId,
        frequency,
        priority,
        status: "pending",
        dueDate: taskDueDate,
        createdAt: new Date(),
      };

      await addDoc(collection(db, "tasks"), newTask);
      toast.success("Task created!");
      setIsDialogOpen(false);
      
      // Reset form
      setTitle("");
      setDueDate("");
      
      fetchTasks();
    } catch (error) {
      toast.error("Failed to create task");
    }
  };

  const handleCompleteTask = async (task: Task) => {
    if (!activeHouse || !user) return;
    
    try {
      const now = new Date();
      
      // 1. Create a completion record
      await addDoc(collection(db, "taskCompletions"), {
        taskId: task.id,
        houseId: activeHouse.id,
        completedBy: user.uid,
        completedAt: now,
        dateString: format(now, "yyyy-MM-dd"),
      });

      // 2. Update task status or create next occurrence
      if (task.frequency === "once") {
        await updateDoc(doc(db, "tasks", task.id), {
          status: "completed",
          lastCompletedAt: now,
        });
      } else {
        // Calculate next due date
        let nextDate = new Date();
        const currentDueDate = task.dueDate.toDate();
        
        // If overdue, base next date on today, otherwise base on current due date
        const baseDate = isPast(currentDueDate) ? now : currentDueDate;

        if (task.frequency === "daily") nextDate = addDays(baseDate, 1);
        if (task.frequency === "weekly") nextDate = addWeeks(baseDate, 1);
        if (task.frequency === "monthly") nextDate = addMonths(baseDate, 1);

        await updateDoc(doc(db, "tasks", task.id), {
          dueDate: nextDate,
          status: "pending", // ensure it goes back to pending if it was overdue
          lastCompletedAt: now,
        });
        toast.success(`Task completed! Next due: ${format(nextDate, "MMM d")}`);
      }
      
      if (task.frequency === "once") {
        toast.success("Task completed!");
      }
      
      fetchTasks();
    } catch (error) {
      toast.error("Failed to mark task complete");
    }
  };

  const getAssigneeName = (id: string) => {
    if (!id) return "Anyone";
    const member = members.find(m => m.userId === id);
    // Real app would fetch the user's name from `users` collection based on ID.
    // For MVP, if we don't have it, we just show "Assigned"
    return id === user?.uid ? "You" : "Assigned";
  };

  if (!activeHouse) return <div>Please create or join a house first.</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Chores & Tasks</h1>
          <p className="text-zinc-500">Manage what needs to be done around the house.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> New Task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create a new task</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateTask} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="title">Task Title</Label>
                <Input id="title" value={title} onChange={e => setTitle(e.target.value)} required placeholder="e.g. Clean the kitchen" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={(val: any) => setCategory(val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kitchen">Kitchen</SelectItem>
                      <SelectItem value="bathroom">Bathroom</SelectItem>
                      <SelectItem value="living room">Living Room</SelectItem>
                      <SelectItem value="rubbish/bin">Rubbish / Bin</SelectItem>
                      <SelectItem value="shopping">Shopping</SelectItem>
                      <SelectItem value="utilities">Utilities</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select value={frequency} onValueChange={(val: any) => setFrequency(val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="once">Just Once</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input type="date" required value={dueDate} onChange={e => setDueDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={priority} onValueChange={(val: any) => setPriority(val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Assignee</Label>
                <Select value={assigneeId} onValueChange={setAssigneeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Anyone / Unassigned</SelectItem>
                    {user && <SelectItem value={user.uid}>Me</SelectItem>}
                    {/* Map other members here in a complete implementation */}
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full">Create Task</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="py-10 text-center">Loading tasks...</div>
      ) : tasks.length === 0 ? (
        <div className="py-20 text-center bg-white dark:bg-zinc-900 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700">
          <CheckCircle2 className="h-10 w-10 text-zinc-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium">All caught up!</h3>
          <p className="text-zinc-500 max-w-sm mx-auto mt-1">There are no pending tasks right now. Enjoy your clean house or create a new task.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tasks.map(task => {
            const due = task.dueDate.toDate();
            const overdue = isPast(due) && !isToday(due);
            const today = isToday(due);

            return (
              <Card key={task.id} className={`flex flex-col ${overdue ? 'border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <Badge variant={task.priority === "urgent" ? "destructive" : "outline"} className="capitalize">
                      {task.category}
                    </Badge>
                    {overdue ? (
                      <Badge variant="destructive" className="flex items-center gap-1"><Clock className="w-3 h-3"/> Overdue</Badge>
                    ) : today ? (
                      <Badge className="bg-amber-500 hover:bg-amber-600 flex items-center gap-1"><Clock className="w-3 h-3"/> Today</Badge>
                    ) : (
                      <Badge variant="secondary" className="flex items-center gap-1"><CalendarIcon className="w-3 h-3"/> {format(due, "MMM d")}</Badge>
                    )}
                  </div>
                  <CardTitle className="text-xl mt-2">{task.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="text-sm text-zinc-500 space-y-1">
                    <p>Assigned to: <span className="font-medium text-zinc-900 dark:text-zinc-100">{getAssigneeName(task.assigneeId!)}</span></p>
                    <p>Frequency: <span className="capitalize">{task.frequency}</span></p>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    className={`w-full gap-2 ${overdue ? "bg-red-600 hover:bg-red-700 text-white" : "bg-green-600 hover:bg-green-700 text-white"}`}
                    onClick={() => handleCompleteTask(task)}
                  >
                    <CheckCircle2 className="w-5 h-5" /> Mark Complete
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
