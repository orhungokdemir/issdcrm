import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  UserItem,
  CustomerItem,
  StakeholderItem,
  ProductItem,
  ActivityItem,
  OpportunityItem,
  OpportunityStage,
  RequestItem,
  ProposalItem,
  OrderItem,
  ContractItem,
  GuaranteeLetterItem,
  NavigationModule,
  UserPermission,
  AuditLogItem,
} from '../types';
import { generateNextProductId } from '../utils/productUtils';
import { generateTemporaryPassword, hashPassword } from '../utils/authUtils';
import {
  createRecord,
  deleteRecord as deleteApiRecord,
  fetchBootstrap,
  fetchAuditLogs,
  getCurrentUser as apiGetCurrentUser,
  changePassword as apiChangePassword,
  login as apiLogin,
  logout as apiLogout,
  syncProductBatch,
  updateRecord,
} from '../utils/api';

interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message?: string;
}

interface CrmContextType {
  // Navigation & User
  currentModule: NavigationModule;
  setCurrentModule: (mod: NavigationModule) => void;
  currentUser: UserItem;
  setCurrentUser: (user: UserItem) => void;
  sessionToken: string | null;
  rememberSession: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshCurrentUser: () => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  activeCompany: string;
  setActiveCompany: (company: string) => void;

  // Data Collections
  users: UserItem[];
  customers: CustomerItem[];
  stakeholders: StakeholderItem[];
  products: ProductItem[];
  activities: ActivityItem[];
  opportunities: OpportunityItem[];
  requests: RequestItem[];
  proposals: ProposalItem[];
  orders: OrderItem[];
  contracts: ContractItem[];
  guaranteeLetters: GuaranteeLetterItem[];
  auditLogs: AuditLogItem[];
  refreshAuditLogs: () => Promise<void>;
  getCustomerLinkedRecords: (customerId: string) => {
    requests: RequestItem[];
    proposals: ProposalItem[];
    orders: OrderItem[];
    contracts: ContractItem[];
    guaranteeLetters: GuaranteeLetterItem[];
  };
  getRequestWorkflowChain: (requestId: string) => {
    request?: RequestItem;
    proposals: ProposalItem[];
    orders: OrderItem[];
    contracts: ContractItem[];
    guaranteeLetters: GuaranteeLetterItem[];
  };
  getWorkflowSummary: (currency?: 'TRY' | 'USD' | 'EUR', customerId?: string, year?: number) => {
    requestCount: number;
    proposalCount: number;
    orderCount: number;
    contractCount: number;
    guaranteeLetterCount: number;
    proposalValue: number;
    orderValue: number;
    proposalToOrderRate: number;
    orderToContractRate: number;
  };

  // CRUD Operations - Users
  addUser: (item: Omit<UserItem, 'id'>) => Promise<void>;
  updateUser: (id: string, item: Partial<UserItem>) => void;
  deleteUser: (id: string) => void;
  changeUserPassword: (id: string, password: string) => Promise<void>;

  // CRUD Operations - Customers
  addCustomer: (item: Omit<CustomerItem, 'id'>) => void;
  updateCustomer: (id: string, item: Partial<CustomerItem>) => void;
  deleteCustomer: (id: string) => void;

  // CRUD Operations - Stakeholders
  addStakeholder: (item: Omit<StakeholderItem, 'id'>) => void;
  updateStakeholder: (id: string, item: Partial<StakeholderItem>) => void;
  deleteStakeholder: (id: string) => void;

  // CRUD Operations - Products
  addProduct: (item: Omit<ProductItem, 'id'>) => void;
  addProductsBatch: (items: (Omit<ProductItem, 'id'> & { id?: string })[], updateExistingByCode?: boolean) => { added: number; updated: number };
  updateProduct: (id: string, item: Partial<ProductItem>) => void;
  deleteProduct: (id: string) => void;

  // CRUD Operations - Activities
  addActivity: (item: Omit<ActivityItem, 'id'>) => void;
  updateActivity: (id: string, item: Partial<ActivityItem>) => void;
  deleteActivity: (id: string) => void;

  // CRUD Operations - Requests
  addOpportunity: (item: Omit<OpportunityItem, 'id' | 'opportunityNo' | 'stageHistory'>) => void;
  updateOpportunity: (id: string, item: Partial<OpportunityItem> & { stageChangeReason?: string }) => void;
  deleteOpportunity: (id: string) => void;

  // CRUD Operations - Requests
  addRequest: (item: Omit<RequestItem, 'id' | 'requestNo'>) => void;
  updateRequest: (id: string, item: Partial<RequestItem>) => void;
  deleteRequest: (id: string) => void;

  // CRUD Operations - Proposals
  addProposal: (item: Omit<ProposalItem, 'id' | 'proposalNo'>) => void;
  updateProposal: (id: string, item: Partial<ProposalItem>) => void;
  deleteProposal: (id: string) => void;

  // CRUD Operations - Orders
  addOrder: (item: Omit<OrderItem, 'id' | 'orderNo'>) => void;
  updateOrder: (id: string, item: Partial<OrderItem>) => void;
  deleteOrder: (id: string) => void;

  // CRUD Operations - Contracts
  addContract: (item: Omit<ContractItem, 'id' | 'contractNo'>) => void;
  updateContract: (id: string, item: Partial<ContractItem>) => void;
  deleteContract: (id: string) => void;
  addGuaranteeLetter: (item: Omit<GuaranteeLetterItem, 'id' | 'letterNo'>) => void;
  updateGuaranteeLetter: (id: string, item: Partial<GuaranteeLetterItem>) => void;
  deleteGuaranteeLetter: (id: string) => void;

  // UI Utilities
  toasts: ToastMessage[];
  addToast: (type: 'success' | 'info' | 'warning' | 'error', title: string, message?: string) => void;
  removeToast: (id: string) => void;
  formatMoney: (amount: number, currency?: string) => string;
  hasPermission: (permission: UserPermission) => boolean;
}

const CrmContext = createContext<CrmContextType | undefined>(undefined);

const navigationModules: NavigationModule[] = [
  'dashboard', 'activities', 'opportunities', 'requests', 'proposals', 'orders', 'contracts',
  'activity-reports', 'proposal-reports', 'users', 'customers', 'stakeholders', 'products', 'guarantees',
];

function getModuleFromPath(): NavigationModule {
  if (typeof window === 'undefined') return 'dashboard';
  const modulePath = window.location.pathname.replace(/^\/+|\/+$/g, '') || 'dashboard';
  return navigationModules.includes(modulePath as NavigationModule)
    ? modulePath as NavigationModule
    : 'dashboard';
}

function readStoredAuth() {
  if (typeof window === 'undefined') {
    return { token: null as string | null, user: null as UserItem | null, rememberSession: false };
  }

  try {
    const stored = localStorage.getItem('issd_crm_authenticated_user') || sessionStorage.getItem('issd_crm_authenticated_user');
    if (!stored) {
      return { token: null as string | null, user: null as UserItem | null, rememberSession: Boolean(localStorage.getItem('issd_crm_authenticated_user')) };
    }

    const parsed = JSON.parse(stored) as { token?: string; user?: UserItem };
    return {
      token: parsed.token || null,
      user: parsed.user || null,
      rememberSession: Boolean(localStorage.getItem('issd_crm_authenticated_user')),
    };
  } catch {
    localStorage.removeItem('issd_crm_authenticated_user');
    sessionStorage.removeItem('issd_crm_authenticated_user');
    return { token: null as string | null, user: null as UserItem | null, rememberSession: false };
  }
}

function persistAuthSession(token: string | null, user: UserItem | null, rememberMe: boolean) {
  if (typeof window === 'undefined') return;

  const payload = token && user ? JSON.stringify({ token, user }) : null;
  if (rememberMe && payload) {
    localStorage.setItem('issd_crm_authenticated_user', payload);
    sessionStorage.removeItem('issd_crm_authenticated_user');
  } else {
    if (payload) {
      sessionStorage.setItem('issd_crm_authenticated_user', payload);
    }
    localStorage.removeItem('issd_crm_authenticated_user');
  }

  if (!payload) {
    localStorage.removeItem('issd_crm_authenticated_user');
    sessionStorage.removeItem('issd_crm_authenticated_user');
  }
}

const EMPTY_CURRENT_USER: UserItem = {
  id: '',
  fullName: '',
  email: '',
  duty: '',
  phone: '',
  role: 'Support',
  companies: [],
  status: 'Aktif',
};

function nextDocumentNumber<T>(
  items: T[],
  field: keyof T,
  prefix: string,
  year = new Date().getFullYear()
): string {
  const pattern = new RegExp(`^${prefix}-${year}-(\\d+)$`, 'i');
  const highest = items.reduce((max, item) => {
    const match = String(item[field] || '').match(pattern);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `${prefix}-${year}-${String(highest + 1).padStart(4, '0')}`;
}

export const CrmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentModule, setCurrentModule] = useState<NavigationModule>(getModuleFromPath);
  const [activeCompany, setActiveCompany] = useState<string>('ISSD Bilişim A.Ş.');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const initialAuth = readStoredAuth();
  const [rememberSession, setRememberSession] = useState<boolean>(initialAuth.rememberSession);
  const [sessionToken, setSessionToken] = useState<string | null>(initialAuth.token);

  const [users, setUsers] = useState<UserItem[]>([]);
  const [currentUser, setCurrentUser] = useState<UserItem>(() => initialAuth.user || EMPTY_CURRENT_USER);
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [stakeholders, setStakeholders] = useState<StakeholderItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityItem[]>([]);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [proposals, setProposals] = useState<ProposalItem[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [contracts, setContracts] = useState<ContractItem[]>([]);
  const [guaranteeLetters, setGuaranteeLetters] = useState<GuaranteeLetterItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);

  const applyBootstrapData = (data: Record<string, unknown[]>) => {
    setUsers((data.users as UserItem[] | undefined) ?? []);
    setCustomers((data.customers as CustomerItem[] | undefined) ?? []);
    setStakeholders((data.stakeholders as StakeholderItem[] | undefined) ?? []);
    setProducts((data.products as ProductItem[] | undefined) ?? []);
    setActivities((data.activities as ActivityItem[] | undefined) ?? []);
    setOpportunities((data.opportunities as OpportunityItem[] | undefined) ?? []);
    setRequests((data.requests as RequestItem[] | undefined) ?? []);
    setProposals((data.proposals as ProposalItem[] | undefined) ?? []);
    setOrders((data.orders as OrderItem[] | undefined) ?? []);
    setContracts((data.contracts as ContractItem[] | undefined) ?? []);
    setGuaranteeLetters((data.guaranteeLetters as GuaranteeLetterItem[] | undefined) ?? []);
  };

  const refreshFromApi = async () => {
    try {
      const data = await fetchBootstrap();
      applyBootstrapData(data as Record<string, unknown[]>);
    } catch {
      applyBootstrapData({
        users: [],
        customers: [],
        stakeholders: [],
        products: [],
        activities: [],
        opportunities: [],
        requests: [],
        proposals: [],
        orders: [],
        contracts: [],
        guaranteeLetters: [],
      });
    }
  };

  const refreshAuditLogs = async () => {
    try {
      setAuditLogs(await fetchAuditLogs());
    } catch {
      setAuditLogs([]);
    }
  };

  useEffect(() => {
    const handleAuthenticated = () => {
      void refreshFromApi();
      void refreshAuditLogs();
    };

    void refreshFromApi();
    if (initialAuth.token) void refreshAuditLogs();
    window.addEventListener('crm-authenticated', handleAuthenticated);

    return () => {
      window.removeEventListener('crm-authenticated', handleAuthenticated);
    };
  }, []);

  // Toast Helper
  const addToast = (type: 'success' | 'info' | 'warning' | 'error', title: string, message?: string) => {
    const id = 'toast_' + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const syncWithApi = (operation: Promise<unknown>) => {
    void operation.catch((error: unknown) => {
      console.error('CRM API senkronizasyonu başarısız', error);
    });
  };

  const formatMoney = (amount: number, currency: string = 'TRY') => {
    const formatted = new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount || 0);

    if (currency === 'USD') return `$${formatted}`;
    if (currency === 'EUR') return `€${formatted}`;
    return `${formatted} ₺`;
  };

  const hasPermission = (permission: UserPermission) =>
    currentUser.role === 'Admin' || Boolean(currentUser.permissions?.includes(permission));

  const getCustomerLinkedRecords = (customerId: string) => ({
    requests: requests.filter((request) => request.customerId === customerId),
    proposals: proposals.filter((proposal) => proposal.customerId === customerId),
    orders: orders.filter((order) => order.customerId === customerId),
    contracts: contracts.filter((contract) => contract.customerId === customerId),
    guaranteeLetters: guaranteeLetters.filter((letter) => letter.beneficiary === customers.find((customer) => customer.id === customerId)?.company || letter.contractId === contracts.find((contract) => contract.customerId === customerId)?.id),
  });

  const getRequestWorkflowChain = (requestId: string) => {
    const request = requests.find((entry) => entry.id === requestId);
    if (!request) {
      return {
        request: undefined,
        proposals: [],
        orders: [],
        contracts: [],
        guaranteeLetters: [],
      };
    }

    const projectCode = request.projectCode?.trim();
    const relatedProposals = proposals.filter((proposal) => proposal.requestId === request.id || (proposal.customerId === request.customerId && (!projectCode || proposal.projectCode === projectCode || proposal.subject.includes(request.subject))));
    const proposalIds = new Set(relatedProposals.map((proposal) => proposal.id));
    const relatedOrders = orders.filter((order) => order.requestId === request.id || (order.proposalId && proposalIds.has(order.proposalId)) || (order.customerId === request.customerId && (!projectCode || order.projectCode === projectCode || order.subject.includes(request.subject))));
    const orderIds = new Set(relatedOrders.map((order) => order.id));
    const relatedContracts = contracts.filter((contract) => contract.requestId === request.id || (contract.orderId && orderIds.has(contract.orderId)) || (contract.proposalId && proposalIds.has(contract.proposalId)) || (contract.customerId === request.customerId && (!projectCode || contract.projectCode === projectCode)));
    const relatedGuarantees = guaranteeLetters.filter((letter) => relatedContracts.some((contract) => contract.id === letter.contractId) || (!projectCode || letter.contractNo.includes(projectCode)));

    return {
      request,
      proposals: relatedProposals,
      orders: relatedOrders,
      contracts: relatedContracts,
      guaranteeLetters: relatedGuarantees,
    };
  };

  const getWorkflowSummary = (currency?: 'TRY' | 'USD' | 'EUR', customerId?: string, year?: number) => {
    const linkedProposalIds = new Set<string>();
    const linkedOrderIds = new Set<string>();
    const linkedContractIds = new Set<string>();
    const linkedGuaranteeLetterIds = new Set<string>();

    const scopedRequests = requests.filter((request) => {
      const requestYear = new Date(request.createdAt).getFullYear();
      return (!customerId || request.customerId === customerId) && (!year || requestYear === year);
    });

    scopedRequests.forEach((request) => {
      const chain = getRequestWorkflowChain(request.id);
      chain.proposals.forEach((proposal) => linkedProposalIds.add(proposal.id));
      chain.orders.forEach((order) => linkedOrderIds.add(order.id));
      chain.contracts.forEach((contract) => linkedContractIds.add(contract.id));
      chain.guaranteeLetters.forEach((letter) => linkedGuaranteeLetterIds.add(letter.id));
    });

    const linkedProposals = proposals.filter((proposal) => {
      const proposalYear = new Date(proposal.createdAt).getFullYear();
      return linkedProposalIds.has(proposal.id)
        && (!currency || proposal.currency === currency)
        && (!customerId || proposal.customerId === customerId)
        && (!year || proposalYear === year);
    });
    const linkedOrders = orders.filter((order) => {
      const orderYear = new Date(order.orderDate).getFullYear();
      return linkedOrderIds.has(order.id)
        && (!currency || order.currency === currency)
        && (!customerId || order.customerId === customerId)
        && (!year || orderYear === year);
    });
    const scopedContracts = contracts.filter((contract) => {
      const contractYear = new Date(contract.startDate).getFullYear();
      return linkedContractIds.has(contract.id)
        && (!customerId || contract.customerId === customerId)
        && (!year || contractYear === year);
    });
    return {
      requestCount: scopedRequests.length,
      proposalCount: linkedProposals.length,
      orderCount: linkedOrders.length,
      contractCount: scopedContracts.length,
      guaranteeLetterCount: linkedGuaranteeLetterIds.size,
      proposalValue: linkedProposals.reduce((sum, proposal) => sum + (proposal.grandTotal || 0), 0),
      orderValue: linkedOrders.reduce((sum, order) => sum + (order.grandTotal || 0), 0),
      proposalToOrderRate: linkedProposals.length > 0 ? Math.round((linkedOrders.length / linkedProposals.length) * 100) : 0,
      orderToContractRate: linkedOrders.length > 0 ? Math.round((linkedContractIds.size / linkedOrders.length) * 100) : 0,
    };
  };

  const isAuthenticated = Boolean(sessionToken && currentUser && currentUser.id);

  const refreshCurrentUser = async () => {
    if (!sessionToken) {
      setCurrentUser(EMPTY_CURRENT_USER);
      return;
    }

    try {
      const result = await apiGetCurrentUser(sessionToken);
      const nextUser = result.user as UserItem;
      setCurrentUser(nextUser);
      persistAuthSession(sessionToken, nextUser, rememberSession);
    } catch {
      persistAuthSession(null, null, rememberSession);
      setSessionToken(null);
      setCurrentUser(EMPTY_CURRENT_USER);
    }
  };

  useEffect(() => {
    void refreshCurrentUser();
  }, [sessionToken, rememberSession]);

  const login = async (email: string, password: string, rememberMe: boolean) => {
    const result = await apiLogin(email, password, rememberMe);
    const user = result.user as UserItem;
    setCurrentUser(user);
    setSessionToken(result.token);
    setRememberSession(rememberMe);
    persistAuthSession(result.token, user, rememberMe);
    window.dispatchEvent(new CustomEvent('crm-authenticated'));
  };

  const logout = async () => {
    if (sessionToken) {
      try {
        await apiLogout(sessionToken);
      } catch {
        // ignore logout errors and clear local state
      }
    }
    persistAuthSession(null, null, rememberSession);
    setSessionToken(null);
    setRememberSession(false);
    setCurrentUser(EMPTY_CURRENT_USER);
  };

  const updatePassword = async (password: string) => {
    if (!sessionToken) throw new Error('Oturum bulunamadı.');
    const result = await apiChangePassword(sessionToken, password);
    const nextUser = { ...currentUser, ...result.user, mustChangePassword: false } as UserItem;
    setCurrentUser(nextUser);
    persistAuthSession(sessionToken, nextUser, rememberSession);
    const targetUser = users.find((user) => user.id === nextUser.id);
    if (targetUser) {
      setUsers((prev) => prev.map((user) => user.id === nextUser.id ? { ...user, ...nextUser } : user));
    }
  };

  // User Actions
  const addUser = async (item: Omit<UserItem, 'id'>) => {
    const newId = `USR-00${users.length + 1}`;
    const temporaryPassword = generateTemporaryPassword();
    const newUser: UserItem = {
      ...item,
      id: newId,
      passwordHash: await hashPassword(temporaryPassword),
      mustChangePassword: true,
    };
    setUsers((prev) => [newUser, ...prev]);
    syncWithApi(createRecord('users', newUser));
    addToast('success', 'Kullanıcı Eklendi', `${newUser.fullName} için geçici parola: ${temporaryPassword}`);
  };

  const updateUser = (id: string, item: Partial<UserItem>) => {
    const target = users.find((user) => user.id === id);
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...item } : u)));
    if (target) syncWithApi(updateRecord('users', id, { ...target, ...item, id }));
    addToast('success', 'Kullanıcı Güncellendi', 'Kullanıcı bilgileri başarıyla güncellendi.');
  };

  const changeUserPassword = async (id: string, password: string) => {
    const passwordHash = await hashPassword(password);
    setUsers((prev) => prev.map((user) => (
      user.id === id ? { ...user, passwordHash, mustChangePassword: false } : user
    )));
    const target = users.find((user) => user.id === id);
    if (target) syncWithApi(updateRecord('users', id, { ...target, passwordHash, mustChangePassword: false }));
    setCurrentUser((user) => user.id === id ? { ...user, passwordHash, mustChangePassword: false } : user);
    if (currentUser.id === id) {
      persistAuthSession(sessionToken, { ...currentUser, passwordHash, mustChangePassword: false }, rememberSession);
    }
  };

  const deleteUser = (id: string) => {
    const target = users.find((u) => u.id === id);
    setUsers((prev) => prev.filter((u) => u.id !== id));
    if (currentUser.id === id) {
      setCurrentUser(users.find((u) => u.id !== id) || EMPTY_CURRENT_USER);
    }
    syncWithApi(deleteApiRecord('users', id));
    addToast('info', 'Kullanıcı Silindi', `${target?.fullName || id} sistemden kaldırıldı.`);
  };

  // Customer Actions
  const addCustomer = (item: Omit<CustomerItem, 'id'>) => {
    const newId = `CST-${String(customers.reduce((max, customer) => Math.max(max, Number(customer.id.replace(/^CST-/, '')) || 0), 0) + 1).padStart(3, '0')}`;
    const newCust: CustomerItem = { ...item, id: newId };
    setCustomers((prev) => [newCust, ...prev]);
    syncWithApi(createRecord('customers', newCust));
    addToast('success', 'Müşteri Eklendi', `${newCust.company} başarıyla eklendi.`);
  };

  const updateCustomer = (id: string, item: Partial<CustomerItem>) => {
    const target = customers.find((customer) => customer.id === id);
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, ...item } : c)));
    if (target) syncWithApi(updateRecord('customers', id, { ...target, ...item, id }));
    addToast('success', 'Müşteri Güncellendi', 'Müşteri kartı başarıyla güncellendi.');
  };

  const deleteCustomer = (id: string) => {
    const target = customers.find((c) => c.id === id);
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    syncWithApi(deleteApiRecord('customers', id));
    addToast('info', 'Müşteri Silindi', `${target?.company || id} kaydı silindi.`);
  };

  const addStakeholder = (item: Omit<StakeholderItem, 'id'>) => {
    const customer = customers.find((entry) => entry.id === item.customerId);
    const newStakeholder: StakeholderItem = {
      ...item,
      customerName: customer?.company || item.customerName,
      id: `STK-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    setStakeholders((previous) => [newStakeholder, ...previous]);
    syncWithApi(createRecord('stakeholders', newStakeholder));
    addToast('success', 'Paydaş eklendi', `${newStakeholder.fullName} kurum ilişkilerine eklendi.`);
  };

  const updateStakeholder = (id: string, item: Partial<StakeholderItem>) => {
    const target = stakeholders.find((stakeholder) => stakeholder.id === id);
    if (!target) return;
    const nextStakeholder = { ...target, ...item, id };
    const customer = customers.find((entry) => entry.id === nextStakeholder.customerId);
    if (customer) nextStakeholder.customerName = customer.company;
    setStakeholders((previous) => previous.map((stakeholder) => stakeholder.id === id ? nextStakeholder : stakeholder));
    syncWithApi(updateRecord('stakeholders', id, nextStakeholder));
    addToast('success', 'Paydaş güncellendi', `${nextStakeholder.fullName} bilgileri kaydedildi.`);
  };

  const deleteStakeholder = (id: string) => {
    const target = stakeholders.find((stakeholder) => stakeholder.id === id);
    setStakeholders((previous) => previous.filter((stakeholder) => stakeholder.id !== id));
    syncWithApi(deleteApiRecord('stakeholders', id));
    addToast('info', 'Paydaş silindi', `${target?.fullName || id} kurum ilişkilerinden kaldırıldı.`);
  };

  // Product Actions
  const addProduct = (item: Omit<ProductItem, 'id'>) => {
    // Generate KLM-[CategoryNo][Sequence] ID based on category and current products
    const generatedId = (item.code && item.code.startsWith('KLM-')) 
      ? item.code 
      : generateNextProductId(item.category, products);

    const newProd: ProductItem = {
      ...item,
      id: generatedId,
      code: generatedId,
    };
    setProducts((prev) => [newProd, ...prev]);
    syncWithApi(createRecord('products', newProd));
    addToast('success', 'Ürün / Hizmet Eklendi', `${newProd.id} - ${newProd.name} kataloğa eklendi.`);
  };

  const addProductsBatch = (
    items: (Omit<ProductItem, 'id'> & { id?: string })[],
    updateExistingByCode: boolean = true
  ) => {
    let addedCount = 0;
    let updatedCount = 0;
    const synchronizedProducts: ProductItem[] = [];

    setProducts((prev) => {
      const currentList = [...prev];
      const updatedList = [...currentList];

      items.forEach((item) => {
        const itemIdentifier = (item.id || item.code || '').trim().toUpperCase();
        
        // Check if an existing product with this ID or Code exists
        const existingIndex = updateExistingByCode && itemIdentifier
          ? updatedList.findIndex((p) => {
              const pId = (p.id || '').trim().toUpperCase();
              const pCode = (p.code || '').trim().toUpperCase();
              return pId === itemIdentifier || pCode === itemIdentifier;
            })
          : -1;

        if (existingIndex >= 0) {
          // Update existing product
          updatedList[existingIndex] = {
            ...updatedList[existingIndex],
            ...item,
            id: updatedList[existingIndex].id, // maintain primary ID
            code: updatedList[existingIndex].code || updatedList[existingIndex].id,
          };
          synchronizedProducts.push(updatedList[existingIndex]);
          updatedCount++;
        } else {
          // Compute category-based KLM ID dynamically from updatedList
          const finalId = (item.id && item.id.toUpperCase().startsWith('KLM-'))
            ? item.id.toUpperCase()
            : (item.code && item.code.toUpperCase().startsWith('KLM-'))
            ? item.code.toUpperCase()
            : generateNextProductId(item.category || 'Donanım', updatedList);

          const newProduct: ProductItem = {
            id: finalId,
            code: finalId,
            company: item.company || activeCompany,
            name: item.name,
            brand: item.brand || 'ISSD',
            model: item.model || '',
            costPrice: Number(item.costPrice) || 0,
            salePrice: Number(item.salePrice) || 0,
            unit: item.unit || 'Adet',
            description: item.description || '',
            category: item.category || 'Donanım',
            stock: item.stock !== undefined ? Number(item.stock) : 0,
          };
          updatedList.unshift(newProduct);
          synchronizedProducts.push(newProduct);
          addedCount++;
        }
      });

      return updatedList;
    });

    syncWithApi(syncProductBatch(synchronizedProducts, updateExistingByCode));

    if (addedCount > 0 && updatedCount > 0) {
      addToast(
        'success',
        'Toplu Excel Yüklemesi Tamamlandı',
        `${addedCount} yeni ürün KLM kodlarıyla eklendi, ${updatedCount} mevcut ürün güncellendi.`
      );
    } else if (addedCount > 0) {
      addToast(
        'success',
        'Excel Ürünleri Eklendi',
        `${addedCount} adet ürün KLM kodlarıyla başarıyla kataloğa aktarıldı.`
      );
    } else if (updatedCount > 0) {
      addToast(
        'info',
        'Ürünler Güncellendi',
        `${updatedCount} adet mevcut ürün Excel verisiyle güncellendi.`
      );
    }

    return { added: addedCount, updated: updatedCount };
  };

  const updateProduct = (id: string, item: Partial<ProductItem>) => {
    const target = products.find((product) => product.id === id);
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...item } : p)));
    if (target) syncWithApi(updateRecord('products', id, { ...target, ...item, id }));
    addToast('success', 'Ürün Güncellendi', 'Ürün / Hizmet bilgisi güncellendi.');
  };

  const deleteProduct = (id: string) => {
    const target = products.find((p) => p.id === id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
    syncWithApi(deleteApiRecord('products', id));
    addToast('info', 'Ürün Silindi', `${target?.name || id} katalogdan kaldırıldı.`);
  };

  // Activity Actions
  const addActivity = (item: Omit<ActivityItem, 'id'>) => {
    const newId = `ACT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newAct: ActivityItem = { ...item, id: newId };
    setActivities((prev) => [newAct, ...prev]);
    syncWithApi(createRecord('activities', newAct));
    addToast('success', 'Aktivite Kaydedildi', `${newAct.subject} takvime eklendi.`);
  };

  const updateActivity = (id: string, item: Partial<ActivityItem>) => {
    const target = activities.find((activity) => activity.id === id);
    setActivities((prev) => prev.map((a) => (a.id === id ? { ...a, ...item } : a)));
    if (target) syncWithApi(updateRecord('activities', id, { ...target, ...item, id }));
    addToast('success', 'Aktivite Güncellendi', 'Aktivite bilgileri kaydedildi.');
  };

  const deleteActivity = (id: string) => {
    const target = activities.find((a) => a.id === id);
    setActivities((prev) => prev.filter((a) => a.id !== id));
    syncWithApi(deleteApiRecord('activities', id));
    addToast('info', 'Aktivite Silindi', `${target?.subject || id} aktivitesi silindi.`);
  };

  const addOpportunity = (item: Omit<OpportunityItem, 'id' | 'opportunityNo' | 'stageHistory'>) => {
    const newOpportunity: OpportunityItem = {
      ...item,
      id: `OPP-${Date.now()}`,
      opportunityNo: nextDocumentNumber(opportunities, 'opportunityNo', 'FST'),
      stageHistory: [{ toStage: item.stage, changedAt: new Date().toISOString(), changedBy: currentUser.fullName }],
    };
    setOpportunities((previous) => [newOpportunity, ...previous]);
    syncWithApi(createRecord('opportunities', newOpportunity));
    addToast('success', 'Fırsat Oluşturuldu', `${newOpportunity.opportunityNo} numaralı fırsat kaydedildi.`);
  };

  const updateOpportunity = (id: string, item: Partial<OpportunityItem> & { stageChangeReason?: string }) => {
    const target = opportunities.find((opportunity) => opportunity.id === id);
    if (!target) return;
    const { stageChangeReason, ...changes } = item;
    const nextOpportunity: OpportunityItem = { ...target, ...changes, id };
    const stage = changes.stage as OpportunityStage | undefined;
    if (stage && stage !== target.stage) {
      nextOpportunity.stageHistory = [...target.stageHistory, {
        fromStage: target.stage,
        toStage: stage,
        changedAt: new Date().toISOString(),
        changedBy: currentUser.fullName,
        ...(stageChangeReason?.trim() ? { note: stageChangeReason.trim() } : {}),
      }];
    }
    setOpportunities((previous) => previous.map((opportunity) => opportunity.id === id ? nextOpportunity : opportunity));
    syncWithApi(updateRecord('opportunities', id, { ...nextOpportunity, ...(stageChangeReason ? { stageChangeReason } : {}) }));
    addToast('success', 'Fırsat Güncellendi', 'Fırsat bilgileri kaydedildi.');
  };

  const deleteOpportunity = (id: string) => {
    const target = opportunities.find((opportunity) => opportunity.id === id);
    setOpportunities((previous) => previous.filter((opportunity) => opportunity.id !== id));
    syncWithApi(deleteApiRecord('opportunities', id));
    addToast('info', 'Fırsat Silindi', `${target?.opportunityNo || id} fırsatı silindi.`);
  };

  // Request Actions
  const addRequest = (item: Omit<RequestItem, 'id'>) => {
    const newId = `REQ-${Date.now()}`;
    const newRequest: RequestItem = { ...item, id: newId, requestNo: nextDocumentNumber(requests, 'requestNo', 'TLP') };
    const newReq = newRequest;
    setRequests((prev) => [newReq, ...prev]);
    syncWithApi(createRecord('requests', newReq));
    addToast('success', 'Talep Oluşturuldu', `${newReq.subject} işleme alındı.`);
  };

  const updateRequest = (id: string, item: Partial<RequestItem>) => {
    const target = requests.find((request) => request.id === id);
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, ...item } : r)));
    if (target) syncWithApi(updateRecord('requests', id, { ...target, ...item, id }));
    addToast('success', 'Talep Güncellendi', 'Talep durumu güncellendi.');
  };

  const deleteRequest = (id: string) => {
    const target = requests.find((r) => r.id === id);
    setRequests((prev) => prev.filter((r) => r.id !== id));
    syncWithApi(deleteApiRecord('requests', id));
    addToast('info', 'Talep Silindi', `${target?.subject || id} talebi silindi.`);
  };

  // Proposal Actions
  const addProposal = (item: Omit<ProposalItem, 'id'>) => {
    const newId = `PROP-${Date.now()}`;
    const newProposal: ProposalItem = { ...item, id: newId, proposalNo: nextDocumentNumber(proposals, 'proposalNo', 'TKL') };
    const newProp = newProposal;
    setProposals((prev) => [newProp, ...prev]);
    syncWithApi(createRecord('proposals', newProp));
    addToast('success', 'Teklif Hazırlandı', `${newProp.proposalNo} nolu teklif sisteme kaydedildi.`);
  };

  const updateProposal = (id: string, item: Partial<ProposalItem>) => {
    const target = proposals.find((proposal) => proposal.id === id);
    setProposals((prev) => prev.map((p) => (p.id === id ? { ...p, ...item } : p)));
    if (target) syncWithApi(updateRecord('proposals', id, { ...target, ...item, id }));
    addToast('success', 'Teklif Güncellendi', 'Teklif detayları güncellendi.');
  };

  const deleteProposal = (id: string) => {
    const target = proposals.find((p) => p.id === id);
    setProposals((prev) => prev.filter((p) => p.id !== id));
    syncWithApi(deleteApiRecord('proposals', id));
    addToast('info', 'Teklif Silindi', `${target?.proposalNo || id} teklifi silindi.`);
  };

  // Order Actions
  const addOrder = (item: Omit<OrderItem, 'id'>) => {
    const newId = `ORD-${Date.now()}`;
    const newOrd: OrderItem = { ...item, id: newId, orderNo: nextDocumentNumber(orders, 'orderNo', 'SIP') };
    setOrders((prev) => [newOrd, ...prev]);
    syncWithApi(createRecord('orders', newOrd));
    addToast('success', 'Sipariş Oluşturuldu', `${newOrd.orderNo} siparişi sisteme işlendi.`);
  };

  const updateOrder = (id: string, item: Partial<OrderItem>) => {
    const target = orders.find((order) => order.id === id);
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...item } : o)));
    if (target) syncWithApi(updateRecord('orders', id, { ...target, ...item, id }));
    addToast('success', 'Sipariş Güncellendi', 'Sipariş ve sevkiyat durumu güncellendi.');
  };

  const deleteOrder = (id: string) => {
    const target = orders.find((o) => o.id === id);
    setOrders((prev) => prev.filter((o) => o.id !== id));
    syncWithApi(deleteApiRecord('orders', id));
    addToast('info', 'Sipariş Silindi', `${target?.orderNo || id} siparişi silindi.`);
  };

  // Contract Actions
  const addContract = (item: Omit<ContractItem, 'id'>) => {
    const newId = `CTR-${Date.now()}`;
    const newCtr: ContractItem = { ...item, id: newId, contractNo: nextDocumentNumber(contracts, 'contractNo', 'SOZ') };
    setContracts((prev) => [newCtr, ...prev]);
    syncWithApi(createRecord('contracts', newCtr));
    addToast('success', 'Sözleşme Kaydedildi', `${newCtr.contractNo} nolu sözleşme yürürlüğe alındı.`);
  };

  const updateContract = (id: string, item: Partial<ContractItem>) => {
    const target = contracts.find((contract) => contract.id === id);
    setContracts((prev) => prev.map((c) => (c.id === id ? { ...c, ...item } : c)));
    if (target) syncWithApi(updateRecord('contracts', id, { ...target, ...item, id }));
    addToast('success', 'Sözleşme Güncellendi', 'Sözleşme detayları güncellendi.');
  };

  const deleteContract = (id: string) => {
    const target = contracts.find((c) => c.id === id);
    setContracts((prev) => prev.filter((c) => c.id !== id));
    syncWithApi(deleteApiRecord('contracts', id));
    addToast('info', 'Sözleşme Silindi', `${target?.contractNo || id} sözleşmesi silindi.`);
  };

  const addGuaranteeLetter = (item: Omit<GuaranteeLetterItem, 'id'>) => {
    const newLetter: GuaranteeLetterItem = { ...item, id: `TEM-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, letterNo: nextDocumentNumber(guaranteeLetters, 'letterNo', 'TEM') };
    setGuaranteeLetters((prev) => [newLetter, ...prev]);
    syncWithApi(createRecord('guaranteeLetters', newLetter));
    addToast('success', 'Teminat Mektubu Eklendi', `${newLetter.letterNo} numaralı mektup kaydedildi.`);
  };

  const updateGuaranteeLetter = (id: string, item: Partial<GuaranteeLetterItem>) => {
    const target = guaranteeLetters.find((letter) => letter.id === id);
    setGuaranteeLetters((prev) => prev.map((letter) => letter.id === id ? { ...letter, ...item } : letter));
    if (target) syncWithApi(updateRecord('guaranteeLetters', id, { ...target, ...item, id }));
    addToast('success', 'Teminat Mektubu Güncellendi', 'Teminat mektubu bilgileri güncellendi.');
  };

  const deleteGuaranteeLetter = (id: string) => {
    const target = guaranteeLetters.find((letter) => letter.id === id);
    setGuaranteeLetters((prev) => prev.filter((letter) => letter.id !== id));
    syncWithApi(deleteApiRecord('guaranteeLetters', id));
    addToast('info', 'Teminat Mektubu Silindi', `${target?.letterNo || id} kaydı silindi.`);
  };

  return (
    <CrmContext.Provider
      value={{
        currentModule,
        setCurrentModule,
        currentUser,
        setCurrentUser,
        sessionToken,
        rememberSession,
        isAuthenticated,
        login,
        logout,
        refreshCurrentUser,
        updatePassword,
        activeCompany,
        setActiveCompany,
        users,
        customers,
        stakeholders,
        products,
        activities,
        opportunities,
        requests,
        proposals,
        orders,
        contracts,
        guaranteeLetters,
        auditLogs,
        refreshAuditLogs,
        getCustomerLinkedRecords,
        getRequestWorkflowChain,
        getWorkflowSummary,
        addUser,
        updateUser,
        deleteUser,
        changeUserPassword,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        addStakeholder,
        updateStakeholder,
        deleteStakeholder,
        addProduct,
        addProductsBatch,
        updateProduct,
        deleteProduct,
        addActivity,
        updateActivity,
        deleteActivity,
        addOpportunity,
        updateOpportunity,
        deleteOpportunity,
        addRequest,
        updateRequest,
        deleteRequest,
        addProposal,
        updateProposal,
        deleteProposal,
        addOrder,
        updateOrder,
        deleteOrder,
        addContract,
        updateContract,
        deleteContract,
        addGuaranteeLetter,
        updateGuaranteeLetter,
        deleteGuaranteeLetter,
        toasts,
        addToast,
        removeToast,
        formatMoney,
        hasPermission,
      }}
    >
      {children}
    </CrmContext.Provider>
  );
};

export const useCrm = () => {
  const context = useContext(CrmContext);
  if (!context) {
    throw new Error('useCrm must be used within a CrmProvider');
  }
  return context;
};
