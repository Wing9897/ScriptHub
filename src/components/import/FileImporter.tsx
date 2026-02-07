import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, FileText, X, Check, AlertCircle } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { Modal, Button, Input, Textarea, Select } from '@/components/ui';
import { TagSelector } from '@/components/tag/TagSelector';
import { useScriptStore, useUIStore } from '@/stores';
import { parseScriptFile, type ParsedScript } from '@/utils';
import type { ScriptPlatform } from '@/types';

interface FileImporterProps {
    isOpen: boolean;
    onClose: () => void;
}

export function FileImporter({ isOpen, onClose }: FileImporterProps) {
    const { t } = useTranslation();
    const addScript = useScriptStore((state) => state.addScript);
    const addToast = useUIStore((state) => state.addToast);

    const [parsedScript, setParsedScript] = useState<ParsedScript | null>(null);
    const [filename, setFilename] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [platform, setPlatform] = useState<ScriptPlatform>('cross');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    const resetState = () => {
        setParsedScript(null);
        setFilename('');
        setTitle('');
        setDescription('');
        setPlatform('cross');
        setSelectedTags([]);
        setError(null);
    };

    const handleSelectFile = async () => {
        try {
            const selected = await open({
                multiple: false,
                filters: [
                    {
                        name: t('import.file.filters.script'),
                        extensions: ['bat', 'cmd', 'ps1', 'sh', 'bash', 'zsh', 'fish', 'ksh', 'command', 'txt'],
                    },
                ],
            });

            if (!selected) return;

            const filePath = selected as string;
            const content = await readTextFile(filePath);
            const name = filePath.split(/[/\\]/).pop() || 'script';

            const parsed = parseScriptFile(content, name);

            setParsedScript(parsed);
            setFilename(name);
            setTitle(parsed.title);
            setDescription(parsed.description);
            setPlatform(parsed.platform);
            setError(null);

            if (parsed.commands.length === 0) {
                setError(t('import.file.noCommandsFound'));
            }
        } catch (e) {
            console.error('Failed to read file:', e);
            setError(t('import.file.readError'));
        }
    };

    const handleImport = () => {
        if (!parsedScript || parsedScript.commands.length === 0) {
            addToast({ type: 'error', message: t('import.file.noValidCommands') });
            return;
        }

        addScript({
            title: title.trim() || parsedScript.title,
            description: description.trim(),
            platform,
            commands: parsedScript.commands.map((cmd, index) => ({
                order: index,
                content: cmd.content,
                description: cmd.description,
            })),
            variables: [],
            tags: selectedTags,
        });

        addToast({ type: 'success', message: t('import.file.importSuccess') });
        resetState();
        onClose();
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={t('import.file.title')}
            size="lg"
            footer={
                <div className="flex justify-end gap-3">
                    <Button variant="secondary" onClick={handleClose}>
                        {t('common.cancel')}
                    </Button>
                    <Button
                        onClick={handleImport}
                        disabled={!parsedScript || parsedScript.commands.length === 0}
                    >
                        <Check className="w-4 h-4" />
                        {t('import.folderImport')}
                    </Button>
                </div>
            }
        >
            <div className="space-y-4">
                {/* File Selection */}
                {!parsedScript ? (
                    <div
                        onClick={handleSelectFile}
                        className="border-2 border-dashed border-gray-300 dark:border-dark-600 rounded-xl p-8 text-center cursor-pointer hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-colors"
                    >
                        <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-600 dark:text-gray-400 mb-2">
                            {t('import.file.clickToSelect')}
                        </p>
                        <p className="text-sm text-gray-400 dark:text-gray-500">
                            {t('import.file.supportedTypes')}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* File Info */}
                        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-dark-900 rounded-lg">
                            <FileText className="w-5 h-5 text-primary-500" />
                            <span className="flex-1 text-gray-900 dark:text-gray-100 truncate">
                                {filename}
                            </span>
                            <button
                                onClick={resetState}
                                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
                                <AlertCircle className="w-4 h-4" />
                                <span className="text-sm">{error}</span>
                            </div>
                        )}

                        {/* Edit Form */}
                        <Input
                            label={t('script.editor.label.title')}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={t('script.editor.placeholder.title')}
                        />

                        <Textarea
                            label={t('script.editor.label.description')}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={t('script.editor.placeholder.description')}
                            rows={2}
                        />

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

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                {t('tag.title')}
                            </label>
                            <TagSelector
                                selectedTags={selectedTags}
                                onChange={setSelectedTags}
                            />
                        </div>

                        {/* Commands Preview */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                {t('import.file.parsedCommands', { count: parsedScript.commands.length })}
                            </label>
                            <div className="max-h-48 overflow-y-auto space-y-1 p-3 bg-gray-50 dark:bg-dark-900 rounded-lg">
                                {parsedScript.commands.map((cmd, index) => (
                                    <div
                                        key={index}
                                        className="text-sm font-mono text-gray-800 dark:text-gray-200 bg-white dark:bg-dark-800 px-2 py-1 rounded"
                                    >
                                        <span className="text-gray-400 mr-2">{index + 1}.</span>
                                        {cmd.content}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
}
