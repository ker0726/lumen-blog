import crypto from 'crypto';

/**
 * 生成文章 slug：
 * - 转小写，非字母数字（含中文）统一压缩为连字符
 * - 中文标题转写后可能为空，退化为 'post'
 * - 追加 6 位随机后缀，避免同名标题冲突
 */
export function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'post';
  const suffix = crypto.randomBytes(3).toString('hex');
  return `${base}-${suffix}`;
}
