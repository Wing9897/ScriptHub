import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Script, NewScript } from '@/types';
import {
    insertScript,
    updateScript as dbUpdateScript,
    deleteScript as dbDeleteScript,
    type ScriptRow
} from '@/services/database';

const MAX_RECENT_SCRIPTS = 5;

interface ScriptState {
    scripts: Script[];
    selectedScriptId: string | null;
    searchQuery: string;
    platformFilter: 'all' | Script['platform'];
    recentScriptIds: string[];
    setScripts: (scripts: Script[]) => void;
    addScript: (script: NewScript) => Promise<Script>;
    updateScript: (id: string, updates: Partial<Omit<Script, 'id' | 'createdAt'>>) => Promise<void>;
    deleteScript: (id: string) => Promise<void>;
    toggleFavorite: (id: string) => Promise<void>;
    setSelectedScript: (id: string | null) => void;
    setSearchQuery: (query: string) => void;
    setPlatformFilter: (filter: 'all' | Script['platform']) => void;
    getFilteredScripts: () => Script[];
    recordUsage: (id: string) => void;
    getRecentScripts: () => Script[];
    reorderScripts: (categoryId: string | null, orderedIds: string[]) => Promise<void>;
}

// Helper: Script -> ScriptRow
function scriptToRow(script: Script): ScriptRow {
    return {
        id: script.id,
        title: script.title,
        description: script.description,
        platform: script.platform,
        commands: JSON.stringify(script.commands),
        variables: JSON.stringify(script.variables),
        tags: JSON.stringify(script.tags),
        category_id: script.categoryId || null,
        order: script.order || 0,
        created_at: script.createdAt,
        updated_at: script.updatedAt,
        is_favorite: script.isFavorite ? 1 : 0
    };
}

export const useScriptStore = create<ScriptState>()((set, get) => ({
    scripts: [],
    selectedScriptId: null,
    searchQuery: '',
    platformFilter: 'all',
    recentScriptIds: [],

    setScripts: (scripts) => set({ scripts }),

    addScript: async (newScript) => {
        const now = new Date().toISOString();
        const script: Script = {
            id: uuidv4(),
            ...newScript,
            commands: newScript.commands.map((cmd, index) => ({
                ...cmd,
                id: uuidv4(),
                order: index,
            })),
            createdAt: now,
            updatedAt: now,
            isFavorite: false,
        };

        // 1. 寫入 SQLite
        await insertScript(scriptToRow(script));

        // 2. 更新 Store
        set((state) => ({ scripts: [...state.scripts, script] }));

        return script;
    },

    updateScript: async (id, updates) => {
        const now = new Date().toISOString();

        // 1. 更新 SQLite
        const dbUpdates: Partial<ScriptRow> = {};
        if (updates.title !== undefined) dbUpdates.title = updates.title;
        if (updates.description !== undefined) dbUpdates.description = updates.description;
        if (updates.platform !== undefined) dbUpdates.platform = updates.platform;
        if (updates.commands !== undefined) dbUpdates.commands = JSON.stringify(updates.commands);
        if (updates.variables !== undefined) dbUpdates.variables = JSON.stringify(updates.variables);
        if (updates.tags !== undefined) dbUpdates.tags = JSON.stringify(updates.tags);
        if (updates.categoryId !== undefined) dbUpdates.category_id = updates.categoryId || null;
        if (updates.order !== undefined) dbUpdates.order = updates.order;
        if (updates.isFavorite !== undefined) dbUpdates.is_favorite = updates.isFavorite ? 1 : 0;
        dbUpdates.updated_at = now;

        await dbUpdateScript(id, dbUpdates);

        // 2. 更新 Store
        set((state) => ({
            scripts: state.scripts.map((script) =>
                script.id === id
                    ? { ...script, ...updates, updatedAt: now }
                    : script
            ),
        }));
    },

    deleteScript: async (id) => {
        // 1. 刪除 SQLite
        await dbDeleteScript(id);

        // 2. 更新 Store
        set((state) => ({
            scripts: state.scripts.filter((script) => script.id !== id),
            selectedScriptId:
                state.selectedScriptId === id ? null : state.selectedScriptId,
            recentScriptIds: state.recentScriptIds.filter((rid) => rid !== id),
        }));
    },

    toggleFavorite: async (id) => {
        const script = get().scripts.find((s) => s.id === id);
        if (!script) return;

        const newFavorite = !script.isFavorite;

        // 1. 更新 SQLite
        await dbUpdateScript(id, { is_favorite: newFavorite ? 1 : 0 });

        // 2. 更新 Store
        set((state) => ({
            scripts: state.scripts.map((s) =>
                s.id === id ? { ...s, isFavorite: newFavorite } : s
            ),
        }));
    },

    setSelectedScript: (id) => set({ selectedScriptId: id }),

    setSearchQuery: (query) => set({ searchQuery: query }),

    setPlatformFilter: (filter) => set({ platformFilter: filter }),

    getFilteredScripts: () => {
        const { scripts, searchQuery, platformFilter } = get();
        return scripts.filter((script) => {
            if (platformFilter !== 'all' && script.platform !== platformFilter) {
                return false;
            }

            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchesTitle = script.title.toLowerCase().includes(query);
                const matchesDescription = script.description
                    .toLowerCase()
                    .includes(query);
                const matchesCommands = script.commands.some(
                    (cmd) =>
                        cmd.content.toLowerCase().includes(query) ||
                        cmd.description?.toLowerCase().includes(query)
                );
                if (!matchesTitle && !matchesDescription && !matchesCommands) {
                    return false;
                }
            }

            return true;
        });
    },

    recordUsage: (id) => {
        set((state) => {
            const filtered = state.recentScriptIds.filter((rid) => rid !== id);
            const updated = [id, ...filtered].slice(0, MAX_RECENT_SCRIPTS);
            return { recentScriptIds: updated };
        });
    },

    getRecentScripts: () => {
        const { scripts, recentScriptIds } = get();
        return recentScriptIds
            .map((id) => scripts.find((s) => s.id === id))
            .filter((s): s is Script => s !== undefined);
    },

    reorderScripts: async (categoryId, orderedIds) => {
        const updates: { id: string; order: number }[] = [];

        const newScripts = get().scripts.map((script) => {
            const scriptCatId = script.categoryId || null;
            if (scriptCatId !== categoryId) return script;

            const newOrder = orderedIds.indexOf(script.id);
            if (newOrder === -1) return script;

            updates.push({ id: script.id, order: newOrder });
            return { ...script, order: newOrder };
        });

        // 1. 批量更新 SQLite
        for (const update of updates) {
            await dbUpdateScript(update.id, { order: update.order });
        }

        // 2. 更新 Store
        set({ scripts: newScripts });
    },
}));
