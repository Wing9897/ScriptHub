/**
 * Storage Initialization Service
 * 負責應用啟動時的存儲初始化
 */

import { initStorageDirectories } from './fileStorage';
import {
    getDatabase,
    getAllCategories,
    getAllScripts,
    getAllTags
} from './database';
import type { Category } from '@/types/category';
import type { Script, Command } from '@/types/script';
import type { Tag } from '@/types/tag';

/**
 * 初始化存儲系統
 * 在應用啟動時調用
 */
export async function initStorage(): Promise<void> {


    // 1. 初始化文件系統目錄
    await initStorageDirectories();

    // 2. 初始化數據庫 (會自動運行 migrations)
    await getDatabase();


}

/**
 * 從數據庫加載所有數據
 */
export async function loadAllData(): Promise<{
    categories: Category[];
    scripts: Script[];
    tags: Tag[];
}> {
    const [categoryRows, scriptRows, tagRows] = await Promise.all([
        getAllCategories(),
        getAllScripts(),
        getAllTags()
    ]);

    // 轉換為 Store 格式
    const categories: Category[] = categoryRows.map(row => ({
        id: row.id,
        name: row.name,
        icon: row.icon,
        customIcon: row.custom_icon || undefined,
        description: row.description || undefined,
        order: row.order,
        createdAt: row.created_at,
        isSubscription: row.is_subscription === 1,
        sourceUrl: row.source_url || undefined,
        lastSyncedAt: row.last_synced_at || undefined,
        parentId: row.parent_id || null
    }));

    const scripts: Script[] = scriptRows.map(row => ({
        id: row.id,
        title: row.title,
        description: row.description,
        platform: row.platform as Script['platform'],
        commands: (() => { try { return JSON.parse(row.commands); } catch { return []; } })() as Command[],
        tags: (() => { try { return JSON.parse(row.tags); } catch { return []; } })() as string[],
        categoryId: row.category_id || undefined,
        order: row.order,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        isFavorite: row.is_favorite === 1
    }));

    const tags: Tag[] = tagRows.map(row => ({
        id: row.id,
        name: row.name,
        color: row.color,
        createdAt: row.created_at
    }));

    return { categories, scripts, tags };
}
