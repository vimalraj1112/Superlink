import type {
  UserRole,
  SiteStatus,
  TicketStatus,
  TicketPriority,
  TicketSource,
  PaymentType,
  ChatPlatform,
} from './enums';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  role: Role;
}

export interface Role {
  id: string;
  name: UserRole;
  description?: string;
  permissions: Record<string, string[]>;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  customerCode: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gstNumber?: string;
  panNumber?: string;
  billingAddress?: string;
  billingCity?: string;
  billingState?: string;
  billingPincode?: string;
  notes?: string;
  isActive: boolean;
  createdById: string;
  updatedById?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: User;
  updatedBy?: User;
  sites?: Site[];
  tickets?: Ticket[];
  payments?: Payment[];
}

export interface Site {
  id: string;
  siteCode: string;
  customerId: string;
  ispId: string;
  planName: string;
  bandwidth: string;
  mrc: number;
  otc: number;
  staticIpCharge: number;
  staticIpCount: number;
  otherCharges: number;
  status: SiteStatus;
  installationAddress: string;
  installationCity: string;
  installationState: string;
  installationPincode: string;
  latitude?: number;
  longitude?: number;
  connectionType?: string;
  circuitId?: string;
  provisionedAt?: string;
  renewalDate?: string;
  disconnectedAt?: string;
  notes?: string;
  createdById: string;
  updatedById?: string;
  createdAt: string;
  updatedAt: string;
  customer?: Customer;
  isp?: ISP;
  createdBy?: User;
  updatedBy?: User;
  tickets?: Ticket[];
  payments?: Payment[];
  credentials?: SiteCredential;
}

export interface ISP {
  id: string;
  name: string;
  displayName: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  website?: string;
  logoUrl?: string;
  latitude?: number;
  longitude?: number;
  isActive: boolean;
  notes?: string;
  createdById: string;
  updatedById?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: User;
  updatedBy?: User;
  sites?: Site[];
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  source: TicketSource;
  customerId: string;
  siteId?: string;
  assignedToId?: string;
  createdById: string;
  updatedById?: string;
  slaDueAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
  customer?: Customer;
  site?: Site;
  assignedTo?: User;
  createdBy?: User;
  updatedBy?: User;
  messages?: TicketMessage[];
  chatSessions?: ChatSession[];
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  userId: string;
  message: string;
  isInternal: boolean;
  attachments?: any[];
  createdAt: string;
  updatedAt: string;
  user?: User;
  chatMessage?: ChatMessage;
}

export interface ChatSession {
  id: string;
  platform: ChatPlatform;
  platformUserId: string;
  platformChatId?: string;
  customerId: string;
  siteId?: string;
  ticketId?: string;
  userId?: string;
  isActive: boolean;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
  customer?: Customer;
  site?: Site;
  ticket?: Ticket;
  user?: User;
  messages?: ChatMessage[];
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  platform: ChatPlatform;
  platformMessageId?: string;
  direction: 'inbound' | 'outbound';
  content: string;
  messageType: string;
  metadata?: Record<string, any>;
  ticketMessageId?: string;
  createdAt: string;
  session?: ChatSession;
  ticketMessage?: TicketMessage;
}

export interface Payment {
  id: string;
  paymentNumber: string;
  customerId: string;
  siteId?: string;
  amount: number;
  type: PaymentType;
  description?: string;
  paymentDate: string;
  paymentMethod?: string;
  transactionId?: string;
  referenceNumber?: string;
  recordedById: string;
  invoiceNumber?: string;
  invoiceUrl?: string;
  receiptUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  customer?: Customer;
  site?: Site;
  recordedBy?: User;
}

export interface SiteCredential {
  id: string;
  siteId: string;
  username?: string;
  passwordEnc?: string;
  routerIp?: string;
  routerModel?: string;
  vlanId?: string;
  pppoeUsername?: string;
  pppoePasswordEnc?: string;
  staticIps?: any;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  customerId: string;
  siteId?: string;
  title: string;
  description?: string;
  validityDate: string;
  status: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  terms?: string;
  notes?: string;
  createdById: string;
  sentAt?: string;
  acceptedAt?: string;
  createdAt: string;
  updatedAt: string;
  customer?: Customer;
  site?: Site;
  createdBy?: User;
  items?: QuotationItem[];
}

export interface QuotationItem {
  id: string;
  quotationId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId: string;
  oldData?: any;
  newData?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  user?: User;
}