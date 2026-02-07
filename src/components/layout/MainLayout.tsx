import { Sidebar } from './Sidebar';
import { useTranslation } from 'react-i18next';
import { TopBar } from './TopBar';
import { SettingsPage } from '@/components/settings/SettingsPage';
import { ScriptGrid } from '@/components/script/ScriptGrid';
import { ScriptDetail } from '@/components/script/ScriptDetail';
import { ScriptEditor } from '@/components/script/ScriptEditor';
import { TagManager } from '@/components/tag/TagManager';
import { VariableManager } from '@/components/variable/VariableManager';
import { VariableInput } from '@/components/variable/VariableInput';
import { DropZone } from '@/components/import/DropZone';
import { CategoryGrid, CategoryManager } from '@/components/category';
import { SubscribeModal } from '@/components/subscription/SubscribeModal';
import { ToastContainer } from '@/components/ui';
import { useUIStore, useScriptStore, useCategoryStore } from '@/stores';

export function MainLayout() {
    const { t } = useTranslation();
    const isScriptEditorOpen = useUIStore((state) => state.isScriptEditorOpen);
    const isTagManagerOpen = useUIStore((state) => state.isTagManagerOpen);
    const isVariableManagerOpen = useUIStore((state) => state.isVariableManagerOpen);
    const isVariableInputOpen = useUIStore((state) => state.isVariableInputOpen);
    const isCategoryManagerOpen = useUIStore((state) => state.isCategoryManagerOpen);
    const isSettingsOpen = useUIStore((state) => state.isSettingsOpen);
    const closeSettings = useUIStore((state) => state.closeSettings);
    const isSubscribeModalOpen = useUIStore((state) => state.isSubscribeModalOpen);
    const closeSubscribeModal = useUIStore((state) => state.closeSubscribeModal);

    const selectedScriptId = useScriptStore((state) => state.selectedScriptId);

    const selectedCategoryId = useCategoryStore((state) => state.selectedCategoryId);
    const setSelectedCategory = useCategoryStore((state) => state.setSelectedCategory);
    const categories = useCategoryStore((state) => state.categories);

    // 獲取當前類別名稱
    const currentCategoryName = selectedCategoryId === 'uncategorized'
        ? t('category.uncategorized')
        : categories.find((c) => c.id === selectedCategoryId)?.name || '';

    // 是否在類別視圖（首頁）
    const isInCategoryView = selectedCategoryId === null;

    // Sidebar mode: category view or settings → category mode; script view → script mode
    const sidebarMode: 'category' | 'script' = isSettingsOpen ? 'category' : (isInCategoryView ? 'category' : 'script');

    const getTopBarConfig = () => {
        if (isSettingsOpen) {
            return {
                mode: 'settings' as const,
                title: t('settings.title'),
                onBack: closeSettings
            };
        }
        if (isInCategoryView) {
            return {
                mode: 'category' as const,
                title: t('topbar.selectCategory'),
                onBack: undefined
            };
        }
        return {
            mode: 'script' as const,
            title: currentCategoryName,
            onBack: () => setSelectedCategory(null)
        };
    };

    const topBarConfig = getTopBarConfig();

    return (
        <DropZone>
            <div className="h-full flex bg-white dark:bg-dark-900">
                {/* Sidebar */}
                <Sidebar mode={sidebarMode} />

                {/* Main Content */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Unified TopBar */}
                    <TopBar
                        mode={topBarConfig.mode}
                        title={topBarConfig.title}
                        onBack={topBarConfig.onBack}
                    />

                    <div className="flex-1 flex overflow-hidden">
                        {/* 內容區域：Settings, Category View, or Script List */}
                        {isSettingsOpen ? (
                            <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-dark-900">
                                <SettingsPage />
                            </div>
                        ) : (
                            <div className="flex-1 overflow-y-auto">
                                {isInCategoryView ? (
                                    <CategoryGrid />
                                ) : (
                                    <div className="p-6">
                                        <ScriptGrid />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Modals */}
                {selectedScriptId && <ScriptDetail />}
                {isScriptEditorOpen && <ScriptEditor />}
                {isTagManagerOpen && <TagManager />}
                {isVariableManagerOpen && <VariableManager />}
                {isVariableInputOpen && <VariableInput />}
                {isCategoryManagerOpen && <CategoryManager />}
                {/* SettingsModal removed, replaced by SettingsPage */}
                <SubscribeModal isOpen={isSubscribeModalOpen} onClose={closeSubscribeModal} />

                {/* Toast Notifications */}
                <ToastContainer />
            </div>
        </DropZone>
    );
}

