import { api } from './client';
import type { ApiResponse, PaginatedPosts, Post, PostDetail, PostInput } from '../types';

export interface PostListQuery {
  page?: number;
  pageSize?: number;
  category?: string;
  keyword?: string;
  sort?: 'latest' | 'hottest';
  mine?: boolean;
}

export async function fetchPosts(query: PostListQuery): Promise<PaginatedPosts> {
  const res = await api.get<ApiResponse<PaginatedPosts>>('/posts', { params: query });
  return res.data.data;
}

export async function fetchPost(id: number): Promise<PostDetail> {
  const res = await api.get<ApiResponse<PostDetail>>(`/posts/${id}`);
  return res.data.data;
}

export async function createPost(input: PostInput): Promise<Post> {
  const res = await api.post<ApiResponse<Post>>('/posts', input);
  return res.data.data;
}

export async function updatePost(id: number, input: PostInput): Promise<Post> {
  const res = await api.put<ApiResponse<Post>>(`/posts/${id}`, input);
  return res.data.data;
}

export async function deletePost(id: number): Promise<void> {
  await api.delete(`/posts/${id}`);
}
