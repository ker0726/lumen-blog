import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { deletePost, fetchPost } from '../api/posts';
import { errMsg } from '../api/client';
import { useAuth } from '../context/AuthContext';
import CategoryBadge from '../components/CategoryBadge';
import type { PostDetail } from '../types';

/** 文章详情：纸白阅读区 + 定制 prose 渲染 Markdown */
export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [post, setPost] = useState<PostDetail | null>(null);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchPost(Number(id))
      .then(setPost)
      .catch((err) => setError(errMsg(err)));
  }, [id]);

  const isOwner = post !== null && user?.id === post.author.id;

  const handleDelete = async () => {
    if (!post || !window.confirm('确定删除这篇文章？该操作不可撤销。')) return;
    setDeleting(true);
    try {
      await deletePost(post.id);
      navigate('/profile');
    } catch (err) {
      alert(errMsg(err));
      setDeleting(false);
    }
  };

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-6 pt-32 text-center">
        <p className="font-display text-4xl font-bold text-magenta">加载失败</p>
        <p className="mt-4 text-fog">{error}</p>
        <Link to="/" className="btn-ghost mt-8">
          ← 返回首页
        </Link>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="mx-auto max-w-3xl animate-pulse px-6 pt-32">
        <div className="h-10 w-2/3 bg-carbon/50" />
        <div className="mt-6 h-4 w-1/3 bg-carbon/40" />
        <div className="mt-10 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-4 bg-carbon/30" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <article className="pt-16">
      {/* 头部：墨底标题区 */}
      <header className="border-b border-carbon bg-grid bg-noise">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <div className="flex flex-wrap items-center gap-3">
            {post.category && <CategoryBadge name={post.category.name} color={post.category.color} />}
            <time className="font-mono text-xs text-smoke">{post.createdAt.slice(0, 10)}</time>
            <span className="font-mono text-xs text-smoke">{post.views} 阅读</span>
            {post.status === 'draft' && (
              <span className="chip bg-magenta">草稿 · 仅自己可见</span>
            )}
          </div>

          <h1 className="mt-6 font-display text-4xl font-bold leading-tight tracking-tight md:text-5xl">
            {post.title}
          </h1>

          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center bg-accent font-display text-sm font-bold text-ink">
                {post.author.username.slice(0, 1).toUpperCase()}
              </span>
              <span className="font-mono text-sm text-fog">@{post.author.username}</span>
            </div>

            {/* 仅作者本人可见操作入口 */}
            {isOwner && (
              <div className="flex gap-2">
                <Link to={`/write?id=${post.id}`} className="btn-ghost !px-4 !py-1.5 !text-xs">
                  编辑
                </Link>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="btn-ghost !px-4 !py-1.5 !text-xs hover:!border-magenta hover:!text-magenta"
                >
                  {deleting ? '删除中…' : '删除'}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 封面 */}
      {post.cover && (
        <div className="mx-auto max-w-3xl px-6 pt-10">
          <img src={post.cover} alt={post.title} className="w-full rounded-lg shadow-[0_16px_48px_rgba(0,0,0,0.5)]" />
        </div>
      )}

      {/* 正文：定制 prose */}
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="prose-lumen">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
        </div>

        {/* 标签 */}
        {post.tags.length > 0 && (
          <div className="mt-12 flex flex-wrap gap-2 border-t border-carbon pt-6">
            {post.tags.map((tag) => (
              <span key={tag} className="border border-carbon px-3 py-1 font-mono text-xs text-volt">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
