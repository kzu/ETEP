// DISABLED - Using Azure Table Storage exclusively, no PostgreSQL
// This file is kept for compatibility but all operations are disabled

import {
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

// Interface for storage operations - kept for compatibility
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserName(userId: string, nameData: UpdateUserName): Promise<User>;
  updateUserRole(userId: string, roleData: UpdateUserRole): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  
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
  createNotification(data: any): Promise<Notification>;
  getNotificationsByUser(userId: string, familyId: string): Promise<Notification[]>;
  markNotificationAsRead(notificationId: string, familyId: string): Promise<void>;
  markAllNotificationsAsRead(userId: string, familyId: string): Promise<void>;
  
  // Family invitation operations
  createFamilyInvitation(familyId: string, invitedByUserId: string, inviteeEmail: string, inviteeRole: string): Promise<FamilyInvitation>;
  getInvitationsByEmail(email: string): Promise<FamilyInvitation[]>;
  getInvitationById(id: string): Promise<FamilyInvitation | undefined>;
  getPendingFamilyInvitations(familyId: string): Promise<FamilyInvitation[]>;
  cancelInvitation(invitationId: string): Promise<void>;
  acceptInvitation(invitationId: string, userId: string): Promise<FamilyInvitation>;
  rejectInvitation(invitationId: string): Promise<void>;
  
  // Utility operations
  createFamilyWithAdmin(userId: string, familyName: string): Promise<Family>;
  resetChildData(childId: string, familyId: string): Promise<void>;
}

// Disabled database storage class - all methods throw errors
export class DatabaseStorage implements IStorage {
  constructor() {
    console.warn("DatabaseStorage is disabled - using Azure Table Storage exclusively");
  }

  async getUser(): Promise<any> {
    throw new Error("DatabaseStorage disabled - use Azure Table Storage exclusively");
  }

  async upsertUser(): Promise<any> {
    throw new Error("DatabaseStorage disabled - use Azure Table Storage exclusively");
  }

  async updateUserName(): Promise<any> {
    throw new Error("DatabaseStorage disabled - use Azure Table Storage exclusively");
  }

  async updateUserRole(): Promise<any> {
    throw new Error("DatabaseStorage disabled - use Azure Table Storage exclusively");
  }

  async getUserByEmail(): Promise<any> {
    throw new Error("DatabaseStorage disabled - use Azure Table Storage exclusively");
  }

  async getChildren(): Promise<any> {
    throw new Error("DatabaseStorage disabled - use Azure Table Storage exclusively");
  }

  async getFamilyByUserId(): Promise<any> {
    throw new Error("DatabaseStorage disabled - use Azure Table Storage exclusively");
  }

  async getFamilyById(): Promise<any> {
    throw new Error("DatabaseStorage disabled - use Azure Table Storage exclusively");
  }

  async getFamilyMembers(): Promise<any> {
    throw new Error("DatabaseStorage disabled - use Azure Table Storage exclusively");
  }

  async getFamilyParents(): Promise<any> {
    throw new Error("DatabaseStorage disabled - use Azure Table Storage exclusively");
  }

  async getUserFamilyRole(): Promise<any> {
    throw new Error("DatabaseStorage disabled - use Azure Table Storage exclusively");
  }

  async getUserFamilyMemberships(): Promise<any> {
    throw new Error("DatabaseStorage disabled - use Azure Table Storage exclusively");
  }

  async createFamily(): Promise<any> {
    throw new Error("DatabaseStorage disabled - use Azure Table Storage exclusively");
  }

  async addFamilyMember(): Promise<any> {
    throw new Error("DatabaseStorage disabled - use Azure Table Storage exclusively");
  }

  async removeFamilyMember(): Promise<any> {
    throw new Error("DatabaseStorage disabled - use Azure Table Storage exclusively");
  }

  async updateFamilyMemberRole(): Promise<any> {
    throw new Error("DatabaseStorage disabled - use Azure Table Storage exclusively");
  }

  async createTask(): Promise<any> {
    throw new Error("DatabaseStorage disabled - use Azure Table Storage exclusively");
  }

  async getTasksForFamily(): Promise<any> {
    throw new Error("DatabaseStorage disabled - use Azure Table Storage exclusively");
  }

  async getTasksForChild(): Promise<any> {
    throw new Error("DatabaseStorage disabled - use Azure Table Storage exclusively");
  }

  async getTasksByCreator(): Promise<any> {
    throw new Error("DatabaseStorage disabled - use Azure Table Storage exclusively");
  }

  async getTaskById(): Promise<any> {
    throw new Error("DatabaseStorage disabled - use Azure Table Storage exclusively");
  }

  async updateTask(): Promise<any> {
    throw new Error("DatabaseStorage disabled - use Azure Table Storage exclusively");
  }

  async deleteTask(): Promise<any> {
    throw new Error("DatabaseStorage disabled - use Azure Table Storage exclusively");
  }

  async updateTaskStatus(): Promise<any> {
    throw new Error("DatabaseStorage disabled - use Azure Table Storage exclusively");
  }

  async createTaskSubmission(): Promise<any> {
    throw new Error("DatabaseStorage disabled - use Azure Table Storage exclusively");
  }

  async getTaskSubmissionsByUser(): Promise<any> {
    throw new Error("DatabaseStorage disabled - use Azure Table Storage exclusively");
  }

  async getTaskSubmissionsByTask(): Promise<any> {
    throw new Error("DatabaseStorage disabled - use Azure Table Storage exclusively");
  }

  async getTaskSubmissionById(): Promise<any> {
    throw new Error("DatabaseStorage disabled - use Azure Table Storage exclusively");
  }

  async getPendingTaskSubmissions(): Promise<any> {
    throw new Error("DatabaseStorage disabled - use Azure Table Storage exclusively");
  }

  async getTaskSubmissionsByStatus(): Promise<any> {
    throw new Error("DatabaseStorage disabled - use Azure Table Storage exclusively");
  }

  async getTaskSubmissionsByStatusAndUser(): Promise<any> {
    throw new Error("DatabaseStorage disabled - use Azure Table Storage exclusively");
  }

  async updateTaskSubmissionStatus(): Promise<any> {
    throw new Error("DatabaseStorage disabled - use Azure Table Storage exclusively");
  }

  async getBalance(): Promise<any> {
    throw new Error("DatabaseStorage disabled - use Azure Table Storage exclusively");
  }

  async createBalance(): Promise<any> {
    throw new Error("DatabaseStorage disabled - use Azure Table Storage exclusively");
  }

  async updateBalance(): Promise<any> {
    throw new Error("DatabaseStorage disabled - use Azure Table Storage exclusively");
  }

  async createPayment(): Promise<any> {
    throw new Error("DatabaseStorage disabled - use Azure Table Storage exclusively");
  }

  async getPaymentsByUser(): Promise<any> {
    throw new Error("DatabaseStorage disabled - use Azure Table Storage exclusively");
  }

  async updatePaymentStatus(): Promise<any> {
    throw new Error("DatabaseStorage disabled - use Azure Table Storage exclusively");
  }

  async createNotification(): Promise<any> {
    throw new Error("DatabaseStorage disabled - use Azure Table Storage exclusively");
  }

  async getNotificationsByUser(): Promise<any> {
    throw new Error("DatabaseStorage disabled - use Azure Table Storage exclusively");
  }

  async markNotificationAsRead(): Promise<any> {
    throw new Error("DatabaseStorage disabled - use Azure Table Storage exclusively");
  }

  async markAllNotificationsAsRead(): Promise<any> {
    throw new Error("DatabaseStorage disabled - use Azure Table Storage exclusively");
  }

  async createFamilyInvitation(): Promise<any> {
    throw new Error("DatabaseStorage disabled - use Azure Table Storage exclusively");
  }

  async getInvitationsByEmail(): Promise<any> {
    throw new Error("DatabaseStorage disabled - use Azure Table Storage exclusively");
  }

  async getInvitationById(): Promise<any> {
    throw new Error("DatabaseStorage disabled - use Azure Table Storage exclusively");
  }

  async getPendingFamilyInvitations(): Promise<any> {
    throw new Error("DatabaseStorage disabled - use Azure Table Storage exclusively");
  }

  async cancelInvitation(): Promise<any> {
    throw new Error("DatabaseStorage disabled - use Azure Table Storage exclusively");
  }

  async acceptInvitation(): Promise<any> {
    throw new Error("DatabaseStorage disabled - use Azure Table Storage exclusively");
  }

  async rejectInvitation(): Promise<any> {
    throw new Error("DatabaseStorage disabled - use Azure Table Storage exclusively");
  }

  async createFamilyWithAdmin(): Promise<any> {
    throw new Error("DatabaseStorage disabled - use Azure Table Storage exclusively");
  }

  async resetChildData(): Promise<any> {
    throw new Error("DatabaseStorage disabled - use Azure Table Storage exclusively");
  }
}

console.warn("PostgreSQL storage disabled - using Azure Table Storage exclusively");