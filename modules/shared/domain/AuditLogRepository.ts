export interface AuditLog {
  id?: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  createdAt?: Date;
}

export interface AuditLogRepository {
  log(entry: Omit<AuditLog, 'id' | 'createdAt'>): Promise<void>;
}
