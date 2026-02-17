import { useEffect, useRef } from 'react';
import { cn } from '@/utils';

export interface ContextMenuItem {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    variant?: 'default' | 'danger';
    disabled?: boolean;
}

interface ContextMenuProps {
    x: number;
    y: number;
    items: ContextMenuItem[];
    onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        const handleScroll = () => onClose();
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        document.addEventListener('mousedown', handleClick);
        document.addEventListener('scroll', handleScroll, true);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('scroll', handleScroll, true);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    useEffect(() => {
        if (!menuRef.current) return;
        const rect = menuRef.current.getBoundingClientRect();
        const el = menuRef.current;
        if (rect.right > window.innerWidth) {
            el.style.left = `${x - rect.width}px`;
        }
        if (rect.bottom > window.innerHeight) {
            el.style.top = `${y - rect.height}px`;
        }
    }, [x, y]);

    return (
        <div
            ref={menuRef}
            className="fixed z-[200] min-w-[140px] bg-white dark:bg-dark-800 rounded-lg shadow-xl border border-gray-200 dark:border-dark-600 py-1 animate-in fade-in zoom-in-95 duration-100"
            style={{ left: x, top: y }}
        >
            {items.map((item) => (
                <button
                    key={item.label}
                    onClick={() => { onClose(); item.onClick(); }}
                    disabled={item.disabled}
                    className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors",
                        item.variant === 'danger'
                            ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700",
                        item.disabled && "opacity-50 cursor-not-allowed"
                    )}
                >
                    {item.icon}
                    {item.label}
                </button>
            ))}
        </div>
    );
}
