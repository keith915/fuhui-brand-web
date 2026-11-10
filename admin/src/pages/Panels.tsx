import { useEffect, useState } from 'react';
import { App as AntApp, Button, Card, Input, Space, Switch, Typography, Upload } from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined, UploadOutlined } from '@ant-design/icons';
import { api } from '../api';

type Panel = {
  id?: number;
  sort: number;
  kicker_zh: string; kicker_en: string;
  title_zh: string; title_en: string;
  desc_zh: string; desc_en: string;
  image: string; image_m: string; img_w: number; img_h: number;
  alt_zh: string; alt_en: string;
  published: number;
};

export default function Panels() {
  const { message } = AntApp.useApp();
  const [items, setItems] = useState<Panel[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<number | null>(null);

  useEffect(() => {
    api.get('/panels').then((d) => setItems(d.panels)).catch((e) => message.error(e.message));
  }, []);

  const update = (index: number, patch: Partial<Panel>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    setItems((prev) => {
      const next = prev.slice();
      const [row] = next.splice(index, 1);
      next.splice(target, 0, row);
      return next;
    });
  };

  const upload = async (index: number, file: File) => {
    setUploading(index);
    try {
      const res = await api.upload(file);
      update(index, {
        image: res.url,
        image_m: res.urlM,
        img_w: res.media.width,
        img_h: res.media.height
      });
      message.success('图片已上传，记得保存并发布');
    } catch (err: any) {
      message.error(err.message);
    } finally {
      setUploading(null);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.put('/panels', {
        panels: items.map((item, i) => ({ ...item, sort: i, published: Boolean(item.published) }))
      });
      setItems(res.panels);
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
        title="产业版图 / 在营载体（长卷）"
        extra={<Button type="primary" loading={saving} onClick={save}>保存</Button>}
      >
        <Typography.Paragraph className="muted" style={{ marginTop: 0 }}>
          标题支持 &lt;br&gt; 换行与 &lt;em&gt; 斜体；顺序即长卷滚动顺序。图片建议 2200px 宽、横向构图。
        </Typography.Paragraph>
        {items.map((item, index) => (
          <Card
            key={index}
            className="card-panel"
            size="small"
            title={'第 ' + (index + 1) + ' 屏'}
            extra={
              <Space>
                <Switch size="small" checked={Boolean(item.published)} onChange={(v) => update(index, { published: v ? 1 : 0 })} />
                <Button size="small" icon={<ArrowUpOutlined />} onClick={() => move(index, -1)} />
                <Button size="small" icon={<ArrowDownOutlined />} onClick={() => move(index, 1)} />
              </Space>
            }
          >
            <Space align="start" size={16} style={{ width: '100%' }}>
              <div style={{ width: 280 }}>
                {item.image ? (
                  <img className="thumb" src={'/' + item.image} alt="" />
                ) : (
                  <div className="thumb" style={{ height: 120, display: 'grid', placeItems: 'center', color: '#aaa' }}>未上传</div>
                )}
                <Upload
                  accept="image/*"
                  showUploadList={false}
                  beforeUpload={(file) => { upload(index, file as File); return false; }}
                >
                  <Button icon={<UploadOutlined />} loading={uploading === index} style={{ marginTop: 8 }}>
                    上传图片
                  </Button>
                </Upload>
                <div className="muted" style={{ marginTop: 6 }}>
                  {item.img_w ? item.img_w + ' × ' + item.img_h + ' px' : ''}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div className="field-grid">
                  <div>
                    <div className="muted">小标题（中文）</div>
                    <Input value={item.kicker_zh} onChange={(e) => update(index, { kicker_zh: e.target.value })} />
                  </div>
                  <div>
                    <div className="muted">小标题（英文）</div>
                    <Input value={item.kicker_en} onChange={(e) => update(index, { kicker_en: e.target.value })} />
                  </div>
                  <div>
                    <div className="muted">主标题（中文）</div>
                    <Input.TextArea rows={2} value={item.title_zh} onChange={(e) => update(index, { title_zh: e.target.value })} />
                  </div>
                  <div>
                    <div className="muted">主标题（英文）</div>
                    <Input.TextArea rows={2} value={item.title_en} onChange={(e) => update(index, { title_en: e.target.value })} />
                  </div>
                  <div>
                    <div className="muted">描述（中文）</div>
                    <Input.TextArea rows={3} value={item.desc_zh} onChange={(e) => update(index, { desc_zh: e.target.value })} />
                  </div>
                  <div>
                    <div className="muted">描述（英文）</div>
                    <Input.TextArea rows={3} value={item.desc_en} onChange={(e) => update(index, { desc_en: e.target.value })} />
                  </div>
                  <div>
                    <div className="muted">图片说明（中文，用于无障碍）</div>
                    <Input value={item.alt_zh} onChange={(e) => update(index, { alt_zh: e.target.value })} />
                  </div>
                  <div>
                    <div className="muted">图片说明（英文）</div>
                    <Input value={item.alt_en} onChange={(e) => update(index, { alt_en: e.target.value })} />
                  </div>
                </div>
              </div>
            </Space>
          </Card>
        ))}
      </Card>
    </Space>
  );
}
