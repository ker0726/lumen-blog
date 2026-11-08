import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * 毛玻璃导航栏：
 * - backdrop-blur 常驻；滚动超过 24px 后底色加深 + 出现 1px 电光橙底边
 */
export default function Navbar() {
  const { user, isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `font-display text-sm font-bold uppercase tracking-wider transition-colors ${
      isActive ? 'text-accent' : 'text-fog hover:text-paper'
    }`;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 backdrop-blur-md transition-all duration-300 ${
        scrolled ? 'border-b border-accent/60 bg-ink/85' : 'border-b border-transparent bg-ink/40'
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 bg-accent" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 70%, 70% 100%, 0 100%)' }} />
          <span className="glitch font-display text-xl font-bold tracking-tight">LUMEN</span>
        </Link>

        <div className="flex items-center gap-6">
          <NavLink to="/" className={linkCls} end>
            文章
          </NavLink>
          {isLoggedIn ? (
            <>
              <NavLink to="/write" className={linkCls}>
                写作
              </NavLink>
              <NavLink to="/profile" className={linkCls}>
                {user?.username}
              </NavLink>
              <button onClick={handleLogout} className="font-display text-sm font-bold uppercase tracking-wider text-smoke transition-colors hover:text-magenta">
                退出
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={linkCls}>
                登录
              </NavLink>
              <Link to="/register" className="btn-primary !px-4 !py-2">
                加入
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
