-- =============================================================================
-- LUMEN 墨光博客 —— MySQL 初始化脚本（可独立执行，不依赖应用启动自动建表）
-- =============================================================================
-- 使用方式：
--   方式一（命令行）：mysql -u root -p < init.sql
--   方式二（工具）  ：在 Navicat / DBeaver / phpMyAdmin 中打开本文件并执行
--
-- 说明：
--   1. 脚本幂等：建表使用 CREATE TABLE IF NOT EXISTS，种子数据使用 INSERT IGNORE
--   2. 字符集统一 utf8mb4，支持 emoji 与多语言
--   3. 如需「干净重建」，先执行脚本末尾的清理段（已注释）
--   4. 演示账号：demo@lumen.dev / Demo1234（密码已 bcrypt 加密）
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. 建库
-- ---------------------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS `lumen`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `lumen`;

-- ---------------------------------------------------------------------------
-- 1. 用户表
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username`   VARCHAR(20)  NOT NULL                        COMMENT '用户名，3-20 位',
  `email`      VARCHAR(255) NOT NULL                        COMMENT '邮箱（登录账号）',
  `password`   VARCHAR(60)  NOT NULL                        COMMENT 'bcrypt 哈希（salt rounds = 10，定长 60 字符）',
  `avatar`     VARCHAR(500) DEFAULT NULL                    COMMENT '头像 URL',
  `bio`        VARCHAR(500) DEFAULT NULL                    COMMENT '个人简介',
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '注册时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_username` (`username`),
  UNIQUE KEY `uk_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- ---------------------------------------------------------------------------
-- 2. 分类表
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `categories` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(50)  NOT NULL                        COMMENT '分类名',
  `slug`        VARCHAR(50)  NOT NULL                        COMMENT 'URL 友好标识',
  `description` VARCHAR(255) DEFAULT NULL                    COMMENT '分类描述',
  `color`       VARCHAR(7)   NOT NULL DEFAULT '#FF4D00'      COMMENT '荧光标签色（HEX）',
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_categories_name` (`name`),
  UNIQUE KEY `uk_categories_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='分类表';

-- ---------------------------------------------------------------------------
-- 3. 文章表
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `posts` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title`       VARCHAR(200) NOT NULL                        COMMENT '标题',
  `slug`        VARCHAR(220) NOT NULL                        COMMENT 'URL 标识（标题转写 + 短随机后缀）',
  `content`     MEDIUMTEXT   NOT NULL                        COMMENT 'Markdown 原文',
  `excerpt`     VARCHAR(500) DEFAULT NULL                    COMMENT '摘要（为空时后端自动截取正文前 200 字）',
  `cover`       VARCHAR(500) DEFAULT NULL                    COMMENT '封面图 URL',
  `category_id` INT UNSIGNED DEFAULT NULL                    COMMENT '所属分类（允许未分类）',
  `tags`        JSON         DEFAULT NULL                    COMMENT '标签数组，如 ["react","设计"]',
  `author_id`   INT UNSIGNED NOT NULL                        COMMENT '作者',
  `views`       INT UNSIGNED NOT NULL DEFAULT 0              COMMENT '浏览量',
  `status`      ENUM('draft','published') NOT NULL DEFAULT 'published' COMMENT '状态：草稿 / 已发布',
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_posts_slug` (`slug`),
  KEY `idx_posts_category_id` (`category_id`),
  KEY `idx_posts_author_id` (`author_id`),
  KEY `idx_posts_status_created` (`status`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文章表';

-- ---------------------------------------------------------------------------
-- 4. 评论表（预留，本期前端不渲染）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `comments` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `post_id`    INT UNSIGNED NOT NULL,
  `author_id`  INT UNSIGNED NOT NULL,
  `content`    TEXT         NOT NULL,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_comments_post_id` (`post_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='评论表';

-- ---------------------------------------------------------------------------
-- 5. 外键约束
--    （外键单独声明，便于看清依赖；posts 依赖 users 与 categories，comments 依赖 posts 与 users）
-- ---------------------------------------------------------------------------
ALTER TABLE `posts`
  ADD CONSTRAINT `fk_posts_author`
    FOREIGN KEY (`author_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_posts_category`
    FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `comments`
  ADD CONSTRAINT `fk_comments_post`
    FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_comments_author`
    FOREIGN KEY (`author_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 6. 种子数据：6 个分类（颜色对应视觉规范的荧光色系）
-- ---------------------------------------------------------------------------
INSERT IGNORE INTO `categories` (`name`, `slug`, `description`, `color`) VALUES
  ('前端工程', 'frontend', 'React / TS / 工程化实践', '#FF4D00'),
  ('设计系统', 'design',   '视觉规范 / 组件设计 / 排版', '#C6FF00'),
  ('后端架构', 'backend',  'Node / 数据库 / 接口设计', '#6C2BD9'),
  ('产品思考', 'product',  '产品判断与增长思考', '#FF2E63'),
  ('效率工具', 'tools',    '提升开发效率的工具链', '#00D4FF'),
  ('随笔',     'notes',    '不成体系的想法记录', '#FFB800');

-- ---------------------------------------------------------------------------
-- 7. 种子数据：演示账号
--    邮箱：demo@lumen.dev   密码：Demo1234（bcrypt 10 轮，已加密存储）
-- ---------------------------------------------------------------------------
INSERT IGNORE INTO `users` (`username`, `email`, `password`, `bio`) VALUES
  ('demo', 'demo@lumen.dev',
   '$2a$10$K/7cyYRB8l1qRl3S.A8wY.XtAiQpquEQ9b6Z9JfiaXOlI6m7hHaXq',
   'LUMEN 演示账号');

-- =============================================================================
-- 清理段（需要干净重建时取消下面注释再执行；会清空所有数据！）
-- =============================================================================
-- SET FOREIGN_KEY_CHECKS = 0;
-- DROP TABLE IF EXISTS `comments`;
-- DROP TABLE IF EXISTS `posts`;
-- DROP TABLE IF EXISTS `categories`;
-- DROP TABLE IF EXISTS `users`;
-- SET FOREIGN_KEY_CHECKS = 1;
--
-- 然后重新执行本文件上方建库建表段即可。
-- =============================================================================
