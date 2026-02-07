import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Variable, NewVariable } from '@/types';
import {
    insertVariable,
    updateVariable as dbUpdateVariable,
    deleteVariable as dbDeleteVariable,
    type VariableRow
} from '@/services/database';

interface VariableState {
    variables: Variable[];
    setVariables: (variables: Variable[]) => void;
    addVariable: (variable: NewVariable) => Promise<Variable>;
    updateVariable: (id: string, updates: Partial<Omit<Variable, 'id' | 'createdAt'>>) => Promise<void>;
    deleteVariable: (id: string) => Promise<void>;
    getVariableByName: (name: string) => Variable | undefined;
    getVariableDefaults: () => Record<string, string>;
}

// Helper: Variable -> VariableRow
function variableToRow(variable: Variable): VariableRow {
    return {
        id: variable.id,
        name: variable.name,
        default_value: variable.defaultValue,
        description: variable.description || null,
        created_at: variable.createdAt,
        updated_at: variable.updatedAt
    };
}

export const useVariableStore = create<VariableState>()((set, get) => ({
    variables: [],

    setVariables: (variables) => set({ variables }),

    addVariable: async (newVariable) => {
        const now = new Date().toISOString();
        const variable: Variable = {
            id: uuidv4(),
            ...newVariable,
            createdAt: now,
            updatedAt: now,
        };

        // 1. 寫入 SQLite
        await insertVariable(variableToRow(variable));

        // 2. 更新 Store
        set((state) => ({ variables: [...state.variables, variable] }));

        return variable;
    },

    updateVariable: async (id, updates) => {
        const now = new Date().toISOString();

        // 1. 更新 SQLite
        const dbUpdates: Partial<VariableRow> = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.defaultValue !== undefined) dbUpdates.default_value = updates.defaultValue;
        if (updates.description !== undefined) dbUpdates.description = updates.description || null;
        dbUpdates.updated_at = now;

        await dbUpdateVariable(id, dbUpdates);

        // 2. 更新 Store
        set((state) => ({
            variables: state.variables.map((variable) =>
                variable.id === id
                    ? { ...variable, ...updates, updatedAt: now }
                    : variable
            ),
        }));
    },

    deleteVariable: async (id) => {
        // 1. 刪除 SQLite
        await dbDeleteVariable(id);

        // 2. 更新 Store
        set((state) => ({
            variables: state.variables.filter((variable) => variable.id !== id),
        }));
    },

    getVariableByName: (name) => {
        return get().variables.find((v) => v.name === name);
    },

    getVariableDefaults: () => {
        const { variables } = get();
        return variables.reduce(
            (acc, v) => ({ ...acc, [v.name]: v.defaultValue }),
            {} as Record<string, string>
        );
    },
}));
