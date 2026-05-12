export interface User {
  id: string; // Já pensando em UUID
  name: string;
  email: string;
  role: 'user' | 'admin';
}

export interface SyncOperation {
  table: string;
  operation: 'create' | 'update' | 'delete';
  record: Record<string, unknown>;
  client_id: string;
  timestamp: string;
}
