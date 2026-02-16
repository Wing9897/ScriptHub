import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import { MainLayout } from './components/layout/MainLayout';
import { CloseBehaviorModal } from './components/modals/CloseBehaviorModal';
import { useUIStore } from './stores';
import { useShortcuts, useStorageInit } from './hooks';
import { Loader2 } from 'lucide-react';

function App() {
    const { t } = useTranslation();
    const theme = useUIStore((state) => state.theme);
    const startMinimized = useUIStore((state) => state.startMinimized);
    const { isLoading, error } = useStorageInit();
    const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);

    // Initialize keyboard shortcuts
    useShortcuts();

    // 處理靜默啟動：如果設定為不靜默啟動，則顯示窗口
    useEffect(() => {
        if (typeof window !== 'undefined' && (window as any).__TAURI__ && !isLoading) {
            // 如果用戶設定不要靜默啟動，則顯示窗口
            if (!startMinimized) {
                const appWindow = getCurrentWindow();
                appWindow.show();
                appWindow.setFocus();
            }
        }
    }, [isLoading, startMinimized]);

    useEffect(() => {
        const root = window.document.documentElement;

        if (theme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
                ? 'dark'
                : 'light';
            root.classList.toggle('dark', systemTheme === 'dark');

            // Listen for system theme changes
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handler = (e: MediaQueryListEvent) => {
                root.classList.toggle('dark', e.matches);
            };
            mediaQuery.addEventListener('change', handler);
            return () => mediaQuery.removeEventListener('change', handler);
        } else {
            root.classList.toggle('dark', theme === 'dark');
        }
    }, [theme]);

    // Handle close request
    useEffect(() => {
        // Check if running in Tauri environment
        if (typeof window !== 'undefined' && !(window as any).__TAURI__) {
            return;
        }

        const appWindow = getCurrentWindow();

        const unlistenPromise = appWindow.onCloseRequested(async (event) => {
            const state = useUIStore.getState();

            // Prevent default close behavior to handle it manually
            // This is critical to stop the window from closing immediately
            event.preventDefault();

            if (state.closeBehavior === 'ask') {
                setIsCloseModalOpen(true);
            } else if (state.closeBehavior === 'minimize') {
                try {
                    await invoke('minimize_window');
                } catch (e) {
                    console.error('Failed to minimize window:', e);
                }
            } else if (state.closeBehavior === 'quit') {
                try {
                    await invoke('quit_app');
                } catch (e) {
                    console.error('Failed to quit app:', e);
                    // Fallback to force close if backend command fails?
                    // But if backend command fails, maybe window.close() won't work either if logic is broken.
                }
            }
        });

        return () => {
            unlistenPromise.then(unlisten => unlisten());
        };
    }, []);

    // Show loading screen during initialization
    if (isLoading) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
                </div>
            </div>
        );
    }

    // Show error screen if initialization failed
    if (error) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4 text-center">
                    <p className="text-lg font-semibold text-destructive">{t('app.initFailed')}</p>
                    <p className="text-sm text-muted-foreground">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
                    >
                        {t('app.retry')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            <MainLayout />
            <CloseBehaviorModal
                isOpen={isCloseModalOpen}
                onClose={() => setIsCloseModalOpen(false)}
            />
        </>
    );
}

export default App;
