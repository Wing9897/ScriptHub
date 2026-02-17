import { Star, Copy, Terminal } from 'lucide-react';
import { Script } from '@/types';
import { cn, PLATFORM_COLORS } from '@/utils';
import { useScriptItemLogic } from '@/hooks';
import { ContextMenu, ConfirmDialog } from '@/components/ui';

interface ScriptCardProps {
    script: Script;
    onSelect?: (e: React.MouseEvent, scriptId: string) => void;
    onContextMenu?: (e: React.MouseEvent) => void;
}

export function ScriptCard({ script, onSelect, onContextMenu: parentContextMenu }: ScriptCardProps) {
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
                    'group bg-white dark:bg-dark-800 rounded-xl border-2 p-4 cursor-pointer transition-all hover:shadow-lg',
                    selectedScriptId === script.id
                        ? 'border-primary-500 shadow-lg'
                        : 'border-gray-200 dark:border-dark-700 hover:border-gray-300 dark:hover:border-dark-600'
                )}
            >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {script.title}
                        </h3>
                        <span className={cn('inline-block mt-1 text-xs px-2 py-0.5 rounded-full', PLATFORM_COLORS[script.platform])}>
                            {t(`script.platform.${script.platform}`)}
                        </span>
                    </div>
                    <button
                        onClick={handleToggleFavorite}
                        className={cn(
                            'p-1.5 rounded-lg transition-colors',
                            script.isFavorite
                                ? 'text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
                                : 'text-gray-400 hover:text-yellow-500 hover:bg-gray-100 dark:hover:bg-dark-700'
                        )}
                    >
                        <Star className={cn('w-4 h-4', script.isFavorite && 'fill-current')} />
                    </button>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
                    {script.description || t('script.noDescription')}
                </p>

                {/* Commands Preview */}
                <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 mb-3">
                    <Terminal className="w-3.5 h-3.5" />
                    <span>{t('script.commandCount', { count: script.commands.length })}</span>
                </div>

                {/* Tags */}
                {script.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                        {script.tags.slice(0, 3).map((tagId) => {
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
                        {script.tags.length > 3 && (
                            <span className="text-xs text-gray-400">+{script.tags.length - 3}</span>
                        )}
                    </div>
                )}

                {/* Quick Copy */}
                <button
                    onClick={handleCopy}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-gray-50 dark:bg-dark-700 hover:bg-gray-100 dark:hover:bg-dark-600 rounded-lg text-sm text-gray-600 dark:text-gray-300 transition-colors opacity-0 group-hover:opacity-100"
                >
                    <Copy className="w-3.5 h-3.5" />
                    {t('script.copyAll')}
                </button>
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
