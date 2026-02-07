import { Sun, Moon, Monitor } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores';
import { Theme } from '@/types';
import { cn } from '@/utils/cn';

export function ThemeToggle() {
    const { t } = useTranslation();
    const theme = useUIStore((state) => state.theme);
    const setTheme = useUIStore((state) => state.setTheme);

    const themes: { value: Theme; icon: typeof Sun; label: string }[] = [
        { value: 'light', icon: Sun, label: t('theme.light') },
        { value: 'dark', icon: Moon, label: t('theme.dark') },
        { value: 'system', icon: Monitor, label: t('theme.system') },
    ];

    return (
        <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-dark-700 rounded-lg">
            {themes.map(({ value, icon: Icon, label }) => (
                <button
                    key={value}
                    onClick={() => setTheme(value)}
                    className={cn(
                        'p-2 rounded-md transition-all',
                        theme === value
                            ? 'bg-white dark:bg-dark-600 shadow-sm text-primary-500'
                            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                    )}
                    title={label}
                >
                    <Icon className="w-4 h-4" />
                </button>
            ))}
        </div>
    );
}
