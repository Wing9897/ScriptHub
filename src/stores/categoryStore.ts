import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Category, NewCategory } from '@/types/category';
import {
    insertCategory,
    updateCategory as dbUpdateCategory,
    deleteCategory as dbDeleteCategory,
    type CategoryRow
} from '@/services/database';

interface CategoryState {
    categories: Category[];
    selectedCategoryId: string | null;
    searchQuery: string;

    // Methods
    setSearchQuery: (query: string) => void;
    addCategory: (category: NewCategory) => Promise<Category>;
    updateCategory: (id: string, updates: Partial<Omit<Category, 'id' | 'createdAt'>>) => Promise<void>;
    deleteCategory: (id: string) => Promise<void>;
    setSelectedCategory: (id: string | null) => void;
    reorderCategories: (orderedIds: string[]) => Promise<void>;
    setCategories: (categories: Category[]) => void;

    // 訂閱相關方法
    addSubscription: (name: string, sourceUrl: string, icon?: string) => Promise<Category>;
    updateSubscriptionSync: (id: string) => Promise<void>;
    getSubscriptions: () => Category[];
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
        last_synced_at: category.lastSyncedAt || null
    };
}

export const useCategoryStore = create<CategoryState>()((set, get) => ({
    categories: [],
    selectedCategoryId: null,
    searchQuery: '',

    setSearchQuery: (query) => set({ searchQuery: query }),

    setCategories: (categories) => set({ categories }),

    addCategory: async (newCategory) => {
        const categories = get().categories;
        const category: Category = {
            id: uuidv4(),
            ...newCategory,
            order: categories.length,
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

        await dbUpdateCategory(id, dbUpdates);

        // 2. 更新 Store
        set((state) => ({
            categories: state.categories.map((cat) =>
                cat.id === id ? { ...cat, ...updates } : cat
            ),
        }));
    },

    deleteCategory: async (id) => {
        // 1. 刪除 SQLite
        await dbDeleteCategory(id);

        // 2. 更新 Store
        set((state) => ({
            categories: state.categories.filter((cat) => cat.id !== id),
            selectedCategoryId:
                state.selectedCategoryId === id ? null : state.selectedCategoryId,
        }));
    },

    setSelectedCategory: (id) => set({ selectedCategoryId: id }),

    reorderCategories: async (orderedIds) => {
        const newCategories = orderedIds
            .map((id, index) => {
                const cat = get().categories.find((c) => c.id === id);
                return cat ? { ...cat, order: index } : null;
            })
            .filter((c): c is Category => c !== null);

        // 1. 批量更新 SQLite
        for (const cat of newCategories) {
            await dbUpdateCategory(cat.id, { order: cat.order });
        }

        // 2. 更新 Store
        set({ categories: newCategories });
    },

    // 訂閱相關方法
    addSubscription: async (name, sourceUrl, icon = 'terminal') => {
        const categories = get().categories;
        const now = new Date().toISOString();
        const category: Category = {
            id: uuidv4(),
            name,
            icon,
            order: categories.length,
            createdAt: now,
            isSubscription: true,
            sourceUrl,
            lastSyncedAt: now,
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
}));
