export type Role = 'Admin' | 'Manager' | 'Sales' | 'Engineer' | 'Support';

export type UserStatus = 'Aktif' | 'Pasif';
export type CrmResource =
  | 'dashboard'
  | 'activities'
  | 'opportunities'
  | 'requests'
  | 'proposals'
  | 'orders'
  | 'contracts'
  | 'guaranteeLetters'
  | 'customers'
  | 'stakeholders'
  | 'products'
  | 'users';

export type UserPermission =
  | 'dashboard.view'
  | 'activities.view' | 'activities.create' | 'activities.edit' | 'activities.delete'
  | 'opportunities.view' | 'opportunities.create' | 'opportunities.edit' | 'opportunities.delete'
  | 'stakeholders.view' | 'stakeholders.create' | 'stakeholders.edit' | 'stakeholders.delete'
  | 'requests.view' | 'requests.create' | 'requests.edit' | 'requests.delete'
  | 'proposals.view' | 'proposals.create' | 'proposals.edit' | 'proposals.delete'
  | 'orders.view' | 'orders.create' | 'orders.edit' | 'orders.delete'
  | 'contracts.view' | 'contracts.create' | 'contracts.edit' | 'contracts.delete'
  | 'guaranteeLetters.view' | 'guaranteeLetters.create' | 'guaranteeLetters.edit' | 'guaranteeLetters.delete'
  | 'reports.view' | 'users.manage' | 'customers.manage' | 'products.manage' | 'products.cost.view';

export function buildPermission(resource: Exclude<CrmResource, 'dashboard'>, action: 'view' | 'create' | 'edit' | 'delete' | 'manage'): UserPermission {
  if (resource === 'users' || resource === 'customers' || resource === 'products') {
    return `${resource}.manage` as UserPermission;
  }
  return `${resource}.${action}` as UserPermission;
}

export interface UserItem {
  id: string;
  fullName: string;
  username?: string;
  email: string;
  duty: string; // Görev
  phone: string;
  role: Role;
  companies: string[]; // e.g. ["ISSD"]
  status: UserStatus;
  avatar?: string;
  passwordHash?: string;
  mustChangePassword?: boolean;
  permissions?: UserPermission[];
}

export interface AuditLogItem {
  id: string;
  userId: string;
  action: string;
  resource: string;
  recordId?: string;
  details?: unknown;
  createdAt: string;
}

export type CustomerType = 'Kurumsal' | 'Kamu' | 'Belediye' | 'Özel Sektör' | 'Yüklenici';

export interface CustomerItem {
  id: string;
  type: CustomerType; // Tür
  name: string; // Adı / Kontak Kişi
  company: string; // Firma / Kurum
  email: string;
  phone: string;
  address: string;
  reference: string; // Referans
  taxOffice?: string;
  taxNumber?: string;
  parentCustomerId?: string;
  createdAt: string;
}

export type StakeholderRole = 'Karar Verici' | 'Teknik Ekip' | 'İdari / Satın Alma' | 'Etkileyici' | 'Kullanıcı' | 'Diğer';

export interface StakeholderItem {
  id: string;
  customerId: string;
  customerName: string;
  fullName: string;
  title: string;
  department: string;
  role: StakeholderRole;
  email: string;
  phone: string;
  notes?: string;
  status: 'Aktif' | 'Pasif';
  createdAt: string;
}

export type ProductUnit = 'Adet' | 'Set' | 'Metre' | 'Lisans' | 'Paket' | 'Yıllık Hizmet';

export interface ProductItem {
  id: string;
  code: string; // Kod (e.g. KLM-10001)
  company: string; // Firma (e.g. ISSD Bilişim A.Ş.)
  name: string; // Ürün Adı
  brand: string; // Marka
  model: string; // Model
  costPrice: number; // Maliyet Fiyatı
  salePrice: number; // Satış Fiyatı
  unit: ProductUnit; // Birim
  description: string; // Açıklama
  category: string;
  stock: number;
}

export type ActivityType = 'Toplantı' | 'Saha Ziyareti' | 'Telefon Görüşmesi' | 'E-Posta' | 'Demo / Sunum' | 'Keşif';
export type ActivityStatus = 'Tamamlandı' | 'Planlandı' | 'Ertelendi' | 'İptal Edildi';

export interface ActivityItem {
  id: string;
  type: ActivityType; // Türü
  date: string; // Tarih
  subTypeReason: string; // Alt Tür / Neden
  subTypeDate: string; // Alt Tür Tarih
  customerId: string;
  customerName: string; // Müşteri
  stakeholderIds?: string[];
  estimatedBudget: number; // Tahmini Bütçe (₺)
  creator: string; // Oluşturan
  subject: string; // Konu
  description: string; // Açıklama
  status: ActivityStatus;
  probability: number; // Satış Olasılığı (%)
  currency: 'TRY' | 'USD' | 'EUR';
}

export type RequestPriority = 'Düşük' | 'Orta' | 'Yüksek' | 'Kritik';
export type RequestStatus = 'Yeni' | 'İnceleniyor' | 'İşleme Alındı' | 'Tamamlandı' | 'Reddedildi';

export interface RequestItem {
  id: string;
  requestNo: string;
  customerId: string;
  customerName: string; // Müşteri
  subject: string; // Konu
  creator: string; // Oluşturan
  createdAt: string; // Oluşturma Tarihi
  assignees: string[]; // Sorumlular
  priority: RequestPriority;
  status: RequestStatus;
  projectCode?: string; // Proje Referansı (e.g., ABB Yapay Zeka İP-1)
  details?: string;
}

export const OPPORTUNITY_STAGES = [
  'Şartname Bekleniyor',
  'Teklif Hazırlanıyor',
  'İhaleye Girildi',
  'İtiraz Sürecinde',
  'Kazanıldı',
  'Kaybedildi',
] as const;

export type OpportunityStage = typeof OPPORTUNITY_STAGES[number];

export interface OpportunityStageChange {
  fromStage?: OpportunityStage;
  toStage: OpportunityStage;
  changedAt: string;
  changedBy: string;
  note?: string;
}

export interface OpportunityItem {
  id: string;
  opportunityNo: string;
  customerId: string;
  customerName: string;
  subject: string;
  tenderNo?: string;
  tenderDate?: string;
  productGroup: string;
  region: string;
  estimatedValue: number;
  currency: 'TRY' | 'USD' | 'EUR';
  probability: number;
  expectedDecisionDate: string;
  stage: OpportunityStage;
  ownerName: string;
  competitors?: string[];
  lossReason?: string;
  requestId?: string;
  proposalId?: string;
  notes?: string;
  createdAt: string;
  stageHistory: OpportunityStageChange[];
}

export type ProposalStatus = 'Açık' | 'Onay' | 'Red' | 'İptal';

export interface ProposalLineItem {
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  unit: string;
  total: number;
}

export interface ProposalItem {
  id: string;
  requestId?: string;
  status: ProposalStatus; // Durum
  proposalNo: string; // Teklif No
  company: string; // Firma
  customerId: string;
  customerName: string; // Müşteri
  customerRepresentative: string; // Müşteri Temsilcisi
  subject: string; // Konu
  creator: string; // Oluşturan
  createdAt: string; // Oluşturma Tarihi
  validUntil: string; // Geçerlilik Tarihi
  grandTotal: number; // Genel Toplam
  currency: 'TRY' | 'USD' | 'EUR';
  items?: ProposalLineItem[];
  notes?: string;
  projectCode?: string;
}

export type OrderStatus = 'Hazırlanıyor' | 'Onaylandı' | 'Sevk Edildi' | 'Teslim Edildi' | 'Tamamlandı' | 'İptal';

export interface OrderItem {
  id: string;
  requestId?: string;
  proposalId?: string;
  status: OrderStatus; // Durum
  orderNo: string; // Sipariş No
  poNo: string; // PO No (Satın Alma Sipariş No)
  proposalNo: string; // Teklif No
  company: string; // Firma
  customerId: string;
  customerName: string; // Müşteri
  subject: string; // Konu
  creator: string; // Oluşturan
  orderDate: string; // Sipariş Tarihi
  grandTotal: number; // Genel Toplam
  currency: 'TRY' | 'USD' | 'EUR';
  advancePayment: string; // Avans (e.g. "%30 Alındı", "%50 Peşin", "Tamamı Ödendi")
  deliveryStatus: string; // Teslimat (e.g. "Kısmi Teslimat", "Beklemede", "Teslim Edildi")
  invoiceStatus: string; // Fatura (e.g. "Kesildi", "Bekliyor", "İptal")
  collectionStatus: string; // Tahsilat (e.g. "Tahsil Edildi", "Vadesi Gelmedi", "Kısmi Tahsilat")
  projectCode?: string;
}

export type ContractStatus = 'Yürürlükte' | 'Süresi Doldu' | 'Feshedildi' | 'Taslak' | 'Yenileme Bekliyor';
export type ContractType = 'Bakım ve Destek' | 'Anahtar Teslim Proje' | 'Lisans & SLA' | 'Donanım Tedarik' | 'Servis';

export interface ContractItem {
  id: string;
  requestId?: string;
  proposalId?: string;
  orderId?: string;
  status: ContractStatus; // Durum
  contractNo: string; // Sözleşme No
  contractName: string; // Sözleşme Adı
  customerId: string;
  customerName: string; // Müşteri
  type: ContractType; // Tür
  startDate: string; // Başlangıç
  endDate: string; // Bitiş
  autoRenewal: 'Evet' | 'Hayır'; // Otomatik Yenileme
  price: number; // Bedel
  vat: number; // KDV (%20 vb.)
  responsiblePerson: string; // Sorumlu
  projectCode?: string;
  documentUrl?: string;
}

export type GuaranteeLetterType = 'Geçici Teminat' | 'Kesin Teminat' | 'Avans Teminatı' | 'Diğer';
export type GuaranteeLetterStatus = 'Aktif' | 'İade Edildi' | 'Paraya Çevrildi' | 'Süresi Doldu';

export interface GuaranteeLetterItem {
  id: string;
  letterNo: string;
  type: GuaranteeLetterType;
  bank: string;
  amount: number;
  currency: 'TRY' | 'USD' | 'EUR';
  issueDate: string;
  expiryDate: string;
  beneficiary: string;
  contractId: string;
  contractNo: string;
  status: GuaranteeLetterStatus;
  notes?: string;
}

export type NavigationModule = 
  | 'dashboard'
  | 'opportunities'
  | 'activities'
  | 'requests'
  | 'proposals'
  | 'orders'
  | 'contracts'
  | 'activity-reports'
  | 'proposal-reports'
  | 'users'
  | 'customers'
  | 'stakeholders'
  | 'stakeholders'
  | 'products'
  | 'guarantees'
  | 'audit-logs';
