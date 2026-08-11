const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown,
    public code = 'api_error',
    public fieldErrors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const ERROR_TRANSLATIONS: Array<[RegExp, string]> = [
  [/^this field is required\.?$/i, 'Ce champ est obligatoire.'],
  [/^enter a valid email address\.?$/i, 'Saisissez une adresse e-mail valide.'],
  [/^old password is incorrect\.?$/i, "L'ancien mot de passe est incorrect."],
  [/^invalid company\.?$/i, "L'élément sélectionné n'appartient pas à votre entreprise."],
  [/^authentication credentials were not provided\.?$/i, 'Vous devez vous connecter pour continuer.'],
  [/^you do not have permission to perform this action\.?$/i, "Vous n'avez pas l'autorisation d'effectuer cette action."],
  [/^not found\.?$/i, "L'élément demandé est introuvable."],
]

function translateErrorMessage(message: string): string {
  if (/request was throttled|throttled/i.test(message)) {
    return 'Nombre maximal de tentatives atteint. Veuillez patienter quelques minutes avant de réessayer.'
  }

  for (const [pattern, translation] of ERROR_TRANSLATIONS) {
    if (pattern.test(message.trim())) return translation
  }
  return message
}

function normalizeFieldErrors(value: unknown): Record<string, string[]> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {}

  const record = value as Record<string, unknown>
  const source = typeof record.fields === 'object' && record.fields !== null
    ? record.fields as Record<string, unknown>
    : record
  const result: Record<string, string[]> = {}

  Object.entries(source).forEach(([field, messages]) => {
    if (['code', 'detail', 'fields', 'message'].includes(field)) return
    const values = Array.isArray(messages) ? messages : [messages]
    const normalized = values
      .filter((item): item is string => typeof item === 'string')
      .map(translateErrorMessage)
    if (normalized.length) result[field] = normalized
  })

  return result
}

async function safeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(0, 'La requête a été interrompue.', { code: 'request_aborted' }, 'request_aborted')
    }
    throw new ApiError(
      0,
      'Impossible de contacter le serveur. Vérifiez votre connexion puis réessayez.',
      { code: 'network_error' },
      'network_error',
    )
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

  const response = await safeFetch(url, {
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
      const refreshResponse = await safeFetch(`${API_BASE_URL}/auth/refresh/`, {
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
    const errorMessage = translateErrorMessage((
      typeof errorData.detail === 'string' && errorData.detail
    ) || (
      typeof errorData.message === 'string' && errorData.message
    ) || findErrorMessage(data) || 'Une erreur est survenue. Veuillez réessayer.');

    const code = typeof errorData.code === 'string' ? errorData.code : 'api_error'
    throw new ApiError(response.status, errorMessage, data, code, normalizeFieldErrors(data));
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
    const response = await safeFetch(`${API_BASE_URL}${endpoint}`, {
      credentials: 'include',
      headers,
    });
    if (!response.ok) {
      throw new ApiError(response.status, 'Téléchargement impossible.');
    }
    return response.blob();
  },
};

export { ApiError };
