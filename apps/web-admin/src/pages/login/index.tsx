import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';
import type { LoginResponse } from '@short-link/shared';
import { HttpError } from '@short-link/shared/http';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  Input,
} from '@short-link/ui';

import { login } from '@/api/auth';
import { auth } from '@/router/guards';

interface FieldErrors {
  email?: string;
  password?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * 登录页面。
 *
 * 调用后端 `/api/v1/auth/login` 接口，成功后将 token 存入 localStorage。
 * 表单使用 shadcn 的 Field/Input/Button 组合实现，校验遵循 data-invalid + aria-invalid 约定。
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const validate = (): boolean => {
    const next: FieldErrors = {};
    if (!email) {
      next.email = '请填写邮箱';
    } else if (!EMAIL_PATTERN.test(email)) {
      next.email = '请输入有效的邮箱地址';
    }
    if (!password) {
      next.password = '请填写密码';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    if (!validate()) {
      return;
    }

    setLoading(true);
    try {
      const response = (await login({ email, password }).send()) as LoginResponse;
      auth.setToken(response.access_token);
      const from = params.get('from') || '/';
      navigate(from, { replace: true });
    } catch (err) {
      setFormError(err instanceof HttpError ? err.message || '登录失败' : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">欢迎回来</CardTitle>
        <CardDescription>登录以管理你的短链服务</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} noValidate>
          <FieldGroup>
            <Field data-invalid={errors.email ? true : undefined}>
              <FieldLabel htmlFor="email">邮箱</FieldLabel>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="name@example.com"
                value={email}
                aria-invalid={errors.email ? true : undefined}
                onChange={(e) => setEmail(e.target.value)}
              />
              <FieldError>{errors.email}</FieldError>
            </Field>
            <Field data-invalid={errors.password ? true : undefined}>
              <FieldLabel htmlFor="password">密码</FieldLabel>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="请输入密码"
                value={password}
                aria-invalid={errors.password ? true : undefined}
                onChange={(e) => setPassword(e.target.value)}
              />
              <FieldError>{errors.password}</FieldError>
            </Field>
            {formError && (
              <FieldError className="text-center">{formError}</FieldError>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <LoaderCircle className="animate-spin" data-icon="inline-start" />}
              登录
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
