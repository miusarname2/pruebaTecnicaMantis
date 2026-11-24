import type { ProjectSummary, ProjectDetail, Space, IssuePayload } from '../types';

const API_BASE = '/api';

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });
  } catch (_err) {
    throw new ApiError('Network error. Check your connection to the server. Try again.', 0);
  }

  if (response.status === 401) {
    throw new ApiError('Authentication required or token expired. Please select a valid user.', 401);
  }

  if (!response.ok) {
    let errorMsg = `Server error (${response.status})`;
    try {
      const errData = await response.json();
      if (errData && errData.error) {
        errorMsg = errData.error;
      }
    } catch {
      // not JSON
    }
    throw new ApiError(errorMsg, response.status);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  getProjects(token: string): Promise<ProjectSummary[]> {
    return request<ProjectSummary[]>('/projects', token);
  },

  getProjectDetail(id: string, token: string): Promise<ProjectDetail> {
    return request<ProjectDetail>(`/projects/${id}`, token);
  },

  getSpaces(id: string, token: string): Promise<Space[]> {
    return request<Space[]>(`/projects/${id}/spaces`, token);
  },

  createIssue(id: string, token: string, payload: IssuePayload): Promise<{ id: string }> {
    return request<{ id: string }>(`/projects/${id}/issues`, token, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getCloudUrl(id: string): string {
    return `${API_BASE}/projects/${id}/cloud`;
  },
};
