import { useEffect, useState } from 'react';
import { App as AntApp, Button, Card, Input, Space, Switch, Typography } from 'antd';
import { api } from '../api';

type Metric = {
  id?: number;
  sort: number;
  label_zh: string;
  label_en: string;
  value_zh: string;
  value_en: string;
  unit_zh: string;
  unit_en: string;
  source: string;
  period: string;
  visible: number;
};

export default function Metrics() {
  const { message } = AntApp.useApp();
  const [items, setItems] = useState<Metric[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/metrics').then((d) => setItems(d.metrics)).catch((e) => message.error(e.message));
  }, []);

  const update = (index: number, patch: Partial<Metric>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const add = () => {
    if (items.length >= 8) return message.warning('首屏数字最多 8 个');
    setItems((prev) => [...prev, {
      sort: prev.length, label_zh: '', label_en: '', value_zh: '', value_en: '',
      unit_zh: '', unit_en: '', source: '', period: '', visible: 1
    }]);
  };

  const remove = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.put('/metrics', {
        metrics: items.map((item, i) => ({ ...item, sort: i, visible: Boolean(item.visible) }))
      });
      setItems(res.metrics);
      message.success('已保存，发布后生效');
    } catch (err: any) {
      message.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card
        title="首屏运营数据"
        extra={<Space><Button onClick={add}>新增数字</Button><Button type="primary" loading={saving} onClick={save}>保存</Button></Space>}
      >
        <Typography.Paragraph className="muted" style={{ marginTop: 0 }}>
          对应官网首屏四个数字。请同时填写来源与统计时点，保证对外口径可追溯；英文可留空，留空时英文站回退显示中文值。
        </Typography.Paragraph>
        {items.map((item, index) => (
          <Card key={index} className="card-panel" size="small" title={'第 ' + (index + 1) + ' 个数字'}
            extra={<Space><Switch size="small" checked={Boolean(item.visible)} onChange={(v) => update(index, { visible: v ? 1 : 0 })} /><Button size="small" danger onClick={() => remove(index)}>删除</Button></Space>}>
            <div className="field-grid">
              <div>
                <div className="muted">标签（中文）</div>
                <Input value={item.label_zh} onChange={(e) => update(index, { label_zh: e.target.value })} />
              </div>
              <div>
                <div className="muted">标签（英文）</div>
                <Input value={item.label_en} onChange={(e) => update(index, { label_en: e.target.value })} />
              </div>
              <div>
                <div className="muted">数值（中文）</div>
                <Input value={item.value_zh} onChange={(e) => update(index, { value_zh: e.target.value })} />
              </div>
              <div>
                <div className="muted">数值（英文）</div>
                <Input value={item.value_en} onChange={(e) => update(index, { value_en: e.target.value })} />
              </div>
              <div>
                <div className="muted">单位（中文）</div>
                <Input value={item.unit_zh} onChange={(e) => update(index, { unit_zh: e.target.value })} />
              </div>
              <div>
                <div className="muted">单位（英文）</div>
                <Input value={item.unit_en} onChange={(e) => update(index, { unit_en: e.target.value })} />
              </div>
              <div>
                <div className="muted">来源出处</div>
                <Input value={item.source} onChange={(e) => update(index, { source: e.target.value })} />
              </div>
              <div>
                <div className="muted">统计时点</div>
                <Input value={item.period} onChange={(e) => update(index, { period: e.target.value })} placeholder="如 2026.04" />
              </div>
            </div>
          </Card>
        ))}
      </Card>
    </Space>
  );
}
