"use client";

import { useState, useEffect } from "react";
import { useHouse } from "@/contexts/HouseContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { TaskCompletion } from "@/lib/types";
import { format, isToday, isYesterday } from "date-fns";
import { CheckCircle2, History as HistoryIcon, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(d => ({ completionId: d.id, ...d.data() })) as TaskCompletion[];
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
    const member = members.find(m => m.userId === id);
    return member ? `Roommate (${id.substring(0,4)})` : "Someone";
  };

  const getRelativeDate = (timestamp: Timestamp) => {
    const date = timestamp.toDate();
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMM d, yyyy");
  };

  // Group completions by date
  const groupedCompletions = completions.reduce((acc, curr) => {
    const dateLabel = getRelativeDate(curr.completedAt);
    if (!acc[dateLabel]) {
      acc[dateLabel] = [];
    }
    acc[dateLabel].push(curr);
    return acc;
  }, {} as Record<string, TaskCompletion[]>);

  if (!activeHouse) return <div className="p-8 text-center">Please create or join a house first.</div>;

  return (
    <div className="space-y-8 max-w-4xl mx-auto animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight">History Log</h1>
        <p className="text-zinc-500 mt-1 text-lg">A complete record of who did what, and when.</p>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center animate-pulse">
          <HistoryIcon className="h-10 w-10 text-zinc-300 animate-reverse-spin mb-4" />
          <p className="text-zinc-500 font-medium">Fetching history...</p>
        </div>
      ) : completions.length === 0 ? (
        <div className="py-24 text-center bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800">
          <div className="bg-white dark:bg-zinc-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-zinc-100 dark:border-zinc-700">
            <HistoryIcon className="h-10 w-10 text-zinc-400" />
          </div>
          <h3 className="text-2xl font-bold mb-2">No history yet.</h3>
          <p className="text-zinc-500 max-w-sm mx-auto text-lg">When tasks are completed, they will appear here forever.</p>
        </div>
      ) : (
        <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-zinc-200 dark:before:via-zinc-800 before:to-transparent">
          {Object.entries(groupedCompletions).map(([date, items]) => (
            <div key={date} className="relative">
              <div className="sticky top-0 z-10 flex items-center justify-center mb-6">
                <Badge variant="outline" className="bg-white dark:bg-zinc-950 px-4 py-1.5 shadow-sm text-sm font-semibold border-zinc-200 dark:border-zinc-800">
                  {date}
                </Badge>
              </div>
              
              <div className="space-y-4">
                {items.map(c => (
                  <div key={c.completionId} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-zinc-950 bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 shadow-sm md:absolute md:left-1/2 md:-translate-x-1/2 z-10">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm transition-all hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                          {format(c.completedAt.toDate(), "h:mm a")}
                        </span>
                        <h4 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
                          {"Completed Task"}
                        </h4>
                        <div className="flex items-center gap-2 mt-2 text-sm text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-950/50 w-fit px-2.5 py-1 rounded-md">
                          <User className="w-3.5 h-3.5" />
                          <span className="font-medium">{getMemberName(c.completedBy)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
