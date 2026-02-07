/**
 * Database Service - SQLite 數據庫操作封裝
 * 使用 tauri-plugin-sql 管理應用數據
 */

import Database from '@tauri-apps/plugin-sql';
import { homeDir, join } from '@tauri-apps/api/path';

// 數據庫實例緩存
let db: Database | null = null;

/**
 * 獲取數據庫路徑
 */
export async function getDatabasePath(): Promise<string> {
    const home = await homeDir();
    return await join(home, '.scripthub', 'scripthub.db');
}

/**
 * 初始化並獲取數據庫連接
 */
export async function getDatabase(): Promise<Database> {
    if (db) return db;

    // Check if running in browser environment (not Tauri)
    if (typeof window !== 'undefined' && !(window as any).__TAURI__) {
        console.warn('[DB] Browser mode: using mock database');
        return {
            execute: async () => ({ rowsAffected: 0, lastInsertId: 0 }),
            select: async <T>() => [] as T,
            close: async () => true
        } as unknown as Database;
    }

    const dbPath = await getDatabasePath();
    db = await Database.load(`sqlite:${dbPath}`);

    // 執行 migrations
    await runMigrations(db);

    return db;
}

/**
 * 執行數據庫遷移
 */
async function runMigrations(database: Database): Promise<void> {
    // 創建 migrations 追蹤表
    await database.execute(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    )
  `);

    // 獲取當前版本
    const result = await database.select<{ version: number }[]>(
        'SELECT MAX(version) as version FROM _migrations'
    );
    const currentVersion = result[0]?.version || 0;

    // 執行未應用的遷移
    if (currentVersion < 1) {
        await migrateV1(database);
    }
}

/**
 * V1 遷移 - 創建基礎表結構
 * 匹配實際的 TypeScript 類型定義
 */
async function migrateV1(database: Database): Promise<void> {
    // 類別表 - 匹配 Category interface
    await database.execute(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      custom_icon TEXT,
      description TEXT,
      "order" INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      is_subscription INTEGER DEFAULT 0,
      source_url TEXT,
      last_synced_at TEXT
    )
  `);

    // 腳本表 - 匹配 Script interface
    // commands 和 variables/tags 存為 JSON
    await database.execute(`
    CREATE TABLE IF NOT EXISTS scripts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      platform TEXT NOT NULL DEFAULT 'cross',
      commands TEXT NOT NULL,
      variables TEXT NOT NULL,
      tags TEXT NOT NULL,
      category_id TEXT,
      "order" INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      is_favorite INTEGER DEFAULT 0,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    )
  `);

    // 標籤表 - 匹配 Tag interface
    await database.execute(`
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

    // 變量表 - 匹配 Variable interface
    await database.execute(`
    CREATE TABLE IF NOT EXISTS variables (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      default_value TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

    // 創建索引
    await database.execute(`
    CREATE INDEX IF NOT EXISTS idx_scripts_category ON scripts(category_id)
  `);
    await database.execute(`
    CREATE INDEX IF NOT EXISTS idx_scripts_favorite ON scripts(is_favorite)
  `);

    // 記錄遷移版本
    await database.execute(
        'INSERT INTO _migrations (version, applied_at) VALUES (?, ?)',
        [1, new Date().toISOString()]
    );


}

// ==================== Category CRUD ====================

export interface CategoryRow {
    id: string;
    name: string;
    icon: string;
    custom_icon: string | null;
    description: string | null;
    order: number;
    created_at: string;
    is_subscription: number;
    source_url: string | null;
    last_synced_at: string | null;
}

export async function getAllCategories(): Promise<CategoryRow[]> {
    const database = await getDatabase();
    return database.select<CategoryRow[]>('SELECT * FROM categories ORDER BY "order" ASC');
}

export async function insertCategory(category: CategoryRow): Promise<void> {
    const database = await getDatabase();
    await database.execute(
        `INSERT INTO categories (id, name, icon, custom_icon, description, "order", created_at, is_subscription, source_url, last_synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [category.id, category.name, category.icon, category.custom_icon, category.description,
        category.order, category.created_at, category.is_subscription, category.source_url, category.last_synced_at]
    );
}

export async function updateCategory(id: string, updates: Partial<CategoryRow>): Promise<void> {
    const database = await getDatabase();
    const fields: string[] = [];
    const values: unknown[] = [];

    Object.entries(updates).forEach(([key, value]) => {
        if (key !== 'id') {
            // 轉換 camelCase 到 snake_case
            const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            fields.push(`"${dbKey}" = ?`);
            values.push(value);
        }
    });

    if (fields.length === 0) return;

    values.push(id);
    await database.execute(
        `UPDATE categories SET ${fields.join(', ')} WHERE id = ?`,
        values
    );
}

export async function deleteCategory(id: string): Promise<void> {
    const database = await getDatabase();
    await database.execute('DELETE FROM categories WHERE id = ?', [id]);
}

// ==================== Script CRUD ====================

export interface ScriptRow {
    id: string;
    title: string;
    description: string;
    platform: string;
    commands: string; // JSON
    variables: string; // JSON array
    tags: string; // JSON array
    category_id: string | null;
    order: number;
    created_at: string;
    updated_at: string;
    is_favorite: number;
}

export async function getAllScripts(): Promise<ScriptRow[]> {
    const database = await getDatabase();
    return database.select<ScriptRow[]>('SELECT * FROM scripts ORDER BY "order" ASC');
}

export async function getScriptsByCategory(categoryId: string | null): Promise<ScriptRow[]> {
    const database = await getDatabase();
    if (categoryId === null) {
        return database.select<ScriptRow[]>(
            'SELECT * FROM scripts WHERE category_id IS NULL ORDER BY "order" ASC'
        );
    }
    return database.select<ScriptRow[]>(
        'SELECT * FROM scripts WHERE category_id = ? ORDER BY "order" ASC',
        [categoryId]
    );
}

export async function insertScript(script: ScriptRow): Promise<void> {
    const database = await getDatabase();
    await database.execute(
        `INSERT INTO scripts (id, title, description, platform, commands, variables, tags, category_id, "order", created_at, updated_at, is_favorite)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [script.id, script.title, script.description, script.platform, script.commands,
        script.variables, script.tags, script.category_id, script.order,
        script.created_at, script.updated_at, script.is_favorite]
    );
}

export async function updateScript(id: string, updates: Partial<ScriptRow>): Promise<void> {
    const database = await getDatabase();
    const fields: string[] = [];
    const values: unknown[] = [];

    Object.entries(updates).forEach(([key, value]) => {
        if (key !== 'id') {
            const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            fields.push(`"${dbKey}" = ?`);
            values.push(value);
        }
    });

    if (fields.length === 0) return;

    // 自動更新 updated_at
    if (!updates.updated_at) {
        fields.push('updated_at = ?');
        values.push(new Date().toISOString());
    }

    values.push(id);
    await database.execute(
        `UPDATE scripts SET ${fields.join(', ')} WHERE id = ?`,
        values
    );
}

export async function deleteScript(id: string): Promise<void> {
    const database = await getDatabase();
    await database.execute('DELETE FROM scripts WHERE id = ?', [id]);
}

// ==================== Tag CRUD ====================

export interface TagRow {
    id: string;
    name: string;
    color: string;
    created_at: string;
}

export async function getAllTags(): Promise<TagRow[]> {
    const database = await getDatabase();
    return database.select<TagRow[]>('SELECT * FROM tags ORDER BY name ASC');
}

export async function insertTag(tag: TagRow): Promise<void> {
    const database = await getDatabase();
    await database.execute(
        'INSERT INTO tags (id, name, color, created_at) VALUES (?, ?, ?, ?)',
        [tag.id, tag.name, tag.color, tag.created_at]
    );
}

export async function updateTag(id: string, updates: Partial<TagRow>): Promise<void> {
    const database = await getDatabase();
    const fields: string[] = [];
    const values: unknown[] = [];

    Object.entries(updates).forEach(([key, value]) => {
        if (key !== 'id' && key !== 'created_at') {
            const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            fields.push(`"${dbKey}" = ?`);
            values.push(value);
        }
    });

    if (fields.length === 0) return;

    values.push(id);
    await database.execute(
        `UPDATE tags SET ${fields.join(', ')} WHERE id = ?`,
        values
    );
}

export async function deleteTag(id: string): Promise<void> {
    const database = await getDatabase();
    await database.execute('DELETE FROM tags WHERE id = ?', [id]);
}

// ==================== Variable CRUD ====================

export interface VariableRow {
    id: string;
    name: string;
    default_value: string;
    description: string | null;
    created_at: string;
    updated_at: string;
}

export async function getAllVariables(): Promise<VariableRow[]> {
    const database = await getDatabase();
    return database.select<VariableRow[]>('SELECT * FROM variables ORDER BY name ASC');
}

export async function insertVariable(variable: VariableRow): Promise<void> {
    const database = await getDatabase();
    await database.execute(
        'INSERT INTO variables (id, name, default_value, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [variable.id, variable.name, variable.default_value, variable.description, variable.created_at, variable.updated_at]
    );
}

export async function updateVariable(id: string, updates: Partial<VariableRow>): Promise<void> {
    const database = await getDatabase();
    const fields: string[] = [];
    const values: unknown[] = [];

    Object.entries(updates).forEach(([key, value]) => {
        if (key !== 'id' && key !== 'created_at') {
            const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            fields.push(`"${dbKey}" = ?`);
            values.push(value);
        }
    });

    if (fields.length === 0) return;

    if (!updates.updated_at) {
        fields.push('updated_at = ?');
        values.push(new Date().toISOString());
    }

    values.push(id);
    await database.execute(
        `UPDATE variables SET ${fields.join(', ')} WHERE id = ?`,
        values
    );
}

export async function deleteVariable(id: string): Promise<void> {
    const database = await getDatabase();
    await database.execute('DELETE FROM variables WHERE id = ?', [id]);
}

export async function closeDatabase(): Promise<void> {
    if (db) {
        await db.close();
        db = null;
    }
}

// ==================== Bulk Operations ====================

import type { Category } from '@/types/category';
import type { Script } from '@/types/script';
import type { Tag } from '@/types/tag';
import type { Variable } from '@/types/variable';

/**
 * 清空數據庫並批量導入所有數據
 * 用於統一導入操作
 */
export async function syncAllToDatabase(
    categories: Category[],
    scripts: Script[],
    tags: Tag[],
    variables: Variable[]
): Promise<void> {
    const database = await getDatabase();



    // 清空現有數據 (順序重要：先刪除依賴表)
    await database.execute('DELETE FROM scripts');
    await database.execute('DELETE FROM categories');
    await database.execute('DELETE FROM tags');
    await database.execute('DELETE FROM variables');

    // 批量插入類別
    for (const category of categories) {
        const row: CategoryRow = {
            id: category.id,
            name: category.name,
            icon: category.icon,
            custom_icon: category.customIcon || null,
            description: category.description || null,
            order: category.order,
            created_at: category.createdAt,
            is_subscription: category.isSubscription ? 1 : 0,
            source_url: category.sourceUrl || null,
            last_synced_at: category.lastSyncedAt || null
        };
        await insertCategory(row);
    }

    // 批量插入腳本
    for (const script of scripts) {
        const row: ScriptRow = {
            id: script.id,
            title: script.title,
            description: script.description,
            platform: script.platform,
            commands: JSON.stringify(script.commands),
            variables: JSON.stringify(script.variables),
            tags: JSON.stringify(script.tags),
            category_id: script.categoryId || null,
            order: script.order || 0,
            created_at: script.createdAt,
            updated_at: script.updatedAt,
            is_favorite: script.isFavorite ? 1 : 0
        };
        await insertScript(row);
    }

    // 批量插入標籤
    for (const tag of tags) {
        const row: TagRow = {
            id: tag.id,
            name: tag.name,
            color: tag.color,
            created_at: tag.createdAt
        };
        await insertTag(row);
    }

    // 批量插入變量
    for (const variable of variables) {
        const row: VariableRow = {
            id: variable.id,
            name: variable.name,
            default_value: variable.defaultValue,
            description: variable.description || null,
            created_at: variable.createdAt,
            updated_at: variable.updatedAt
        };
        await insertVariable(row);
    }


}

/**
 * 清空數據庫中的所有數據
 */
export async function clearAllData(): Promise<void> {
    const database = await getDatabase();

    await database.execute('DELETE FROM scripts');
    await database.execute('DELETE FROM categories');
    await database.execute('DELETE FROM tags');
    await database.execute('DELETE FROM variables');


}
