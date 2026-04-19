"use client";

import { useState, useEffect } from "react";
import { useHouse } from "@/contexts/HouseContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { TaskCompletion } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { CheckCircle2 } from "lucide-react";

export default function HistoryPage() {
  const { activeHouse, members } = useHouse();
  const [completions, setCompletions] = useState<TaskCompletion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!activeHouse) return;
      try {
        const q = query(
          collection(db, "taskCompletions"),
          where("houseId", "==", activeHouse.id),
          // orderBy("completedAt", "desc"), // Requires composite index, doing in-memory sort for MVP
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as TaskCompletion[];
        data.sort((a, b) => b.completedAt.toMillis() - a.completedAt.toMillis());
        setCompletions(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [activeHouse]);

  const getMemberName = (id: string) => {
    // In a real app, we'd fetch the user's document
    return members.find(m => m.userId === id)?.userId === id ? "A roommate" : "Someone";
  };

  if (!activeHouse) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">History</h1>
        <p className="text-zinc-500">See all completed tasks in your house.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Completions</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-4 text-center">Loading history...</div>
          ) : completions.length === 0 ? (
            <div className="py-8 text-center text-zinc-500">No completions recorded yet.</div>
          ) : (
            <div className="space-y-4">
              {completions.map(c => (
                <div key={c.id} className="flex items-start gap-4 p-4 border rounded-lg">
                  <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full mt-1">
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-medium text-lg">Task Completed</p>
                    <p className="text-sm text-zinc-500">
                      Completed by <span className="font-medium text-zinc-900 dark:text-zinc-100">{getMemberName(c.completedBy)}</span> on {format(c.completedAt.toDate(), "PPP 'at' p")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
