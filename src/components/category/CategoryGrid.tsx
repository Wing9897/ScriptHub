import { useMemo, useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, FolderOpen, Link2, RefreshCw, Loader2, GripVertical, MoreVertical, Edit2 } from 'lucide-react';
import { useCategoryStore, useScriptStore, useUIStore } from '@/stores';
import { cn, getCategoryIconSrc } from '@/utils';
import { parseGitHubUrl, downloadRepoWithFallback } from '@/services/githubService';
import { useDragSort } from '@/hooks';
import type { Category } from '@/types';

export function CategoryGrid() {
    const { t } = useTranslation();
    const categories = useCategoryStore((state) => state.categories);
    const setSelectedCategory = useCategoryStore((state) => state.setSelectedCategory);
    const updateSubscriptionSync = useCategoryStore((state) => state.updateSubscriptionSync);
    const reorderCategories = useCategoryStore((state) => state.reorderCategories);
    const scripts = useScriptStore((state) => state.scripts);
    const setScripts = useScriptStore((state) => state.setScripts);
    const openCategoryManager = useUIStore((state) => state.openCategoryManager);
    const addToast = useUIStore((state) => state.addToast);
    const removeToast = useUIStore((state) => state.removeToast);
    const viewMode = useUIStore((state) => state.viewMode);
    const categorySearch = useCategoryStore((state) => state.searchQuery);

    const [syncingId, setSyncingId] = useState<string | null>(null);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // 點擊外部關閉選單
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpenMenuId(null);
            }
        };
        if (openMenuId) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [openMenuId]);

    // 計算每個類別的腳本數量
    const categoryCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        let uncategorizedCount = 0;

        scripts.forEach((script) => {
            if (script.categoryId) {
                counts[script.categoryId] = (counts[script.categoryId] || 0) + 1;
            } else {
                uncategorizedCount++;
            }
        });

        return { counts, uncategorizedCount };
    }, [scripts]);

    // 排序類別
    const sortedCategories = useMemo(() => {
        return [...categories].sort((a, b) => a.order - b.order);
    }, [categories]);

    // 過濾類別 (搜索時)
    const filteredCategories = useMemo(() => {
        if (!categorySearch.trim()) return sortedCategories;
        const query = categorySearch.toLowerCase();
        return sortedCategories.filter(cat =>
            cat.name.toLowerCase().includes(query) ||
            cat.description?.toLowerCase().includes(query)
        );
    }, [sortedCategories, categorySearch]);

    // 拖曳排序 (僅在未搜索時啟用)
    const {
        draggedId,
        dragOverId,
        onDragStart,
        onDragOver,
        onDragEnter,
        onDragLeave,
        onDrop,
        onDragEnd,
    } = useDragSort<Category>({
        items: sortedCategories,
        getItemId: (cat) => cat.id,
        onReorder: (newItems) => {
            reorderCategories(newItems.map(c => c.id));
            addToast({ type: 'success', message: t('category.reorderSuccess') });
        },
    });

    const isDragEnabled = !categorySearch.trim();

    // Pull 更新處理 (使用 ZIP 下載)
    const handlePullUpdate = async (e: React.MouseEvent, categoryId: string, sourceUrl: string) => {
        e.stopPropagation();

        if (syncingId) return;
        setSyncingId(categoryId);
        addToast({ type: 'info', message: t('category.pulling'), persistent: true });

        try {
            // 解析 URL
            const parsed = parseGitHubUrl(sourceUrl);
            if (!parsed) {
                throw new Error('Invalid GitHub URL');
            }

            // 使用 ZIP 下載 (比舊版更高效)
            const downloaded = await downloadRepoWithFallback(
                parsed.owner,
                parsed.repo,
                parsed.branch,
                parsed.path
            );

            // 刪除舊腳本
            const updatedScripts = scripts.filter(s => s.categoryId !== categoryId);

            // 添加新腳本
            const newScripts = downloaded.map(({ script, content }) => ({
                id: crypto.randomUUID(),
                title: script.name.replace(/\.(sh|bat|ps1|cmd|bash|psm1)$/i, ''),
                description: t('subscription.from', { repo: `${parsed.owner}/${parsed.repo}` }),
                platform: script.platform,
                commands: [{
                    id: crypto.randomUUID(),
                    order: 0,
                    content: content,
                    description: script.path
                }],
                variables: [] as string[],
                tags: [] as string[],
                categoryId: categoryId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                isFavorite: false
            }));

            setScripts([...updatedScripts, ...newScripts]);
            updateSubscriptionSync(categoryId);

            // 移除持續顯示的同步 toast
            const currentToasts = useUIStore.getState().toasts;
            currentToasts.filter(t => t.persistent).forEach(t => removeToast(t.id));

            addToast({
                type: 'success',
                message: t('category.pullSuccess', { count: downloaded.length })
            });
        } catch (error) {
            // 移除持續顯示的同步 toast
            const currentToasts = useUIStore.getState().toasts;
            currentToasts.filter(t => t.persistent).forEach(t => removeToast(t.id));

            addToast({
                type: 'error',
                message: error instanceof Error ? error.message : t('category.pullFail')
            });
        } finally {
            setSyncingId(null);
        }
    };

    return (
        <div className={cn("p-6 min-h-full bg-gray-50 dark:bg-dark-900")}>
            {/* Grid View */}
            {viewMode === 'grid' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {/* 未分類 */}
                    <button
                        onClick={() => setSelectedCategory('uncategorized')}
                        className={cn(
                            "group flex flex-col items-center p-4 rounded-xl border-2 border-dashed",
                            "border-gray-300 dark:border-dark-600",
                            "hover:border-primary-400 dark:hover:border-primary-500",
                            "hover:bg-primary-50 dark:hover:bg-primary-900/10",
                            "transition-all duration-200"
                        )}
                    >
                        <div className="w-16 h-16 flex items-center justify-center bg-gray-100 dark:bg-dark-700 rounded-xl mb-3 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/30 transition-colors">
                            <FolderOpen className="w-8 h-8 text-gray-400 dark:text-gray-500 group-hover:text-primary-500" />
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-primary-600 dark:group-hover:text-primary-400">
                            {t('category.uncategorized')}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {t('category.scriptCountSuffix', { count: categoryCounts.uncategorizedCount })}
                        </span>
                    </button>

                    {/* 類別卡片 */}
                    {filteredCategories.map((category) => (
                        <div
                            key={category.id}
                            className={cn(
                                "relative group",
                                isDragEnabled && "cursor-grab active:cursor-grabbing",
                                draggedId === category.id && "opacity-50",
                                dragOverId === category.id && "ring-2 ring-primary-500 ring-offset-2"
                            )}
                            draggable={isDragEnabled}
                            onDragStart={(e) => isDragEnabled && onDragStart(e, category.id)}
                            onDragOver={onDragOver}
                            onDragEnter={(e) => isDragEnabled && onDragEnter(e, category.id)}
                            onDragLeave={onDragLeave}
                            onDrop={(e) => isDragEnabled && onDrop(e, category.id)}
                            onDragEnd={onDragEnd}
                        >
                            {/* 拖曳把手圖標 */}
                            {isDragEnabled && (
                                <div className="absolute top-2 right-2 p-1 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                    <GripVertical className="w-4 h-4" />
                                </div>
                            )}
                            <button
                                onClick={() => setSelectedCategory(category.id)}
                                className={cn(
                                    "flex flex-col items-center p-4 rounded-xl border-2 w-full",
                                    "border-gray-200 dark:border-dark-600",
                                    "hover:border-primary-400 dark:hover:border-primary-500",
                                    "hover:bg-primary-50 dark:hover:bg-primary-900/10",
                                    "hover:shadow-md",
                                    "transition-all duration-200"
                                )}
                            >
                                {/* 訂閱標記 */}
                                {category.isSubscription && (
                                    <div className="absolute top-2 left-2">
                                        <Link2 className="w-3.5 h-3.5 text-primary-500" />
                                    </div>
                                )}

                                <div className="w-16 h-16 flex items-center justify-center bg-gray-50 dark:bg-dark-700 rounded-xl mb-3 overflow-hidden group-hover:bg-primary-50 dark:group-hover:bg-primary-900/30 transition-colors">
                                    <img
                                        src={getCategoryIconSrc(category.icon, category.customIcon)}
                                        alt={category.name}
                                        className="w-12 h-12 object-contain"
                                    />
                                </div>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-primary-600 dark:group-hover:text-primary-400">
                                    {category.name}
                                </span>
                                <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                    {t('category.scriptCountSuffix', { count: categoryCounts.counts[category.id] || 0 })}
                                </span>
                            </button>

                            {/* 更多選項選單 */}
                            {category.isSubscription && category.sourceUrl && (
                                <div className="absolute bottom-2 right-2 z-20" ref={openMenuId === category.id ? menuRef : undefined}>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenMenuId(openMenuId === category.id ? null : category.id);
                                        }}
                                        className={cn(
                                            "p-1.5 rounded-lg opacity-0 group-hover:opacity-100",
                                            "text-gray-400 hover:text-primary-600 dark:text-gray-500 dark:hover:text-primary-400",
                                            "hover:bg-gray-100 dark:hover:bg-dark-600",
                                            "transition-all",
                                            openMenuId === category.id && "opacity-100"
                                        )}
                                    >
                                        <MoreVertical className="w-4 h-4" />
                                    </button>
                                    {openMenuId === category.id && (
                                        <div className="absolute right-0 bottom-full mb-1 w-32 bg-white dark:bg-dark-800 rounded-lg shadow-lg border border-gray-200 dark:border-dark-600 py-1 z-30">
                                            <button
                                                onClick={(e) => {
                                                    setOpenMenuId(null);
                                                    handlePullUpdate(e, category.id, category.sourceUrl!);
                                                }}
                                                disabled={syncingId === category.id}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
                                            >
                                                {syncingId === category.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <RefreshCw className="w-4 h-4" />
                                                )}
                                                {t('category.update')}
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setOpenMenuId(null);
                                                    openCategoryManager(category.id);
                                                }}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                                {t('common.edit')}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}

                    {/* 新增類別按鈕 */}
                    <button
                        onClick={() => openCategoryManager()}
                        className={cn(
                            "group flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed",
                            "border-gray-300 dark:border-dark-600",
                            "hover:border-primary-400 dark:hover:border-primary-500",
                            "hover:bg-primary-50 dark:hover:bg-primary-900/10",
                            "transition-all duration-200",
                            "min-h-[140px]"
                        )}
                    >
                        <Plus className="w-8 h-8 text-gray-400 dark:text-gray-500 group-hover:text-primary-500 mb-2" />
                        <span className="text-sm text-gray-500 dark:text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400">
                            {t('category.new')}
                        </span>
                    </button>
                </div>
            )}

            {/* List View */}
            {viewMode === 'list' && (
                <div className="space-y-2">
                    {/* 未分類 */}
                    <button
                        onClick={() => setSelectedCategory('uncategorized')}
                        className="w-full flex items-center gap-4 p-3 rounded-lg border border-gray-200 dark:border-dark-600 hover:border-primary-400 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-all"
                    >
                        <div className="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-dark-700 rounded-lg">
                            <FolderOpen className="w-5 h-5 text-gray-400" />
                        </div>
                        <div className="flex-1 text-left">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('category.uncategorized')}</p>
                            <p className="text-xs text-gray-400">{t('category.scriptCountSuffix', { count: categoryCounts.uncategorizedCount })}</p>
                        </div>
                    </button>

                    {/* 類別列表 */}
                    {filteredCategories.map((category) => (
                        <div
                            key={category.id}
                            className={cn(
                                "relative group",
                                isDragEnabled && "cursor-grab active:cursor-grabbing",
                                draggedId === category.id && "opacity-50",
                                dragOverId === category.id && "ring-2 ring-primary-500 ring-offset-2 rounded-lg"
                            )}
                            draggable={isDragEnabled}
                            onDragStart={(e) => isDragEnabled && onDragStart(e, category.id)}
                            onDragOver={onDragOver}
                            onDragEnter={(e) => isDragEnabled && onDragEnter(e, category.id)}
                            onDragLeave={onDragLeave}
                            onDrop={(e) => isDragEnabled && onDrop(e, category.id)}
                            onDragEnd={onDragEnd}
                        >
                            {isDragEnabled && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 -ml-6 p-1 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <GripVertical className="w-4 h-4" />
                                </div>
                            )}
                            <button
                                onClick={() => setSelectedCategory(category.id)}
                                className="w-full flex items-center gap-4 p-3 rounded-lg border border-gray-200 dark:border-dark-600 hover:border-primary-400 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-all"
                            >
                                <div className="w-10 h-10 flex items-center justify-center bg-gray-50 dark:bg-dark-700 rounded-lg overflow-hidden">
                                    <img
                                        src={getCategoryIconSrc(category.icon, category.customIcon)}
                                        alt={category.name}
                                        className="w-8 h-8 object-contain"
                                    />
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                        {category.name}
                                        {category.isSubscription && <Link2 className="w-3 h-3 text-primary-500" />}
                                    </p>
                                    <p className="text-xs text-gray-400">{t('category.scriptCountSuffix', { count: categoryCounts.counts[category.id] || 0 })}</p>
                                </div>
                                {category.isSubscription && category.sourceUrl && (
                                    <div className="relative" ref={openMenuId === `list-${category.id}` ? menuRef : undefined}>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const menuId = `list-${category.id}`;
                                                setOpenMenuId(openMenuId === menuId ? null : menuId);
                                            }}
                                            className="p-2 text-gray-400 hover:text-primary-500 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-600"
                                        >
                                            <MoreVertical className="w-4 h-4" />
                                        </button>
                                        {openMenuId === `list-${category.id}` && (
                                            <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-dark-800 rounded-lg shadow-lg border border-gray-200 dark:border-dark-600 py-1 z-30">
                                                <button
                                                    onClick={(e) => {
                                                        setOpenMenuId(null);
                                                        handlePullUpdate(e, category.id, category.sourceUrl!);
                                                    }}
                                                    disabled={syncingId === category.id}
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
                                                >
                                                    {syncingId === category.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <RefreshCw className="w-4 h-4" />
                                                    )}
                                                    {t('category.update')}
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenMenuId(null);
                                                        openCategoryManager(category.id);
                                                    }}
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                    {t('common.edit')}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
