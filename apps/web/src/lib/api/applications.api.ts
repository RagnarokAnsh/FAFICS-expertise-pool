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

/**
 * The applicant edit token proves ownership of a draft. It is returned by
 * createDraft (and available from the resume link URL) and must be sent on every
 * draft write/submit so the backend can authorize the otherwise-public endpoints.
 */
function editTokenHeader(editToken?: string | null) {
  return editToken ? { headers: { 'X-Edit-Token': editToken } } : undefined;
}

export const applicationsApi = {
  createDraft: async (data: any): Promise<{ id: string; editToken: string; resumed: boolean }> => {
    const response = await apiClient.post('/applications', data);
    return unwrap(response);
  },

  updateDraft: async (id: string, data: any, editToken?: string | null): Promise<{ message: string }> => {
    const response = await apiClient.put(`/applications/${id}`, data, editTokenHeader(editToken));
    return unwrap(response);
  },

  getDraft: async (id: string): Promise<any> => {
    const response = await apiClient.get(`/applications/${id}`);
    return unwrap(response);
  },

  submitApplication: async (
    id: string,
    consent: { consentData: boolean; consentAccurate: boolean } = { consentData: true, consentAccurate: true },
    editToken?: string | null,
  ): Promise<{ referenceNumber: string }> => {
    const response = await apiClient.post(`/applications/${id}/submit`, consent, editTokenHeader(editToken));
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
