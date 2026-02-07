// Platform display constants - shared across ScriptCard and ScriptListItem
export const PLATFORM_LABELS: Record<string, string> = {
    windows: 'Windows',
    macos: 'macOS',
    linux: 'Linux',
    cross: 'Cross Platform',
};

export const PLATFORM_COLORS: Record<string, string> = {
    windows: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    macos: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
    linux: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    cross: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

// Background colors - shared across CategoryGrid and SettingsPage
export const BACKGROUND_COLORS = [
    { id: 'default', name: 'background.default', class: 'bg-gray-50 dark:bg-dark-900', color: 'bg-gray-100' },
    { id: 'blue', name: 'background.blue', class: 'bg-blue-50 dark:bg-blue-900/20', color: 'bg-blue-100' },
    { id: 'green', name: 'background.green', class: 'bg-green-50 dark:bg-green-900/20', color: 'bg-green-100' },
    { id: 'purple', name: 'background.purple', class: 'bg-purple-50 dark:bg-purple-900/20', color: 'bg-purple-100' },
    { id: 'orange', name: 'background.orange', class: 'bg-orange-50 dark:bg-orange-900/20', color: 'bg-orange-100' },
    { id: 'pink', name: 'background.pink', class: 'bg-pink-50 dark:bg-pink-900/20', color: 'bg-pink-100' },
] as const;

export type BackgroundColorId = typeof BACKGROUND_COLORS[number]['id'];

// Helper to get background class by ID
export function getBackgroundClass(id: string): string {
    return BACKGROUND_COLORS.find(c => c.id === id)?.class || 'bg-gray-50 dark:bg-dark-900';
}
