"use client";

import { useState, useEffect } from "react";
import { useHouse } from "@/contexts/HouseContext";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { TaskCompletion } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { CheckCircle2 } from "lucide-react";

export default function HistoryPage() {
  const { activeHouse, memberProfiles } = useHouse();
  const { user } = useAuth();
  const [completions, setCompletions] = useState<TaskCompletion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!activeHouse) return;
      try {
        const q = query(
          collection(db, "taskCompletions"),
          where("houseId", "==", activeHouse.id),
          orderBy("completedAt", "desc"),
          limit(200)
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as TaskCompletion
        );
        setCompletions(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [activeHouse]);

  const getDisplayName = (completion: TaskCompletion) => {
    if (completion.completedBy === user?.uid) return "You";
    return (
      memberProfiles[completion.completedBy] ||
      completion.completedByName ||
      "A roommate"
    );
  };

  if (!activeHouse) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">History</h1>
        <p className="text-zinc-500">All completed tasks in {activeHouse.name}.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Completions ({completions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-4 text-center">Loading history...</div>
          ) : completions.length === 0 ? (
            <div className="py-8 text-center text-zinc-500">No completions recorded yet.</div>
          ) : (
            <div className="space-y-3">
              {completions.map((c) => (
                <div key={c.id} className="flex items-start gap-4 p-4 border rounded-lg">
                  <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full mt-0.5 shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {c.taskTitle || "Task completed"}
                    </p>
                    <p className="text-sm text-zinc-500">
                      Completed by{" "}
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {getDisplayName(c)}
                      </span>
                    </p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {format(c.completedAt.toDate(), "PPP 'at' p")}
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
