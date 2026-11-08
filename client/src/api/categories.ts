import { api } from './client';
import type { ApiResponse, Category } from '../types';

export async function fetchCategories(): Promise<Category[]> {
  const res = await api.get<ApiResponse<Category[]>>('/categories');
  return res.data.data;
}
