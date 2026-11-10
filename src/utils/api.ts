export type ApiResource =
  | 'users'
  | 'customers'
  | 'stakeholders'
  | 'products'
  | 'activities'
  | 'opportunities'
  | 'requests'
  | 'proposals'
  | 'orders'
  | 'contracts'
  | 'guaranteeLetters';

import { AuditLogItem } from '../types';

export type BootstrapData = Record<ApiResource, unknown[]>;

export interface AuthResponse {
  token: string;
  expiresAt: string;
  user: {
    id: string;
    fullName: string;
    username?: string;
    email: string;
    duty: string;
    phone: string;
    role: string;
    companies: string[];
    status: string;
    avatar?: string;
    mustChangePassword?: boolean;
    permissions?: string[];
  };
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const storedSession = localStorage.getItem('issd_crm_authenticated_user') || sessionStorage.getItem('issd_crm_authenticated_user');
  let token = '';
  try {
    token = storedSession ? (JSON.parse(storedSession) as { token?: string }).token || '' : '';
  } catch {
    token = '';
  }
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Merge options headers
  if (options?.headers && typeof options.headers === 'object') {
    Object.assign(headers, options.headers);
  }
  
  const fetchOptions: RequestInit = {
    method: options?.method || 'GET',
    headers,
  };
  
  if (options?.body) {
    fetchOptions.body = options.body;
  }
  
  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    let message = `API isteği başarısız: ${response.status}`;
    try {
      const body = await response.json() as { error?: string };
      message = body.error || message;
    } catch {
      // Keep the HTTP status when the server does not return JSON.
    }
    throw new Error(message);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function login(identifier: string, password: string, rememberMe: boolean) {
  return request<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password, rememberMe }),
  });
}

export function requestRegistration(email: string, fullName: string) {
  return request<{ message: string }>('/api/auth/register/request', { method: 'POST', body: JSON.stringify({ email, fullName }) });
}

export function verifyRegistration(email: string, code: string, password: string) {
  return request<{ message: string; username: string }>('/api/auth/register/verify', { method: 'POST', body: JSON.stringify({ email, code, password }) });
}

export function requestPasswordReset(email: string) {
  return request<{ message: string }>('/api/auth/password-reset/request', { method: 'POST', body: JSON.stringify({ email }) });
}

export function verifyPasswordReset(email: string, code: string, password: string) {
  return request<{ message: string }>('/api/auth/password-reset/verify', { method: 'POST', body: JSON.stringify({ email, code, password }) });
}

export function getCurrentUser(token: string) {
  return request<{ user: AuthResponse['user'] }>('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function logout(token: string) {
  return request<void>('/api/auth/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function changePassword(token: string, password: string) {
  return request<{ user: AuthResponse['user'] }>('/api/auth/change-password', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ password }),
  });
}

export async function fetchBootstrap(): Promise<BootstrapData> {
  const response = await request<{ data: BootstrapData }>('/api/bootstrap');
  return response.data;
}

export async function fetchAuditLogs(limit = 500): Promise<AuditLogItem[]> {
  const response = await request<{ data: AuditLogItem[] }>(`/api/audit-logs?limit=${limit}`);
  return response.data;
}

export interface PaginatedResourceResult<T> {
  data: T[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

export async function fetchResourcePage<T>(resource: ApiResource, page = 1, pageSize = 50, search = '') {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (search.trim()) params.set('search', search.trim());
  return request<PaginatedResourceResult<T>>(`/api/${resource}?${params.toString()}`);
}

export function createRecord<T extends { id: string }>(resource: ApiResource, record: T) {
  return request<{ data: T }>(`/api/${resource}`, {
    method: 'POST',
    body: JSON.stringify(record),
  });
}

export function updateRecord<T extends { id: string }>(resource: ApiResource, id: string, record: T) {
  return request<{ data: T }>(`/api/${resource}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(record),
  });
}

export function deleteRecord(resource: ApiResource, id: string) {
  return request<void>(`/api/${resource}/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function syncProductBatch(records: Array<{ id: string }>, updateExisting: boolean) {
  return request<{ added: number; updated: number }>('/api/products/batch', {
    method: 'POST',
    body: JSON.stringify({ records, updateExisting }),
  });
}

