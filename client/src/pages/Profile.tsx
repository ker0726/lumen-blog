import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { deletePost, fetchPosts } from '../api/posts';
import { errMsg } from '../api/client';
import { useAuth } from '../context/AuthContext';
import CategoryBadge from '../components/CategoryBadge';
import type { PaginatedPosts } from '../types';

const PAGE_SIZE = 10;

/** 个人中心：账号信息 + 我的文章管理（含草稿） */
export default function Profile() {
  const { user } = useAuth();
  const [data, setData] = useState<PaginatedPosts | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetchPosts({ page, pageSize: PAGE_SIZE, mine: true }));
      setError('');
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id: number) => {
    if (!window.confirm('确定删除这篇文章？该操作不可撤销。')) return;
    setDeletingId(id);
    try {
      await deletePost(id);
      await load();
    } catch (err) {
      alert(errMsg(err));
    } finally {
      setDeletingId(null);
    }
  };

  const published = data?.list.filter((p) => p.status === 'published').length ?? 0;

  return (
    <div className="mx-auto max-w-5xl px-6 pb-16 pt-24">
      {/* 账号卡片 */}
      <header className="card-cut flex flex-wrap items-center gap-6 !border-accent/40 p-8 hover:!translate-y-0 hover:!shadow-none">
        <span className="flex h-16 w-16 items-center justify-center bg-accent font-display text-2xl font-bold text-ink">
          {user?.username.slice(0, 1).toUpperCase()}
        </span>
        <div className="flex-1">
          <h1 className="font-display text-3xl font-bold tracking-tight">{user?.username}</h1>
          <p className="mt-1 font-mono text-sm text-fog">{user?.email}</p>
          {user?.bio && <p className="mt-2 text-sm text-fog">{user.bio}</p>}
        </div>
        <div className="flex gap-6 font-mono text-sm">
          <div className="text-center">
            <p className="font-display text-2xl font-bold text-volt">{data?.pagination.total ?? '–'}</p>
            <p className="text-xs text-smoke">全部文章</p>
          </div>
          <div className="text-center">
            <p className="font-display text-2xl font-bold text-accent">{published}</p>
            <p className="text-xs text-smoke">已发布</p>
          </div>
        </div>
        <Link to="/write" className="btn-primary">
          + 写新文章
        </Link>
      </header>

      {/* 我的文章列表 */}
      <section className="mt-10">
        <h2 className="mb-6 font-display text-xl font-bold uppercase tracking-wider text-fog">
          我的文章 /
        </h2>

        {error && (
          <div className="border border-magenta/50 bg-magenta/10 px-4 py-3 text-sm text-magenta">{error}</div>
        )}

        {!error && loading && !data && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse border border-carbon bg-carbon/30" />
            ))}
          </div>
        )}

        {data && data.list.length === 0 && (
          <div className="border border-carbon px-6 py-16 text-center text-fog">
            <p className="font-display text-xl font-bold">还没有文章</p>
            <p className="mt-2 text-sm">第一篇往往最难，但也最值得。</p>
          </div>
        )}

        {data && data.list.length > 0 && (
          <ul className="space-y-3">
            {data.list.map((post) => (
              <li
                key={post.id}
                className="flex flex-wrap items-center gap-4 border border-carbon px-5 py-4 transition-colors hover:border-accent/60"
              >
                <span
                  className={`chip ${post.status === 'draft' ? 'bg-magenta' : 'bg-volt'}`}
                >
                  {post.status === 'draft' ? '草稿' : '已发布'}
                </span>

                <Link
                  to={`/post/${post.id}`}
                  className="min-w-0 flex-1 truncate font-display text-lg font-bold transition-colors hover:text-accent"
                >
                  {post.title}
                </Link>

                {post.category && <CategoryBadge name={post.category.name} color={post.category.color} />}

                <span className="font-mono text-xs text-smoke">
                  {post.updatedAt.slice(0, 10)} · {post.views} 阅读
                </span>

                <div className="flex gap-2">
                  <Link to={`/write?id=${post.id}`} className="btn-ghost !px-3 !py-1 !text-xs">
                    编辑
                  </Link>
                  <button
                    onClick={() => handleDelete(post.id)}
                    disabled={deletingId === post.id}
                    className="btn-ghost !px-3 !py-1 !text-xs hover:!border-magenta hover:!text-magenta disabled:opacity-40"
                  >
                    {deletingId === post.id ? '…' : '删除'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {data && data.pagination.totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-4 font-mono text-sm">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="btn-ghost !px-4 !py-2 disabled:opacity-30"
            >
              ← 上一页
            </button>
            <span className="text-fog">
              {data.pagination.page} / {data.pagination.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
              disabled={page >= data.pagination.totalPages}
              className="btn-ghost !px-4 !py-2 disabled:opacity-30"
            >
              下一页 →
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
