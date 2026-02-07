import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { useVariableStore, useUIStore } from '@/stores';
import { Modal, Button } from '@/components/ui';

export function VariableManager() {
    const { t } = useTranslation();
    const isOpen = useUIStore((state) => state.isVariableManagerOpen);
    const closeVariableManager = useUIStore((state) => state.closeVariableManager);
    const addToast = useUIStore((state) => state.addToast);

    const variables = useVariableStore((state) => state.variables);
    const addVariable = useVariableStore((state) => state.addVariable);
    const updateVariable = useVariableStore((state) => state.updateVariable);
    const deleteVariable = useVariableStore((state) => state.deleteVariable);

    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [defaultValue, setDefaultValue] = useState('');
    const [description, setDescription] = useState('');

    const startAdd = () => {
        setIsAdding(true);
        setName('');
        setDefaultValue('');
        setDescription('');
    };

    const startEdit = (varId: string) => {
        const variable = variables.find((v) => v.id === varId);
        if (variable) {
            setEditingId(varId);
            setName(variable.name);
            setDefaultValue(variable.defaultValue);
            setDescription(variable.description || '');
        }
    };

    const cancel = () => {
        setIsAdding(false);
        setEditingId(null);
        setName('');
        setDefaultValue('');
        setDescription('');
    };

    const saveAdd = async () => {
        const varName = name.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
        if (!varName) {
            addToast({ type: 'error', message: t('variable.inputNamePlaceholder') });
            return;
        }
        if (variables.some((v) => v.name === varName)) {
            addToast({ type: 'error', message: t('variable.nameExists') });
            return;
        }
        try {
            await addVariable({
                name: varName,
                defaultValue: defaultValue.trim(),
                description: description.trim() || undefined,
            });
            addToast({ type: 'success', message: t('variable.created') });
            cancel();
        } catch (e) {
            console.error('Failed to add variable:', e);
            addToast({ type: 'error', message: t('common.error') });
        }
    };

    const saveEdit = async () => {
        if (!editingId) return;
        try {
            await updateVariable(editingId, {
                defaultValue: defaultValue.trim(),
                description: description.trim() || undefined,
            });
            addToast({ type: 'success', message: t('variable.updated') });
            cancel();
        } catch (e) {
            console.error('Failed to update variable:', e);
            addToast({ type: 'error', message: t('common.error') });
        }
    };

    const handleDelete = async (varId: string) => {
        if (confirm(t('variable.deleteConfirm'))) {
            try {
                await deleteVariable(varId);
                addToast({ type: 'success', message: t('variable.deleted') });
            } catch (e) {
                console.error('Failed to delete variable:', e);
                addToast({ type: 'error', message: t('common.error') });
            }
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={closeVariableManager}
            title={t('variable.title')}
            size="md"
        >
            <div className="space-y-3">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('variable.description', { code: '${VARIABLE_NAME}' })}
                </p>

                {/* Variable List */}
                {variables.map((variable) => (
                    <div
                        key={variable.id}
                        className="p-3 bg-gray-50 dark:bg-dark-900 rounded-lg"
                    >
                        {editingId === variable.id ? (
                            <VariableForm
                                name={name}
                                setName={setName}
                                defaultValue={defaultValue}
                                setDefaultValue={setDefaultValue}
                                description={description}
                                setDescription={setDescription}
                                onSave={saveEdit}
                                onCancel={cancel}
                                isEditing
                            />
                        ) : (
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <code className="text-sm font-mono text-primary-600 dark:text-primary-400">
                                            ${'{' + variable.name + '}'}
                                        </code>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {t('variable.defaultValueLabel')} {variable.defaultValue || t('variable.noValue')}
                                    </p>
                                    {variable.description && (
                                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                            {variable.description}
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => startEdit(variable.id)}
                                        className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(variable.id)}
                                        className="p-1.5 text-gray-400 hover:text-red-500 rounded"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {/* Add New */}
                {isAdding ? (
                    <div className="p-3 bg-gray-50 dark:bg-dark-900 rounded-lg">
                        <VariableForm
                            name={name}
                            setName={setName}
                            defaultValue={defaultValue}
                            setDefaultValue={setDefaultValue}
                            description={description}
                            setDescription={setDescription}
                            onSave={saveAdd}
                            onCancel={cancel}
                        />
                    </div>
                ) : (
                    <Button variant="ghost" className="w-full" onClick={startAdd}>
                        <Plus className="w-4 h-4" />
                        {t('variable.add')}
                    </Button>
                )}

                {variables.length === 0 && !isAdding && (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                        {t('variable.noVariables')}
                    </p>
                )}
            </div>
        </Modal>
    );
}

interface VariableFormProps {
    name: string;
    setName: (name: string) => void;
    defaultValue: string;
    setDefaultValue: (value: string) => void;
    description: string;
    setDescription: (desc: string) => void;
    onSave: () => void;
    onCancel: () => void;
    isEditing?: boolean;
}

function VariableForm({
    name,
    setName,
    defaultValue,
    setDefaultValue,
    description,
    setDescription,
    onSave,
    onCancel,
    isEditing,
}: VariableFormProps) {
    const { t } = useTranslation();
    return (
        <div className="space-y-3">
            <div className="flex gap-2">
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))}
                    placeholder={t('variable.namePlaceholder')}
                    disabled={isEditing}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                    autoFocus={!isEditing}
                />
            </div>
            <input
                type="text"
                value={defaultValue}
                onChange={(e) => setDefaultValue(e.target.value)}
                placeholder={t('variable.valuePlaceholder')}
                className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                autoFocus={isEditing}
            />
            <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('variable.descPlaceholder')}
                className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-800 text-gray-600 dark:text-gray-400 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={onCancel}>
                    {t('common.cancel')}
                </Button>
                <Button size="sm" onClick={onSave}>
                    {isEditing ? t('common.update') : t('common.create')}
                </Button>
            </div>
        </div>
    );
}
