import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Trash2, Check, X } from 'lucide-react';
import { useTagStore, useUIStore } from '@/stores';
import { Modal, Button } from '@/components/ui';
import { TAG_COLORS } from '@/types';
import { cn } from '@/utils/cn';

export function TagManager() {
    const { t } = useTranslation();
    const isOpen = useUIStore((state) => state.isTagManagerOpen);
    const closeTagManager = useUIStore((state) => state.closeTagManager);
    const addToast = useUIStore((state) => state.addToast);

    const tags = useTagStore((state) => state.tags);
    const addTag = useTagStore((state) => state.addTag);
    const updateTag = useTagStore((state) => state.updateTag);
    const deleteTag = useTagStore((state) => state.deleteTag);
    const getNextColor = useTagStore((state) => state.getNextColor);

    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [color, setColor] = useState('');

    const startAdd = () => {
        setIsAdding(true);
        setName('');
        setColor(getNextColor());
    };

    const startEdit = (tagId: string) => {
        const tag = tags.find((t) => t.id === tagId);
        if (tag) {
            setEditingId(tagId);
            setName(tag.name);
            setColor(tag.color);
        }
    };

    const cancel = () => {
        setIsAdding(false);
        setEditingId(null);
        setName('');
        setColor('');
    };

    const saveAdd = async () => {
        if (!name.trim()) {
            addToast({ type: 'error', message: t('tag.inputNamePlaceholder') });
            return;
        }
        try {
            await addTag({ name: name.trim(), color });
            addToast({ type: 'success', message: t('tag.created') });
            cancel();
        } catch (e) {
            console.error('Failed to add tag:', e);
            addToast({ type: 'error', message: t('common.error') });
        }
    };

    const saveEdit = async () => {
        if (!name.trim() || !editingId) return;
        try {
            await updateTag(editingId, { name: name.trim(), color });
            addToast({ type: 'success', message: t('tag.updated') });
            cancel();
        } catch (e) {
            console.error('Failed to update tag:', e);
            addToast({ type: 'error', message: t('common.error') });
        }
    };

    const handleDelete = async (tagId: string) => {
        if (confirm(t('tag.deleteConfirm'))) {
            try {
                await deleteTag(tagId);
                addToast({ type: 'success', message: t('tag.deleted') });
            } catch (e) {
                console.error('Failed to delete tag:', e);
                addToast({ type: 'error', message: t('common.error') });
            }
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={closeTagManager}
            title={t('tag.title')}
            size="sm"
        >
            <div className="space-y-3">
                {/* Tag List */}
                {tags.map((tag) => (
                    <div
                        key={tag.id}
                        className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-dark-900 rounded-lg"
                    >
                        {editingId === tag.id ? (
                            <TagForm
                                name={name}
                                setName={setName}
                                color={color}
                                setColor={setColor}
                                onSave={saveEdit}
                                onCancel={cancel}
                            />
                        ) : (
                            <>
                                <div
                                    className="w-4 h-4 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: tag.color }}
                                />
                                <span className="flex-1 text-gray-900 dark:text-gray-100">
                                    {tag.name}
                                </span>
                                <button
                                    onClick={() => startEdit(tag.id)}
                                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(tag.id)}
                                    className="p-1.5 text-gray-400 hover:text-red-500 rounded"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </>
                        )}
                    </div>
                ))}

                {/* Add New */}
                {isAdding ? (
                    <div className="p-3 bg-gray-50 dark:bg-dark-900 rounded-lg">
                        <TagForm
                            name={name}
                            setName={setName}
                            color={color}
                            setColor={setColor}
                            onSave={saveAdd}
                            onCancel={cancel}
                        />
                    </div>
                ) : (
                    <Button variant="ghost" className="w-full" onClick={startAdd}>
                        <Plus className="w-4 h-4" />
                        {t('tag.add')}
                    </Button>
                )}

                {tags.length === 0 && !isAdding && (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                        {t('tag.noTags')}
                    </p>
                )}
            </div>
        </Modal>
    );
}

interface TagFormProps {
    name: string;
    setName: (name: string) => void;
    color: string;
    setColor: (color: string) => void;
    onSave: () => void;
    onCancel: () => void;
}

function TagForm({ name, setName, color, setColor, onSave, onCancel }: TagFormProps) {
    const { t } = useTranslation();
    return (
        <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('tag.name')}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    autoFocus
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') onSave();
                        if (e.key === 'Escape') onCancel();
                    }}
                />
                <button
                    onClick={onSave}
                    className="p-1.5 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                >
                    <Check className="w-4 h-4" />
                </button>
                <button
                    onClick={onCancel}
                    className="p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
                {TAG_COLORS.map((c) => (
                    <button
                        key={c}
                        onClick={() => setColor(c)}
                        className={cn(
                            'w-6 h-6 rounded-full transition-transform',
                            color === c && 'ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-dark-900 scale-110'
                        )}
                        style={{ backgroundColor: c }}
                    />
                ))}
            </div>
        </div>
    );
}
