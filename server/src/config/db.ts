import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import mysql from 'mysql2/promise';
import { env } from './env';

/**
 * 数据源适配层：
 * - DB_DRIVER=mysql（默认）：mysql2 连接池，正式交付路径
 * - DB_DRIVER=sqlite：Node 内置 node:sqlite，本地联调路径（零外部依赖）
 *
 * 对上层暴露统一的 query(sql, params) → [rows, null] 接口，
 * 与 mysql2 的解构习惯一致，业务代码无需感知驱动差异。
 * 所有查询必须参数化（? 占位符），禁止字符串拼接 SQL。
 */

export interface DbAdapter {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<[T, null]>;
  /** 顺序执行多条无参数 DDL 语句（建表用） */
  execMany(statements: string[]): Promise<void>;
}

function createMysqlAdapter(): DbAdapter {
  const pool = mysql.createPool({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.database,
    connectionLimit: 10,
    waitForConnections: true,
    queueLimit: 0,
    charset: 'utf8mb4',
    // DATE/DATETIME 以字符串返回，避免时区隐式转换带来的序列化问题
    dateStrings: true,
  });
  return {
    async query<T>(sql: string, params: unknown[] = []): Promise<[T, null]> {
      const [rows] = await pool.query(sql, params);
      return [rows as T, null];
    },
    async execMany(statements: string[]): Promise<void> {
      for (const stmt of statements) await pool.query(stmt);
    },
  };
}

async function createSqliteAdapter(): Promise<DbAdapter> {
  // Node 22.x 需 --experimental-sqlite 启动参数；Node 24+ 原生可用
  const { DatabaseSync } = await import('node:sqlite');
  const file = path.resolve(process.cwd(), env.sqliteFile);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  console.log(`[db] SQLite 联调模式: ${file}`);

  return {
    async query<T>(sql: string, params: unknown[] = []): Promise<[T, null]> {
      const stmt = db.prepare(sql);
      const head = sql.trimStart().slice(0, 6).toUpperCase();
      if (head === 'SELECT' || head.startsWith('PRAGMA')) {
        return [stmt.all(...(params as never[])) as T, null];
      }
      const info = stmt.run(...(params as never[]));
      // 与 mysql2 的 ResultSetHeader 对齐
      return [
        { insertId: Number(info.lastInsertRowid), affectedRows: Number(info.changes) } as T,
        null,
      ];
    },
    async execMany(statements: string[]): Promise<void> {
      for (const stmt of statements) db.exec(stmt);
    },
  };
}

async function createMssqlAdapter(): Promise<DbAdapter> {
  // SQL Server 驱动：调用本机 sqlcmd.exe（命名管道 + Windows 免密认证）。
  // 说明：当 SQLEXPRESS 未启用 TCP/IP、或无管理员权限重启服务时，tedious 无法连接；
  //      此时 sqlcmd 是唯一零配置通路。生产环境建议启用 TCP 后改用 tedious。
  const SQLCMD =
    process.env.SQLCMD_PATH ||
    'C:\\Program Files\\Microsoft SQL Server\\Client SDK\\ODBC\\180\\Tools\\Binn\\SQLCMD.EXE';
  if (!fs.existsSync(SQLCMD)) throw new Error(`[mssql] 找不到 sqlcmd.exe: ${SQLCMD}`);
  const server = env.mssql.instance ? `${env.mssql.server}\\${env.mssql.instance}` : env.mssql.server;

  /** 将参数值安全内联为 SQL 字面量（输入已由 express-validator 校验） */
  function literal(v: unknown): string {
    if (v === null || v === undefined) return 'NULL';
    if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
    if (typeof v === 'boolean') return v ? '1' : '0';
    // 字符串：转义单引号
    return `'${String(v).replace(/'/g, "''")}'`;
  }

  /** 方言归一：反引号 -> 方括号；LIMIT 改写；? -> 字面量内联 */
  function normalize(sql: string, params: unknown[]): string {
    let result = sql.replace(/`([^`]+)`/g, '[$1]');
    // 1) LIMIT ? OFFSET ?  ->  OFFSET ? ROWS FETCH NEXT ? ROWS ONLY（参数顺序对调）
    const limitOffsetRe = /\bLIMIT\s+\?\s+OFFSET\s+\?\s*$/i;
    if (limitOffsetRe.test(result) && params.length >= 2) {
      const n = params.length;
      [params[n - 2], params[n - 1]] = [params[n - 1], params[n - 2]];
      result = result.replace(limitOffsetRe, 'OFFSET ? ROWS FETCH NEXT ? ROWS ONLY');
    }
    // 2) LIMIT n（字面量，无 OFFSET）-> SELECT TOP n
    const bareLimitRe = /\bLIMIT\s+(\d+)\s*$/i;
    const bareMatch = result.match(bareLimitRe);
    if (bareMatch) {
      result = result.replace(bareLimitRe, '');
      result = result.replace(/\bSELECT(\s+DISTINCT)?\b/i, (_m, d) =>
        d ? `SELECT DISTINCT TOP ${bareMatch[1]}` : `SELECT TOP ${bareMatch[1]}`
      );
    }
    // 3) ? -> 安全字面量
    let idx = 0;
    result = result.replace(/\?/g, () => literal(params[idx++]));
    return result;
  }

  /** 执行 SQL 并返回原始文本输出（通过 stdin 传 SQL，避免命令行引号转义问题） */
  function runSqlcmd(sql: string, opts: { noHeader?: boolean; json?: boolean } = {}): string {
    const args = [
      '-S', server,
      '-E',            // Windows 集成认证（免密）
      '-C',            // 信任服务器证书
      '-d', env.mssql.database,
    ];
    if (opts.json) {
      // JSON 模式：-y 0 不限列宽，避免长 JSON 被 sqlcmd 折行截断
      args.push('-y', '0');
    } else {
      args.push('-W', '-s', '\t'); // TSV 模式：去尾空格 + 制表符分隔
    }
    if (opts.noHeader) args.push('-h', '-1'); // 不输出列头（INSERT 取 SCOPE_IDENTITY 时用）
    // 抑制「N 行受影响」消息；SQL 通过 stdin 传入
    return execFileSync(SQLCMD, args, {
      encoding: 'utf8',
      maxBuffer: 50 * 1024 * 1024,
      input: `SET NOCOUNT ON; ${sql}`,
    });
  }

  /** 解析 FOR JSON PATH 输出为对象数组 */
  function parseJsonOutput(raw: string): Record<string, unknown>[] {
    const trimmed = raw.trim();
    if (!trimmed || trimmed === 'NULL') return [];
    // sqlcmd 可能把超长 JSON 折行，合并所有非空行后再解析
    const jsonStr = trimmed.replace(/\r?\n/g, '');
    try {
      const parsed = JSON.parse(jsonStr);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [];
    }
  }

  return {
    async query<T>(sql: string, params: unknown[] = []): Promise<[T, null]> {
      const normSql = normalize(sql, params);
      const isInsert = /^\s*INSERT\s+/i.test(normSql);

      if (isInsert) {
        // 插入后取自增 ID
        const out = runSqlcmd(`${normSql}; SELECT CAST(SCOPE_IDENTITY() AS INT);`, { noHeader: true });
        const m = out.trim().match(/^(\d+)/m);
        const insertId = m ? parseInt(m[1], 10) : 0;
        return [{ insertId, affectedRows: 1 } as T, null];
      }

      const isSelect = /^\s*(SELECT|WITH)\s+/i.test(normSql);
      if (isSelect) {
        // SELECT 查询用 FOR JSON PATH 输出 JSON，避免 content 等多行文本破坏 TSV 行解析
        const jsonSql = normSql.replace(/;\s*$/, '') + ' FOR JSON PATH';
        const out = runSqlcmd(jsonSql, { json: true });
        const rows = parseJsonOutput(out);
        return [rows as T, null];
      }

      // UPDATE / DELETE 等：执行但不解析结果行
      runSqlcmd(normSql, { noHeader: true });
      return [[] as T, null];
    },
    async execMany(statements: string[]): Promise<void> {
      for (const stmt of statements) runSqlcmd(stmt);
    },
  };
}

// 懒初始化：首次调用时才创建对应驱动（规避 CommonJS 无法顶层 await 的限制）
let adapterPromise: Promise<DbAdapter> | null = null;
function getAdapter(): Promise<DbAdapter> {
  adapterPromise ??=
    env.dbDriver === 'sqlite'
      ? createSqliteAdapter()
      : env.dbDriver === 'mssql'
      ? createMssqlAdapter()
      : Promise.resolve(createMysqlAdapter());
  return adapterPromise;
}

/** 统一数据源入口，业务代码只认这个 pool */
export const pool: DbAdapter = {
  async query<T>(sql: string, params?: unknown[]): Promise<[T, null]> {
    return (await getAdapter()).query<T>(sql, params);
  },
  async execMany(statements: string[]): Promise<void> {
    return (await getAdapter()).execMany(statements);
  },
};

/** 无库连接：仅 MySQL 模式下用于启动阶段创建数据库本身；SQLite / mssql 由 DBA 预先建库 */
export async function createDatabaseIfNotExists(): Promise<void> {
  if (env.dbDriver !== 'mysql') return;
  const conn = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
  });
  try {
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${env.db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
  } finally {
    await conn.end();
  }
}
