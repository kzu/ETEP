import { AzureTableStorage } from "./azure-storage";
import { IStorage } from "./storage";

// Check if APP_STORAGE is configured for Azure Table Storage
const appStorageConnectionString = process.env.APP_STORAGE;

if (!appStorageConnectionString) {
  throw new Error("APP_STORAGE connection string is required for Azure Table Storage");
}

// Use Azure Table Storage EXCLUSIVELY for everything including users and sessions
const azureStorage = new AzureTableStorage(appStorageConnectionString);

// Pure Azure Storage - no database at all
class PureAzureStorage implements IStorage {
  private storage = azureStorage;

  // All operations use Azure Table Storage
  async getUser(id: string) { return this.storage.getUser(id); }
  async upsertUser(user: any) { return this.storage.upsertUser(user); }
  async updateUserName(userId: string, nameData: any) { return this.storage.updateUserName(userId, nameData); }
  async updateUserRole(userId: string, roleData: any) { return this.storage.updateUserRole(userId, roleData); }
  async getUserByEmail(email: string) { return this.storage.getUserByEmail(email); }

  // All operations use Azure Table Storage
  async getChildren(parentId: string) { return this.storage.getChildren(parentId); }
  async getFamilyByUserId(userId: string) { return this.storage.getFamilyByUserId(userId); }
  async getFamilyById(familyId: string) { return this.storage.getFamilyById(familyId); }
  async getFamilyMembers(familyId: string) { return this.storage.getFamilyMembers(familyId); }
  async getFamilyParents(familyId: string) { return this.storage.getFamilyParents(familyId); }
  async getUserFamilyRole(userId: string) { return this.storage.getUserFamilyRole(userId); }
  async getUserFamilyMemberships(userId: string) { return this.storage.getUserFamilyMemberships(userId); }
  async createFamily(name: string, adminUserId: string) { return this.storage.createFamily(name, adminUserId); }
  async addFamilyMember(familyId: string, userId: string, role: string) { return this.storage.addFamilyMember(familyId, userId, role); }
  async removeFamilyMember(familyId: string, userId: string) { return this.storage.removeFamilyMember(familyId, userId); }
  async updateFamilyMemberRole(familyId: string, userId: string, newRole: string) { return this.storage.updateFamilyMemberRole(familyId, userId, newRole); }
  
  async createTask(task: any) { return this.storage.createTask(task); }
  async getTasksForFamily(familyId: string) { return this.storage.getTasksForFamily(familyId); }
  async getTasksForChild(childId: string, familyId: string) { return this.storage.getTasksForChild(childId, familyId); }
  async getTasksByCreator(creatorId: string, familyId: string) { return this.storage.getTasksByCreator(creatorId, familyId); }
  async getTaskById(taskId: string, familyId: string) { return this.storage.getTaskById(taskId, familyId); }
  async updateTask(taskId: string, updates: any, familyId: string) { return this.storage.updateTask(taskId, updates, familyId); }
  async deleteTask(taskId: string, familyId: string) { return this.storage.deleteTask(taskId, familyId); }
  async updateTaskStatus(taskId: string, status: string, familyId: string) { return this.storage.updateTaskStatus(taskId, status, familyId); }
  
  async createTaskSubmission(submission: any) { return this.storage.createTaskSubmission(submission); }
  async getTaskSubmissionsByUser(userId: string, familyId: string) { return this.storage.getTaskSubmissionsByUser(userId, familyId); }
  async getTaskSubmissionsByTask(taskId: string, familyId: string) { return this.storage.getTaskSubmissionsByTask(taskId, familyId); }
  async getTaskSubmissionById(submissionId: string, familyId: string) { return this.storage.getTaskSubmissionById(submissionId, familyId); }
  async getPendingTaskSubmissions(familyId: string) { return this.storage.getPendingTaskSubmissions(familyId); }
  async getTaskSubmissionsByStatus(familyId: string, status: string) { return this.storage.getTaskSubmissionsByStatus(familyId, status); }
  async getTaskSubmissionsByStatusAndUser(familyId: string, status: string, userId: string) { return this.storage.getTaskSubmissionsByStatusAndUser(familyId, status, userId); }
  async updateTaskSubmissionStatus(submissionId: string, status: string, reviewerId: string, familyId: string) { return this.storage.updateTaskSubmissionStatus(submissionId, status, reviewerId, familyId); }
  
  async getBalance(userId: string, familyId: string) { return this.storage.getBalance(userId, familyId); }
  async createBalance(userId: string, familyId: string) { return this.storage.createBalance(userId, familyId); }
  async updateBalance(userId: string, familyId: string, accumulated: number, pending: number) { return this.storage.updateBalance(userId, familyId, accumulated, pending); }
  
  async createPayment(payment: any) { return this.storage.createPayment(payment); }
  async getPaymentsByUser(userId: string, familyId: string) { return this.storage.getPaymentsByUser(userId, familyId); }
  async updatePaymentStatus(paymentId: string, status: string, familyId: string) { return this.storage.updatePaymentStatus(paymentId, status, familyId); }
  
  async createNotification(data: any) { return this.storage.createNotification(data); }
  async getNotificationsByUser(userId: string, familyId: string) { return this.storage.getNotificationsByUser(userId, familyId); }
  async markNotificationAsRead(notificationId: string, familyId: string) { return this.storage.markNotificationAsRead(notificationId, familyId); }
  async markAllNotificationsAsRead(userId: string, familyId: string) { return this.storage.markAllNotificationsAsRead(userId, familyId); }

  // Additional notification methods for users without families
  async getNotificationsByUserWithoutFamily(userId: string) { return this.storage.getNotificationsByUserWithoutFamily(userId); }
  async markNotificationAsReadWithoutFamily(notificationId: string, userId: string) { return this.storage.markNotificationAsReadWithoutFamily(notificationId, userId); }
  async markAllNotificationsAsReadWithoutFamily(userId: string) { return this.storage.markAllNotificationsAsReadWithoutFamily(userId); }
  
  async createFamilyInvitation(familyId: string, invitedByUserId: string, inviteeEmail: string, inviteeRole: string) { return this.storage.createFamilyInvitation(familyId, invitedByUserId, inviteeEmail, inviteeRole); }
  async getInvitationsByEmail(email: string) { return this.storage.getInvitationsByEmail(email); }
  async getInvitationById(id: string) { return this.storage.getInvitationById(id); }
  async getPendingFamilyInvitations(familyId: string) { return this.storage.getPendingFamilyInvitations(familyId); }
  async cancelInvitation(invitationId: string) { return this.storage.cancelInvitation(invitationId); }
  async acceptInvitation(invitationId: string, userId: string) { return this.storage.acceptInvitation(invitationId, userId); }
  async rejectInvitation(invitationId: string) { return this.storage.rejectInvitation(invitationId); }
  
  async createFamilyWithAdmin(userId: string, familyName: string) { return this.storage.createFamilyWithAdmin(userId, familyName); }
  async resetChildData(childId: string, familyId: string) { return this.storage.resetChildData(childId, familyId); }
}

export const storage = new PureAzureStorage();

console.log('Using Azure Table Storage EXCLUSIVELY for all data persistence');
console.log('NO PostgreSQL database - everything stored in Azure Tables');