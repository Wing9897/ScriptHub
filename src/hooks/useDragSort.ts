import { useState, useCallback, useEffect, DragEvent } from 'react';

interface DragSortOptions<T> {
    items: T[];
    getItemId: (item: T) => string;
    onReorder: (newItems: T[]) => void;
}

interface DragHandlers {
    onDragStart: (e: DragEvent<HTMLElement>, id: string) => void;
    onDragOver: (e: DragEvent<HTMLElement>) => void;
    onDragEnter: (e: DragEvent<HTMLElement>, id: string) => void;
    onDragLeave: (e: DragEvent<HTMLElement>) => void;
    onDrop: (e: DragEvent<HTMLElement>, id: string) => void;
    onDragEnd: () => void;
}

interface UseDragSortReturn<T> extends DragHandlers {
    draggedId: string | null;
    dragOverId: string | null;
    sortedItems: T[];
}

export function useDragSort<T>({
    items,
    getItemId,
    onReorder,
}: DragSortOptions<T>): UseDragSortReturn<T> {
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [dragOverId, setDragOverId] = useState<string | null>(null);

    // 組件卸載時清理 is-dragging class
    useEffect(() => {
        return () => {
            document.body.classList.remove('is-dragging');
        };
    }, []);

    const onDragStart = useCallback((e: DragEvent<HTMLElement>, id: string) => {
        setDraggedId(id);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', id);
        document.body.classList.add('is-dragging');
    }, []);

    const onDragOver = useCallback((e: DragEvent<HTMLElement>) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
    }, []);

    const onDragEnter = useCallback((e: DragEvent<HTMLElement>, id: string) => {
        e.preventDefault();
        if (id !== draggedId) {
            setDragOverId(id);
        }
    }, [draggedId]);

    const onDragLeave = useCallback((e: DragEvent<HTMLElement>) => {
        // Only clear if leaving the actual element, not a child
        const relatedTarget = e.relatedTarget as HTMLElement | null;
        if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
            setDragOverId(null);
        }
    }, []);

    const onDrop = useCallback((e: DragEvent<HTMLElement>, targetId: string) => {
        e.preventDefault();
        document.body.classList.remove('is-dragging');

        if (!draggedId || draggedId === targetId) {
            setDraggedId(null);
            setDragOverId(null);
            return;
        }

        const draggedIndex = items.findIndex(item => getItemId(item) === draggedId);
        const targetIndex = items.findIndex(item => getItemId(item) === targetId);

        if (draggedIndex === -1 || targetIndex === -1) {
            setDraggedId(null);
            setDragOverId(null);
            return;
        }

        const newItems = [...items];
        const [removed] = newItems.splice(draggedIndex, 1);
        newItems.splice(targetIndex, 0, removed);

        onReorder(newItems);
        setDraggedId(null);
        setDragOverId(null);
    }, [draggedId, items, getItemId, onReorder]);

    const onDragEnd = useCallback(() => {
        setDraggedId(null);
        setDragOverId(null);
        document.body.classList.remove('is-dragging');
    }, []);

    return {
        draggedId,
        dragOverId,
        sortedItems: items,
        onDragStart,
        onDragOver,
        onDragEnter,
        onDragLeave,
        onDrop,
        onDragEnd,
    };
}
