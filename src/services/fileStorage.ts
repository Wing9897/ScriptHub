/**
 * File Storage Service - 檔案系統操作
 * 只負責初始化目錄結構
 */

import { exists, mkdir } from '@tauri-apps/plugin-fs';
import { homeDir, join } from '@tauri-apps/api/path';

// 基礎目錄路徑緩存
let baseDir: string | null = null;

/**
 * 獲取基礎目錄路徑 (~/.scripthub)
 */
export async function getBaseDir(): Promise<string> {
    if (baseDir) return baseDir;
    const home = await homeDir();
    baseDir = await join(home, '.scripthub');
    return baseDir;
}

/**
 * 初始化存儲目錄
 */
export async function initStorageDirectories(): Promise<void> {
    const base = await getBaseDir();

    // 創建基礎目錄
    if (!(await exists(base))) {
        await mkdir(base, { recursive: true });
    }
}
