export interface Category {
    id: string;
    name: string;
    icon: string;           // 預設圖標名稱
    customIcon?: string;    // 用戶上傳的圖片 (base64 或 data URL)
    description?: string;
    order: number;
    createdAt: string;
    // 訂閱相關欄位
    isSubscription?: boolean;     // 是否為訂閱類別
    sourceUrl?: string;           // 來源 URL (GitHub/Gitee)
    lastSyncedAt?: string;        // 最後同步時間
}

export interface NewCategory {
    name: string;
    icon: string;
    customIcon?: string;
    description?: string;
}

// 預設圖標列表 (app_logo 為預設選項)
export const DEFAULT_ICONS = [
    { id: 'app_logo', name: 'ScriptHub', file: 'app_logo.png' },
    { id: 'git', name: 'Git', file: 'category_icon_git.png' },
    { id: 'docker', name: 'Docker', file: 'category_icon_docker.png' },
    { id: 'python', name: 'Python', file: 'category_icon_python.png' },
    { id: 'nodejs', name: 'Node.js', file: 'category_icon_nodejs.png' },
    { id: 'database', name: 'Database', file: 'category_icon_database.png' },
    { id: 'terminal', name: 'Terminal', file: 'category_icon_terminal.png' },
    { id: 'linux', name: 'Linux', file: '' },
    { id: 'windows', name: 'Windows', file: '' },
    { id: 'cloud', name: 'Cloud', file: '' },
    { id: 'kubernetes', name: 'Kubernetes', file: '' },
    { id: 'rust', name: 'Rust', file: '' },
    { id: 'golang', name: 'Go', file: '' },
    { id: 'java', name: 'Java', file: '' },
    { id: 'network', name: 'Network', file: '' },
    { id: 'security', name: 'Security', file: '' },
    { id: 'folder', name: 'Folder', file: '' },
    { id: 'code', name: 'Code', file: '' },
    { id: 'server', name: 'Server', file: '' },
] as const;

export type DefaultIconId = typeof DEFAULT_ICONS[number]['id'];

