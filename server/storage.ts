import {
  users,
  tasks,
  taskSubmissions,
  balances,
  payments,
  notifications,
  families,
  familyMemberships,
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
  type Family,
  type FamilyMembership,
  type FamilyInvitation,
  type UpdateUserRole,
  type UpdateUserName,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, inArray } from "drizzle-orm";
import { createHash } from "crypto";
import { nanoid } from "nanoid";

// Interface for storage operations
export interface IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserName(userId: string, nameData: UpdateUserName): Promise<User>;
  updateUserRole(userId: string, roleData: UpdateUserRole): Promise<User>;
  
  // Family operations
  getChildren(parentId: string): Promise<User[]>;
  getFamilyByUserId(userId: string): Promise<Family | undefined>;
  getFamilyById(familyId: string): Promise<Family | undefined>;
  getFamilyMembers(familyId: string): Promise<(FamilyMembership & { user: User })[]>;
  getFamilyParents(familyId: string): Promise<(FamilyMembership & { user: User })[]>;
  getUserFamilyRole(userId: string): Promise<string | undefined>;
  getUserFamilyMemberships(userId: string): Promise<FamilyMembership[]>;
  createFamily(name: string, adminUserId: string): Promise<Family>;
  addFamilyMember(familyId: string, userId: string, role: string): Promise<FamilyMembership>;
  removeFamilyMember(familyId: string, userId: string): Promise<void>;
  updateFamilyMemberRole(familyId: string, userId: string, newRole: string): Promise<void>;
  
  // Task operations
  createTask(task: InsertTask): Promise<Task>;
  getTasksForFamily(familyId: string): Promise<Task[]>;
  getTasksForChild(childId: string, familyId: string): Promise<Task[]>;
  getTasksByCreator(creatorId: string, familyId: string): Promise<Task[]>;
  getTaskById(taskId: string, familyId: string): Promise<Task | undefined>;
  updateTask(taskId: string, updates: Partial<InsertTask>, familyId: string): Promise<Task>;
  deleteTask(taskId: string, familyId: string): Promise<void>;
  updateTaskStatus(taskId: string, status: string, familyId: string): Promise<void>;
  
  // Task submission operations
  createTaskSubmission(submission: InsertTaskSubmission): Promise<TaskSubmission>;
  getTaskSubmissionsByUser(userId: string, familyId: string): Promise<TaskSubmission[]>;
  getTaskSubmissionsByTask(taskId: string, familyId: string): Promise<TaskSubmission[]>;
  getTaskSubmissionById(submissionId: string, familyId: string): Promise<TaskSubmission | undefined>;
  getPendingTaskSubmissions(familyId: string): Promise<TaskSubmission[]>;
  getTaskSubmissionsByStatus(familyId: string, status: string): Promise<TaskSubmission[]>;
  getTaskSubmissionsByStatusAndUser(familyId: string, status: string, userId: string): Promise<TaskSubmission[]>;
  updateTaskSubmissionStatus(submissionId: string, status: string, reviewerId: string, familyId: string): Promise<void>;
  
  // Balance operations
  getBalance(userId: string, familyId: string): Promise<Balance | undefined>;
  createBalance(userId: string, familyId: string): Promise<Balance>;
  updateBalance(userId: string, familyId: string, accumulated: number, pending: number): Promise<void>;
  
  // Payment operations
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPaymentsByUser(userId: string, familyId: string): Promise<Payment[]>;
  updatePaymentStatus(paymentId: string, status: string, familyId: string): Promise<void>;
  
  // Notification operations
  createNotification(data: { familyId: string; userId: string; title: string; message: string; type: string; relatedId?: string }): Promise<Notification>;
  getNotificationsByUser(userId: string, familyId: string): Promise<Notification[]>;
  markNotificationAsRead(notificationId: string, familyId: string): Promise<void>;
  markAllNotificationsAsRead(userId: string, familyId: string): Promise<void>;
  
  // Family invitation operations
  createFamilyInvitation(familyId: string, invitedByUserId: string, inviteeEmail: string, inviteeRole: string): Promise<FamilyInvitation>;
  getInvitationsByEmail(email: string): Promise<FamilyInvitation[]>;
  getInvitationById(id: string): Promise<FamilyInvitation | undefined>;
  getPendingFamilyInvitations(familyId: string): Promise<FamilyInvitation[]>;
  getUserFamilyRole(userId: string): Promise<string | null>;
  cancelInvitation(invitationId: string): Promise<void>;
  acceptInvitation(invitationId: string, userId: string): Promise<void>;
  rejectInvitation(invitationId: string): Promise<void>;
  getUserByEmail(email: string): Promise<User | undefined>;
  
  // Family creation operations
  createFamilyWithAdmin(userId: string, familyName: string): Promise<Family>;
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

  async updateUserName(userId: string, nameData: UpdateUserName): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        firstName: nameData.firstName,
        lastName: nameData.lastName,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserRole(userId: string, roleData: UpdateUserRole): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        role: roleData.role,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Family operations
  async getChildren(parentId: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.parentId, parentId));
  }

  async getFamilyByUserId(userId: string): Promise<Family | undefined> {
    const [membership] = await db.select({
      family: families
    })
    .from(familyMemberships)
    .innerJoin(families, eq(familyMemberships.familyId, families.id))
    .where(eq(familyMemberships.userId, userId));
    
    return membership?.family;
  }

  async getFamilyById(familyId: string): Promise<Family | undefined> {
    const [family] = await db.select().from(families).where(eq(families.id, familyId));
    return family;
  }

  async getUserFamilyMemberships(userId: string): Promise<FamilyMembership[]> {
    return await db.select().from(familyMemberships)
      .where(eq(familyMemberships.userId, userId))
      .orderBy(familyMemberships.joinedAt);
  }

  async getFamilyMembers(familyId: string): Promise<(FamilyMembership & { user: User })[]> {
    return await db.query.familyMemberships.findMany({
      where: eq(familyMemberships.familyId, familyId),
      with: {
        user: true
      }
    });
  }

  async getFamilyParents(familyId: string): Promise<(FamilyMembership & { user: User })[]> {
    return await db.query.familyMemberships.findMany({
      where: and(
        eq(familyMemberships.familyId, familyId),
        inArray(familyMemberships.role, ['admin', 'collaborator'])
      ),
      with: {
        user: true
      }
    });
  }



  async createFamily(name: string, adminUserId: string): Promise<Family> {
    const [family] = await db.insert(families)
      .values({ name })
      .returning();
    
    // Add the creator as an admin
    await db.insert(familyMemberships)
      .values({
        familyId: family.id,
        userId: adminUserId,
        role: 'admin'
      });
    
    return family;
  }

  async addFamilyMember(familyId: string, userId: string, role: string): Promise<FamilyMembership> {
    const [membership] = await db.insert(familyMemberships)
      .values({
        familyId,
        userId,
        role
      })
      .returning();
    
    return membership;
  }

  async removeFamilyMember(familyId: string, userId: string): Promise<void> {
    await db.delete(familyMemberships)
      .where(and(
        eq(familyMemberships.familyId, familyId),
        eq(familyMemberships.userId, userId)
      ));
  }

  async updateFamilyMemberRole(familyId: string, userId: string, newRole: string): Promise<void> {
    await db.update(familyMemberships)
      .set({ role: newRole })
      .where(and(
        eq(familyMemberships.familyId, familyId),
        eq(familyMemberships.userId, userId)
      ));
  }

  // Task operations
  async createTask(task: InsertTask): Promise<Task> {
    const [newTask] = await db.insert(tasks).values(task).returning();
    return newTask;
  }

  async getTasksForFamily(familyId: string): Promise<Task[]> {
    return await db.select().from(tasks)
      .where(eq(tasks.familyId, familyId))
      .orderBy(desc(tasks.createdAt));
  }

  async getTasksForChild(childId: string, familyId: string): Promise<Task[]> {
    const allTasks = await db.select().from(tasks)
      .where(eq(tasks.familyId, familyId));
    
    // Return tasks where:
    // 1. assignedToIds is empty (available to all children), OR
    // 2. childId is in the assignedToIds array
    return allTasks.filter(task => 
      !task.assignedToIds || 
      task.assignedToIds.length === 0 || 
      task.assignedToIds.includes(childId)
    );
  }

  async getTasksByCreator(creatorId: string, familyId: string): Promise<Task[]> {
    return await db.select().from(tasks)
      .where(and(
        eq(tasks.createdById, creatorId),
        eq(tasks.familyId, familyId)
      ));
  }

  async getTaskById(taskId: string, familyId: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks)
      .where(and(
        eq(tasks.id, taskId),
        eq(tasks.familyId, familyId)
      ));
    return task;
  }

  async updateTask(taskId: string, updates: Partial<InsertTask>, familyId: string): Promise<Task> {
    const [updatedTask] = await db.update(tasks)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(
        eq(tasks.id, taskId),
        eq(tasks.familyId, familyId)
      ))
      .returning();
    return updatedTask;
  }

  async deleteTask(taskId: string, familyId: string): Promise<void> {
    await db.delete(tasks).where(and(
      eq(tasks.id, taskId),
      eq(tasks.familyId, familyId)
    ));
  }

  async updateTaskStatus(taskId: string, status: string, familyId: string): Promise<void> {
    await db.update(tasks)
      .set({ status: status as any, updatedAt: new Date() })
      .where(and(
        eq(tasks.id, taskId),
        eq(tasks.familyId, familyId)
      ));
  }

  // Task submission operations
  async createTaskSubmission(submission: InsertTaskSubmission): Promise<TaskSubmission> {
    const [newSubmission] = await db.insert(taskSubmissions).values(submission).returning();
    return newSubmission;
  }

  async getTaskSubmissionsByUser(userId: string, familyId: string): Promise<TaskSubmission[]> {
    return await db.query.taskSubmissions.findMany({
      where: and(
        eq(taskSubmissions.submittedById, userId),
        eq(taskSubmissions.familyId, familyId)
      ),
      with: {
        submittedBy: true,
        reviewedBy: true
      },
      orderBy: desc(taskSubmissions.submittedAt)
    });
  }

  async getTaskSubmissionsByTask(taskId: string, familyId: string): Promise<TaskSubmission[]> {
    return await db.query.taskSubmissions.findMany({
      where: and(
        eq(taskSubmissions.taskId, taskId),
        eq(taskSubmissions.familyId, familyId)
      ),
      with: {
        submittedBy: true,
        reviewedBy: true
      }
    });
  }

  async getTaskSubmissionById(submissionId: string, familyId: string): Promise<TaskSubmission | undefined> {
    const submission = await db.query.taskSubmissions.findFirst({
      where: and(
        eq(taskSubmissions.id, submissionId),
        eq(taskSubmissions.familyId, familyId)
      ),
      with: {
        submittedBy: true,
        reviewedBy: true
      }
    });
    return submission;
  }

  async getPendingTaskSubmissions(familyId: string): Promise<TaskSubmission[]> {
    return await db.query.taskSubmissions.findMany({
      where: and(
        eq(taskSubmissions.status, "submitted"),
        eq(taskSubmissions.familyId, familyId)
      ),
      with: {
        submittedBy: true,
        reviewedBy: true
      },
      orderBy: desc(taskSubmissions.submittedAt)
    });
  }

  async getTaskSubmissionsByStatus(familyId: string, status: string): Promise<TaskSubmission[]> {
    return await db.query.taskSubmissions.findMany({
      where: and(
        eq(taskSubmissions.status, status as any),
        eq(taskSubmissions.familyId, familyId)
      ),
      with: {
        submittedBy: true,
        reviewedBy: true
      },
      orderBy: desc(taskSubmissions.reviewedAt)
    });
  }

  async getTaskSubmissionsByStatusAndUser(familyId: string, status: string, userId: string): Promise<TaskSubmission[]> {
    return await db.query.taskSubmissions.findMany({
      where: and(
        eq(taskSubmissions.status, status as any),
        eq(taskSubmissions.familyId, familyId),
        eq(taskSubmissions.submittedById, userId)
      ),
      with: {
        submittedBy: true,
        reviewedBy: true
      },
      orderBy: desc(taskSubmissions.reviewedAt)
    });
  }

  async updateTaskSubmissionStatus(submissionId: string, status: string, reviewerId: string, familyId: string): Promise<void> {
    // First, verify the submission belongs to this family
    const submission = await this.getTaskSubmissionById(submissionId, familyId);
    if (!submission) throw new Error("Task submission not found or not accessible");
    
    await db.update(taskSubmissions)
      .set({ 
        status: status as any, 
        reviewedAt: new Date(),
        reviewedById: reviewerId 
      })
      .where(eq(taskSubmissions.id, submissionId));
  }

  // Balance operations
  async getBalance(userId: string, familyId: string): Promise<Balance | undefined> {
    const [balance] = await db.select().from(balances)
      .where(and(
        eq(balances.userId, userId),
        eq(balances.familyId, familyId)
      ));
    return balance;
  }

  async createBalance(userId: string, familyId: string): Promise<Balance> {
    const [balance] = await db.insert(balances)
      .values({ userId, familyId, accumulated: 0, pending: 0 })
      .returning();
    return balance;
  }

  async updateBalance(userId: string, familyId: string, accumulated: number, pending: number): Promise<void> {
    await db.update(balances)
      .set({ accumulated, pending, updatedAt: new Date() })
      .where(and(
        eq(balances.userId, userId),
        eq(balances.familyId, familyId)
      ));
  }

  // Payment operations
  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [newPayment] = await db.insert(payments).values(payment).returning();
    return newPayment;
  }

  async getPaymentsByUser(userId: string, familyId: string): Promise<Payment[]> {
    return await db.select().from(payments)
      .where(and(
        eq(payments.toUserId, userId),
        eq(payments.familyId, familyId)
      ))
      .orderBy(desc(payments.createdAt));
  }

  async updatePaymentStatus(paymentId: string, status: string, familyId: string): Promise<void> {
    await db.update(payments)
      .set({ status, confirmedAt: status === 'confirmed' ? new Date() : null })
      .where(and(
        eq(payments.id, paymentId),
        eq(payments.familyId, familyId)
      ));
  }

  // Notification operations
  async createNotification(data: { familyId: string; userId: string; title: string; message: string; type: string; relatedId?: string }): Promise<Notification> {
    const [notification] = await db.insert(notifications)
      .values(data)
      .returning();
    return notification;
  }

  async getNotificationsByUser(userId: string, familyId: string): Promise<Notification[]> {
    return await db.select().from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.familyId, familyId)
      ))
      .orderBy(desc(notifications.createdAt));
  }

  async getNotificationsByUserWithoutFamily(userId: string): Promise<Notification[]> {
    return await db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationAsReadWithoutFamily(notificationId: string, userId: string): Promise<void> {
    // Delete the notification only if it belongs to the user
    await db.delete(notifications)
      .where(and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId)
      ));
  }

  async markAllNotificationsAsReadWithoutFamily(userId: string): Promise<void> {
    // Delete all notifications for the user
    await db.delete(notifications)
      .where(eq(notifications.userId, userId));
  }

  async markNotificationAsRead(notificationId: string, familyId: string): Promise<void> {
    // Delete the notification instead of just marking as read
    await db.delete(notifications)
      .where(and(
        eq(notifications.id, notificationId),
        eq(notifications.familyId, familyId)
      ));
  }

  async markAllNotificationsAsRead(userId: string, familyId: string): Promise<void> {
    // Delete all notifications for the user in this family
    await db.delete(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.familyId, familyId)
      ));
  }

  // Family invitation operations

  async createFamilyInvitation(familyId: string, invitedByUserId: string, inviteeEmail: string, inviteeRole: string): Promise<FamilyInvitation> {
    const [invitation] = await db.insert(familyInvitations)
      .values({ familyId, invitedByUserId, inviteeEmail, inviteeRole })
      .returning();
    return invitation;
  }

  async getInvitationsByEmail(email: string): Promise<FamilyInvitation[]> {
    return await db.query.familyInvitations.findMany({
      where: and(
        eq(familyInvitations.inviteeEmail, email),
        eq(familyInvitations.status, "pending")
      ),
      with: {
        family: true,
        invitedBy: true
      },
      orderBy: desc(familyInvitations.createdAt)
    });
  }

  async getInvitationById(id: string): Promise<FamilyInvitation | undefined> {
    const invitation = await db.query.familyInvitations.findFirst({
      where: eq(familyInvitations.id, id),
      with: {
        family: true,
        invitedBy: true
      }
    });
    return invitation;
  }

  async getPendingFamilyInvitations(familyId: string): Promise<FamilyInvitation[]> {
    return await db.query.familyInvitations.findMany({
      where: and(
        eq(familyInvitations.familyId, familyId),
        eq(familyInvitations.status, "pending")
      ),
      with: {
        invitedBy: true
      },
      orderBy: desc(familyInvitations.createdAt)
    });
  }

  async getUserFamilyRole(userId: string): Promise<string | null> {
    const membership = await db.query.familyMemberships.findFirst({
      where: eq(familyMemberships.userId, userId)
    });
    return membership?.role || null;
  }

  async cancelInvitation(invitationId: string): Promise<void> {
    await db.update(familyInvitations)
      .set({ status: "cancelled" })
      .where(eq(familyInvitations.id, invitationId));
  }

  async acceptInvitation(invitationId: string, userId: string): Promise<void> {
    // Get the invitation first
    const invitation = await this.getInvitationById(invitationId);
    if (!invitation) return;

    // Update invitation status
    await db.update(familyInvitations)
      .set({ status: "accepted", acceptedAt: new Date() })
      .where(eq(familyInvitations.id, invitationId));

    // Add user to family with the specified role
    await this.addFamilyMember(invitation.familyId, userId, invitation.inviteeRole);

    // If it's a child, also update the legacy parentId field for backward compatibility
    if (invitation.inviteeRole === 'child') {
      // Find the family admin to set as parent
      const familyParents = await this.getFamilyParents(invitation.familyId);
      const admin = familyParents.find(p => p.role === 'admin');
      if (admin) {
        await db.update(users)
          .set({ parentId: admin.userId, updatedAt: new Date() })
          .where(eq(users.id, userId));
      }
    }
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

  async createFamilyWithAdmin(userId: string, familyName: string): Promise<Family> {
    // Create the family
    const [family] = await db.insert(families)
      .values({
        id: nanoid(),
        name: familyName,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    // Add user as admin member
    await db.insert(familyMemberships)
      .values({
        id: nanoid(),
        familyId: family.id,
        userId: userId,
        role: 'admin',
        joinedAt: new Date()
      });

    return family;
  }
}

export const storage = new DatabaseStorage();
