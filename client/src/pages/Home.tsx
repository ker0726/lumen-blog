import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchPosts } from '../api/posts';
import { fetchCategories } from '../api/categories';
import { errMsg } from '../api/client';
import PostCard from '../components/PostCard';
import CategoryBadge from '../components/CategoryBadge';
import type { Category, PaginatedPosts } from '../types';

const PAGE_SIZE = 9;

/**
 * 首页：
 * Hero（超大错位标题 + 网格/噪点背景）→ 分类墙 → 搜索/排序 → 卡片流 → 分页
 */
export default function Home() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [data, setData] = useState<PaginatedPosts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 筛选状态
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState<string>('');
  const [keyword, setKeyword] = useState('');
  const [sort, setSort] = useState<'latest' | 'hottest'>('latest');

  // 搜索防抖：300ms 内连续输入不触发请求
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setDebouncedKeyword(keyword.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [keyword]);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => undefined);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchPosts({
        page,
        pageSize: PAGE_SIZE,
        category: category || undefined,
        keyword: debouncedKeyword || undefined,
        sort,
      });
      setData(result);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  }, [page, category, debouncedKeyword, sort]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleCategory = (slug: string) => {
    setCategory((prev) => (prev === slug ? '' : slug));
    setPage(1);
  };

  return (
    <div>
      {/* ===== Hero：超大错位标题 + 网格噪点背景 ===== */}
      <section className="bg-grid bg-noise relative overflow-hidden border-b border-carbon pt-16">
        <div className="pointer-events-none absolute -right-20 top-10 h-64 w-64 rotate-12 bg-accent/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 bottom-0 h-48 w-48 bg-volt/10 blur-3xl" />

        <div className="mx-auto max-w-6xl px-6 pb-20 pt-16 md:pt-24">
          <p className="mb-4 inline-block bg-volt px-2 py-1 font-mono text-xs font-bold uppercase tracking-[0.3em] text-ink">
            Issue · 001 — Digital Magazine
          </p>
          <h1 className="glitch font-display text-[clamp(3rem,10vw,8rem)] font-bold leading-[0.95] tracking-tight">
            LUMEN
            <span className="text-accent">.</span>
          </h1>
          <p className="mt-2 font-display text-[clamp(1.5rem,4vw,3rem)] font-bold leading-tight tracking-tight text-stroke">
            会发光的数码杂志
          </p>
          <p className="mt-6 max-w-xl leading-[1.7] text-fog">
            关于前端工程、设计系统与产品思考的独立写作。
            不追热点，不凑字数，只放经得起回看的内容。
          </p>

          {/* 搜索框 */}
          <div className="mt-10 flex max-w-xl items-center border border-carbon bg-ink/70 backdrop-blur focus-within:border-accent">
            <span className="pl-4 font-mono text-accent">&gt;</span>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索文章标题或摘要…"
              className="w-full bg-transparent px-3 py-3 text-paper outline-none placeholder:text-smoke"
            />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 py-12">
        {/* ===== 分类墙 ===== */}
        <section className="mb-10 flex flex-wrap items-center gap-3">
          <span className="font-display text-sm font-bold uppercase tracking-wider text-smoke">
            分类 /
          </span>
          {categories.map((cat) => (
            <CategoryBadge
              key={cat.id}
              name={`${cat.name} ${cat.postCount ?? 0}`}
              color={cat.color}
              active={category === cat.slug}
              onClick={() => toggleCategory(cat.slug)}
            />
          ))}

          {/* 排序切换 */}
          <div className="ml-auto flex gap-2 font-mono text-xs">
            {(['latest', 'hottest'] as const).map((s) => (
              <button
                key={s}
                onClick={() => {
                  setSort(s);
                  setPage(1);
                }}
                className={`border px-3 py-1.5 uppercase transition-colors ${
                  sort === s
                    ? 'border-accent text-accent'
                    : 'border-carbon text-smoke hover:border-smoke hover:text-fog'
                }`}
              >
                {s === 'latest' ? '最新' : '最热'}
              </button>
            ))}
          </div>
        </section>

        {/* ===== 文章卡片流 ===== */}
        {error && (
          <div className="border border-magenta/50 bg-magenta/10 px-4 py-3 text-sm text-magenta">
            加载失败：{error}
          </div>
        )}

        {!error && loading && !data && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 animate-pulse border border-carbon bg-carbon/30" />
            ))}
          </div>
        )}

        {data && data.list.length === 0 && (
          <div className="border border-carbon px-6 py-20 text-center text-fog">
            <p className="font-display text-2xl font-bold">暂无匹配的文章</p>
            <p className="mt-2 text-sm">换个关键词，或者取消分类筛选试试。</p>
          </div>
        )}

        {data && data.list.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {data.list.map((post, i) => (
              <PostCard key={post.id} post={post} index={i} />
            ))}
          </div>
        )}

        {/* ===== 分页 ===== */}
        {data && data.pagination.totalPages > 1 && (
          <div className="mt-12 flex items-center justify-center gap-4 font-mono text-sm">
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
      </div>
    </div>
  );
}
