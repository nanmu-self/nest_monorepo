import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Form, Input, Typography } from 'antd';
import type { LoginResponse } from '@short-link/shared';
import { HttpError } from '@short-link/shared/http';

import { login } from '@/api/auth';
import { auth } from '@/router/guards';

interface LoginFormValues {
  email: string;
  password: string;
}

/**
 * 登录页面。
 *
 * 调用后端 `/api/v1/auth/login` 接口，成功后将 token 存入 localStorage。
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (values: LoginFormValues) => {
    setLoading(true);
    setError(null);

    try {
      const response = (await login(values).send()) as LoginResponse;
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
    <Form<LoginFormValues> layout="vertical" onFinish={handleSubmit} autoComplete="on">
      <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: 4 }}>
        欢迎回来
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ textAlign: 'center', marginBottom: 16 }}>
        登录以管理你的短链服务
      </Typography.Paragraph>
      <Form.Item
        label="邮箱"
        name="email"
        rules={[
          { required: true, message: '请填写邮箱' },
          { type: 'email', message: '请输入有效的邮箱地址' },
        ]}
      >
        <Input autoComplete="username" placeholder="name@example.com" />
      </Form.Item>
      <Form.Item label="密码" name="password" rules={[{ required: true, message: '请填写密码' }]}>
        <Input.Password autoComplete="current-password" placeholder="请输入密码" />
      </Form.Item>
      {error && (
        <Typography.Paragraph type="danger" style={{ textAlign: 'center', marginBottom: 0 }}>
          {error}
        </Typography.Paragraph>
      )}
      <Form.Item style={{ marginTop: 8, marginBottom: 0 }}>
        <Button type="primary" htmlType="submit" block loading={loading}>
          登录
        </Button>
      </Form.Item>
    </Form>
  );
}
