/**
 * node:sqlite 最小类型声明（Node 22.11 内置模块，@types/node 20 未覆盖）。
 * 仅声明本项目用到的 API 子集。
 */
declare module 'node:sqlite' {
  export interface StatementResultingChanges {
    changes: number | bigint;
    lastInsertRowid: number | bigint;
  }
  export interface StatementSync {
    run(...params: Array<string | number | bigint | null>): StatementResultingChanges;
    get(...params: Array<string | number | bigint | null>): unknown;
    all(...params: Array<string | number | bigint | null>): unknown[];
  }
  export class DatabaseSync {
    constructor(path: string);
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }
}
