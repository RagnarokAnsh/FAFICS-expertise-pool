import { apiClient } from './client';

/**
 * Helper to unwrap the { data, meta } envelope from the NestJS TransformInterceptor.
 * Axios already unwraps HTTP body into response.data, so the actual payload is at response.data.data.
 */
function unwrap<T>(response: { data: { data: T } }): T {
  // Handle both wrapped { data: ... } and raw responses (e.g. health endpoint)
  if (response.data && typeof response.data === 'object' && 'data' in response.data) {
    return response.data.data;
  }
  return response.data as unknown as T;
}

export const applicationsApi = {
  createDraft: async (data: any): Promise<{ id: string }> => {
    const response = await apiClient.post('/applications', data);
    return unwrap(response);
  },

  updateDraft: async (id: string, data: any): Promise<{ message: string }> => {
    const response = await apiClient.put(`/applications/${id}`, data);
    return unwrap(response);
  },

  getDraft: async (id: string): Promise<any> => {
    const response = await apiClient.get(`/applications/${id}`);
    return unwrap(response);
  },

  submitApplication: async (
    id: string,
    consent: { consentData: boolean; consentAccurate: boolean } = { consentData: true, consentAccurate: true },
  ): Promise<{ referenceNumber: string }> => {
    const response = await apiClient.post(`/applications/${id}/submit`, consent);
    return unwrap(response);
  },

  getStatus: async (email: string, referenceNumber: string): Promise<any> => {
    const response = await apiClient.get('/applications/status', {
      params: { email, referenceNumber },
    });
    return unwrap(response);
  },

  requestEditLink: async (email: string, referenceNumber: string): Promise<{ message: string }> => {
    const response = await apiClient.post('/applications/request-edit-link', {
      email,
      referenceNumber,
    });
    return unwrap(response);
  },

  getResumeData: async (token: string): Promise<any> => {
    const response = await apiClient.get(`/applications/resume/${token}`);
    return unwrap(response);
  },

  requestDraftLink: async (email: string): Promise<{ message: string }> => {
    const response = await apiClient.post('/applications/request-draft-link', { email });
    return unwrap(response);
  },
};
