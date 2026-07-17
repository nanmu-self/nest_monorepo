import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { auth } from '@/router/guards';

/**
 * 登录页占位实现。
 *
 * TODO：接后端 `/api/v1/auth/login`，成功后将 token 存入 localStorage。
 * 目前先接受任意非空账号密码，直接落一个假的 token 以打通路由/守卫流程。
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!username || !password) {
      setError('请填写账号和密码');
      return;
    }
    auth.setToken('dev-token');
    const from = params.get('from') || '/';
    navigate(from, { replace: true });
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h1>登录</h1>
      <label>
        账号
        <input
          type="text"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
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
      <button type="submit">登录</button>
    </form>
  );
}
