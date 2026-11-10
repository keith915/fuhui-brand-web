import { useEffect, useState } from 'react';
import { App as AntApp, Button, Card, Form, Input, Modal, Popconfirm, Switch, Table, Tag, Space } from 'antd';
import { api } from '../api';

type NewsRow = {
  id?: number;
  date: string;
  kind_zh: string; kind_en: string;
  title_zh: string; title_en: string;
  summary_zh: string; summary_en: string;
  published: number;
  sort: number;
};

const EMPTY: NewsRow = {
  date: new Date().toISOString().slice(0, 10),
  kind_zh: '新闻', kind_en: 'News',
  title_zh: '', title_en: '', summary_zh: '', summary_en: '',
  published: 1, sort: 0
};

export default function News() {
  const { message } = AntApp.useApp();
  const [rows, setRows] = useState<NewsRow[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<NewsRow | null>(null);
  const [form] = Form.useForm();

  const load = () => api.get('/news').then((d) => setRows(d.news)).catch((e) => message.error(e.message));
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    form.setFieldsValue(EMPTY);
    setOpen(true);
  };

  const openEdit = (row: NewsRow) => {
    setEditing(row);
    form.setFieldsValue(row);
    setOpen(true);
  };

  const submit = async () => {
    const values = await form.validateFields();
    try {
      if (editing?.id) await api.put('/news/' + editing.id, values);
      else await api.post('/news', values);
      message.success('已保存，发布后生效');
      setOpen(false);
      load();
    } catch (err: any) {
      message.error(err.message);
    }
  };

  const toggle = async (row: NewsRow, value: boolean) => {
    try {
      await api.patch('/news/' + row.id + '/publish', { published: value });
      load();
    } catch (err: any) {
      message.error(err.message);
    }
  };

  const remove = async (row: NewsRow) => {
    try {
      await api.del('/news/' + row.id);
      message.success('已删除');
      load();
    } catch (err: any) {
      message.error(err.message);
    }
  };

  return (
    <Card title="平台动态" extra={<Button type="primary" onClick={openCreate}>新增动态</Button>}>
      <Table
        size="middle"
        rowKey="id"
        dataSource={rows}
        pagination={false}
        columns={[
          { title: '日期', dataIndex: 'date', width: 110 },
          { title: '类型', dataIndex: 'kind_zh', width: 80, render: (v: string) => <Tag>{v}</Tag> },
          { title: '标题', dataIndex: 'title_zh', ellipsis: true },
          {
            title: '状态', dataIndex: 'published', width: 100,
            render: (v: number, row: NewsRow) => (
              <Switch size="small" checked={Boolean(v)} onChange={(val) => toggle(row, val)} />
            )
          },
          {
            title: '', width: 150,
            render: (_: any, row: NewsRow) => (
              <Space>
                <Button size="small" onClick={() => openEdit(row)}>编辑</Button>
                <Popconfirm title="确认删除这条动态？" onConfirm={() => remove(row)}>
                  <Button size="small" danger>删除</Button>
                </Popconfirm>
              </Space>
            )
          }
        ]}
      />

      <Modal
        title={editing ? '编辑动态' : '新增动态'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={submit}
        width={720}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <div className="field-grid">
            <Form.Item name="date" label="日期" rules={[{ required: true, message: '请选择日期' }]}>
              <Input placeholder="2026-11-10" />
            </Form.Item>
            <div className="field-grid">
              <Form.Item name="kind_zh" label="类型（中文）"><Input placeholder="新闻 / 政策 / 公告" /></Form.Item>
              <Form.Item name="kind_en" label="类型（英文）"><Input placeholder="News / Policy" /></Form.Item>
            </div>
          </div>
          <Form.Item name="title_zh" label="标题（中文）" rules={[{ required: true, message: '请输入中文标题' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="title_en" label="标题（英文）"><Input /></Form.Item>
          <Form.Item name="summary_zh" label="摘要（中文）"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="summary_en" label="摘要（英文）"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="published" label="发布到前台" valuePropName="checked" getValueProps={(v) => ({ checked: Boolean(v) })} normalize={(v) => (v ? 1 : 0)}>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
