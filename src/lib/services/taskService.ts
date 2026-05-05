import { db } from "@/lib/firebase";
import { 
  collection, doc, setDoc, addDoc, 
  updateDoc, Timestamp, runTransaction
} from "firebase/firestore";
import { Task, TaskCompletion, HouseEvent, TaskFrequency, TaskTemplate } from "../types";

// Helper to calculate next due date based on frequency
export function calculateNextDueDate(currentDue: Timestamp, frequency: TaskFrequency): Timestamp {
  const date = currentDue.toDate();
  switch (frequency) {
    case "daily":
      date.setDate(date.getDate() + 1);
      break;
    case "weekly":
      date.setDate(date.getDate() + 7);
      break;
    case "monthly":
      date.setMonth(date.getMonth() + 1);
      break;
    default:
      date.setDate(date.getDate() + 1); // Default to +1 day for safety
  }
  return Timestamp.fromDate(date);
}

export const completeTask = async (
  taskId: string, 
  houseId: string, 
  userId: string, 
  completedOnBehalf: boolean = false,
  note?: string
) => {
  const taskRef = doc(db, "tasks", taskId);
  
  await runTransaction(db, async (transaction) => {
    const taskDoc = await transaction.get(taskRef);
    if (!taskDoc.exists()) {
      throw new Error("Task does not exist!");
    }

    const task = taskDoc.data() as Task;

    // 1. Record the completion
    const completionRef = doc(collection(db, "taskCompletions"));
    const completion: Omit<TaskCompletion, "completionId"> = {
      taskId,
      houseId,
      completedBy: userId,
      assignedTo: task.assignedTo,
      completedAt: Timestamp.now(),
      note,
      completedOnBehalf,
    };
    transaction.set(completionRef, completion);

    // 2. Handle Recurring & Rotating Logic
    if (task.templateId && task.taskSource === "template") {
      const templateRef = doc(db, "taskTemplates", task.templateId);
      const templateDoc = await transaction.get(templateRef);
      
      if (templateDoc.exists()) {
        const template = templateDoc.data() as TaskTemplate;
        
        let nextAssignee = task.assignedTo;
        let nextIndex = template.currentRotationIndex;

        if (template.rotationEnabled && template.rotationOrder.length > 0) {
          nextIndex = (template.currentRotationIndex + 1) % template.rotationOrder.length;
          nextAssignee = template.rotationOrder[nextIndex];
          
          transaction.update(templateRef, {
            currentRotationIndex: nextIndex
          });
        }

        const nextDue = template.frequency ? calculateNextDueDate(task.dueDate, template.frequency) : Timestamp.fromDate(new Date(task.dueDate.toDate().getTime() + 86400000));

        // Create the next iteration
        const newTaskRef = doc(collection(db, "tasks"));
        const newTask: Omit<Task, "taskId"> = {
          houseId,
          templateId: template.templateId,
          title: template.title,
          description: template.description,
          category: template.category,
          assignedTo: nextAssignee,
          createdBy: "system",
          dueDate: nextDue,
          status: "pending",
          priority: "medium", // Inherit from template in a real app
          taskSource: "template",
          isAnonymousEvent: false,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };
        transaction.set(newTaskRef, newTask);
      }
    }

    // Always mark current task as completed
    transaction.update(taskRef, {
      status: "completed",
      updatedAt: Timestamp.now()
    });
  });
};

export const triggerBinFull = async (houseId: string) => {
  // 1. Create the anonymous event
  const eventRef = doc(collection(db, "houseEvents"));
  const eventId = eventRef.id;
  
  // 2. Create the urgent task
  const taskRef = doc(collection(db, "tasks"));
  const taskId = taskRef.id;

  const eventData: Omit<HouseEvent, "eventId"> = {
    houseId,
    eventType: "bin_full",
    anonymous: true,
    assignedTo: "rotation", // or find specific user
    taskId,
    createdAt: Timestamp.now(),
    status: "active"
  };
  
  await setDoc(eventRef, eventData);

  const taskData: Omit<Task, "taskId"> = {
    houseId,
    title: "Take out the bin (URGENT)",
    category: "rubbish/bin",
    assignedTo: "rotation", 
    createdBy: "system",
    dueDate: Timestamp.now(),
    status: "pending",
    priority: "urgent",
    taskSource: "event",
    isAnonymousEvent: true,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  await setDoc(taskRef, taskData);
};
