import { randomUUID } from 'node:crypto';
import { database } from './db';

export interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  resource: string;
  recordId?: string;
  details?: unknown;
  createdAt: string;
}

type AuditLogRow = {
  id: string;
  userId: string;
  action: string;
  resource: string;
  recordId?: string | null;
  details: string | null;
  createdAt: string;
};

function serializeAuditDetails(details?: unknown) {
  if (details === undefined || details === null) return null;
  try {
    return JSON.stringify(details);
  } catch {
    return JSON.stringify({ value: String(details) });
  }
}

function parseAuditDetails(value: string | null): unknown {
  if (!value) return undefined;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

export function writeAuditLog(entry: Omit<AuditLogEntry, 'id' | 'createdAt'>) {
  const log: AuditLogEntry = {
    ...entry,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  };
  database.prepare(`
    INSERT INTO audit_logs (id, user_id, action, resource, record_id, details, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(log.id, log.userId, log.action, log.resource, log.recordId || null, serializeAuditDetails(log.details), log.createdAt);
  return log;
}

export function listAuditLogs(limit = 200) {
  const rows = database.prepare(`
    SELECT id, user_id AS userId, action, resource, record_id AS recordId, details, created_at AS createdAt
    FROM audit_logs
    ORDER BY created_at DESC
    LIMIT ?
  `).all(Math.min(Math.max(limit, 1), 1000)) as AuditLogRow[];

  return rows.map((row) => ({
    ...row,
    recordId: row.recordId ?? undefined,
    details: parseAuditDetails(row.details),
  }));
}
