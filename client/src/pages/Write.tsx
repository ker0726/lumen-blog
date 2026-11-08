import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { createPost, fetchPost, updatePost } from '../api/posts';
import { fetchCategories } from '../api/categories';
import { errMsg } from '../api/client';
import type { Category, PostInput } from '../types';

/**
 * 写作页：
 * - 桌面端左编辑右预览；移动端 Tab 切换
 * - 带 ?id=xxx 进入编辑模式，回填字段（仅作者本人，后端二次校验）
 */
export default function Write() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id') ? Number(searchParams.get('id')) : null;

  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [cover, setCover] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [tagsInput, setTagsInput] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('published');

  const [loadingEdit, setLoadingEdit] = useState(editId !== null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit');

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => undefined);
  }, []);

  // 编辑模式：加载原文回填
  useEffect(() => {
    if (!editId) return;
    fetchPost(editId)
      .then((post) => {
        setTitle(post.title);
        setContent(post.content);
        setCover(post.cover ?? '');
        setExcerpt(post.excerpt ?? '');
        setCategoryId(post.category?.id ?? '');
        setTagsInput(post.tags.join(', '));
        setStatus(post.status);
      })
      .catch((err) => setError(errMsg(err)))
      .finally(() => setLoadingEdit(false));
  }, [editId]);

  const tags = useMemo(
    () =>
      tagsInput
        .split(/[,，]/)
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 10),
    [tagsInput]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) return setError('标题不能为空');
    if (!content.trim()) return setError('正文不能为空');
    if (cover && !/^https?:\/\/.+/.test(cover)) return setError('封面需为 http(s) 开头的合法 URL');

    const payload: PostInput = {
      title: title.trim(),
      content,
      excerpt: excerpt.trim() || undefined,
      cover: cover.trim() || undefined,
      categoryId: categoryId === '' ? null : categoryId,
      tags,
      status,
    };

    setSubmitting(true);
    try {
      const saved = editId ? await updatePost(editId, payload) : await createPost(payload);
      navigate(`/post/${saved.id}`);
    } catch (err) {
      setError(errMsg(err));
      setSubmitting(false);
    }
  };

  if (loadingEdit) {
    return (
      <div className="mx-auto max-w-6xl animate-pulse px-6 pt-32">
        <div className="h-10 w-1/2 bg-carbon/50" />
        <div className="mt-8 h-96 bg-carbon/30" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 pb-16 pt-24">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent">
            {editId ? `Edit · #${editId}` : 'New Post'}
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">
            {editId ? '编辑文章' : '写点什么'}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as 'draft' | 'published')}
            className="field !w-auto font-mono text-sm"
          >
            <option value="published">公开发布</option>
            <option value="draft">存为草稿</option>
          </select>
          <button onClick={handleSubmit} disabled={submitting} className="btn-primary">
            {submitting ? '提交中…' : editId ? '保存修改' : '发布'}
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-6 border border-magenta/50 bg-magenta/10 px-4 py-3 text-sm text-magenta">
          {error}
        </div>
      )}

      {/* 元信息区 */}
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="文章标题（必填）"
          maxLength={200}
          className="field font-display text-lg font-bold md:col-span-2"
        />
        <input
          value={cover}
          onChange={(e) => setCover(e.target.value)}
          placeholder="封面图 URL（可选，https://…）"
          className="field font-mono text-sm"
        />
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value === '' ? '' : Number(e.target.value))}
          className="field"
        >
          <option value="">选择分类（可选）</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        <input
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="标签，用逗号分隔，最多 10 个（可选）"
          className="field font-mono text-sm"
        />
        <input
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          placeholder="摘要（可选，留空自动截取正文前 200 字）"
          maxLength={500}
          className="field text-sm"
        />
      </div>

      {/* 移动端 Tab 切换 */}
      <div className="mb-4 flex gap-2 md:hidden">
        {(['edit', 'preview'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setMobileTab(tab)}
            className={`flex-1 border py-2 font-display text-sm font-bold uppercase ${
              mobileTab === tab ? 'border-accent text-accent' : 'border-carbon text-smoke'
            }`}
          >
            {tab === 'edit' ? '编辑' : '预览'}
          </button>
        ))}
      </div>

      {/* 编辑 / 预览双栏 */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className={mobileTab === 'edit' ? '' : 'hidden md:block'}>
          <p className="mb-2 font-mono text-xs uppercase tracking-wider text-smoke">
            Markdown 编辑
          </p>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={'# 在这里开始写作…\n\n支持 GFM：表格、删除线、任务列表、代码块。'}
            className="field h-[32rem] resize-y font-mono text-sm leading-relaxed"
          />
        </div>

        <div className={mobileTab === 'preview' ? '' : 'hidden md:block'}>
          <p className="mb-2 font-mono text-xs uppercase tracking-wider text-smoke">实时预览</p>
          <div className="h-[32rem] overflow-y-auto border border-carbon bg-carbon/20 p-6">
            {content.trim() ? (
              <div className="prose-lumen">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-smoke">预览区：开始输入后这里会实时渲染。</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
