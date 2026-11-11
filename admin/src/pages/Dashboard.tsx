import { useEffect, useState } from 'react';
import { App as AntApp, Button, Card, Descriptions, Popconfirm, Space, Table, Tag, Typography } from 'antd';
import { api } from '../api';
import { useAuth } from '../App';

const STATUS: Record<string, { color: string; text: string }> = {
  ok: { color: 'green', text: '成功' },
  failed: { color: 'red', text: '失败' },
  running: { color: 'processing', text: '发布中' }
};

export default function Dashboard() {
  const { message } = AntApp.useApp();
  const { user } = useAuth();
  const [status, setStatus] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [publishing, setPublishing] = useState(false);

  const load = async () => {
    try {
      const s = await api.get('/publish/status');
      setStatus(s);
      const l = await api.get('/publish/log?limit=12');
      setLogs(l.logs || []);
      setSnapshots(l.snapshots || []);
    } catch (err: any) {
      message.error(err.message);
    }
  };

  useEffect(() => { load(); }, []);

  const publish = async () => {
    setPublishing(true);
    try {
      const res = await api.post('/publish', { label: '后台发布' });
      if (res.pages && res.pages.ok) {
        message.success('发布成功，用时 ' + res.buildMs + 'ms，已同步 GitHub Pages');
      } else if (res.pages && res.pages.ok === false) {
        message.warning('官网已更新，但 GitHub Pages 推送失败：' + res.pages.error);
      } else {
        message.success('发布成功，用时 ' + res.buildMs + 'ms');
      }
      await load();
    } catch (err: any) {
      message.error('发布失败：' + err.message);
      await load();
    } finally {
      setPublishing(false);
    }
  };

  const rollback = async (id: number) => {
    try {
      await api.post('/publish/rollback/' + id);
      message.success('已回滚到版本 ' + id);
      await load();
    } catch (err: any) {
      message.error('回滚失败：' + err.message);
    }
  };

  const last = status?.last;

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card
        title="发布到官网"
        extra={
          <Button type="primary" loading={publishing || status?.busy} onClick={publish}>
            {status?.busy ? '正在发布…' : '立即发布'}
          </Button>
        }
      >
        <Typography.Paragraph className="muted" style={{ marginTop: 0 }}>
          后台修改的内容保存在数据库里；点「立即发布」才会重新生成官网静态页。发布失败不会影响正在运行的线上版本。
        </Typography.Paragraph>
        <Descriptions size="small" column={3}>
          <Descriptions.Item label="上次发布">
            {last ? new Date(last.started_at).toLocaleString('zh-CN') : '尚未发布'}
          </Descriptions.Item>
          <Descriptions.Item label="状态">
            {last ? <Tag color={STATUS[last.status]?.color}>{STATUS[last.status]?.text || last.status}</Tag> : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="耗时">
            {last?.build_ms != null ? last.build_ms + ' ms' : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="GitHub Pages">
            {last?.pages_status === 'ok'
              ? <Tag color="green">已同步</Tag>
              : last?.pages_status === 'failed'
                ? <Tag color="red">失败</Tag>
                : '-'}
          </Descriptions.Item>
        </Descriptions>
        {last?.error ? <Typography.Text type="danger">错误：{last.error}</Typography.Text> : null}
        {last?.pages_error ? <Typography.Paragraph type="danger" style={{ marginBottom: 0 }}>Pages 推送：{last.pages_error}</Typography.Paragraph> : null}
      </Card>

      <Card title="发布历史">
        <Table
          size="small"
          rowKey="id"
          pagination={false}
          dataSource={logs}
          columns={[
            { title: 'ID', dataIndex: 'id', width: 60 },
            { title: '开始时间', dataIndex: 'started_at', render: (v: string) => new Date(v).toLocaleString('zh-CN') },
            { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={STATUS[v]?.color}>{STATUS[v]?.text || v}</Tag> },
            { title: '耗时', dataIndex: 'build_ms', render: (v: number) => (v != null ? v + ' ms' : '-') },
            {
              title: 'Pages',
              dataIndex: 'pages_status',
              width: 80,
              render: (v: string) => (v === 'ok' ? <Tag color="green">已同步</Tag> : v === 'failed' ? <Tag color="red">失败</Tag> : '-')
            },
            { title: '错误', dataIndex: 'error', ellipsis: true }
          ]}
        />
      </Card>

      {user?.role === 'admin' && (
        <Card title="内容版本（可回滚）">
          <Table
            size="small"
            rowKey="id"
            pagination={false}
            dataSource={snapshots}
            columns={[
              { title: '版本', dataIndex: 'id', width: 70 },
              { title: '说明', dataIndex: 'label' },
              { title: '时间', dataIndex: 'created_at', render: (v: string) => new Date(v).toLocaleString('zh-CN') },
              {
                title: '',
                width: 90,
                render: (_: any, row: any) => (
                  <Popconfirm title={'回滚到版本 ' + row.id + '？'} onConfirm={() => rollback(row.id)}>
                    <Button size="small" danger>回滚</Button>
                  </Popconfirm>
                )
              }
            ]}
          />
        </Card>
      )}
    </Space>
  );
}
