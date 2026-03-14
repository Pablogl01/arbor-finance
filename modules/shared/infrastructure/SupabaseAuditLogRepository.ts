import { createClient } from '@/utils/supabase/client';
import { AuditLogRepository, AuditLog } from '../domain/AuditLogRepository';

export class SupabaseAuditLogRepository implements AuditLogRepository {
  private supabase = createClient();

  async log(entry: Omit<AuditLog, 'id' | 'createdAt'>): Promise<void> {
    const { error } = await this.supabase
      .from('audit_logs')
      .insert({
        user_id: entry.userId,
        action: entry.action,
        resource_type: entry.resourceType,
        resource_id: entry.resourceId,
        old_value: entry.oldValue,
        new_value: entry.newValue,
      });

    if (error) {
      console.error('Failed to create audit log:', error);
      // We don't throw here to avoid failing the main operation if logging fails,
      // but in a production environment we might want more robust error handling.
    }
  }
}
