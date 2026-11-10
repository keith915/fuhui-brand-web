# 福汇 · 产业空间综合服务运营平台
## 产品与设计规范（design.md）

> 文档来源：只读分析 `C:\Users\10047\Desktop\福汇小程序\fuhui`（未修改源项目任何文件）
> 生成日期：2026-11-04
> 适用端：微信小程序（主）、H5、App
> 技术栈：uni-app + Vue 2（HBuilderX 工程，`vueVersion: "2"`）
> 设计基准：750rpx 设计宽，全站使用 `rpx`；系统尺寸由 `utils/system.js` 统一计算

---

## 1. 产品定义

### 1.1 一句话定位

面向深圳市福田区的**产业空间查询、招商服务与企业运营平台**：把「找空间、看空间、享服务、联系招商」四件事收进一个微信小程序。

### 1.2 目标用户

| 用户 | 核心诉求 | 典型路径 |
| --- | --- | --- |
| 企业选址人 / 行政负责人 | 快速判断楼宇、园区、房源是否匹配 | 搜索 / 推荐 → 项目详情 → 房源 → 预约看房 |
| 招商顾问 / 运营人员 | 展示载体、收集线索、响应企业需求 | 首页 / 地图 → 项目 / 片区 → 需求表单 / 问卷 |
| 园区与楼宇运营方 | 呈现项目、房源、企业与服务能力 | 项目详情、企业详情、服务驿站 |
| 政府 / 产业部门 | 了解片区分布、政策与活动 | 产业地图、产业运营、政策 / 活动 |

### 1.3 核心任务

1. **找空间**：搜索、地图片区、条件筛选、面积排序。
2. **看空间**：空间详情、房源列表、房源详情、VR / 图片 / 平面图。
3. **享服务**：服务驿站、政策速递、产业活动、企业需求、调研问卷。
4. **联系转化**：招商热线、预约看房、需求提交、地址导航。

### 1.4 设计原则

| 原则 | 落地方式 |
| --- | --- |
| 信息优先 | 列表先给名称、类型、片区、面积、待租；详情先给头图、名称、地址、关键数字 |
| 低学习成本 | 4 个一级 Tab + 单一路径下钻；筛选统一「chip → 草稿 → 确定」 |
| 商务可信 | 深海军蓝主色、留白充足、少装饰、真实图片优先 |
| 运营驱动 | 文案、图片、列表、片区、筛选字典全部可由接口下发，前端不写死业务内容 |
| 弱网可用 | 每页骨架屏、占位图、失败空态、下拉刷新、地图静态兜底 |

### 1.5 品牌印象

- **深蓝 = 专业与政务感**：标题、导航、主按钮、地图标注。
- **暖橙 = 行动与活力**：CTA、标签、筛选选中、刷新指示。
- **浅灰蓝 = 秩序与层级**：页面底色、分隔线、辅助文字。
- **大图 = 场景感**：Banner、项目封面、房源头图、片区底图。

---

## 2. 信息架构

### 2.1 一级 Tab

| 下标 | 页面 | 文案 | 图标 | 角色 |
| --- | --- | --- | --- | --- |
| 0 | `pages/index/index` | 首页 | `home` | 品牌、入口、重点项目、新闻 |
| 1 | `pages/recommend/recommend` | 空间推荐 | `heart` | 搜索、地图、筛选、空间列表 |
| 2 | `pages/industry/industry` | 产业运营 | `chart` | 政策、活动、企业需求、问卷 |
| 3 | `pages/contact/contact` | 联系我们 | `person` | 热线、服务范围、位置 |

> Tab 配置唯一数据源：`utils/tabbar.js` 的 `TAB_ITEMS`；`pages.json` 的 `tabBar.list` 只用于路由声明。两者 `pagePath` 必须一致。

### 2.2 页面清单（35 个注册页）

| 分组 | 页面 | 导航标题 | 说明 |
| --- | --- | --- | --- |
| 一级 | `pages/index/index` | 首页 | 聚合首页 |
| 一级 | `pages/recommend/recommend` | 空间推荐 | 地图 + 筛选 + 空间列表 |
| 一级 | `pages/industry/industry` | 产业运营 | 深色头部 + 内容流 |
| 一级 | `pages/contact/contact` | 联系我们 | 头图 + 卡片 |
| 空间 | `pages/search/search` | 搜索 | 关键词搜索空间 |
| 空间 | `pages/space-detail/space-detail` | 项目详情 | 项目全量信息 |
| 空间 | `pages/company-detail/company-detail` | 企业详情 | 明星企业 |
| 房源 | `pages/house-list/house-list` | 待租房源列表 | 项目下房源 |
| 房源 | `pages/house-detail/house-detail` | 房源详情 | 房源全量信息 |
| 房源 | `pages/booking-form/booking-form` | 预约看房 | 留资表单 |
| 房源 | `pages/lease-richtext/lease-richtext` | 租赁说明 | 看房安排 / 租期说明 |
| 地图 | `pages/map/map` | 产业空间地图 | 独立地图页（暂无入口） |
| 地图 | `pages/map-detail/map-detail` | 片区详情 | 全屏地图 + 底部弹窗 |
| 地图 | `pages/hotspot-map/hotspot-map` | 片区地图 | 全屏地图（完整图） |
| 地图 | `pages/hotspot-map-cover/hotspot-map-cover` | 片区地图（铺满版） | 对比 / 回退版本 |
| 地图 | `pages/area-detail/area-detail` | 片区详情 | VR + 片区信息 + 空间列表 |
| 地图 | `pages/hotspot-demo/hotspot-demo` | 片区热区预览 | 开发预览页 |
| 服务 | `pages/station/station` | 服务驿站 | 分组推荐 + 热线 |
| 服务 | `pages/station-list/station-list` | 推荐列表 | 分组全量列表 |
| 服务 | `pages/station-detail/station-detail` | 推荐详情 | 地址 + 正文 + 图集 |
| 内容 | `pages/news-list/news-list` | 新闻动态 | 新闻列表 |
| 内容 | `pages/news-richtext/news-richtext` | 新闻详情 | 富文本 |
| 内容 | `pages/policy-list/policy-list` | 政策速递 | 政策列表 |
| 内容 | `pages/policy-richtext/policy-richtext` | 政策详情 | 富文本 |
| 内容 | `pages/activity-list/activity-list` | 产业活动 | 活动列表 |
| 内容 | `pages/atc-richtext/atc-richtext` | 活动详情 | 富文本 |
| 入口 | `pages/entry/entry` | 动态标题 | 投融 / 孵化 / 人才入口 |
| 入口 | `pages/entry-richtext/entry-richtext` | 动态标题 | 条目富文本 |
| 表单 | `pages/demand-form/demand-form` | 填写需求 | 企业需求提交 |
| 表单 | `pages/dynamic-form/dynamic-form` | 动态标题 | 后台配置问卷 |
| 表单 | `pages/agreement-richtext/agreement-richtext` | 服务协议 | 需求提交协议 |
| 其他 | `pages/about/about` | 公司介绍 | 富文本 / 长图 |
| 其他 | `pages/promotional-video/promotional-video` | 平台宣传片 | 全屏视频 |
| 其他 | `pages/webview-vr/webview-vr` | 空标题 | 360 全景 web-view |
| 其他 | `pages/rich-text/rich-text` | 空标题 | 通用富文本（预留） |

### 2.3 导航模型

- **自定义导航栏**：`navigationStyle: custom`，所有页面必须挂 `<fuhui-navbar>`。
- **返回逻辑**：`TAB_ITEMS` 中的页面视为一级页，不显示返回；其余页面显示。栈底（扫码 / 分享直达）点返回兜底 `switchTab` 回首页。
- **底部导航**：自绘 `<fuhui-tabbar :current="n" />`，`current` 必传，取 `TAB_ITEMS` 下标；切页用 `switchTab`，失败回落 `reLaunch`。
- **页面栈**：列表 → 详情 → 返回；房源列表从项目详情进入时，「查看项目」直接 `navigateBack`，避免详情页堆两层。
- **深链参数**：片区名统一 `encodeURIComponent`；H5 下页面解码一次。

### 2.4 核心用户旅程

#### A. 选址转化（主旅程）

```
首页 → 空间推荐（搜索 / 地图 / 筛选）→ 片区详情
     → 项目详情 → 查看待租房源 → 房源详情
     → 预约看房 → 提交成功 → 返回上一页
```

#### B. 地图探索

```
首页 / 空间推荐 → 地图卡「查看大图」→ hotspot-map
→ 点击片区 → 底部弹窗（VR + 产业空间列表）
→ 项目详情 → …
```

#### C. 产业服务

```
首页 8 宫格 / 产业运营 → 政策速递 / 产业活动 / 新闻动态 → 详情
                     → 填写需求 → 提交
                     → 企业诉求走访调研问卷 → 动态表单 → 提交
```

#### D. 联系与到访

```
联系我们 → 拨打招商热线 / 位置地图 → 系统导航
服务驿站 → 推荐详情 → 地址块 → 系统地图
```

---

## 3. 视觉设计系统

### 3.1 色彩

#### 主色（深海军蓝）

| 角色 | 色值 | 使用场景 |
| --- | --- | --- |
| 品牌主色 | `#1A365D` | 导航标题、选中 Tab、区块文字、地图点位名 |
| 深色底 / 主提交按钮 | `#17325A` | 表单提交按钮、宣传片卡渐变起点 |
| 次级深蓝 | `#1B2C4A` | 区块竖条、筛选「确定」、深色按钮 |
| 深蓝辅助 | `#1F3D6B` | 卡片标题竖条、服务驿站分组条 |
| 正文深灰 | `#1F2D3D` | 大多数标题与正文 |
| 纯黑 | `#000000` | 新闻 / 活动标题（强对比） |

#### 强调色（暖橙 / 红）

| 角色 | 色值 | 使用场景 |
| --- | --- | --- |
| 主强调橙 | `#F0821E` | 标签文字、链接、刷新点、筛选选中 |
| CTA 橙 | `#ED8936` | 列表卡按钮、房源预约按钮 |
| 标签橙 | `#E37628` | 选中 chip、政策 pill、房源 VR 角标 |
| 浅橙 | `#F09A54` | 房源标签、展开 / 收起 |
| 深底橙 | `#F0A04A` | 深色横幅上的「进入 / 查看大图」 |
| 租金红 | `#E2231B` | 房源租金 |
| 错误红 | `#E2574C` | 必填星号、角标 |

#### 背景与填充

| 角色 | 色值 | 使用场景 |
| --- | --- | --- |
| 页面底色（标准） | `#F2F5F9` | 空间 / 房源 / 企业 / 列表页 |
| 页面底色（浅） | `#F5F7FA` | 推荐、表单、动态表单 |
| 首页底色 | `#F6F7F9` | 首页 |
| 房源详情底色 | `#F5F5F5` | 房源详情 |
| 入口页底色 | `#F5F6FA` | 入口列表 |
| 卡片 / 内容块 | `#FFFFFF` | 全站 |
| 浅灰填充 | `#F6F8FB` | 输入框、textarea、未选中 chip |
| 浅蓝填充 | `#EEF2F8` / `#EEF4FB` | 标签、信息 chip |
| 骨架屏 | `#EEF1F5` | `.sk` 全局底 |

#### 文字层级

| 层级 | 色值 | 使用 |
| --- | --- | --- |
| 一级文字 | `#1F2D3D` / `#1A1A1A` | 标题、关键数值 |
| 二级文字 | `#5A6779` / `#4A5568` / `#5B6B80` | 正文、简介 |
| 三级文字 | `#6B7A8D` / `#7B8697` / `#8A94A6` | 辅助说明 |
| 弱文字 | `#9AA5B6` / `#9AA5B6` | 日期、提示 |
| 极弱文字 | `#B3BFCB` / `#B3BDCB` / `#C4CCD8` | 占位、箭头 |
| 反白 | `#FFFFFF` | 深色背景 |
| 链接蓝 | `#2F7FD8` | 协议、可点击文字 |
| 成功绿 | `#2F9E44` | 已授权状态 |

#### 边框与分隔

| 用途 | 色值 |
| --- | --- |
| 卡片细边框 | `#EEF1F5` / `#E6EBF2` |
| 列表分隔线 | `#F2F5F9` / `#F0F3F7` |
| 虚线分隔（推荐卡信息区） | `#B3BFCB` |
| 虚线分隔（表单 / 租赁行） | `#EEF1F5` / `#E6EBF2` |

#### 房源标签 tones

| tone | 背景 | 文字 |
| --- | --- | --- |
| `orange` | `#FCF1E9` | `#F09A54` |
| `teal` | `#EAF5F5` | `#61B1B0` |
| `green` | `#EBF6F0` | `#63B88A` |
| `blue` | `#EEF4FC` | `#2F7FD8` |
| `pink` | `#FDEEF4` | `#E0568A` |

#### 地图色板

| 角色 | 色值 / 规则 |
| --- | --- |
| 片区填充色 | `#f36f39` `#148fdd` `#876bdc` `#8b5cf6` `#e4337c` `#2f8f9d` `#3b82c4` `#4f6fd6` `#2f6fb5`（接口可覆盖） |
| 填充透明度 | 0.66 |
| 普通点位 | `#ff2026` 圆点 + 白边 |
| 重点点位 | `#ED8936` 五角星 + 白边 |
| 点位名称 | `#1A365D`，白色描边 |
| 片区名 | 默认白色，可配置 `labelColor` / `labelStroke` / `labelShadow` |

#### 类型色（动态）

空间类型徽标与片区标签颜色来自接口 `typeInfo.icon`（字段值即色值），缺省回落 `#F0821E`。片区标签使用同色 12% 透明度作为底色。

### 3.2 字体与字号

| Token | 字号 | 字重 | 典型用途 |
| --- | --- | --- | --- |
| Display | 44rpx | 700 | Banner 主标题 |
| H1 | 42rpx | 700 | 项目详情头图名称 |
| H2 | 40rpx | 700 | 房源标题、弹窗标题、热线号码 |
| H3 | 38rpx | 700 | 富文本标题、统计大数字 |
| Section | 34rpx | 700 | 首页 / 列表区块标题、空间名 |
| Card Title | 32rpx | 600–700 | 卡片标题、表单标题 |
| Body Large | 30rpx | 400–600 | 卡片正文、列表标题 |
| Body | 28rpx | 400 | 导航标题、筛选选项 |
| Body Small | 26rpx | 400–600 | 表单标签、正文、meta |
| Caption | 24rpx | 400 | 日期、说明、标签 |
| Micro | 22rpx | 400 | 辅助标签、按钮小字 |
| Tiny | 20rpx | 400 | 角标、极弱提示 |
| Minimal | 18rpx | 400 | 极小说明、底部注释 |

字重使用：400 常规、500 中等、600 半粗、700 粗体。中文正文行高通常 1.4–1.7；富文本正文行高 44–46rpx。

### 3.3 间距

| 场景 | 建议值 |
| --- | --- |
| 页面左右边距 | 30rpx（主）、24rpx（详情 / 列表）、32rpx（联系我们） |
| 卡片内边距 | 20–32rpx |
| 卡片间距 | 18–24rpx |
| 区块上下间距 | 28–48rpx |
| 标题与内容 | 12–20rpx |
| 标签间距 | 8–16rpx |
| 列表行高 | 92–120rpx（表单 / 信息行） |
| 图标与文字 | 6–16rpx |
| 底部固定条内边距 | 16–28rpx + 安全区 |

### 3.4 圆角

| 元素 | 圆角 |
| --- | --- |
| 小标签 / 角标 | 6–10rpx |
| 筛选 chip / 输入框 | 10–14rpx |
| 卡片 | 16–20rpx |
| 头图卡 / 概况卡 | 24–28rpx |
| 房源主信息块上沿 | 40rpx |
| 底部弹窗 | 24rpx（顶部两角） |
| 胶囊按钮 | 24–40rpx 或高度一半 |
| 头像 / 圆形图标 | 50% |

### 3.5 阴影

| Token | 值 | 使用 |
| --- | --- | --- |
| Shadow-1 | `0 4rpx 16rpx rgba(23, 44, 74, 0.06)` | 列表卡、驿站卡 |
| Shadow-2 | `0 4rpx 18rpx rgba(23, 44, 74, 0.06–0.10)` | 首页 / 推荐卡 |
| Shadow-3 | `0 6rpx 22rpx rgba(23, 44, 74, 0.07)` | 运营卡、表单卡 |
| Shadow-4 | `0 8rpx 28rpx rgba(23, 44, 74, 0.08)` | 联系我们卡片 |
| Shadow-panel | `0 12rpx 32rpx rgba(23, 44, 74, 0.14)` | 筛选浮层 |
| Shadow-sheet | `0 -8rpx 32rpx rgba(16, 30, 48, 0.18)` | 底部弹窗 |

**重要区分**：列表 / 运营页使用「白卡 + 轻阴影」；空间详情、房源详情、企业详情、房源列表使用「灰底 + 纯白平面块 + 无阴影」，靠底色和 2rpx 分隔线分层。

### 3.6 动效

| 场景 | 参数 |
| --- | --- |
| Banner 自动轮播 | 4000ms 间隔，360ms 切换 |
| Banner 圆点 | 320ms 宽度 / 背景过渡；选中点 2s 呼吸 |
| 骨架屏扫光 | 1.3s ease-in-out 无限循环 |
| 底部弹窗入场 | 220ms ease-out，`translateY(100%) → 0`；遮罩 200ms 淡入 |
| 下拉刷新收起 | 220ms `cubic-bezier(0.22, 0.61, 0.36, 1)` |
| 下拉刷新三点 | 进度点亮；刷新中 1s 错峰上下跳动 |
| 地图片区选中 | 1600ms 抬升 / 提亮 / 投影 |
| 筛选浮层 | 底部弹窗动画；chip 选中态即时切换 |

### 3.7 层级（z-index）

| 层级 | 值 |
| --- | --- |
| 底部 Tabbar | 98 |
| 页面导航栏 | 9999 |
| 下拉刷新面板 | 10000 |
| 筛选底部浮层 | 10000 |
| 底部固定 CTA | 20 |
| 表单底部提交条 | 10 |
| 页面内筛选面板 | 2（局部） |
| 页面内遮罩 | 1（局部） |

### 3.8 图标与图片

- **图标**：优先 `uni-icons`（left / right / search / location / phone / calendar / compose / map-filled / checkmarkempty 等）；首页宫格、Tab、房源信息格、服务驿站图标使用 PNG 切图。
- **占位图**：`placeholder1.png`（Banner）、`placeholder2.png`（项目 / 房源）、`placeholder3.png`（驿站 / 企业）、`news.webp`（新闻）、`detail-empty.png`（房源无图）、`transparent.png`（透明占位）。
- **图片比例**：Banner 750×430、产业运营 Banner 750×420、空间封面 4:3、新闻缩略图 3:2、政策封面 ≈2.46:1、驿站缩略图 1:1、驿站头图 16:9、企业 Logo 1:1、房源头图 4:3、房源实拍 4:3、宣传片封面 16:9、地图底图 1685×1280。
- **加载策略**：图片统一 `mode="aspectFill"` 裁切（除长图 / 平面图用 `widthFix`）；头像 / Logo 圆形或 16rpx 圆角。

---

## 4. 布局与适配

### 4.1 全局页面骨架

```
<fuhui-refresh>           ← 可下拉刷新的页面
  <fuhui-navbar />        ← 固定 / 透明 / 普通
  <页面内容 />
</fuhui-refresh>
<fuhui-tabbar :current="n" />   ← 仅 4 个 Tab 页
```

- 页面统一 `min-height: 100vh`，设置对应底色。
- 导航栏默认 `fixed + placeholder`，页面内容无需额外顶部 padding。
- Tab 页底部由 `<fuhui-tabbar>` 自动占位（50px + 安全区）。
- 详情页底部固定 CTA 时，页面需预留 `padding-bottom: 180–260rpx + 安全区`。

### 4.2 导航栏

- 高度 = `statusBarHeight + navBarHeight`；微信端 `navBarHeight` 由胶囊位置推导，默认 44px。
- 标题 28rpx / 500，绝对居中；左右各预留胶囊宽度，避免遮挡。
- 返回热区 40×40px，400ms 防重锁。
- 透明模式：整条 `pointer-events: none`，只恢复返回按钮可点；适合地图 / 头图页。
- 深色头图页使用 `transparent + scrim=false` + `color="#ffffff"`。

### 4.3 Tabbar

- 内容高 50px + 底部安全区。
- 图标 56rpx，文案 22rpx；默认色 `#B3BFCB`，选中 `#1A365D`。
- 顶部 1px `#ECEFF3` 分隔线，白底。
- 角标：红底 `#E2574C`，18rpx。

### 4.4 安全区

- 底部：`safeAreaInsets.bottom`（px）。
- CTA / 表单提交条使用 `padding-bottom: calc(… + env(safe-area-inset-bottom))`。
- 手写 `constant()` 与 `env()` 双写，兼容旧 iOS。

### 4.5 单位规范

- 设计稿宽度 750rpx，所有静态尺寸用 `rpx`。
- 手势距离、导航栏 / 安全区等运行时尺寸用 `px`。
- 不依赖 `transformPx`（`manifest.json` 中为 false）。
- 组件内 `:style` 绑定必须返回字符串（Vue 2 下对象会渲染成 `[object Object]`）。

### 4.6 六种页面版式

| 版式 | 结构 | 代表页 |
| --- | --- | --- |
| 首页版式 | 全宽 Banner → 品牌行 → 概况卡 → 宫格 → 内容流 | `index` |
| 列表版式 | 搜索 / 筛选 → 列表卡 | `recommend`、`news-list`、`policy-list`、`activity-list` |
| 详情版式 | 头图 → 白色平面块 / 卡片 → 固定 CTA | `space-detail`、`house-detail`、`company-detail` |
| 文章版式 | 标题 → meta → 分隔线 → mp-html | 6 个 richtext 页 |
| 表单版式 | 标题条 → 卡片分组 → 固定提交 | `demand-form`、`dynamic-form`、`booking-form` |
| 全屏地图版式 | 全屏 Canvas → 透明导航 → 底部弹窗 | `map-detail`、`hotspot-map` |

---

## 5. 组件规范

### 5.1 `fuhui-navbar`

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `title` | String | `''` | 标题 |
| `back` | String | `'auto'` | `auto` / `show` / `hide`；不能用 Boolean |
| `transparent` | Boolean | `false` | 透明浮层，整条不拦截点击 |
| `bgColor` | String | `#ffffff` | 普通模式背景 |
| `color` | String | `#000000` | 标题 / 图标颜色 |
| `fixed` | Boolean | `true` | 固定定位 |
| `placeholder` | Boolean | `true` | 是否占位撑开页面 |
| `border` | Boolean | `false` | 底部分隔线 |
| `scrim` | Boolean | `true` | 透明模式顶部白色渐变遮罩 |
| `zIndex` | Number | `9999` | 层级 |

事件：`back`。插槽：`left` / `center` / `right`。

### 5.2 `fuhui-tabbar`

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `list` | Array | `TAB_ITEMS` | Tab 配置 |
| `current` | Number | 必传 | 当前下标 |
| `color` / `activeColor` | String | `#B3BFCB` / `#1A365D` | 文案色 |
| `bgColor` / `borderColor` | String | `#fff` / `#ECEFF3` | 背景 / 边框 |
| `border` / `safeArea` / `fixed` | Boolean | `true` | 边框 / 安全区 / 固定 |
| `zIndex` | Number | `98` | 层级 |

点击行为：下标 → `switchTo(item)`；`switchTab` 失败回落 `reLaunch`。

### 5.3 `fuhui-refresh`

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `refreshing` | Boolean | `false` | 父页面加载状态 |
| `top` | Number | `null` | 面板顶部 px |
| `follow` | Boolean | `true` | 内容是否跟手下移 |
| `disabled` | Boolean | `false` | 禁用 |

事件：`refresh`。状态：`idle → pulling → ready → refreshing → done`。
参数：最大距离 120px、触发阈值 50px、阻尼 0.5；刷新完成停留 300ms，收起 220ms。
已接入 12 页：首页、空间推荐、产业运营、联系我们、服务驿站、驿站列表、片区详情、房源列表、政策列表、活动列表、新闻列表、入口页。

### 5.4 `fuhui-bottom-popup`

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `visible` | Boolean | `false` | 显示 |
| `mask` | Boolean | `true` | 遮罩；地图场景传 `false` |
| `closeOnMask` | Boolean | `true` | 点遮罩关闭 |
| `bgColor` | String | `#fff` | 背景 |
| `radius` | String | `24rpx` | 顶部圆角 |
| `zIndex` | Number | `90` | 层级 |
| `maxHeight` | String | `80vh` | 最大高度 |

事件：`close`。底部自动加安全区占位。

### 5.5 `fuhui-canvas-hotspot` / `fuhui-image-hotspot`

| Prop | 默认 | 说明 |
| --- | --- | --- |
| `src` | — | 底图 |
| `hotspots` | `[]` | `{ name, points, color, label, labelAt, top, noHit, noFill, border, borderWidth, vrUrl }` |
| `imageWidth` / `imageHeight` | 1685 / 1280 | 底图坐标系 |
| `markers` | `[]` | `{ x, y, key, name, label, labelDir }` |
| `renderWidth` | 1200 | 导出宽，上限 1365 |
| `fullscreen` | `false` | 全屏模式 |
| `fit` | `'cover'` | `cover` / `contain` |
| `showFill` / `showLabels` / `showMarkers` / `showMarkerLabels` | `true` | 绘制开关 |
| `maxScale` | 4 | 最大缩放 |

事件：`select`，参数 `{ name, index, hotspot, x, y }`。

交互：
- 单指拖动、双指缩放 1–4 倍。
- 点击按坐标反算底图像素，射线法命中；`noHit` 片区点击穿透。
- 选中片区播放 1600ms 抬升 / 提亮动画。
- 点位图标不可点击，只随片区走。
- 导出宽按页面选择：列表地图 900、独立地图 1200、全屏 1365。

### 5.6 骨架屏规范

- 全局类：`.sk`（底色 + 裁切 + 扫光）、`.sk-line`（28rpx 高）、`.sk-line-sm`（20rpx 高）。
- 每页骨架结构与真实布局复用同一批 class，保证切换不跳动。
- 最短展示 300ms（`MIN_SKELETON_MS`）。
- 下拉刷新时不重新展示骨架屏（推荐页等）。

### 5.7 空态 / 错误态

| 状态 | 表现 |
| --- | --- |
| 列表为空 | 居中细图标 + 文案 + 可选操作文字 |
| 404 / 已下架 | 整页居中「xx不存在或已下架」 |
| 网络失败 | toast「加载失败，请稍后重试」+ 空态 / 重新加载 |
| 未配置 | toast「暂无全景」「暂未配置」等 |

---

## 6. 页面设计详述

### 6.1 首页

**布局**

1. 全宽 Banner：430rpx，圆点底部居中，左下标题 44rpx + 副标题 24rpx；顶部悬浮磨砂搜索框 80rpx。
2. 品牌行：Logo 76rpx 圆形 + 品牌名 32rpx + 副标题 24rpx。
3. 总体概况卡：左右结构、背景图、白字标题 30rpx + 副标题 16rpx + 描边胶囊按钮；左右边距 30rpx，圆角 28rpx。
4. 8 宫格：4 列 × 2 行，图标 120rpx 圆形，标题 24rpx / 600，说明 18rpx。
5. 宣传片卡：深蓝渐变（`#17325A → #2A5486`），橙色播放圆 44rpx，标题 26rpx，右侧「播放 ›」。
6. 重点项目：横向滚动，卡片 320rpx 宽、封面 172rpx，类型角标左上，名称 28rpx，片区标签 20rpx，待租 22rpx。
7. 新闻动态：白色横向卡片，标题 30rpx 两行，标签橙 + 日期弱灰，右侧封面 208×132rpx；底部「查看更多」。

**交互**：Banner / 宫格 / 项目 / 新闻按接口 `link` / `linkType` 跳转；分享标题 / 路径 / 图取 `/config.share`；下拉刷新并行拉 `/home` + `/config`。

### 6.2 空间推荐

**布局**

1. 搜索胶囊：80rpx，白底，放大镜 + 灰色提示。
2. 地图卡：白卡，头部 104rpx（`overview1.png` 底 + 白色圆底地图图标 + 「产业空间地图 / 产业社区分布一览」+ 右侧「查看大图 ›」）；地图本体 900 宽 Canvas；底部提示 22rpx。
3. 筛选条：三枚等宽 chip（空间类型 / 所属片区 / 更多筛选），68rpx 高，选中时深蓝描边 + 加粗。
4. 筛选浮层：底部弹窗，三组选项；打开时复制草稿，确定生效，重置清空并收起，点遮罩丢弃。
5. 列表头：34rpx 标题 + 右侧排序（按推荐 / 按面积）。
6. 空间卡：封面 300rpx；类型角标左上（接口色）、VR 角标右上深色胶囊；名称 34rpx、街道 24rpx；片区 24rpx 橙 + 标签 chip 22rpx；描述 24rpx；虚线信息区（空间类型 / 租赁信息，图标 60rpx、标签 24rpx、值 26rpx 深蓝）；底部「查看项目 ›」+ 橙色圆角「全景看空间 →」。

**交互**：点地图片区进 `area-detail`；点卡片进 `space-detail`；点「租赁信息」进 `house-list`；点 VR 进 `webview-vr`。地图区域 `touch*.stop`，不触发下拉刷新。

### 6.3 产业运营

**布局**

1. 深色头部：当前 Banner 放大 130% + 22px 模糊 + 深蓝压暗 + 底部渐隐；透明导航栏白字；Banner 400rpx 圆角 18rpx，左下标题 44rpx。
2. 政策速递卡：左侧政策图标 74×88rpx（虚线分隔），右侧标签 pill + 标题 27rpx + 日期 24rpx。
3. 产业活动：横向滚动卡 520×300rpx，背景图 + 渐变压暗，左上白描边标签，底部标题 34rpx + 日期 / 地点 24rpx；右上「查看更多」。
4. 企业需求：白色卡片，橙色 pill + 标题 28rpx，正文 24rpx，联系人 / 电话 / 提交时间；右上「填写需求」入口。
5. 调研问卷：背景图卡，白字标题 30rpx + 说明 22rpx，右侧橙色胶囊按钮。

**交互**：Banner / 政策 / 活动 / 问卷均按后台配置跳转；无政策 / 无活动 / 问卷关闭时整块隐藏。

### 6.4 联系我们

**布局**

1. 头图：设计稿切图（563×416 → 750rpx 宽约 554rpx），底部自带白色渐隐。
2. 内容区上压 -260rpx，白卡依次为招商热线、服务范围、位置地图。
3. 招商热线卡：图标 + 标题 32rpx；姓名 32rpx、电话 40rpx / 700、工作时间 24rpx；右侧橙色「拨打电话」胶囊。
4. 服务范围：灰底标签，32rpx 字号，10rpx 圆角。
5. 位置地图：360rpx 高，禁用缩放 / 拖动，点击调起系统导航。

### 6.5 搜索

- 顶部 80rpx 胶囊：搜索图标 + 输入框 + 清除 × + 橙色「搜索」按钮（56rpx 高）。
- 未搜索：热门搜索标题（竖条 + 30rpx）+ 白底胶囊热词。
- 有结果：标题 + 总数；行式卡片：120rpx 缩略图 + 名称 30rpx + meta + 片区橙字 + 右箭头。
- 搜索中：「搜索中...」；无结果：大搜索图标 + 文案 + 副文案。

### 6.6 入口页（投融 / 孵化 / 人才公寓）

- 导航标题优先取首页宫格传入的 `?title=`，其次接口 `title`，最后「详情」。
- 列表：白色卡片，120rpx 圆形图标、名称 30rpx、单行说明 23rpx、右箭头。
- 条目跳转优先级：`path` + `linkType` → 条目 `id` 富文本 → toast「详情建设中」。
- 人才公寓 `building: true` 时整页「建设中」空态；条目为空显示「暂无内容」。

### 6.7 片区详情（`area-detail`）

1. 360° 全景横幅：120rpx 高，背景图 + 圆形图标 76rpx + 白字标题 30rpx + 副标题 22rpx + 橙色「进入 ›」。
2. 片区详情卡（可选）：标题竖条 + 缩略图 260rpx + 副标题 28rpx + 简介 26rpx；字段全空隐藏。
3. 类型 Tab：等宽，白底 68rpx，选中深蓝底白字。
4. 产业空间列表：与推荐页空间卡一致；标题右侧显示「共 N 处」。
5. 列表为空：「该片区暂无产业空间」。

### 6.8 地图系页面

| 页面 | 形态 | 关键点 |
| --- | --- | --- |
| `map` | 普通页面，1200 宽 Canvas | 标题 40rpx + 副标题；点片区进 `map-detail` |
| `map-detail` | 全屏 cover 地图 + 透明导航 + 底部弹窗 | 弹窗 `mask=false`；点片区切换内容；VR + 空间行 |
| `hotspot-map` | 全屏 contain 首屏完整可见 | 支持 `?name=` 直接展开；点「查看大图」进入 |
| `hotspot-map-cover` | 全屏 cover 铺满版副本 | 对比 / 回退，暂无入口 |
| `hotspot-demo` | 开发预览页 | 点位开关、全屏入口、刷新演示 |

弹窗结构：标题 40rpx + 「共 N 处产业空间」+ 关闭 ×；VR 横幅 120rpx；「▍产业空间」竖条标题；空间行 104rpx 缩略图 + 名称 32rpx + meta 24rpx + 右箭头。

### 6.9 项目详情（`space-detail`）

1. 头图卡：420rpx，圆角 24rpx，底部深色渐变；左上类型徽标 + 待租徽标，左下名称 42rpx + 地址 24rpx。
2. 「整体介绍」卡：竖条标题 + 正文 26rpx / 行高 44rpx。
3. 「基本情况」：2 列灰底统计块（标签 22rpx、数值 38rpx 橙、单位 22rpx）；楼栋 / 片区两行。
4. 「生态定位」：核心业态 chips。
5. 「入驻成本」：标签 / 值行，重点值橙色。
6. 「位置与交通」：地址、地铁、线路 chips。
7. 「物业基本情况」：多行。
8. 「明星企业」：Logo 92rpx + 名称 28rpx + 简介两行 + 橙色「查看详情 →」。
9. 底部固定 CTA：待租「查看待租房源」深蓝、VR「全景看空间」橙；无待租 / 无 VR 时整条隐藏。

### 6.10 房源列表（`house-list`）

1. 项目头卡：120rpx 封面 + 项目名 32rpx + 副标题 22rpx + 右侧描边「查看项目」。
2. 筛选条：楼层 / 面积 / 朝向三 chip，点任意打开同一张下拉面板；面板内三组选项，重置 / 确定。
3. 列表头：竖条 + 「可选空间」+「房源以实际为准」。
4. 房源卡：200rpx 方形缩略图（VR 角标）+ 标题「N层 · 用途 · 面积㎡」30rpx + 层高 / 物业费 / 租金 meta 22rpx + 右下橙色「看房 ›」。

### 6.11 房源详情（`house-detail`）

1. 头图：440rpx，有图轮播 / 无图灰底 3D 占位；VR / 图片角标居中，`1/N` 右下。
2. 白色主信息块：上翻 32rpx，顶部圆角 40rpx；标题 40rpx + 租金 32rpx 红；副标题 24rpx；实底标签；三列概况（数值 40rpx + 标签 24rpx）。
3. 「房源信息」：12 格，图标 56rpx + 标签 / 值；列宽 32% / 41.5% / 26.5%；默认展开，点「收起」显示前 6 格。
4. 「平面图」：宽 750，`widthFix`；未配置时整段隐藏。
5. 「实拍照片」：两列，246rpx 高，间距 20rpx。
6. 「所在位置」：白块，地址 + 原生地图 400rpx。
7. 「租赁说明」：两行入口，虚线分隔，右箭头；点击进 `lease-richtext`。
8. 底部固定双按钮：描边「拨打招商热线」+ 实底橙「预约看房」；96rpx 高，16rpx 圆角。

### 6.12 表单页

**共同结构**

- 顶部标题条：图标 / 标题 32rpx + 说明 22rpx。
- 白色卡片分组：标题竖条 + 28rpx 标题。
- 行高 92rpx；标签 26rpx；输入 26rpx；占位 `#B3BDCB`。
- 虚线分隔；必填星号 `*` 红色伪元素。
- textarea 220rpx，浅灰底 14rpx 圆角，右下字数统计。
- 底部固定提交条：92rpx 深蓝 `#17325A`，圆角 12rpx，白字 30rpx / 600。

**填写需求**：微信授权信息（头像 / 昵称 / 手机号，授权按钮橙色描边）+ 需求信息（类型胶囊、名称、内容、联系人、手机号）+ 协议勾选；提交 `POST /demands`。

**预约看房**：房源摘要卡 + 姓名 / 手机号 / 留言；提交 `POST /bookings`。

**动态表单**：接口驱动字段，支持 text / textarea / number / phone / radio / checkbox / select / date；radio / checkbox 为胶囊，select / date 用原生 picker；`409` 自动重拉表单并提示重新填写。

### 6.13 服务驿站

- 首页：分组标题（竖条 + 30rpx）+「更多」橙色；推荐卡 176rpx 方图 + 名称 32rpx + 描述两行 + 地址 24rpx；客服热线卡（头像 88rpx + 名称 / 电话 + 圆形拨号按钮）。
- 列表页：按 `?key=` 拉全量，导航标题取 `groupTitle`。
- 详情页：头图 420rpx；标题 38rpx；标签蓝底；地址块背景图 + 图标 50rpx + 地址 / 交通；正文 26rpx / 46rpx；实景图 `widthFix` 单列；地址可点击调起 `uni.openLocation`。

### 6.14 资讯与富文本

- 列表：新闻为横向卡（标题两行 + 标签 / 日期 + 缩略图 168×112rpx）；政策为整块出血封面 280rpx + 标题 / 摘要 / 标签 / 日期 / 来源；活动为白卡（橙色标签 + 标题 + 日历图标 + 日期 / 地点）。
- 详情：标题 38rpx / 700 / `#1A365D`；标签橙底 20rpx 圆角；日期 / 来源 24rpx 弱灰；2rpx 分隔线；正文 `mp-html`，行高 44–46rpx；新闻详情可带封面。
- 所有富文本页统一 36rpx 左右内边距、60rpx 底部留白。

### 6.15 其他页面

- **企业详情**：Logo 120rpx + 名称 34rpx + 简介两行 + 橙色浅底标签；「企业简介 / 主营业务 / 基本信息」白卡；无阴影。
- **公司介绍**：优先 `mp-html` 富文本（图片满宽），其次整页长图；无内容空态。
- **宣传片**：全屏 100vw×100vh 黑底，`object-fit: contain`，自动播放 + 原生控制条，无导航栏。
- **VR**：全屏 `web-view`；URL 由来源页传入，缺失时显示「暂无全景」。
- **服务协议 / 租赁说明 / 入口条目**：文章版式，`mp-html` 渲染。

---

## 7. 数据与接口

### 7.1 接口基础

- 基址：`https://wq264.huaqingsoft.com/api`
- 统一响应：`{ code, msg, data }`；`code = 0` 成功。
- 鉴权：请求头 `Authorization: Bearer <token>`，兼容 `token`。
- 登录：`uni.login → POST /auth/wechat/login → token`；`App.vue onLaunch` 全局静默登录（仅微信端）。
- 业务错误：HTTP 200 + 业务码；`401` 自动静默重登并重发；`404` 空态；`409` 版本冲突；`429` 限流。
- 幂等：写接口带 `clientRequestId`，10 分钟内重复提交返回首次结果。
- 公开接口失败静默（不弹 toast），页面自身展示空态；需登录接口失败展示后端 `msg`。

### 7.2 页面 → 接口映射

| 页面 | 主要接口 |
| --- | --- |
| 首页 | `GET /home`、`GET /config` |
| 空间推荐 | `GET /spaces`、`GET /map/points`、`GET /map/districts`、`GET /config` |
| 搜索 | `GET /spaces?keyword=`、`GET /config`（热词 / 类型） |
| 片区详情 | `GET /spaces?hotspot=`、`GET /map/districts/{name}`、`GET /config` |
| 地图 / 片区地图 / 地图弹窗 | `GET /map/districts`、`GET /map/points`、`GET /map/areas`、`GET /spaces?hotspot=` |
| 项目详情 | `GET /spaces/{id}`、`GET /config` |
| 企业详情 | `GET /companies/{id}` |
| 房源列表 | `GET /spaces/{id}/houses`、`GET /spaces/{id}`、`GET /config` |
| 房源详情 | `GET /houses/{id}` |
| 预约看房 | `GET /houses/{id}`（摘要）、`POST /bookings` |
| 租赁说明 | `GET /houses/{id}/lease/{type}` |
| 产业运营 | `GET /industry/home`、`GET /config` |
| 政策 / 活动 / 新闻列表 | `GET /policies`、`GET /activities`、`GET /news` |
| 政策 / 活动 / 新闻详情 | `GET /policies/{id}`、`GET /activities/{id}`、`GET /news/{id}` |
| 服务驿站 | `GET /station`、`GET /station/items`、`GET /station/items/{id}` |
| 入口页 / 条目 | `GET /entry-pages/{key}`、`GET /entry-items/{id}` |
| 填写需求 | `POST /demands`、`POST /auth/wechat/phone` |
| 服务协议 | `GET /documents/demand-agreement` |
| 动态表单 | `GET /questionnaires/{key}`、`POST /questionnaires/{key}/submissions` |
| 联系我们 | `GET /config`（`contact`） |
| 公司介绍 | `GET /about` |
| 宣传片 | `GET /config`（`video`） |

### 7.3 关键数据模型

- **space**：`id / name / type / typeInfo / street / area / hotspot / tags / desc / image / size / rentCount / vr / vrUrl / address / intro / stats / buildings / business / cost / metro / metroLines / property / company / vacancy / companies`
- **house**：`id / title / rent / subtitle / tags[{ text, tone }] / stats[{ value, label }] / info[{ icon, label, value }] / images / media{ plan, photos } / address / lat / lng / vr / vrUrl / contact / leaseEntries[{ type, label, icon }]`
- **company**：`id / name / desc / logo / tags / intro / business / industry / founded / scale`
- **district**：`name / polygon / color / label / labelAt / labelColor / labelStroke / labelShadow / noFill / border / borderWidth / top / noHit / vrUrl / sort / status`
- **map point**：`name / x / y / key / label / labelDir / hotspot / sort`
- **config**：`brand / overview / video / contact / share / spaceTypes / areas / searchHotWords / mapCard / vr / policyUpdatesIcon / questionnaire`
- **动态表单**：`key / title / desc / submitText / successText / version / enabled / fields[]{ key, label, type, required, placeholder, maxLength, options, defaultValue }`

### 7.4 数据策略

- **接口优先**：页面内容以接口返回为准；字段缺失时隐藏对应区块，不用本地业务数据兜底。
- **地图兜底**：`GET /map/districts` 失败时依次回落 Storage 缓存 → `utils/district-hotspots.js` 静态数据；底图缺失回落包内 CDN 图。
- **图片兜底**：后端图片为空时使用本地占位图，不阻断布局。
- **登录兜底**：公开接口在登录失败时仍放行；需登录接口直接 reject。
- **缓存**：`/config`、`/home` 建议 60s；片区数据按 `version` 覆盖 Storage；写接口 `no-store`。

---

## 8. 交互与文案规范

### 8.1 状态反馈

| 场景 | 反馈 |
| --- | --- |
| 首次加载 | 骨架屏，最短 300ms |
| 下拉刷新 | 顶部三点脉冲 + 文案「下拉刷新 / 松开刷新 / 正在刷新… / 刷新完成」 |
| 筛选 | 草稿态；「确定」生效，「重置」清空并收起，遮罩丢弃 |
| 表单校验 | toast 首条错误；必填红 `*`；手机号 `^1[3-9]\d{9}$` |
| 提交中 | 按钮文案「提交中…」+ 透明度 0.6 + 防重 |
| 提交成功 | success toast；800ms 后返回上一页，无栈回落对应首页 |
| 409 | 提示「表单已更新，请重新填写」并重拉 |
| 404 | 页面级空态，不弹 toast |
| 网络失败 | toast「加载失败，请稍后重试」+ 空态 / 「重新加载」 |

### 8.2 文案

- 页面标题：2–5 字，如「首页」「空间推荐」「产业运营」「联系我们」「项目详情」「房源详情」「片区详情」「服务驿站」「填写需求」「填写问卷」「租赁说明」「服务协议」「公司介绍」「平台宣传片」。
- 主 CTA：查看项目 / 全景看空间 / 查看待租房源 / 拨打招商热线 / 预约看房 / 填写需求 / 提交需求 / 提交预约 / 进入。
- 空态：暂无内容 / 暂无新闻 / 暂无政策 / 暂无活动 / 没有符合条件的空间 / 该片区暂无产业空间 / 该项目暂无待租房源 / 内容不存在或已下架 / 房源不存在或已下架 / 项目不存在或已下架 / 企业不存在或已下架。
- 提示：暂无全景 / 暂未配置 / 暂未配置位置 / 该条目详情建设中 / 表单已关闭，请稍后再试。

### 8.3 可访问性与可用性

- 正文最小 22rpx，关键信息不小于 24rpx；弱灰文字仅用于辅助信息，不承载唯一关键信息。
- 可点击区域不小于 40×40px（返回键、拨号键、筛选 chip 均满足）。
- 图片必须提供占位图或底色，避免布局塌陷。
- 长标题最多 1–2 行省略；片区名在 chip 内省略，三角固定不收缩。
- 不用纯颜色传达状态：选中 chip 同时加粗 + 描边 / 填充。

---

## 9. 技术约束与设计限制

1. **HBuilderX 工程**：没有 `package.json` / `node_modules` / CLI 构建；不要引入 npm 依赖或脚手架。
2. **Vue 2 实际生效**：`manifest.json` 中 `vueVersion: "2"`。
3. **所有页面必须挂载 `<fuhui-navbar>`**：全局 `navigationStyle: custom`。
4. **自定义 Tabbar 有意保留**：`pages.json` 的 `tabBar.custom: true`，不要删除或改为原生。
5. **rpx 规范**：`transformPx: false`，不要写 px 期望自动转换；运行时尺寸（状态栏 / 安全区 / 手势）用 px。
6. **组件自动注册**：`components/xxx/xxx.vue` 走 easycom，页面无需 import。
7. **Canvas 地图**：导出宽上限 1365；底图坐标系 1685×1280；点位名称在 1200 宽参考系计算落位；Canvas 不能放进 `movable-view` 直接缩放；透明导航栏会吞点击，需要 `pointer-events` 处理。
8. **原生 map / video / canvas**：属于原生组件，层级、圆角、手势需要单独处理（父级 `overflow` 不总是生效）。
9. **域名白名单**：微信后台需配置 request / uploadFile / downloadFile / web-view 合法域名；CDN 图需允许下载，H5 需允许跨域，否则 Canvas 导出降级为纯底图。
10. **接口数据缺口**：后端目前空间 / 房源 / 新闻等数据量有限；部分点位 VR、房源平面图 / 实拍、驿站图片待补；前端按空态 / 占位处理。
11. **未验证项**：Canvas 真机命中与导出、全屏地图观感、iOS 下拉刷新橡皮筋、原生地图手势、富文本排版、分享卡片等需真机回归。

---

## 10. 设计验收清单

- [ ] 4 个 Tab 页均正确挂载 navbar / tabbar，`current` 下标正确。
- [ ] 所有二级页有返回键；栈底返回回首页。
- [ ] 页面底色、卡片圆角、阴影层级符合「列表轻阴影 / 详情纯平面」规则。
- [ ] 主色 `#1A365D`、强调橙 `#F0821E` / CTA 橙 `#ED8936` 使用一致。
- [ ] 字号落在 18–44rpx 区间，正文不小于 22rpx。
- [ ] 骨架屏结构与真实布局一致，切换不跳动。
- [ ] 所有列表有空态；所有详情有 404 空态。
- [ ] 表单必填、手机号、提交防重、成功返回符合规范。
- [ ] 筛选统一草稿 / 确定 / 重置模式，chip 显示当前选项名。
- [ ] 图片缺失时占位图正常；长图 / 平面图不变形。
- [ ] 底部固定 CTA 与安全区适配，内容不被遮挡。
- [ ] 下拉刷新只在 12 个列表 / 内容页启用，地图 / 表单 / 详情不启用。
- [ ] 地图片区可点、点位不可点、`noHit` 穿透、选中动效正常。
- [ ] 所有接口失败均有 toast 或空态，不白屏、不永久 loading。
- [ ] 文案符合第 8.2 节，页面标题与导航一致。

---

> 备注：本文是设计规范，不是接口实现文档；接口字段、枚举与后台内容模型以 `API.md` v2.2 和 `HANDOVER.md` 为准。源项目 `fuhui` 全程只读，未做任何修改。
