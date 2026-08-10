const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: BodyInit | object;
  params?: Record<string, unknown>;
}

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

function findErrorMessage(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const message = findErrorMessage(item);
      if (message) return message;
    }
  }
  if (typeof value === 'object' && value !== null) {
    for (const item of Object.values(value)) {
      const message = findErrorMessage(item);
      if (message) return message;
    }
  }
  return undefined;
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {},
  hasRetriedAuthentication = false,
): Promise<T> {
  const { params, headers: customHeaders, body, ...fetchOptions } = options;
  
  const headers: Record<string, string> = {
    ...((customHeaders as Record<string, string>) || {}),
  };

  if (!(body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  const impersonatedCompanyId = localStorage.getItem('impersonated_company_id');
  if (impersonatedCompanyId) {
    headers['X-Company-ID'] = impersonatedCompanyId;
  }

  let url = `${API_BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.append(key, String(val));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const finalBody = body instanceof FormData ? body : (typeof body === 'object' && body !== null ? JSON.stringify(body) : body);

  const response = await fetch(url, {
    ...fetchOptions,
    credentials: 'include',
    headers,
    body: finalBody as BodyInit | null,
  });

  if (response.status === 204) {
    return {} as T;
  }

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    if (response.status === 401 && !hasRetriedAuthentication && endpoint !== '/auth/login/') {
      const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (refreshResponse.ok) {
        return request<T>(endpoint, options, true);
      }
      localStorage.removeItem('is_authenticated');
      localStorage.removeItem('impersonated_company_id');
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }

    const errorData = typeof data === 'object' && data !== null
      ? data as Record<string, unknown>
      : {};
    const errorMessage = (
      typeof errorData.detail === 'string' && errorData.detail
    ) || (
      typeof errorData.message === 'string' && errorData.message
    ) || findErrorMessage(data) || 'Une erreur est survenue. Veuillez réessayer.';
    throw new ApiError(response.status, errorMessage, data);
  }

  return data as T;
}

export const api = {
  get: <T>(endpoint: string, options?: RequestOptions) => 
    request<T>(endpoint, { method: 'GET', ...options }),

  getList: async <T>(endpoint: string, options?: RequestOptions) => {
    const firstPage = await request<T[] | PaginatedResponse<T>>(
      endpoint,
      { method: 'GET', ...options },
    );
    if (Array.isArray(firstPage)) return firstPage;

    const results = [...firstPage.results];
    let next = firstPage.next;
    let page = 2;
    while (next && page <= 100) {
      const response = await request<T[] | PaginatedResponse<T>>(
        endpoint,
        {
          method: 'GET',
          ...options,
          params: { ...(options?.params || {}), page },
        },
      );
      if (Array.isArray(response)) {
        results.push(...response);
        break;
      }
      results.push(...response.results);
      next = response.next;
      page += 1;
    }
    return results;
  },

  post: <T>(endpoint: string, body?: BodyInit | object, options?: RequestOptions) =>
    request<T>(endpoint, {
      method: 'POST',
      body,
      ...options,
    }),

  put: <T>(endpoint: string, body?: BodyInit | object, options?: RequestOptions) =>
    request<T>(endpoint, {
      method: 'PUT',
      body,
      ...options,
    }),

  patch: <T>(endpoint: string, body?: BodyInit | object, options?: RequestOptions) =>
    request<T>(endpoint, {
      method: 'PATCH',
      body,
      ...options,
    }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, {
      method: 'DELETE',
      ...options,
    }),

  download: async (endpoint: string) => {
    const token = localStorage.getItem('access_token');
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const impersonatedCompanyId = localStorage.getItem('impersonated_company_id');
    if (impersonatedCompanyId) headers['X-Company-ID'] = impersonatedCompanyId;
    const response = await fetch(`${API_BASE_URL}${endpoint}`, { headers });
    if (!response.ok) {
      throw new ApiError(response.status, 'Téléchargement impossible.');
    }
    return response.blob();
  },
};

export { ApiError };
