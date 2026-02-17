import { useEffect } from 'react';
import { useUIStore, useScriptStore } from '@/stores';

/**
 * Global keyboard shortcuts hook
 * 
 * Shortcuts:
 * - Ctrl/Cmd + N: New script
 * - Ctrl/Cmd + F: Focus search
 * - Ctrl/Cmd + ,: Open settings
 * - Escape: Close modals, deselect script
 * - Ctrl/Cmd + 1/2: Switch view mode
 */
export function useShortcuts() {
    const openScriptEditor = useUIStore((state) => state.openScriptEditor);
    const closeScriptEditor = useUIStore((state) => state.closeScriptEditor);
    const isScriptEditorOpen = useUIStore((state) => state.isScriptEditorOpen);
    const openSettings = useUIStore((state) => state.openSettings);
    const closeSettings = useUIStore((state) => state.closeSettings);
    const isSettingsOpen = useUIStore((state) => state.isSettingsOpen);
    const closeTagManager = useUIStore((state) => state.closeTagManager);
    const isTagManagerOpen = useUIStore((state) => state.isTagManagerOpen);
    const setViewMode = useUIStore((state) => state.setViewMode);

    const setSelectedScript = useScriptStore((state) => state.setSelectedScript);
    const selectedScriptId = useScriptStore((state) => state.selectedScriptId);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isMod = e.ctrlKey || e.metaKey;

            // Check if user is typing in an input
            const activeElement = document.activeElement;
            const isTyping =
                activeElement instanceof HTMLInputElement ||
                activeElement instanceof HTMLTextAreaElement ||
                activeElement?.getAttribute('contenteditable') === 'true';

            // Escape: Close modals or deselect
            if (e.key === 'Escape') {
                if (isScriptEditorOpen) {
                    closeScriptEditor();
                    e.preventDefault();
                } else if (isSettingsOpen) {
                    closeSettings();
                    e.preventDefault();
                } else if (isTagManagerOpen) {
                    closeTagManager();
                    e.preventDefault();
                } else if (selectedScriptId) {
                    setSelectedScript(null);
                    e.preventDefault();
                }
                return;
            }

            // Don't handle other shortcuts when typing
            if (isTyping) return;

            // Ctrl/Cmd + N: New script
            if (isMod && e.key === 'n') {
                openScriptEditor();
                e.preventDefault();
                return;
            }

            // Ctrl/Cmd + F: Focus search
            if (isMod && e.key === 'f') {
                const searchInput = document.querySelector('[data-search-input]') as HTMLInputElement;
                if (searchInput) {
                    searchInput.focus();
                    e.preventDefault();
                }
                return;
            }

            // Ctrl/Cmd + ,: Open settings
            if (isMod && e.key === ',') {
                openSettings();
                e.preventDefault();
                return;
            }

            // Ctrl/Cmd + 1: List view
            if (isMod && e.key === '1') {
                setViewMode('list');
                e.preventDefault();
                return;
            }

            // Ctrl/Cmd + 2: Grid view
            if (isMod && e.key === '2') {
                setViewMode('grid');
                e.preventDefault();
                return;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [
        openScriptEditor,
        closeScriptEditor,
        isScriptEditorOpen,
        openSettings,
        closeSettings,
        isSettingsOpen,
        closeTagManager,
        isTagManagerOpen,
        setViewMode,
        setSelectedScript,
        selectedScriptId,
    ]);
}
