import { useState } from 'react';
import { App as AntApp, Button, Card, Form, Input, Typography } from 'antd';
import { login } from '../api';
import { useAuth } from '../App';

export default function Login() {
  const { message } = AntApp.useApp();
  const { setUser } = useAuth();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      const user = await login(values.username, values.password);
      setUser(user);
    } catch (err: any) {
      message.error(err.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      <Card className="login-card">
        <Typography.Title level={4} style={{ marginTop: 0 }}>福汇官网后台</Typography.Title>
        <Typography.Paragraph className="muted" style={{ marginBottom: 20 }}>
          仅限内部运营人员使用
        </Typography.Paragraph>
        <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item name="username" label="账号" rules={[{ required: true, message: '请输入账号' }]}>
            <Input autoComplete="username" autoFocus />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>登录</Button>
        </Form>
      </Card>
    </div>
  );
}
