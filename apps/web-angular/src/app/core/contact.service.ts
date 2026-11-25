import { Injectable } from '@angular/core';
import { apiClient } from '../lib/api/client';

export interface ContactRequest {
  email: string;
  message: string;
}

export interface ContactResponse {
  success: boolean;
  message: string;
}

/**
 * Sends the Contact Us form to POST /api/contact. Uses the same axios client
 * as the rest of the public site, so no Angular HttpClient provider is needed.
 */
@Injectable({ providedIn: 'root' })
export class ContactService {
  async sendMessage(data: ContactRequest): Promise<ContactResponse> {
    const response = await apiClient.post('/contact', data);
    // The API wraps every response in { data, meta }.
    return response.data.data;
  }
}
