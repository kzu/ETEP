import { TableServiceClient, TableClient, odata } from '@azure/data-tables';

export class AzureTableClient {
  private serviceClient: TableServiceClient;
  private tableClients: Map<string, TableClient> = new Map();

  private connectionString: string;

  constructor(connectionString: string) {
    this.connectionString = connectionString;
    this.serviceClient = TableServiceClient.fromConnectionString(connectionString);
  }

  async getTableClient(tableName: string): Promise<TableClient> {
    if (!this.tableClients.has(tableName)) {
      const tableClient = TableClient.fromConnectionString(this.connectionString, tableName);
      
      // Create table if it doesn't exist
      await tableClient.createTable().catch((error: any) => {
        // Ignore error if table already exists
        if (error.statusCode !== 409) {
          throw error;
        }
      });
      
      this.tableClients.set(tableName, tableClient);
    }
    
    return this.tableClients.get(tableName)!;
  }

  // Helper methods for common operations
  async upsertEntity(tableName: string, entity: any): Promise<void> {
    const tableClient = await this.getTableClient(tableName);
    await tableClient.upsertEntity(entity, 'Replace');
  }

  async getEntity(tableName: string, partitionKey: string, rowKey: string): Promise<any> {
    const tableClient = await this.getTableClient(tableName);
    try {
      return await tableClient.getEntity(partitionKey, rowKey);
    } catch (error: any) {
      if (error.statusCode === 404) {
        return undefined;
      }
      throw error;
    }
  }

  async deleteEntity(tableName: string, partitionKey: string, rowKey: string): Promise<void> {
    const tableClient = await this.getTableClient(tableName);
    await tableClient.deleteEntity(partitionKey, rowKey);
  }

  async queryEntities(tableName: string, filter?: string): Promise<any[]> {
    const tableClient = await this.getTableClient(tableName);
    const entities: any[] = [];
    
    const entitiesIter = tableClient.listEntities({
      queryOptions: filter ? { filter } : undefined
    });
    
    for await (const entity of entitiesIter) {
      entities.push(entity);
    }
    
    return entities;
  }

  // Create OData filter helper
  createFilter(conditions: Record<string, any>): string {
    const filters = Object.entries(conditions)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => {
        if (typeof value === 'string') {
          return odata`${key} eq ${value}`;
        } else if (typeof value === 'number') {
          return odata`${key} eq ${value}`;
        } else if (typeof value === 'boolean') {
          return odata`${key} eq ${value}`;
        } else {
          return odata`${key} eq ${String(value)}`;
        }
      });
    
    return filters.join(' and ');
  }
}