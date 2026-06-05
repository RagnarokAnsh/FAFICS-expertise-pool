import axios from 'axios';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
  // Public applicant endpoints; the HttpOnly auth cookie (if present) rides
  // along automatically. No token is read or attached from JS.
  withCredentials: true,
});

// NOTE: This is the PUBLIC applicant client. It must NOT redirect to the admin
// login on 401 — applicants have no admin session. A 401 here means a draft
// edit-token problem and is handled by the calling hook (which recovers by
// starting a fresh draft). Admin auth/redirects live in admin.api.ts.
