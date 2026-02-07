// GitHub API 回應類型
export interface GitHubContent {
    name: string;
    path: string;
    type: 'file' | 'dir';
    sha: string;
    size: number;
    download_url: string | null;
    html_url: string;
}

// Git Trees API 回應類型
export interface GitTreeItem {
    path: string;
    mode: string;
    type: 'blob' | 'tree';
    sha: string;
    size?: number;
    url: string;
}

// 解析後的 GitHub URL 資訊
export interface ParsedGitHubUrl {
    owner: string;
    repo: string;
    branch: string;
    path: string;
}

// 掃描到的腳本檔案
export interface ScannedScript {
    name: string;
    path: string;
    downloadUrl: string;
    platform: 'windows' | 'macos' | 'linux' | 'cross';
}

// 訂閱預覽資訊
export interface SubscriptionPreview {
    repoName: string;
    owner: string;
    scripts: ScannedScript[];
    url: string;
}

// 同步差異
export interface SyncDiff {
    added: ScannedScript[];
    removed: string[];  // script titles
    modified: ScannedScript[];
}
