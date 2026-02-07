import { ArrowLeft, Search, LayoutGrid, List, Plus, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUIStore, useScriptStore, useCategoryStore } from '@/stores';
import { Button, ThemeToggle } from '@/components/ui';
import { cn } from '@/utils';

interface TopBarProps {
    mode: 'category' | 'script' | 'settings';
    title: string;
    onBack?: () => void;
}

export function TopBar({ mode, title, onBack }: TopBarProps) {
    const { t } = useTranslation();
    const viewMode = useUIStore((state) => state.viewMode);
    const setViewMode = useUIStore((state) => state.setViewMode);

    // Script Store
    const openScriptEditor = useUIStore((state) => state.openScriptEditor);
    const scriptSearchQuery = useScriptStore((state) => state.searchQuery);
    const setScriptSearchQuery = useScriptStore((state) => state.setSearchQuery);
    const platformFilter = useScriptStore((state) => state.platformFilter);
    const setPlatformFilter = useScriptStore((state) => state.setPlatformFilter);

    // Category Store
    const categorySearchQuery = useCategoryStore((state) => state.searchQuery);
    const setCategorySearchQuery = useCategoryStore((state) => state.setSearchQuery);
    const openCategoryManager = useUIStore((state) => state.openCategoryManager);

    // UI Store (Settings)
    const openSettings = useUIStore((state) => state.openSettings);

    // Dynamic Search Handler
    const searchQuery = mode === 'category' ? categorySearchQuery : scriptSearchQuery;
    const setSearchQuery = mode === 'category' ? setCategorySearchQuery : setScriptSearchQuery;
    const searchPlaceholder = mode === 'category' ? t('topbar.searchCategory') : t('topbar.searchScript');

    return (
        <header className="h-14 bg-white dark:bg-dark-800 border-b border-gray-200 dark:border-dark-700 flex items-center px-4 gap-3 shrink-0">
            {/* Left Section: Back Button & Title */}
            <div className="flex items-center gap-2 mr-2">
                {onBack && (
                    <button
                        onClick={onBack}
                        className="p-1.5 text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
                        title={t('topbar.back')}
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                )}
                <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-lg whitespace-nowrap">
                    {title}
                </h2>
                {mode === 'script' && <span className="text-gray-300 dark:text-gray-600">|</span>}
            </div>

            {/* Middle Section: Search (Hidden in Settings mode) */}
            {mode !== 'settings' ? (
                <div className="flex-1 max-w-md relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder={searchPlaceholder}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        data-search-input
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-dark-600 bg-gray-50 dark:bg-dark-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                    />
                </div>
            ) : (
                <div className="flex-1" />
            )}

            {/* Right Section: Actions */}
            <div className="flex items-center gap-2">

                {/* Platform Filter (Script Mode Only) */}
                {mode === 'script' && (
                    <select
                        value={platformFilter}
                        onChange={(e) => setPlatformFilter(e.target.value as typeof platformFilter)}
                        className="px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-600 bg-gray-50 dark:bg-dark-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        <option value="all">{t('topbar.allPlatforms')}</option>
                        <option value="windows">{t('script.platform.windows')}</option>
                        <option value="macos">{t('script.platform.macos')}</option>
                        <option value="linux">{t('script.platform.linux')}</option>
                        <option value="cross">{t('script.platform.cross')}</option>
                    </select>
                )}

                {/* View Toggle (Hidden in Settings mode) */}
                {mode !== 'settings' && (
                    <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-dark-700 rounded-lg">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={cn(
                                'p-2 rounded-md transition-all',
                                viewMode === 'grid'
                                    ? 'bg-white dark:bg-dark-600 shadow-sm text-primary-500'
                                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            )}
                            title={t('topbar.viewCard')}
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={cn(
                                'p-2 rounded-md transition-all',
                                viewMode === 'list'
                                    ? 'bg-white dark:bg-dark-600 shadow-sm text-primary-500'
                                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            )}
                            title={t('topbar.viewList')}
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* Settings Button (Hidden in Settings mode) */}
                {mode !== 'settings' && (
                    <button
                        onClick={openSettings}
                        className={cn(
                            'p-2 rounded-lg transition-colors text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
                            'hover:bg-gray-100 dark:hover:bg-dark-700'
                        )}
                        title={t('settings.title')}
                    >
                        <Settings className="w-5 h-5" />
                    </button>
                )}

                {/* Theme Toggle - Always Show */}
                <ThemeToggle />

                {/* Primary Action Button */}
                {mode === 'category' && (
                    <Button
                        onClick={() => openCategoryManager()}
                        className="flex items-center gap-2"
                        size="sm"
                    >
                        <Plus className="w-4 h-4" />
                        {t('category.manager.title')}
                    </Button>
                )}
                {mode === 'script' && (
                    <Button
                        onClick={() => openScriptEditor()}
                        className="flex items-center gap-2"
                        size="sm"
                    >
                        <Plus className="w-4 h-4" />
                        {t('script.editor.titleNew')}
                    </Button>
                )}
            </div>
        </header>
    );
}
