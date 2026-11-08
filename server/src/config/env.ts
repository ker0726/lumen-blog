import dotenv from 'dotenv';

dotenv.config();

/** 读取必填环境变量，缺失时直接抛出，阻止服务带病启动 */
function required(key: string): string {
  const value = process.env[key];
  if (value === undefined || value === '') {
    throw new Error(`[env] 缺少必填环境变量: ${key}，请检查 .env 文件`);
  }
  return value;
}

function optional(key: string, fallback: string): string {
  const value = process.env[key];
  return value === undefined || value === '' ? fallback : value;
}

/**
 * 数据源驱动（三选一）：
 * - mysql（默认）：正式交付路径，连接 MySQL 8
 * - sqlite：本地联调路径，使用 Node 内置 node:sqlite，零外部依赖
 * - mssql：SQL Server 路径，调用本机 sqlcmd.exe（Windows 集成认证，命名管道）
 */
const driver = optional('DB_DRIVER', 'mysql');
if (!['mysql', 'sqlite', 'mssql'].includes(driver)) {
  throw new Error(`[env] DB_DRIVER 仅支持 mysql / sqlite / mssql，当前值: ${driver}`);
}

export const env = {
  port: parseInt(optional('PORT', '3001'), 10),
  dbDriver: driver as 'mysql' | 'sqlite' | 'mssql',
  db: {
    host: optional('DB_HOST', '127.0.0.1'),
    port: parseInt(optional('DB_PORT', '3306'), 10),
    user: driver === 'mysql' ? required('DB_USER') : optional('DB_USER', ''),
    password: driver === 'mysql' ? required('DB_PASSWORD') : optional('DB_PASSWORD', ''),
    database: optional('DB_NAME', 'lumen'),
  },
  sqliteFile: optional('SQLITE_FILE', './data/lumen.sqlite'),
  mssql: {
    server: optional('MSSQL_SERVER', 'localhost'),
    instance: optional('MSSQL_INSTANCE', ''), // 如 SQLEXPRESS；留空则走默认实例+端口
    port: parseInt(optional('MSSQL_PORT', '1433'), 10),
    database: optional('MSSQL_DATABASE', 'lumen'),
    user: driver === 'mssql' ? required('MSSQL_USER') : optional('MSSQL_USER', ''),
    password: driver === 'mssql' ? required('MSSQL_PASSWORD') : optional('MSSQL_PASSWORD', ''),
  },
  jwt: {
    secret: required('JWT_SECRET'),
    expiresIn: optional('JWT_EXPIRES_IN', '7d'),
  },
  seedDemoUser: optional('SEED_DEMO_USER', 'false') === 'true',
} as const;
