# 福汇官网 · 后台管理说明

官网本身仍是纯静态页面（index.html / styles.css / app.js / assets），后台只负责改内容，点「发布」后重新生成静态页。后台服务停止不影响官网访问。

## 一、目录

```
index.html / app.js / styles.css / assets/   官网模板与静态资源（构建时读取）
site/fragments/                              长卷面板、数字、动态的 HTML 片段
server/                                      Fastify 后台 API、SQLite、构建与发布
admin/                                       后台前端（Vite + React + Ant Design）
scripts/seed-from-site.mjs                    从现有页面导入初始内容
scripts/build-site.mjs                        手动构建静态页到 dist/
data/                                        app.db、uploads/、releases/（不入库）
deploy/                                      Dockerfile、compose、nginx、备份脚本
dist/                                        生成的静态站（由后台发布写入）
```

## 二、本地运行

需要 Node 22+（项目在 Node 25 上开发；服务端直接运行 TypeScript，不需要编译）。

```bash
npm install
node scripts/seed-from-site.mjs --force   # 首次：把现有页面内容导入 data/app.db
node scripts/build-site.mjs               # 生成 dist/
npm run build:admin                       # 生成 admin/dist/
node server/src/index.ts                  # http://127.0.0.1:8787
```

已导入过数据时只需 `node server/src/index.ts`。改了后台前端才需要重新 `npm run build:admin`。

> Windows 下若 `npm run build:admin` 报 esbuild 临时文件 Access is denied，可把 TEMP 指到项目内再构建：
> `$env:TEMP = "$PWD\.tmp"; npm run build:admin`

- 后台地址：http://127.0.0.1:8787/admin/
- 初始账号：`admin`，初始密码见 `data/admin-initial.txt`（可用环境变量 `ADMIN_PASSWORD` 覆盖）。
- 登录后请立刻在「账号管理」里改密码。

日常启动：`node server/src/index.ts`（或 `npm run dev` 自动重启）。

## 三、后台功能

| 页面 | 作用 |
|---|---|
| 概览与发布 | 查看上次发布状态、一键发布、发布历史、回滚内容版本 |
| 运营数据 | 首屏四个数字：数值/单位/标签（中英）+ 来源出处 + 统计时点 |
| 在营载体 | 长卷四屏：图片、小标题、主标题、描述、排序、显示开关 |
| 平台动态 | 新闻/政策条目：日期、类型、标题、摘要（中英），草稿与发布开关 |
| 固定文案 | 首屏标题、服务体系、联系方式、页脚等按区块分组的中英文本 |
| 账号管理 | 新增编辑/管理员、重置密码、停用、删除（仅管理员可见） |

- 标题类字段支持 `<br>` 换行与 `<em>` 斜体，其他标签会被清除。
- 英文留空时，英文站回退显示中文。
- 所有修改先存数据库；**点「立即发布」才会上线**。

## 四、发布与回滚

发布流程：构建到 `data/build-tmp` → 校验资源完整 → 把当前 `dist` 归档到 `data/releases/<时间>` → 覆盖写入 `dist` → 记录 `publish_log`。任何一步失败都不会覆盖线上版本。

- 发布失败：在「概览」看错误信息，修正后重试。
- 回滚：管理员在「内容版本」里选择版本回滚，会恢复当时的内容并重新发布。
- 并发发布会被拒绝（409「正在发布中」）。
- 静态资源用 `?v=内容哈希` 更新缓存；HTML 不缓存。

## 五、上线部署（国内服务器）

1. 服务器装 Docker 与 Docker Compose，域名完成备案并解析。
2. 在仓库根创建 `.env`：`ADMIN_PASSWORD=换成强密码`（可加 `ADMIN_USER`）。
3. 启动：`cd deploy && docker compose up -d --build`
   - 首次启动会自动导入内容并构建 `dist`。
   - 容器只监听 `127.0.0.1:8787`，对外由 Nginx 提供。
4. 安装 Nginx，复制 `deploy/nginx.conf` 到 `/etc/nginx/conf.d/`，把 `server_name` 与 `/srv/fuhui` 路径改成实际值。
5. 申请证书：`certbot --nginx -d 你的域名`，确认 HTTPS 与自动续期。
6. 把 `index.html` 里的 `https://example.com/`（canonical、og:url、og:image）替换成正式域名。
7. 访问 `https://域名/admin/` 登录，改掉初始密码，发布一次确认线上生效。

若不用 Docker：`npm ci && npm run build:admin`，用 systemd / pm2 守护 `node server/src/index.ts`，Nginx 配置同上（把文件路径指到仓库目录）。

## 六、宝塔面板（可选）

宝塔部署的完整步骤见 [deploy/baota.md](deploy/baota.md)：Node 项目 + PM2 + Nginx 反代（推荐），或 Nginx 直接托管 `dist`，以及计划任务备份、Node 版本要求（≥22.6，推荐 24）和常见问题。

## 七、备份

`deploy/backup.sh` 用 `sqlite3 .backup` 备份数据库并打包上传图片，保留最近 14 份。建议每天 cron：

```cron
15 3 * * * /srv/fuhui/deploy/backup.sh >> /var/log/fuhui-backup.log 2>&1
```

恢复：停止服务 → 用备份覆盖 `data/app.db` → 解压 uploads → 启动 → 在后台发布一次。

## 八、安全须知

- 所有写接口要求登录会话 + CSRF 头；登录 5 次/分钟/IP 限流。
- 密码用 scrypt 加盐存储；会话 Cookie 为 httpOnly + SameSite=Lax，生产环境需 HTTPS 并把 `FH_SECURE_COOKIE=1`。
- 图片只接受 JPG/PNG/WebP（校验文件头），最大 8MB，重编码为 WebP 并剥离元数据。
- 内容渲染默认转义，仅放行 br/b/strong/em。
- 不要把 `data/`、`.env` 提交到公开仓库；`/admin` 已加 `noindex`。

## 九、常见问题

**改了内容官网没变化？** 需要点「立即发布」。
**英文站显示中文？** 该字段英文为空，属于预期回退。
**图片上传失败？** 检查格式/大小；旧浏览器不支持 WebP 预览可忽略。
**发布报「缺少资源」？** 通常是面板图片路径失效，重新上传后保存再发布。
**忘记管理员密码？** 停服后执行：
```bash
node -e "const{openDb}=await import('./server/src/db/index.ts');const{hashPassword}=await import('./server/src/lib/auth.ts');const db=openDb('data/app.db');const{salt,hash}=hashPassword('新密码');db.prepare('UPDATE users SET pass_hash=?,salt=? WHERE username=?').run(hash,salt,'admin');console.log('ok')"
```

## 十、上线前检查清单

- [ ] 替换 canonical / og:url / og:image 的 example.com
- [ ] 首屏四个数字与 DATA-SOURCES.md 口径复核，来源与统计时点已填
- [ ] 长卷四屏图片已换成正式素材（当前为示意图）
- [ ] 平台动态文案已由业务确认
- [ ] 管理员密码已改，`data/` 已加入备份
- [ ] 域名备案、HTTPS、Nginx 代理正常
- [ ] 发布一次并在手机/桌面、中英文下各检查一遍
