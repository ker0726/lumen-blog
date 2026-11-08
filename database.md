# LUMEN（墨光）数据库设计文档

> MySQL 8.x / InnoDB / utf8mb4
> 字符集统一 `utf8mb4` + `utf8mb4_unicode_ci`，完整支持 emoji 与多语言。
> 所有表使用 InnoDB，保证外键与事务能力。

---

## 1. 实体关系总览

```
users 1 ──── n posts
categories 1 ──── n posts
users 1 ──── n comments
posts 1 ──── n comments
```

- 一个用户可发布多篇文章；一篇文章只属于一个作者。
- 一个分类下有多篇文章；一篇文章只归属一个分类（标签 tags 承担多维度）。
- 评论为进阶功能，挂在文章与用户上，双向级联删除。

---

## 2. 表结构定义

### 2.1 users（用户表）

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | INT UNSIGNED | PK, AUTO_INCREMENT | 用户 ID |
| username | VARCHAR(20) | NOT NULL, UNIQUE | 用户名，3-20 位 |
| email | VARCHAR(255) | NOT NULL, UNIQUE | 邮箱（登录账号） |
| password | VARCHAR(60) | NOT NULL | bcrypt 哈希（salt rounds = 10，输出固定 60 字符） |
| avatar | VARCHAR(500) | DEFAULT NULL | 头像 URL |
| bio | VARCHAR(500) | DEFAULT NULL | 个人简介 |
| created_at | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 注册时间 |

**索引**

| 索引名 | 字段 | 类型 | 用途 |
|---|---|---|---|
| PRIMARY | id | BTREE | 主键 |
| uk_users_username | username | UNIQUE | 登录/查重 |
| uk_users_email | email | UNIQUE | 登录/查重 |

**设计说明**
- `password` 定长 VARCHAR(60)：bcrypt 输出恒为 60 字符，避免用 TEXT 浪费。
- `username`、`email` 双唯一索引：注册时数据库层兜底防并发重复（先 SELECT 查重给友好提示，冲突时捕获 `ER_DUP_ENTRY`）。
- 密码哈希**永不进入任何 SELECT 返回**，接口层显式剔除。

---

### 2.2 categories（分类表）

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | INT UNSIGNED | PK, AUTO_INCREMENT | 分类 ID |
| name | VARCHAR(50) | NOT NULL, UNIQUE | 分类名 |
| slug | VARCHAR(50) | NOT NULL, UNIQUE | URL 友好标识 |
| description | VARCHAR(255) | DEFAULT NULL | 分类描述 |
| color | VARCHAR(7) | NOT NULL, DEFAULT '#FF4D00' | 荧光标签色（HEX） |
| created_at | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 创建时间 |

**索引**

| 索引名 | 字段 | 类型 |
|---|---|---|
| PRIMARY | id | BTREE |
| uk_categories_name | name | UNIQUE |
| uk_categories_slug | slug | UNIQUE |

**设计说明**
- `color` 存 HEX 色值，前端直接渲染「色块标签」，每分类一种荧光色，是视觉规范的核心元素。
- 文章数统计不落库，`GET /api/categories` 用 `LEFT JOIN + COUNT` 实时计算，避免冗余字段不一致。

---

### 2.3 posts（文章表）

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | INT UNSIGNED | PK, AUTO_INCREMENT | 文章 ID |
| title | VARCHAR(200) | NOT NULL | 标题 |
| slug | VARCHAR(220) | NOT NULL, UNIQUE | URL 标识（标题转写 + 短随机后缀防冲突） |
| content | MEDIUMTEXT | NOT NULL | Markdown 原文 |
| excerpt | VARCHAR(500) | DEFAULT NULL | 摘要（为空时后端截取正文前 200 字） |
| cover | VARCHAR(500) | DEFAULT NULL | 封面图 URL |
| category_id | INT UNSIGNED | DEFAULT NULL, FK → categories.id | 所属分类（允许未分类） |
| tags | JSON | DEFAULT NULL | 标签数组，如 `["react","设计"]` |
| author_id | INT UNSIGNED | NOT NULL, FK → users.id | 作者 |
| views | INT UNSIGNED | NOT NULL, DEFAULT 0 | 浏览量 |
| status | ENUM('draft','published') | NOT NULL, DEFAULT 'published' | 状态 |
| created_at | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新时间 |

**索引**

| 索引名 | 字段 | 类型 | 用途 |
|---|---|---|---|
| PRIMARY | id | BTREE | 主键 |
| uk_posts_slug | slug | UNIQUE | SEO 友好详情地址 |
| idx_posts_category_id | category_id | BTREE | 分类筛选 |
| idx_posts_author_id | author_id | BTREE | 「我的文章」 |
| idx_posts_status_created | (status, created_at) | BTREE | 已发布列表按时间倒序（最常用查询） |

**外键**

| 约束名 | 字段 | 引用 | ON DELETE | ON UPDATE |
|---|---|---|---|---|
| fk_posts_author | author_id | users(id) | CASCADE | CASCADE |
| fk_posts_category | category_id | categories(id) | SET NULL | CASCADE |

**设计说明**
- 作者删除账号 → 其文章级联删除；分类被删除 → 文章保留但分类置空（`SET NULL`），符合直觉。
- `tags` 用 MySQL 原生 JSON 类型，可用 `JSON_CONTAINS` 查询；本期标签只做展示与存储，筛选走分类 + 关键词。
- `excerpt` 允许 NULL：发布时若前端未填，后端从 Markdown 去标记截取前 200 字符自动生成。
- 最常用查询是「已发布文章按创建时间倒序分页」，因此建 `(status, created_at)` 联合索引覆盖。
- 列表关键词搜索用 `WHERE title LIKE ? OR excerpt LIKE ?`，数据量上来后可平滑迁移到 FULLTEXT 或 ES，表结构无需变更。

---

### 2.4 comments（评论表，可选进阶）

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | INT UNSIGNED | PK, AUTO_INCREMENT | 评论 ID |
| post_id | INT UNSIGNED | NOT NULL, FK → posts.id | 所属文章 |
| author_id | INT UNSIGNED | NOT NULL, FK → users.id | 评论者 |
| content | TEXT | NOT NULL | 评论内容（纯文本） |
| created_at | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 评论时间 |

**索引 / 外键**

| 名称 | 字段 | 说明 |
|---|---|---|
| PRIMARY | id | 主键 |
| idx_comments_post_id | post_id | 按文章拉取评论列表 |
| fk_comments_post | post_id → posts(id) | ON DELETE CASCADE |
| fk_comments_author | author_id → users(id) | ON DELETE CASCADE |

> 本期前端不渲染评论区，表结构预留，接口可后置实现。

---

## 3. 建表 SQL（`server/src/db/schema.sql`）

```sql
-- =============================================================
-- LUMEN Blog Schema (MySQL 8.x / InnoDB / utf8mb4)
-- =============================================================

CREATE TABLE IF NOT EXISTS users (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  username    VARCHAR(20)  NOT NULL,
  email       VARCHAR(255) NOT NULL,
  password    VARCHAR(60)  NOT NULL COMMENT 'bcrypt hash, salt rounds = 10',
  avatar      VARCHAR(500) DEFAULT NULL,
  bio         VARCHAR(500) DEFAULT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_username (username),
  UNIQUE KEY uk_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS categories (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(50)  NOT NULL,
  slug        VARCHAR(50)  NOT NULL,
  description VARCHAR(255) DEFAULT NULL,
  color       VARCHAR(7)   NOT NULL DEFAULT '#FF4D00' COMMENT '荧光标签色 HEX',
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_categories_name (name),
  UNIQUE KEY uk_categories_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS posts (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title       VARCHAR(200) NOT NULL,
  slug        VARCHAR(220) NOT NULL,
  content     MEDIUMTEXT   NOT NULL COMMENT 'Markdown 原文',
  excerpt     VARCHAR(500) DEFAULT NULL,
  cover       VARCHAR(500) DEFAULT NULL,
  category_id INT UNSIGNED DEFAULT NULL,
  tags        JSON         DEFAULT NULL COMMENT '标签数组',
  author_id   INT UNSIGNED NOT NULL,
  views       INT UNSIGNED NOT NULL DEFAULT 0,
  status      ENUM('draft','published') NOT NULL DEFAULT 'published',
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_posts_slug (slug),
  KEY idx_posts_category_id (category_id),
  KEY idx_posts_author_id (author_id),
  KEY idx_posts_status_created (status, created_at),
  CONSTRAINT fk_posts_author   FOREIGN KEY (author_id)   REFERENCES users (id)      ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_posts_category FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS comments (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  post_id    INT UNSIGNED NOT NULL,
  author_id  INT UNSIGNED NOT NULL,
  content    TEXT         NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_comments_post_id (post_id),
  CONSTRAINT fk_comments_post   FOREIGN KEY (post_id)   REFERENCES posts (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_comments_author FOREIGN KEY (author_id) REFERENCES users (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 4. 种子数据（`server/src/db/init.ts` 内置）

首次启动检测到 `categories` 为空时插入 6 个内置分类，颜色对应视觉规范的荧光色系：

| name | slug | color |
|---|---|---|
| 前端工程 | frontend | `#FF4D00` 电光橙 |
| 设计系统 | design | `#C6FF00` 荧光绿 |
| 后端架构 | backend | `#6C2BD9` 深紫 |
| 产品思考 | product | `#FF2E63` 品红 |
| 效率工具 | tools | `#00D4FF` 电子蓝 |
| 随笔 | notes | `#FFB800` 暖黄 |

同时插入 1 个演示账号（仅开发环境，`SEED_DEMO_USER=true` 时生效）：

- username: `demo` / email: `demo@lumen.dev` / password: `Demo1234`（入库为 bcrypt 哈希）

---

## 5. 自动初始化策略

`server/src/index.ts` 启动流程：

1. 读取 `.env`（dotenv）→ 校验 `DB_HOST / DB_USER / DB_PASSWORD / DB_NAME / JWT_SECRET` 必填。
2. 用 `mysql2/promise` 先以**无库连接**执行 `CREATE DATABASE IF NOT EXISTS lumen CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
3. 建立带库连接池（`connectionLimit: 10`）。
4. 逐条执行 `schema.sql`（`IF NOT EXISTS` 幂等，重复启动安全）。
5. `SELECT COUNT(*) FROM categories`，为 0 则插入种子分类。
6. 全部就绪后才 `app.listen()`，保证服务可用时表必然存在。

> 所有查询走连接池 + 参数化（`pool.query(sql, [params])`），禁止字符串拼接 SQL。
