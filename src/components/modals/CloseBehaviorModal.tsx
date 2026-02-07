import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useUIStore } from '@/stores';

export function CloseBehaviorModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const { t } = useTranslation();
    const setCloseBehavior = useUIStore((state) => state.setCloseBehavior);
    const [dontAskAgain, setDontAskAgain] = useState(false);

    const handleAction = async (action: 'minimize' | 'quit') => {
        if (dontAskAgain) {
            setCloseBehavior(action);
        }

        try {
            if (action === 'minimize') {
                await invoke('minimize_window');
            } else {
                await invoke('quit_app');
            }
        } catch (error) {
            console.error('Failed to execute close action:', error);
        }
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t('settings.closeBehavior.title', 'Close Behavior')}
            size="sm"
        >
            <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-300">
                    {t('settings.closeBehavior.message', 'What should happen when you close the window?')}
                </p>

                <div className="flex flex-col gap-2">
                    <Button
                        variant="secondary"
                        onClick={() => handleAction('minimize')}
                        className="w-full justify-center"
                    >
                        {t('settings.closeBehavior.minimizeToTray', 'Minimize to Tray')}
                    </Button>
                    <Button
                        variant="danger"
                        onClick={() => handleAction('quit')}
                        className="w-full justify-center"
                    >
                        {t('settings.closeBehavior.quitApp', 'Quit Application')}
                    </Button>
                </div>

                <div className="flex items-center space-x-2 pt-2 border-t border-gray-100 dark:border-dark-700">
                    <input
                        type="checkbox"
                        id="dontAskAgain"
                        checked={dontAskAgain}
                        onChange={(e) => setDontAskAgain(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 bg-white dark:bg-dark-800 dark:border-dark-600 focus:ring-offset-0"
                    />
                    <label
                        htmlFor="dontAskAgain"
                        className="text-sm text-gray-600 dark:text-gray-300 cursor-pointer select-none"
                    >
                        {t('settings.closeBehavior.dontAskAgain', "Don't ask again")}
                    </label>
                </div>
            </div>
        </Modal>
    );
}
