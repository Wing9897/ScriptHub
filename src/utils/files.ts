import type { Script } from '@/types';

/**
 * 取得腳本的副檔名
 */
export function getScriptExtension(platform: Script['platform']): string {
    switch (platform) {
        case 'windows':
            return '.bat';
        case 'linux':
        case 'macos':
            return '.sh';
        default:
            return '.sh';
    }
}

/**
 * 將檔名轉為安全的檔名 (移除特殊字元)
 */
export function sanitizeFilename(name: string): string {
    return name
        .replace(/[<>:"/\\|?*]/g, '')
        .replace(/\s+/g, '_')
        .toLowerCase();
}

/**
 * 將腳本內容轉換為檔案內容
 */
export function scriptToFileContent(script: Script): string {
    // 合併所有 commands 為單一檔案內容
    return script.commands.map(cmd => cmd.content).join('\n');
}
