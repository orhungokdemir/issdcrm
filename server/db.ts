import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export const RESOURCE_TABLES = {
  users: 'users',
  customers: 'customers',
  stakeholders: 'stakeholders',
  products: 'products',
  activities: 'activities',
  opportunities: 'opportunities',
  requests: 'requests',
  proposals: 'proposals',
  orders: 'orders',
  contracts: 'contracts',
  guaranteeLetters: 'guarantee_letters',
} as const;

export type ResourceName = keyof typeof RESOURCE_TABLES;

const databasePath = resolve(process.env.CRM_DATABASE_PATH || 'data/crm.sqlite');
mkdirSync(dirname(databasePath), { recursive: true });

export const database = new DatabaseSync(databasePath);

database.exec(`
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS records (
    resource TEXT NOT NULL,
    id TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (resource, id)
  );
  CREATE INDEX IF NOT EXISTS idx_records_resource ON records(resource);

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

  CREATE TABLE IF NOT EXISTS auth_challenges (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    purpose TEXT NOT NULL,
    code_hash TEXT NOT NULL,
    payload TEXT,
    expires_at TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_auth_challenges_email ON auth_challenges(email, purpose);

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    record_id TEXT,
    details TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

  CREATE TABLE IF NOT EXISTS crm_customers (
    id TEXT PRIMARY KEY,
    payload TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS crm_stakeholders (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES crm_customers(id),
    payload TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS crm_activities (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES crm_customers(id),
    payload TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS crm_opportunities (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES crm_customers(id),
    payload TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS crm_requests (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES crm_customers(id),
    payload TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS crm_proposals (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES crm_customers(id),
    request_id TEXT REFERENCES crm_requests(id),
    payload TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS crm_orders (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES crm_customers(id),
    request_id TEXT REFERENCES crm_requests(id),
    proposal_id TEXT REFERENCES crm_proposals(id),
    payload TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS crm_contracts (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES crm_customers(id),
    request_id TEXT REFERENCES crm_requests(id),
    proposal_id TEXT REFERENCES crm_proposals(id),
    order_id TEXT REFERENCES crm_orders(id),
    payload TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS crm_guarantee_letters (
    id TEXT PRIMARY KEY,
    contract_id TEXT NOT NULL REFERENCES crm_contracts(id),
    payload TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_crm_requests_customer_id ON crm_requests(customer_id);
  CREATE INDEX IF NOT EXISTS idx_crm_stakeholders_customer_id ON crm_stakeholders(customer_id);
  CREATE INDEX IF NOT EXISTS idx_crm_opportunities_customer_id ON crm_opportunities(customer_id);
  CREATE INDEX IF NOT EXISTS idx_crm_proposals_request_id ON crm_proposals(request_id);
  CREATE INDEX IF NOT EXISTS idx_crm_orders_proposal_id ON crm_orders(proposal_id);
  CREATE INDEX IF NOT EXISTS idx_crm_contracts_order_id ON crm_contracts(order_id);
  CREATE INDEX IF NOT EXISTS idx_crm_guarantee_letters_contract_id ON crm_guarantee_letters(contract_id);
`);

const customerColumns = database.prepare('PRAGMA table_info(crm_customers)').all() as Array<{ name: string }>;
if (!customerColumns.some((column) => column.name === 'parent_customer_id')) {
  database.exec('ALTER TABLE crm_customers ADD COLUMN parent_customer_id TEXT REFERENCES crm_customers(id)');
}

export function listRecords(resource: ResourceName) {
  const rows = database.prepare(
    'SELECT id, payload FROM records WHERE resource = ? ORDER BY created_at DESC'
  ).all(RESOURCE_TABLES[resource]) as Array<{ id: string; payload: string }>;

  return rows.map((row) => JSON.parse(row.payload));
}

export function listRecordsPage(resource: ResourceName, page = 1, pageSize = 50, search = '') {
  const safePageSize = Math.min(Math.max(Math.trunc(pageSize) || 50, 1), 200);
  const safePage = Math.max(Math.trunc(page) || 1, 1);
  const offset = (safePage - 1) * safePageSize;
  const searchTerm = search.trim();
  const searchClause = searchTerm ? ' AND payload LIKE ?' : '';
  const searchValue = `%${searchTerm}%`;
  const countRow = database.prepare(`SELECT COUNT(*) AS count FROM records WHERE resource = ?${searchClause}`).get(...(searchTerm ? [RESOURCE_TABLES[resource], searchValue] : [RESOURCE_TABLES[resource]])) as { count: number };
  const rows = database.prepare(`SELECT id, payload FROM records WHERE resource = ?${searchClause} ORDER BY updated_at DESC, id ASC LIMIT ? OFFSET ?`).all(...(searchTerm ? [RESOURCE_TABLES[resource], searchValue, safePageSize, offset] : [RESOURCE_TABLES[resource], safePageSize, offset])) as Array<{ id: string; payload: string }>;
  return {
    data: rows.map((row) => JSON.parse(row.payload)),
    total: countRow.count,
    page: safePage,
    pageSize: safePageSize,
    totalPages: Math.max(Math.ceil(countRow.count / safePageSize), 1),
  };
}

export function countRecords(resource: ResourceName) {
  const row = database.prepare(
    'SELECT COUNT(*) AS count FROM records WHERE resource = ?'
  ).get(RESOURCE_TABLES[resource]) as { count: number };
  return row.count;
}

export function findRecord(resource: ResourceName, id: string) {
  const row = database.prepare(
    'SELECT payload FROM records WHERE resource = ? AND id = ?'
  ).get(RESOURCE_TABLES[resource], id) as { payload: string } | undefined;
  return row ? JSON.parse(row.payload) : null;
}

export function upsertRecord(resource: ResourceName, id: string, payload: unknown) {
  const serializedPayload = JSON.stringify(payload);
  database.exec('BEGIN');
  try {
    database.prepare(`
      INSERT INTO records (resource, id, payload)
      VALUES (?, ?, ?)
      ON CONFLICT(resource, id) DO UPDATE SET
        payload = excluded.payload,
        updated_at = CURRENT_TIMESTAMP
    `).run(RESOURCE_TABLES[resource], id, serializedPayload);
    syncRelationalRecord(resource, id, payload);
    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}

export function deleteRecord(resource: ResourceName, id: string) {
  database.exec('BEGIN');
  try {
    const result = database.prepare(
      'DELETE FROM records WHERE resource = ? AND id = ?'
    ).run(RESOURCE_TABLES[resource], id);
    if (result.changes > 0) deleteRelationalRecord(resource, id);
    database.exec('COMMIT');
    return result.changes > 0;
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}

function asRecord(payload: unknown): Record<string, unknown> {
  return payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
}

function optionalReference(value: unknown, table: string) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const exists = database.prepare(`SELECT 1 AS present FROM ${table} WHERE id = ?`).get(value) as { present: number } | undefined;
  return exists ? value : null;
}

function requiredReference(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('İlişkisel kayıt için foreign key zorunludur.');
  return value;
}

function syncRelationalRecord(resource: ResourceName, id: string, payload: unknown) {
  const record = asRecord(payload);
  const serializedPayload = JSON.stringify(payload);

  switch (resource) {
    case 'customers':
      database.prepare(`INSERT INTO crm_customers (id, payload, parent_customer_id) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, parent_customer_id = excluded.parent_customer_id`).run(id, serializedPayload, optionalReference(record.parentCustomerId, 'crm_customers'));
      return;
    case 'stakeholders':
      database.prepare(`INSERT INTO crm_stakeholders (id, customer_id, payload) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET customer_id = excluded.customer_id, payload = excluded.payload`).run(id, requiredReference(record.customerId), serializedPayload);
      return;
    case 'activities':
      database.prepare(`INSERT INTO crm_activities (id, customer_id, payload) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET customer_id = excluded.customer_id, payload = excluded.payload`).run(id, requiredReference(record.customerId), serializedPayload);
      return;
    case 'opportunities':
      database.prepare(`INSERT INTO crm_opportunities (id, customer_id, payload) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET customer_id = excluded.customer_id, payload = excluded.payload`).run(id, requiredReference(record.customerId), serializedPayload);
      return;
    case 'requests':
      database.prepare(`INSERT INTO crm_requests (id, customer_id, payload) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET customer_id = excluded.customer_id, payload = excluded.payload`).run(id, requiredReference(record.customerId), serializedPayload);
      return;
    case 'proposals':
      database.prepare(`INSERT INTO crm_proposals (id, customer_id, request_id, payload) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET customer_id = excluded.customer_id, request_id = excluded.request_id, payload = excluded.payload`).run(id, requiredReference(record.customerId), optionalReference(record.requestId, 'crm_requests'), serializedPayload);
      return;
    case 'orders':
      database.prepare(`INSERT INTO crm_orders (id, customer_id, request_id, proposal_id, payload) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET customer_id = excluded.customer_id, request_id = excluded.request_id, proposal_id = excluded.proposal_id, payload = excluded.payload`).run(id, requiredReference(record.customerId), optionalReference(record.requestId, 'crm_requests'), optionalReference(record.proposalId, 'crm_proposals'), serializedPayload);
      return;
    case 'contracts':
      database.prepare(`INSERT INTO crm_contracts (id, customer_id, request_id, proposal_id, order_id, payload) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET customer_id = excluded.customer_id, request_id = excluded.request_id, proposal_id = excluded.proposal_id, order_id = excluded.order_id, payload = excluded.payload`).run(id, requiredReference(record.customerId), optionalReference(record.requestId, 'crm_requests'), optionalReference(record.proposalId, 'crm_proposals'), optionalReference(record.orderId, 'crm_orders'), serializedPayload);
      return;
    case 'guaranteeLetters':
      database.prepare(`INSERT INTO crm_guarantee_letters (id, contract_id, payload) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET contract_id = excluded.contract_id, payload = excluded.payload`).run(id, requiredReference(record.contractId), serializedPayload);
      return;
    default:
      return;
  }
}

function deleteRelationalRecord(resource: ResourceName, id: string) {
  const tableByResource: Partial<Record<ResourceName, string>> = {
    customers: 'crm_customers', stakeholders: 'crm_stakeholders', activities: 'crm_activities', opportunities: 'crm_opportunities', requests: 'crm_requests',
    proposals: 'crm_proposals', orders: 'crm_orders', contracts: 'crm_contracts',
    guaranteeLetters: 'crm_guarantee_letters',
  };
  const table = tableByResource[resource];
  if (table) database.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
}

function migrateRelationalRecords() {
  const migrationOrder: ResourceName[] = ['customers', 'stakeholders', 'activities', 'opportunities', 'requests', 'proposals', 'orders', 'contracts', 'guaranteeLetters'];
  for (const resource of migrationOrder) {
    for (const record of listRecords(resource)) {
      if (typeof record.id === 'string') syncRelationalRecord(resource, record.id, record);
    }
  }
}

migrateRelationalRecords();
