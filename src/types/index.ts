export * from './script';
export * from './tag';
export * from './variable';
export * from './category';
export * from './subscription';
export * from './transfer';

export type ViewMode = 'list' | 'grid';
export type Theme = 'light' | 'dark' | 'system';

export interface AppConfig {
    theme: Theme;
    viewMode: ViewMode;
    sidebarCollapsed: boolean;
}
