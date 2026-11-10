import { useEffect, useMemo, useState } from 'react';
import { App as AntApp, Button, Card, Input, Space, Tabs, Typography } from 'antd';
import { api } from '../api';

type Block = { key: string; zh: string; en: string; kind: string; grp: string; label: string };

const GROUP_LABEL: Record<string, string> = {
  meta: '页面元信息',
  header: '顶部导航',
  top: '首屏',
  chapter: '产业版图',
  services: '服务体系',
  news: '平台动态',
  contact: '联系',
  footer: '页脚',
  misc: '其他'
};

const GROUP_ORDER = ['meta', 'header', 'top', 'chapter', 'services', 'news', 'contact', 'footer', 'misc'];

export default function Blocks() {
  const { message } = AntApp.useApp();
  const [items, setItems] = useState<Block[]>([]);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    api.get('/blocks').then((d) => setItems(d.blocks)).catch((e) => message.error(e.message));
  }, []);

  const groups = useMemo(() => {
    const map = new Map<string, Block[]>();
    for (const item of items) {
      if (!map.has(item.grp)) map.set(item.grp, []);
      map.get(item.grp)!.push(item);
    }
    return GROUP_ORDER.filter((g) => map.has(g)).map((g) => ({
      key: g,
      label: GROUP_LABEL[g] || g,
      blocks: map.get(g)!
    }));
  }, [items]);

  const update = (key: string, patch: Partial<Block>) => {
    setDirty(true);
    setItems((prev) => prev.map((b) => (b.key === key ? { ...b, ...patch } : b)));
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.put('/blocks', {
        blocks: items.map(({ key, zh, en }) => ({ key, zh, en }))
      });
      setDirty(false);
      message.success('已保存 ' + res.updated + ' 条，发布后生效');
    } catch (err: any) {
      message.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      title="固定文案（中英双语）"
      extra={<Button type="primary" loading={saving} onClick={save} disabled={!dirty}>保存</Button>}
    >
      <Typography.Paragraph className="muted" style={{ marginTop: 0 }}>
        标题类字段支持 &lt;br&gt; 换行与 &lt;em&gt; 斜体，其他标签会被清除。英文留空时，英文站显示中文。
      </Typography.Paragraph>
      <Tabs
        items={groups.map((g) => ({
          key: g.key,
          label: g.label + '（' + g.blocks.length + '）',
          children: (
            <Space direction="vertical" size={14} style={{ width: '100%' }}>
              {g.blocks.map((b) => (
                <div key={b.key}>
                  <div style={{ marginBottom: 4 }}>
                    <b>{b.label || b.key}</b>{' '}
                    <span className="muted">{b.key}{b.kind === 'html' ? ' · 支持换行/强调' : ''}</span>
                  </div>
                  <div className="field-grid">
                    <Input.TextArea
                      rows={2}
                      value={b.zh}
                      onChange={(e) => update(b.key, { zh: e.target.value })}
                      placeholder="中文"
                    />
                    <Input.TextArea
                      rows={2}
                      value={b.en}
                      onChange={(e) => update(b.key, { en: e.target.value })}
                      placeholder="English"
                    />
                  </div>
                </div>
              ))}
            </Space>
          )
        }))}
      />
    </Card>
  );
}
