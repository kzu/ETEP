import { AzureTableStorage } from "./azure-storage";
import { DatabaseStorage, IStorage } from "./storage";

// Check if APP_STORAGE is configured for Azure Table Storage
const appStorageConnectionString = process.env.APP_STORAGE;

// Always use database storage for sessions and user operations (required for Replit Auth)
const databaseStorage = new DatabaseStorage();

// Create a hybrid storage that uses database for users and Azure for everything else
class HybridStorage implements IStorage {
  private dbStorage = databaseStorage;
  private azureStorage = appStorageConnectionString ? new AzureTableStorage(appStorageConnectionString) : null;
  
  private get dataStorage() {
    return this.azureStorage || this.dbStorage;
  }

  // User operations always use database (required for Replit Auth)
  async getUser(id: string) { return this.dbStorage.getUser(id); }
  async upsertUser(user: any) { return this.dbStorage.upsertUser(user); }
  async updateUserName(userId: string, nameData: any) { return this.dbStorage.updateUserName(userId, nameData); }
  async updateUserRole(userId: string, roleData: any) { return this.dbStorage.updateUserRole(userId, roleData); }
  async getUserByEmail(email: string) { return this.dbStorage.getUserByEmail(email); }

  // All other operations use the configured storage (Azure or Database)
  async getChildren(parentId: string) { return this.dataStorage.getChildren(parentId); }
  async getFamilyByUserId(userId: string) { return this.dataStorage.getFamilyByUserId(userId); }
  async getFamilyById(familyId: string) { return this.dataStorage.getFamilyById(familyId); }
  async getFamilyMembers(familyId: string) { return this.dataStorage.getFamilyMembers(familyId); }
  async getFamilyParents(familyId: string) { return this.dataStorage.getFamilyParents(familyId); }
  async getUserFamilyRole(userId: string) { return this.dataStorage.getUserFamilyRole(userId); }
  async getUserFamilyMemberships(userId: string) { return this.dataStorage.getUserFamilyMemberships(userId); }
  async createFamily(name: string, adminUserId: string) { return this.dataStorage.createFamily(name, adminUserId); }
  async addFamilyMember(familyId: string, userId: string, role: string) { return this.dataStorage.addFamilyMember(familyId, userId, role); }
  async removeFamilyMember(familyId: string, userId: string) { return this.dataStorage.removeFamilyMember(familyId, userId); }
  async updateFamilyMemberRole(familyId: string, userId: string, newRole: string) { return this.dataStorage.updateFamilyMemberRole(familyId, userId, newRole); }
  
  async createTask(task: any) { return this.dataStorage.createTask(task); }
  async getTasksForFamily(familyId: string) { return this.dataStorage.getTasksForFamily(familyId); }
  async getTasksForChild(childId: string, familyId: string) { return this.dataStorage.getTasksForChild(childId, familyId); }
  async getTasksByCreator(creatorId: string, familyId: string) { return this.dataStorage.getTasksByCreator(creatorId, familyId); }
  async getTaskById(taskId: string, familyId: string) { return this.dataStorage.getTaskById(taskId, familyId); }
  async updateTask(taskId: string, updates: any, familyId: string) { return this.dataStorage.updateTask(taskId, updates, familyId); }
  async deleteTask(taskId: string, familyId: string) { return this.dataStorage.deleteTask(taskId, familyId); }
  async updateTaskStatus(taskId: string, status: string, familyId: string) { return this.dataStorage.updateTaskStatus(taskId, status, familyId); }
  
  async createTaskSubmission(submission: any) { return this.dataStorage.createTaskSubmission(submission); }
  async getTaskSubmissionsByUser(userId: string, familyId: string) { return this.dataStorage.getTaskSubmissionsByUser(userId, familyId); }
  async getTaskSubmissionsByTask(taskId: string, familyId: string) { return this.dataStorage.getTaskSubmissionsByTask(taskId, familyId); }
  async getTaskSubmissionById(submissionId: string, familyId: string) { return this.dataStorage.getTaskSubmissionById(submissionId, familyId); }
  async getPendingTaskSubmissions(familyId: string) { return this.dataStorage.getPendingTaskSubmissions(familyId); }
  async getTaskSubmissionsByStatus(familyId: string, status: string) { return this.dataStorage.getTaskSubmissionsByStatus(familyId, status); }
  async getTaskSubmissionsByStatusAndUser(familyId: string, status: string, userId: string) { return this.dataStorage.getTaskSubmissionsByStatusAndUser(familyId, status, userId); }
  async updateTaskSubmissionStatus(submissionId: string, status: string, reviewerId: string, familyId: string) { return this.dataStorage.updateTaskSubmissionStatus(submissionId, status, reviewerId, familyId); }
  
  async getBalance(userId: string, familyId: string) { return this.dataStorage.getBalance(userId, familyId); }
  async createBalance(userId: string, familyId: string) { return this.dataStorage.createBalance(userId, familyId); }
  async updateBalance(userId: string, familyId: string, accumulated: number, pending: number) { return this.dataStorage.updateBalance(userId, familyId, accumulated, pending); }
  
  async createPayment(payment: any) { return this.dataStorage.createPayment(payment); }
  async getPaymentsByUser(userId: string, familyId: string) { return this.dataStorage.getPaymentsByUser(userId, familyId); }
  async updatePaymentStatus(paymentId: string, status: string, familyId: string) { return this.dataStorage.updatePaymentStatus(paymentId, status, familyId); }
  
  async createNotification(data: any) { return this.dataStorage.createNotification(data); }
  async getNotificationsByUser(userId: string, familyId: string) { return this.dataStorage.getNotificationsByUser(userId, familyId); }
  async markNotificationAsRead(notificationId: string, familyId: string) { return this.dataStorage.markNotificationAsRead(notificationId, familyId); }
  async markAllNotificationsAsRead(userId: string, familyId: string) { return this.dataStorage.markAllNotificationsAsRead(userId, familyId); }
  
  async createFamilyInvitation(familyId: string, invitedByUserId: string, inviteeEmail: string, inviteeRole: string) { return this.dataStorage.createFamilyInvitation(familyId, invitedByUserId, inviteeEmail, inviteeRole); }
  async getInvitationsByEmail(email: string) { return this.dataStorage.getInvitationsByEmail(email); }
  async getInvitationById(id: string) { return this.dataStorage.getInvitationById(id); }
  async getPendingFamilyInvitations(familyId: string) { return this.dataStorage.getPendingFamilyInvitations(familyId); }
  async cancelInvitation(invitationId: string) { return this.dataStorage.cancelInvitation(invitationId); }
  async acceptInvitation(invitationId: string, userId: string) { return this.dataStorage.acceptInvitation(invitationId, userId); }
  async rejectInvitation(invitationId: string) { return this.dataStorage.rejectInvitation(invitationId); }
  
  async createFamilyWithAdmin(userId: string, familyName: string) { return this.dataStorage.createFamilyWithAdmin(userId, familyName); }
  async resetChildData(childId: string, familyId: string) { return this.dataStorage.resetChildData(childId, familyId); }
}

export const storage = new HybridStorage();

console.log(`Using ${appStorageConnectionString ? 'Hybrid Storage (Database for users, Azure Tables for data)' : 'Database Storage'} for data persistence`);
console.log('User authentication and sessions always use Database Storage (required for Replit Auth)');