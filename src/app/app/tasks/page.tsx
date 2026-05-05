"use client";

import { useState, useEffect } from "react";
import { useHouse } from "@/contexts/HouseContext";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, addDoc, updateDoc, doc, Timestamp } from "firebase/firestore";
import { Task, TaskCategory, TaskType, TaskFrequency, TaskPriority, TaskStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { format, isPast, isToday } from "date-fns";
import { CheckCircle2, Clock, CalendarIcon, Plus, Sparkles, User, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { completeTask } from "@/lib/services/taskService";

export default function TasksPage() {
  const { activeHouse, members } = useHouse();
  const { user } = useAuth();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Form state
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<TaskCategory>("kitchen");
  const [assignedTo, setAssignedTo] = useState("any");
  const [frequency, setFrequency] = useState<TaskFrequency>("weekly");
  const [taskType, setTaskType] = useState<TaskType>("recurring");
  const [isRotating, setIsRotating] = useState(false);
  const [dueDate, setDueDate] = useState("");

  const fetchTasks = async () => {
    if (!activeHouse) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, "tasks"), 
        where("houseId", "==", activeHouse.id)
      );
      const snapshot = await getDocs(q);
      const allFetchedTasks = snapshot.docs.map(d => ({ taskId: d.id, ...d.data() })) as Task[];
      const fetchedTasks = allFetchedTasks.filter(t => t.status === "pending" || t.status === "overdue");
      
      // Sort in memory (dueDate ASC)
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
    setActionLoading(true);

    try {
      const taskDueDate = Timestamp.fromDate(new Date(dueDate));
      
      let finalAssignee = assignedTo === "any" ? "" : assignedTo;
      let rotationQueue: string[] = [];

      if (isRotating) {
        // Rotate amongst all members for simplicity
        rotationQueue = members.map(m => m.userId);
        if (rotationQueue.length > 0) {
          finalAssignee = rotationQueue[0];
        }
      }

      const newTask: Omit<Task, "taskId"> = {
        houseId: activeHouse.id,
        title,
        category,
        assignedTo: finalAssignee,
        dueDate: taskDueDate,
        status: "pending",
        priority: "medium",
        taskSource: "manual",
        isAnonymousEvent: false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: user.uid,
      };

      if (taskType === "recurring" && isRotating) {
         // Create template instead of raw task if rotating
      }

      await addDoc(collection(db, "tasks"), newTask);
      toast.success("Task created successfully!");
      setIsDialogOpen(false);
      
      // Reset form
      setTitle("");
      setDueDate("");
      setIsRotating(false);
      
      fetchTasks();
    } catch (error) {
      toast.error("Failed to create task");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteTask = async (task: Task) => {
    if (!activeHouse || !user) return;
    setActionLoading(true);
    
    try {
      await completeTask(task.taskId, activeHouse.id, user.uid);
      
      if (task.taskSource === "template") {
        toast.success(`Task completed! The next occurrence has been scheduled.`);
      } else {
        toast.success("Task completed!");
      }
      
      fetchTasks();
    } catch (error: any) {
      toast.error(error.message || "Failed to mark task complete");
    } finally {
      setActionLoading(false);
    }
  };

  const getAssigneeName = (id: string) => {
    if (!id) return "Anyone / Unassigned";
    if (id === "rotation") return "Rotating...";
    const member = members.find(m => m.userId === id);
    return id === user?.uid ? "You" : "Roommate"; // Ideally fetch real names
  };

  if (!activeHouse) return <div className="p-8 text-center">Please create or join a house first.</div>;

  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">Chores & Tasks</h1>
          <p className="text-zinc-500 mt-1 text-lg">Manage what needs to be done around the house.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger render={
            <Button size="lg" className="gap-2 font-bold shadow-lg bg-primary hover:bg-primary/90">
              <Plus className="h-5 w-5" /> New Task
            </Button>
          } />
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Create Task</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateTask} className="space-y-5 pt-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-semibold">Task Title</Label>
                <Input id="title" value={title} onChange={e => setTitle(e.target.value)} required placeholder="e.g. Clean the kitchen surfaces" className="h-11" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Category</Label>
                  <Select value={category} onValueChange={(val) => setCategory(val as TaskCategory)}>
                    <SelectTrigger className="h-11">
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
                  <Label className="text-sm font-semibold">Task Type</Label>
                  <Select value={taskType} onValueChange={(val) => setTaskType(val as TaskType)}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">One-off Task</SelectItem>
                      <SelectItem value="recurring">Recurring</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {taskType === "recurring" && (
                <div className="space-y-4 p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Frequency</Label>
                    <Select value={frequency} onValueChange={(val) => setFrequency(val as TaskFrequency)}>
                      <SelectTrigger className="h-11 bg-white dark:bg-zinc-950">
                        <SelectValue placeholder="Frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-semibold">Rotate Assignees</Label>
                      <p className="text-xs text-zinc-500">Automatically switch turns when completed</p>
                    </div>
                    <Switch checked={isRotating} onCheckedChange={setIsRotating} />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Due Date</Label>
                  <Input type="date" required value={dueDate} onChange={e => setDueDate(e.target.value)} className="h-11" />
                </div>
                
                {!isRotating && (
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Assignee</Label>
                    <Select value={assignedTo} onValueChange={(val) => setAssignedTo(val as string)}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Assignee" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Anyone / Unassigned</SelectItem>
                        {user && <SelectItem value={user.uid}>Me</SelectItem>}
                        {members.filter(m => m.userId !== user?.uid).map(m => (
                          <SelectItem key={m.userId} value={m.userId}>Roommate ({m.userId.substring(0,4)})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full h-11 text-md font-semibold" disabled={actionLoading}>
                {actionLoading ? "Creating..." : "Create Task"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center animate-pulse">
          <RefreshCw className="h-10 w-10 text-zinc-300 animate-spin mb-4" />
          <p className="text-zinc-500 font-medium">Loading tasks...</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="py-24 text-center bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800">
          <div className="bg-white dark:bg-zinc-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-zinc-100 dark:border-zinc-700">
            <Sparkles className="h-10 w-10 text-amber-500" />
          </div>
          <h3 className="text-2xl font-bold mb-2">All caught up!</h3>
          <p className="text-zinc-500 max-w-sm mx-auto text-lg">Your house is completely chore-free right now. Time to relax or create a new task!</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tasks.map(task => {
            const due = task.dueDate.toDate();
            const overdue = isPast(due) && !isToday(due);
            const today = isToday(due);

            return (
              <Card key={task.taskId} className={`flex flex-col border-2 shadow-sm transition-all hover:shadow-md ${overdue ? 'border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-900/10' : 'border-zinc-200/60 dark:border-zinc-800/60'}`}>
                <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800/50">
                  <div className="flex justify-between items-start mb-3">
                    <Badge variant={task.taskSource === "event" ? "destructive" : "outline"} className="capitalize bg-white dark:bg-zinc-950 font-semibold px-2.5 py-0.5">
                      {task.category}
                    </Badge>
                    {overdue ? (
                      <Badge variant="destructive" className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5"/> Overdue</Badge>
                    ) : today ? (
                      <Badge className="bg-amber-500 hover:bg-amber-600 flex items-center gap-1.5 text-white"><Clock className="w-3.5 h-3.5"/> Today</Badge>
                    ) : (
                      <Badge variant="secondary" className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                        <CalendarIcon className="w-3.5 h-3.5"/> {format(due, "MMM d")}
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-xl font-bold leading-tight">{task.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 pt-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/50 p-2.5 rounded-lg">
                      <User className="w-4 h-4" />
                      <span>{getAssigneeName(task.assignedTo)}</span>
                    </div>
                    {task.taskSource === "template" && (
                      <div className="flex items-center gap-2 text-sm text-zinc-500">
                        <RefreshCw className="w-4 h-4 text-zinc-400" />
                        <span>Scheduled Template Task</span>
                      </div>
                    )}

                  </div>
                </CardContent>
                <CardFooter className="pt-2 pb-4 px-4">
                  <Button 
                    className={`w-full h-11 gap-2 font-bold shadow-sm transition-all ${overdue ? "bg-red-600 hover:bg-red-700 text-white shadow-red-500/20" : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20"}`}
                    onClick={() => handleCompleteTask(task)}
                    disabled={actionLoading}
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
