import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link2, Download, AlertCircle, Loader2, FileCode, Check, AlertTriangle, CheckSquare, Square } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import { useUIStore, useScriptStore, useCategoryStore } from '@/stores';
import {
    getSubscriptionPreview,
    parseGitHubUrl,
    getCurrentToken,
    downloadRepoWithFallback,
    getRepoSizeInfo,
    type DownloadProgress
} from '@/services/githubService';
import type { SubscriptionPreview, ScannedScript } from '@/types';

interface SubscribeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SubscribeModal({ isOpen, onClose }: SubscribeModalProps) {
    const { t } = useTranslation();
    const [url, setUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [preview, setPreview] = useState<SubscriptionPreview | null>(null);
    const [isImporting, setIsImporting] = useState(false);

    // 進度狀態
    const [progress, setProgress] = useState<DownloadProgress | null>(null);

    // 大型倉庫警告
    const [repoSize, setRepoSize] = useState<{ sizeMB: number; isLarge: boolean } | null>(null);
    const [largeRepoConfirmed, setLargeRepoConfirmed] = useState(false);

    // 選擇性匯入：追蹤選中的腳本索引
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

    const addToast = useUIStore((state) => state.addToast);
    const addScript = useScriptStore((state) => state.addScript);
    const addSubscription = useCategoryStore((state) => state.addSubscription);
    const addCategory = useCategoryStore((state) => state.addCategory);

    // 當預覽成功時，檢查倉庫大小並全選所有腳本
    useEffect(() => {
        let isMounted = true;

        if (preview) {
            // 預設全選
            setSelectedIndices(new Set(preview.scripts.map((_, i) => i)));

            // Async repo size check with mounted guard
            const checkSize = async () => {
                const parsed = parseGitHubUrl(preview.url);
                if (!parsed) return;

                try {
                    const token = getCurrentToken();
                    const sizeInfo = await getRepoSizeInfo(parsed.owner, parsed.repo, token);
                    if (isMounted) {
                        setRepoSize({ sizeMB: sizeInfo.sizeMB, isLarge: sizeInfo.isLarge });
                    }
                } catch {
                    if (isMounted) {
                        setRepoSize(null);
                    }
                }
            };
            checkSize();
        }

        return () => {
            isMounted = false;
        };
    }, [preview]);



    // 計算選中數量
    const selectedCount = selectedIndices.size;
    const totalCount = preview?.scripts.length ?? 0;
    const allSelected = selectedCount === totalCount && totalCount > 0;
    const noneSelected = selectedCount === 0;

    // 切換單個腳本選中狀態
    const toggleScript = (index: number) => {
        setSelectedIndices(prev => {
            const next = new Set(prev);
            if (next.has(index)) {
                next.delete(index);
            } else {
                next.add(index);
            }
            return next;
        });
    };

    // 全選/取消全選
    const toggleAll = () => {
        if (allSelected) {
            setSelectedIndices(new Set());
        } else {
            setSelectedIndices(new Set(preview?.scripts.map((_, i) => i) ?? []));
        }
    };

    const handleFetch = async () => {
        if (!url.trim()) {
            setError(t('subscription.errUrl'));
            return;
        }

        setIsLoading(true);
        setError(null);
        setPreview(null);
        setRepoSize(null);
        setLargeRepoConfirmed(false);
        setSelectedIndices(new Set());

        try {
            const result = await getSubscriptionPreview(url.trim());
            setPreview(result);
        } catch (e) {
            setError(e instanceof Error ? e.message : t('subscription.errFetch'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubscribe = async () => {
        if (!preview) return;
        if (noneSelected) {
            setError(t('subscription.noSelection', 'Please select at least one script'));
            return;
        }

        // 大型倉庫未確認時阻止
        if (repoSize?.isLarge && !largeRepoConfirmed) {
            return;
        }

        const parsed = parseGitHubUrl(preview.url);
        if (!parsed) {
            setError(t('subscription.errUrl'));
            return;
        }

        setIsImporting(true);
        setProgress(null);

        try {
            // 使用 ZIP 下載 (帶進度回調)
            const downloaded = await downloadRepoWithFallback(
                parsed.owner,
                parsed.repo,
                parsed.branch,
                parsed.path,
                (p) => setProgress(p)
            );

            setProgress({
                phase: 'processing',
                percent: 100,
                message: t('subscription.savingScripts', 'Saving scripts to database...')
            });

            // 建立選中腳本路徑的 Set（用於過濾 ZIP 內容）
            const selectedPaths = new Set(
                Array.from(selectedIndices).map(i => preview.scripts[i]?.path).filter(Boolean)
            );

            // 從選中的腳本路徑提取目錄結構
            const selectedScripts = downloaded.filter(({ script }) => selectedPaths.has(script.path));

            // 收集所有目錄路徑
            const dirPaths = new Set<string>();
            for (const { script } of selectedScripts) {
                const parts = script.path.split('/');
                // 移除檔案名，只保留目錄路徑
                parts.pop();
                // 建立所有層級的目錄路徑
                for (let i = 1; i <= parts.length; i++) {
                    dirPaths.add(parts.slice(0, i).join('/'));
                }
            }

            // 按層級排序目錄（確保父目錄先創建）
            const sortedDirs = Array.from(dirPaths).sort((a, b) => {
                const aDepth = a.split('/').length;
                const bDepth = b.split('/').length;
                return aDepth - bDepth;
            });

            // 創建類別映射：目錄路徑 -> 類別 ID
            const categoryMap = new Map<string, string>();

            // 建立根訂閱類別
            const rootCategory = await addSubscription(
                preview.repoName,
                preview.url,
                'github'
            );
            categoryMap.set('', rootCategory.id);

            // 為每個子目錄創建類別
            for (const dirPath of sortedDirs) {
                const parts = dirPath.split('/');
                const dirName = parts[parts.length - 1];
                const parentPath = parts.slice(0, -1).join('/');
                const parentId = categoryMap.get(parentPath) || rootCategory.id;

                // 創建子類別（不是訂閱，只是普通類別）
                const subCategory = await addCategory({
                    name: dirName,
                    icon: 'folder',
                }, parentId);

                categoryMap.set(dirPath, subCategory.id);
            }

            // 只匯入選中的腳本
            let importedCount = 0;
            for (const { script, content } of selectedScripts) {
                // 獲取腳本所屬的目錄路徑
                const parts = script.path.split('/');
                parts.pop(); // 移除檔案名
                const dirPath = parts.join('/');

                // 找到對應的類別 ID
                const categoryId = categoryMap.get(dirPath) || rootCategory.id;

                await addScript({
                    title: script.name.replace(/\.(sh|bat|ps1|cmd|bash|psm1)$/i, ''),
                    description: t('subscription.from', { repo: `${preview.owner}/${preview.repoName}` }),
                    platform: script.platform,
                    commands: [{
                        order: 0,
                        content: content,
                        description: script.path
                    }],
                    tags: [],
                    categoryId: categoryId
                });
                importedCount++;
            }

            addToast({
                type: 'success',
                message: t('subscription.success', { repo: preview.repoName, count: importedCount })
            });

            // 重置並關閉
            setUrl('');
            setPreview(null);
            setProgress(null);
            setSelectedIndices(new Set());
            onClose();
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : t('subscription.importFail');
            setError(errorMessage);
            addToast({ type: 'error', message: t('subscription.importFail') });
        } finally {
            setIsImporting(false);
        }
    };

    const handleClose = () => {
        setUrl('');
        setError(null);
        setPreview(null);
        setProgress(null);
        setRepoSize(null);
        setLargeRepoConfirmed(false);
        setSelectedIndices(new Set());
        onClose();
    };

    const getPlatformLabel = (platform: ScannedScript['platform']) => {
        switch (platform) {
            case 'windows': return 'Windows';
            case 'linux': return 'Linux/macOS';
            default: return 'Cross';
        }
    };

    // 獲取進度條百分比
    const getProgressPercent = () => {
        if (!progress) return 0;
        if (progress.phase === 'connecting') return 5;
        if (progress.phase === 'downloading') return 5 + (progress.percent || 0) * 0.6;
        if (progress.phase === 'extracting') return 70;
        if (progress.phase === 'processing') return 70 + (progress.percent || 0) * 0.3;
        return 0;
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={t('subscription.title')}
            size="lg"
        >
            <div className="space-y-4">
                {/* URL Input */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('subscription.urlLabel')}
                    </label>
                    <div className="flex gap-2">
                        <div className="flex-1 relative">
                            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="url"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder={t('subscription.urlPlaceholder')}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                disabled={isLoading || isImporting}
                            />
                        </div>
                        <Button
                            variant="secondary"
                            onClick={handleFetch}
                            disabled={isLoading || isImporting || !url.trim()}
                        >
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Download className="w-4 h-4" />
                            )}
                            {t('subscription.scan')}
                        </Button>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm">{error}</span>
                    </div>
                )}

                {/* Large Repo Warning */}
                {repoSize?.isLarge && !largeRepoConfirmed && preview && (
                    <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-lg border border-amber-200 dark:border-amber-800">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="font-medium">
                                {t('subscription.largeRepoWarning', 'Large Repository Warning')}
                            </p>
                            <p className="text-sm mt-1">
                                {t('subscription.largeRepoDesc',
                                    'This repository is approximately {{size}} MB, which may take a while to download.',
                                    { size: repoSize.sizeMB.toFixed(1) }
                                )}
                            </p>
                            <Button
                                size="sm"
                                variant="secondary"
                                className="mt-2"
                                onClick={() => setLargeRepoConfirmed(true)}
                            >
                                {t('subscription.proceedAnyway', 'Proceed Anyway')}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Download Progress with Progress Bar */}
                {isImporting && progress && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400">
                            <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                            <span className="text-sm">{progress.message}</span>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full bg-gray-200 dark:bg-dark-700 rounded-full h-2 overflow-hidden">
                            <div
                                className="bg-primary-500 h-full rounded-full transition-all duration-300 ease-out"
                                style={{ width: `${getProgressPercent()}%` }}
                            />
                        </div>
                        {progress.bytesLoaded && progress.bytesTotal && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 text-right">
                                {formatBytes(progress.bytesLoaded)} / {formatBytes(progress.bytesTotal)}
                            </p>
                        )}
                    </div>
                )}

                {/* Preview with Checkboxes */}
                {preview && !isImporting && (
                    <div className="border border-gray-200 dark:border-dark-700 rounded-lg overflow-hidden">
                        <div className="bg-gray-50 dark:bg-dark-900 px-4 py-3 border-b border-gray-200 dark:border-dark-700 flex items-center justify-between">
                            <div>
                                <h3 className="font-medium text-gray-900 dark:text-gray-100">
                                    {preview.owner}/{preview.repoName}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {t('subscription.selectedCount', '{{selected}} / {{total}} selected', {
                                        selected: selectedCount,
                                        total: totalCount
                                    })}
                                    {repoSize && !repoSize.isLarge && (
                                        <span className="ml-2">
                                            (~{repoSize.sizeMB.toFixed(1)} MB)
                                        </span>
                                    )}
                                </p>
                            </div>
                            {/* Select All / None Toggle */}
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={toggleAll}
                                className="text-xs"
                            >
                                {allSelected ? (
                                    <>
                                        <Square className="w-4 h-4 mr-1" />
                                        {t('subscription.deselectAll', 'Deselect All')}
                                    </>
                                ) : (
                                    <>
                                        <CheckSquare className="w-4 h-4 mr-1" />
                                        {t('subscription.selectAll', 'Select All')}
                                    </>
                                )}
                            </Button>
                        </div>
                        <div className="max-h-60 overflow-y-auto">
                            {preview.scripts.map((script, idx) => {
                                const isSelected = selectedIndices.has(idx);
                                return (
                                    <div
                                        key={script.path}
                                        className={`flex items-center gap-3 px-4 py-2 border-b border-gray-100 dark:border-dark-700 last:border-b-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-800 transition-colors ${isSelected ? '' : 'opacity-50'
                                            }`}
                                        onClick={() => toggleScript(idx)}
                                    >
                                        {/* Checkbox */}
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${isSelected
                                            ? 'bg-primary-500 border-primary-500 text-white'
                                            : 'border-gray-300 dark:border-dark-600'
                                            }`}>
                                            {isSelected && <Check className="w-3 h-3" />}
                                        </div>
                                        <FileCode className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-gray-900 dark:text-gray-100 truncate">
                                                {script.name}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                {script.path}
                                            </p>
                                        </div>
                                        <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-dark-700 rounded text-gray-600 dark:text-gray-400">
                                            {getPlatformLabel(script.platform)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="ghost" onClick={handleClose} disabled={isImporting}>
                        {t('common.cancel')}
                    </Button>
                    {preview && (
                        <Button
                            variant="primary"
                            onClick={handleSubscribe}
                            disabled={isImporting || noneSelected || (repoSize?.isLarge && !largeRepoConfirmed)}
                        >
                            {isImporting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    {t('subscription.importing')}
                                </>
                            ) : (
                                <>
                                    <Check className="w-4 h-4" />
                                    {t('subscription.subscribeAndImport')} ({selectedCount})
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </div>
        </Modal>
    );
}

// 格式化字節數
function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
