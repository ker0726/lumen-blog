/** 与后端 API 返回结构对齐的共享类型 */

export interface User {
  id: number;
  username: string;
  email: string;
  avatar: string | null;
  bio: string | null;
  createdAt: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  postCount?: number;
}

export interface Post {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  cover: string | null;
  tags: string[];
  views: number;
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
  author: { id: number; username: string; avatar: string | null };
  category: { id: number; name: string; color: string } | null;
}

export interface PostDetail extends Post {
  content: string;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface PaginatedPosts {
  list: Post[];
  pagination: Pagination;
}

/** 发布 / 编辑文章的提交载荷 */
export interface PostInput {
  title: string;
  content: string;
  excerpt?: string;
  cover?: string;
  categoryId?: number | null;
  tags?: string[];
  status?: 'draft' | 'published';
}
