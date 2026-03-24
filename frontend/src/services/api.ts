import axios, { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../stores/authStore';

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 30000,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const { refreshToken, setTokens, logout } = useAuthStore.getState();
        if (!refreshToken) { logout(); return Promise.reject(error); }
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
        setTokens(data.data.accessToken, data.data.refreshToken);
        original.headers = { ...original.headers, Authorization: `Bearer ${data.data.accessToken}` };
        return api(original);
      } catch {
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  },
);

// Typed API helpers
export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  logout: (refreshToken: string) => api.post('/auth/logout', { refreshToken }),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data: object) => api.post('/auth/reset-password', data),
  getProfile: () => api.get('/auth/profile'),
};

export const employeeApi = {
  list: (params?: object) => api.get('/employees', { params }),
  getById: (id: string) => api.get(`/employees/${id}`),
  create: (data: FormData) => api.post('/employees', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id: string, data: FormData) => api.put(`/employees/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateStatus: (id: string, status: string, reason?: string) => api.patch(`/employees/${id}/status`, { status, reason }),
  getOrgChart: () => api.get('/employees/org-chart'),
  bulkImport: (file: File) => { const fd = new FormData(); fd.append('file', file); return api.post('/employees/bulk-import', fd); },
  exportExcel: (fields?: string[]) => api.get('/employees/export', { params: { fields: fields?.join(',') }, responseType: 'blob' }),
};

export const attendanceApi = {
  clockIn: (data: object) => api.post('/attendance/clock-in', data),
  clockOut: (data: object) => api.post('/attendance/clock-out', data),
  clockInWithFile: (data: FormData) => api.post('/attendance/clock-in', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  clockOutWithFile: (data: FormData) => api.post('/attendance/clock-out', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getMyAttendance: (params?: object) => api.get('/attendance/my', { params }),
  getDashboard: () => api.get('/attendance/dashboard'),
  getEmployeeAttendance: (id: string, params?: object) => api.get(`/attendance/employee/${id}`, { params }),
  adminOverride: (data: object) => api.post('/attendance/override', data),
  exportRegister: (params: object) => api.get('/attendance/export', { params, responseType: 'blob' }),
  // Hotspot management
  listHotspots: () => api.get('/attendance/hotspots'),
  createHotspot: (data: object) => api.post('/attendance/hotspots', data),
  updateHotspot: (id: string, data: object) => api.put(`/attendance/hotspots/${id}`, data),
  deleteHotspot: (id: string) => api.delete(`/attendance/hotspots/${id}`),
  assignHotspot: (employeeId: string, hotspotId: string) => api.post(`/attendance/employee/${employeeId}/hotspots/${hotspotId}`),
  removeHotspot: (employeeId: string, hotspotId: string) => api.delete(`/attendance/employee/${employeeId}/hotspots/${hotspotId}`),
  getEmployeeHotspots: (employeeId: string) => api.get(`/attendance/employee/${employeeId}/hotspots`),
  // GeoFence management
  listGeoFences: () => api.get('/attendance/geofences'),
  createGeoFence: (data: object) => api.post('/attendance/geofences', data),
  updateGeoFence: (id: string, data: object) => api.put(`/attendance/geofences/${id}`, data),
  deleteGeoFence: (id: string) => api.delete(`/attendance/geofences/${id}`),
  assignGeoFence: (employeeId: string, fenceId: string) => api.post(`/attendance/employee/${employeeId}/geofences/${fenceId}`),
  removeGeoFence: (employeeId: string, fenceId: string) => api.delete(`/attendance/employee/${employeeId}/geofences/${fenceId}`),
};

export const leaveApi = {
  apply: (data: FormData) => api.post('/leave/apply', data),
  getMyLeaves: () => api.get('/leave/my'),
  getPending: () => api.get('/leave/pending'),
  process: (id: string, action: string, note?: string) => api.post(`/leave/${id}/process`, { action, note }),
  getBalances: (employeeId?: string) => api.get(employeeId ? `/leave/balances/${employeeId}` : '/leave/balances'),
  getTypes: () => api.get('/leave/types'),
  getHolidays: (year?: number) => api.get('/leave/holidays', { params: { year } }),
  teamCalendar: (month: number, year: number) => api.get('/leave/calendar', { params: { month, year } }),
};

export const payrollApi = {
  run: (data: object) => api.post('/payroll/run', data),
  getRuns: () => api.get('/payroll/runs'),
  getPayslips: (runId: string) => api.get(`/payroll/runs/${runId}/payslips`),
  getMyPayslips: () => api.get('/payroll/my-payslips'),
  downloadPayslip: (id: string) => api.get(`/payroll/payslip/${id}/download`, { responseType: 'blob' }),
  emailPayslips: (runId: string) => api.post(`/payroll/runs/${runId}/email`),
  approve: (runId: string) => api.post(`/payroll/runs/${runId}/approve`),
};

export const assetApi = {
  list: (params?: object) => api.get('/assets', { params }),
  getById: (id: string) => api.get(`/assets/${id}`),
  create: (data: object) => api.post('/assets', data),
  update: (id: string, data: object) => api.put(`/assets/${id}`, data),
  assign: (id: string, data: object) => api.post(`/assets/${id}/assign`, data),
  return: (assignmentId: string, data: object) => api.post(`/assets/assignments/${assignmentId}/return`, data),
  getCategories: () => api.get('/assets/categories'),
};

export const dashboardApi = {
  hr: () => api.get('/dashboard/hr'),
};

export const notificationApi = {
  list: (page?: number) => api.get('/notifications', { params: { page } }),
  getUnread: () => api.get('/notifications/unread'),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};

// ─── RBAC ─────────────────────────────────────────────────────────────────────
export const rbacApi = {
  listPermissions: (params?: object) => api.get('/rbac/permissions', { params }),
  createPermission: (data: object) => api.post('/rbac/permissions', data),
  deletePermission: (id: string) => api.delete(`/rbac/permissions/${id}`),
  seedPermissions: () => api.post('/rbac/permissions/seed'),

  listRoles: () => api.get('/rbac/roles'),
  createRole: (data: object) => api.post('/rbac/roles', data),
  updateRole: (id: string, data: object) => api.put(`/rbac/roles/${id}`, data),
  deleteRole: (id: string) => api.delete(`/rbac/roles/${id}`),

  assignRole: (data: object) => api.post('/rbac/assignments', data),
  revokeRole: (id: string) => api.delete(`/rbac/assignments/${id}`),
  getUserRoles: (userId: string) => api.get(`/rbac/users/${userId}/roles`),

  setOverride: (data: object) => api.post('/rbac/overrides', data),
  removeOverride: (id: string) => api.delete(`/rbac/overrides/${id}`),

  getMatrix: () => api.get('/rbac/matrix'),
  getMyPermissions: () => api.get('/rbac/me/permissions'),

  createReview: (data: object) => api.post('/rbac/reviews', data),
  listReviews: () => api.get('/rbac/reviews'),
  submitDecision: (assignmentId: string, data: object) => api.post(`/rbac/reviews/assignments/${assignmentId}/decision`, data),
};

// ─── Repair Tickets ───────────────────────────────────────────────────────────
export const repairApi = {
  list: (params?: object) => api.get('/repair', { params }),
  create: (data: object) => api.post('/repair', data),
  getById: (id: string) => api.get(`/repair/${id}`),
  advanceStage: (id: string, data: object) => api.patch(`/repair/${id}/stage`, data),
  addComment: (id: string, content: string, isInternal?: boolean) =>
    api.post(`/repair/${id}/comments`, { content, isInternal }),
  submitCsat: (id: string, rating: number, feedback?: string) =>
    api.post(`/repair/${id}/csat`, { rating, feedback }),
  getAnalytics: (params?: object) => api.get('/repair/analytics', { params }),
};

// ─── Performance Management ───────────────────────────────────────────────────
export const performanceApi = {
  // Cycles
  listCycles: () => api.get('/performance/cycles'),
  createCycle: (data: object) => api.post('/performance/cycles', data),
  updateCycleStatus: (id: string, status: string) => api.patch(`/performance/cycles/${id}/status`, { status }),

  // Goals
  createGoal: (data: object) => api.post('/performance/goals', data),
  updateGoalProgress: (id: string, currentValue: number, comment?: string) =>
    api.patch(`/performance/goals/${id}/progress`, { currentValue, comment }),
  getMyGoals: (cycleId?: string) => api.get('/performance/goals/me', { params: { cycleId } }),
  getEmployeeGoals: (employeeId: string, cycleId?: string) =>
    api.get(`/performance/employees/${employeeId}/goals`, { params: { cycleId } }),

  // Reviews
  initiateReview: (cycleId: string, data: object) => api.post(`/performance/cycles/${cycleId}/reviews`, data),
  submitReview: (id: string, data: object) => api.patch(`/performance/reviews/${id}/submit`, data),
  getCycleReviews: (cycleId: string) => api.get(`/performance/cycles/${cycleId}/reviews`),
  calculateBonus: (cycleId: string) => api.get(`/performance/cycles/${cycleId}/bonus`),

  // 360 Feedback
  requestFeedback: (data: object) => api.post('/performance/feedback', data),
  submitFeedback: (id: string, data: object) => api.patch(`/performance/feedback/${id}/submit`, data),
  getMyFeedback: (cycleId?: string) => api.get('/performance/feedback/me', { params: { cycleId } }),

  // PIP
  createPIP: (data: object) => api.post('/performance/pip', data),
  addCheckIn: (pipId: string, data: object) => api.post(`/performance/pip/${pipId}/checkins`, data),
  closePIP: (pipId: string, data: object) => api.patch(`/performance/pip/${pipId}/close`, data),
  getEmployeePIPs: (employeeId: string) => api.get(`/performance/employees/${employeeId}/pip`),
};

// ─── Helpdesk ─────────────────────────────────────────────────────────────────
export const helpdeskApi = {
  listCategories: (type?: string) => api.get('/helpdesk/categories', { params: { type } }),
  createCategory: (data: object) => api.post('/helpdesk/categories', data),

  listTickets: (params?: object) => api.get('/helpdesk/tickets', { params }),
  getMyTickets: (params?: object) => api.get('/helpdesk/tickets/me', { params }),
  createTicket: (data: object) => api.post('/helpdesk/tickets', data),
  getTicket: (id: string) => api.get(`/helpdesk/tickets/${id}`),
  updateStatus: (id: string, data: object) => api.patch(`/helpdesk/tickets/${id}/status`, data),
  addComment: (id: string, content: string, isInternal?: boolean) =>
    api.post(`/helpdesk/tickets/${id}/comments`, { content, isInternal }),
  submitCsat: (id: string, rating: number, feedback?: string) =>
    api.post(`/helpdesk/tickets/${id}/csat`, { rating, feedback }),
  getAnalytics: () => api.get('/helpdesk/tickets/analytics'),

  searchArticles: (q?: string, category?: string) => api.get('/helpdesk/kb/articles', { params: { q, category } }),
  createArticle: (data: object) => api.post('/helpdesk/kb/articles', data),
  viewArticle: (id: string) => api.get(`/helpdesk/kb/articles/${id}`),
  rateArticle: (id: string, helpful: boolean) => api.post(`/helpdesk/kb/articles/${id}/rate`, { helpful }),
};

// ─── Offboarding ──────────────────────────────────────────────────────────────
export const offboardingApi = {
  initiate: (data: object) => api.post('/offboarding', data),
  list: (params?: object) => api.get('/offboarding', { params }),
  getCase: (id: string) => api.get(`/offboarding/${id}`),
  updateChecklistItem: (itemId: string, data: object) => api.patch(`/offboarding/checklist/${itemId}`, data),
  signOffClearance: (id: string, data: object) => api.post(`/offboarding/${id}/clearances`, data),
  getFnF: (id: string) => api.get(`/offboarding/${id}/fnf`),
  submitExitInterview: (id: string, data: object) => api.post(`/offboarding/${id}/exit-interview`, data),
  complete: (id: string) => api.post(`/offboarding/${id}/complete`),
  cancel: (id: string, reason: string) => api.post(`/offboarding/${id}/cancel`, { reason }),
};
