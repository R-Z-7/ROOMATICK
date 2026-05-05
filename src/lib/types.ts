import { Timestamp } from "firebase/firestore";

export type Role = "admin" | "roommate";

export interface User {
  userId: string; // Firebase Auth UID
  name: string;
  email: string;
  photoURL?: string;
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
}

export type TaskEditMode = "admin_only" | "creator_and_admin" | "everyone";

export interface House {
  houseId: string;
  houseName: string;
  createdBy: string;
  taskEditMode: TaskEditMode;
  allowAllMembersAdmin: boolean;
  createdAt: Timestamp;
  active: boolean;
}

export interface HouseMember {
  memberId: string; // houseId_userId
  houseId: string;
  userId: string;
  role: Role;
  joinedAt: Timestamp;
  status: "active" | "inactive";
}

export interface Invite {
  inviteId: string;
  houseId: string;
  createdBy: string;
  inviteToken: string;
  used: boolean;
  usedBy?: string;
  createdAt: Timestamp;
  expiresAt: Timestamp;
}

export type TaskCategory = "kitchen" | "bathroom" | "living room" | "rubbish/bin" | "shopping" | "utilities" | "custom";
export type TaskType = "fixed" | "recurring" | "event" | "manual";
export type TaskFrequency = "daily" | "weekly" | "monthly" | "custom";
export type TaskStatus = "pending" | "completed" | "overdue";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskSource = "template" | "manual" | "event";

export interface TaskTemplate {
  templateId: string;
  houseId: string; // "system" for default global templates
  title: string;
  description?: string;
  category: TaskCategory;
  taskType: TaskType;
  rotationEnabled: boolean;
  rotationOrder: string[]; // array of userIds
  currentRotationIndex: number;
  frequency?: TaskFrequency;
  frequencyConfig?: any;
  createdBy: string;
  createdAt: Timestamp;
  active: boolean;
}

export interface Task {
  taskId: string;
  houseId: string;
  templateId?: string;
  title: string;
  description?: string;
  category: TaskCategory;
  assignedTo: string; // userId
  createdBy: string;
  dueDate: Timestamp;
  status: TaskStatus;
  priority: TaskPriority;
  taskSource: TaskSource;
  isAnonymousEvent: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TaskCompletion {
  completionId: string;
  taskId: string;
  houseId: string;
  completedBy: string; // userId
  assignedTo: string; // userId
  completedAt: Timestamp;
  note?: string;
  photoURL?: string;
  completedOnBehalf: boolean;
  completedOnBehalfReason?: string;
}

export type EventType = "bin_full" | "custom";

export interface HouseEvent {
  eventId: string;
  houseId: string;
  eventType: EventType;
  anonymous: boolean;
  assignedTo: string;
  taskId: string; // Linked task
  createdAt: Timestamp;
  resolvedAt?: Timestamp;
  status: "active" | "resolved";
}

export type NotificationType = "task_assigned" | "task_due_today" | "task_overdue" | "bin_full_triggered" | "task_completed" | "task_reassigned" | "invite_sent";

export interface Notification {
  notificationId: string;
  houseId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  relatedTaskId?: string;
  createdAt: Timestamp;
}

export interface EmailLog {
  emailLogId: string;
  houseId: string;
  userId: string;
  to: string;
  type: NotificationType;
  subject: string;
  status: "pending" | "sent" | "failed";
  provider: "resend" | "brevo" | "sendgrid" | "system";
  createdAt: Timestamp;
  errorMessage?: string;
}
