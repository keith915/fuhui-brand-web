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
- 初始账号：`admin`。首次启动若未设置 `ADMIN_PASSWORD`，会随机生成密码并写入 `data/admin-initial.txt`（仅本人可读），控制台只提示文件路径，不再打印或内置明文密码。
- Docker/宝塔部署请务必在 `.env` 设置 `ADMIN_PASSWORD`（不设置时会生成随机密码文件）。
- 登录后请立刻在「账号管理」里改密码，然后删除 `data/admin-initial.txt`。

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

## 十一、静态托管（可选）

官网产物 `dist/` 是纯静态（20 个文件、约 2.3MB，无任何 API 调用），可以脱离服务器单独托管。管理后台、图片上传、发布回滚仍需 VPS。

### GitHub Pages

Pages 有两种模式，**二选一**（改了 Source 后另一种立即失效）：

| 模式 | Source 设置 | 内容来源 | 适合 |
|---|---|---|---|
| 分支模式 ⭐ | Deploy from a branch → `gh-pages` / (root) | 后台发布时推上去的 `dist` | 内容主要在后台改 |
| Actions 模式 | GitHub Actions | 仓库里的 `site/` 源文件 | 只做预览/备份，不常改内容 |

两种模式都要求：仓库公开，或账户为 GitHub Pro/Team（私有仓库的 Pages 需要付费计划）。访问地址为 `https://<owner>.github.io/fuhui-brand-web/`，资源全部使用相对路径，子路径下无需改动。

#### 分支模式：后台发布 → 自动同步（推荐）

在服务器 `.env`（或 docker-compose 的环境变量）里加：

```bash
FH_PAGES_DEPLOY=1
FH_PAGES_TOKEN=ghp_xxx            # 需要 repo 权限（Fine-grained: Contents Read and write）
FH_PAGES_REPO=keith915/fuhui-brand-web
FH_PAGES_BRANCH=gh-pages          # 可省略，默认就是这个
```

设置后，每次「立即发布」在写 `dist` 成功后，会把这批文件提交到 `gh-pages` 分支（强制覆盖，带 `.nojekyll`），Pages 随后自动重建。后台「概览与发布」卡片会显示「GitHub Pages：已同步/失败」，失败信息写入发布记录，**不会影响本机官网发布成功**。

启用步骤：

1. 仓库公开或升级 Pro/Team
2. Settings → Pages → Source 选 **Deploy from a branch**，分支选 `gh-pages`，目录 `/(root)`
3. 在后台点一次「立即发布」，确认出现「已同步」，再打开 Pages 地址核对内容

Token 只放在服务器环境变量里，不要提交进仓库；服务器需要能用 `git`（Docker 镜像已包含，宝塔等裸机部署先确认 `git --version`）。若 `gh-pages` 分支有保护规则，需要允许强制推送。

#### Actions 模式（内容滞后于后台）

手动触发 `.github/workflows/pages.yml`：在 Ubuntu 上 `npm ci --omit=dev`，用 `node scripts/build-site.mjs` 从 `site/` 播种临时库产出 `dist` 并发布。适合只验证/备份静态站点，或后台暂时不上线时用。

注意：
- 分支模式下 Pages 内容以最近一次后台发布为准；Actions 模式下内容来自仓库，后台改动不会同步
- 仓库转公开前，先移除 `scripts/seed-from-site.mjs` 里的兜底管理员密码
- `*.github.io` 在国内访问不稳定，面向本地客户建议绑定自有域名或直接用 VPS 直出
- 域名确定后替换 canonical / og:url / og:image 中的 example.com

- Pages 上的内容来自仓库里的 `site/` 源文件，**后台编辑并发布的内容不会同步过去**；要保持一致，需后台发布后再把 `dist` 推到 `gh-pages` 分支，或改用 Cloudflare Workers 并让发布流程直传产物
- 仓库转公开前，先移除 `scripts/seed-from-site.mjs` 里的兜底管理员密码
- `*.github.io` 在国内访问不稳定，面向本地客户建议绑定自有域名或直接用 VPS 直出
- 域名确定后替换 canonical / og:url / og:image 中的 example.com

### Cloudflare Workers / Pages

- Build command 填 `node scripts/build-site.mjs`，不要用 `npm run build`（会白构建 1.1MB 后台，Cloudflare 只发布 `dist`）
- 输出目录填 `dist`；`wrangler.jsonc` 已声明 `assets.directory: ./dist`

同理，Cloudflare 的 git 构建只读仓库内容，后台改动不会自动同步。
