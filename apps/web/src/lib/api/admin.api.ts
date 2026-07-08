import axios from 'axios';
import Cookies from 'js-cookie';
import { withBasePath } from '../utils/base-path';

export const adminApiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
  // The JWT lives in an HttpOnly cookie set by the server; withCredentials makes
  // the browser send it automatically. JS never reads or attaches the token.
  withCredentials: true,
});

// On an expired/invalid session the API replies 401 — drop the UI role hint and
// bounce to login.
adminApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      Cookies.remove('fafics_role');
      if (!window.location.pathname.includes('/admin/login')) {
        window.location.href = withBasePath('/admin/login');
      }
    }
    return Promise.reject(error);
  },
);

/**
 * Helper to unwrap the { data, meta } envelope from the NestJS TransformInterceptor.
 */
function unwrap(response: { data: any }): any {
  if (response.data && typeof response.data === 'object' && 'data' in response.data) {
    return response.data.data;
  }
  return response.data;
}

export const adminApi = {
  login: async (email: string, password: string) => {
    const response = await adminApiClient.post('/auth/login', { email, password });
    return unwrap(response);
  },

  logout: async () => {
    // Clears the server-side HttpOnly auth cookie.
    const response = await adminApiClient.post('/auth/logout');
    return unwrap(response);
  },
  
  getStats: async () => {
    const response = await adminApiClient.get('/admin/stats');
    return unwrap(response);
  },

  getDistinctCountries: async (): Promise<string[]> => {
    const response = await adminApiClient.get('/admin/countries');
    return unwrap(response);
  },

  listApplications: async (params?: { page?: number; limit?: number; status?: string; search?: string; country?: string }) => {
    const response = await adminApiClient.get('/admin/applications', { params });
    return unwrap(response);
  },

  getApplication: async (id: string) => {
    const response = await adminApiClient.get(`/admin/applications/${id}`);
    return unwrap(response);
  },

  approve: async (id: string, notes?: string) => {
    const response = await adminApiClient.patch(`/admin/applications/${id}/approve`, { secretaryNotes: notes });
    return unwrap(response);
  },

  reject: async (id: string, notes: string) => {
    const response = await adminApiClient.patch(`/admin/applications/${id}/reject`, { secretaryNotes: notes });
    return unwrap(response);
  },

  requestChanges: async (id: string, notes: string) => {
    const response = await adminApiClient.patch(`/admin/applications/${id}/request-changes`, { secretaryNotes: notes });
    return unwrap(response);
  },

  addNotes: async (id: string, notes: string) => {
    const response = await adminApiClient.patch(`/admin/applications/${id}/notes`, { secretaryNotes: notes });
    return unwrap(response);
  },

  exportRoster: async () => {
    const response = await adminApiClient.get('/admin/export/roster', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'FAFICS_Expertise_Pool.xlsx');
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  getExpiring: async () => {
    const response = await adminApiClient.get('/admin/expiring');
    return unwrap(response);
  },

  sendReminders: async (ids: string[]) => {
    const response = await adminApiClient.post('/admin/reminders/send', { applicationIds: ids });
    return unwrap(response);
  },

  listUsers: async () => {
    const response = await adminApiClient.get('/admin/users');
    return unwrap(response);
  },

  createUser: async (dto: { email: string; password?: string; role: string; firstName: string; lastName: string }) => {
    const response = await adminApiClient.post('/admin/users', dto);
    return unwrap(response);
  },

  updateRole: async (userId: string, role: string) => {
    const response = await adminApiClient.patch(`/admin/users/${userId}/role`, { role });
    return unwrap(response);
  },

  getAnalytics: async () => {
    const response = await adminApiClient.get('/admin/analytics');
    return unwrap(response);
  },
};
