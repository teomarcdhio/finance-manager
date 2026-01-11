import { api } from '@/lib/api';

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  permission: string;
  label?: string;
  is_default_password?: boolean;
}

export const authService = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);
    
    const response = await api.post<LoginResponse>('/login/access-token', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  },

  isAuthenticated: () => {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('token');
  },

  getMe: async (): Promise<User> => {
    const response = await api.get<User>('/users/me');
    return response.data;
  },

  updateMe: async (data: Partial<User> & { password?: string }): Promise<User> => {
    const response = await api.patch<User>('/users/me', data);
    return response.data;
  }
};
