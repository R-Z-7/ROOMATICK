"use client";

import { useState, useEffect } from "react";
import { useHouse } from "@/contexts/HouseContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Task, TaskCompletion } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { format, isSameDay, isPast, isToday } from "date-fns";
import { CheckCircle2, Circle, Clock, Calendar as CalendarIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function CalendarPage() {
  const { activeHouse } = useHouse();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completions, setCompletions] = useState<TaskCompletion[]>([]);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!activeHouse) return;
      setLoading(true);
      try {
        // Fetch active tasks to show what's due
        const tasksQ = query(
          collection(db, "tasks"),
          where("houseId", "==", activeHouse.houseId)
        );
        const tasksSnap = await getDocs(tasksQ);
        const allFetchedTasks = tasksSnap.docs.map(d => ({ taskId: d.id, ...d.data() })) as Task[];
        setTasks(allFetchedTasks.filter(t => t.status === "pending" || t.status === "overdue"));

        // Fetch completions to show history
        const compQ = query(
          collection(db, "taskCompletions"),
          where("houseId", "==", activeHouse.houseId)
        );
        const compSnap = await getDocs(compQ);
        setCompletions(compSnap.docs.map(d => ({ completionId: d.id, ...d.data() })) as TaskCompletion[]);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeHouse]);

  const selectedDateTasks = date 
    ? tasks.filter(t => isSameDay(t.dueDate.toDate(), date))
    : [];
    
  const selectedDateCompletions = date 
    ? completions.filter(c => isSameDay(c.completedAt.toDate(), date))
    : [];

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight">Calendar</h1>
        <p className="text-zinc-500 mt-1 text-lg">Track upcoming chores and past completions by date.</p>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        <Card className="lg:col-span-5 border-2 shadow-sm border-zinc-200/60 dark:border-zinc-800 h-fit">
          <CardHeader className="pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <CardTitle className="text-xl">Select Date</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center p-6">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-xl border shadow-sm p-4"
              modifiers={{
                hasTask: (d) => tasks.some(t => isSameDay(t.dueDate.toDate(), d)),
                hasCompletion: (d) => completions.some(c => isSameDay(c.completedAt.toDate(), d))
              }}
              modifiersStyles={{
                hasTask: { fontWeight: 'bold', textDecoration: 'underline', textDecorationColor: '#eab308', textUnderlineOffset: '4px' },
                hasCompletion: { backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#16a34a' }
              }}
            />
          </CardContent>
          <CardContent className="pt-0 pb-6 px-6">
            <div className="flex gap-4 text-xs font-medium text-zinc-500 justify-center">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Task Due</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500"></span> Completed</span>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-7 space-y-6">
          <Card className="border-2 shadow-sm border-zinc-200/60 dark:border-zinc-800 min-h-[400px]">
            <CardHeader className="pb-4 border-b border-zinc-100 dark:border-zinc-800 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-2xl">{date ? format(date, "EEEE, MMMM do") : "Select a date"}</CardTitle>
                <CardDescription className="mt-1">
                  {date && isToday(date) ? "Today's schedule" : "Schedule for this date"}
                </CardDescription>
              </div>
              <CalendarIcon className="w-8 h-8 text-zinc-300" />
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="py-20 text-center text-zinc-500 animate-pulse">Loading schedule...</div>
              ) : selectedDateTasks.length === 0 && selectedDateCompletions.length === 0 ? (
                <div className="py-24 flex flex-col items-center justify-center text-zinc-500">
                  <div className="bg-zinc-100 dark:bg-zinc-800/50 p-4 rounded-full mb-4">
                    <CalendarIcon className="w-8 h-8 text-zinc-400" />
                  </div>
                  <p className="text-lg font-medium text-zinc-900 dark:text-zinc-100">Nothing scheduled</p>
                  <p>No chores due or completed on this day.</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  
                  {/* PENDING TASKS SECTION */}
                  {selectedDateTasks.length > 0 && (
                    <div className="p-6">
                      <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Circle className="w-4 h-4 text-amber-500" /> Tasks Due
                      </h4>
                      <div className="space-y-3">
                        {selectedDateTasks.map(t => {
                          const overdue = isPast(t.dueDate.toDate()) && !isToday(t.dueDate.toDate());
                          return (
                            <div key={t.taskId} className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800">
                              <div className="flex items-center gap-3">
                                {overdue ? <Clock className="w-4 h-4 text-red-500" /> : <Circle className="w-4 h-4 text-amber-500" />}
                                <span className={`font-medium ${overdue ? 'text-red-600 dark:text-red-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
                                  {t.title}
                                </span>
                              </div>
                              <Badge variant="outline" className="capitalize">{t.category}</Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* COMPLETED TASKS SECTION */}
                  {selectedDateCompletions.length > 0 && (
                    <div className="p-6">
                      <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" /> Completed
                      </h4>
                      <div className="space-y-3">
                        {selectedDateCompletions.map(c => (
                          <div key={c.completionId} className="flex items-center justify-between p-3 rounded-lg bg-green-50/50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30">
                            <div className="flex items-center gap-3 opacity-80">
                              <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-500" />
                              <span className="font-medium text-zinc-900 dark:text-zinc-100 line-through decoration-zinc-300 dark:decoration-zinc-700">
                                {"Completed Task"}
                              </span>
                            </div>
                            <span className="text-xs font-semibold text-zinc-500">
                              {format(c.completedAt.toDate(), "h:mm a")}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
