import axios from 'axios';
import Cookies from 'js-cookie';
import { withBasePath } from '../utils/base-path';
import { environment } from '../../../environments/environment';

export const adminApiClient = axios.create({
  baseURL: environment.apiUrl,
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
  
  /** The email log. failedOnly lists failures not yet fixed by a later send. */
  listNotifications: async (params: { failedOnly?: boolean; page?: number; limit?: number }) => {
    const response = await adminApiClient.get('/admin/notifications', {
      params: { failedOnly: params.failedOnly ? 'true' : undefined, page: params.page, limit: params.limit },
    });
    return unwrap(response);
  },

  retryNotification: async (id: string) => {
    const response = await adminApiClient.post(`/admin/notifications/${id}/retry`);
    return unwrap(response);
  },

  getStats: async () => {
    const response = await adminApiClient.get('/admin/stats');
    return unwrap(response);
  },

  getDistinctAssociations: async (): Promise<{ name: string; country: string }[]> => {
    const response = await adminApiClient.get('/admin/associations');
    return unwrap(response);
  },

  /** Downloads every application matching the Applications page filters, as Excel. */
  exportApplications: async (filters: ApplicationFilters) => {
    const response = await adminApiClient.get('/admin/export/applications', { params: filters, responseType: 'blob' });
    saveDownload(response, `FAFICS_Applications_${todayStamp()}.xlsx`);
  },

  getDistinctCountries: async (): Promise<string[]> => {
    const response = await adminApiClient.get('/admin/countries');
    return unwrap(response);
  },

  listApplications: async (params?: ApplicationFilters & { page?: number; limit?: number }) => {
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

  /** Deletes an approved profile and its data; optionally emails the applicant. */
  removeFromPool: async (id: string, reason: string, notifyApplicant: boolean): Promise<{ message: string }> => {
    const response = await adminApiClient.post(`/admin/applications/${id}/remove-from-pool`, {
      reason: reason.trim() || undefined,
      notifyApplicant,
    });
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

  /** Emails the President the endorsement request again. Earlier links keep working. */
  resendPresidentLink: async (id: string): Promise<{ presidentEmail: string; message: string }> => {
    const response = await adminApiClient.post(`/admin/applications/${id}/resend-president-link`);
    return unwrap(response);
  },

  /** Corrects the President's email. While awaiting the President, a new link is sent to it. */
  updatePresidentEmail: async (id: string, presidentEmail: string): Promise<{ presidentEmail: string; linkSent: boolean }> => {
    const response = await adminApiClient.patch(`/admin/applications/${id}/president-email`, { presidentEmail });
    return unwrap(response);
  },

  /**
   * Downloads the Expertise Pool as Excel. With `ids`, only those profiles
   * (e.g. the filtered list on screen); otherwise the whole pool.
   */
  exportRoster: async (ids?: string[]) => {
    const response = ids
      ? await adminApiClient.post('/admin/export/roster', { ids }, { responseType: 'blob' })
      : await adminApiClient.get('/admin/export/roster', { responseType: 'blob' });
    saveDownload(response, `FAFICS_Expertise_Pool_${todayStamp()}.xlsx`);
  },

  /** Downloads one application's full profile (with its timeline) as Excel. */
  exportApplication: async (id: string, referenceNumber?: string | null) => {
    const response = await adminApiClient.get(`/admin/export/application/${id}`, { responseType: 'blob' });
    saveDownload(response, `FAFICS_Profile_${referenceNumber || 'Draft'}_${todayStamp()}.xlsx`);
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

  updateUser: async (
    userId: string,
    dto: {
      email?: string;
      firstName?: string;
      lastName?: string;
      role?: string;
      isActive?: boolean;
    },
  ) => {
    const response = await adminApiClient.patch(`/admin/users/${userId}`, dto);
    return unwrap(response);
  },

  deleteUser: async (userId: string) => {
    const response = await adminApiClient.delete(`/admin/users/${userId}`);
    return unwrap(response);
  },

  /** Emails a reset link to the officer. The admin never sees the password. */
  sendUserPasswordReset: async (userId: string) => {
    const response = await adminApiClient.post(`/admin/users/${userId}/reset-password`);
    return unwrap(response);
  },

  getAnalytics: async () => {
    const response = await adminApiClient.get('/admin/analytics');
    return unwrap(response);
  },
};


/**
 * Password self-service endpoints. These live on /auth rather than /admin:
 * forgot-password and reset-password are reachable without a session (that is
 * the point), while change-password requires the auth cookie.
 */
export const authApi = {
  /**
   * Always resolves for a well-formed address, whether or not it is registered.
   * The API deliberately gives the same answer either way so the form cannot be
   * used to discover which addresses have accounts.
   */
  forgotPassword: async (email: string) => {
    const response = await adminApiClient.post('/auth/forgot-password', { email });
    return unwrap(response);
  },

  /** Resolves if the reset link still works; rejects with 404/410 if not. */
  checkResetLink: async (token: string) => {
    const response = await adminApiClient.get(`/auth/reset-password/${encodeURIComponent(token)}`);
    return unwrap(response);
  },

  resetPassword: async (token: string, password: string) => {
    const response = await adminApiClient.post('/auth/reset-password', { token, password });
    return unwrap(response);
  },

  /**
   * Changes the signed-in user's password. The server clears the auth cookie on
   * success, so the caller must send the user back to the login page.
   */
  changePassword: async (currentPassword: string, newPassword: string) => {
    const response = await adminApiClient.post('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return unwrap(response);
  },

  me: async () => {
    const response = await adminApiClient.get('/auth/me');
    return unwrap(response);
  },
};

function todayStamp(): string {
  return new Date().toISOString().split('T')[0];
}

/** Saves a blob response, preferring the file name the server sends. */
function saveDownload(response: { data: Blob; headers: any }, fallbackName: string): void {
  const disposition: string = response.headers?.['content-disposition'] ?? '';
  const name = /filename="([^"]+)"/.exec(disposition)?.[1] ?? fallbackName;
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', name);
  document.body.appendChild(link);
  link.click();
  link.parentNode?.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/** The Applications list filters, as the API takes them. */
export interface ApplicationFilters {
  search?: string;
  status?: string;
  excludeDrafts?: boolean;
  waitingMinDays?: number;
  association?: string;
  country?: string;
  sort?: string;
}
