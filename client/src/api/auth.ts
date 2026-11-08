import { api } from './client';
import type { ApiResponse, User } from '../types';

interface AuthPayload {
  token: string;
  user: User;
}

export async function registerApi(data: {
  username: string;
  email: string;
  password: string;
}): Promise<AuthPayload> {
  const res = await api.post<ApiResponse<AuthPayload>>('/auth/register', data);
  return res.data.data;
}

export async function loginApi(data: { email: string; password: string }): Promise<AuthPayload> {
  const res = await api.post<ApiResponse<AuthPayload>>('/auth/login', data);
  return res.data.data;
}
