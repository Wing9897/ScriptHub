export interface Command {
    id: string;
    order: number;
    content: string;
    description?: string;
}

export interface Script {
    id: string;
    title: string;
    description: string;
    platform: 'windows' | 'macos' | 'linux' | 'cross';
    commands: Command[];
    tags: string[];
    categoryId?: string;  // 類別 ID（必填，創建時需選擇類別）
    order?: number;       // 排序順序 (用於拖曳排序)
    createdAt: string;
    updatedAt: string;
    isFavorite: boolean;
}

export type ScriptPlatform = Script['platform'];

export interface NewScript {
    title: string;
    description: string;
    platform: ScriptPlatform;
    commands: Omit<Command, 'id'>[];
    tags: string[];
    categoryId?: string;
}

