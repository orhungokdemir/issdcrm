import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import { test, before, after } from 'node:test';

const port = 4300 + Math.floor(Math.random() * 500);
const baseUrl = `http://127.0.0.1:${port}`;
let databaseDirectory = '';
let serverProcess: ChildProcess | undefined;
let token = '';

async function waitForServer() {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Test API sunucusu zamanında başlamadı.');
}

async function apiRequest(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(`${baseUrl}${path}`, { ...options, headers });
}

before(async () => {
  databaseDirectory = await mkdtemp(join(tmpdir(), 'issd-crm-api-test-'));
  const tsxCli = join(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs');
  serverProcess = spawn(process.execPath, [tsxCli, 'server/index.ts'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(port), CRM_DATABASE_PATH: join(databaseDirectory, 'test.sqlite') },
    stdio: 'ignore',
  });
  await waitForServer();
});

after(async () => {
  const processToStop = serverProcess;
  if (processToStop && processToStop.exitCode === null) {
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(resolve, 2_000);
      processToStop.once('exit', () => {
        clearTimeout(timeout);
        resolve();
      });
      processToStop.kill();
    });
  }
  if (databaseDirectory) await rm(databaseDirectory, { recursive: true, force: true });
});

test('auth, protected bootstrap, workflow validation and audit logging work together', async () => {
  const invalidRegistration = await apiRequest('/api/auth/register/request', {
    method: 'POST',
    body: JSON.stringify({ email: 'personel@gmail.com', fullName: 'Geçersiz Alan' }),
  });
  assert.equal(invalidRegistration.status, 400);

  const unauthorizedBootstrap = await fetch(`${baseUrl}/api/bootstrap`);
  assert.equal(unauthorizedBootstrap.status, 401);

  const loginResponse = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'orhun.gokdemir@issd.com.tr', password: 'admin123' }),
  });
  assert.equal(loginResponse.status, 200);
  const loginBody = await loginResponse.json() as { token: string };
  token = loginBody.token;
  assert.ok(token);

  const bootstrapResponse = await apiRequest('/api/bootstrap');
  assert.equal(bootstrapResponse.status, 200);
  const bootstrapBody = await bootstrapResponse.json() as { data: Record<string, unknown[]> };
  assert.ok(Array.isArray(bootstrapBody.data.customers));
  assert.ok(Array.isArray(bootstrapBody.data.proposals));

  const invalidRelationResponse = await apiRequest('/api/proposals', {
    method: 'POST',
    body: JSON.stringify({
      id: 'PROP-TEST-INVALID',
      subject: 'Geçersiz ilişki testi',
      customerId: 'CST-001',
      customerRepresentative: 'Test',
      requestId: 'REQ-NOT-FOUND',
    }),
  });
  assert.equal(invalidRelationResponse.status, 400);

  const childCustomer = {
    id: 'CST-TEST-CHILD',
    type: 'Belediye',
    name: '',
    company: 'ABB Ulaşım Dairesi',
    email: '',
    phone: '',
    address: '',
    reference: '',
    parentCustomerId: 'CST-001',
    createdAt: '2026-09-29',
  };
  const childCustomerResponse = await apiRequest('/api/customers', { method: 'POST', body: JSON.stringify(childCustomer) });
  assert.equal(childCustomerResponse.status, 201);

  const hierarchyCycleResponse = await apiRequest('/api/customers/CST-001', {
    method: 'PUT',
    body: JSON.stringify({ id: 'CST-001', company: 'Ankara Büyükşehir Belediyesi', parentCustomerId: 'CST-TEST-CHILD' }),
  });
  assert.equal(hierarchyCycleResponse.status, 400);

  const stakeholderResponse = await apiRequest('/api/stakeholders', {
    method: 'POST',
    body: JSON.stringify({
      id: 'STK-TEST-API', customerId: 'CST-001', customerName: 'Ankara Büyükşehir Belediyesi',
      fullName: 'Test Teknik Paydaş', title: 'Mühendis', department: 'Ulaşım Dairesi',
      role: 'Teknik Ekip', email: 'paydas@example.com', phone: '+90 312 000 00 00', status: 'Aktif',
      createdAt: '2026-09-29',
    }),
  });
  assert.equal(stakeholderResponse.status, 201);

  const invalidActivityStakeholderResponse = await apiRequest('/api/activities', {
    method: 'POST',
    body: JSON.stringify({ id: 'ACT-INVALID-STAKEHOLDER', customerId: 'CST-001', stakeholderIds: ['STK-NOT-RELATED'], subject: 'Yanlış kurum kontak testi' }),
  });
  assert.equal(invalidActivityStakeholderResponse.status, 400);

  const linkedActivityResponse = await apiRequest('/api/activities', {
    method: 'POST',
    body: JSON.stringify({ id: 'ACT-STAKEHOLDER-LINK', customerId: 'CST-001', stakeholderIds: ['STK-TEST-API'], subject: 'Paydaş bağlantı testi' }),
  });
  assert.equal(linkedActivityResponse.status, 201);

  const requestPayload = {
    id: 'REQ-TEST-API',
    requestNo: 'TLP-TEST-001',
    customerId: 'CST-001',
    customerName: 'Test Müşteri',
    subject: 'API test talebi',
    creator: 'Test',
    createdAt: '2026-09-08',
    assignees: [],
    priority: 'Orta',
    status: 'Yeni',
  };
  const createResponse = await apiRequest('/api/requests', { method: 'POST', body: JSON.stringify(requestPayload) });
  assert.equal(createResponse.status, 201);

  const opportunityPayload = {
    id: 'OPP-TEST-API',
    opportunityNo: 'FST-2026-0001',
    customerId: 'CST-001',
    customerName: 'Test Kurum',
    subject: 'Akıllı kavşak sinyalizasyon ihalesi',
    tenderNo: '2026/123456',
    tenderDate: '2026-10-15',
    productGroup: 'Akıllı Kavşak',
    region: 'Ankara',
    estimatedValue: 12500000,
    currency: 'TRY',
    probability: 45,
    expectedDecisionDate: '2026-12-01',
    stage: 'Şartname Bekleniyor',
    ownerName: 'Test Satış',
    competitors: ['Rakip A'],
    stageHistory: [{ toStage: 'Kaybedildi', changedAt: '2020-01-01', changedBy: 'Sahte' }],
  };
  const createOpportunityResponse = await apiRequest('/api/opportunities', { method: 'POST', body: JSON.stringify(opportunityPayload) });
  assert.equal(createOpportunityResponse.status, 201);
  const createdOpportunityBody = await createOpportunityResponse.json() as { data: { stageHistory: Array<{ toStage: string; changedBy: string }> } };
  assert.equal(createdOpportunityBody.data.stageHistory.length, 1);
  assert.equal(createdOpportunityBody.data.stageHistory[0].toStage, 'Şartname Bekleniyor');
  assert.notEqual(createdOpportunityBody.data.stageHistory[0].changedBy, 'Sahte');

  const updateOpportunityResponse = await apiRequest('/api/opportunities/OPP-TEST-API', {
    method: 'PUT',
    body: JSON.stringify({ ...opportunityPayload, stage: 'Teklif Hazırlanıyor', stageChangeReason: 'Şartname yayımlandı' }),
  });
  assert.equal(updateOpportunityResponse.status, 200);
  const updatedOpportunityBody = await updateOpportunityResponse.json() as { data: { stageHistory: Array<{ fromStage?: string; toStage: string; note?: string }> } };
  assert.equal(updatedOpportunityBody.data.stageHistory.length, 2);
  assert.equal(updatedOpportunityBody.data.stageHistory[1].fromStage, 'Şartname Bekleniyor');
  assert.equal(updatedOpportunityBody.data.stageHistory[1].toStage, 'Teklif Hazırlanıyor');
  assert.equal(updatedOpportunityBody.data.stageHistory[1].note, 'Şartname yayımlandı');

  const pagedResponse = await apiRequest('/api/requests?page=1&pageSize=1&search=API');
  assert.equal(pagedResponse.status, 200);
  const pagedBody = await pagedResponse.json() as { data: Array<{ id: string }>; meta: { total: number; page: number; pageSize: number; totalPages: number } };
  assert.equal(pagedBody.data.length, 1);
  assert.equal(pagedBody.data[0].id, 'REQ-TEST-API');
  assert.equal(pagedBody.meta.total, 1);
  assert.equal(pagedBody.meta.pageSize, 1);
  assert.equal(pagedBody.meta.totalPages, 1);

  const updateResponse = await apiRequest('/api/requests/REQ-TEST-API', {
    method: 'PUT',
    body: JSON.stringify({ ...requestPayload, subject: 'Güncellenmiş API test talebi' }),
  });
  assert.equal(updateResponse.status, 200);

  const deleteResponse = await apiRequest('/api/requests/REQ-TEST-API', { method: 'DELETE' });
  assert.equal(deleteResponse.status, 204);

  const auditResponse = await apiRequest('/api/audit-logs?limit=100');
  assert.equal(auditResponse.status, 200);
  const auditBody = await auditResponse.json() as { data: Array<{ action: string; resource: string }> };
  assert.ok(auditBody.data.some((entry) => entry.action === 'create' && entry.resource === 'requests'));
  assert.ok(auditBody.data.some((entry) => entry.action === 'update' && entry.resource === 'requests'));
  assert.ok(auditBody.data.some((entry) => entry.action === 'delete' && entry.resource === 'requests'));

  const adminProductsResponse = await apiRequest('/api/products');
  const adminProductsBody = await adminProductsResponse.json() as { data: Array<Record<string, unknown>> };
  const protectedProduct = adminProductsBody.data[0];
  const originalCostPrice = protectedProduct.costPrice;

  const supportPassword = 'support-test-123';
  const createSupportUser = await apiRequest('/api/users', {
    method: 'POST',
    body: JSON.stringify({
      id: 'USR-TEST-SUPPORT',
      fullName: 'Destek Test',
      email: 'destek.test@issd.com.tr',
      duty: 'Support',
      phone: '',
      role: 'Support',
      companies: ['ISSD Bilişim A.Ş.'],
      status: 'Aktif',
      permissions: ['dashboard.view', 'activities.view', 'requests.view', 'requests.create', 'products.manage'],
      passwordHash: createHash('sha256').update(supportPassword).digest('hex'),
    }),
  });
  assert.equal(createSupportUser.status, 201);

  const supportLoginResponse = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: 'destek.test', password: supportPassword }),
  });
  assert.equal(supportLoginResponse.status, 200);
  const supportLoginBody = await supportLoginResponse.json() as { token: string };
  token = supportLoginBody.token;

  const supportBootstrapResponse = await apiRequest('/api/bootstrap');
  assert.equal(supportBootstrapResponse.status, 200);
  const supportBootstrapBody = await supportBootstrapResponse.json() as { data: Record<string, Array<Record<string, unknown>>> };
  assert.ok(supportBootstrapBody.data.requests.length > 0);
  assert.equal(supportBootstrapBody.data.proposals.length, 0);
  assert.equal(supportBootstrapBody.data.users.length, 0);
  assert.ok(supportBootstrapBody.data.customers.length > 0);
  assert.equal('taxNumber' in supportBootstrapBody.data.customers[0], false);
  assert.equal('email' in supportBootstrapBody.data.customers[0], true);
  assert.equal(supportBootstrapBody.data.customers[0].email, '');
  assert.ok(supportBootstrapBody.data.stakeholders.length > 0);
  assert.equal(supportBootstrapBody.data.stakeholders[0].fullName, 'Test Teknik Paydaş');
  assert.equal('email' in supportBootstrapBody.data.stakeholders[0], false);
  assert.equal('phone' in supportBootstrapBody.data.stakeholders[0], false);
  const forbiddenStakeholdersResponse = await apiRequest('/api/stakeholders');
  assert.equal(forbiddenStakeholdersResponse.status, 403);
  assert.ok(supportBootstrapBody.data.products.length > 0);
  assert.equal('costPrice' in supportBootstrapBody.data.products[0], false);

  const supportProductsResponse = await apiRequest('/api/products');
  assert.equal(supportProductsResponse.status, 200);
  const supportProductsBody = await supportProductsResponse.json() as { data: Array<Record<string, unknown>> };
  assert.equal('costPrice' in supportProductsBody.data[0], false);

  const alteredProduct = await apiRequest(`/api/products/${protectedProduct.id}`, {
    method: 'PUT',
    body: JSON.stringify({ ...protectedProduct, costPrice: 1 }),
  });
  assert.equal(alteredProduct.status, 200);

  const forbiddenProposalsResponse = await apiRequest('/api/proposals');
  assert.equal(forbiddenProposalsResponse.status, 403);

  token = loginBody.token;
  const verifyProductResponse = await apiRequest(`/api/products/${protectedProduct.id}`);
  const verifyProductBody = await verifyProductResponse.json() as { data: Record<string, unknown> };
  assert.equal(verifyProductBody.data.costPrice, originalCostPrice);
});
