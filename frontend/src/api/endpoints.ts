import { api } from './axios';

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),
  me: () => api.get('/auth/me'),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post('/auth/change-password', data),
  logout: (refreshToken: string) => api.post('/auth/logout', { refreshToken }),
  updateProfile: (data: { firstName: string; lastName: string; phone?: string }) =>
    api.patch('/auth/profile', data),
};

export const customerApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) => api.get('/customers', { params }),
  get: (id: string) => api.get(`/customers/${id}`),
  create: (data: any) => api.post('/customers', data),
  update: (id: string, data: any) => api.patch(`/customers/${id}`, data),
  delete: (id: string) => api.delete(`/customers/${id}`),
  getSites: (id: string) => api.get(`/customers/${id}/sites`),
  getTickets: (id: string) => api.get(`/customers/${id}/tickets`),
  getPayments: (id: string) => api.get(`/customers/${id}/payments`),
};

export const siteApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    customerId?: string;
    ispId?: string;
    status?: string;
    connectionType?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) => api.get('/sites', { params }),
  get: (id: string) => api.get(`/sites/${id}`),
  create: (data: any) => api.post('/sites', data),
  update: (id: string, data: any) => api.patch(`/sites/${id}`, data),
  delete: (id: string) => api.delete(`/sites/${id}`),
  getByCustomer: (customerId: string) => api.get(`/sites/customer/${customerId}`),
};

export const ispApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) => api.get('/isps', { params }),
  get: (id: string) => api.get(`/isps/${id}`),
  create: (data: any) => api.post('/isps', data),
  update: (id: string, data: any) => api.patch(`/isps/${id}`, data),
  delete: (id: string) => api.delete(`/isps/${id}`),
};

export const ticketApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    priority?: string;
    source?: string;
    customerId?: string;
    siteId?: string;
    assignedToId?: string;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) => api.get('/tickets', { params }),
  get: (id: string) => api.get(`/tickets/${id}`),
  create: (data: any) => api.post('/tickets', data),
  update: (id: string, data: any) => api.patch(`/tickets/${id}`, data),
  delete: (id: string) => api.delete(`/tickets/${id}`),
  assign: (id: string, assignedToId: string | null) =>
    api.patch(`/tickets/${id}/assign`, { assignedToId }),
  updateStatus: (id: string, status: string) =>
    api.patch(`/tickets/${id}/status`, { status }),
  addMessage: (id: string, data: { message: string; isInternal?: boolean; attachments?: any[] }) =>
    api.post(`/tickets/${id}/messages`, data),
  getMessages: (id: string) => api.get(`/tickets/${id}/messages`),
};

export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
  getRecentTickets: () => api.get('/dashboard/recent-tickets'),
  getRenewals: () => api.get('/dashboard/renewals'),
  getChartData: () => api.get('/dashboard/chart-data'),
};

export const paymentApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    customerId?: string;
    siteId?: string;
    type?: string;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) => api.get('/payments', { params }),
  get: (id: string) => api.get(`/payments/${id}`),
  create: (data: any) => api.post('/payments', data),
  update: (id: string, data: any) => api.patch(`/payments/${id}`, data),
  delete: (id: string) => api.delete(`/payments/${id}`),
};

export const webhookApi = {
  setupTelegram: (url: string) => api.post('/webhooks/telegram/setup', { url }),
  getTelegramInfo: () => api.get('/webhooks/telegram/info'),
};

export const gisApi = {
  listSites: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    ispId?: string;
    connectionType?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) => api.get('/gis/sites', { params }),
  getSite: (id: string) => api.get(`/gis/sites/${id}`),
  listIsps: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) => api.get('/gis/isps', { params }),
  getIsp: (id: string) => api.get(`/gis/isps/${id}`),
  getMapData: (params?: {
    status?: string;
    ispId?: string;
  }) => api.get('/gis/map', { params }),
  getSiteStats: () => api.get('/gis/sites/stats'),
};

export const credentialsApi = {
  listAll: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) => api.get('/credentials', { params }),
  getBySite: (siteId: string) => api.get(`/credentials/sites/${siteId}`),
  createOrUpdate: (siteId: string, data: any) => api.post(`/credentials/sites/${siteId}`, data),
  reveal: (siteId: string, field: 'password' | 'pppoePassword') =>
    api.post(`/credentials/sites/${siteId}/reveal`, { field }),
  delete: (siteId: string) => api.delete(`/credentials/sites/${siteId}`),
};

export const userApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    roleId?: string;
    isActive?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) => api.get('/users', { params }),
  get: (id: string) => api.get(`/users/${id}`),
  create: (data: any) => api.post('/users', data),
  update: (id: string, data: any) => api.patch(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
};

export const importExportApi = {
  // Export
  exportCustomers: (params?: any) => api.get('/import-export/export/customers', { params, responseType: 'blob' }),
  exportSites: (params?: any) => api.get('/import-export/export/sites', { params, responseType: 'blob' }),
  exportPayments: (params?: any) => api.get('/import-export/export/payments', { params, responseType: 'blob' }),
  exportTickets: (params?: any) => api.get('/import-export/export/tickets', { params, responseType: 'blob' }),

  // Templates
  downloadTemplate: (type: string) => api.get(`/import-export/template/${type}`, { responseType: 'blob' }),

  // Import Preview
  previewImportCustomers: (data: any) => api.post('/import-export/import/customers/preview', data),
  previewImportSites: (data: any) => api.post('/import-export/import/sites/preview', data),

  // Import Execute
  executeImportCustomers: (data: any) => api.post('/import-export/import/customers', data),
  executeImportSites: (data: any) => api.post('/import-export/import/sites', data),
};

export const roleApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) => api.get('/roles', { params }),
  get: (id: string) => api.get(`/roles/${id}`),
  create: (data: any) => api.post('/roles', data),
  update: (id: string, data: any) => api.patch(`/roles/${id}`, data),
  delete: (id: string) => api.delete(`/roles/${id}`),
};

export const quotationApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    customerId?: string;
    siteId?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) => api.get('/quotations', { params }),
  get: (id: string) => api.get(`/quotations/${id}`),
  create: (data: any) => api.post('/quotations', data),
  update: (id: string, data: any) => api.patch(`/quotations/${id}`, data),
  delete: (id: string) => api.delete(`/quotations/${id}`),
};