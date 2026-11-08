import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import CategoryBadge from './CategoryBadge';
import type { Post } from '../types';

/** 文章卡片：切角 + hover 强调色描边 + 位移硬阴影 */
export default function PostCard({ post, index }: { post: Post; index: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link to={`/post/${post.id}`} className="card-cut group flex h-full flex-col">
        {post.cover && (
          <div className="relative h-44 overflow-hidden border-b border-carbon">
            <img
              src={post.cover}
              alt={post.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        )}

        <div className="flex flex-1 flex-col gap-3 p-6">
          <div className="flex items-center gap-3">
            {post.category && <CategoryBadge name={post.category.name} color={post.category.color} />}
            <time className="font-mono text-xs text-smoke">{post.createdAt.slice(0, 10)}</time>
          </div>

          <h2 className="font-display text-xl font-bold leading-snug tracking-tight transition-colors group-hover:text-accent">
            {post.title}
          </h2>

          {post.excerpt && (
            <p className="line-clamp-3 flex-1 text-sm leading-relaxed text-fog">{post.excerpt}</p>
          )}

          <div className="mt-auto flex items-center justify-between border-t border-carbon pt-3 font-mono text-xs text-smoke">
            <span>@{post.author.username}</span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-volt" />
              {post.views} 阅读
            </span>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
