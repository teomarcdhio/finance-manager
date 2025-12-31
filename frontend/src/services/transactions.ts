import { api } from '@/lib/api';

export interface Transaction {
  id: string;
  name: string;
  type: string;
  amount: number;
  target_account: string;
  account_id: string;
  date: string;
  recurrency?: any;
}

export const transactionService = {
  getTransactions: async (params?: {
    skip?: number;
    limit?: number;
    start_date?: string;
    end_date?: string;
    account_id?: string;
  }): Promise<Transaction[]> => {
    const response = await api.get<Transaction[]>('/transactions/', { params });
    return response.data;
  },

  createTransaction: async (data: Omit<Transaction, 'id'>): Promise<Transaction> => {
    const response = await api.post<Transaction>('/transactions/', data);
    return response.data;
  },

  updateTransaction: async (id: string, data: Partial<Transaction>): Promise<Transaction> => {
    const response = await api.put<Transaction>(`/transactions/${id}`, data);
    return response.data;
  },

  deleteTransaction: async (id: string): Promise<Transaction> => {
    const response = await api.delete<Transaction>(`/transactions/${id}`);
    return response.data;
  },

  bulkDeleteTransactions: async (ids: string[]): Promise<any> => {
    const response = await api.post('/transactions/bulk-delete', ids);
    return response.data;
  },

  importTransactions: async (file: File, accountId?: string): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const params = accountId ? { account_id: accountId } : {};
    
    const response = await api.post('/transactions/import', formData, {
      params,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};
