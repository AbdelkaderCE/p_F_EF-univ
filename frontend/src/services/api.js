/*
  Centralized API client for the University Platform.
  Base URL defaults to http://localhost:5000 in development.
  Credentials: 'include' sends httpOnly cookies (JWT access + refresh tokens).
  Auto-refresh: on 401, tries /refresh-token once then retries the original request.
*/

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

let isRefreshing = false;
let refreshQueue = [];

function processQueue(error) {
  refreshQueue.forEach(({ resolve, reject }) => (error ? reject(error) : resolve()));
  refreshQueue = [];
}

async function request(endpoint, options = {}, _isRetry = false) {
  const url = `${API_BASE}${endpoint}`;
  const isFormDataBody = typeof FormData !== 'undefined' && options?.body instanceof FormData;

  const res = await fetch(url, {
    headers: {
      ...(isFormDataBody ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    },
    credentials: 'include', // send httpOnly cookies
    ...options,
  });

  // Rate limiter returns HTML, not JSON
  if (res.status === 429) {
    const error = new Error('Too many attempts. Please wait a few minutes and try again.');
    error.status = 429;
    error.code = 'RATE_LIMITED';
    throw error;
  }

  // Auto-refresh on 401 (skip if this IS the refresh call or a retry)
  if (res.status === 401 && !_isRetry && !endpoint.includes('/refresh-token')) {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const refreshRes = await fetch(`${API_BASE}/api/v1/auth/refresh-token`, {
          method: 'POST',
          credentials: 'include',
        });
        if (!refreshRes.ok) {
          const refreshError = new Error('Session expired. Please sign in again.');
          refreshError.status = refreshRes.status;
          throw refreshError;
        }
        processQueue(null);
      } catch (refreshErr) {
        processQueue(refreshErr);
        throw refreshErr;
      } finally {
        isRefreshing = false;
      }
    } else {
      // Another refresh is in-flight — wait for it
      await new Promise((resolve, reject) => refreshQueue.push({ resolve, reject }));
    }
    // Retry the original request once
    return request(endpoint, options, true);
  }

  let data;
  try {
    data = await res.json();
  } catch {
    const error = new Error('Server error. Please try again later.');
    error.status = res.status;
    throw error;
  }

  if (!res.ok) {
    const message = data?.error?.message || data?.message || 'Something went wrong';
    const error = new Error(message);
    error.status = res.status;
    error.code = data?.error?.code;
    throw error;
  }

  return data;
}

/* ── Auth API ───────────────────────────────────────────────── */

export const authAPI = {
  login: (email, password) =>
    request('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (userData) =>
    request('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  logout: () =>
    request('/api/v1/auth/logout', { method: 'POST' }),

  refreshToken: () =>
    request('/api/v1/auth/refresh-token', { method: 'POST' }),

  getMe: () =>
    request('/api/v1/auth/me'),

  verifyEmail: (token) =>
    request(`/api/v1/auth/verify-email/${token}`),

  resendVerification: (email) =>
    request('/api/v1/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  changePassword: (currentPassword, newPassword) =>
    request('/api/v1/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),


  forgotPassword: (email) =>
    request('/api/v1/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token, newPassword) =>
    request('/api/v1/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    }),

  /* Admin-only endpoints */
  adminCreateUser: (userData) =>
    request('/api/v1/auth/admin/create-user', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  adminImportUsersExcel: (file) => {
    const formData = new FormData();
    formData.append('file', file);

    return request('/api/v1/auth/admin/import-users-excel', {
      method: 'POST',
      body: formData,
    });
  },

  adminResetPassword: (userId) =>
    request(`/api/v1/auth/admin/reset-password/${userId}`, {
      method: 'POST',
    }),

  adminGetUsers: () =>
    request('/api/v1/auth/admin/users'),

  adminGetRoles: () =>
    request('/api/v1/auth/admin/roles'),

  adminGetAcademicOptions: () =>
    request('/api/v1/auth/admin/academic/options'),

  adminCreateSpecialite: (payload) =>
    request('/api/v1/auth/admin/academic/specialites', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  adminCreatePromo: (payload) =>
    request('/api/v1/auth/admin/academic/promos', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  adminCreateModule: (payload) =>
    request('/api/v1/auth/admin/academic/modules', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  adminGetAcademicAssignments: () =>
    request('/api/v1/auth/admin/academic/assignments'),

  adminAssignStudentPromo: (userId, promoId) =>
    request(`/api/v1/auth/admin/academic/assignments/students/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ promoId }),
    }),

  adminAssignTeacherModules: (userId, payload) =>
    request(`/api/v1/auth/admin/academic/assignments/teachers/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  adminUpdateUserRoles: (userId, roleNames) =>
    request(`/api/v1/auth/admin/users/${userId}/roles`, {
      method: 'PUT',
      body: JSON.stringify({ roleNames }),
    }),

  adminUpdateUserStatus: (userId, status) =>
    request(`/api/v1/auth/admin/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
};

export const messagesAPI = {
  getInbox: () =>
    request('/api/v1/messages/inbox'),

  getCapabilities: () =>
    request('/api/v1/messages/capabilities'),

  send: ({ mode, recipientUserId, title, content }) =>
    request('/api/v1/messages/send', {
      method: 'POST',
      body: JSON.stringify({ mode, recipientUserId, title, content }),
    }),
};

export default request;
