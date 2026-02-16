import { useEffect, useCallback } from 'react';
import { useUIStore } from '@/stores';

interface UseKeyboardShortcutsOptions {
    onDelete?: () => void;
    onSelectAll?: () => void;
    enabled?: boolean;
}

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
    const { onDelete, onSelectAll, enabled = true } = options;

    const selectedCategoryIds = useUIStore((state) => state.selectedCategoryIds);
    const selectedScriptIds = useUIStore((state) => state.selectedScriptIds);
    const clearSelection = useUIStore((state) => state.clearSelection);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!enabled) return;

        // 忽略輸入框中的按鍵
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
            return;
        }

        // Escape: 取消選擇
        if (e.key === 'Escape') {
            if (selectedCategoryIds.size > 0 || selectedScriptIds.size > 0) {
                e.preventDefault();
                clearSelection();
            }
        }

        // Delete: 刪除選中項目
        if (e.key === 'Delete') {
            if ((selectedCategoryIds.size > 0 || selectedScriptIds.size > 0) && onDelete) {
                e.preventDefault();
                onDelete();
            }
        }

        // Ctrl+A: 全選
        if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
            if (onSelectAll) {
                e.preventDefault();
                onSelectAll();
            }
        }
    }, [enabled, selectedCategoryIds, selectedScriptIds, clearSelection, onDelete, onSelectAll]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
}
