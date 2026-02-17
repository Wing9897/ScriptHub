/**
 * GitHub Service (Consolidated)
 * 合併了原 githubService.ts 和 zipDownloadService.ts
 * 統一處理 GitHub API 調用、Token 管理、ZIP 下載
 */

import { invoke, isTauri } from '@tauri-apps/api/core';
import JSZip from 'jszip';
import i18n from '@/i18n';

// Extend Window interface for Tauri check
declare global {
    interface Window {
        __TAURI_INTERNALS__?: any;
    }
}
import { useUIStore, DEFAULT_SCRIPT_EXTENSIONS } from '@/stores/uiStore';
import { detectPlatform } from '@/utils/parseScript';
import type { GitTreeItem, ParsedGitHubUrl, ScannedScript, SubscriptionPreview } from '@/types';

// ============================================================================
// Constants
// ============================================================================

// 大型倉庫警告閾值 (50MB)
export const LARGE_REPO_THRESHOLD_MB = 50;

// ============================================================================
// Types
// ============================================================================

// Token 來源類型
export type TokenSource = 'credential_manager' | 'env_variable' | 'manual' | 'none';

// Token 狀態
export interface GitHubTokenStatus {
    hasToken: boolean;
    source: TokenSource;
    isValid: boolean | null; // null = 未驗證
    username?: string;
}

// 下載進度回調類型
export interface DownloadProgress {
    phase: 'connecting' | 'downloading' | 'extracting' | 'processing';
    percent?: number;
    bytesLoaded?: number;
    bytesTotal?: number;
    message: string;
}

// ============================================================================
// Token Management
// ============================================================================

let currentToken: string | null = null;
let tokenSource: TokenSource = 'none';
let cachedTokenStatus: GitHubTokenStatus | null = null;

// Static import to ensure bundler includes it
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';

// Helper to get the appropriate fetch function
// In Tauri: always use @tauri-apps/plugin-http to bypass CORS
// In Browser: fallback to window.fetch is handled by the plugin itself if not in Tauri, 
// but explicitly handling it here provides better control.
async function getFetch() {
    // Check if running in Tauri environment using official API
    if (isTauri()) {
        try {
            return tauriFetch;
        } catch (e) {
            console.warn('Tauri HTTP plugin loaded but failed to initialize:', e);
        }
    }

    // Browser environment or extreme fallback
    return window.fetch;
}

/**
 * 初始化 GitHub Token (按優先順序嘗試)
 */
export async function initializeGitHubToken(): Promise<GitHubTokenStatus> {
    if (cachedTokenStatus) {
        return cachedTokenStatus;
    }

    // 1. 嘗試從 Git Credential Manager 獲取
    try {
        const gcmToken = await invoke<string | null>('get_github_credential');
        if (gcmToken) {
            currentToken = gcmToken;
            tokenSource = 'credential_manager';
            cachedTokenStatus = { hasToken: true, source: 'credential_manager', isValid: null };
            return cachedTokenStatus;
        }
    } catch { /* ignore */ }

    // 2. 嘗試從環境變數獲取
    try {
        const envToken = await invoke<string | null>('get_github_env_token');
        if (envToken) {
            currentToken = envToken;
            tokenSource = 'env_variable';
            cachedTokenStatus = { hasToken: true, source: 'env_variable', isValid: null };
            return cachedTokenStatus;
        }
    } catch { /* ignore */ }

    // 3. 無 Token
    cachedTokenStatus = { hasToken: false, source: 'none', isValid: null };
    return cachedTokenStatus;
}

/**
 * 清除 Token 緩存
 */
export function clearTokenCache(): void {
    cachedTokenStatus = null;
    currentToken = null;
    tokenSource = 'none';
}

/**
 * 驗證當前 Token 是否有效
 */
export async function verifyCurrentToken(): Promise<GitHubTokenStatus> {
    if (!currentToken) {
        return { hasToken: false, source: 'none', isValid: false };
    }

    try {
        const isValid = await invoke<boolean>('verify_github_token', { token: currentToken });
        return { hasToken: true, source: tokenSource, isValid };
    } catch {
        return { hasToken: true, source: tokenSource, isValid: false };
    }
}

/**
 * 手動設置 Token
 */
export function setManualToken(token: string | null): void {
    currentToken = token;
    tokenSource = token ? 'manual' : 'none';
}

/**
 * 獲取當前 Token
 */
export function getCurrentToken(): string | null {
    return currentToken;
}

/**
 * 獲取 Token 來源
 */
export function getTokenSource(): TokenSource {
    return tokenSource;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * 獲取當前腳本副檔名設定
 */
function getScriptExtensions(): string[] {
    try {
        return useUIStore.getState().customScriptExtensions || DEFAULT_SCRIPT_EXTENSIONS;
    } catch {
        return DEFAULT_SCRIPT_EXTENSIONS;
    }
}

/**
 * 構建 API 請求 headers
 */
function buildHeaders(): HeadersInit {
    const headers: HeadersInit = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'ScriptHub-App'
    };

    if (currentToken) {
        headers['Authorization'] = `Bearer ${currentToken}`;
    }

    return headers;
}

/**
 * 解析 API 錯誤訊息
 */
function parseApiError(status: number, rateLimitRemaining?: string | null): string {
    if (status === 403) {
        if (rateLimitRemaining === '0') {
            return i18n.t('import.github.error.rateLimit');
        }
        return i18n.t('import.github.error.accessDenied');
    }
    if (status === 404) {
        return i18n.t('import.github.error.notFound');
    }
    if (status === 401) {
        return i18n.t('import.github.error.invalidToken');
    }
    return i18n.t('import.github.error.generic', { status });
}

// detectPlatform 已移至 @/utils/parseScript 統一管理

/**
 * 檢查是否為腳本檔案
 */
function isScriptFile(filename: string): boolean {
    const lower = filename.toLowerCase();
    return getScriptExtensions().some((ext: string) => lower.endsWith(ext));
}

// ============================================================================
// URL Parsing
// ============================================================================

/**
 * 解析 GitHub URL
 */
export function parseGitHubUrl(url: string): ParsedGitHubUrl | null {
    try {
        const urlObj = new URL(url);

        if (!urlObj.hostname.includes('github.com') && !urlObj.hostname.includes('gitee.com')) {
            return null;
        }

        const pathParts = urlObj.pathname.split('/').filter(Boolean);

        if (pathParts.length < 2) {
            return null;
        }

        const owner = pathParts[0];
        const repo = pathParts[1];

        let branch = 'main';
        let path = '';

        if (pathParts.length > 2) {
            if (pathParts[2] === 'tree' || pathParts[2] === 'blob') {
                branch = pathParts[3] || 'main';
                path = pathParts.slice(4).join('/');
            }
        }

        return { owner, repo, branch, path };
    } catch {
        return null;
    }
}

// ============================================================================
// GitHub API Functions
// ============================================================================

/**
 * 獲取分支的 commit SHA
 */
async function getDefaultBranchSha(
    owner: string,
    repo: string,
    branch: string = 'main'
): Promise<string> {
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/branches/${branch}`;

    const fetchFn = await getFetch();
    const response = await fetchFn(apiUrl, {
        headers: buildHeaders()
    });

    if (!response.ok) {
        if (branch === 'main' && response.status === 404) {
            return getDefaultBranchSha(owner, repo, 'master');
        }
        const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
        throw new Error(parseApiError(response.status, rateLimitRemaining));
    }

    const data = await response.json();
    return data.commit.sha;
}

/**
 * 使用 Git Trees API 獲取整個倉庫的檔案結構
 */
async function fetchRepoTree(
    owner: string,
    repo: string,
    treeSha: string
): Promise<GitTreeItem[]> {
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`;

    const fetchFn = await getFetch();
    const response = await fetchFn(apiUrl, {
        headers: buildHeaders()
    });

    if (!response.ok) {
        const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
        throw new Error(parseApiError(response.status, rateLimitRemaining));
    }

    const data = await response.json();
    return data.tree || [];
}

/**
 * 掃描腳本檔案 (使用 Git Trees API)
 */
export async function scanScriptFiles(
    owner: string,
    repo: string,
    path: string = '',
    branch: string = 'main'
): Promise<ScannedScript[]> {
    const treeSha = await getDefaultBranchSha(owner, repo, branch);
    const tree = await fetchRepoTree(owner, repo, treeSha);

    const scripts: ScannedScript[] = [];
    const pathPrefix = path ? `${path}/` : '';

    for (const item of tree) {
        if (item.type !== 'blob') continue;
        if (path && !item.path.startsWith(pathPrefix) && item.path !== path) continue;

        const filename = item.path.split('/').pop() || '';
        if (!isScriptFile(filename)) continue;

        const downloadUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${item.path}`;

        scripts.push({
            name: filename,
            path: item.path,
            downloadUrl,
            platform: detectPlatform(filename)
        });
    }

    return scripts;
}

/**
 * 獲取訂閱預覽
 */
export async function getSubscriptionPreview(url: string): Promise<SubscriptionPreview> {
    const parsed = parseGitHubUrl(url);

    if (!parsed) {
        throw new Error(i18n.t('import.github.error.invalidUrl'));
    }

    const scripts = await scanScriptFiles(parsed.owner, parsed.repo, parsed.path, parsed.branch);

    if (scripts.length === 0) {
        throw new Error(i18n.t('import.github.error.noScripts'));
    }

    return {
        repoName: parsed.repo,
        owner: parsed.owner,
        scripts,
        url
    };
}

// ============================================================================
// Repo Info
// ============================================================================

/**
 * 獲取倉庫大小估算
 */
export async function getRepoSizeInfo(
    owner: string,
    repo: string,
    token?: string | null
): Promise<{ sizeKB: number; sizeMB: number; isLarge: boolean }> {
    const headers: Record<string, string> = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'ScriptHub-App'
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const fetchFn = await getFetch();
    const response = await fetchFn(
        `https://api.github.com/repos/${owner}/${repo}`,
        { headers }
    );

    if (!response.ok) {
        return { sizeKB: 0, sizeMB: 0, isLarge: false };
    }

    const data = await response.json();
    const sizeKB = data.size || 0;
    const sizeMB = sizeKB / 1024;

    return {
        sizeKB,
        sizeMB,
        isLarge: sizeMB > LARGE_REPO_THRESHOLD_MB
    };
}

/**
 * 獲取倉庫最新 Commit SHA (用於更新檢測)
 */
export async function getLatestCommitSha(
    owner: string,
    repo: string,
    branch: string = 'main',
    token?: string | null
): Promise<string> {
    const headers: Record<string, string> = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'ScriptHub-App'
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const fetchFn = await getFetch();
    const response = await fetchFn(
        `https://api.github.com/repos/${owner}/${repo}/commits/${branch}`,
        { headers }
    );

    if (!response.ok) {
        throw new Error(`Failed to get commit info: ${response.status}`);
    }

    const data = await response.json();
    return data.sha;
}

// ============================================================================
// ZIP Download (Primary Download Method)
// ============================================================================
/**
 * 下載 GitHub 倉庫 ZIP 並提取腳本內容
 * 支持分支回退、進度回調
 */
/**
 * Download a repository, trying ZIP download first, then falling back to Tree API.
 */
export async function downloadRepoWithFallback(
    owner: string,
    repo: string,
    branch: string,
    path = '',
    onProgress?: (progress: DownloadProgress) => void
): Promise<{ script: ScannedScript; content: string }[]> {
    try {
        return await downloadRepoAsZip(owner, repo, branch, path, onProgress);
    } catch (zipError) {
        // Special handling for Browser Dev Mode:
        // Browsers block ZIP downloads due to CORS. We MUST fallback to Tree API in this specific case
        // to allow development testing to proceed.
        if (!isTauri()) {
            console.warn('[Dev Mode] Browser detected. ZIP download failed (CORS). Switching to Tree API fallback.');

            if (onProgress) {
                onProgress({
                    phase: 'connecting',
                    message: 'Browser Mode: Switching to compatible download method...'
                });
            }

            return await downloadRepoByTree(owner, repo, branch, path, onProgress);
        }

        // In Production (Tauri), we respect the user's wish to NOT automatically fallback
        // so we re-throw the error to show the failure to the user.
        throw zipError;
    }
}

/**
 * Strategy 1: Download as ZIP (Original Method, improved)
 */
async function downloadRepoAsZip(
    owner: string,
    repo: string,
    branch: string,
    path: string,
    onProgress?: (progress: DownloadProgress) => void
) {
    const token = getCurrentToken();
    // Fix: If branch is 'main', we should also try 'master' as a fallback because
    // parseGitHubUrl defaults to 'main' even for older repos that use 'master'.
    const tryBranches = (branch === 'main') ? ['main', 'master'] : (branch ? [branch] : ['main', 'master']);

    let lastError: Error | null = null;

    for (const tryBranch of tryBranches) {
        // Use API URL for zipball which handles Auth/Redirects better than raw github.com
        const zipUrl = `https://api.github.com/repos/${owner}/${repo}/zipball/${tryBranch}`;

        try {
            if (onProgress) {
                onProgress({ phase: 'connecting', message: `Connecting to ${tryBranch}...` });
            }

            const fetchFn = await getFetch();

            const headers: Record<string, string> = {
                'User-Agent': 'ScriptHub-App',
                'Accept': 'application/vnd.github.v3+json'
            };

            if (token) {
                headers['Authorization'] = `token ${token}`;
            }

            const response = await fetchFn(zipUrl, {
                method: 'GET',
                headers,
                redirect: 'follow'
            });

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error(`Branch '${tryBranch}' not found`);
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // ... (rest of ZIP logic remains similar, reading arrayBuffer)
            // Need to reconstruct the body reading part since we are replacing the function
            const contentLength = response.headers.get('content-length');
            const total = contentLength ? parseInt(contentLength, 10) : 0;

            // Tauri fetch might not support ReadableStream fully in all versions, 
            // but let's try standard arrayBuffer() first as it's most robust for small-medium repos.
            if (onProgress) {
                onProgress({
                    phase: 'downloading',
                    bytesLoaded: 0,
                    bytesTotal: total,
                    message: 'Downloading archive...'
                });
            }

            const buffer = await response.arrayBuffer();

            if (onProgress) {
                onProgress({
                    phase: 'extracting',
                    percent: 100,
                    message: 'Extracting...'
                });
            }

            return await extractScriptsFromZip(buffer, owner, repo, tryBranch, path, onProgress);

        } catch (e) {
            console.warn(`Failed to download zip for branch ${tryBranch}:`, e);
            lastError = e instanceof Error ? e : new Error(String(e));
            if (!String(e).includes('not found')) {
                // If it's a network/fetch error, it might be persistent, but try other branch if 404
                // For "Failed to fetch", we should probably throw to trigger fallback
                throw lastError;
            }
        }
    }

    throw lastError || new Error('Failed to download repository');
}

/**
 * Strategy 2: Download by Tree (Fallback)
 * slower but uses standard JSON API calls
 */
export async function downloadRepoByTree(
    owner: string,
    repo: string,
    branch: string,
    path: string,
    onProgress?: (progress: DownloadProgress) => void
) {
    const token = getCurrentToken();
    const fetchFn = await getFetch();

    // 1. Get Tree
    if (onProgress) onProgress({ phase: 'connecting', message: 'Fetching file list...' });

    // Resolve SHA for branch first if needed, or just use branch name for tree? 
    // Tree API needs SHA usually for recursive.
    // Let's get the SHA of the branch first.
    let sha = '';
    try {
        sha = await getLatestCommitSha(owner, repo, branch || 'main', token);
    } catch {
        sha = await getLatestCommitSha(owner, repo, 'master', token);
    }

    // 2. Filter files
    // fetchRepoTree returns { tree: GitTreeItem[], ... } or just the array?
    // Looking at previous valid code: "const { tree } = await fetchRepoTree..."
    // But scanScriptFiles used: "const tree = await fetchRepoTree(owner, repo, sha, token);" and then "for (const item of tree.tree) {"
    // So it returns an object with a tree property.

    // However, the lint error says "GitTreeItem[] has no property 'tree'".
    // This implies fetchRepoTree returns the array directly.
    // Let's check scanScriptFiles usage again or just handle both.
    // Actually, let's look at fetchRepoTree implementation signature if possible,
    // but safe bet is:

    const treeResult = await fetchRepoTree(owner, repo, sha);
    const allFiles = treeResult;

    const scriptFiles = allFiles.filter((item: any) =>
        item.type === 'blob' &&
        (path ? item.path.startsWith(path) : true) &&
        (isScriptFile(item.path))
    );

    if (scriptFiles.length === 0) {
        throw new Error('No script files found in repository');
    }

    // 3. Download each file
    const results: { script: ScannedScript; content: string }[] = [];
    let completed = 0;

    // Limit concurrency to 5 requests
    const batchSize = 5;

    for (let i = 0; i < scriptFiles.length; i += batchSize) {
        const batch = scriptFiles.slice(i, i + batchSize);
        const promises = batch.map(async (file: any) => {
            const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${sha}/${file.path}`;
            // Use getFetch to ensure we use valid client
            const res = await fetchFn(rawUrl, {
                headers: { 'User-Agent': 'ScriptHub-App' }
            });

            if (!res.ok) throw new Error(`Failed to fetch ${file.path}`);
            const text = await res.text();

            results.push({
                script: {
                    name: file.path.split('/').pop() || '',
                    path: file.path,
                    downloadUrl: rawUrl,
                    platform: detectPlatform(file.path)
                },
                content: text
            });
        });

        await Promise.all(promises);
        completed += batch.length;

        if (onProgress) {
            onProgress({
                phase: 'downloading',
                bytesLoaded: completed,
                bytesTotal: scriptFiles.length,
                message: `Downloading files (${completed}/${scriptFiles.length})...`
            });
        }
    }

    return results;
}

/**
 * 從 ZIP 數據中提取腳本
 */
async function extractScriptsFromZip(
    zipData: ArrayBuffer,
    owner: string,
    repo: string,
    branch: string,
    path: string,
    onProgress?: (progress: DownloadProgress) => void
): Promise<Array<{ script: ScannedScript; content: string }>> {
    onProgress?.({
        phase: 'extracting',
        message: 'Extracting archive...'
    });

    const zip = await JSZip.loadAsync(zipData);
    const extensions = getScriptExtensions();

    // 動態檢測根目錄前綴 (GitHub zipball 使用 repo-SHA/)
    // Find the first entry to determine the actual root prefix
    let rootPrefix = '';
    for (const filename of Object.keys(zip.files)) {
        const firstSlash = filename.indexOf('/');
        if (firstSlash > 0) {
            rootPrefix = filename.substring(0, firstSlash + 1);
            break;
        }
    }

    // Fallback if detection fails
    if (!rootPrefix) {
        rootPrefix = `${repo}-${branch}/`;
    }

    const pathPrefix = path ? `${rootPrefix}${path}/` : rootPrefix;

    const scriptEntries: Array<[string, JSZip.JSZipObject]> = [];
    for (const [filename, file] of Object.entries(zip.files)) {
        if (file.dir) continue;
        if (!filename.startsWith(pathPrefix)) continue;
        if (filename.includes('/.')) continue;

        const lowerFilename = filename.toLowerCase();
        const isScript = extensions.some(ext => lowerFilename.endsWith(ext));
        if (!isScript) continue;

        scriptEntries.push([filename, file]);
    }

    const results: Array<{ script: ScannedScript; content: string }> = [];
    const total = scriptEntries.length;

    for (let i = 0; i < scriptEntries.length; i++) {
        const [filename, file] = scriptEntries[i];

        onProgress?.({
            phase: 'processing',
            percent: Math.round(((i + 1) / total) * 100),
            message: `Processing scripts... ${i + 1}/${total}`
        });

        const content = await file.async('string');
        const relativePath = filename.slice(rootPrefix.length);
        const name = filename.split('/').pop() || '';
        const downloadUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${relativePath}`;

        results.push({
            script: {
                name,
                path: relativePath,
                downloadUrl,
                platform: detectPlatform(name)
            },
            content
        });
    }

    return results;
}
