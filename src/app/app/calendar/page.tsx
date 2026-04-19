"use client";

import { useState, useEffect } from "react";
import { useHouse } from "@/contexts/HouseContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Task, TaskCompletion } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { format, isSameDay } from "date-fns";

export default function CalendarPage() {
  const { activeHouse } = useHouse();
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
        setCompletions(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as TaskCompletion[]);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeHouse]);

  const selectedDateCompletions = date 
    ? completions.filter(c => isSameDay(c.completedAt.toDate(), date))
    : [];

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
              <div className="space-y-4">
                {selectedDateCompletions.map(c => (
                  <div key={c.id} className="p-3 border rounded-lg">
                    <p className="font-medium">Task Completed</p>
                    <p className="text-xs text-zinc-500">At {format(c.completedAt.toDate(), "p")}</p>
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
