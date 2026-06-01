import { apiClient } from './client';
import type { EndorsementView } from '@fafics/shared';

export const endorsementApi = {
  getApplication: async (token: string): Promise<EndorsementView> => {
    const { data } = await apiClient.get(`/endorse/${token}`);
    return data.data ?? data;
  },

  endorse: async (token: string, presidentNotes?: string): Promise<{ message: string }> => {
    const { data } = await apiClient.post(`/endorse/${token}/endorse`, { presidentNotes });
    return data;
  },

  return: async (token: string, presidentNotes: string): Promise<{ message: string }> => {
    const { data } = await apiClient.post(`/endorse/${token}/return`, { presidentNotes });
    return data;
  },
};
