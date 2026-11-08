import axios, { AxiosError } from 'axios';

const TOKEN_KEY = 'lumen_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * axios 实例：开发期走 Vite 代理（/api），生产通过 VITE_API_BASE_URL 指向线上后端
 * 例：VITE_API_BASE_URL=https://lumen-api.onrender.com/api
 */
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || '/api';
export const api = axios.create({ baseURL: API_BASE, timeout: 10000 });

// 请求拦截：自动注入 Authorization
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 响应拦截：401 统一清 token 并跳登录页（写操作场景）
api.interceptors.response.use(
  (res) => res,
  (error: AxiosError<{ message?: string }>) => {
    if (error.response?.status === 401) {
      clearToken();
      // 仅在需要登录的操作上跳转；浏览类接口的 401 由页面自行处理
      if (!window.location.pathname.startsWith('/login')) {
        const redirect = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login?redirect=${redirect}`;
      }
    }
    return Promise.reject(error);
  }
);

/** 从 AxiosError 提取人类可读错误信息 */
export function errMsg(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message ?? error.message ?? '请求失败';
  }
  return error instanceof Error ? error.message : '未知错误';
}
