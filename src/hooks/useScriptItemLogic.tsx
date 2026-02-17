import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Edit2, Trash2 } from 'lucide-react';
import { Script } from '@/types';
import { useScriptStore, useTagStore, useUIStore } from '@/stores';
import { useCopyScript } from '@/hooks/useCopyScript';

interface UseScriptItemLogicOptions {
    script: Script;
    parentContextMenu?: (e: React.MouseEvent) => void;
}

export function useScriptItemLogic({ script, parentContextMenu }: UseScriptItemLogicOptions) {
    const { t } = useTranslation();
    const setSelectedScript = useScriptStore((state) => state.setSelectedScript);
    const toggleFavorite = useScriptStore((state) => state.toggleFavorite);
    const deleteScript = useScriptStore((state) => state.deleteScript);
    const selectedScriptId = useScriptStore((state) => state.selectedScriptId);
    const getTagById = useTagStore((state) => state.getTagById);
    const addToast = useUIStore((state) => state.addToast);
    const openScriptEditor = useUIStore((state) => state.openScriptEditor);
    const { copyScript } = useCopyScript();

    const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const closeContextMenu = useCallback(() => setContextMenu(null), []);

    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (parentContextMenu) {
            parentContextMenu(e);
        } else {
            setContextMenu({ x: e.clientX, y: e.clientY });
        }
    }, [parentContextMenu]);

    const handleDelete = useCallback(async () => {
        try {
            await deleteScript(script.id);
            addToast({ type: 'success', message: t('script.deleteSuccess') });
        } catch {
            addToast({ type: 'error', message: t('common.error') });
        }
        setShowDeleteConfirm(false);
    }, [deleteScript, script.id, addToast, t]);

    const handleSelect = useCallback((e: React.MouseEvent, onSelect?: (e: React.MouseEvent, scriptId: string) => void) => {
        if (onSelect) {
            onSelect(e, script.id);
        } else {
            setSelectedScript(script.id);
        }
    }, [script.id, setSelectedScript]);

    const handleToggleFavorite = useCallback(async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await toggleFavorite(script.id);
        } catch {
            addToast({ type: 'error', message: t('common.error') });
        }
    }, [toggleFavorite, script.id, addToast, t]);

    const handleCopy = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        copyScript(script);
    }, [copyScript, script]);

    const contextMenuItems = [
        {
            label: t('common.edit'),
            icon: <Edit2 className="w-4 h-4" />,
            onClick: () => openScriptEditor(script.id),
        },
        {
            label: t('common.delete'),
            icon: <Trash2 className="w-4 h-4" />,
            onClick: () => setShowDeleteConfirm(true),
            variant: 'danger' as const,
        },
    ];

    return {
        // State
        contextMenu,
        showDeleteConfirm,
        selectedScriptId,
        // Handlers
        closeContextMenu,
        handleContextMenu,
        handleDelete,
        handleSelect,
        handleToggleFavorite,
        handleCopy,
        setShowDeleteConfirm,
        // Helpers
        getTagById,
        contextMenuItems,
        t,
    };
}
