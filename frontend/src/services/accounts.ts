import { api } from '@/lib/api';

export interface Account {
  id: string;
  name: string;
  account_number?: string;
  bank_name?: string;
  initial_balance: number;
  current_balance: number;
  balance_date: string;
  currency: string;
  user_id: string | null;
  category_id?: string | null;
}

export const accountService = {
  getAccounts: async (): Promise<Account[]> => {
    const response = await api.get<Account[]>('/accounts/');
    return response.data;
  },

  getDestinationAccounts: async (params?: { skip?: number; limit?: number }): Promise<Account[]> => {
    const response = await api.get<Account[]>('/accounts/destination', { params });
    return response.data;
  },

  createDestinationAccount: async (data: Partial<Account>): Promise<Account> => {
    const response = await api.post<Account>('/accounts/destination', data);
    return response.data;
  },

  createAccount: async (data: Partial<Account>): Promise<Account> => {
    const response = await api.post<Account>('/accounts/', data);
    return response.data;
  },

  getAccount: async (id: string, endDate?: string): Promise<Account> => {
    const params = endDate ? { end_date: endDate } : {};
    const response = await api.get<Account>(`/accounts/${id}`, { params });
    return response.data;
  },

  updateAccount: async (id: string, data: Partial<Account>): Promise<Account> => {
    const response = await api.put<Account>(`/accounts/${id}`, data);
    return response.data;
  },

  deleteAccount: async (id: string): Promise<void> => {
    await api.delete(`/accounts/${id}`);
  },

  deleteDestinationAccount: async (id: string): Promise<void> => {
    await api.delete(`/accounts/destination/${id}`);
  },

  importDestinationAccounts: async (file: File): Promise<{ status: string; message: string; errors?: string[] }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/accounts/destination/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};
