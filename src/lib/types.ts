import { Timestamp } from "firebase/firestore";

export type TaskCategory = "kitchen" | "bathroom" | "living room" | "rubbish/bin" | "shopping" | "utilities" | "custom";
export type TaskStatus = "pending" | "completed" | "overdue";
export type TaskFrequency = "once" | "daily" | "weekly" | "monthly" | "custom";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface Task {
  id: string;
  houseId: string;
  title: string;
  description?: string;
  category: TaskCategory;
  assigneeId?: string | "rotation";
  dueDate: Timestamp;
  frequency: TaskFrequency;
  priority: TaskPriority;
  status: TaskStatus;
  createdAt: Timestamp;
  lastCompletedAt?: Timestamp;
}

export interface TaskCompletion {
  id: string;
  taskId: string;
  houseId: string;
  completedBy: string;
  completedByName: string;
  completedAt: Timestamp;
  dateString: string; // YYYY-MM-DD for easy querying
  taskTitle: string;
  note?: string;
}
