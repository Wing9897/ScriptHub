import { Star, Copy, Terminal, ChevronRight } from 'lucide-react';
import { Script } from '@/types';
import { cn, PLATFORM_COLORS } from '@/utils';
import { useScriptItemLogic } from '@/hooks';
import { ContextMenu, ConfirmDialog } from '@/components/ui';

interface ScriptListItemProps {
    script: Script;
    onSelect?: (e: React.MouseEvent, scriptId: string) => void;
    onContextMenu?: (e: React.MouseEvent) => void;
}

export function ScriptListItem({ script, onSelect, onContextMenu: parentContextMenu }: ScriptListItemProps) {
    const {
        contextMenu,
        showDeleteConfirm,
        selectedScriptId,
        closeContextMenu,
        handleContextMenu,
        handleDelete,
        handleSelect,
        handleToggleFavorite,
        handleCopy,
        setShowDeleteConfirm,
        getTagById,
        contextMenuItems,
        t,
    } = useScriptItemLogic({ script, parentContextMenu });

    return (
        <>
            <div
                onClick={(e) => handleSelect(e, onSelect)}
                onContextMenu={handleContextMenu}
                className={cn(
                    'group flex items-center gap-4 bg-white dark:bg-dark-800 rounded-lg border-2 px-4 py-3 cursor-pointer transition-all hover:shadow-md',
                    selectedScriptId === script.id
                        ? 'border-primary-500 shadow-md'
                        : 'border-gray-200 dark:border-dark-700 hover:border-gray-300 dark:hover:border-dark-600'
                )}
            >
                {/* Favorite */}
                <button
                    onClick={handleToggleFavorite}
                    className={cn(
                        'p-1.5 rounded-lg transition-colors flex-shrink-0',
                        script.isFavorite
                            ? 'text-yellow-500'
                            : 'text-gray-300 dark:text-gray-600 hover:text-yellow-500'
                    )}
                >
                    <Star className={cn('w-4 h-4', script.isFavorite && 'fill-current')} />
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                            {script.title}
                        </h3>
                        <span className={cn('flex-shrink-0 text-xs px-2 py-0.5 rounded-full', PLATFORM_COLORS[script.platform])}>
                            {t(`script.platform.${script.platform}`)}
                        </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {script.description || t('script.noDescription')}
                    </p>
                </div>

                {/* Tags */}
                <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
                    {script.tags.slice(0, 2).map((tagId) => {
                        const tag = getTagById(tagId);
                        if (!tag) return null;
                        return (
                            <span
                                key={tagId}
                                className="text-xs px-2 py-0.5 rounded-full text-white"
                                style={{ backgroundColor: tag.color }}
                            >
                                {tag.name}
                            </span>
                        );
                    })}
                </div>

                {/* Command count */}
                <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                    <Terminal className="w-3.5 h-3.5" />
                    <span>{script.commands.length}</span>
                </div>

                {/* Quick Copy */}
                <button
                    onClick={handleCopy}
                    className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                    title={t('script.copyAll')}
                >
                    <Copy className="w-4 h-4" />
                </button>

                <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />
            </div>

            {/* Context menu */}
            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    items={contextMenuItems}
                    onClose={closeContextMenu}
                />
            )}

            {/* Delete confirmation */}
            <ConfirmDialog
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleDelete}
                title={t('script.deleteTitle')}
                message={t('script.deleteConfirm')}
                confirmText={t('common.delete')}
                variant="danger"
            />
        </>
    );
}
