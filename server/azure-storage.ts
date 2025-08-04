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
import { AzureTableClient } from "./azure-table-client";
import { IStorage } from "./storage";
import { createHash } from "crypto";
import { nanoid } from "nanoid";

// Helper function to generate Gravatar URL
function generateGravatarUrl(email: string): string {
  const trimmedEmail = email.trim().toLowerCase();
  const hash = createHash('md5').update(trimmedEmail).digest('hex');
  return `https://www.gravatar.com/avatar/${hash}?d=identicon&s=200`;
}

// Helper function to convert Azure Table entity to typed object
function convertAzureEntity<T>(entity: any): T {
  const result: any = {};
  
  for (const [key, value] of Object.entries(entity)) {
    // Skip Azure Table system properties
    if (['partitionKey', 'rowKey', 'timestamp', 'etag', 'odata.etag'].includes(key)) {
      continue;
    }
    
    // Handle special conversions
    if (key === 'id') {
      result[key] = entity.rowKey;
    } else if (key.endsWith('At') && typeof value === 'string') {
      // Convert date strings back to Date objects
      result[key] = new Date(value);
    } else if (key === 'assignedToIds' && typeof value === 'string') {
      // Convert JSON string back to array
      result[key] = value ? JSON.parse(value) : [];
    } else if (key === 'isRead' && typeof value === 'string') {
      // Convert string boolean to actual boolean
      result[key] = value === 'true';
    } else {
      result[key] = value;
    }
  }
  
  return result as T;
}

// Helper function to convert typed object to Azure Table entity
function convertToAzureEntity(obj: any, partitionKey: string, rowKey?: string): any {
  const entity: any = {
    partitionKey,
    rowKey: rowKey || obj.id || nanoid(),
  };
  
  for (const [key, value] of Object.entries(obj)) {
    if (key === 'id') {
      // ID is stored as rowKey
      continue;
    } else if (value instanceof Date) {
      // Convert dates to ISO strings
      entity[key] = value.toISOString();
    } else if (Array.isArray(value)) {
      // Convert arrays to JSON strings
      entity[key] = JSON.stringify(value);
    } else if (typeof value === 'boolean') {
      // Convert booleans to strings
      entity[key] = value.toString();
    } else if (value !== null && value !== undefined) {
      entity[key] = value;
    }
  }
  
  return entity;
}

export class AzureTableStorage implements IStorage {
  private client: AzureTableClient;

  constructor(connectionString: string) {
    this.client = new AzureTableClient(connectionString);
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const entity = await this.client.getEntity('users', 'user', id);
    return entity ? convertAzureEntity<User>(entity) : undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const gravatarUrl = userData.email ? generateGravatarUrl(userData.email) : userData.profileImageUrl;
    const dataWithGravatar = {
      ...userData,
      profileImageUrl: userData.profileImageUrl || gravatarUrl,
      updatedAt: new Date(),
      id: userData.id || nanoid(),
    };

    const entity = convertToAzureEntity(dataWithGravatar, 'user', dataWithGravatar.id);
    await this.client.upsertEntity('users', entity);
    
    return convertAzureEntity<User>({ ...entity, rowKey: entity.rowKey });
  }

  async updateUserName(userId: string, nameData: UpdateUserName): Promise<User> {
    const existingUser = await this.getUser(userId);
    if (!existingUser) {
      throw new Error(`User with id ${userId} not found`);
    }

    const updatedData = {
      ...existingUser,
      firstName: nameData.firstName,
      lastName: nameData.lastName,
      updatedAt: new Date(),
    };

    const entity = convertToAzureEntity(updatedData, 'user', userId);
    await this.client.upsertEntity('users', entity);
    
    return convertAzureEntity<User>({ ...entity, rowKey: entity.rowKey });
  }

  async updateUserRole(userId: string, roleData: UpdateUserRole): Promise<User> {
    const existingUser = await this.getUser(userId);
    if (!existingUser) {
      throw new Error(`User with id ${userId} not found`);
    }

    const updatedData = {
      ...existingUser,
      role: roleData.role,
      updatedAt: new Date(),
    };

    const entity = convertToAzureEntity(updatedData, 'user', userId);
    await this.client.upsertEntity('users', entity);
    
    return convertAzureEntity<User>({ ...entity, rowKey: entity.rowKey });
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const filter = this.client.createFilter({ email });
    const entities = await this.client.queryEntities('users', filter);
    return entities.length > 0 ? convertAzureEntity<User>(entities[0]) : undefined;
  }

  // Family operations
  async getChildren(parentId: string): Promise<User[]> {
    const filter = this.client.createFilter({ parentId });
    const entities = await this.client.queryEntities('users', filter);
    return entities.map(entity => convertAzureEntity<User>(entity));
  }

  async getFamilyByUserId(userId: string): Promise<Family | undefined> {
    // First get user's family membership
    const membershipFilter = this.client.createFilter({ userId });
    const memberships = await this.client.queryEntities('familyMemberships', membershipFilter);
    
    if (memberships.length === 0) {
      return undefined;
    }

    const familyId = memberships[0].familyId;
    return await this.getFamilyById(familyId);
  }

  async getFamilyById(familyId: string): Promise<Family | undefined> {
    const entity = await this.client.getEntity('families', 'family', familyId);
    return entity ? convertAzureEntity<Family>(entity) : undefined;
  }

  async getFamilyMembers(familyId: string): Promise<(FamilyMembership & { user: User })[]> {
    const filter = this.client.createFilter({ familyId });
    const memberships = await this.client.queryEntities('familyMemberships', filter);
    
    const results = [];
    for (const membership of memberships) {
      const user = await this.getUser(membership.userId);
      if (user) {
        results.push({
          ...convertAzureEntity<FamilyMembership>(membership),
          user
        });
      }
    }
    
    return results;
  }

  async getFamilyParents(familyId: string): Promise<(FamilyMembership & { user: User })[]> {
    const filter = this.client.createFilter({ familyId });
    const memberships = await this.client.queryEntities('familyMemberships', filter);
    
    const parentMemberships = memberships.filter(m => 
      m.role === 'admin' || m.role === 'collaborator'
    );
    
    const results = [];
    for (const membership of parentMemberships) {
      const user = await this.getUser(membership.userId);
      if (user) {
        results.push({
          ...convertAzureEntity<FamilyMembership>(membership),
          user
        });
      }
    }
    
    return results;
  }

  async getUserFamilyRole(userId: string): Promise<string | null | undefined> {
    const membershipFilter = this.client.createFilter({ userId });
    const memberships = await this.client.queryEntities('familyMemberships', membershipFilter);
    
    return memberships.length > 0 ? memberships[0].role : undefined;
  }

  async getUserFamilyMemberships(userId: string): Promise<FamilyMembership[]> {
    const filter = this.client.createFilter({ userId });
    const entities = await this.client.queryEntities('familyMemberships', filter);
    return entities.map(entity => convertAzureEntity<FamilyMembership>(entity));
  }

  async createFamily(name: string, adminUserId: string): Promise<Family> {
    const familyId = nanoid();
    const family = {
      id: familyId,
      name,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const familyEntity = convertToAzureEntity(family, 'family', familyId);
    await this.client.upsertEntity('families', familyEntity);

    // Add the creator as an admin
    await this.addFamilyMember(familyId, adminUserId, 'admin');

    return convertAzureEntity<Family>({ ...familyEntity, rowKey: familyEntity.rowKey });
  }

  async addFamilyMember(familyId: string, userId: string, role: string): Promise<FamilyMembership> {
    const membership = {
      id: nanoid(),
      familyId,
      userId,
      role,
      joinedAt: new Date(),
    };

    const entity = convertToAzureEntity(membership, 'familyMembership', membership.id);
    await this.client.upsertEntity('familyMemberships', entity);

    return convertAzureEntity<FamilyMembership>({ ...entity, rowKey: entity.rowKey });
  }

  async removeFamilyMember(familyId: string, userId: string): Promise<void> {
    const filter = this.client.createFilter({ familyId, userId });
    const memberships = await this.client.queryEntities('familyMemberships', filter);
    
    for (const membership of memberships) {
      await this.client.deleteEntity('familyMemberships', membership.partitionKey, membership.rowKey);
    }
  }

  async updateFamilyMemberRole(familyId: string, userId: string, newRole: string): Promise<void> {
    const filter = this.client.createFilter({ familyId, userId });
    const memberships = await this.client.queryEntities('familyMemberships', filter);
    
    if (memberships.length > 0) {
      const membership = memberships[0];
      membership.role = newRole;
      await this.client.upsertEntity('familyMemberships', membership);
    }
  }

  // Task operations
  async createTask(task: InsertTask): Promise<Task> {
    const taskId = nanoid();
    const newTask = {
      ...task,
      id: taskId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const entity = convertToAzureEntity(newTask, 'task', taskId);
    await this.client.upsertEntity('tasks', entity);

    return convertAzureEntity<Task>({ ...entity, rowKey: entity.rowKey });
  }

  async getTasksForFamily(familyId: string): Promise<Task[]> {
    const filter = this.client.createFilter({ familyId });
    const entities = await this.client.queryEntities('tasks', filter);
    return entities
      .map(entity => convertAzureEntity<Task>(entity))
      .sort((a, b) => {
        const aDate = new Date(a.createdAt);
        const bDate = new Date(b.createdAt);
        return bDate.getTime() - aDate.getTime();
      });
  }

  async getTasksForChild(childId: string, familyId: string): Promise<Task[]> {
    const allTasks = await this.getTasksForFamily(familyId);
    
    return allTasks.filter(task => 
      !task.assignedToIds || 
      task.assignedToIds.length === 0 || 
      task.assignedToIds.includes(childId)
    );
  }

  async getTasksByCreator(creatorId: string, familyId: string): Promise<Task[]> {
    const filter = this.client.createFilter({ createdById: creatorId, familyId });
    const entities = await this.client.queryEntities('tasks', filter);
    return entities.map(entity => convertAzureEntity<Task>(entity));
  }

  async getTaskById(taskId: string, familyId: string): Promise<Task | undefined> {
    const entity = await this.client.getEntity('tasks', 'task', taskId);
    if (entity && entity.familyId === familyId) {
      return convertAzureEntity<Task>(entity);
    }
    return undefined;
  }

  async updateTask(taskId: string, updates: Partial<InsertTask & { status?: string }>, familyId: string): Promise<Task> {
    const existingTask = await this.getTaskById(taskId, familyId);
    if (!existingTask) {
      throw new Error(`Task with id ${taskId} not found`);
    }

    const updatedTask = {
      ...existingTask,
      ...updates,
      updatedAt: new Date(),
    };

    const entity = convertToAzureEntity(updatedTask, 'task', taskId);
    await this.client.upsertEntity('tasks', entity);

    return convertAzureEntity<Task>({ ...entity, rowKey: entity.rowKey });
  }

  async deleteTask(taskId: string, familyId: string): Promise<void> {
    const task = await this.getTaskById(taskId, familyId);
    if (task) {
      await this.client.deleteEntity('tasks', 'task', taskId);
    }
  }

  async updateTaskStatus(taskId: string, status: string, familyId: string): Promise<void> {
    await this.updateTask(taskId, { status }, familyId);
  }

  // Task submission operations
  async createTaskSubmission(submission: InsertTaskSubmission): Promise<TaskSubmission> {
    const submissionId = nanoid();
    const newSubmission = {
      ...submission,
      id: submissionId,
      submittedAt: new Date(),
    };

    const entity = convertToAzureEntity(newSubmission, 'taskSubmission', submissionId);
    await this.client.upsertEntity('taskSubmissions', entity);

    return convertAzureEntity<TaskSubmission>({ ...entity, rowKey: entity.rowKey });
  }

  async getTaskSubmissionsByUser(userId: string, familyId: string): Promise<TaskSubmission[]> {
    const filter = this.client.createFilter({ submittedById: userId, familyId });
    const entities = await this.client.queryEntities('taskSubmissions', filter);
    return entities
      .map(entity => convertAzureEntity<TaskSubmission>(entity))
      .sort((a, b) => {
        const aDate = new Date(a.submittedAt);
        const bDate = new Date(b.submittedAt);
        return bDate.getTime() - aDate.getTime();
      });
  }

  async getTaskSubmissionsByTask(taskId: string, familyId: string): Promise<TaskSubmission[]> {
    const filter = this.client.createFilter({ taskId, familyId });
    const entities = await this.client.queryEntities('taskSubmissions', filter);
    return entities.map(entity => convertAzureEntity<TaskSubmission>(entity));
  }

  async getTaskSubmissionById(submissionId: string, familyId: string): Promise<TaskSubmission | undefined> {
    const entity = await this.client.getEntity('taskSubmissions', 'taskSubmission', submissionId);
    if (entity && entity.familyId === familyId) {
      return convertAzureEntity<TaskSubmission>(entity);
    }
    return undefined;
  }

  async getPendingTaskSubmissions(familyId: string): Promise<TaskSubmission[]> {
    const filter = this.client.createFilter({ status: 'submitted', familyId });
    const entities = await this.client.queryEntities('taskSubmissions', filter);
    return entities
      .map(entity => convertAzureEntity<TaskSubmission>(entity))
      .sort((a, b) => {
        const aDate = new Date(a.submittedAt);
        const bDate = new Date(b.submittedAt);
        return bDate.getTime() - aDate.getTime();
      });
  }

  async getTaskSubmissionsByStatus(familyId: string, status: string): Promise<TaskSubmission[]> {
    const filter = this.client.createFilter({ status, familyId });
    const entities = await this.client.queryEntities('taskSubmissions', filter);
    return entities
      .map(entity => convertAzureEntity<TaskSubmission>(entity))
      .sort((a, b) => {
        const aDate = a.reviewedAt ? new Date(a.reviewedAt) : new Date(a.submittedAt);
        const bDate = b.reviewedAt ? new Date(b.reviewedAt) : new Date(b.submittedAt);
        return bDate.getTime() - aDate.getTime();
      });
  }

  async getTaskSubmissionsByStatusAndUser(familyId: string, status: string, userId: string): Promise<TaskSubmission[]> {
    const filter = this.client.createFilter({ status, familyId, submittedById: userId });
    const entities = await this.client.queryEntities('taskSubmissions', filter);
    return entities
      .map(entity => convertAzureEntity<TaskSubmission>(entity))
      .sort((a, b) => {
        const aDate = a.reviewedAt ? new Date(a.reviewedAt) : new Date(a.submittedAt);
        const bDate = b.reviewedAt ? new Date(b.reviewedAt) : new Date(b.submittedAt);
        return bDate.getTime() - aDate.getTime();
      });
  }

  async updateTaskSubmissionStatus(submissionId: string, status: string, reviewerId: string, familyId: string): Promise<void> {
    const submission = await this.getTaskSubmissionById(submissionId, familyId);
    if (!submission) {
      throw new Error(`Task submission with id ${submissionId} not found`);
    }

    const updatedSubmission = {
      ...submission,
      status: status as any,
      reviewedAt: new Date(),
      reviewedById: reviewerId,
    };

    const entity = convertToAzureEntity(updatedSubmission, 'taskSubmission', submissionId);
    await this.client.upsertEntity('taskSubmissions', entity);
  }

  // Balance operations
  async getBalance(userId: string, familyId: string): Promise<Balance | undefined> {
    const filter = this.client.createFilter({ userId, familyId });
    const entities = await this.client.queryEntities('balances', filter);
    return entities.length > 0 ? convertAzureEntity<Balance>(entities[0]) : undefined;
  }

  async createBalance(userId: string, familyId: string): Promise<Balance> {
    const balanceId = nanoid();
    const balance = {
      id: balanceId,
      familyId,
      userId,
      accumulated: 0,
      pending: 0,
      updatedAt: new Date(),
    };

    const entity = convertToAzureEntity(balance, 'balance', balanceId);
    await this.client.upsertEntity('balances', entity);

    return convertAzureEntity<Balance>({ ...entity, rowKey: entity.rowKey });
  }

  async updateBalance(userId: string, familyId: string, accumulated: number, pending: number): Promise<void> {
    const existing = await this.getBalance(userId, familyId);
    if (!existing) {
      await this.createBalance(userId, familyId);
    }

    const balanceId = existing?.id || nanoid();
    const balance = {
      id: balanceId,
      familyId,
      userId,
      accumulated,
      pending,
      updatedAt: new Date(),
    };

    const entity = convertToAzureEntity(balance, 'balance', balanceId);
    await this.client.upsertEntity('balances', entity);
  }

  // Payment operations
  async createPayment(payment: InsertPayment): Promise<Payment> {
    const paymentId = nanoid();
    const newPayment = {
      ...payment,
      id: paymentId,
      createdAt: new Date(),
    };

    const entity = convertToAzureEntity(newPayment, 'payment', paymentId);
    await this.client.upsertEntity('payments', entity);

    return convertAzureEntity<Payment>({ ...entity, rowKey: entity.rowKey });
  }

  async getPaymentsByUser(userId: string, familyId: string): Promise<Payment[]> {
    const filter = this.client.createFilter({ toUserId: userId, familyId });
    const entities = await this.client.queryEntities('payments', filter);
    return entities.map(entity => convertAzureEntity<Payment>(entity));
  }

  async updatePaymentStatus(paymentId: string, status: string, familyId: string): Promise<void> {
    const entity = await this.client.getEntity('payments', 'payment', paymentId);
    if (entity && entity.familyId === familyId) {
      entity.status = status;
      if (status === 'confirmed') {
        entity.confirmedAt = new Date().toISOString();
      }
      await this.client.upsertEntity('payments', entity);
    }
  }

  // Notification operations
  async createNotification(data: { familyId: string; userId: string; title: string; message: string; type: string; relatedId?: string }): Promise<Notification> {
    const notificationId = nanoid();
    const notification = {
      ...data,
      id: notificationId,
      isRead: false,
      createdAt: new Date(),
    };

    const entity = convertToAzureEntity(notification, 'notification', notificationId);
    await this.client.upsertEntity('notifications', entity);

    return convertAzureEntity<Notification>({ ...entity, rowKey: entity.rowKey });
  }

  async getNotificationsByUser(userId: string, familyId: string): Promise<Notification[]> {
    const filter = this.client.createFilter({ userId, familyId });
    const entities = await this.client.queryEntities('notifications', filter);
    return entities
      .map(entity => convertAzureEntity<Notification>(entity))
      .sort((a, b) => {
        const aDate = new Date(a.createdAt);
        const bDate = new Date(b.createdAt);
        return bDate.getTime() - aDate.getTime();
      });
  }

  async markNotificationAsRead(notificationId: string, familyId: string): Promise<void> {
    const entity = await this.client.getEntity('notifications', 'notification', notificationId);
    if (entity && entity.familyId === familyId) {
      entity.isRead = true;
      await this.client.upsertEntity('notifications', entity);
    }
  }

  async markAllNotificationsAsRead(userId: string, familyId: string): Promise<void> {
    const filter = this.client.createFilter({ userId, familyId, isRead: false });
    const entities = await this.client.queryEntities('notifications', filter);
    
    for (const entity of entities) {
      entity.isRead = true;
      await this.client.upsertEntity('notifications', entity);
    }
  }

  // Family invitation operations
  async createFamilyInvitation(familyId: string, invitedByUserId: string, inviteeEmail: string, inviteeRole: string): Promise<FamilyInvitation> {
    const invitationId = nanoid();
    const invitation = {
      id: invitationId,
      familyId,
      invitedByUserId,
      inviteeEmail,
      inviteeRole,
      status: 'pending',
      createdAt: new Date(),
    };

    const entity = convertToAzureEntity(invitation, 'familyInvitation', invitationId);
    await this.client.upsertEntity('familyInvitations', entity);

    return convertAzureEntity<FamilyInvitation>({ ...entity, rowKey: entity.rowKey });
  }

  async getInvitationsByEmail(email: string): Promise<FamilyInvitation[]> {
    const filter = this.client.createFilter({ inviteeEmail: email });
    const entities = await this.client.queryEntities('familyInvitations', filter);
    return entities.map(entity => convertAzureEntity<FamilyInvitation>(entity));
  }

  async getInvitationById(id: string): Promise<FamilyInvitation | undefined> {
    const entity = await this.client.getEntity('familyInvitations', 'familyInvitation', id);
    return entity ? convertAzureEntity<FamilyInvitation>(entity) : undefined;
  }

  async getPendingFamilyInvitations(familyId: string): Promise<FamilyInvitation[]> {
    const filter = this.client.createFilter({ familyId, status: 'pending' });
    const entities = await this.client.queryEntities('familyInvitations', filter);
    return entities.map(entity => convertAzureEntity<FamilyInvitation>(entity));
  }

  async cancelInvitation(invitationId: string): Promise<void> {
    const entity = await this.client.getEntity('familyInvitations', 'familyInvitation', invitationId);
    if (entity) {
      entity.status = 'cancelled';
      await this.client.upsertEntity('familyInvitations', entity);
    }
  }

  async acceptInvitation(invitationId: string, userId: string): Promise<void> {
    const invitation = await this.getInvitationById(invitationId);
    if (!invitation) {
      throw new Error(`Invitation with id ${invitationId} not found`);
    }

    // Add user to family
    await this.addFamilyMember(invitation.familyId, userId, invitation.inviteeRole);

    // Update invitation status
    const entity = await this.client.getEntity('familyInvitations', 'familyInvitation', invitationId);
    if (entity) {
      entity.status = 'accepted';
      entity.acceptedAt = new Date().toISOString();
      await this.client.upsertEntity('familyInvitations', entity);
    }
  }

  async rejectInvitation(invitationId: string): Promise<void> {
    const entity = await this.client.getEntity('familyInvitations', 'familyInvitation', invitationId);
    if (entity) {
      entity.status = 'rejected';
      entity.rejectedAt = new Date().toISOString();
      await this.client.upsertEntity('familyInvitations', entity);
    }
  }

  // Family creation operations
  async createFamilyWithAdmin(userId: string, familyName: string): Promise<Family> {
    return await this.createFamily(familyName, userId);
  }

  // Child data reset operations
  async resetChildData(childId: string, familyId: string): Promise<void> {
    // Delete all task submissions for the child
    const submissionsFilter = this.client.createFilter({ submittedById: childId, familyId });
    const submissions = await this.client.queryEntities('taskSubmissions', submissionsFilter);
    
    for (const submission of submissions) {
      await this.client.deleteEntity('taskSubmissions', submission.partitionKey, submission.rowKey);
    }

    // Reset the child's balance
    await this.updateBalance(childId, familyId, 0, 0);

    // Delete all payments to the child
    const paymentsFilter = this.client.createFilter({ toUserId: childId, familyId });
    const payments = await this.client.queryEntities('payments', paymentsFilter);
    
    for (const payment of payments) {
      await this.client.deleteEntity('payments', payment.partitionKey, payment.rowKey);
    }

    // Mark all notifications for the child as read
    await this.markAllNotificationsAsRead(childId, familyId);
  }

  // Additional notification methods for users without families
  async getNotificationsByUserWithoutFamily(userId: string): Promise<Notification[]> {
    const filter = this.client.createFilter({ forUserId: userId });
    const entities = await this.client.queryEntities('notifications', filter);
    
    return entities.map(entity => ({
      id: entity.rowKey,
      type: entity.type,
      title: entity.title,
      message: entity.message,
      forUserId: entity.forUserId,
      familyId: entity.familyId || '',
      isRead: entity.isRead === 'true',
      createdAt: new Date(entity.timestamp),
      relatedId: entity.relatedId || null,
      actionData: entity.actionData ? JSON.parse(entity.actionData) : null,
    }));
  }

  async markNotificationAsReadWithoutFamily(notificationId: string, userId: string): Promise<void> {
    try {
      const entity = await this.client.getEntity('notifications', 'notification', notificationId);
      if (entity && entity.forUserId === userId) {
        entity.isRead = 'true';
        await this.client.upsertEntity('notifications', entity);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  async markAllNotificationsAsReadWithoutFamily(userId: string): Promise<void> {
    const filter = this.client.createFilter({ forUserId: userId, isRead: 'false' });
    const entities = await this.client.queryEntities('notifications', filter);
    
    for (const entity of entities) {
      entity.isRead = 'true';
      await this.client.upsertEntity('notifications', entity);
    }
  }
}