import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import express, { type Request, type Response } from 'express';
import { randomUUID } from 'node:crypto';
import {
  countRecords,
  deleteRecord,
  findRecord,
  listRecords,
  listRecordsPage,
  type ResourceName,
  upsertRecord,
} from './db';
import { authenticateUser, consumeAuthChallenge, createAuthChallenge, createSession, createUniqueUsername, deleteSession, findUserByEmail, getUserForToken, hashPassword, normalizeFullName, publicUser } from './auth';
import { listAuditLogs, writeAuditLog } from './audit';
import { sendMail, verificationMail } from './mailer';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });

const app = express();
const port = Number(process.env.PORT || 4000);
const resources = new Set(Object.keys({
  users: true,
  customers: true,
  stakeholders: true,
  products: true,
  activities: true,
  opportunities: true,
  requests: true,
  proposals: true,
  orders: true,
  contracts: true,
  guaranteeLetters: true,
}));

app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok', service: 'issd-crm-api', timestamp: new Date().toISOString() });
});

function companyEmail(value: unknown): value is string {
  return typeof value === 'string' && /^[^\s@]+@issd\.com\.tr$/i.test(value.trim());
}

function passwordIsValid(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 8;
}

app.post('/api/auth/register/request', async (request, response) => {
  const { email, fullName } = request.body || {};
  if (!companyEmail(email) || typeof fullName !== 'string' || fullName.trim().length < 2) {
    response.status(400).json({ error: 'Geçerli bir @issd.com.tr e-postası ve ad soyad zorunludur.' });
    return;
  }
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedFullName = normalizeFullName(fullName);
  if (findUserByEmail(normalizedEmail)) {
    response.status(409).json({ error: 'Bu e-posta ile kayıtlı bir hesap zaten var.' });
    return;
  }
  try {
    const challenge = createAuthChallenge(normalizedEmail, 'register', { fullName: normalizedFullName });
    const mail = verificationMail(challenge.code, 'register');
    await sendMail({ to: normalizedEmail, ...mail });
    response.json({ message: 'Doğrulama kodu şirket e-posta adresinize gönderildi.' });
  } catch (error) {
    response.status(503).json({ error: error instanceof Error ? error.message : 'Doğrulama e-postası gönderilemedi.' });
  }
});

app.post('/api/auth/register/verify', (request, response) => {
  const { email, code, password } = request.body || {};
  if (!companyEmail(email) || typeof code !== 'string' || !passwordIsValid(password)) {
    response.status(400).json({ error: 'E-posta, doğrulama kodu ve en az 8 karakterli parola zorunludur.' });
    return;
  }
  const payload = consumeAuthChallenge(email, 'register', code);
  if (!payload) {
    response.status(400).json({ error: 'Doğrulama kodu geçersiz, süresi dolmuş veya çok fazla denenmiş.' });
    return;
  }
  const id = `USR-${randomUUID().slice(0, 8).toUpperCase()}`;
  const fullName = normalizeFullName(String(payload.fullName));
  const username = createUniqueUsername(fullName);
  const isFirstUser = listRecords('users').length === 0;
  const user = { id, username, fullName, email: email.trim().toLowerCase(), duty: isFirstUser ? 'Sistem Yöneticisi' : 'Yeni Kullanıcı', phone: '', role: isFirstUser ? 'Admin' : 'Support', companies: ['ISSD Bilişim A.Ş.'], status: 'Aktif', passwordHash: hashPassword(password), permissions: ['dashboard.view'] };
  upsertRecord('users', id, user);
  writeAuditLog({ userId: id, action: 'register', resource: 'users', recordId: id });
  response.status(201).json({ message: 'Hesabınız oluşturuldu. Giriş yapabilirsiniz.', username });
});

app.post('/api/auth/password-reset/request', async (request, response) => {
  const { email } = request.body || {};
  if (!companyEmail(email)) {
    response.status(400).json({ error: 'Geçerli bir @issd.com.tr e-posta adresi girin.' });
    return;
  }
  const user = findUserByEmail(email.trim().toLowerCase());
  if (user) {
    try {
      const challenge = createAuthChallenge(email, 'reset-password');
      await sendMail({ to: email.trim().toLowerCase(), ...verificationMail(challenge.code, 'reset-password') });
    } catch (error) {
      response.status(503).json({ error: error instanceof Error ? error.message : 'Parola sıfırlama e-postası gönderilemedi.' });
      return;
    }
  }
  response.json({ message: 'Bu adres kayıtlıysa parola sıfırlama kodu gönderildi.' });
});

app.post('/api/auth/password-reset/verify', (request, response) => {
  const { email, code, password } = request.body || {};
  if (!companyEmail(email) || typeof code !== 'string' || !passwordIsValid(password)) {
    response.status(400).json({ error: 'E-posta, doğrulama kodu ve en az 8 karakterli parola zorunludur.' });
    return;
  }
  const user = findUserByEmail(email.trim().toLowerCase());
  const payload = consumeAuthChallenge(email, 'reset-password', code);
  if (!user || !payload) {
    response.status(400).json({ error: 'Doğrulama kodu geçersiz veya süresi dolmuş.' });
    return;
  }
  upsertRecord('users', String(user.id), { ...user, passwordHash: hashPassword(password), mustChangePassword: false });
  writeAuditLog({ userId: String(user.id), action: 'password-reset', resource: 'users', recordId: String(user.id) });
  response.json({ message: 'Parolanız güncellendi. Giriş yapabilirsiniz.' });
});

app.post('/api/auth/login', (request, response) => {
  const { identifier, email, password, rememberMe } = request.body || {};
  const loginIdentifier = typeof identifier === 'string' ? identifier : email;
  if (typeof loginIdentifier !== 'string' || typeof password !== 'string') {
    response.status(400).json({ error: 'Kullanıcı adı/e-posta ve parola zorunludur.' });
    return;
  }
  const user = authenticateUser(loginIdentifier, password);
  if (!user) {
    response.status(401).json({ error: 'E-posta veya parola hatalı.' });
    return;
  }
  const session = createSession(String(user.id), rememberMe === true);
  writeAuditLog({ userId: String(user.id), action: 'login', resource: 'auth' });
  response.json({ token: session.token, expiresAt: session.expiresAt, user: publicUser(user) });
});

app.get('/api/auth/me', (request, response) => {
  const user = getUserForToken(getBearerToken(request));
  if (!user) {
    response.status(401).json({ error: 'Oturum geçersiz veya süresi dolmuş.' });
    return;
  }
  response.json({ user: publicUser(user) });
});

app.post('/api/auth/logout', (request, response) => {
  const user = getUserForToken(getBearerToken(request));
  deleteSession(getBearerToken(request));
  if (user) writeAuditLog({ userId: String(user.id), action: 'logout', resource: 'auth' });
  response.status(204).send();
});

app.post('/api/auth/change-password', (request, response) => {
  const user = getUserForToken(getBearerToken(request));
  const { password } = request.body || {};
  if (!user) {
    response.status(401).json({ error: 'Oturum geçersiz veya süresi dolmuş.' });
    return;
  }
  if (typeof password !== 'string' || password.length < 8) {
    response.status(400).json({ error: 'Parola en az 8 karakter olmalıdır.' });
    return;
  }
  const updatedUser = { ...user, passwordHash: hashPassword(password), mustChangePassword: false };
  upsertRecord('users', String(user.id), updatedUser);
  writeAuditLog({ userId: String(user.id), action: 'change-password', resource: 'users', recordId: String(user.id) });
  response.json({ user: publicUser(updatedUser) });
});

app.use('/api', (request, response, next) => {
  if (request.path === '/health' || request.path.startsWith('/auth/')) {
    next();
    return;
  }
  const user = getUserForToken(getBearerToken(request));
  if (!user) {
    response.status(401).json({ error: 'Bu işlem için geçerli bir oturum gereklidir.' });
    return;
  }
  const permission = requiredPermission(request);
  const permissions = Array.isArray(user.permissions) ? user.permissions : [];
  const hasPermission = user.role === 'Admin' || permissions.includes(permission);
  if (!hasPermission) {
    response.status(403).json({ error: 'Bu işlem için yetkiniz bulunmuyor.' });
    return;
  }
  next();
});

app.get('/api/audit-logs', (request, response) => {
  response.json({ data: listAuditLogs(Number(request.query.limit) || 200) });
});

app.get('/api/bootstrap', (request, response) => {
  const user = getUserForToken(getBearerToken(request));
  if (!user) {
    response.status(401).json({ error: 'Bu işlem için geçerli bir oturum gereklidir.' });
    return;
  }
  const data = Object.fromEntries(
    [...resources].map((resource) => {
      const typedResource = resource as ResourceName;
      const records = canReadBootstrapResource(user, typedResource)
        ? listRecords(typedResource)
        : [];
      return [resource, sanitizeBootstrapRecords(user, typedResource, records)];
    })
  );
  response.json({ data });
});

app.post('/api/products/batch', (request, response) => {
  const records = request.body?.records;
  if (!Array.isArray(records)) {
    response.status(400).json({ error: 'records dizisi zorunludur.' });
    return;
  }

  const updateExisting = request.body?.updateExisting !== false;
  const user = getUserForToken(getBearerToken(request))!;
  let added = 0;
  let updated = 0;
  for (const record of records) {
    if (!record || typeof record.id !== 'string' || !record.id.trim()) continue;
    const id = record.id.trim();
    const existingRecord = findRecord('products', id);
    const safeRecord = preserveRestrictedProductCost('products', record, user, existingRecord);
    if (updateExisting && existingRecord) updated++;
    else added++;
    upsertRecord('products', id, safeRecord);
  }
  writeAuditLog({ userId: String(user.id), action: 'batch-upsert', resource: 'products', details: { added, updated, source: 'excel-import', totalRecords: records.length } });
  response.json({ added, updated });
});

app.get('/api/:resource', (request, response) => {
  const resource = getResource(request, response);
  if (!resource) return;
  const user = getUserForToken(getBearerToken(request))!;
  const hasPagination = request.query.page !== undefined || request.query.pageSize !== undefined || request.query.search !== undefined;
  if (hasPagination) {
    const result = listRecordsPage(resource, Number(request.query.page) || 1, Number(request.query.pageSize) || 50, String(request.query.search || ''));
    response.json({ data: sanitizeRecords(resource, result.data, user), meta: { total: result.total, page: result.page, pageSize: result.pageSize, totalPages: result.totalPages } });
    return;
  }
  response.json({ data: sanitizeRecords(resource, listRecords(resource), user) });
});

app.get('/api/:resource/:id', (request, response) => {
  const resource = getResource(request, response);
  if (!resource) return;
  const user = getUserForToken(getBearerToken(request))!;
  const record = findRecord(resource, request.params.id);
  if (!record) {
    response.status(404).json({ error: 'Kayıt bulunamadı.' });
    return;
  }
  response.json({ data: sanitizeRecord(resource, record, user) });
});

app.post('/api/:resource', (request, response) => {
  const resource = getResource(request, response);
  if (!resource) return;

  if (!request.body || typeof request.body !== 'object') {
    response.status(400).json({ error: 'Kayıt içeriği boş olamaz.' });
    return;
  }

  const user = getUserForToken(getBearerToken(request))!;
  const payload = preserveRestrictedProductCost(resource, request.body, user);
  const validation = validateResourcePayload(resource, payload);
  if (!validation.valid) {
    response.status(400).json({ error: validation.message });
    return;
  }

  const id = typeof payload.id === 'string' ? payload.id.trim() : '';
  if (!id) {
    response.status(400).json({ error: 'Kayıt id alanı zorunludur.' });
    return;
  }
  if (findRecord(resource, id)) {
    response.status(409).json({ error: 'Bu id ile kayıt zaten mevcut.' });
    return;
  }
  const recordToSave = resource === 'opportunities'
    ? withOpportunityStageHistory(payload, user)
    : payload;
  upsertRecord(resource, id, recordToSave);
  writeAuditLog({ userId: String(user.id), action: 'create', resource, recordId: id, details: { createdFields: Object.keys(request.body ?? {}), summary: request.body } });
  response.status(201).json({ data: sanitizeRecord(resource, recordToSave, user) });
});

app.put('/api/:resource/:id', (request, response) => {
  const resource = getResource(request, response);
  if (!resource) return;
  if (!request.body || typeof request.body !== 'object') {
    response.status(400).json({ error: 'Kayıt içeriği boş olamaz.' });
    return;
  }
  const existingRecord = findRecord(resource, request.params.id);
  if (!existingRecord) {
    response.status(404).json({ error: 'Kayıt bulunamadı.' });
    return;
  }

  const user = getUserForToken(getBearerToken(request))!;
  const safePayload = preserveRestrictedProductCost(resource, request.body, user, existingRecord);
  const validation = validateResourcePayload(resource, safePayload, request.params.id);
  if (!validation.valid) {
    response.status(400).json({ error: validation.message });
    return;
  }
  if (resource === 'customers' && createsHierarchyCycle(request.params.id, safePayload.parentCustomerId)) {
    response.status(400).json({ error: 'Kurum hiyerarşisinde döngü oluşturulamaz.' });
    return;
  }

  const payload = { ...safePayload, id: request.params.id };
  const recordToSave = resource === 'opportunities'
    ? withOpportunityStageHistory(payload, user, existingRecord)
    : payload;
  upsertRecord(resource, request.params.id, recordToSave);
  writeAuditLog({ userId: String(user.id), action: 'update', resource, recordId: request.params.id, details: { updatedFields: Object.keys(request.body ?? {}), previousRecord: existingRecord, newRecord: payload } });
  response.json({ data: sanitizeRecord(resource, recordToSave, user) });
});

app.delete('/api/:resource/:id', (request, response) => {
  const resource = getResource(request, response);
  if (!resource) return;
  const deletedRecord = findRecord(resource, request.params.id);
  if (!deletedRecord || !deleteRecord(resource, request.params.id)) {
    response.status(404).json({ error: 'Kayıt bulunamadı.' });
    return;
  }
  const user = getUserForToken(getBearerToken(request));
  if (user) writeAuditLog({ userId: String(user.id), action: 'delete', resource, recordId: request.params.id, details: { deletedRecord } });
  response.status(204).send();
});

function getResource(request: Request, response: Response): ResourceName | null {
  const resource = request.params.resource;
  if (!resources.has(resource)) {
    response.status(404).json({ error: 'Geçersiz kaynak.' });
    return null;
  }
  return resource as ResourceName;
}

function nonEmptyString(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateResourcePayload(resource: ResourceName, payload: Record<string, any>, idOverride?: string) {
  const idValue = idOverride ?? payload.id;
  if (idOverride === undefined && !nonEmptyString(idValue)) {
    return { valid: false, message: 'Kayıt id alanı zorunludur.' };
  }

  const requiredRules: Record<ResourceName, Array<string>> = {
    users: ['fullName', 'email', 'role'],
    customers: ['company'],
    stakeholders: ['customerId', 'fullName', 'role'],
    products: ['name', 'code'],
    activities: ['subject', 'customerId'],
    opportunities: ['opportunityNo', 'customerId', 'customerName', 'subject', 'productGroup', 'region', 'ownerName', 'expectedDecisionDate', 'stage'],
    requests: ['subject', 'customerId'],
    proposals: ['subject', 'customerId', 'customerRepresentative'],
    orders: ['subject', 'customerId', 'orderNo'],
    contracts: ['contractName', 'customerId', 'contractNo'],
    guaranteeLetters: ['letterNo', 'bank', 'beneficiary'],
  };

  const requiredFields = requiredRules[resource] ?? [];
  for (const field of requiredFields) {
    if (!nonEmptyString(payload[field])) {
      return { valid: false, message: `${field} alanı zorunludur.` };
    }
  }

  const relationRules: Partial<Record<ResourceName, Array<[string, ResourceName]>>> = {
    customers: [['parentCustomerId', 'customers']],
    activities: [['customerId', 'customers']],
    stakeholders: [['customerId', 'customers']],
    opportunities: [['customerId', 'customers']],
    requests: [['customerId', 'customers']],
    proposals: [['customerId', 'customers'], ['requestId', 'requests']],
    orders: [['customerId', 'customers'], ['requestId', 'requests'], ['proposalId', 'proposals']],
    contracts: [['customerId', 'customers'], ['requestId', 'requests'], ['proposalId', 'proposals'], ['orderId', 'orders']],
    guaranteeLetters: [['contractId', 'contracts']],
  };

  for (const [field, relatedResource] of relationRules[resource] ?? []) {
    if (payload[field] !== undefined && payload[field] !== null && payload[field] !== '' && !findRecord(relatedResource, String(payload[field]))) {
      return { valid: false, message: `${field} alanı geçerli bir ${relatedResource} kaydına işaret etmiyor.` };
    }
  }

  if (resource === 'customers' && payload.parentCustomerId && String(payload.parentCustomerId) === String(idValue)) {
    return { valid: false, message: 'Bir kurum kendisinin üst kurumu olamaz.' };
  }
  if (resource === 'stakeholders' && !['Karar Verici', 'Teknik Ekip', 'İdari / Satın Alma', 'Etkileyici', 'Kullanıcı', 'Diğer'].includes(payload.role)) {
    return { valid: false, message: 'Paydaş rolü geçersiz.' };
  }
  if (resource === 'activities' && Array.isArray(payload.stakeholderIds)) {
    for (const stakeholderId of payload.stakeholderIds) {
      const stakeholder = findRecord('stakeholders', String(stakeholderId));
      if (!stakeholder || stakeholder.customerId !== payload.customerId) {
        return { valid: false, message: 'Seçilen paydaşlar aktivitenin kurumu ile eşleşmelidir.' };
      }
    }
  }

  if (resource === 'opportunities') {
    const stages = ['Şartname Bekleniyor', 'Teklif Hazırlanıyor', 'İhaleye Girildi', 'İtiraz Sürecinde', 'Kazanıldı', 'Kaybedildi'];
    if (!stages.includes(payload.stage)) return { valid: false, message: 'Fırsat aşaması geçersiz.' };
    if (!['TRY', 'USD', 'EUR'].includes(payload.currency)) return { valid: false, message: 'Para birimi geçersiz.' };
    if (typeof payload.estimatedValue !== 'number' || !Number.isFinite(payload.estimatedValue) || payload.estimatedValue < 0) {
      return { valid: false, message: 'Tahmini bedel 0 veya daha büyük olmalıdır.' };
    }
    if (typeof payload.probability !== 'number' || !Number.isFinite(payload.probability) || payload.probability < 0 || payload.probability > 100) {
      return { valid: false, message: 'Kazanma olasılığı 0 ile 100 arasında olmalıdır.' };
    }
    if (payload.stage === 'Kaybedildi' && !nonEmptyString(payload.lossReason)) {
      return { valid: false, message: 'Kaybedilen fırsatlar için kayıp nedeni zorunludur.' };
    }
  }

  if (resource === 'users' && payload.email && typeof payload.email === 'string' && !payload.email.includes('@')) {
    return { valid: false, message: 'E-posta formatı geçersiz.' };
  }

  if (resource === 'products' && typeof payload.salePrice === 'number' && payload.salePrice < 0) {
    return { valid: false, message: 'Satış fiyatı 0 veya daha büyük olmalıdır.' };
  }

  return { valid: true, message: '' };
}

function sanitizeRecords(resource: ResourceName, records: unknown[], user: Record<string, any>) {
  return records.map((record) => sanitizeRecord(resource, record, user));
}

function canReadBootstrapResource(user: Record<string, any>, resource: ResourceName) {
  if (user.role === 'Admin') return true;
  const permissions = Array.isArray(user.permissions) ? user.permissions as string[] : [];
  if (permissions.includes(`${resource}.view`) || permissions.includes(`${resource}.manage`)) return true;

  if (resource === 'customers') {
    return permissions.some((permission) => /^(activities|opportunities|stakeholders|requests|proposals|orders|contracts|guaranteeLetters)\.(view|create|edit|delete)$/.test(permission));
  }
  if (resource === 'stakeholders') {
    return permissions.some((permission) => /^(activities|stakeholders)\.(view|create|edit|delete)$/.test(permission));
  }
  if (resource === 'products') {
    return permissions.some((permission) => /^(proposals|orders)\.(view|create)$/.test(permission));
  }
  return false;
}

function sanitizeBootstrapRecords(user: Record<string, any>, resource: ResourceName, records: unknown[]) {
  const isAdmin = user.role === 'Admin';
  return records.map((record) => {
    if (!record || typeof record !== 'object') return record;
    const value = record as Record<string, unknown>;
    if (resource === 'customers' && !isAdmin && !user.permissions?.includes('customers.manage')) {
      return {
        id: value.id,
        type: value.type,
        name: '',
        company: value.company,
        email: '',
        phone: '',
        address: '',
        reference: value.reference,
        parentCustomerId: value.parentCustomerId,
        createdAt: value.createdAt,
      };
    }
    if (resource === 'stakeholders' && !user.permissions?.includes('stakeholders.view') && user.role !== 'Admin') {
      const { email: _email, phone: _phone, notes: _notes, ...directoryEntry } = value;
      return directoryEntry;
    }
    return sanitizeRecord(resource, value, user);
  });
}

function sanitizeRecord(resource: ResourceName, record: any, user?: Record<string, any>) {
  if (!record) return record;
  let sanitizedRecord = record;
  if (resource === 'products' && !canViewProductCosts(user)) {
    const { costPrice: _costPrice, ...publicProduct } = sanitizedRecord;
    sanitizedRecord = publicProduct;
  }
  if (resource !== 'users') return sanitizedRecord;
  const { passwordHash: _passwordHash, ...publicRecord } = sanitizedRecord;
  return publicRecord;
}

function canViewProductCosts(user?: Record<string, any>) {
  return user?.role === 'Admin' || user?.permissions?.includes('products.cost.view') === true;
}

function preserveRestrictedProductCost(resource: ResourceName, payload: Record<string, any>, user: Record<string, any>, existingRecord?: Record<string, any> | null) {
  if (resource !== 'products' || canViewProductCosts(user)) return payload;
  return { ...payload, costPrice: existingRecord?.costPrice ?? 0 };
}

function withOpportunityStageHistory(payload: Record<string, any>, user: Record<string, any>, existingRecord?: Record<string, any> | null) {
  const { stageChangeReason, stageHistory: _submittedHistory, ...record } = payload;
  const changedAt = new Date().toISOString();
  const changedBy = typeof user.fullName === 'string' ? user.fullName : String(user.id);
  if (!existingRecord) {
    return { ...record, stageHistory: [{ toStage: record.stage, changedAt, changedBy }] };
  }
  const stageHistory = Array.isArray(existingRecord.stageHistory) ? existingRecord.stageHistory : [];
  if (existingRecord.stage === record.stage) return { ...record, stageHistory };
  return {
    ...record,
    stageHistory: [...stageHistory, {
      fromStage: existingRecord.stage,
      toStage: record.stage,
      changedAt,
      changedBy,
      ...(typeof stageChangeReason === 'string' && stageChangeReason.trim() ? { note: stageChangeReason.trim() } : {}),
    }],
  };
}

function createsHierarchyCycle(customerId: string, parentCustomerId: unknown) {
  let parentId = typeof parentCustomerId === 'string' ? parentCustomerId : '';
  const visited = new Set<string>([customerId]);
  while (parentId) {
    if (visited.has(parentId)) return true;
    visited.add(parentId);
    const parent = findRecord('customers', parentId);
    if (!parent || typeof parent.parentCustomerId !== 'string') return false;
    parentId = parent.parentCustomerId;
  }
  return false;
}

function requiredPermission(request: Request) {
  if (request.path === '/reset') return 'users.manage';
  if (request.path === '/audit-logs') return 'users.manage';
  if (request.path === '/products/batch') return 'products.manage';
  if (request.path === '/bootstrap') return 'dashboard.view';

  const resource = request.path.split('/')[1] as ResourceName | undefined;
  if (!resource) return 'dashboard.view';

  if (resource === 'users') return 'users.manage';
  if (resource === 'customers') return 'customers.manage';
  if (resource === 'products') return 'products.manage';

  const action = request.method === 'GET' ? 'view' : request.method === 'POST' ? 'create' : request.method === 'PUT' ? 'edit' : 'delete';
  return `${resource}.${action}`;
}

function getBearerToken(request: Request) {
  const authorization = request.header('authorization') || '';
  return authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
}

app.listen(port, () => {
  console.log(`ISSD CRM API listening on http://localhost:${port}`);
  console.log(`Loaded resources: ${[...resources].map((resource) => `${resource}=${countRecords(resource as ResourceName)}`).join(', ')}`);
});
