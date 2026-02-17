/**
 * useStorageInit Hook
 * 負責應用啟動時初始化存儲系統並加載數據到 Stores
 */

import { useEffect, useState } from 'react';
import { initStorage, loadAllData } from '@/services';
import { useCategoryStore, useScriptStore, useTagStore, useUIStore } from '@/stores';

interface StorageInitStatus {
    isLoading: boolean;
    isReady: boolean;
    error: string | null;
}

export function useStorageInit(): StorageInitStatus {
    const [status, setStatus] = useState<StorageInitStatus>({
        isLoading: true,
        isReady: false,
        error: null,
    });

    const setCategories = useCategoryStore((state) => state.setCategories);
    const setScripts = useScriptStore((state) => state.setScripts);
    const setTags = useTagStore((state) => state.setTags);
    const addToast = useUIStore((state) => state.addToast);

    useEffect(() => {
        let mounted = true;

        async function init() {
            try {


                // 1. 檢測環境 (檢查 window.__TAURI__ 因為我們啟用了 withGlobalTauri)
                const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI__;

                if (isTauri) {
                    // Tauri 環境：正常初始化
                    await initStorage();
                    const data = await loadAllData();

                    if (!mounted) return;

                    setCategories(data.categories);
                    setScripts(data.scripts);
                    setTags(data.tags);


                } else if (import.meta.env.DEV) {
                    // 瀏覽器環境 (僅開發模式)：加載 Mock 數據 (用於 UI 測試)
                    console.warn('[useStorageInit] Running in Browser Mode (Mock Data)');

                    // 模擬延遲
                    await new Promise(resolve => setTimeout(resolve, 800));

                    if (!mounted) return;

                    // Mock Categories
                    const mockCategories = [
                        { id: 'cat1', name: 'Develop', icon: 'code', order: 0, createdAt: new Date().toISOString(), isSubscription: false },
                        { id: 'cat2', name: 'Ops', icon: 'server', order: 1, createdAt: new Date().toISOString(), isSubscription: false }
                    ];

                    // Mock Scripts
                    const mockScripts = [
                        {
                            id: 's1',
                            title: 'Hello World',
                            description: 'A simple test script',
                            platform: 'cross',
                            commands: [{ id: 'c1', order: 0, content: 'echo "Hello World"', description: '' }],
                            tags: ['t1'],
                            categoryId: 'cat1',
                            order: 0,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                            isFavorite: true
                        }
                    ];

                    const mockTags = [{ id: 't1', name: 'Test', color: '#ff0000', createdAt: new Date().toISOString() }];

                    setCategories(mockCategories as any);
                    setScripts(mockScripts as any);
                    setTags(mockTags as any);

                    addToast({ type: 'info', message: 'Browser Mode: Using Mock Data' });
                } else {
                    // 生產環境但未檢測到 Tauri：嚴重錯誤
                    throw new Error('Tauri environment not detected in production build.');
                }

                setStatus({
                    isLoading: false,
                    isReady: true,
                    error: null,
                });
            } catch (error) {
                console.error('[useStorageInit] Failed:', error);

                if (!mounted) return;

                // 更友好的錯誤顯示
                let errorMessage = error instanceof Error
                    ? error.message
                    : (typeof error === 'string' ? error : JSON.stringify(error));

                // 如果是 Tauri API 錯誤但在瀏覽器中，提示用戶
                if (errorMessage.includes('IPC') || errorMessage.includes('invoke')) {
                    errorMessage = 'Tauri API unavailable. Are you running in a browser?';
                }

                setStatus({
                    isLoading: false,
                    isReady: false,
                    error: errorMessage,
                });
            }
        }

        init();

        return () => {
            mounted = false;
        };
    }, [setCategories, setScripts, setTags, addToast]);

    return status;
}
