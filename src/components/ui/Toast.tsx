import { useEffect } from 'react';
import { CheckCircle, XCircle, Info, X, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useUIStore, Toast as ToastType } from '@/stores';

export function ToastContainer() {
    const toasts = useUIStore((state) => state.toasts);
    const removeToast = useUIStore((state) => state.removeToast);

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
            {toasts.map((toast) => (
                <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
            ))}
        </div>
    );
}

interface ToastItemProps {
    toast: ToastType;
    onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
    useEffect(() => {
        if (toast.persistent) return;
        const timer = setTimeout(() => {
            onRemove(toast.id);
        }, 3000);
        return () => clearTimeout(timer);
    }, [toast.id, toast.persistent, onRemove]);

    const icons = {
        success: CheckCircle,
        error: XCircle,
        info: Info,
    };
    const Icon = toast.persistent ? Loader2 : icons[toast.type];

    return (
        <div
            className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg animate-slide-up',
                'bg-white dark:bg-dark-800 border',
                {
                    'border-green-200 dark:border-green-800': toast.type === 'success',
                    'border-red-200 dark:border-red-800': toast.type === 'error',
                    'border-blue-200 dark:border-blue-800': toast.type === 'info',
                }
            )}
        >
            <Icon
                className={cn('w-5 h-5 flex-shrink-0', {
                    'text-green-500': toast.type === 'success',
                    'text-red-500': toast.type === 'error',
                    'text-blue-500': toast.type === 'info',
                    'animate-spin': toast.persistent,
                })}
            />
            <span className="text-sm text-gray-900 dark:text-gray-100">
                {toast.message}
            </span>
            {!toast.persistent && (
                <button
                    onClick={() => onRemove(toast.id)}
                    className="ml-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                    <X className="w-4 h-4" />
                </button>
            )}
        </div>
    );
}
