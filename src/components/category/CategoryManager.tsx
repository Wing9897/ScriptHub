import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Edit2, Upload, Link2, ChevronDown, ChevronUp, FolderOutput, X, ChevronRight } from 'lucide-react';
import { useCategoryStore, useScriptStore, useUIStore } from '@/stores';
import { DEFAULT_ICONS } from '@/types/category';
import { Button, Modal, ConfirmDialog } from '@/components/ui';
import { cn, getCategoryIconSrc, categoryIconMap } from '@/utils';
import type { Category } from '@/types';
import { getAllCustomIcons, insertCustomIcon, deleteCustomIcon as dbDeleteCustomIcon } from '@/services/database';
import { v4 as uuidv4 } from 'uuid';

export function CategoryManager() {
    const { t } = useTranslation();
    const isCategoryManagerOpen = useUIStore((state) => state.isCategoryManagerOpen);
    const editingCategoryId = useUIStore((state) => state.editingCategoryId);
    const defaultParentId = useUIStore((state) => state.defaultParentId);
    const closeCategoryManager = useUIStore((state) => state.closeCategoryManager);
    const addToast = useUIStore((state) => state.addToast);

    const categories = useCategoryStore((state) => state.categories);
    const addCategory = useCategoryStore((state) => state.addCategory);
    const updateCategory = useCategoryStore((state) => state.updateCategory);
    const deleteCategory = useCategoryStore((state) => state.deleteCategory);
    const getDescendantIds = useCategoryStore((state) => state.getDescendantIds);

    const scripts = useScriptStore((state) => state.scripts);

    // 按層級結構排序類別列表
    const sortedCategories = useMemo(() => {
        const result: Category[] = [];
        const buildList = (parentId: string | null) => {
            const children = categories
                .filter(c => (c.parentId || null) === parentId)
                .sort((a, b) => a.order - b.order);
            for (const cat of children) {
                result.push(cat);
                buildList(cat.id);
            }
        };
        buildList(null);
        return result;
    }, [categories]);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [selectedIcon, setSelectedIcon] = useState('app_logo');
    const [customIcon, setCustomIcon] = useState<string | undefined>();
    const [description, setDescription] = useState('');
    const [parentId, setParentId] = useState<string | null>(null);
    const [showCategoryList, setShowCategoryList] = useState(true);

    // 自訂圖標庫
    const [customIcons, setCustomIcons] = useState<{ id: string; name: string; data: string }[]>([]);

    // 載入自訂圖標庫
    const loadCustomIcons = useCallback(async () => {
        try {
            const icons = await getAllCustomIcons();
            setCustomIcons(icons);
        } catch (e) {
            console.error('Failed to load custom icons:', e);
        }
    }, []);

    const resetForm = useCallback(() => {
        setEditingId(null);
        setName('');
        setSelectedIcon('app_logo');
        setCustomIcon(undefined);
        setDescription('');
        setParentId(null);
    }, []);

    const handleEdit = useCallback((category: Category) => {
        setEditingId(category.id);
        setName(category.name);
        setSelectedIcon(category.icon);
        setCustomIcon(category.customIcon);
        setDescription(category.description || '');
        setParentId(category.parentId || null);
    }, []);

    useEffect(() => {
        if (isCategoryManagerOpen) {
            loadCustomIcons();
        }
    }, [isCategoryManagerOpen, loadCustomIcons]);

    // 刪除確認對話框狀態
    const [deleteConfirm, setDeleteConfirm] = useState<{
        isOpen: boolean;
        category: Category | null;
        scriptCount: number;
    }>({ isOpen: false, category: null, scriptCount: 0 });

    // 從外部打開時自動選中編輯的類別
    useEffect(() => {
        if (isCategoryManagerOpen && editingCategoryId) {
            const cat = categories.find(c => c.id === editingCategoryId);
            if (cat) {
                handleEdit(cat);
            }
        } else if (isCategoryManagerOpen && defaultParentId !== null) {
            // 新建子類別模式：設定預設父類別
            setParentId(defaultParentId);
        }
        if (!isCategoryManagerOpen) {
            resetForm();
        }
    }, [isCategoryManagerOpen, editingCategoryId, defaultParentId, categories, handleEdit, resetForm]);

    const handleSave = async () => {
        if (!name.trim()) {
            addToast({ type: 'error', message: t('category.manager.inputName') });
            return;
        }

        try {
            if (editingId) {
                await updateCategory(editingId, {
                    name: name.trim(),
                    icon: selectedIcon,
                    customIcon,
                    description: description.trim() || undefined,
                    parentId,
                });
                addToast({ type: 'success', message: t('category.manager.updateSuccess') });
            } else {
                await addCategory({
                    name: name.trim(),
                    icon: selectedIcon,
                    customIcon,
                    description: description.trim() || undefined,
                }, parentId);
                addToast({ type: 'success', message: t('category.manager.createSuccess') });
            }
            resetForm();
        } catch (e) {
            console.error(e);
            addToast({ type: 'error', message: t('common.error') });
        }
    };

    const handleDeleteClick = (category: Category) => {
        // 計算包含子類別的腳本總數
        const descendantIds = getDescendantIds(category.id);
        const allCategoryIds = new Set([category.id, ...descendantIds]);
        const scriptCount = scripts.filter(s => s.categoryId && allCategoryIds.has(s.categoryId)).length;
        setDeleteConfirm({
            isOpen: true,
            category,
            scriptCount
        });
    };

    const handleDeleteConfirm = async () => {
        if (!deleteConfirm.category) return;

        const categoryId = deleteConfirm.category.id;

        try {
            // 刪除類別（會自動刪除子類別和相關腳本）
            await deleteCategory(categoryId);
            addToast({ type: 'success', message: t('category.manager.deleteSuccess') });

            if (editingId === categoryId) {
                resetForm();
            }

            setDeleteConfirm({ isOpen: false, category: null, scriptCount: 0 });
        } catch (e) {
            console.error('Failed to delete category:', e);
            addToast({ type: 'error', message: t('common.error') });
        }
    };

    const handleExportClick = async (category: Category) => {
        const categoryScripts = scripts.filter(s => s.categoryId === category.id);

        if (categoryScripts.length === 0) {
            addToast({ type: 'error', message: t('category.manager.exportNoScripts') });
            return;
        }

        try {
            const { exportUnified } = await import('@/services/exportFolder');
            // 使用統一 V2 導出格式，僅包含此類別
            const success = await exportUnified([category], categoryScripts, []);

            if (success) {
                addToast({
                    type: 'success',
                    message: t('category.manager.exportSuccess', { count: categoryScripts.length })
                });
            }
        } catch (error) {
            addToast({
                type: 'error',
                message: error instanceof Error ? error.message : t('category.manager.exportFail')
            });
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            addToast({ type: 'error', message: t('category.manager.imageTypeErr') });
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            addToast({ type: 'error', message: t('category.manager.imageSizeErr') });
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                // 自動裁剪縮放到 128x128 正方形
                const SIZE = 128;
                const canvas = document.createElement('canvas');
                canvas.width = SIZE;
                canvas.height = SIZE;
                const ctx = canvas.getContext('2d')!;

                // 居中裁切：取最短邊為基準
                const minSide = Math.min(img.width, img.height);
                const sx = (img.width - minSide) / 2;
                const sy = (img.height - minSide) / 2;

                ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, SIZE, SIZE);
                const dataUrl = canvas.toDataURL('image/png');
                setCustomIcon(dataUrl);

                // 儲存到圖標庫
                const iconId = uuidv4();
                const iconName = file.name.replace(/\.[^.]+$/, '');
                insertCustomIcon({
                    id: iconId,
                    name: iconName,
                    data: dataUrl,
                    created_at: new Date().toISOString(),
                }).then(() => loadCustomIcons()).catch(console.error);
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    if (!isCategoryManagerOpen) return null;

    return (
        <>
            <Modal isOpen={isCategoryManagerOpen} onClose={closeCategoryManager} title={t('category.manager.title')} size="md">
                <div className="space-y-6">
                    {/* 新增/編輯表單 */}
                    <div className="space-y-4 pb-4 border-b border-gray-200 dark:border-dark-700">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {editingId ? t('category.manager.editTitle') : t('category.manager.createTitle')}
                        </h3>

                        <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                {t('category.manager.nameLabel')}
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={t('category.manager.namePlaceholder')}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                {t('category.manager.descLabel')}
                            </label>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder={t('category.manager.descPlaceholder')}
                                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                        </div>

                        {/* 訂閱類別顯示 GitHub URL */}
                        {editingId && (() => {
                            const editingCat = categories.find(c => c.id === editingId);
                            return editingCat?.isSubscription && editingCat?.sourceUrl ? (
                                <div>
                                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                        {t('category.manager.sourceUrl')}
                                    </label>
                                    <div className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-dark-600 bg-gray-50 dark:bg-dark-700 text-gray-600 dark:text-gray-300">
                                        <Link2 className="w-4 h-4 text-primary-500 flex-shrink-0" />
                                        <a
                                            href={editingCat.sourceUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="truncate hover:text-primary-500 transition-colors"
                                            title={editingCat.sourceUrl}
                                        >
                                            {editingCat.sourceUrl}
                                        </a>
                                    </div>
                                </div>
                            ) : null;
                        })()}

                        <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2">
                                {t('category.manager.iconLabel')}
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {DEFAULT_ICONS.map((icon) => (
                                    <button
                                        key={icon.id}
                                        onClick={() => {
                                            setSelectedIcon(icon.id);
                                            setCustomIcon(undefined);
                                        }}
                                        className={cn(
                                            "p-2 rounded-lg border-2 transition-all",
                                            selectedIcon === icon.id && !customIcon
                                                ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 scale-105"
                                                : "border-transparent hover:border-gray-300 dark:hover:border-dark-500"
                                        )}
                                        title={icon.name}
                                    >
                                        <img
                                            src={categoryIconMap[icon.id]}
                                            alt={icon.name}
                                            className="w-7 h-7 object-contain"
                                        />
                                    </button>
                                ))}
                                <label className={cn(
                                    "flex items-center gap-1 px-3 py-2 rounded-lg border-2 border-dashed cursor-pointer transition-all",
                                    customIcon
                                        ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                                        : "border-gray-300 dark:border-dark-600 hover:border-primary-400"
                                )}>
                                    <Upload className="w-4 h-4 text-gray-400" />
                                    <span className="text-xs text-gray-500">{t('category.manager.upload')}</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        className="hidden"
                                    />
                                    {customIcon && (
                                        <img src={customIcon} alt="Custom" className="w-5 h-5 object-contain ml-1" />
                                    )}
                                </label>
                            </div>

                            {/* 自訂圖標庫 */}
                            {customIcons.length > 0 && (
                                <div className="mt-2">
                                    <label className="block text-xs text-gray-400 dark:text-gray-500 mb-1">
                                        {t('category.manager.iconLibrary')}
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {customIcons.map((icon) => (
                                            <div key={icon.id} className="relative group/icon">
                                                <button
                                                    onClick={() => {
                                                        setCustomIcon(icon.data);
                                                        setSelectedIcon('custom');
                                                    }}
                                                    className={cn(
                                                        "p-2 rounded-lg border-2 transition-all",
                                                        customIcon === icon.data
                                                            ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 scale-105"
                                                            : "border-transparent hover:border-gray-300 dark:hover:border-dark-500"
                                                    )}
                                                    title={icon.name}
                                                >
                                                    <img src={icon.data} alt={icon.name} className="w-7 h-7 object-contain" />
                                                </button>
                                                <button
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        try {
                                                            await dbDeleteCustomIcon(icon.id);
                                                            await loadCustomIcons();
                                                            addToast({ type: 'success', message: t('category.manager.iconDeleted') });
                                                        } catch (err) {
                                                            console.error(err);
                                                        }
                                                    }}
                                                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/icon:opacity-100 transition-opacity"
                                                    title={t('common.delete')}
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2">
                            <Button onClick={handleSave} size="sm" className="flex-1">
                                <Plus className="w-4 h-4" />
                                {editingId ? t('common.update') : t('common.create')}
                            </Button>
                            {editingId && (
                                <Button variant="ghost" size="sm" onClick={resetForm}>
                                    {t('common.cancel')}
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* 類別列表 */}
                    <div>
                        <button
                            onClick={() => setShowCategoryList(!showCategoryList)}
                            className="flex items-center justify-between w-full text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2"
                        >
                            <span>{t('category.manager.existingTitle')} ({categories.length})</span>
                            {showCategoryList ? (
                                <ChevronUp className="w-4 h-4 text-gray-400" />
                            ) : (
                                <ChevronDown className="w-4 h-4 text-gray-400" />
                            )}
                        </button>

                        {showCategoryList && (
                            <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                {sortedCategories.length === 0 ? (
                                    <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">
                                        {t('category.manager.noCategories')}
                                    </p>
                                ) : (
                                    sortedCategories.map((cat) => {
                                            // 計算層級深度
                                            let depth = 0;
                                            let currentParentId = cat.parentId;
                                            while (currentParentId) {
                                                depth++;
                                                const parent = categories.find(c => c.id === currentParentId);
                                                currentParentId = parent?.parentId;
                                            }

                                            return (
                                                <div
                                                    key={cat.id}
                                                    className={cn(
                                                        "flex items-center gap-2 p-2 rounded-lg transition-colors",
                                                        editingId === cat.id
                                                            ? "bg-primary-50 dark:bg-primary-900/20"
                                                            : "hover:bg-gray-50 dark:hover:bg-dark-700"
                                                    )}
                                                    style={{ paddingLeft: `${8 + depth * 16}px` }}
                                                >
                                                    {depth > 0 && (
                                                        <ChevronRight className="w-3 h-3 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                                                    )}
                                                    <img
                                                        src={getCategoryIconSrc(cat.icon, cat.customIcon)}
                                                        alt={cat.name}
                                                        className="w-8 h-8 object-contain rounded"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate flex items-center gap-1">
                                                            {cat.name}
                                                            {cat.isSubscription && (
                                                                <Link2 className="w-3 h-3 text-primary-500" />
                                                            )}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-0.5">
                                                        <button
                                                            onClick={() => handleExportClick(cat)}
                                                            className="p-1.5 text-gray-400 hover:text-green-500 rounded"
                                                            title={t('category.manager.exportFolder')}
                                                        >
                                                            <FolderOutput className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleEdit(cat)}
                                                            className="p-1.5 text-gray-400 hover:text-primary-500 rounded"
                                                            title={t('common.edit')}
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteClick(cat)}
                                                            className="p-1.5 text-gray-400 hover:text-red-500 rounded"
                                                            title={t('common.delete')}
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </Modal>

            {/* 刪除確認對話框 */}
            <ConfirmDialog
                isOpen={deleteConfirm.isOpen}
                onClose={() => setDeleteConfirm({ isOpen: false, category: null, scriptCount: 0 })}
                onConfirm={handleDeleteConfirm}
                title={deleteConfirm.category?.isSubscription ? t('category.manager.unsubscribe') : t('script.deleteTitle')}
                message={
                    deleteConfirm.category?.isSubscription
                        ? t('category.manager.deleteSubscriptionConfirm', { name: deleteConfirm.category?.name, count: deleteConfirm.scriptCount })
                        : t('category.manager.deleteConfirm', { name: deleteConfirm.category?.name, count: deleteConfirm.scriptCount })
                }
                confirmText={deleteConfirm.category?.isSubscription ? t('category.manager.unsubscribe') : t('common.delete')}
                variant="danger"
            />
        </>
    );
}
