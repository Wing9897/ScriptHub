import { useState, useCallback, DragEvent, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload } from 'lucide-react';
import { useScriptStore, useUIStore, useCategoryStore } from '@/stores';
import { parseScriptFile } from '@/utils';
// Tauri native drag-drop disabled; using HTML5 File API instead

// Supported script file extensions and special filenames
const SCRIPT_EXTENSIONS = [
    // Windows
    'bat', 'cmd', 'ps1',
    // Unix/Linux/macOS
    'sh', 'bash', 'zsh', 'fish', 'ksh', 'csh', 'tcsh',
    // macOS specific
    'command',
    // Generic
    'txt', 'md', 'markdown',
    // Programming Languages
    'py', 'rb', 'pl', 'php', 'lua', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'hpp',
    // Web
    'js', 'ts', 'tsx', 'jsx', 'css', 'html', 'json', 'yaml', 'yml', 'toml', 'ini', 'conf', 'config',
];

const SCRIPT_FILENAMES = [
    'Makefile',
    'makefile',
    'Dockerfile',
    'dockerfile',
    'Rakefile',
    'Vagrantfile',
    'Justfile',
    'justfile',
];

function isScriptFile(filename: string): boolean {
    // Check by extension
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext && SCRIPT_EXTENSIONS.includes(ext)) {
        return true;
    }
    // Check by filename (no extension)
    if (SCRIPT_FILENAMES.includes(filename)) {
        return true;
    }
    return false;
}

interface DropZoneProps {
    children: ReactNode;
}

export function DropZone({ children }: DropZoneProps) {
    const { t } = useTranslation();
    const addScript = useScriptStore((state) => state.addScript);
    const addToast = useUIStore((state) => state.addToast);
    const selectedCategoryId = useCategoryStore((state) => state.selectedCategoryId);
    const [isDragging, setIsDragging] = useState(false);

    // File drop is handled via HTML5 drag-and-drop events below
    // (Tauri native drag-drop is disabled to allow in-app drag sorting)

    const handleDragOver = useCallback((e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDragEnter = useCallback((e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // Check if dragging files
        if (e.dataTransfer.types.includes('Files')) {
            setIsDragging(true);
        }
    }, []);

    const handleDragLeave = useCallback((e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const relatedTarget = e.relatedTarget as Node | null;
        const currentTarget = e.currentTarget as HTMLElement;

        if (!relatedTarget || !currentTarget.contains(relatedTarget)) {
            setIsDragging(false);
        }
    }, []);

    const handleDrop = useCallback(async (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files);

        // Ignore internal drag-sort drops (no files involved)
        if (files.length === 0) return;

        const scriptFiles = files.filter((file) => isScriptFile(file.name));

        if (scriptFiles.length === 0) {
            addToast({ type: 'error', message: t('import.file.unsupportedFormat') });
            return;
        }

        let imported = 0;
        for (const file of scriptFiles) {
            try {
                // Read file content using File API
                const content = await file.text();
                const parsed = parseScriptFile(content, file.name);

                if (parsed.commands.length > 0) {
                    await addScript({
                        title: parsed.title,
                        description: parsed.description,
                        platform: parsed.platform,
                        commands: parsed.commands.map((cmd, index) => ({
                            order: index,
                            content: cmd.content,
                            description: cmd.description,
                        })),
                        variables: [],
                        tags: [],
                        categoryId: selectedCategoryId === 'uncategorized' ? undefined : (selectedCategoryId ?? undefined),
                    });
                    imported++;
                }
            } catch (err) {
                console.error('Failed to import file:', file.name, err);
            }
        }

        if (imported > 0) {
            addToast({
                type: 'success',
                message: t('import.file.batchImportSuccess', { count: imported })
            });
        } else {
            addToast({
                type: 'error',
                message: t('import.file.parseFail')
            });
        }
    }, [addScript, addToast, selectedCategoryId, t]);

    return (
        <div
            className="relative h-full"
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {children}

            {/* Drag Overlay */}
            {isDragging && (
                <div className="absolute inset-0 z-50 bg-primary-500/10 dark:bg-primary-500/20 backdrop-blur-sm flex items-center justify-center pointer-events-none">
                    <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4 border-2 border-dashed border-primary-500">
                        <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                            <Upload className="w-8 h-8 text-primary-500" />
                        </div>
                        <div className="text-center">
                            <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                {t('import.file.dropToImport')}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {t('import.file.supportedTypes')}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
