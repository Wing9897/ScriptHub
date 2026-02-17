/**
 * Transfer Types - 導入/導出相關的共享類型定義
 */

// V2 統一格式 Manifest
export interface UnifiedManifest {
    manifest_version: '2.0';
    exported_at: string;
    app_version: string;
    stats: {
        categories: number;
        scripts: number;
        tags: number;
    };
}

// 分類導出格式
export interface CategoryExport {
    id: string;
    name: string;
    description?: string;
    icon: string;
    customIcon?: string | null;
    order: number;
    createdAt: string;
    isSubscription?: boolean;
    sourceUrl?: string;
    lastSyncedAt?: string;
    parentId?: string | null;
    scripts: ScriptExport[];
    subcategories?: CategoryExport[];  // 子類別（遞迴結構）
}

// 腳本導出格式
export interface ScriptExport {
    id: string;
    title: string;
    description: string;
    file: string;        // 腳本文件名
    platform: string;
    tags: string[];
    isFavorite: boolean;
    order?: number;
    createdAt: string;
    updatedAt: string;
}

// 導入結果
export interface UnifiedImportResult {
    categories: import('./category').Category[];
    scripts: import('./script').Script[];
    tags: import('./tag').Tag[];
}
