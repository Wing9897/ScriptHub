import { useMemo, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useScriptStore, useTagStore, useUIStore, useCategoryStore } from '@/stores';
import { ScriptCard } from './ScriptCard';
import { ScriptListItem } from './ScriptListItem';
import { FileText, Plus, GripVertical, ChevronRight, Trash2, Check } from 'lucide-react';
import { Button, ContextMenu, ConfirmDialog } from '@/components/ui';
import type { ContextMenuItem } from '@/components/ui';
import { useDragSort, useKeyboardShortcuts, useBoxSelection } from '@/hooks';
import { cn, getCategoryIconSrc } from '@/utils';
import type { Script } from '@/types';

export function ScriptGrid() {
    const { t } = useTranslation();
    const viewMode = useUIStore((state) => state.viewMode);
    const showOnlyFavorites = useUIStore((state) => state.showOnlyFavorites);
    const openScriptEditor = useUIStore((state) => state.openScriptEditor);

    const getFilteredScripts = useScriptStore((state) => state.getFilteredScripts);
    const reorderScripts = useScriptStore((state) => state.reorderScripts);
    const scripts = useScriptStore((state) => state.scripts);
    const deleteScript = useScriptStore((state) => state.deleteScript);
    const addToast = useUIStore((state) => state.addToast);

    // 多選狀態
    const selectedScriptIds = useUIStore((state) => state.selectedScriptIds);
    const selectedCategoryIds = useUIStore((state) => state.selectedCategoryIds);
    const toggleScriptSelection = useUIStore((state) => state.toggleScriptSelection);
    const toggleCategorySelection = useUIStore((state) => state.toggleCategorySelection);
    const selectAllScripts = useUIStore((state) => state.selectAllScripts);
    const clearSelection = useUIStore((state) => state.clearSelection);
    const setSelectedScriptIds = useUIStore((state) => state.setSelectedScriptIds);
    const setSelectedCategoryIds = useUIStore((state) => state.setSelectedCategoryIds);

    // Container ref for box selection
    const containerRef = useRef<HTMLDivElement>(null);

    // Subscribe to store changes to force re-render
    useScriptStore((state) => state.searchQuery);
    useScriptStore((state) => state.platformFilter);

    const selectedTagIds = useTagStore((state) => state.selectedTagIds);
    const selectedCategoryId = useCategoryStore((state) => state.selectedCategoryId);
    const setSelectedCategory = useCategoryStore((state) => state.setSelectedCategory);
    const categories = useCategoryStore((state) => state.categories);
    const deleteCategory = useCategoryStore((state) => state.deleteCategory);

    // Context menu state
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; script: Script | null; category?: typeof categories[0] | null } | null>(null);
    const [batchDeleteConfirm, setBatchDeleteConfirm] = useState(false);
    const [batchCategoryDeleteConfirm, setBatchCategoryDeleteConfirm] = useState(false);

    const closeContextMenu = useCallback(() => setContextMenu(null), []);

    // 獲取當前類別的子類別
    const childCategories = useMemo(() => {
        if (selectedCategoryId === 'uncategorized') return [];
        return categories
            .filter(cat => cat.parentId === selectedCategoryId)
            .sort((a, b) => a.order - b.order);
    }, [categories, selectedCategoryId]);

    // 計算子類別的腳本數量（包含所有子孫）
    const getSubcategoryScriptCount = useMemo(() => {
        const getDescendantIds = (categoryId: string): string[] => {
            const children = categories.filter(c => c.parentId === categoryId);
            let ids: string[] = [];
            for (const child of children) {
                ids.push(child.id);
                ids.push(...getDescendantIds(child.id));
            }
            return ids;
        };

        return (categoryId: string): number => {
            const descendantIds = getDescendantIds(categoryId);
            const allIds = [categoryId, ...descendantIds];
            return scripts.filter(s => allIds.includes(s.categoryId || '')).length;
        };
    }, [categories, scripts]);

    let filteredScripts = getFilteredScripts();

    // Apply category filter - 只顯示直接屬於當前類別的腳本（不包含子類別的）
    if (selectedCategoryId === 'uncategorized') {
        filteredScripts = filteredScripts.filter((script) => !script.categoryId);
    } else if (selectedCategoryId) {
        filteredScripts = filteredScripts.filter((script) => script.categoryId === selectedCategoryId);
    }

    // Apply tag filter
    if (selectedTagIds.length > 0) {
        filteredScripts = filteredScripts.filter((script) =>
            selectedTagIds.some((tagId) => script.tags.includes(tagId))
        );
    }

    // Apply favorites filter
    if (showOnlyFavorites) {
        filteredScripts = filteredScripts.filter((script) => script.isFavorite);
    }

    // Sort by order field
    const sortedScripts = useMemo(() => {
        return [...filteredScripts].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }, [filteredScripts]);

    // Drag sort hook
    const {
        draggedId,
        dragOverId,
        onDragStart,
        onDragOver,
        onDragEnter,
        onDragLeave,
        onDrop,
        onDragEnd,
    } = useDragSort<Script>({
        items: sortedScripts,
        getItemId: (s) => s.id,
        onReorder: (newItems) => {
            const categoryId = selectedCategoryId === 'uncategorized' ? null : (selectedCategoryId || null);
            reorderScripts(categoryId, newItems.map(s => s.id));
        },
    });

    // Only enable drag when not searching/filtering
    const searchQuery = useScriptStore((state) => state.searchQuery);
    const isDragEnabled = selectedTagIds.length === 0 && !showOnlyFavorites && !searchQuery.trim();

    // 鍵盤快捷鍵
    useKeyboardShortcuts({
        onDelete: () => {
            if (selectedScriptIds.size > 0) {
                setBatchDeleteConfirm(true);
            } else if (selectedCategoryIds.size > 0) {
                setBatchCategoryDeleteConfirm(true);
            }
        },
        onSelectAll: () => {
            const ids = sortedScripts.map(s => s.id);
            selectAllScripts(ids);
        },
        enabled: true,
    });

    // 框選功能 - 支持腳本和子文件夾
    const { handleMouseDown, selectionBox, shouldIgnoreClick } = useBoxSelection({
        containerRef: containerRef as React.RefObject<HTMLElement>,
        targets: [
            {
                selector: '[data-script-id]',
                getItemId: (element) => element.getAttribute('data-script-id'),
                onSelectionChange: (selectedIds) => {
                    setSelectedScriptIds(selectedIds);
                },
                currentSelection: selectedScriptIds,
            },
            {
                selector: '[data-category-id]',
                getItemId: (element) => element.getAttribute('data-category-id'),
                onSelectionChange: (selectedIds) => {
                    setSelectedCategoryIds(selectedIds);
                },
                currentSelection: selectedCategoryIds,
            },
        ],
        enabled: true,
    });

    // 處理腳本右鍵菜單
    const handleContextMenu = (e: React.MouseEvent, script: Script) => {
        e.preventDefault();
        e.stopPropagation();
        // 如果右鍵點擊的腳本不在選中列表中，則選中它
        if (!selectedScriptIds.has(script.id)) {
            toggleScriptSelection(script.id, false);
        }
        setContextMenu({ x: e.clientX, y: e.clientY, script, category: null });
    };

    // 處理子文件夾右鍵菜單
    const handleCategoryContextMenu = (e: React.MouseEvent, category: typeof categories[0]) => {
        e.preventDefault();
        e.stopPropagation();
        // 如果右鍵點擊的類別不在選中列表中，則選中它
        if (!selectedCategoryIds.has(category.id)) {
            toggleCategorySelection(category.id, false);
        }
        setContextMenu({ x: e.clientX, y: e.clientY, script: null, category });
    };

    // 批量刪除腳本
    const handleBatchDelete = async () => {
        const idsToDelete = Array.from(selectedScriptIds);
        for (const id of idsToDelete) {
            await deleteScript(id);
        }
        addToast({ type: 'success', message: t('script.batchDeleteSuccess', { count: idsToDelete.length }) });
        clearSelection();
        setBatchDeleteConfirm(false);
    };

    // 批量刪除子文件夾
    const handleBatchCategoryDelete = async () => {
        const idsToDelete = Array.from(selectedCategoryIds);
        for (const id of idsToDelete) {
            await deleteCategory(id);
        }
        addToast({ type: 'success', message: t('category.manager.batchDeleteSuccess', { count: idsToDelete.length }) });
        clearSelection();
        setBatchCategoryDeleteConfirm(false);
    };

    // 獲取右鍵菜單項目
    const getContextMenuItems = (script: Script | null, category?: typeof categories[0] | null): ContextMenuItem[] => {
        const items: ContextMenuItem[] = [];
        const selectedScriptCount = selectedScriptIds.size;
        const selectedCategoryCount = selectedCategoryIds.size;

        // 子文件夾右鍵菜單
        if (category) {
            // 批量刪除選項（多選時）
            if (selectedCategoryCount > 1) {
                items.push({
                    label: t('category.manager.batchDelete', { count: selectedCategoryCount }),
                    icon: <Trash2 className="w-4 h-4" />,
                    onClick: () => setBatchCategoryDeleteConfirm(true),
                    variant: 'danger',
                });
                return items;
            }

            // 單個刪除
            items.push({
                label: t('common.delete'),
                icon: <Trash2 className="w-4 h-4" />,
                onClick: async () => {
                    await deleteCategory(category.id);
                    addToast({ type: 'success', message: t('category.manager.deleteSuccess') });
                    clearSelection();
                },
                variant: 'danger',
            });
            return items;
        }

        // 空白處右鍵菜單
        if (!script) {
            items.push({
                label: t('script.editor.titleNew'),
                icon: <Plus className="w-4 h-4" />,
                onClick: () => openScriptEditor(),
            });
            return items;
        }

        // 批量刪除選項（多選時）
        if (selectedScriptCount > 1) {
            items.push({
                label: t('script.batchDelete', { count: selectedScriptCount }),
                icon: <Trash2 className="w-4 h-4" />,
                onClick: () => setBatchDeleteConfirm(true),
                variant: 'danger',
            });
            return items;
        }

        items.push({
            label: t('common.edit'),
            icon: <FileText className="w-4 h-4" />,
            onClick: () => openScriptEditor(script.id),
        });

        items.push({
            label: t('common.delete'),
            icon: <Trash2 className="w-4 h-4" />,
            onClick: async () => {
                await deleteScript(script.id);
                addToast({ type: 'success', message: t('script.deleteSuccess') });
            },
            variant: 'danger',
        });

        return items;
    };

    // 空狀態：沒有子類別也沒有腳本
    if (childCategories.length === 0 && sortedScripts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 bg-gray-100 dark:bg-dark-800 rounded-full flex items-center justify-center mb-4">
                    <FileText className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    {t('script.noScripts')}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                    {t('script.startCreating')}
                </p>
                <Button onClick={() => openScriptEditor()}>
                    <Plus className="w-4 h-4" />
                    {t('script.create')}
                </Button>
            </div>
        );
    }

    if (viewMode === 'list') {
        return (
            <div
                ref={containerRef}
                className="space-y-2 min-h-full relative p-6 bg-gray-50 dark:bg-dark-900 select-none"
                onClick={(e) => {
                    // 如果剛完成框選，忽略這次 click
                    if (shouldIgnoreClick()) return;
                    if (e.target === e.currentTarget) {
                        clearSelection();
                    }
                }}
                onMouseDown={handleMouseDown}
                onContextMenu={(e) => {
                    if (e.target === e.currentTarget) {
                        e.preventDefault();
                        setContextMenu({ x: e.clientX, y: e.clientY, script: null });
                    }
                }}
            >
                {/* 框選視覺效果 */}
                {selectionBox && (
                    <div
                        className="absolute border-2 border-primary-500 bg-primary-500/10 pointer-events-none z-50"
                        style={{
                            left: selectionBox.left,
                            top: selectionBox.top,
                            width: selectionBox.width,
                            height: selectionBox.height,
                        }}
                    />
                )}
                {/* 子類別（文件夾） */}
                {childCategories.map((category) => (
                    <div
                        key={category.id}
                        data-category-id={category.id}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (e.ctrlKey || e.metaKey) {
                                // Ctrl+Click: 多選
                                toggleCategorySelection(category.id, true);
                            } else {
                                // 普通點擊: 進入文件夾
                                clearSelection();
                                setSelectedCategory(category.id);
                            }
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        onContextMenu={(e) => handleCategoryContextMenu(e, category)}
                        className={cn(
                            "w-full flex items-center gap-4 p-3 rounded-lg border transition-all cursor-pointer relative",
                            selectedCategoryIds.has(category.id)
                                ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                                : "border-gray-200 dark:border-dark-600 hover:border-primary-400 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/10"
                        )}
                    >
                        {/* 選中標記 */}
                        {selectedCategoryIds.has(category.id) && (
                            <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
                                <Check className="w-3 h-3 text-white" />
                            </div>
                        )}
                        <div className={cn(
                            "w-10 h-10 flex items-center justify-center bg-gray-50 dark:bg-dark-700 rounded-lg",
                            selectedCategoryIds.has(category.id) && "ml-6"
                        )}>
                            <img
                                src={getCategoryIconSrc(category.icon, category.customIcon)}
                                alt={category.name}
                                className="w-6 h-6 object-contain"
                            />
                        </div>
                        <div className="flex-1 text-left">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {category.name}
                            </p>
                            <p className="text-xs text-gray-400">
                                {t('category.scriptCountSuffix', { count: getSubcategoryScriptCount(category.id) })}
                            </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                ))}

                {/* 腳本 */}
                {sortedScripts.map((script) => (
                    <div
                        key={script.id}
                        data-script-id={script.id}
                        className={cn(
                            'relative group',
                            isDragEnabled && 'cursor-grab active:cursor-grabbing',
                            draggedId === script.id && 'opacity-50',
                            dragOverId === script.id && 'ring-2 ring-primary-500 ring-offset-2 rounded-lg',
                            selectedScriptIds.has(script.id) && 'ring-2 ring-primary-500 rounded-lg'
                        )}
                        draggable={isDragEnabled}
                        onDragStart={(e) => isDragEnabled && onDragStart(e, script.id)}
                        onDragOver={onDragOver}
                        onDragEnter={(e) => isDragEnabled && onDragEnter(e, script.id)}
                        onDragLeave={onDragLeave}
                        onDrop={(e) => isDragEnabled && onDrop(e, script.id)}
                        onDragEnd={onDragEnd}
                        onContextMenu={(e) => handleContextMenu(e, script)}
                    >
                        {/* 選中標記 */}
                        {selectedScriptIds.has(script.id) && (
                            <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
                                <Check className="w-3 h-3 text-white" />
                            </div>
                        )}
                        {isDragEnabled && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 -ml-6 p-1 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                <GripVertical className="w-4 h-4" />
                            </div>
                        )}
                        <ScriptListItem
                            script={script}
                            onSelect={(e, scriptId) => {
                                if (e.ctrlKey || e.metaKey) {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    toggleScriptSelection(scriptId, true);
                                } else {
                                    clearSelection();
                                    toggleScriptSelection(scriptId, false);
                                }
                            }}
                            onContextMenu={(e) => handleContextMenu(e, script)}
                        />
                    </div>
                ))}

                {/* Right-click context menu */}
                {contextMenu && (
                    <ContextMenu
                        x={contextMenu.x}
                        y={contextMenu.y}
                        items={getContextMenuItems(contextMenu.script, contextMenu.category)}
                        onClose={closeContextMenu}
                    />
                )}

                {/* Batch delete confirmation dialog */}
                <ConfirmDialog
                    isOpen={batchDeleteConfirm}
                    onClose={() => setBatchDeleteConfirm(false)}
                    onConfirm={handleBatchDelete}
                    title={t('common.delete')}
                    message={t('script.batchDeleteConfirm', { count: selectedScriptIds.size })}
                    confirmText={t('common.delete')}
                    variant="danger"
                />

                {/* Batch category delete confirmation dialog */}
                <ConfirmDialog
                    isOpen={batchCategoryDeleteConfirm}
                    onClose={() => setBatchCategoryDeleteConfirm(false)}
                    onConfirm={handleBatchCategoryDelete}
                    title={t('common.delete')}
                    message={t('category.manager.batchDeleteConfirm', { count: selectedCategoryIds.size })}
                    confirmText={t('common.delete')}
                    variant="danger"
                />
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="min-h-full relative p-6 bg-gray-50 dark:bg-dark-900 select-none"
            onClick={(e) => {
                // 如果剛完成框選，忽略這次 click
                if (shouldIgnoreClick()) return;
                if (e.target === e.currentTarget) {
                    clearSelection();
                }
            }}
            onMouseDown={handleMouseDown}
            onContextMenu={(e) => {
                if (e.target === e.currentTarget) {
                    e.preventDefault();
                    setContextMenu({ x: e.clientX, y: e.clientY, script: null });
                }
            }}
        >
            {/* 框選視覺效果 */}
            {selectionBox && (
                <div
                    className="absolute border-2 border-primary-500 bg-primary-500/10 pointer-events-none z-50"
                    style={{
                        left: selectionBox.left,
                        top: selectionBox.top,
                        width: selectionBox.width,
                        height: selectionBox.height,
                    }}
                />
            )}

            {/* 子類別（文件夾）卡片 - 獨立的 grid */}
            {childCategories.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
                    {childCategories.map((category) => (
                        <div
                            key={category.id}
                            data-category-id={category.id}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (e.ctrlKey || e.metaKey) {
                                    // Ctrl+Click: 多選
                                    toggleCategorySelection(category.id, true);
                                } else {
                                    // 普通點擊: 進入文件夾
                                    clearSelection();
                                    setSelectedCategory(category.id);
                                }
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            onContextMenu={(e) => handleCategoryContextMenu(e, category)}
                            className={cn(
                                "flex flex-col items-center p-4 rounded-xl border-2 cursor-pointer relative",
                                selectedCategoryIds.has(category.id)
                                    ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                                    : "border-gray-200 dark:border-dark-600",
                                "hover:border-primary-400 dark:hover:border-primary-500",
                                "hover:bg-primary-50 dark:hover:bg-primary-900/10",
                                "hover:shadow-md",
                                "transition-all duration-200"
                            )}
                        >
                            {/* 選中標記 */}
                            {selectedCategoryIds.has(category.id) && (
                                <div className="absolute top-2 left-2 z-10 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
                                    <Check className="w-3 h-3 text-white" />
                                </div>
                            )}
                            <div className="w-16 h-16 flex items-center justify-center bg-gray-50 dark:bg-dark-700 rounded-xl mb-3 overflow-hidden">
                                <img
                                    src={getCategoryIconSrc(category.icon, category.customIcon)}
                                    alt={category.name}
                                    className="w-12 h-12 object-contain"
                                />
                            </div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {category.name}
                            </span>
                            <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                {t('category.scriptCountSuffix', { count: getSubcategoryScriptCount(category.id) })}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* 腳本卡片 - 獨立的 grid */}
            {sortedScripts.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {sortedScripts.map((script) => (
                        <div
                            key={script.id}
                            data-script-id={script.id}
                            className={cn(
                                'relative group',
                                isDragEnabled && 'cursor-grab active:cursor-grabbing',
                                draggedId === script.id && 'opacity-50',
                                dragOverId === script.id && 'ring-2 ring-primary-500 ring-offset-2 rounded-xl',
                                selectedScriptIds.has(script.id) && 'ring-2 ring-primary-500 rounded-xl'
                            )}
                            draggable={isDragEnabled}
                            onDragStart={(e) => isDragEnabled && onDragStart(e, script.id)}
                            onDragOver={onDragOver}
                            onDragEnter={(e) => isDragEnabled && onDragEnter(e, script.id)}
                            onDragLeave={onDragLeave}
                            onDrop={(e) => isDragEnabled && onDrop(e, script.id)}
                            onDragEnd={onDragEnd}
                            onContextMenu={(e) => handleContextMenu(e, script)}
                        >
                            {/* 選中標記 */}
                            {selectedScriptIds.has(script.id) && (
                                <div className="absolute top-2 left-2 z-10 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
                                    <Check className="w-3 h-3 text-white" />
                                </div>
                            )}
                            {isDragEnabled && (
                                <div className="absolute top-2 right-2 p-1 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                    <GripVertical className="w-4 h-4" />
                                </div>
                            )}
                            <ScriptCard
                                script={script}
                                onSelect={(e, scriptId) => {
                                    if (e.ctrlKey || e.metaKey) {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        toggleScriptSelection(scriptId, true);
                                    } else {
                                        clearSelection();
                                        toggleScriptSelection(scriptId, false);
                                    }
                                }}
                                onContextMenu={(e) => handleContextMenu(e, script)}
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Right-click context menu */}
            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    items={getContextMenuItems(contextMenu.script, contextMenu.category)}
                    onClose={closeContextMenu}
                />
            )}

            {/* Batch delete confirmation dialog */}
            <ConfirmDialog
                isOpen={batchDeleteConfirm}
                onClose={() => setBatchDeleteConfirm(false)}
                onConfirm={handleBatchDelete}
                title={t('common.delete')}
                message={t('script.batchDeleteConfirm', { count: selectedScriptIds.size })}
                confirmText={t('common.delete')}
                variant="danger"
            />

            {/* Batch category delete confirmation dialog */}
            <ConfirmDialog
                isOpen={batchCategoryDeleteConfirm}
                onClose={() => setBatchCategoryDeleteConfirm(false)}
                onConfirm={handleBatchCategoryDelete}
                title={t('common.delete')}
                message={t('category.manager.batchDeleteConfirm', { count: selectedCategoryIds.size })}
                confirmText={t('common.delete')}
                variant="danger"
            />
        </div>
    );
}
