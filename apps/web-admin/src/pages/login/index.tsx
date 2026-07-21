import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { LoginResponse } from '@short-link/shared';
import { HttpError } from '@short-link/shared/http';

import { login } from '@/api/auth';
import { auth } from '@/router/guards';

/**
 * 登录页面。
 *
 * 调用后端 `/api/v1/auth/login` 接口，成功后将 token 存入 localStorage。
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email || !password) {
      setError('请填写邮箱和密码');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = (await login({ email, password }).send()) as LoginResponse;
      auth.setToken(response.access_token);
      const from = params.get('from') || '/';
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof HttpError) {
        setError(err.message || '登录失败');
      } else {
        setError('登录失败');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h1>登录</h1>
      <label>
        邮箱
        <input
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label>
        密码
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {error && <p className="auth-error">{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? '登录中...' : '登录'}
      </button>
    </form>
  );
}
