# 宝塔面板部署指南

可以部署。核心前提只有一条：**Node.js ≥ 22.6，推荐 24 LTS**。
原因：数据库用的是 Node 内置 `node:sqlite`（22.5+），服务端直接运行 TypeScript（23.6+ 默认支持；22.6+ 需加 `--experimental-strip-types`）。

## 一、准备

宝塔「软件商店」安装：

- Nginx
- Node.js 版本管理器（安装 v24.x）
- PM2 管理器（若「Node 项目」已自带可不开）

域名完成备案并解析到服务器。代码上传到 `/www/wwwroot/fuhui`（Git 拉取或压缩包上传均可）。

## 二、首次初始化

宝塔「终端」或 SSH：

```bash
cd /www/wwwroot/fuhui
npm ci
npm run build:admin
node scripts/seed-from-site.mjs     # 首次导入现有页面内容
node scripts/build-site.mjs         # 生成 dist/
mkdir -p data/uploads
chown -R www:www data dist admin/dist
```

检查 Node 版本：`node -v` 必须是 v22.6+/v24。若 `node` 仍是旧版本，在 Node 版本管理器里切换命令行版本，或用绝对路径（见第七节）。

## 三、方式 A（推荐）：Node 项目 + 整站反代

宝塔 → 网站 → **Node 项目** → 添加项目：

| 项 | 值 |
|---|---|
| 项目目录 | `/www/wwwroot/fuhui` |
| 启动命令 | `node server/src/index.ts` |
| 项目端口 | `8787` |
| 运行用户 | `www` |
| 守护 | PM2 / 开机自启 |
| 绑定域名 | 你的域名（宝塔会自动建反代站点） |

环境变量（Node 项目 → 环境变量）：

```
PORT=8787
HOST=127.0.0.1
FH_SECURE_COOKIE=1
ADMIN_PASSWORD=换成一个强密码
```

然后在站点设置里：

1. 开启 SSL（Let's Encrypt），开启「强制 HTTPS」。
2. 在「配置文件」里确认 `client_max_body_size 10m;`（上传图片）。
3. 保存并重载 Nginx。

访问 `https://你的域名/admin/`，用 `admin` + 你在环境变量里设的密码登录，登录后到「账号管理」改密码，再点一次「立即发布」。

> 整站反代模式下，首页、后台、`/media`、`/api` 都由 Node 提供，配置最简单，小站性能足够。

## 四、方式 B（静态交给 Nginx，性能更好）

1. Node 项目同上，但**不绑定域名**，只监听 `127.0.0.1:8787`。
2. 宝塔新建 PHP/静态站点，根目录设为 `/www/wwwroot/fuhui/dist`。
3. 站点「配置文件」中加入：

```nginx
client_max_body_size 10m;

location /admin/ {
    alias /www/wwwroot/fuhui/admin/dist/;
    try_files $uri $uri/ /admin/index.html;
    add_header Cache-Control "no-store";
}

location /media/ {
    alias /www/wwwroot/fuhui/data/uploads/;
    expires 7d;
}

location /api/ {
    proxy_pass http://127.0.0.1:8787;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

4. 开 SSL 并强制 HTTPS，重载 Nginx。

注意：发布时 Node 会覆盖 `dist/`，站点根目录必须指向 `/www/wwwroot/fuhui/dist`，不要指向仓库根目录。

## 五、权限与目录

```bash
chown -R www:www /www/wwwroot/fuhui/data /www/wwwroot/fuhui/dist /www/wwwroot/fuhui/admin/dist
```

- `data/` 存数据库与上传图片，必须可写。
- `dist/`、`admin/dist/` 发布时重写，也要可写。
- 不要给 `data/` 配公网直接访问（Nginx 只通过 `/media/` 暴露 uploads）。

## 六、备份（宝塔计划任务）

「计划任务」→ 新增 Shell 脚本，每天一次：

```bash
cd /www/wwwroot/fuhui
/www/server/nodejs/v24.*/bin/node scripts/backup.mjs
```

`node` 的具体路径以 Node 版本管理器里显示的为准（`ls /www/server/nodejs/` 查看）。脚本会：

- 用 SQLite `VACUUM INTO` 备份数据库到 `backups/app-<时间>.db`
- 复制上传图片到 `backups/uploads-<时间>/`
- 自动保留最近 14 组（可用 `BACKUP_KEEP` 调整）

恢复：停止 Node 项目 → 用备份覆盖 `data/app.db` 与 `data/uploads` → 启动 → 后台发布一次。

## 七、更新代码

```bash
cd /www/wwwroot/fuhui
git pull                # 或重新上传压缩包
npm ci                  # 依赖有变化时
npm run build:admin     # 后台前端有改动时
```

然后在宝塔「Node 项目」里重启项目。只改内容不需要动代码，后台点「发布」即可。

## 八、常见问题

| 现象 | 原因与处理 |
|---|---|
| 启动报 `ERR_UNKNOWN_FILE_EXTENSION ".ts"` | Node 版本过低，切到 v24（或 v22.6+ 加 `--experimental-strip-types`） |
| 报 `Cannot find module 'node:sqlite'` | Node < 22.5，升级 Node |
| 502 Bad Gateway | Node 项目未启动、端口不是 8787、或 `HOST` 与反代地址不一致 |
| 上传图片报 413 | Nginx 加 `client_max_body_size 10m;` |
| 图片 404 | 方式 A 应由 Node 提供 `/media/`；方式 B 检查 `/media/` 的 alias 路径 |
| 登录成功但刷新掉登录 | 用 HTTPS 时设 `FH_SECURE_COOKIE=1`；纯 HTTP 调试时设 0 |
| 发布成功但线上没变 | 站点根目录没指向 `dist`，或 CDN/浏览器缓存 |
| 发布报权限错误 | `data/`、`dist/` 属主改成 `www` |
| 后台样式错乱/空白 | 确认 `/admin/assets/` 能访问，Nginx 不要拦截静态文件 |

## 九、安全建议

1. 第一时间改掉 `admin` 默认密码，删除不需要的账号。
2. 后台只给内部人用，可在宝塔「防火墙」限制 `/admin` 的访问 IP。
3. 开启 HTTPS，`FH_SECURE_COOKIE=1`。
4. `data/`、`.env` 不要放进网站可访问目录，不要提交到公开仓库。
5. 定期检查 `backups/` 是否正常生成。
