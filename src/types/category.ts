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
    // 子資料夾支援
    parentId?: string | null;     // 父類別 ID
}

// 樹狀結構節點
export interface CategoryTreeNode extends Category {
    children: CategoryTreeNode[];
    level: number;
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
    { id: 'github', name: 'GitHub', file: '' },
    { id: 'docker', name: 'Docker', file: 'category_icon_docker.png' },
    { id: 'kubernetes', name: 'Kubernetes', file: '' },
    { id: 'python', name: 'Python', file: 'category_icon_python.png' },
    { id: 'nodejs', name: 'Node.js', file: 'category_icon_nodejs.png' },
    { id: 'golang', name: 'Go', file: '' },
    { id: 'rust', name: 'Rust', file: '' },
    { id: 'java', name: 'Java', file: '' },
    { id: 'cplusplus', name: 'C++', file: '' },
    { id: 'c_lang', name: 'C', file: '' },
    { id: 'csharp', name: 'C# / .NET', file: '' },
    { id: 'javascript', name: 'JavaScript', file: '' },
    { id: 'typescript', name: 'TypeScript', file: '' },
    { id: 'bash', name: 'Bash', file: '' },
    { id: 'apple', name: 'Apple', file: '' },
    { id: 'linux', name: 'Linux', file: '' },
    { id: 'windows', name: 'Windows', file: '' },
    { id: 'batch', name: 'Batch / CMD', file: '' },
    { id: 'database', name: 'Database', file: 'category_icon_database.png' },
    { id: 'redis', name: 'Redis', file: '' },
    { id: 'mongodb', name: 'MongoDB', file: '' },
    { id: 'terminal', name: 'Terminal', file: 'category_icon_terminal.png' },
    { id: 'cloud', name: 'Cloud', file: '' },
    { id: 'aws', name: 'AWS', file: '' },
    { id: 'nginx', name: 'Nginx', file: '' },
    { id: 'terraform', name: 'Terraform', file: '' },
    { id: 'ansible', name: 'Ansible', file: '' },
    { id: 'network', name: 'Network', file: '' },
    { id: 'security', name: 'Security', file: '' },
    { id: 'server', name: 'Server', file: '' },
    { id: 'folder', name: 'Folder', file: '' },
    { id: 'code', name: 'Code', file: '' },
] as const;
