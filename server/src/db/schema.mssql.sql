-- =============================================================================
-- LUMEN 墨光博客 —— SQL Server 建表脚本（对应 DB_DRIVER=mssql）
-- =============================================================================
-- 与 MySQL 版（schema.sql）字段一一对应，适配 T-SQL 方言：
--   AUTO_INCREMENT   -> IDENTITY(1,1)
--   ENUM             -> VARCHAR + CHECK 约束
--   JSON 列          -> NVARCHAR(MAX)（以字符串形式存 JSON）
--   MEDIUMTEXT       -> NVARCHAR(MAX)
--   ON UPDATE 时间戳 -> 由应用层 UPDATE 语句显式维护
--   反引号 `          -> 方括号 []
-- =============================================================================

USE [My app];
GO

-- ---------------------------------------------------------------------------
-- 1. 用户表
-- ---------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'users')
CREATE TABLE users (
  id         INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  username   NVARCHAR(20)  NOT NULL,
  email      NVARCHAR(255) NOT NULL,
  password   NVARCHAR(60)  NOT NULL,            -- bcrypt 哈希（60 字符）
  avatar     NVARCHAR(500) NULL,
  bio        NVARCHAR(500) NULL,
  created_at DATETIME      NOT NULL CONSTRAINT DF_users_created DEFAULT (SYSDATETIME())
);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'uk_users_username')
  CREATE UNIQUE INDEX uk_users_username ON users(username);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'uk_users_email')
  CREATE UNIQUE INDEX uk_users_email ON users(email);

-- ---------------------------------------------------------------------------
-- 2. 分类表
-- ---------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'categories')
CREATE TABLE categories (
  id          INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  name        NVARCHAR(50)  NOT NULL,
  slug        NVARCHAR(50)  NOT NULL,
  description NVARCHAR(255) NULL,
  color       NVARCHAR(7)   NOT NULL CONSTRAINT DF_categories_color DEFAULT ('#FF4D00'),
  created_at  DATETIME      NOT NULL CONSTRAINT DF_categories_created DEFAULT (SYSDATETIME())
);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'uk_categories_name')
  CREATE UNIQUE INDEX uk_categories_name ON categories(name);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'uk_categories_slug')
  CREATE UNIQUE INDEX uk_categories_slug ON categories(slug);

-- ---------------------------------------------------------------------------
-- 3. 文章表
-- ---------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'posts')
CREATE TABLE posts (
  id          INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  title       NVARCHAR(200)  NOT NULL,
  slug        NVARCHAR(220)  NOT NULL,
  content     NVARCHAR(MAX)  NOT NULL,
  excerpt     NVARCHAR(500)  NULL,
  cover       NVARCHAR(500)  NULL,
  category_id INT            NULL,
  tags        NVARCHAR(MAX)  NULL,                       -- JSON 数组字符串
  author_id   INT            NOT NULL,
  views       INT            NOT NULL CONSTRAINT DF_posts_views DEFAULT (0),
  status      NVARCHAR(20)   NOT NULL CONSTRAINT DF_posts_status DEFAULT ('published')
              CONSTRAINT CK_posts_status CHECK (status IN ('draft','published')),
  created_at  DATETIME       NOT NULL CONSTRAINT DF_posts_created DEFAULT (SYSDATETIME()),
  updated_at  DATETIME       NOT NULL CONSTRAINT DF_posts_updated DEFAULT (SYSDATETIME())
);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'uk_posts_slug')
  CREATE UNIQUE INDEX uk_posts_slug ON posts(slug);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_posts_category_id')
  CREATE INDEX idx_posts_category_id ON posts(category_id);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_posts_author_id')
  CREATE INDEX idx_posts_author_id ON posts(author_id);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_posts_status_created')
  CREATE INDEX idx_posts_status_created ON posts(status, created_at);

-- ---------------------------------------------------------------------------
-- 4. 评论表（预留）
-- ---------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'comments')
CREATE TABLE comments (
  id         INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
  post_id    INT           NOT NULL,
  author_id  INT           NOT NULL,
  content    NVARCHAR(MAX) NOT NULL,
  created_at DATETIME      NOT NULL CONSTRAINT DF_comments_created DEFAULT (SYSDATETIME())
);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_comments_post_id')
  CREATE INDEX idx_comments_post_id ON comments(post_id);

-- ---------------------------------------------------------------------------
-- 5. 外键
-- ---------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_posts_author')
  ALTER TABLE posts ADD CONSTRAINT fk_posts_author
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_posts_category')
  ALTER TABLE posts ADD CONSTRAINT fk_posts_category
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_comments_post')
  ALTER TABLE comments ADD CONSTRAINT fk_comments_post
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_comments_author')
  ALTER TABLE comments ADD CONSTRAINT fk_comments_author
    -- 注意：SQL Server 不允许多重级联路径（comments 同时级联到 posts 和 users），
    -- 故作者外键使用 NO ACTION；删用户时其评论由应用层先清理，或直接保留。
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE NO ACTION;

-- ---------------------------------------------------------------------------
-- 6. 种子：6 个分类
-- ---------------------------------------------------------------------------
INSERT INTO categories (name, slug, description, color)
SELECT * FROM (VALUES
  (N'前端工程', N'frontend', N'React / TS / 工程化实践', '#FF4D00'),
  (N'设计系统', N'design',   N'视觉规范 / 组件设计 / 排版', '#C6FF00'),
  (N'后端架构', N'backend',  N'Node / 数据库 / 接口设计', '#6C2BD9'),
  (N'产品思考', N'product',  N'产品判断与增长思考', '#FF2E63'),
  (N'效率工具', N'tools',    N'提升开发效率的工具链', '#00D4FF'),
  (N'随笔',     N'notes',    N'不成体系的想法记录', '#FFB800')
) AS v(name, slug, description, color)
WHERE NOT EXISTS (SELECT 1 FROM categories c WHERE c.slug = v.slug);

-- ---------------------------------------------------------------------------
-- 7. 种子：演示账号 demo@lumen.dev / Demo1234（bcrypt 10 轮哈希）
-- ---------------------------------------------------------------------------
INSERT INTO users (username, email, password, bio)
SELECT * FROM (VALUES
  ('demo', 'demo@lumen.dev',
   '$2a$10$K/7cyYRB8l1qRl3S.A8wY.XtAiQpquEQ9b6Z9JfiaXOlI6m7hHaXq',
   'LUMEN 演示账号')
) AS v(username, email, password, bio)
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.email = v.email);

PRINT 'LUMEN schema initialized on SQL Server.';
