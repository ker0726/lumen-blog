import { readFileSync } from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { pool, createDatabaseIfNotExists } from '../config/db';
import { env } from '../config/env';

/**
 * 首次启动自动初始化：
 * 1. 建库（MySQL 模式；SQLite 由适配层自动落盘）
 * 2. 按驱动选择 schema 文件，逐条执行（IF NOT EXISTS，幂等）
 * 3. 空表时插入种子分类；SEED_DEMO_USER=true 时插入演示账号
 */
export async function initDatabase(): Promise<void> {
  // Step 1: MySQL 模式先无库连接创建数据库；SQLite 模式跳过
  await createDatabaseIfNotExists();

  // Step 2: 按驱动选择建表 SQL
  const schemaFile =
    env.dbDriver === 'sqlite' ? 'schema.sqlite.sql' : env.dbDriver === 'mssql' ? 'schema.mssql.sql' : 'schema.sql';
  const raw = readFileSync(path.join(__dirname, schemaFile), 'utf-8');
  const cleaned = raw
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');

  if (env.dbDriver === 'mssql') {
    // SQL Server：去掉文件头的 USE/GO，整段作为一个批次执行
    const batch = cleaned.replace(/USE\s+\[[^\]]+\]\s*;\s*\r?\n\s*GO\s*\r?\n/i, '');
    await pool.execMany([batch]);
  } else {
    // MySQL / SQLite：以分号分隔逐条执行（幂等）
    const statements = cleaned
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    await pool.execMany(statements);
  }

  // Step 3: 种子分类（仅当 categories 为空）
  const [rows] = await pool.query<Array<{ cnt: number }>>(
    'SELECT COUNT(*) AS cnt FROM categories'
  );
  if (Number(rows[0].cnt) === 0) {
    const seeds: Array<[string, string, string, string]> = [
      ['前端工程', 'frontend', 'React / TS / 工程化实践', '#FF4D00'],
      ['设计系统', 'design', '视觉规范 / 组件设计 / 排版', '#C6FF00'],
      ['后端架构', 'backend', 'Node / 数据库 / 接口设计', '#6C2BD9'],
      ['产品思考', 'product', '产品判断与增长思考', '#FF2E63'],
      ['效率工具', 'tools', '提升开发效率的工具链', '#00D4FF'],
      ['随笔', 'notes', '不成体系的想法记录', '#FFB800'],
    ];
    for (const [name, slug, description, color] of seeds) {
      await pool.query(
        'INSERT INTO categories (name, slug, description, color) VALUES (?, ?, ?, ?)',
        [name, slug, description, color]
      );
    }
    console.log('[db] 已插入 6 个种子分类');
  }

  // Step 4: 演示账号（仅开发环境）
  if (env.seedDemoUser) {
    const [users] = await pool.query<Array<{ id: number }>>(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      ['demo@lumen.dev']
    );
    if (users.length === 0) {
      const hash = await bcrypt.hash('Demo1234', 10);
      await pool.query(
        'INSERT INTO users (username, email, password, bio) VALUES (?, ?, ?, ?)',
        ['demo', 'demo@lumen.dev', hash, 'LUMEN 演示账号']
      );
      console.log('[db] 已插入演示账号 demo@lumen.dev / Demo1234');
    }
  }

  console.log(`[db] 数据库初始化完成（driver: ${env.dbDriver}）`);
}
