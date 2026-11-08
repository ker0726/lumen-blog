/**
 * 构建后置：tsc 只编译 .ts，不会复制 .sql 建表脚本。
 * 这里把 src/db/*.sql 复制到 dist/db/，保证运行时 readFileSync 能找到。
 */
import { cpSync, mkdirSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(here, '..', 'src', 'db');
const outDir = path.join(here, '..', 'dist', 'db');

mkdirSync(outDir, { recursive: true });
for (const file of ['schema.sql', 'schema.sqlite.sql', 'schema.mssql.sql']) {
  const from = path.join(srcDir, file);
  if (existsSync(from)) cpSync(from, path.join(outDir, file));
}
console.log('[postbuild] SQL 脚本已复制到 dist/db/');
