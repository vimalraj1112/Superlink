export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ISP_OWNER = 'ISP_OWNER',
  SALES = 'SALES',
  NOC = 'NOC',
  FINANCE = 'FINANCE',
  SUPPORT = 'SUPPORT',
  CLIENT = 'CLIENT',
}

export enum SiteStatus {
  FEASIBILITY_PENDING = 'FEASIBILITY_PENDING',
  SURVEY_IN_PROGRESS = 'SURVEY_IN_PROGRESS',
  FEASIBILITY_APPROVED = 'FEASIBILITY_APPROVED',
  FEASIBILITY_REJECTED = 'FEASIBILITY_REJECTED',
  PROVISIONING = 'PROVISIONING',
  DELIVERED_ACTIVE = 'DELIVERED_ACTIVE',
  RENEWAL_DUE = 'RENEWAL_DUE',
  SUSPENDED = 'SUSPENDED',
  DISCONNECTED = 'DISCONNECTED',
}

export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
  CRITICAL = 'CRITICAL',
}

export enum TicketSource {
  MANUAL = 'MANUAL',
  TELEGRAM = 'TELEGRAM',
  WHATSAPP = 'WHATSAPP',
  EMAIL = 'EMAIL',
}

export enum PaymentType {
  OTC = 'OTC',
  MRC = 'MRC',
  STATIC_IP = 'STATIC_IP',
  OTHER = 'OTHER',
}

export enum ChatPlatform {
  TELEGRAM = 'TELEGRAM',
  WHATSAPP = 'WHATSAPP',
}

export enum ConnectionType {
  FIBER = 'FIBER',
  LEASED_LINE = 'LEASED_LINE',
  WIRELESS = 'WIRELESS',
  COPPER = 'COPPER',
  SATELLITE = 'SATELLITE',
  OTHER = 'OTHER',
}

export const ConnectionTypeLabels: Record<ConnectionType, string> = {
  [ConnectionType.FIBER]: 'Fiber',
  [ConnectionType.LEASED_LINE]: 'Leased Line',
  [ConnectionType.WIRELESS]: 'Wireless',
  [ConnectionType.COPPER]: 'Copper',
  [ConnectionType.SATELLITE]: 'Satellite',
  [ConnectionType.OTHER]: 'Other',
};

export const SiteStatusLabels: Record<SiteStatus, string> = {
  [SiteStatus.FEASIBILITY_PENDING]: 'Feasibility Pending',
  [SiteStatus.SURVEY_IN_PROGRESS]: 'Survey In Progress',
  [SiteStatus.FEASIBILITY_APPROVED]: 'Feasibility Approved',
  [SiteStatus.FEASIBILITY_REJECTED]: 'Feasibility Rejected',
  [SiteStatus.PROVISIONING]: 'Provisioning',
  [SiteStatus.DELIVERED_ACTIVE]: 'Delivered/Active',
  [SiteStatus.RENEWAL_DUE]: 'Renewal Due',
  [SiteStatus.SUSPENDED]: 'Suspended',
  [SiteStatus.DISCONNECTED]: 'Disconnected',
};

export const SiteStatusColors: Record<SiteStatus, string> = {
  [SiteStatus.FEASIBILITY_PENDING]: 'bg-yellow-100 text-yellow-800',
  [SiteStatus.SURVEY_IN_PROGRESS]: 'bg-blue-100 text-blue-800',
  [SiteStatus.FEASIBILITY_APPROVED]: 'bg-green-100 text-green-800',
  [SiteStatus.FEASIBILITY_REJECTED]: 'bg-red-100 text-red-800',
  [SiteStatus.PROVISIONING]: 'bg-purple-100 text-purple-800',
  [SiteStatus.DELIVERED_ACTIVE]: 'bg-emerald-100 text-emerald-800',
  [SiteStatus.RENEWAL_DUE]: 'bg-orange-100 text-orange-800',
  [SiteStatus.SUSPENDED]: 'bg-gray-100 text-gray-800',
  [SiteStatus.DISCONNECTED]: 'bg-slate-100 text-slate-800',
};

export const TicketStatusLabels: Record<TicketStatus, string> = {
  [TicketStatus.OPEN]: 'Open',
  [TicketStatus.IN_PROGRESS]: 'In Progress',
  [TicketStatus.RESOLVED]: 'Resolved',
  [TicketStatus.CLOSED]: 'Closed',
};

export const TicketStatusColors: Record<TicketStatus, string> = {
  [TicketStatus.OPEN]: 'bg-blue-100 text-blue-800',
  [TicketStatus.IN_PROGRESS]: 'bg-yellow-100 text-yellow-800',
  [TicketStatus.RESOLVED]: 'bg-green-100 text-green-800',
  [TicketStatus.CLOSED]: 'bg-gray-100 text-gray-800',
};

export const TicketPriorityLabels: Record<TicketPriority, string> = {
  [TicketPriority.LOW]: 'Low',
  [TicketPriority.MEDIUM]: 'Medium',
  [TicketPriority.HIGH]: 'High',
  [TicketPriority.URGENT]: 'Urgent',
  [TicketPriority.CRITICAL]: 'Critical',
};

export const TicketPriorityColors: Record<TicketPriority, string> = {
  [TicketPriority.LOW]: 'bg-gray-100 text-gray-800',
  [TicketPriority.MEDIUM]: 'bg-blue-100 text-blue-800',
  [TicketPriority.HIGH]: 'bg-orange-100 text-orange-800',
  [TicketPriority.URGENT]: 'bg-red-100 text-red-800',
  [TicketPriority.CRITICAL]: 'bg-red-900 text-red-100',
};

export const TicketSourceLabels: Record<TicketSource, string> = {
  [TicketSource.MANUAL]: 'Manual',
  [TicketSource.TELEGRAM]: 'Telegram',
  [TicketSource.WHATSAPP]: 'WhatsApp',
  [TicketSource.EMAIL]: 'Email',
};

export const TicketSourceColors: Record<TicketSource, string> = {
  [TicketSource.MANUAL]: 'bg-gray-100 text-gray-800',
  [TicketSource.TELEGRAM]: 'bg-blue-100 text-blue-800',
  [TicketSource.WHATSAPP]: 'bg-green-100 text-green-800',
  [TicketSource.EMAIL]: 'bg-purple-100 text-purple-800',
};

export const PaymentTypeLabels: Record<PaymentType, string> = {
  [PaymentType.OTC]: 'OTC',
  [PaymentType.MRC]: 'MRC',
  [PaymentType.STATIC_IP]: 'Static IP',
  [PaymentType.OTHER]: 'Other',
};