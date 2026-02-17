interface SelectionBoxProps {
    box: {
        left: number;
        top: number;
        width: number;
        height: number;
    } | null;
}

export function SelectionBox({ box }: SelectionBoxProps) {
    if (!box) return null;

    return (
        <div
            className="absolute border-2 border-primary-500 bg-primary-500/10 pointer-events-none z-50"
            style={{
                left: box.left,
                top: box.top,
                width: box.width,
                height: box.height,
            }}
        />
    );
}
