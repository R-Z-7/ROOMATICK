"use client";

import { useState, useEffect } from "react";
import { useHouse } from "@/contexts/HouseContext";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { TaskCompletion } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { format, isSameDay } from "date-fns";
import { CheckCircle2 } from "lucide-react";

export default function CalendarPage() {
  const { activeHouse, memberProfiles } = useHouse();
  const { user } = useAuth();
  const [completions, setCompletions] = useState<TaskCompletion[]>([]);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!activeHouse) return;
      try {
        const q = query(
          collection(db, "taskCompletions"),
          where("houseId", "==", activeHouse.id)
        );
        const snapshot = await getDocs(q);
        setCompletions(
          snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as TaskCompletion[]
        );
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeHouse]);

  const selectedDateCompletions = date
    ? completions
        .filter((c) => isSameDay(c.completedAt.toDate(), date))
        .sort((a, b) => b.completedAt.toMillis() - a.completedAt.toMillis())
    : [];

  // Days that have at least one completion (for calendar highlighting)
  const completionDates = completions.map((c) => c.completedAt.toDate());

  const getDisplayName = (c: TaskCompletion) => {
    if (c.completedBy === user?.uid) return "You";
    return memberProfiles[c.completedBy] || c.completedByName || "A roommate";
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
        <p className="text-zinc-500">Track task completion by date.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Select a Date</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border"
              modifiers={{ hasCompletions: completionDates }}
              modifiersClassNames={{
                hasCompletions: "font-bold underline decoration-green-500 decoration-2",
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{date ? format(date, "PPP") : "Select a date"}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-4 text-center">Loading...</div>
            ) : selectedDateCompletions.length === 0 ? (
              <div className="py-8 text-center text-zinc-500">
                No tasks completed on this date.
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDateCompletions.map((c) => (
                  <div key={c.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className="bg-green-100 dark:bg-green-900/30 p-1.5 rounded-full mt-0.5 shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {c.taskTitle || "Task completed"}
                      </p>
                      <p className="text-sm text-zinc-500">
                        by <span className="font-medium text-zinc-900 dark:text-zinc-100">{getDisplayName(c)}</span>
                        {" · "}
                        {format(c.completedAt.toDate(), "h:mm a")}
                      </p>
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
