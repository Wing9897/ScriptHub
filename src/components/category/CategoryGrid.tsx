import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Link2, RefreshCw, Loader2, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { useCategoryStore, useScriptStore, useUIStore } from '@/stores';
import { cn, getCategoryIconSrc } from '@/utils';
import { getCategoryAndDescendantIds } from '@/utils/categoryUtils';
import { parseGitHubUrl, downloadRepoWithFallback } from '@/services/githubService';
import { useDragSort, useKeyboardShortcuts, useBoxSelection } from '@/hooks';
import { ContextMenu, ConfirmDialog, SelectionBox, SelectionCheckmark } from '@/components/ui';
import type { ContextMenuItem } from '@/components/ui';
import type { Category } from '@/types';

export function CategoryGrid() {
    const { t } = useTranslation();
    const categories = useCategoryStore((state) => state.categories);
    const setSelectedCategory = useCategoryStore((state) => state.setSelectedCategory);
    const updateSubscriptionSync = useCategoryStore((state) => state.updateSubscriptionSync);
    const reorderCategories = useCategoryStore((state) => state.reorderCategories);
    const deleteCategory = useCategoryStore((state) => state.deleteCategory);
    const scripts = useScriptStore((state) => state.scripts);
    const deleteScriptsBatch = useScriptStore((state) => state.deleteScriptsBatch);
    const addScript = useScriptStore((state) => state.addScript);
    const openCategoryManager = useUIStore((state) => state.openCategoryManager);
    const addToast = useUIStore((state) => state.addToast);
    const removeToast = useUIStore((state) => state.removeToast);
    const viewMode = useUIStore((state) => state.viewMode);
    const categorySearch = useCategoryStore((state) => state.searchQuery);

    // 多選狀態
    const selectedCategoryIds = useUIStore((state) => state.selectedCategoryIds);
    const toggleCategorySelection = useUIStore((state) => state.toggleCategorySelection);
    const selectAllCategories = useUIStore((state) => state.selectAllCategories);
    const clearSelection = useUIStore((state) => state.clearSelection);
    const setSelectedCategoryIds = useUIStore((state) => state.setSelectedCategoryIds);

    const [syncingId, setSyncingId] = useState<string | null>(null);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Context menu state
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; category: Category | null } | null>(null);
    // Delete confirm state
    const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
    const [batchDeleteConfirm, setBatchDeleteConfirm] = useState(false);

    const closeContextMenu = useCallback(() => setContextMenu(null), []);

    const handleContextMenu = (e: React.MouseEvent, category: Category) => {
        e.preventDefault();
        e.stopPropagation();
        setOpenMenuId(null);
        // 如果右鍵點擊的類別不在選中列表中，則選中它
        if (!selectedCategoryIds.has(category.id)) {
            toggleCategorySelection(category.id, false);
        }
        setContextMenu({ x: e.clientX, y: e.clientY, category });
    };

    // 處理類別點擊
    const handleCategoryClick = (e: React.MouseEvent, categoryId: string) => {
        if (e.ctrlKey || e.metaKey) {
            // Ctrl+Click: 多選
            e.preventDefault();
            toggleCategorySelection(categoryId, true);
        } else {
            // 普通點擊: 進入類別
            clearSelection();
            setSelectedCategory(categoryId);
        }
    };

    // 批量刪除
    const handleBatchDelete = async () => {
        const idsToDelete = Array.from(selectedCategoryIds);

        try {
            // 刪除 categories（deleteCategory 內部會處理相關腳本）
            for (const id of idsToDelete) {
                await deleteCategory(id);
            }

            addToast({ type: 'success', message: t('category.manager.batchDeleteSuccess', { count: idsToDelete.length }) });
        } catch (error) {
            console.error('Failed to batch delete categories:', error);
            addToast({ type: 'error', message: t('common.error') });
        }
        clearSelection();
        setBatchDeleteConfirm(false);
    };

    const handleDeleteCategory = async (category: Category) => {
        try {
            // deleteCategory 內部會處理相關腳本的刪除
            await deleteCategory(category.id);
            addToast({ type: 'success', message: t('category.manager.deleteSuccess') });
        } catch (error) {
            console.error('Failed to delete category:', error);
            addToast({ type: 'error', message: t('common.error') });
        }
        setDeleteTarget(null);
    };

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

    // 計算每個類別的腳本數量（包含子類別）
    const categoryCounts = useMemo(() => {
        const counts: Record<string, number> = {};

        // 先計算每個類別直接擁有的腳本數量
        const directCounts: Record<string, number> = {};
        scripts.forEach((script) => {
            if (script.categoryId) {
                directCounts[script.categoryId] = (directCounts[script.categoryId] || 0) + 1;
            }
        });

        // 計算包含子類別的總數
        const getTotalCount = (categoryId: string): number => {
            const descendantIds = getCategoryAndDescendantIds(categories, categoryId);
            let total = 0;
            descendantIds.forEach(id => {
                total += directCounts[id] || 0;
            });
            return total;
        };

        categories.forEach(cat => {
            counts[cat.id] = getTotalCount(cat.id);
        });

        return { counts };
    }, [scripts, categories]);

    // 排序類別 - 只顯示根類別（沒有 parentId 的）
    const sortedCategories = useMemo(() => {
        return [...categories]
            .filter(cat => !cat.parentId)
            .sort((a, b) => a.order - b.order);
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
        },
    });

    const isDragEnabled = !categorySearch.trim();

    // 鍵盤快捷鍵
    useKeyboardShortcuts({
        onDelete: () => {
            if (selectedCategoryIds.size > 0) {
                setBatchDeleteConfirm(true);
            }
        },
        onSelectAll: () => {
            const ids = filteredCategories.map(c => c.id);
            selectAllCategories(ids);
        },
        enabled: true,
    });

    // 框選功能
    const { handleMouseDown, selectionBox } = useBoxSelection({
        containerRef: containerRef as React.RefObject<HTMLElement>,
        targets: [{
            selector: '[data-category-id]',
            getItemId: (element) => element.getAttribute('data-category-id'),
            onSelectionChange: (selectedIds) => {
                setSelectedCategoryIds(selectedIds);
            },
            currentSelection: selectedCategoryIds,
        }],
        enabled: !categorySearch.trim(),
    });

    // Build context menu items for a category
    const getContextMenuItems = (category: Category | null): ContextMenuItem[] => {
        const items: ContextMenuItem[] = [];
        const selectedCount = selectedCategoryIds.size;

        // 空白處右鍵菜單
        if (!category) {
            items.push({
                label: t('category.manager.createTitle'),
                icon: <Plus className="w-4 h-4" />,
                onClick: () => openCategoryManager(),
            });
            return items;
        }

        // 批量刪除選項（多選時）
        if (selectedCount > 1) {
            items.push({
                label: t('category.manager.batchDelete', { count: selectedCount }),
                icon: <Trash2 className="w-4 h-4" />,
                onClick: () => setBatchDeleteConfirm(true),
                variant: 'danger',
            });
            return items;
        }

        if (category.isSubscription && category.sourceUrl) {
            items.push({
                label: t('category.update'),
                icon: <RefreshCw className="w-4 h-4" />,
                onClick: () => handlePullUpdate({ stopPropagation: () => {} } as React.MouseEvent, category.id, category.sourceUrl!),
                disabled: syncingId === category.id,
            });
        }

        items.push({
            label: t('common.edit'),
            icon: <Edit2 className="w-4 h-4" />,
            onClick: () => openCategoryManager(category.id),
        });

        items.push({
            label: t('common.delete'),
            icon: <Trash2 className="w-4 h-4" />,
            onClick: () => setDeleteTarget(category),
            variant: 'danger',
        });

        return items;
    };

    // Pull 更新處理 (使用 ZIP 下載) - 支持子文件夾結構
    const handlePullUpdate = async (e: React.MouseEvent | { stopPropagation: () => void }, categoryId: string, sourceUrl: string) => {
        e.stopPropagation();

        if (syncingId) return;
        setSyncingId(categoryId);
        addToast({ type: 'info', message: t('category.pulling'), persistent: true });

        try {
            const parsed = parseGitHubUrl(sourceUrl);
            if (!parsed) {
                throw new Error('Invalid GitHub URL');
            }

            const downloaded = await downloadRepoWithFallback(
                parsed.owner,
                parsed.repo,
                parsed.branch,
                parsed.path
            );

            // 1. 獲取該類別及所有子類別的 ID
            const allCategoryIds = getCategoryAndDescendantIds(categories, categoryId);

            // 2. 刪除這些類別下的所有腳本
            const oldScriptIds = scripts
                .filter(s => s.categoryId && allCategoryIds.has(s.categoryId))
                .map(s => s.id);
            if (oldScriptIds.length > 0) {
                await deleteScriptsBatch(oldScriptIds);
            }

            // 3. 刪除所有子類別（保留根訂閱類別）
            const childCategoryIds = Array.from(allCategoryIds).filter(id => id !== categoryId);
            for (const childId of childCategoryIds) {
                await deleteCategory(childId);
            }

            // 4. 根據文件路徑結構創建子類別並添加腳本
            const basePath = parsed.path || '';
            const folderToCategoryId: Record<string, string> = { '': categoryId };
            const addCategory = useCategoryStore.getState().addCategory;

            for (const { script, content } of downloaded) {
                // 計算相對路徑（去除 basePath 前綴）
                let relativePath = script.path;
                if (basePath && relativePath.startsWith(basePath)) {
                    relativePath = relativePath.slice(basePath.length);
                    if (relativePath.startsWith('/')) {
                        relativePath = relativePath.slice(1);
                    }
                }

                // 獲取文件夾路徑（不包含文件名）
                const pathParts = relativePath.split('/');
                pathParts.pop(); // 移除文件名
                const folderPath = pathParts.join('/');

                // 確保文件夾對應的類別存在
                let targetCategoryId = categoryId;
                if (folderPath) {
                    if (!folderToCategoryId[folderPath]) {
                        // 需要創建子類別，先確保父類別存在
                        let currentPath = '';
                        let parentId = categoryId;

                        for (const part of pathParts) {
                            currentPath = currentPath ? `${currentPath}/${part}` : part;

                            if (!folderToCategoryId[currentPath]) {
                                // 創建子類別
                                const newCategory = await addCategory({
                                    name: part,
                                    icon: 'folder',
                                    description: `${parsed.owner}/${parsed.repo}/${currentPath}`,
                                }, parentId);
                                folderToCategoryId[currentPath] = newCategory.id;
                            }
                            parentId = folderToCategoryId[currentPath];
                        }
                    }
                    targetCategoryId = folderToCategoryId[folderPath];
                }

                // 添加腳本到對應類別
                await addScript({
                    title: script.name.replace(/\.(sh|bat|ps1|cmd|bash|psm1)$/i, ''),
                    description: t('subscription.from', { repo: `${parsed.owner}/${parsed.repo}` }),
                    platform: script.platform,
                    commands: [{
                        order: 0,
                        content: content,
                        description: script.path
                    }],
                    tags: [],
                    categoryId: targetCategoryId,
                });
            }

            updateSubscriptionSync(categoryId);

            const currentToasts = useUIStore.getState().toasts;
            currentToasts.filter(t => t.persistent).forEach(t => removeToast(t.id));

            addToast({
                type: 'success',
                message: t('category.pullSuccess', { count: downloaded.length })
            });
        } catch (error) {
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

    // Delete confirm message - 計算包含子類別的腳本總數
    const getDeleteScriptCount = (categoryId: string): number => {
        const allCategoryIds = getCategoryAndDescendantIds(categories, categoryId);
        return scripts.filter(s => s.categoryId && allCategoryIds.has(s.categoryId)).length;
    };

    const deleteConfirmMessage = deleteTarget
        ? deleteTarget.isSubscription
            ? t('category.manager.deleteSubscriptionConfirm', {
                name: deleteTarget.name,
                count: getDeleteScriptCount(deleteTarget.id)
            })
            : t('category.manager.deleteConfirm', {
                name: deleteTarget.name,
                count: getDeleteScriptCount(deleteTarget.id)
            })
        : '';

    return (
        <div
            ref={containerRef}
            className={cn("p-6 min-h-full bg-gray-50 dark:bg-dark-900 relative select-none")}
            onClick={(e) => {
                // 點擊空白處清除選擇
                if (e.target === e.currentTarget) {
                    clearSelection();
                }
            }}
            onMouseDown={handleMouseDown}
            onContextMenu={(e) => {
                // 空白處右鍵菜單
                if (e.target === e.currentTarget) {
                    e.preventDefault();
                    setContextMenu({ x: e.clientX, y: e.clientY, category: null });
                }
            }}
        >
            {/* 框選視覺效果 */}
            <SelectionBox box={selectionBox} />
            {/* Grid View */}
            {viewMode === 'grid' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {/* 類別卡片 */}
                    {filteredCategories.map((category) => (
                        <div
                            key={category.id}
                            data-category-id={category.id}
                            className={cn(
                                "relative group",
                                isDragEnabled && "cursor-grab active:cursor-grabbing",
                                draggedId === category.id && "opacity-50",
                                dragOverId === category.id && "ring-2 ring-primary-500 ring-offset-2",
                                selectedCategoryIds.has(category.id) && "ring-2 ring-primary-500"
                            )}
                            draggable={isDragEnabled}
                            onDragStart={(e) => isDragEnabled && onDragStart(e, category.id)}
                            onDragOver={onDragOver}
                            onDragEnter={(e) => isDragEnabled && onDragEnter(e, category.id)}
                            onDragLeave={onDragLeave}
                            onDrop={(e) => isDragEnabled && onDrop(e, category.id)}
                            onDragEnd={onDragEnd}
                            onContextMenu={(e) => handleContextMenu(e, category)}
                        >
                            {/* 選中標記 */}
                            {selectedCategoryIds.has(category.id) && (
                                <SelectionCheckmark position="top-left" />
                            )}

                            <button
                                onClick={(e) => handleCategoryClick(e, category.id)}
                                className={cn(
                                    "flex flex-col items-center p-4 rounded-xl border-2 w-full",
                                    selectedCategoryIds.has(category.id)
                                        ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                                        : "border-gray-200 dark:border-dark-600",
                                    "hover:border-primary-400 dark:hover:border-primary-500",
                                    "hover:bg-primary-50 dark:hover:bg-primary-900/10",
                                    "hover:shadow-md",
                                    "transition-all duration-200"
                                )}
                            >
                                {/* 訂閱標記 - 只在未選中時顯示 */}
                                {category.isSubscription && !selectedCategoryIds.has(category.id) && (
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
                            <div
                                className="absolute top-2 right-2 z-20"
                                ref={openMenuId === category.id ? menuRef : undefined}
                            >
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
                                    <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-dark-800 rounded-lg shadow-lg border border-gray-200 dark:border-dark-600 py-1 z-30">
                                        {category.isSubscription && category.sourceUrl && (
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
                                        )}
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
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenMenuId(null);
                                                setDeleteTarget(category);
                                            }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            {t('common.delete')}
                                        </button>
                                    </div>
                                )}
                            </div>
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
                    {/* 類別列表 */}
                    {filteredCategories.map((category) => (
                        <div
                            key={category.id}
                            data-category-id={category.id}
                            className={cn(
                                "relative group",
                                isDragEnabled && "cursor-grab active:cursor-grabbing",
                                draggedId === category.id && "opacity-50",
                                dragOverId === category.id && "ring-2 ring-primary-500 ring-offset-2 rounded-lg",
                                selectedCategoryIds.has(category.id) && "ring-2 ring-primary-500 rounded-lg"
                            )}
                            draggable={isDragEnabled}
                            onDragStart={(e) => isDragEnabled && onDragStart(e, category.id)}
                            onDragOver={onDragOver}
                            onDragEnter={(e) => isDragEnabled && onDragEnter(e, category.id)}
                            onDragLeave={onDragLeave}
                            onDrop={(e) => isDragEnabled && onDrop(e, category.id)}
                            onDragEnd={onDragEnd}
                            onContextMenu={(e) => handleContextMenu(e, category)}
                        >
                            {/* 選中標記 */}
                            {selectedCategoryIds.has(category.id) && (
                                <SelectionCheckmark position="left-center" />
                            )}
                            <button
                                onClick={(e) => handleCategoryClick(e, category.id)}
                                className={cn(
                                    "w-full flex items-center gap-4 p-3 rounded-lg border",
                                    selectedCategoryIds.has(category.id)
                                        ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                                        : "border-gray-200 dark:border-dark-600",
                                    "hover:border-primary-400 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-all"
                                )}
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
                                            {category.isSubscription && category.sourceUrl && (
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
                                            )}
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
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setOpenMenuId(null);
                                                    setDeleteTarget(category);
                                                }}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                {t('common.delete')}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Right-click context menu */}
            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    items={getContextMenuItems(contextMenu.category)}
                    onClose={closeContextMenu}
                />
            )}

            {/* Delete confirmation dialog */}
            <ConfirmDialog
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={() => deleteTarget && handleDeleteCategory(deleteTarget)}
                title={deleteTarget?.isSubscription ? t('category.manager.unsubscribe') : t('common.delete')}
                message={deleteConfirmMessage}
                confirmText={deleteTarget?.isSubscription ? t('category.manager.unsubscribe') : t('common.delete')}
                variant="danger"
            />

            {/* Batch delete confirmation dialog */}
            <ConfirmDialog
                isOpen={batchDeleteConfirm}
                onClose={() => setBatchDeleteConfirm(false)}
                onConfirm={handleBatchDelete}
                title={t('common.delete')}
                message={t('category.manager.batchDeleteConfirm', { count: selectedCategoryIds.size })}
                confirmText={t('common.delete')}
                variant="danger"
            />
        </div>
    );
}
