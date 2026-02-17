import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ViewMode, Theme } from '@/types';

// 預設腳本副檔名
export const DEFAULT_SCRIPT_EXTENSIONS = ['.sh', '.bash', '.bat', '.cmd', '.ps1', '.psm1'];

interface UIState {
    theme: Theme;
    viewMode: ViewMode;
    sidebarCollapsed: boolean;
    showOnlyFavorites: boolean;
    isScriptEditorOpen: boolean;
    editingScriptId: string | null;
    isTagManagerOpen: boolean;
    isCategoryManagerOpen: boolean;
    editingCategoryId: string | null;
    defaultParentId: string | null;  // 新建類別時的預設父類別
    isSettingsOpen: boolean;
    isSubscribeModalOpen: boolean;
    toasts: Toast[];
    closeBehavior: 'ask' | 'minimize' | 'quit';
    customScriptExtensions: string[];
    startMinimized: boolean;

    // 多選狀態
    selectedCategoryIds: Set<string>;
    selectedScriptIds: Set<string>;

    setCloseBehavior: (behavior: 'ask' | 'minimize' | 'quit') => void;
    setCustomScriptExtensions: (extensions: string[]) => void;
    addScriptExtension: (ext: string) => void;
    removeScriptExtension: (ext: string) => void;
    resetScriptExtensions: () => void;
    setStartMinimized: (value: boolean) => void;

    // 多選方法
    toggleCategorySelection: (id: string, multi?: boolean) => void;
    toggleScriptSelection: (id: string, multi?: boolean) => void;
    selectAllCategories: (ids: string[]) => void;
    selectAllScripts: (ids: string[]) => void;
    setSelectedCategoryIds: (ids: string[]) => void;
    setSelectedScriptIds: (ids: string[]) => void;
    clearSelection: () => void;

    setTheme: (theme: Theme) => void;
    setViewMode: (mode: ViewMode) => void;
    toggleSidebar: () => void;
    toggleShowOnlyFavorites: () => void;
    openScriptEditor: (scriptId?: string) => void;
    closeScriptEditor: () => void;
    openTagManager: () => void;
    closeTagManager: () => void;
    openCategoryManager: (editCategoryId?: string, defaultParentId?: string | null) => void;
    closeCategoryManager: () => void;
    openSettings: () => void;
    closeSettings: () => void;
    openSubscribeModal: () => void;
    closeSubscribeModal: () => void;
    addToast: (toast: Omit<Toast, 'id'>) => void;
    removeToast: (id: string) => void;
}

export interface Toast {
    id: string;
    type: 'success' | 'error' | 'info';
    message: string;
    persistent?: boolean;
}

export const useUIStore = create<UIState>()(
    persist(
        (set) => ({
            theme: 'system',
            viewMode: 'grid',
            sidebarCollapsed: false,
            showOnlyFavorites: false,
            isScriptEditorOpen: false,
            editingScriptId: null,
            isTagManagerOpen: false,
            isCategoryManagerOpen: false,
            editingCategoryId: null,
            defaultParentId: null,
            isSettingsOpen: false,
            isSubscribeModalOpen: false,
            toasts: [],
            closeBehavior: 'ask',
            customScriptExtensions: DEFAULT_SCRIPT_EXTENSIONS,
            startMinimized: true,

            // 多選狀態初始值
            selectedCategoryIds: new Set<string>(),
            selectedScriptIds: new Set<string>(),

            setCloseBehavior: (behavior) => set({ closeBehavior: behavior }),
            setCustomScriptExtensions: (extensions) => set({ customScriptExtensions: extensions }),
            addScriptExtension: (ext) => set((state) => ({
                customScriptExtensions: state.customScriptExtensions.includes(ext)
                    ? state.customScriptExtensions
                    : [...state.customScriptExtensions, ext]
            })),
            removeScriptExtension: (ext) => set((state) => ({
                customScriptExtensions: state.customScriptExtensions.filter(e => e !== ext)
            })),
            resetScriptExtensions: () => set({ customScriptExtensions: DEFAULT_SCRIPT_EXTENSIONS }),
            setStartMinimized: (value) => set({ startMinimized: value }),

            // 多選方法
            toggleCategorySelection: (id, multi = false) => set((state) => {
                const newSet = new Set(multi ? state.selectedCategoryIds : []);
                if (newSet.has(id)) {
                    newSet.delete(id);
                } else {
                    newSet.add(id);
                }
                return { selectedCategoryIds: newSet, selectedScriptIds: new Set() };
            }),

            toggleScriptSelection: (id, multi = false) => set((state) => {
                const newSet = new Set(multi ? state.selectedScriptIds : []);
                if (newSet.has(id)) {
                    newSet.delete(id);
                } else {
                    newSet.add(id);
                }
                return { selectedScriptIds: newSet, selectedCategoryIds: new Set() };
            }),

            selectAllCategories: (ids) => set({ selectedCategoryIds: new Set(ids), selectedScriptIds: new Set() }),

            selectAllScripts: (ids) => set({ selectedScriptIds: new Set(ids), selectedCategoryIds: new Set() }),

            setSelectedCategoryIds: (ids) => set({ selectedCategoryIds: new Set(ids) }),

            setSelectedScriptIds: (ids) => set({ selectedScriptIds: new Set(ids) }),

            clearSelection: () => set({ selectedCategoryIds: new Set(), selectedScriptIds: new Set() }),

            setTheme: (theme) => set({ theme }),

            setViewMode: (mode) => set({ viewMode: mode }),

            toggleSidebar: () =>
                set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

            toggleShowOnlyFavorites: () =>
                set((state) => ({ showOnlyFavorites: !state.showOnlyFavorites })),

            openScriptEditor: (scriptId) =>
                set({ isScriptEditorOpen: true, editingScriptId: scriptId || null }),

            closeScriptEditor: () =>
                set({ isScriptEditorOpen: false, editingScriptId: null }),

            openTagManager: () => set({ isTagManagerOpen: true }),

            closeTagManager: () => set({ isTagManagerOpen: false }),

            openCategoryManager: (editCategoryId, defaultParentId) => set({
                isCategoryManagerOpen: true,
                editingCategoryId: editCategoryId || null,
                defaultParentId: defaultParentId !== undefined ? defaultParentId : null
            }),

            closeCategoryManager: () => set({ isCategoryManagerOpen: false, editingCategoryId: null, defaultParentId: null }),

            openSettings: () => set({ isSettingsOpen: true }),

            closeSettings: () => set({ isSettingsOpen: false }),

            openSubscribeModal: () => set({ isSubscribeModalOpen: true }),

            closeSubscribeModal: () => set({ isSubscribeModalOpen: false }),

            addToast: (toast) =>
                set((state) => {
                    // 新的非持續 toast 出現時，自動移除所有持續 toast
                    const filtered = toast.persistent
                        ? state.toasts
                        : state.toasts.filter(t => !t.persistent);
                    return {
                        toasts: [...filtered, { ...toast, id: Date.now().toString() }],
                    };
                }),

            removeToast: (id) =>
                set((state) => ({
                    toasts: state.toasts.filter((t) => t.id !== id),
                })),
        }),
        {
            name: 'scripthub-ui',
            partialize: (state) => ({
                theme: state.theme,
                viewMode: state.viewMode,
                sidebarCollapsed: state.sidebarCollapsed,
                closeBehavior: state.closeBehavior,
                customScriptExtensions: state.customScriptExtensions,
                startMinimized: state.startMinimized,
            }),
        }
    )
);
