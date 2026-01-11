import { api } from '@/lib/api';
import { Transaction } from './transactions';

export interface ReportRequest {
  account_id?: string;
  start_date?: string;
  end_date?: string;
  skip?: number;
  limit?: number;
}

export interface CategoryReportRequest extends ReportRequest {
  category_ids?: string[];
}

export interface TypeReportRequest extends ReportRequest {
  types?: string[];
}

export interface ReportResponse {
  total: number;
  transactions: Transaction[];
}

export const reportService = {
  getCategoryReport: async (data: CategoryReportRequest) => {
    const response = await api.post<ReportResponse>('/reports/category', data);
    return response.data;
  },
  getTypeReport: async (data: TypeReportRequest) => {
    const response = await api.post<ReportResponse>('/reports/type', data);
    return response.data;
  },
};
