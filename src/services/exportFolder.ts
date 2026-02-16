import { save } from '@tauri-apps/plugin-dialog';
import { mkdir, writeTextFile, writeFile } from '@tauri-apps/plugin-fs';
import type { Script, Category, Tag, Variable } from '@/types';
import type { UnifiedManifest, CategoryExport, ScriptExport } from '@/types/transfer';
import i18n from '@/i18n';
import { getScriptExtension, sanitizeFilename, scriptToFileContent } from '@/utils/files';
import { getAllCustomIcons } from './database';

/**
 * 遞迴導出類別及其子類別
 */
async function exportCategoryRecursive(
    category: Category,
    allCategories: Category[],
    scripts: Script[],
    basePath: string
): Promise<CategoryExport> {
    const categoryScripts = scripts.filter(s => s.categoryId === category.id);
    const categoryFolderName = sanitizeFilename(category.name);
    const categoryPath = `${basePath}/${categoryFolderName}`;
    const scriptsPath = `${categoryPath}/scripts`;

    await mkdir(categoryPath, { recursive: true });
    await mkdir(scriptsPath, { recursive: true });

    // 導出自定義圖標 (如果有)
    let iconFilename: string | null = null;
    if (category.customIcon) {
        try {
            const base64Data = category.customIcon.split(',')[1];
            if (base64Data) {
                const binaryString = atob(base64Data);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                await writeFile(`${categoryPath}/icon.png`, bytes);
                iconFilename = 'icon.png';
            }
        } catch (e) {
            console.warn('Failed to export icon:', e);
        }
    }

    // 準備腳本導出列表
    const scriptExports: ScriptExport[] = [];

    for (const script of categoryScripts) {
        const extension = getScriptExtension(script.platform);
        const filename = `${sanitizeFilename(script.title)}${extension}`;
        const filePath = `scripts/${filename}`;
        const fullPath = `${categoryPath}/${filePath}`;

        // 寫入腳本內容
        const content = scriptToFileContent(script);
        await writeTextFile(fullPath, content);

        // 添加到腳本導出列表
        scriptExports.push({
            id: script.id,
            title: script.title,
            description: script.description,
            file: filePath,
            platform: script.platform,
            tags: script.tags,
            variables: script.variables,
            isFavorite: script.isFavorite,
            order: script.order,
            createdAt: script.createdAt,
            updatedAt: script.updatedAt
        });
    }

    // 遞迴處理子類別
    const childCategories = allCategories.filter(c => c.parentId === category.id);
    const subcategoryExports: CategoryExport[] = [];

    for (const child of childCategories) {
        const childExport = await exportCategoryRecursive(child, allCategories, scripts, categoryPath);
        subcategoryExports.push(childExport);
    }

    // 準備類別導出 metadata
    const categoryExport: CategoryExport = {
        id: category.id,
        name: category.name,
        description: category.description,
        icon: category.icon,
        customIcon: iconFilename, // 使用檔案名稱而非 base64
        order: category.order,
        createdAt: category.createdAt,
        isSubscription: category.isSubscription,
        sourceUrl: category.sourceUrl,
        lastSyncedAt: category.lastSyncedAt,
        parentId: category.parentId,
        scripts: scriptExports,
        subcategories: subcategoryExports.length > 0 ? subcategoryExports : undefined
    };

    // 寫入類別 metadata
    await writeTextFile(
        `${categoryPath}/category.json`,
        JSON.stringify(categoryExport, null, 2)
    );

    return categoryExport;
}


/**
 * 統一導出格式 (V2) - 導出所有資料為 Folder 結構，包含完整元數據
 */
export async function exportUnified(
    categories: Category[],
    scripts: Script[],
    tags: Tag[],
    variables: Variable[]
): Promise<boolean> {
    // 選擇導出目錄
    const selectedPath = await save({
        title: i18n.t('export.selectLocation'),
        defaultPath: `scripthub-export-${new Date().toISOString().split('T')[0]}`,
    });

    if (!selectedPath) {
        return false;
    }

    const basePath = selectedPath;
    const globalPath = `${basePath}/global`;
    const categoriesPath = `${basePath}/categories`;

    // 建立目錄結構
    await mkdir(basePath, { recursive: true });
    await mkdir(globalPath, { recursive: true });
    await mkdir(categoriesPath, { recursive: true });

    // 導出根 manifest
    const rootManifest: UnifiedManifest = {
        manifest_version: '2.0',
        exported_at: new Date().toISOString(),
        app_version: '1.0.0',
        stats: {
            categories: categories.length,
            scripts: scripts.length,
            tags: tags.length,
            variables: variables.length
        }
    };
    await writeTextFile(
        `${basePath}/scripthub.json`,
        JSON.stringify(rootManifest, null, 2)
    );

    // 導出全域標籤
    await writeTextFile(
        `${globalPath}/tags.json`,
        JSON.stringify(tags, null, 2)
    );

    // 導出全域變量
    await writeTextFile(
        `${globalPath}/variables.json`,
        JSON.stringify(variables, null, 2)
    );

    // 導出自訂圖標庫
    try {
        const customIcons = await getAllCustomIcons();
        if (customIcons.length > 0) {
            await writeTextFile(
                `${globalPath}/custom_icons.json`,
                JSON.stringify(customIcons, null, 2)
            );
        }
    } catch (e) {
        console.warn('Failed to export custom icons:', e);
    }

    // 只導出根類別（沒有 parentId 的），子類別會遞迴處理
    const rootCategories = categories.filter(c => !c.parentId);
    for (const category of rootCategories) {
        await exportCategoryRecursive(category, categories, scripts, categoriesPath);
    }

    // 導出未分類腳本
    const uncategorizedScripts = scripts.filter(s => !s.categoryId);
    if (uncategorizedScripts.length > 0) {
        const uncatPath = `${basePath}/uncategorized`;
        const scriptsPath = `${uncatPath}/scripts`;

        await mkdir(uncatPath, { recursive: true });
        await mkdir(scriptsPath, { recursive: true });

        const scriptExports: ScriptExport[] = [];

        for (const script of uncategorizedScripts) {
            const extension = getScriptExtension(script.platform);
            const filename = `${sanitizeFilename(script.title)}${extension}`;
            const filePath = `scripts/${filename}`;
            const fullPath = `${uncatPath}/${filePath}`;

            const content = scriptToFileContent(script);
            await writeTextFile(fullPath, content);

            scriptExports.push({
                id: script.id,
                title: script.title,
                description: script.description,
                file: filePath,
                platform: script.platform,
                tags: script.tags,
                variables: script.variables,
                isFavorite: script.isFavorite,
                order: script.order,
                createdAt: script.createdAt,
                updatedAt: script.updatedAt
            });
        }

        // 未分類使用簡化的 category.json
        const uncatExport: CategoryExport = {
            id: 'uncategorized',
            name: i18n.t('export.uncategorizedName'),
            description: i18n.t('export.uncategorizedDesc'),
            icon: 'app_logo',
            order: 999,
            createdAt: new Date().toISOString(),
            scripts: scriptExports
        };

        await writeTextFile(
            `${uncatPath}/category.json`,
            JSON.stringify(uncatExport, null, 2)
        );
    }

    // 生成 README
    const readme = `# ScriptHub Export

Exported: ${new Date().toISOString()}

## Statistics
- Categories: ${categories.length}
- Scripts: ${scripts.length}
- Tags: ${tags.length}
- Variables: ${variables.length}

## Structure
\`\`\`
├── scripthub.json       (root manifest)
├── global/
│   ├── tags.json        (global tags)
│   └── variables.json   (global variables)
├── categories/
│   └── [category-name]/
│       ├── category.json (metadata + scripts list)
│       ├── icon.png      (custom icon if any)
│       ├── scripts/      (script files)
│       └── [subcategory]/ (nested categories)
└── uncategorized/       (scripts without category)
\`\`\`

---

*${i18n.t('export.readmeFooter')}*
`;
    await writeTextFile(`${basePath}/README.md`, readme);

    return true;
}
