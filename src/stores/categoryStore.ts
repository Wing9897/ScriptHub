import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Category, NewCategory, CategoryTreeNode } from '@/types/category';
import {
    insertCategory,
    updateCategory as dbUpdateCategory,
    deleteCategoriesBatch as dbDeleteCategoriesBatch,
    updateCategoriesOrderBatch,
    deleteScriptsBatch as dbDeleteScriptsBatch,
    type CategoryRow
} from '@/services/database';
import { useScriptStore } from './scriptStore';

interface CategoryState {
    categories: Category[];
    selectedCategoryId: string | null;
    searchQuery: string;
    expandedCategoryIds: Set<string>;

    // Methods
    setSearchQuery: (query: string) => void;
    addCategory: (category: NewCategory, parentId?: string | null) => Promise<Category>;
    updateCategory: (id: string, updates: Partial<Omit<Category, 'id' | 'createdAt'>>) => Promise<void>;
    deleteCategory: (id: string) => Promise<void>;
    setSelectedCategory: (id: string | null) => void;
    reorderCategories: (orderedIds: string[]) => Promise<void>;
    setCategories: (categories: Category[]) => void;

    // 訂閱相關方法
    addSubscription: (name: string, sourceUrl: string, icon?: string, parentId?: string | null) => Promise<Category>;
    updateSubscriptionSync: (id: string) => Promise<void>;
    getSubscriptions: () => Category[];

    // 樹狀結構方法
    getCategoryTree: () => CategoryTreeNode[];
    getChildCategories: (parentId: string | null) => Category[];
    getDescendantIds: (id: string) => string[];
    getCategoryPath: (id: string) => Category[];
    toggleCategoryExpand: (id: string) => void;
    setExpandedCategoryIds: (ids: Set<string>) => void;
}

// Helper: Category -> CategoryRow
function categoryToRow(category: Category): CategoryRow {
    return {
        id: category.id,
        name: category.name,
        icon: category.icon,
        custom_icon: category.customIcon || null,
        description: category.description || null,
        order: category.order,
        created_at: category.createdAt,
        is_subscription: category.isSubscription ? 1 : 0,
        source_url: category.sourceUrl || null,
        last_synced_at: category.lastSyncedAt || null,
        parent_id: category.parentId || null
    };
}

// Helper: 建構樹狀結構
function buildCategoryTree(categories: Category[], parentId: string | null = null, level: number = 0): CategoryTreeNode[] {
    return categories
        .filter(cat => (cat.parentId || null) === parentId)
        .sort((a, b) => a.order - b.order)
        .map(cat => ({
            ...cat,
            level,
            children: buildCategoryTree(categories, cat.id, level + 1)
        }));
}

// Helper: 獲取所有子孫 ID
function getAllDescendantIds(categories: Category[], parentId: string): string[] {
    const children = categories.filter(cat => cat.parentId === parentId);
    const descendantIds: string[] = [];
    for (const child of children) {
        descendantIds.push(child.id);
        descendantIds.push(...getAllDescendantIds(categories, child.id));
    }
    return descendantIds;
}

export const useCategoryStore = create<CategoryState>()((set, get) => ({
    categories: [],
    selectedCategoryId: null,
    searchQuery: '',
    expandedCategoryIds: new Set<string>(),

    setSearchQuery: (query) => set({ searchQuery: query }),

    setCategories: (categories) => set({ categories }),

    addCategory: async (newCategory, parentId = null) => {
        const categories = get().categories;
        // 計算同層級的 order
        const siblings = categories.filter(c => (c.parentId || null) === parentId);
        const category: Category = {
            id: uuidv4(),
            ...newCategory,
            parentId,
            order: siblings.length,
            createdAt: new Date().toISOString(),
        };

        // 1. 寫入 SQLite
        await insertCategory(categoryToRow(category));

        // 2. 更新 Store
        set((state) => ({ categories: [...state.categories, category] }));

        return category;
    },

    updateCategory: async (id, updates) => {
        // 1. 更新 SQLite
        const dbUpdates: Partial<CategoryRow> = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.icon !== undefined) dbUpdates.icon = updates.icon;
        if (updates.customIcon !== undefined) dbUpdates.custom_icon = updates.customIcon || null;
        if (updates.description !== undefined) dbUpdates.description = updates.description || null;
        if (updates.order !== undefined) dbUpdates.order = updates.order;
        if (updates.isSubscription !== undefined) dbUpdates.is_subscription = updates.isSubscription ? 1 : 0;
        if (updates.sourceUrl !== undefined) dbUpdates.source_url = updates.sourceUrl || null;
        if (updates.lastSyncedAt !== undefined) dbUpdates.last_synced_at = updates.lastSyncedAt || null;
        if (updates.parentId !== undefined) dbUpdates.parent_id = updates.parentId || null;

        try {
            await dbUpdateCategory(id, dbUpdates);

            // 2. 更新 Store（只有數據庫成功才更新）
            set((state) => ({
                categories: state.categories.map((cat) =>
                    cat.id === id ? { ...cat, ...updates } : cat
                ),
            }));
        } catch (error) {
            console.error('Failed to update category:', error);
            throw error;
        }
    },

    deleteCategory: async (id) => {
        // 獲取所有子孫 ID，一併刪除
        const descendantIds = get().getDescendantIds(id);
        const idsToDelete = [id, ...descendantIds];
        const categoryIdSet = new Set(idsToDelete);

        try {
            // 1. 刪除相關腳本（同步到數據庫和 scriptStore）
            const scriptStore = useScriptStore.getState();
            const scriptIdsToDelete = scriptStore.scripts
                .filter(s => s.categoryId && categoryIdSet.has(s.categoryId))
                .map(s => s.id);
            if (scriptIdsToDelete.length > 0) {
                await dbDeleteScriptsBatch(scriptIdsToDelete);
                // 更新 scriptStore
                const idSet = new Set(scriptIdsToDelete);
                useScriptStore.setState((state) => ({
                    scripts: state.scripts.filter((s) => !idSet.has(s.id)),
                    selectedScriptId: state.selectedScriptId && idSet.has(state.selectedScriptId) ? null : state.selectedScriptId,
                    recentScriptIds: state.recentScriptIds.filter((rid) => !idSet.has(rid)),
                }));
            }

            // 2. 批量刪除類別（單次數據庫調用）
            await dbDeleteCategoriesBatch(idsToDelete);

            // 3. 更新 categoryStore
            set((state) => ({
                categories: state.categories.filter((cat) => !idsToDelete.includes(cat.id)),
                selectedCategoryId:
                    idsToDelete.includes(state.selectedCategoryId || '') ? null : state.selectedCategoryId,
                expandedCategoryIds: new Set([...state.expandedCategoryIds].filter(id => !idsToDelete.includes(id))),
            }));
        } catch (error) {
            console.error('Failed to delete category:', error);
            throw error;
        }
    },

    setSelectedCategory: (id) => set({ selectedCategoryId: id }),

    reorderCategories: async (orderedIds) => {
        const categories = get().categories;

        // 只更新 orderedIds 中的類別順序，保留其他類別不變
        const updatedCategories = categories.map(cat => {
            const newOrder = orderedIds.indexOf(cat.id);
            if (newOrder !== -1) {
                return { ...cat, order: newOrder };
            }
            return cat;
        });

        // 1. 批量更新 SQLite（使用事務，單次提交）
        const updates = orderedIds.map((id, index) => ({ id, order: index }));
        await updateCategoriesOrderBatch(updates);

        // 2. 更新 Store
        set({ categories: updatedCategories });
    },

    // 訂閱相關方法
    addSubscription: async (name, sourceUrl, icon = 'github', parentId = null) => {
        const categories = get().categories;
        const now = new Date().toISOString();
        // 計算同層級的 order
        const siblings = categories.filter(c => (c.parentId || null) === parentId);
        const category: Category = {
            id: uuidv4(),
            name,
            icon,
            order: siblings.length,
            createdAt: now,
            isSubscription: true,
            sourceUrl,
            lastSyncedAt: now,
            parentId,
        };

        // 1. 寫入 SQLite
        await insertCategory(categoryToRow(category));

        // 2. 更新 Store
        set((state) => ({ categories: [...state.categories, category] }));

        return category;
    },

    updateSubscriptionSync: async (id) => {
        const now = new Date().toISOString();

        // 1. 更新 SQLite
        await dbUpdateCategory(id, { last_synced_at: now });

        // 2. 更新 Store
        set((state) => ({
            categories: state.categories.map((cat) =>
                cat.id === id ? { ...cat, lastSyncedAt: now } : cat
            ),
        }));
    },

    getSubscriptions: () => {
        return get().categories.filter((cat) => cat.isSubscription);
    },

    // 樹狀結構方法
    getCategoryTree: () => {
        return buildCategoryTree(get().categories);
    },

    getChildCategories: (parentId) => {
        return get().categories.filter(cat => (cat.parentId || null) === parentId);
    },

    getDescendantIds: (id) => {
        return getAllDescendantIds(get().categories, id);
    },

    getCategoryPath: (id) => {
        const categories = get().categories;
        const path: Category[] = [];
        let current = categories.find(c => c.id === id);

        while (current) {
            path.unshift(current);
            if (current.parentId) {
                current = categories.find(c => c.id === current!.parentId);
            } else {
                break;
            }
        }

        return path;
    },

    toggleCategoryExpand: (id) => {
        set((state) => {
            const newSet = new Set(state.expandedCategoryIds);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return { expandedCategoryIds: newSet };
        });
    },

    setExpandedCategoryIds: (ids) => {
        set({ expandedCategoryIds: ids });
    },
}));
