import { useState } from 'react';
import { Star, Edit2, Trash2, Copy, Terminal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useScriptStore, useTagStore, useUIStore } from '@/stores';
import { Button, Modal, ConfirmDialog } from '@/components/ui';
import { cn } from '@/utils/cn';
import { useCopyScript } from '@/hooks/useCopyScript';

export function ScriptDetail() {
    const { t } = useTranslation();
    const selectedScriptId = useScriptStore((state) => state.selectedScriptId);
    const scripts = useScriptStore((state) => state.scripts);
    const setSelectedScript = useScriptStore((state) => state.setSelectedScript);
    const toggleFavorite = useScriptStore((state) => state.toggleFavorite);
    const deleteScript = useScriptStore((state) => state.deleteScript);
    const getTagById = useTagStore((state) => state.getTagById);
    const openScriptEditor = useUIStore((state) => state.openScriptEditor);
    const addToast = useUIStore((state) => state.addToast);
    const { copyScript, copyCommand } = useCopyScript();

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const script = scripts.find((s) => s.id === selectedScriptId);

    const handleDelete = () => {
        setShowDeleteConfirm(true);
    };

    const handleDeleteConfirm = async () => {
        if (!script) return;
        try {
            await deleteScript(script.id);
            setSelectedScript(null);
            setShowDeleteConfirm(false);
            addToast({ type: 'success', message: t('script.deleteSuccess') });
        } catch (e) {
            console.error(e);
            addToast({ type: 'error', message: t('common.error') });
        }
    };

    const handleClose = () => setSelectedScript(null);

    if (!script) return null;

    return (
        <>
        <Modal isOpen={!!script} onClose={handleClose} title={script.title} size="lg">
            <div className="space-y-4">
                {/* Description */}
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    {script.description || t('script.noDescription')}
                </p>

                {/* Meta */}
                <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-500 dark:text-gray-400">
                        {t(`script.platform.${script.platform}`)}
                    </span>
                    <button
                        onClick={async () => {
                            try {
                                await toggleFavorite(script.id);
                            } catch (error) {
                                console.error(error);
                                addToast({ type: 'error', message: t('common.error') });
                            }
                        }}
                        className={cn(
                            'flex items-center gap-1.5 transition-colors',
                            script.isFavorite
                                ? 'text-yellow-500'
                                : 'text-gray-400 hover:text-yellow-500'
                        )}
                    >
                        <Star className={cn('w-4 h-4', script.isFavorite && 'fill-current')} />
                        {script.isFavorite ? t('script.favorited') : t('script.favorite')}
                    </button>
                </div>

                {/* Tags */}
                {script.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {script.tags.map((tagId) => {
                            const tag = getTagById(tagId);
                            if (!tag) return null;
                            return (
                                <span
                                    key={tagId}
                                    className="text-xs px-2 py-1 rounded-full text-white"
                                    style={{ backgroundColor: tag.color }}
                                >
                                    {tag.name}
                                </span>
                            );
                        })}
                    </div>
                )}

                {/* Commands */}
                <div className="space-y-2">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Terminal className="w-4 h-4" />
                        {t('script.commands')}
                    </h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {script.commands.map((cmd, index) => (
                            <div
                                key={cmd.id}
                                className="bg-gray-50 dark:bg-dark-900 rounded-lg p-3 border border-gray-200 dark:border-dark-700"
                            >
                                <div className="flex items-start justify-between gap-2 mb-1">
                                    <span className="text-xs text-gray-400 dark:text-gray-500">
                                        {t('script.step')} {index + 1}
                                    </span>
                                    <button
                                        onClick={() => copyCommand(cmd.content)}
                                        className="p-1 text-gray-400 hover:text-primary-500 rounded"
                                        title={t('script.copyCommand')}
                                    >
                                        <Copy className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                <code className="text-sm text-gray-900 dark:text-gray-100 font-mono break-all">
                                    {cmd.content}
                                </code>
                                {cmd.description && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                                        {cmd.description}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-4 border-t border-gray-200 dark:border-dark-700 space-y-2">
                    <div className="flex gap-2">
                        <Button
                            variant="secondary"
                            className="flex-1"
                            onClick={() => copyScript(script, 'multiline')}
                        >
                            <Copy className="w-4 h-4" />
                            {t('script.copyMultiline')}
                        </Button>
                        <Button
                            variant="secondary"
                            className="flex-1"
                            onClick={() => copyScript(script, 'inline')}
                        >
                            <Copy className="w-4 h-4" />
                            {t('script.copyInline')}
                        </Button>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="ghost"
                            className="flex-1"
                            onClick={() => openScriptEditor(script.id)}
                        >
                            <Edit2 className="w-4 h-4" />
                            {t('script.edit')}
                        </Button>
                        <Button
                            variant="ghost"
                            className="flex-1 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={handleDelete}
                        >
                            <Trash2 className="w-4 h-4" />
                            {t('script.delete')}
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>

        <ConfirmDialog
            isOpen={showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(false)}
            onConfirm={handleDeleteConfirm}
            title={t('script.deleteTitle')}
            message={t('script.deleteConfirm')}
            confirmText={t('common.delete')}
            variant="danger"
        />
        </>
    );
}
