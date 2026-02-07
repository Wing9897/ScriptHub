import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';
import { Button } from './Button';
import { cn } from '@/utils';

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'info' | 'danger' | 'warning';
}

export function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText,
    cancelText,
    variant = 'info'
}: ConfirmDialogProps) {
    const { t } = useTranslation();

    // Default values using t()
    const finalConfirmText = confirmText || t('common.confirm');
    const finalCancelText = cancelText || t('common.cancel');

    const iconColors = {
        danger: 'text-red-500 bg-red-100 dark:bg-red-900/30',
        warning: 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30',
        info: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30'
    };

    const buttonVariants: Record<string, string> = {
        danger: 'bg-red-600 hover:bg-red-700 text-white',
        warning: 'bg-yellow-600 hover:bg-yellow-700 text-white',
        info: 'bg-blue-600 hover:bg-blue-700 text-white'
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Dialog */}
            <div className="relative bg-white dark:bg-dark-800 rounded-xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6">
                    <div className="flex items-start gap-4">
                        <div className={cn(
                            "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
                            iconColors[variant]
                        )}>
                            <AlertCircle className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                {title}
                            </h3>
                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                {message}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 dark:bg-dark-800/50 rounded-b-xl border-t border-gray-100 dark:border-dark-700">
                    <Button variant="ghost" onClick={onClose}>
                        {finalCancelText}
                    </Button>
                    <button
                        onClick={onConfirm}
                        className={cn(
                            "px-4 py-2 rounded-lg font-medium text-sm transition-colors",
                            buttonVariants[variant]
                        )}
                    >
                        {finalConfirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
