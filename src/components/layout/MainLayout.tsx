import { lazy, Suspense } from 'react';
import { Sidebar } from './Sidebar';
import { useTranslation } from 'react-i18next';
import { TopBar } from './TopBar';
import { ScriptGrid } from '@/components/script/ScriptGrid';
import { ScriptDetail } from '@/components/script/ScriptDetail';
import { DropZone } from '@/components/import/DropZone';
import { CategoryGrid } from '@/components/category';
import { ToastContainer } from '@/components/ui';
import { useUIStore, useScriptStore, useCategoryStore } from '@/stores';
import { Loader2 } from 'lucide-react';

// 懶加載不常用的組件
const SettingsPage = lazy(() => import('@/components/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));
const ScriptEditor = lazy(() => import('@/components/script/ScriptEditor').then(m => ({ default: m.ScriptEditor })));
const TagManager = lazy(() => import('@/components/tag/TagManager').then(m => ({ default: m.TagManager })));
const CategoryManager = lazy(() => import('@/components/category/CategoryManager').then(m => ({ default: m.CategoryManager })));
const SubscribeModal = lazy(() => import('@/components/subscription/SubscribeModal').then(m => ({ default: m.SubscribeModal })));

// 加載中的 fallback
function LoadingFallback() {
    return (
        <div className="flex items-center justify-center h-full w-full">
            <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
        </div>
    );
}

export function MainLayout() {
    const { t } = useTranslation();
    const isScriptEditorOpen = useUIStore((state) => state.isScriptEditorOpen);
    const isTagManagerOpen = useUIStore((state) => state.isTagManagerOpen);
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
    const currentCategoryName = categories.find((c) => c.id === selectedCategoryId)?.name || '';

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
                                <Suspense fallback={<LoadingFallback />}>
                                    <SettingsPage />
                                </Suspense>
                            </div>
                        ) : (
                            <div className="flex-1 overflow-y-auto">
                                {isInCategoryView ? (
                                    <CategoryGrid />
                                ) : (
                                    <ScriptGrid />
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Modals */}
                {selectedScriptId && <ScriptDetail />}
                <Suspense fallback={null}>
                    {isScriptEditorOpen && <ScriptEditor />}
                    {isTagManagerOpen && <TagManager />}
                    {isCategoryManagerOpen && <CategoryManager />}
                    {isSubscribeModalOpen && <SubscribeModal isOpen={isSubscribeModalOpen} onClose={closeSubscribeModal} />}
                </Suspense>

                {/* Toast Notifications */}
                <ToastContainer />
            </div>
        </DropZone>
    );
}

