import { useState, useMemo } from 'react';
import { Logo } from '@/components/ui/Logo';
import {
    Star,
    Tag,
    Folder,
    Settings2,
    PanelLeftClose,
    PanelLeft,
    Settings,
    ChevronDown,
    ChevronRight,
    Clock,
    Link2,
    FolderOpen,
    Plus,
} from 'lucide-react';
import { useUIStore, useTagStore, useScriptStore, useCategoryStore } from '@/stores';
import { cn } from '@/utils/cn';
import { getCategoryIconSrc } from '@/utils/categoryIcons';
import { useTranslation } from 'react-i18next';

interface SidebarProps {
    mode: 'category' | 'script';
}

export function Sidebar({ mode }: SidebarProps) {
    const { t } = useTranslation();
    const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);
    const toggleSidebar = useUIStore((state) => state.toggleSidebar);
    const showOnlyFavorites = useUIStore((state) => state.showOnlyFavorites);
    const toggleShowOnlyFavorites = useUIStore((state) => state.toggleShowOnlyFavorites);
    const openTagManager = useUIStore((state) => state.openTagManager);
    const openVariableManager = useUIStore((state) => state.openVariableManager);
    const openSettings = useUIStore((state) => state.openSettings);
    const openSubscribeModal = useUIStore((state) => state.openSubscribeModal);
    const openCategoryManager = useUIStore((state) => state.openCategoryManager);

    const tags = useTagStore((state) => state.tags);
    const selectedTagIds = useTagStore((state) => state.selectedTagIds);
    const toggleTagSelection = useTagStore((state) => state.toggleTagSelection);
    const clearTagSelection = useTagStore((state) => state.clearTagSelection);

    const scripts = useScriptStore((state) => state.scripts);
    const selectedScriptId = useScriptStore((state) => state.selectedScriptId);
    const setSelectedScript = useScriptStore((state) => state.setSelectedScript);
    const recentScriptIds = useScriptStore((state) => state.recentScriptIds);

    const categories = useCategoryStore((state) => state.categories);
    const setSelectedCategory = useCategoryStore((state) => state.setSelectedCategory);

    const [recentExpanded, setRecentExpanded] = useState(false);

    // Compute recent scripts from IDs
    const recentScripts = useMemo(() => {
        return recentScriptIds
            .map((id) => scripts.find((s) => s.id === id))
            .filter((s) => s !== undefined);
    }, [recentScriptIds, scripts]);

    const favoriteCount = scripts.filter((s) => s.isFavorite).length;

    // Category mode: compute script counts per category
    const categoryCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        let uncategorizedCount = 0;
        scripts.forEach((script) => {
            if (script.categoryId) {
                counts[script.categoryId] = (counts[script.categoryId] || 0) + 1;
            } else {
                uncategorizedCount++;
            }
        });
        return { counts, uncategorizedCount };
    }, [scripts]);

    const sortedCategories = useMemo(() => {
        return [...categories].sort((a, b) => a.order - b.order);
    }, [categories]);

    if (sidebarCollapsed) {
        return (
            <div className="w-12 h-full bg-gray-50 dark:bg-dark-900 border-r border-gray-200 dark:border-dark-700 flex flex-col items-center py-3 gap-2">
                <button
                    onClick={toggleSidebar}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-800 rounded-lg"
                    title={t('sidebar.expand')}
                >
                    <PanelLeft className="w-5 h-5" />
                </button>
                <div className="flex-1" />
                <button
                    onClick={openSettings}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-800 rounded-lg"
                    title={t('sidebar.settings')}
                >
                    <Settings className="w-4 h-4" />
                </button>
            </div>
        );
    }

    return (
        <div className="w-64 h-full bg-gray-50 dark:bg-dark-900 border-r border-gray-200 dark:border-dark-700 flex flex-col">
            {/* Header */}
            <div className="px-3 py-3 border-b border-gray-200 dark:border-dark-700 flex items-center justify-between">
                <Logo />
                <button
                    onClick={toggleSidebar}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-800 rounded"
                    title={t('sidebar.collapse')}
                >
                    <PanelLeftClose className="w-4 h-4" />
                </button>
            </div>

            {/* Navigation - Dynamic Content */}
            <div className="flex-1 overflow-y-auto px-2 py-2">
                {mode === 'category' ? (
                    <CategoryModeContent
                        categories={sortedCategories}
                        categoryCounts={categoryCounts}
                        setSelectedCategory={setSelectedCategory}
                        openCategoryManager={openCategoryManager}
                        openSubscribeModal={openSubscribeModal}
                        t={t}
                    />
                ) : (
                    <ScriptModeContent
                        scripts={scripts}
                        favoriteCount={favoriteCount}
                        showOnlyFavorites={showOnlyFavorites}
                        toggleShowOnlyFavorites={toggleShowOnlyFavorites}
                        selectedTagIds={selectedTagIds}
                        clearTagSelection={clearTagSelection}
                        recentScripts={recentScripts}
                        recentExpanded={recentExpanded}
                        setRecentExpanded={setRecentExpanded}
                        selectedScriptId={selectedScriptId}
                        setSelectedScript={setSelectedScript}
                        tags={tags}
                        toggleTagSelection={toggleTagSelection}
                        openTagManager={openTagManager}
                        t={t}
                    />
                )}
            </div>

            {/* Footer Actions - Shared across modes */}
            <div className="px-2 py-2 border-t border-gray-200 dark:border-dark-700">
                <div className="flex flex-col gap-1">
                    <button
                        onClick={openVariableManager}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-800 rounded-lg transition-colors group"
                        title={t('sidebar.variables')}
                    >
                        <Settings2 className="w-4 h-4 text-gray-400 group-hover:text-primary-500" />
                        <span className="flex-1 text-left">{t('sidebar.variables')}</span>
                    </button>
                    <button
                        onClick={openSettings}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-800 rounded-lg transition-colors group"
                        title={t('sidebar.settings')}
                    >
                        <Settings className="w-4 h-4 text-gray-400 group-hover:text-primary-500" />
                        <span className="flex-1 text-left">{t('sidebar.settings')}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// Category Mode Content
// ============================================================================

interface CategoryModeContentProps {
    categories: import('@/types').Category[];
    categoryCounts: { counts: Record<string, number>; uncategorizedCount: number };
    setSelectedCategory: (id: string | null) => void;
    openCategoryManager: () => void;
    openSubscribeModal: () => void;
    t: (key: string, options?: Record<string, unknown>) => string;
}

function CategoryModeContent({
    categories,
    categoryCounts,
    setSelectedCategory,
    openCategoryManager,
    openSubscribeModal,
    t,
}: CategoryModeContentProps) {
    return (
        <>
            {/* Section Header */}
            <div className="flex items-center justify-between px-2 py-1 mb-2">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {t('sidebar.categories')}
                </span>
            </div>

            {/* Category List */}
            <div className="space-y-0.5 mb-4">
                {/* Uncategorized */}
                <button
                    onClick={() => setSelectedCategory('uncategorized')}
                    className={cn(
                        'w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm transition-colors',
                        'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-800'
                    )}
                >
                    <FolderOpen className="w-4 h-4 flex-shrink-0 text-gray-400" />
                    <span className="flex-1 truncate text-xs">{t('sidebar.uncategorized')}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                        {categoryCounts.uncategorizedCount}
                    </span>
                </button>

                {/* Categories */}
                {categories.map((category) => (
                    <button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id)}
                        className={cn(
                            'w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm transition-colors',
                            'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-800'
                        )}
                    >
                        <img
                            src={getCategoryIconSrc(category.icon, category.customIcon)}
                            alt={category.name}
                            className="w-4 h-4 flex-shrink-0 object-contain rounded"
                        />
                        <span className="flex-1 truncate text-xs flex items-center gap-1">
                            {category.name}
                            {category.isSubscription && (
                                <Link2 className="w-3 h-3 text-primary-500 flex-shrink-0" />
                            )}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                            {categoryCounts.counts[category.id] || 0}
                        </span>
                    </button>
                ))}

                {categories.length === 0 && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 px-2 py-1">
                        {t('sidebar.noCategories')}
                    </p>
                )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-0.5">
                <button
                    onClick={openCategoryManager}
                    className={cn(
                        'w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm transition-colors',
                        'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-800'
                    )}
                >
                    <Plus className="w-4 h-4 flex-shrink-0 text-gray-400" />
                    <span className="flex-1 truncate text-xs">{t('sidebar.addCategory')}</span>
                </button>
                <button
                    onClick={openSubscribeModal}
                    className={cn(
                        'w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm transition-colors',
                        'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-800'
                    )}
                >
                    <Link2 className="w-4 h-4 flex-shrink-0 text-gray-400" />
                    <span className="flex-1 truncate text-xs">{t('sidebar.subscribe')}</span>
                </button>
            </div>
        </>
    );
}

// ============================================================================
// Script Mode Content (existing sidebar content)
// ============================================================================

interface ScriptModeContentProps {
    scripts: import('@/types').Script[];
    favoriteCount: number;
    showOnlyFavorites: boolean;
    toggleShowOnlyFavorites: () => void;
    selectedTagIds: string[];
    clearTagSelection: () => void;
    recentScripts: import('@/types').Script[];
    recentExpanded: boolean;
    setRecentExpanded: (v: boolean) => void;
    selectedScriptId: string | null;
    setSelectedScript: (id: string | null) => void;
    tags: import('@/types').Tag[];
    toggleTagSelection: (id: string) => void;
    openTagManager: () => void;
    t: (key: string, options?: Record<string, unknown>) => string;
}

function ScriptModeContent({
    scripts,
    favoriteCount,
    showOnlyFavorites,
    toggleShowOnlyFavorites,
    selectedTagIds,
    clearTagSelection,
    recentScripts,
    recentExpanded,
    setRecentExpanded,
    selectedScriptId,
    setSelectedScript,
    tags,
    toggleTagSelection,
    openTagManager,
    t,
}: ScriptModeContentProps) {
    return (
        <>
            {/* Quick Filters */}
            <div className="space-y-0.5 mb-4">
                <SidebarItem
                    icon={Folder}
                    label={t('sidebar.allScripts')}
                    count={scripts.length}
                    active={!showOnlyFavorites && selectedTagIds.length === 0}
                    onClick={() => {
                        if (showOnlyFavorites) toggleShowOnlyFavorites();
                        clearTagSelection();
                    }}
                />
                <SidebarItem
                    icon={Star}
                    label={t('sidebar.favorites')}
                    count={favoriteCount}
                    active={showOnlyFavorites}
                    onClick={toggleShowOnlyFavorites}
                />
            </div>

            {/* Recent Scripts Section - Collapsible */}
            {recentScripts.length > 0 && (
                <div className="mb-4">
                    <button
                        onClick={() => setRecentExpanded(!recentExpanded)}
                        className="flex items-center gap-1 w-full px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-300"
                    >
                        {recentExpanded ? (
                            <ChevronDown className="w-3 h-3" />
                        ) : (
                            <ChevronRight className="w-3 h-3" />
                        )}
                        <Clock className="w-3 h-3" />
                        {t('sidebar.recent')}
                    </button>
                    {recentExpanded && (
                        <div className="space-y-0.5 mt-1">
                            {recentScripts.slice(0, 5).map((script) => (
                                <button
                                    key={script.id}
                                    onClick={() => setSelectedScript(script.id)}
                                    className={cn(
                                        "w-full flex items-center gap-2 px-2 py-1 rounded text-left text-xs transition-colors",
                                        selectedScriptId === script.id
                                            ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300"
                                            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-800"
                                    )}
                                >
                                    <span>
                                        {script.platform === 'windows' ? '💻' :
                                            script.platform === 'macos' ? '🍎' :
                                                script.platform === 'linux' ? '🐧' : '🌐'}
                                    </span>
                                    <span className="truncate flex-1">{script.title}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Tags Section */}
            <div className="mb-4">
                <div className="flex items-center justify-between px-2 py-1">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        {t('sidebar.tags')}
                    </span>
                    <button
                        onClick={openTagManager}
                        className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                        title={t('sidebar.manageTags')}
                    >
                        <Settings2 className="w-3 h-3" />
                    </button>
                </div>
                <div className="space-y-0.5">
                    {tags.map((tag) => {
                        const count = scripts.filter((s) => s.tags.includes(tag.id)).length;
                        return (
                            <SidebarItem
                                key={tag.id}
                                icon={Tag}
                                label={tag.name}
                                count={count}
                                color={tag.color}
                                active={selectedTagIds.includes(tag.id)}
                                onClick={() => toggleTagSelection(tag.id)}
                            />
                        );
                    })}
                    {tags.length === 0 && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 px-2 py-1">
                            {t('sidebar.noTags')}
                        </p>
                    )}
                </div>
            </div>
        </>
    );
}

// ============================================================================
// Shared SidebarItem Component
// ============================================================================

interface SidebarItemProps {
    icon: typeof Folder;
    label: string;
    count?: number;
    color?: string;
    active?: boolean;
    onClick?: () => void;
}

function SidebarItem({
    icon: Icon,
    label,
    count,
    color,
    active,
    onClick,
}: SidebarItemProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                'w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm transition-colors',
                active
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-800'
            )}
        >
            <Icon
                className="w-4 h-4 flex-shrink-0"
                style={color ? { color } : undefined}
            />
            <span className="flex-1 truncate text-xs">{label}</span>
            {count !== undefined && (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                    {count}
                </span>
            )}
        </button>
    );
}
