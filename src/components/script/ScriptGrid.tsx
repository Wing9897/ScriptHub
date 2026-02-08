import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useScriptStore, useTagStore, useUIStore, useCategoryStore } from '@/stores';
import { ScriptCard } from './ScriptCard';
import { ScriptListItem } from './ScriptListItem';
import { FileText, Plus, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui';
import { useDragSort } from '@/hooks';
import { cn } from '@/utils';
import type { Script } from '@/types';

export function ScriptGrid() {
    const { t } = useTranslation();
    const viewMode = useUIStore((state) => state.viewMode);
    const showOnlyFavorites = useUIStore((state) => state.showOnlyFavorites);
    const openScriptEditor = useUIStore((state) => state.openScriptEditor);

    const getFilteredScripts = useScriptStore((state) => state.getFilteredScripts);
    const reorderScripts = useScriptStore((state) => state.reorderScripts);

    // Subscribe to store changes to force re-render
    useScriptStore((state) => state.scripts);
    useScriptStore((state) => state.searchQuery);
    useScriptStore((state) => state.platformFilter);

    const selectedTagIds = useTagStore((state) => state.selectedTagIds);
    const selectedCategoryId = useCategoryStore((state) => state.selectedCategoryId);

    let scripts = getFilteredScripts();

    // Apply category filter
    if (selectedCategoryId === 'uncategorized') {
        scripts = scripts.filter((script) => !script.categoryId);
    } else if (selectedCategoryId) {
        scripts = scripts.filter((script) => script.categoryId === selectedCategoryId);
    }

    // Apply tag filter
    if (selectedTagIds.length > 0) {
        scripts = scripts.filter((script) =>
            selectedTagIds.some((tagId) => script.tags.includes(tagId))
        );
    }

    // Apply favorites filter
    if (showOnlyFavorites) {
        scripts = scripts.filter((script) => script.isFavorite);
    }

    // Sort by order field
    const sortedScripts = useMemo(() => {
        return [...scripts].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }, [scripts]);

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

    if (scripts.length === 0) {
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
            <div className="space-y-2">
                {sortedScripts.map((script) => (
                    <div
                        key={script.id}
                        className={cn(
                            'relative group',
                            isDragEnabled && 'cursor-grab active:cursor-grabbing',
                            draggedId === script.id && 'opacity-50',
                            dragOverId === script.id && 'ring-2 ring-primary-500 ring-offset-2 rounded-lg'
                        )}
                        draggable={isDragEnabled}
                        onDragStart={(e) => isDragEnabled && onDragStart(e, script.id)}
                        onDragOver={onDragOver}
                        onDragEnter={(e) => isDragEnabled && onDragEnter(e, script.id)}
                        onDragLeave={onDragLeave}
                        onDrop={(e) => isDragEnabled && onDrop(e, script.id)}
                        onDragEnd={onDragEnd}
                    >
                        {isDragEnabled && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 -ml-6 p-1 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                <GripVertical className="w-4 h-4" />
                            </div>
                        )}
                        <ScriptListItem script={script} />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sortedScripts.map((script) => (
                <div
                    key={script.id}
                    className={cn(
                        'relative group',
                        isDragEnabled && 'cursor-grab active:cursor-grabbing',
                        draggedId === script.id && 'opacity-50',
                        dragOverId === script.id && 'ring-2 ring-primary-500 ring-offset-2 rounded-xl'
                    )}
                    draggable={isDragEnabled}
                    onDragStart={(e) => isDragEnabled && onDragStart(e, script.id)}
                    onDragOver={onDragOver}
                    onDragEnter={(e) => isDragEnabled && onDragEnter(e, script.id)}
                    onDragLeave={onDragLeave}
                    onDrop={(e) => isDragEnabled && onDrop(e, script.id)}
                    onDragEnd={onDragEnd}
                >
                    {isDragEnabled && (
                        <div className="absolute top-2 right-2 p-1 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <GripVertical className="w-4 h-4" />
                        </div>
                    )}
                    <ScriptCard script={script} />
                </div>
            ))}
        </div>
    );
}
