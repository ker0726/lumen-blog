import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { loginApi } from '../api/auth';
import { errMsg } from '../api/client';
import { useAuth } from '../context/AuthContext';

/** 登录页：成功后回跳 redirect 参数或首页 */
export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { token, user } = await loginApi({ email: email.trim(), password });
      login(token, user);
      navigate(searchParams.get('redirect') ?? '/', { replace: true });
    } catch (err) {
      setError(errMsg(err));
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6 pt-16">
      <div className="w-full max-w-md">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent">Sign In</p>
        <h1 className="mt-2 font-display text-5xl font-bold tracking-tight">
          欢迎回来<span className="text-accent">.</span>
        </h1>
        <p className="mt-3 text-sm text-fog">继续你的写作，或者只是来读点什么。</p>

        <form onSubmit={handleSubmit} className="mt-10 space-y-5">
          {error && (
            <div className="border border-magenta/50 bg-magenta/10 px-4 py-3 text-sm text-magenta">
              {error}
            </div>
          )}

          <div>
            <label className="mb-2 block font-mono text-xs uppercase tracking-wider text-fog">
              邮箱
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="field"
            />
          </div>

          <div>
            <label className="mb-2 block font-mono text-xs uppercase tracking-wider text-fog">
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="field"
            />
          </div>

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? '登录中…' : '登录 →'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-fog">
          还没有账号？{' '}
          <Link to="/register" className="font-bold text-volt hover:text-accent">
            立即注册
          </Link>
        </p>
      </div>
    </div>
  );
}
