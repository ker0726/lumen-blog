# LUMEN（墨光）产品需求文档

> 版本 v1.0 / 2026-11-07
> 定位：一个「会发光的数码杂志」式全栈博客系统 —— 编辑设计感 × 数码未来感。

---

## 1. 产品定位与目标

LUMEN 是面向开发者/设计师个人的内容平台，同时是一件作品集级作品：

- **第一眼的视觉冲击**：近黑墨底 + 电光橙/荧光绿高对比强调色，超大标题、错位网格、锐利切角，像《横竖撇捺》杂志撞见 Linear。
- **完整可用的博客闭环**：访客浏览/搜索/筛选，注册用户发布/编辑/删除自己的文章。
- **工程上可交付**：`npm install && npm run dev` 即可启动，权限边界清晰，SQL 注入与越权操作零容忍。

### 非目标（本期不做）

- 不做评论前端 UI（表结构预留）
- 不做富文本编辑器（坚持 Markdown）
- 不做后台管理面板 / 多角色权限（只有「访客 / 作者」两种身份）
- 不做图片上传（封面与正文图走外链 URL）

---

## 2. 用户角色

| 角色 | 能力 |
|---|---|
| 访客 | 浏览文章列表、搜索、按分类筛选、阅读详情、注册账号 |
| 注册用户（作者） | 访客全部能力 + 发布/编辑/删除**自己的**文章、管理个人文章列表 |

权限铁律：编辑与删除必须是「登录 + 资源归属本人」双重校验，后端逐接口强制，不依赖前端隐藏按钮。

---

## 3. 功能需求

### 3.1 认证

| 编号 | 需求 | 验收标准 |
|---|---|---|
| A1 | 注册 | username 3-20 位、email 格式校验、password ≥ 8 位；用户名/邮箱查重；bcrypt(10) 入库 |
| A2 | 登录 | 邮箱 + 密码登录，返回 JWT（7 天有效期）与脱敏用户信息 |
| A3 | 登录态保持 | token 存 localStorage，axios 拦截器自动带 `Authorization: Bearer <token>` |
| A4 | 路由保护 | /write、/profile 由 ProtectedRoute 包裹，未登录跳转 /login |
| A5 | 401 处理 | 拦截器收到 401 自动清 token 并跳登录页 |

### 3.2 文章

| 编号 | 需求 | 验收标准 |
|---|---|---|
| P1 | 文章列表 | 分页（page/pageSize）、分类筛选、关键词搜索（防抖 300ms）、按最新/最热排序 |
| P2 | 文章详情 | Markdown 渲染（GFM 表格/删除线/任务列表），浏览量 +1，展示作者信息 |
| P3 | 发布 | 标题/正文/分类必填；封面 URL、标签、摘要可选；支持草稿/发布两种状态 |
| P4 | 编辑 | 仅作者本人；/write?id=xxx 进入编辑模式，回填全部字段 |
| P5 | 删除 | 仅作者本人；前端二次确认；删除后从列表移除 |
| P6 | 写作体验 | /write 左编辑右预览（桌面端），移动端 Tab 切换编辑/预览 |

### 3.3 分类

| 编号 | 需求 | 验收标准 |
|---|---|---|
| C1 | 分类墙 | 首页展示全部分类，每个分类独立荧光色块 + 文章数统计 |
| C2 | 分类筛选 | 点击分类色块筛选列表，再次点击取消 |

---

## 4. 接口契约（摘要）

统一返回格式：

```json
{ "success": true, "data": {}, "message": "ok" }
```

错误时 `success: false`，`message` 为人类可读文案，HTTP 状态码语义化（400 参数错误 / 401 未登录 / 403 无权限 / 404 不存在 / 409 冲突 / 500 服务器错误）。

| 方法 | 路径 | 鉴权 | 说明 |
|---|---|---|---|
| POST | /api/auth/register | 无 | 注册 |
| POST | /api/auth/login | 无 | 登录，返回 JWT + user |
| GET | /api/posts | 无 | 列表：page/pageSize/category/keyword/sort |
| GET | /api/posts/:id | optionalAuth | 详情，views +1，带作者信息 |
| POST | /api/posts | 必须登录 | 发布，author 取 token |
| PUT | /api/posts/:id | 登录 + 本人 | 编辑 |
| DELETE | /api/posts/:id | 登录 + 本人 | 删除 |
| GET | /api/categories | 无 | 全部分类（含文章数统计） |

---

## 5. 视觉设计规范

### 5.1 配色

| 角色 | 色值 | 用途 |
|---|---|---|
| 底色（主） | `#0A0A0A` 近黑墨 | 全局背景 |
| 底色（辅） | `#F7F5F0` 纸白 | 文章阅读区 / 反色区块 |
| 主强调 | `#FF4D00` 电光橙 | 主按钮、关键 CTA、hover 描边 |
| 次强调 | `#C6FF00` 荧光绿 | 标签、行内代码、次要高亮 |
| 点缀 | `#6C2BD9` 深紫 / `#FF2E63` 品红 | 分类色、装饰元素 |
| 文字 | `#FFFFFF` / `#0A0A0A`，灰度仅 `#A3A3A3 / #525252 / #262626` 三档 | 不糊不脏 |

### 5.2 字体

- 大标题：Space Grotesk（备选 Clash Display），weight 700，字距 -0.03em，字号夸张（首页 Hero ≥ clamp(3rem, 10vw, 8rem)）
- 正文：Inter + Noto Sans SC，行高 1.7
- 代码：JetBrains Mono

### 5.3 组件语言

- 导航栏：毛玻璃 `backdrop-blur`，滚动超过 24px 后加深底色并出现 1px 强调色底边
- Hero：超大错位标题 + 网格/噪点背景 + 电光橙色块装饰
- 文章卡片：clip-path 切角，hover 时强调色描边 + 4px 位移阴影（无模糊大阴影）
- 按钮：异形切角（clip-path polygon），主按钮实心高饱和，次按钮描边 + hover 发光
- 分类标签：实心荧光色块 + 黑字
- Markdown 正文：定制 prose —— 大引用块（4px 橙色左边线 + 纸白底反色）、荧光绿行内代码、深色宽代码块、图片圆角 + 阴影
- 微动效：页面进场淡入上浮、卡片交错出现（stagger）、大标题 hover 轻微 glitch；全部尊重 `prefers-reduced-motion`

### 5.4 响应式

- 移动端单列，md 起双列，lg 三列；断点严格走 Tailwind 默认（sm/md/lg/xl）

---

## 6. 技术架构

```
client (React18 + TS + Vite + Tailwind)
   │  axios（拦截器带 JWT）
   ▼
server (Express + TS)
   ├── middleware: authenticateToken / optionalAuth / errorHandler / validate
   ├── routes: auth / posts / categories
   └── mysql2 连接池（参数化查询）
        ▼
     MySQL 8（users / posts / categories / comments）
```

- 前后端分离两个包，开发期 Vite proxy 转发 `/api` → `localhost:3001`
- JWT 有效期 7 天，密钥经 dotenv 注入，严禁硬编码
- 首次启动自动建库建表 + 种子分类（详见 database.md §5）

---

## 7. 里程碑

| 阶段 | 内容 | 状态 |
|---|---|---|
| M1 | 项目结构 + database.md + PRD.md | ✅ 本次交付 |
| M2 | 后端全部接口跑通（含自动建表） | ⏳ |
| M3 | 前端路由 + 布局 + 设计系统落地 | ⏳ |
| M4 | 全部页面联调 + 视觉打磨 | ⏳ |
