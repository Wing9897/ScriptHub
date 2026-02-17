import { useState, useCallback, useRef, useEffect } from 'react';

interface BoxSelectionState {
    isSelecting: boolean;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
}

interface SelectionTarget {
    selector: string;
    getItemId: (element: Element) => string | null;
    onSelectionChange: (selectedIds: string[]) => void;
    currentSelection?: Set<string>;
}

interface UseBoxSelectionOptions {
    containerRef: React.RefObject<HTMLElement>;
    targets: SelectionTarget[];
    enabled?: boolean;
    minSelectionSize?: number;
}

// 緩存的元素位置信息
interface CachedElementRect {
    id: string;
    left: number;
    top: number;
    right: number;
    bottom: number;
}

interface CachedTarget {
    rects: CachedElementRect[];
    initialSelection: Set<string>;
}

export function useBoxSelection(options: UseBoxSelectionOptions) {
    const {
        containerRef,
        targets,
        enabled = true,
        minSelectionSize = 5,
    } = options;

    const [selection, setSelection] = useState<BoxSelectionState | null>(null);
    const startPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const hasMovedRef = useRef(false);
    const justFinishedSelectingRef = useRef(false);

    // 緩存元素位置，避免每次 mousemove 都查詢 DOM
    const cachedTargetsRef = useRef<CachedTarget[]>([]);
    const lastSelectionRef = useRef<string[][]>([]);
    const rafIdRef = useRef<number | null>(null);

    const getSelectionBox = useCallback(() => {
        if (!selection) return null;
        const { startX, startY, currentX, currentY } = selection;
        return {
            left: Math.min(startX, currentX),
            top: Math.min(startY, currentY),
            width: Math.abs(currentX - startX),
            height: Math.abs(currentY - startY),
        };
    }, [selection]);

    // 檢查矩形是否相交
    const rectsIntersect = useCallback((
        rect: CachedElementRect,
        box: { left: number; top: number; width: number; height: number }
    ) => {
        const boxRight = box.left + box.width;
        const boxBottom = box.top + box.height;
        return !(rect.right < box.left || rect.left > boxRight || rect.bottom < box.top || rect.top > boxBottom);
    }, []);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (!enabled) return;
        if (e.button !== 0) return;

        const targetEl = e.target as HTMLElement;
        if (targetEl.closest('button, a, input, textarea, [data-no-select]')) return;

        const container = containerRef.current;
        if (!container) return;

        const containerRect = container.getBoundingClientRect();
        if (e.clientX < containerRect.left || e.clientX > containerRect.right ||
            e.clientY < containerRect.top || e.clientY > containerRect.bottom) {
            return;
        }

        // 檢查點擊位置是否在任何可選項目的邊界內
        for (const target of targets) {
            const items = container.querySelectorAll(target.selector);
            for (const item of items) {
                const rect = item.getBoundingClientRect();
                if (e.clientX >= rect.left && e.clientX <= rect.right &&
                    e.clientY >= rect.top && e.clientY <= rect.bottom) {
                    return; // 點擊在項目上，不開始框選
                }
            }
        }

        const rect = container.getBoundingClientRect();
        const scrollLeft = container.scrollLeft;
        const scrollTop = container.scrollTop;
        const x = e.clientX - rect.left + scrollLeft;
        const y = e.clientY - rect.top + scrollTop;

        startPosRef.current = { x, y };
        hasMovedRef.current = false;
        justFinishedSelectingRef.current = false;

        // 緩存所有元素的位置 (只在開始框選時計算一次)
        cachedTargetsRef.current = targets.map((target) => {
            const items = container.querySelectorAll(target.selector);
            const rects: CachedElementRect[] = [];

            items.forEach(item => {
                const id = target.getItemId(item);
                if (id) {
                    const itemRect = item.getBoundingClientRect();
                    rects.push({
                        id,
                        left: itemRect.left - rect.left + scrollLeft,
                        top: itemRect.top - rect.top + scrollTop,
                        right: itemRect.left - rect.left + scrollLeft + itemRect.width,
                        bottom: itemRect.top - rect.top + scrollTop + itemRect.height,
                    });
                }
            });

            const initialSelection = (e.ctrlKey || e.metaKey)
                ? new Set(target.currentSelection || [])
                : new Set<string>();

            if (!(e.ctrlKey || e.metaKey)) {
                target.onSelectionChange([]);
            }

            return { rects, initialSelection };
        });

        lastSelectionRef.current = targets.map(() => []);

        setSelection({
            isSelecting: true,
            startX: x,
            startY: y,
            currentX: x,
            currentY: y,
        });

        e.preventDefault();
    }, [enabled, containerRef, targets]);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!selection?.isSelecting) return;

        const container = containerRef.current;
        if (!container) return;

        // 取消之前的 RAF
        if (rafIdRef.current !== null) {
            cancelAnimationFrame(rafIdRef.current);
        }

        // 使用 RAF 節流更新
        rafIdRef.current = requestAnimationFrame(() => {
            const rect = container.getBoundingClientRect();
            const x = e.clientX - rect.left + container.scrollLeft;
            const y = e.clientY - rect.top + container.scrollTop;

            setSelection(prev => prev ? { ...prev, currentX: x, currentY: y } : null);

            const startX = startPosRef.current.x;
            const startY = startPosRef.current.y;
            const boxWidth = Math.abs(x - startX);
            const boxHeight = Math.abs(y - startY);

            if (boxWidth < minSelectionSize && boxHeight < minSelectionSize) {
                return;
            }

            hasMovedRef.current = true;

            const box = {
                left: Math.min(startX, x),
                top: Math.min(startY, y),
                width: boxWidth,
                height: boxHeight,
            };

            // 使用緩存的位置計算選中項目
            cachedTargetsRef.current.forEach((cached, index) => {
                const selectedIds: string[] = [...cached.initialSelection];

                for (const rect of cached.rects) {
                    if (rectsIntersect(rect, box) && !selectedIds.includes(rect.id)) {
                        selectedIds.push(rect.id);
                    }
                }

                // 只有選擇變化時才觸發回調
                const lastSelection = lastSelectionRef.current[index];
                if (selectedIds.length !== lastSelection.length ||
                    !selectedIds.every((id, i) => lastSelection[i] === id)) {
                    lastSelectionRef.current[index] = selectedIds;
                    targets[index].onSelectionChange(selectedIds);
                }
            });
        });
    }, [selection?.isSelecting, containerRef, targets, rectsIntersect, minSelectionSize]);

    const handleMouseUp = useCallback(() => {
        if (selection?.isSelecting) {
            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }
            if (hasMovedRef.current) {
                justFinishedSelectingRef.current = true;
                setTimeout(() => {
                    justFinishedSelectingRef.current = false;
                }, 100);
            }
            cachedTargetsRef.current = [];
            setSelection(null);
        }
    }, [selection]);

    useEffect(() => {
        if (selection?.isSelecting) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                if (rafIdRef.current !== null) {
                    cancelAnimationFrame(rafIdRef.current);
                }
            };
        }
    }, [selection?.isSelecting, handleMouseMove, handleMouseUp]);

    const selectionBox = getSelectionBox();
    const shouldShowBox = selectionBox &&
        (selectionBox.width >= minSelectionSize || selectionBox.height >= minSelectionSize);

    const shouldIgnoreClick = useCallback(() => {
        return justFinishedSelectingRef.current;
    }, []);

    return {
        handleMouseDown,
        selectionBox: selection?.isSelecting && shouldShowBox ? selectionBox : null,
        isSelecting: selection?.isSelecting || false,
        shouldIgnoreClick,
    };
}
