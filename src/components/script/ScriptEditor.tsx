import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import { useScriptStore, useUIStore, useCategoryStore } from '@/stores';
import { Modal, Button, Input, Textarea, Select } from '@/components/ui';
import { TagSelector } from '@/components/tag/TagSelector';
import type { ScriptPlatform } from '@/types';
import { extractVariables } from '@/types/variable';

export function ScriptEditor() {
    const { t } = useTranslation();
    const isOpen = useUIStore((state) => state.isScriptEditorOpen);
    const editingScriptId = useUIStore((state) => state.editingScriptId);
    const closeScriptEditor = useUIStore((state) => state.closeScriptEditor);
    const addToast = useUIStore((state) => state.addToast);

    const scripts = useScriptStore((state) => state.scripts);
    const addScript = useScriptStore((state) => state.addScript);
    const updateScript = useScriptStore((state) => state.updateScript);

    const categories = useCategoryStore((state) => state.categories);
    const selectedCategoryId = useCategoryStore((state) => state.selectedCategoryId);

    const editingScript = editingScriptId
        ? scripts.find((s) => s.id === editingScriptId)
        : null;

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [platform, setPlatform] = useState<ScriptPlatform>('cross');
    const [commandsText, setCommandsText] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [categoryId, setCategoryId] = useState<string>('');

    // Load editing script data
    useEffect(() => {
        if (editingScript) {
            setTitle(editingScript.title);
            setDescription(editingScript.description);
            setPlatform(editingScript.platform);
            // Convert commands array to text (one per line)
            setCommandsText(
                editingScript.commands.map((cmd) => cmd.content).join('\n')
            );
            setSelectedTags(editingScript.tags);
            setCategoryId(editingScript.categoryId || '');
        } else {
            resetForm();
            // Default to current category if in category view
            if (selectedCategoryId && selectedCategoryId !== 'uncategorized') {
                setCategoryId(selectedCategoryId);
            }
        }
    }, [editingScript, selectedCategoryId]);

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setPlatform('cross');
        setCommandsText('');
        setSelectedTags([]);
        setCategoryId('');
    };

    const parseCommands = (text: string) => {
        return text
            .split('\n')
            .filter((line) => {
                const trimmed = line.trim();
                // Filter out empty lines
                if (!trimmed) return false;
                // Filter out comments (can be improved to allow option)
                if (trimmed.startsWith('::') || trimmed.startsWith('REM ')) return false;
                if (trimmed.startsWith('#')) return false;
                if (trimmed.startsWith('@echo off')) return false;
                return true;
            })
            // Remove trailing whitespace only
            .map(line => line.trimEnd());
    };

    const handleSave = () => {
        if (!title.trim()) {
            addToast({ type: 'error', message: t('script.editor.validation.title') });
            return;
        }

        const commandLines = parseCommands(commandsText);
        if (commandLines.length === 0) {
            addToast({ type: 'error', message: t('script.editor.validation.command') });
            return;
        }

        // Extract variables from all commands
        const allVariables = new Set<string>();
        commandLines.forEach((cmd) => {
            extractVariables(cmd).forEach((v) => allVariables.add(v));
        });

        const commands = commandLines.map((content, index) => ({
            id: uuidv4(),
            order: index,
            content,
        }));

        const scriptData = {
            title: title.trim(),
            description: description.trim(),
            platform,
            commands,
            variables: Array.from(allVariables),
            tags: selectedTags,
            categoryId: categoryId || undefined,
        };

        if (editingScriptId) {
            updateScript(editingScriptId, scriptData).then(() => {
                addToast({ type: 'success', message: t('script.editor.success.updated') });
                closeScriptEditor();
            }).catch((e) => {
                console.error(e);
                addToast({ type: 'error', message: t('common.error') });
            });
        } else {
            addScript(scriptData).then(() => {
                addToast({ type: 'success', message: t('script.editor.success.created') });
                closeScriptEditor();
            }).catch((e) => {
                console.error(e);
                addToast({ type: 'error', message: t('common.error') });
            });
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={closeScriptEditor}
            title={editingScriptId ? t('script.editor.titleEdit') : t('script.editor.titleNew')}
            size="lg"
            footer={
                <div className="flex justify-end gap-3">
                    <Button variant="secondary" onClick={closeScriptEditor}>
                        {t('common.cancel')}
                    </Button>
                    <Button onClick={handleSave}>
                        {editingScriptId ? t('script.editor.save') : t('script.editor.create')}
                    </Button>
                </div>
            }
        >
            <div className="space-y-4">
                {/* Title */}
                <Input
                    label={t('script.editor.label.title')}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t('script.editor.placeholder.title')}
                />

                {/* Description */}
                <Textarea
                    label={t('script.editor.label.description')}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t('script.editor.placeholder.description')}
                    rows={2}
                />

                <div className="grid grid-cols-2 gap-4">
                    {/* Platform */}
                    <Select
                        label={t('script.editor.label.platform')}
                        value={platform}
                        onChange={(e) => setPlatform(e.target.value as ScriptPlatform)}
                        options={[
                            { value: 'cross', label: `🌐 ${t('script.platform.cross')}` },
                            { value: 'windows', label: `💻 ${t('script.platform.windows')}` },
                            { value: 'macos', label: `🍎 ${t('script.platform.macos')}` },
                            { value: 'linux', label: `🐧 ${t('script.platform.linux')}` },
                        ]}
                    />

                    {/* Category */}
                    <Select
                        label={t('script.editor.label.category')}
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        options={[
                            { value: '', label: t('category.uncategorized') },
                            ...categories.map((cat) => ({
                                value: cat.id,
                                label: cat.name,
                            })),
                        ]}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        {t('script.editor.label.tags')}
                    </label>
                    <TagSelector
                        selectedTags={selectedTags}
                        onChange={setSelectedTags}
                    />
                </div>

                {/* Commands - Single Textarea */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        {t('script.editor.label.commands')}
                    </label>
                    <textarea
                        value={commandsText}
                        onChange={(e) => setCommandsText(e.target.value)}
                        placeholder={`git add .
git commit -m "\${MESSAGE}"
git push origin main`}
                        rows={10}
                        className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-dark-600 bg-gray-50 dark:bg-dark-900 text-gray-900 dark:text-gray-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                        spellCheck={false}
                    />
                    <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                        <span dangerouslySetInnerHTML={{ __html: t('script.editor.commandHint').replace('<1>', '<code class="bg-gray-100 dark:bg-dark-700 px-1 py-0.5 rounded">').replace('</1>', '</code>') }} />
                    </p>
                </div>
            </div>
        </Modal>
    );
}
