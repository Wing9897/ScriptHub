import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Tag, NewTag } from '@/types';
import { TAG_COLORS } from '@/types';
import {
    insertTag,
    updateTag as dbUpdateTag,
    deleteTag as dbDeleteTag,
    type TagRow
} from '@/services/database';

interface TagState {
    tags: Tag[];
    selectedTagIds: string[];
    setTags: (tags: Tag[]) => void;
    addTag: (tag: NewTag) => Promise<Tag>;
    updateTag: (id: string, updates: Partial<Omit<Tag, 'id' | 'createdAt'>>) => Promise<void>;
    deleteTag: (id: string) => Promise<void>;
    toggleTagSelection: (id: string) => void;
    clearTagSelection: () => void;
    getTagById: (id: string) => Tag | undefined;
    getNextColor: () => string;
}

// Helper: Tag -> TagRow
function tagToRow(tag: Tag): TagRow {
    return {
        id: tag.id,
        name: tag.name,
        color: tag.color,
        created_at: tag.createdAt
    };
}

export const useTagStore = create<TagState>()((set, get) => ({
    tags: [],
    selectedTagIds: [],

    setTags: (tags) => set({ tags }),

    addTag: async (newTag) => {
        const tag: Tag = {
            id: uuidv4(),
            ...newTag,
            createdAt: new Date().toISOString(),
        };

        // 1. 寫入 SQLite
        await insertTag(tagToRow(tag));

        // 2. 更新 Store
        set((state) => ({ tags: [...state.tags, tag] }));

        return tag;
    },

    updateTag: async (id, updates) => {
        // 1. 更新 SQLite
        // Tag 表比較簡單，直接更新 name 和 color
        const dbUpdates: { name?: string; color?: string } = {};
        if (updates.name) dbUpdates.name = updates.name;
        if (updates.color) dbUpdates.color = updates.color;

        await dbUpdateTag(id, dbUpdates);

        // 2. 更新 Store
        set((state) => ({
            tags: state.tags.map((tag) =>
                tag.id === id ? { ...tag, ...updates } : tag
            ),
        }));
    },

    deleteTag: async (id) => {
        // 1. 刪除 SQLite
        await dbDeleteTag(id);

        // 2. 更新 Store
        set((state) => ({
            tags: state.tags.filter((tag) => tag.id !== id),
            selectedTagIds: state.selectedTagIds.filter((tagId) => tagId !== id),
        }));
    },

    toggleTagSelection: (id) => {
        set((state) => ({
            selectedTagIds: state.selectedTagIds.includes(id)
                ? state.selectedTagIds.filter((tagId) => tagId !== id)
                : [...state.selectedTagIds, id],
        }));
    },

    clearTagSelection: () => set({ selectedTagIds: [] }),

    getTagById: (id) => get().tags.find((tag) => tag.id === id),

    getNextColor: () => {
        const { tags } = get();
        const usedColors = new Set(tags.map((t) => t.color));
        const availableColor = TAG_COLORS.find((c) => !usedColors.has(c));
        return availableColor || TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];
    },
}));
