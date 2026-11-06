import axios from 'axios';
import type { ApiResponse } from '../types';

export const TOKEN_KEY = 'oquv_markaz_token';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Token yaroqsiz bo'lsa, foydalanuvchi login sahifasiga qaytariladi
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url: string = error?.config?.url || '';
    if (error?.response?.status === 401 && !url.includes('/auth/login')) {
      localStorage.removeItem(TOKEN_KEY);
      if (window.location.pathname !== '/login') window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const message = (err.response?.data as { message?: string } | undefined)?.message;
    if (message) return message;
    if (err.code === 'ERR_NETWORK') return "Serverga ulanib bo'lmadi";
    return err.message;
  }
  return "Noma'lum xatolik yuz berdi";
}

export type Params = Record<string, string | number | undefined | null>;

function clean(params?: Params) {
  if (!params) return undefined;
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  );
}

export async function get<T>(url: string, params?: Params): Promise<T> {
  const res = await api.get<ApiResponse<T>>(url, { params: clean(params) });
  return res.data.data;
}

export async function post<T>(url: string, body?: unknown): Promise<T> {
  const res = await api.post<ApiResponse<T>>(url, body);
  return res.data.data;
}

export async function put<T>(url: string, body?: unknown): Promise<T> {
  const res = await api.put<ApiResponse<T>>(url, body);
  return res.data.data;
}

export async function del(url: string): Promise<void> {
  await api.delete(url);
}
