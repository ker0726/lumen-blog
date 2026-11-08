/** 分类色块标签：颜色由分类自身的 color 字段驱动 */
export default function CategoryBadge({
  name,
  color,
  onClick,
  active,
}: {
  name: string;
  color: string;
  onClick?: () => void;
  active?: boolean;
}) {
  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={`chip transition-transform hover:-translate-y-0.5 ${active ? 'ring-2 ring-paper ring-offset-2 ring-offset-ink' : ''}`}
        style={{ backgroundColor: color }}
      >
        {name}
      </button>
    );
  }
  return (
    <span className="chip" style={{ backgroundColor: color }}>
      {name}
    </span>
  );
}
