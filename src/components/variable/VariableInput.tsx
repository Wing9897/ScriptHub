import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore, useVariableStore } from '@/stores';
import { Modal, Button } from '@/components/ui';
import { replaceVariables } from '@/types/variable';

export function VariableInput() {
    const { t } = useTranslation();
    const isOpen = useUIStore((state) => state.isVariableInputOpen);
    const pendingCopyText = useUIStore((state) => state.pendingCopyText);
    const pendingCopyVariables = useUIStore((state) => state.pendingCopyVariables);
    const closeVariableInput = useUIStore((state) => state.closeVariableInput);
    const addToast = useUIStore((state) => state.addToast);

    const variables = useVariableStore((state) => state.variables);
    const getVariableDefaults = useVariableStore((state) => state.getVariableDefaults);

    const [values, setValues] = useState<Record<string, string>>({});

    // Initialize with default values
    useEffect(() => {
        if (isOpen && pendingCopyVariables.length > 0) {
            const defaults = getVariableDefaults();
            const initialValues: Record<string, string> = {};
            pendingCopyVariables.forEach((varName) => {
                initialValues[varName] = defaults[varName] || '';
            });
            setValues(initialValues);
        }
    }, [isOpen, pendingCopyVariables, getVariableDefaults]);

    const handleCopy = async () => {
        if (!pendingCopyText) return;

        const result = replaceVariables(pendingCopyText, values);

        try {
            await navigator.clipboard.writeText(result);
            addToast({ type: 'success', message: t('variable.copySuccess') });
            closeVariableInput();
        } catch (err) {
            addToast({ type: 'error', message: t('variable.copyFail') });
        }
    };

    const getVariableDescription = (varName: string) => {
        const variable = variables.find((v) => v.name === varName);
        return variable?.description;
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={closeVariableInput}
            title={t('variable.inputTitle')}
            size="sm"
            footer={
                <div className="flex justify-end gap-3">
                    <Button variant="secondary" onClick={closeVariableInput}>
                        {t('common.cancel')}
                    </Button>
                    <Button onClick={handleCopy}>
                        {t('variable.copy')}
                    </Button>
                </div>
            }
        >
            <div className="space-y-4">
                {pendingCopyVariables.map((varName) => (
                    <div key={varName}>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            <code className="text-primary-600 dark:text-primary-400">{varName}</code>
                        </label>
                        <input
                            type="text"
                            value={values[varName] || ''}
                            onChange={(e) =>
                                setValues((prev) => ({ ...prev, [varName]: e.target.value }))
                            }
                            placeholder={t('variable.inputPlaceholder', { name: varName })}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        {getVariableDescription(varName) && (
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {getVariableDescription(varName)}
                            </p>
                        )}
                    </div>
                ))}
            </div>
        </Modal>
    );
}
