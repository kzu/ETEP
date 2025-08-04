import { AzureTableStorage } from "./azure-storage";
import { DatabaseStorage } from "./storage";

// Check if APP_STORAGE is configured for Azure Table Storage
const appStorageConnectionString = process.env.APP_STORAGE;

// Export the appropriate storage instance
export const storage = appStorageConnectionString 
  ? new AzureTableStorage(appStorageConnectionString)
  : new DatabaseStorage();

// Always use database storage for sessions (required for Replit Auth)
export const databaseStorage = new DatabaseStorage();

console.log(`Using ${appStorageConnectionString ? 'Azure Table Storage' : 'Database Storage'} for data persistence`);
console.log('Using Database Storage for session management (required for Replit Auth)');