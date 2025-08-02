import {
  users,
  tasks,
  taskSubmissions,
  balances,
  payments,
  notifications,
  type User,
  type UpsertUser,
  type Task,
  type InsertTask,
  type TaskSubmission,
  type InsertTaskSubmission,
  type Balance,
  type Payment,
  type InsertPayment,
  type Notification,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, inArray } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Family operations
  getChildren(parentId: string): Promise<User[]>;
  
  // Task operations
  createTask(task: InsertTask): Promise<Task>;
  getTasksByAssignee(assigneeId: string): Promise<Task[]>;
  getTasksByCreator(creatorId: string): Promise<Task[]>;
  updateTaskStatus(taskId: string, status: string): Promise<void>;
  
  // Task submission operations
  createTaskSubmission(submission: InsertTaskSubmission): Promise<TaskSubmission>;
  getTaskSubmissionsByUser(userId: string): Promise<TaskSubmission[]>;
  getPendingTaskSubmissions(parentId: string): Promise<TaskSubmission[]>;
  updateTaskSubmissionStatus(submissionId: string, status: string, reviewerId: string): Promise<void>;
  
  // Balance operations
  getBalance(userId: string): Promise<Balance | undefined>;
  createBalance(userId: string): Promise<Balance>;
  updateBalance(userId: string, accumulated: number, pending: number): Promise<void>;
  
  // Payment operations
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPaymentsByUser(userId: string): Promise<Payment[]>;
  updatePaymentStatus(paymentId: string, status: string): Promise<void>;
  
  // Notification operations
  createNotification(userId: string, title: string, message: string, type: string, relatedId?: string): Promise<Notification>;
  getNotificationsByUser(userId: string): Promise<Notification[]>;
  markNotificationAsRead(notificationId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Family operations
  async getChildren(parentId: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.parentId, parentId));
  }

  // Task operations
  async createTask(task: InsertTask): Promise<Task> {
    const [newTask] = await db.insert(tasks).values(task).returning();
    return newTask;
  }

  async getTasksByAssignee(assigneeId: string): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.assignedToId, assigneeId));
  }

  async getTasksByCreator(creatorId: string): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.createdById, creatorId));
  }

  async updateTaskStatus(taskId: string, status: string): Promise<void> {
    await db.update(tasks)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(tasks.id, taskId));
  }

  // Task submission operations
  async createTaskSubmission(submission: InsertTaskSubmission): Promise<TaskSubmission> {
    const [newSubmission] = await db.insert(taskSubmissions).values(submission).returning();
    return newSubmission;
  }

  async getTaskSubmissionsByUser(userId: string): Promise<TaskSubmission[]> {
    return await db.select().from(taskSubmissions)
      .where(eq(taskSubmissions.submittedById, userId))
      .orderBy(desc(taskSubmissions.submittedAt));
  }

  async getPendingTaskSubmissions(parentId: string): Promise<TaskSubmission[]> {
    // Get all children of the parent
    const children = await this.getChildren(parentId);
    const childIds = children.map(child => child.id);
    
    if (childIds.length === 0) return [];

    return await db.select().from(taskSubmissions)
      .where(and(
        inArray(taskSubmissions.submittedById, childIds),
        eq(taskSubmissions.status, "submitted")
      ))
      .orderBy(desc(taskSubmissions.submittedAt));
  }

  async updateTaskSubmissionStatus(submissionId: string, status: string, reviewerId: string): Promise<void> {
    await db.update(taskSubmissions)
      .set({ 
        status: status as any, 
        reviewedAt: new Date(),
        reviewedById: reviewerId 
      })
      .where(eq(taskSubmissions.id, submissionId));
  }

  // Balance operations
  async getBalance(userId: string): Promise<Balance | undefined> {
    const [balance] = await db.select().from(balances).where(eq(balances.userId, userId));
    return balance;
  }

  async createBalance(userId: string): Promise<Balance> {
    const [balance] = await db.insert(balances)
      .values({ userId, accumulated: 0, pending: 0 })
      .returning();
    return balance;
  }

  async updateBalance(userId: string, accumulated: number, pending: number): Promise<void> {
    await db.update(balances)
      .set({ accumulated, pending, updatedAt: new Date() })
      .where(eq(balances.userId, userId));
  }

  // Payment operations
  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [newPayment] = await db.insert(payments).values(payment).returning();
    return newPayment;
  }

  async getPaymentsByUser(userId: string): Promise<Payment[]> {
    return await db.select().from(payments)
      .where(eq(payments.toUserId, userId))
      .orderBy(desc(payments.createdAt));
  }

  async updatePaymentStatus(paymentId: string, status: string): Promise<void> {
    await db.update(payments)
      .set({ status, confirmedAt: status === 'confirmed' ? new Date() : null })
      .where(eq(payments.id, paymentId));
  }

  // Notification operations
  async createNotification(userId: string, title: string, message: string, type: string, relatedId?: string): Promise<Notification> {
    const [notification] = await db.insert(notifications)
      .values({ userId, title, message, type, relatedId })
      .returning();
    return notification;
  }

  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return await db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, notificationId));
  }
}

export const storage = new DatabaseStorage();
