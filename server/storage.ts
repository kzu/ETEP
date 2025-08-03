import {
  users,
  tasks,
  taskSubmissions,
  balances,
  payments,
  notifications,
  familyInvitations,
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
  type FamilyInvitation,
  type UpdateUserRole,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, inArray } from "drizzle-orm";
import { createHash } from "crypto";

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
  getTasksForChild(childId: string): Promise<Task[]>;
  getTasksByCreator(creatorId: string): Promise<Task[]>;
  getTaskById(taskId: string): Promise<Task | undefined>;
  updateTask(taskId: string, updates: Partial<InsertTask>): Promise<Task>;
  deleteTask(taskId: string): Promise<void>;
  updateTaskStatus(taskId: string, status: string): Promise<void>;
  
  // Task submission operations
  createTaskSubmission(submission: InsertTaskSubmission): Promise<TaskSubmission>;
  getTaskSubmissionsByUser(userId: string): Promise<TaskSubmission[]>;
  getTaskSubmissionsByTask(taskId: string): Promise<TaskSubmission[]>;
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
  createNotification(data: { userId: string; title: string; message: string; type: string; relatedId?: string }): Promise<Notification>;
  getNotificationsByUser(userId: string): Promise<Notification[]>;
  markNotificationAsRead(notificationId: string): Promise<void>;
  
  // Role and family operations
  updateUserRole(userId: string, roleData: UpdateUserRole): Promise<User>;
  createFamilyInvitation(parentId: string, childEmail: string): Promise<FamilyInvitation>;
  getInvitationsByEmail(email: string): Promise<FamilyInvitation[]>;
  getInvitationById(id: string): Promise<FamilyInvitation | undefined>;
  acceptInvitation(invitationId: string, childId: string): Promise<void>;
  rejectInvitation(invitationId: string): Promise<void>;
  getUserByEmail(email: string): Promise<User | undefined>;
}

// Helper function to generate Gravatar URL
function generateGravatarUrl(email: string): string {
  const trimmedEmail = email.trim().toLowerCase();
  const hash = createHash('md5').update(trimmedEmail).digest('hex');
  // Use default=identicon for unique default avatars, size 200
  return `https://www.gravatar.com/avatar/${hash}?d=identicon&s=200`;
}

export class DatabaseStorage implements IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Generate Gravatar URL if email is provided and no profile image exists
    const gravatarUrl = userData.email ? generateGravatarUrl(userData.email) : userData.profileImageUrl;
    const dataWithGravatar = {
      ...userData,
      profileImageUrl: userData.profileImageUrl || gravatarUrl,
      updatedAt: new Date(),
    };

    const [user] = await db
      .insert(users)
      .values(dataWithGravatar)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...dataWithGravatar,
          // Always refresh Gravatar URL on login if email exists
          profileImageUrl: userData.email ? generateGravatarUrl(userData.email) : userData.profileImageUrl,
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

  async getTasksForChild(childId: string): Promise<Task[]> {
    const allTasks = await db.select().from(tasks);
    
    // Return tasks where:
    // 1. assignedToIds is empty (available to all children), OR
    // 2. childId is in the assignedToIds array
    return allTasks.filter(task => 
      !task.assignedToIds || 
      task.assignedToIds.length === 0 || 
      task.assignedToIds.includes(childId)
    );
  }

  async getTasksByCreator(creatorId: string): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.createdById, creatorId));
  }

  async getTaskById(taskId: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
    return task;
  }

  async updateTask(taskId: string, updates: Partial<InsertTask>): Promise<Task> {
    const [updatedTask] = await db.update(tasks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tasks.id, taskId))
      .returning();
    return updatedTask;
  }

  async deleteTask(taskId: string): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, taskId));
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

  async getTaskSubmissionsByTask(taskId: string): Promise<TaskSubmission[]> {
    return await db.select().from(taskSubmissions).where(eq(taskSubmissions.taskId, taskId));
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
  async createNotification(data: { userId: string; title: string; message: string; type: string; relatedId?: string }): Promise<Notification> {
    const [notification] = await db.insert(notifications)
      .values(data)
      .returning();
    return notification;
  }

  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return await db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    // Delete the notification instead of just marking as read
    await db.delete(notifications)
      .where(eq(notifications.id, notificationId));
  }

  // Role and family operations
  async updateUserRole(userId: string, roleData: UpdateUserRole): Promise<User> {
    const updateData: any = { role: roleData.role, updatedAt: new Date() };
    
    // If it's a child joining a family, find parent by email
    if (roleData.role === 'child' && roleData.parentEmail) {
      const [parent] = await db.select().from(users).where(eq(users.email, roleData.parentEmail));
      if (parent) {
        updateData.parentId = parent.id;
      }
    }
    
    const [user] = await db.update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async createFamilyInvitation(parentId: string, childEmail: string): Promise<FamilyInvitation> {
    const [invitation] = await db.insert(familyInvitations)
      .values({ parentId, childEmail })
      .returning();
    return invitation;
  }

  async getInvitationsByEmail(email: string): Promise<FamilyInvitation[]> {
    return await db.select().from(familyInvitations)
      .where(and(
        eq(familyInvitations.childEmail, email),
        eq(familyInvitations.status, "pending")
      ))
      .orderBy(desc(familyInvitations.createdAt));
  }

  async getInvitationById(id: string): Promise<FamilyInvitation | undefined> {
    const [invitation] = await db.select().from(familyInvitations)
      .where(eq(familyInvitations.id, id));
    return invitation;
  }

  async acceptInvitation(invitationId: string, childId: string): Promise<void> {
    // Get the invitation first
    const [invitation] = await db.select().from(familyInvitations)
      .where(eq(familyInvitations.id, invitationId));
    
    if (!invitation) return;

    // Update invitation status
    await db.update(familyInvitations)
      .set({ status: "accepted", acceptedAt: new Date() })
      .where(eq(familyInvitations.id, invitationId));

    // Update child's parentId
    await db.update(users)
      .set({ parentId: invitation.parentId, updatedAt: new Date() })
      .where(eq(users.id, childId));
  }

  async rejectInvitation(invitationId: string): Promise<void> {
    // Update invitation status to rejected
    await db.update(familyInvitations)
      .set({ status: "rejected" })
      .where(eq(familyInvitations.id, invitationId));
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
}

export const storage = new DatabaseStorage();
