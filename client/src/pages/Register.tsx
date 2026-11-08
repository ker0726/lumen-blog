import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerApi } from '../api/auth';
import { errMsg } from '../api/client';
import { useAuth } from '../context/AuthContext';

/** 注册页：前端先做基础校验，后端仍有完整校验链兜底 */
export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (username.trim().length < 3 || username.trim().length > 20) {
      return setError('用户名需为 3-20 位');
    }
    if (password.length < 8) return setError('密码至少 8 位');
    if (password !== confirm) return setError('两次输入的密码不一致');

    setSubmitting(true);
    try {
      const { token, user } = await registerApi({
        username: username.trim(),
        email: email.trim(),
        password,
      });
      login(token, user);
      navigate('/', { replace: true });
    } catch (err) {
      setError(errMsg(err));
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6 pt-16">
      <div className="w-full max-w-md">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-volt">Sign Up</p>
        <h1 className="mt-2 font-display text-5xl font-bold tracking-tight">
          成为作者<span className="text-volt">.</span>
        </h1>
        <p className="mt-3 text-sm text-fog">一个账号，就是一本属于你自己的杂志。</p>

        <form onSubmit={handleSubmit} className="mt-10 space-y-5">
          {error && (
            <div className="border border-magenta/50 bg-magenta/10 px-4 py-3 text-sm text-magenta">
              {error}
            </div>
          )}

          <div>
            <label className="mb-2 block font-mono text-xs uppercase tracking-wider text-fog">
              用户名（3-20 位）
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={20}
              placeholder="你的笔名"
              className="field"
            />
          </div>

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
              密码（至少 8 位）
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="••••••••"
              className="field"
            />
          </div>

          <div>
            <label className="mb-2 block font-mono text-xs uppercase tracking-wider text-fog">
              确认密码
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              placeholder="••••••••"
              className="field"
            />
          </div>

          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? '创建中…' : '创建账号 →'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-fog">
          已有账号？{' '}
          <Link to="/login" className="font-bold text-accent hover:text-volt">
            直接登录
          </Link>
        </p>
      </div>
    </div>
  );
}
