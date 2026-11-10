import { useEffect, useState } from 'react';
import { App as AntApp, Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Switch, Table, Tag } from 'antd';
import { api } from '../api';
import { useAuth } from '../App';

type Row = { id: number; username: string; role: 'admin' | 'editor'; disabled: number; created_at: string };

export default function Users() {
  const { message } = AntApp.useApp();
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<Row | null>(null);
  const [form] = Form.useForm();
  const [resetForm] = Form.useForm();

  const load = () => api.get('/users').then((d) => setRows(d.users)).catch((e) => message.error(e.message));
  useEffect(() => { load(); }, []);

  const create = async () => {
    const values = await form.validateFields();
    try {
      await api.post('/users', values);
      message.success('账号已创建');
      setOpen(false);
      form.resetFields();
      load();
    } catch (err: any) {
      message.error(err.message);
    }
  };

  const resetPassword = async () => {
    const values = await resetForm.validateFields();
    try {
      await api.patch('/users/' + resetTarget!.id, { password: values.password });
      message.success('密码已重置，该账号需重新登录');
      setResetTarget(null);
      resetForm.resetFields();
    } catch (err: any) {
      message.error(err.message);
    }
  };

  const patch = async (row: Row, body: Record<string, unknown>) => {
    try {
      await api.patch('/users/' + row.id, body);
      load();
    } catch (err: any) {
      message.error(err.message);
    }
  };

  const remove = async (row: Row) => {
    try {
      await api.del('/users/' + row.id);
      message.success('已删除');
      load();
    } catch (err: any) {
      message.error(err.message);
    }
  };

  return (
    <Card title="账号管理" extra={<Button type="primary" onClick={() => setOpen(true)}>新增账号</Button>}>
      <Table
        size="middle"
        rowKey="id"
        dataSource={rows}
        pagination={false}
        columns={[
          { title: '账号', dataIndex: 'username' },
          {
            title: '角色', dataIndex: 'role', width: 110,
            render: (v: string) => <Tag color={v === 'admin' ? 'orange' : 'default'}>{v === 'admin' ? '管理员' : '编辑'}</Tag>
          },
          {
            title: '状态', dataIndex: 'disabled', width: 120,
            render: (v: number, row: Row) => (
              <Switch
                size="small"
                checked={!v}
                disabled={row.id === user?.id}
                onChange={(checked) => patch(row, { disabled: !checked })}
              />
            )
          },
          { title: '创建时间', dataIndex: 'created_at', render: (v: string) => new Date(v).toLocaleString('zh-CN') },
          {
            title: '', width: 190,
            render: (_: any, row: Row) => (
              <Space>
                <Button size="small" onClick={() => setResetTarget(row)}>重置密码</Button>
                <Popconfirm title={'删除账号 ' + row.username + '？'} onConfirm={() => remove(row)} disabled={row.id === user?.id}>
                  <Button size="small" danger disabled={row.id === user?.id}>删除</Button>
                </Popconfirm>
              </Space>
            )
          }
        ]}
      />

      <Modal title="新增账号" open={open} onCancel={() => setOpen(false)} onOk={create} okText="创建" cancelText="取消">
        <Form form={form} layout="vertical" initialValues={{ role: 'editor' }}>
          <Form.Item name="username" label="账号" rules={[{ required: true, message: '请输入账号' }]}>
            <Input placeholder="字母数字及 _ . -" />
          </Form.Item>
          <Form.Item name="password" label="初始密码" rules={[{ required: true, min: 8, message: '至少 8 位' }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="role" label="角色">
            <Select options={[{ value: 'editor', label: '编辑（可改内容、可发布）' }, { value: 'admin', label: '管理员（含账号与回滚）' }]} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={'重置密码：' + (resetTarget?.username || '')} open={Boolean(resetTarget)} onCancel={() => setResetTarget(null)} onOk={resetPassword} okText="重置" cancelText="取消">
        <Form form={resetForm} layout="vertical">
          <Form.Item name="password" label="新密码" rules={[{ required: true, min: 8, message: '至少 8 位' }]}>
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
