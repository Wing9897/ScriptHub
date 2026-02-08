import { open } from '@tauri-apps/plugin-dialog';
import { readTextFile, readDir, readFile } from '@tauri-apps/plugin-fs';
import i18n from '@/i18n';
import type { Script, Category, Tag, Variable } from '@/types';
import type { CategoryExport, UnifiedImportResult, UnifiedManifest } from '@/types/transfer';
import { insertCustomIcon, type CustomIconRow } from './database';

/**
 * 統一導入 (V2) - 從統一導出格式導入所有資料
 */
export async function importUnified(): Promise<UnifiedImportResult | null> {
    const selectedPath = await open({
        directory: true,
        multiple: false,
        title: i18n.t('import.selectUnifiedFolder'),
    });

    if (!selectedPath || typeof selectedPath !== 'string') {
        return null;
    }

    const basePath = selectedPath;
    const manifestPath = `${basePath}/scripthub.json`;

    // 讀取根 manifest
    let manifestContent: string;
    try {
        manifestContent = await readTextFile(manifestPath);
    } catch {
        throw new Error(i18n.t('import.noManifest'));
    }

    let manifest: UnifiedManifest;
    try {
        manifest = JSON.parse(manifestContent);
    } catch {
        throw new Error(i18n.t('import.invalidManifestJson'));
    }

    // 檢查是否為 V2 格式
    if (manifest.manifest_version !== '2.0') {
        throw new Error(i18n.t('import.invalidVersion'));
    }




    const result: UnifiedImportResult = {
        categories: [],
        scripts: [],
        tags: [],
        variables: []
    };

    // 導入全域標籤
    try {
        const tagsPath = `${basePath}/global/tags.json`;
        const tagsContent = await readTextFile(tagsPath);
        result.tags = JSON.parse(tagsContent) as Tag[];
    } catch {
        console.warn('No global tags found');
    }

    // 導入全域變量
    try {
        const variablesPath = `${basePath}/global/variables.json`;
        const variablesContent = await readTextFile(variablesPath);
        result.variables = JSON.parse(variablesContent) as Variable[];
    } catch {
        console.warn('No global variables found');
    }

    // 導入自訂圖標庫
    try {
        const iconsPath = `${basePath}/global/custom_icons.json`;
        const iconsContent = await readTextFile(iconsPath);
        const customIcons = JSON.parse(iconsContent) as CustomIconRow[];
        for (const icon of customIcons) {
            try {
                await insertCustomIcon(icon);
            } catch {
                // 可能已存在，忽略
            }
        }
    } catch {
        console.warn('No custom icons found');
    }

    // 導入類別
    const categoriesPath = `${basePath}/categories`;
    try {
        const categoryDirs = await readDir(categoriesPath);

        for (const dir of categoryDirs) {
            if (!dir.isDirectory) continue;

            const categoryPath = `${categoriesPath}/${dir.name}`;
            const categoryJsonPath = `${categoryPath}/category.json`;

            try {
                const categoryContent = await readTextFile(categoryJsonPath);
                const categoryExport = JSON.parse(categoryContent) as CategoryExport;

                // 讀取自定義圖標 (如果有)
                let customIcon: string | undefined;
                if (categoryExport.customIcon === 'icon.png') {
                    try {
                        const iconPath = `${categoryPath}/icon.png`;
                        const iconBytes = await readFile(iconPath);
                        // 將 bytes 轉換為 base64
                        const base64 = btoa(String.fromCharCode(...new Uint8Array(iconBytes)));
                        customIcon = `data:image/png;base64,${base64}`;
                    } catch {
                        console.warn(`Failed to read icon for ${categoryExport.name}`);
                    }
                }

                // 建立類別
                const category: Category = {
                    id: categoryExport.id,
                    name: categoryExport.name,
                    description: categoryExport.description,
                    icon: categoryExport.icon,
                    customIcon: customIcon,
                    order: categoryExport.order,
                    createdAt: categoryExport.createdAt,
                    isSubscription: categoryExport.isSubscription,
                    sourceUrl: categoryExport.sourceUrl,
                    lastSyncedAt: categoryExport.lastSyncedAt
                };

                result.categories.push(category);

                // 導入類別中的腳本
                for (const scriptExport of categoryExport.scripts) {
                    try {
                        const scriptFilePath = `${categoryPath}/${scriptExport.file}`;
                        const scriptContent = await readTextFile(scriptFilePath);

                        const script: Script = {
                            id: scriptExport.id,
                            title: scriptExport.title,
                            description: scriptExport.description,
                            platform: scriptExport.platform as Script['platform'],
                            commands: [{
                                id: crypto.randomUUID(),
                                order: 0,
                                content: scriptContent,
                                description: scriptExport.file
                            }],
                            variables: scriptExport.variables,
                            tags: scriptExport.tags,
                            categoryId: categoryExport.id,
                            order: scriptExport.order,
                            createdAt: scriptExport.createdAt,
                            updatedAt: scriptExport.updatedAt,
                            isFavorite: scriptExport.isFavorite
                        };

                        result.scripts.push(script);
                    } catch (e) {
                        console.warn(`Failed to import script ${scriptExport.title}:`, e);
                    }
                }
            } catch (e) {
                console.warn(`Failed to read category ${dir.name}:`, e);
            }
        }
    } catch {
        console.warn('No categories folder found');
    }

    // 導入未分類腳本
    const uncatPath = `${basePath}/uncategorized`;
    try {
        const uncatJsonPath = `${uncatPath}/category.json`;
        const uncatContent = await readTextFile(uncatJsonPath);
        const uncatExport = JSON.parse(uncatContent) as CategoryExport;

        for (const scriptExport of uncatExport.scripts) {
            try {
                const scriptFilePath = `${uncatPath}/${scriptExport.file}`;
                const scriptContent = await readTextFile(scriptFilePath);

                const script: Script = {
                    id: scriptExport.id,
                    title: scriptExport.title,
                    description: scriptExport.description,
                    platform: scriptExport.platform as Script['platform'],
                    commands: [{
                        id: crypto.randomUUID(),
                        order: 0,
                        content: scriptContent,
                        description: scriptExport.file
                    }],
                    variables: scriptExport.variables,
                    tags: scriptExport.tags,
                    categoryId: undefined, // 未分類
                    order: scriptExport.order,
                    createdAt: scriptExport.createdAt,
                    updatedAt: scriptExport.updatedAt,
                    isFavorite: scriptExport.isFavorite
                };

                result.scripts.push(script);
            } catch (e) {
                console.warn(`Failed to import uncategorized script ${scriptExport.title}:`, e);
            }
        }
    } catch {
        console.warn('No uncategorized folder found');
    }



    return result;
}
