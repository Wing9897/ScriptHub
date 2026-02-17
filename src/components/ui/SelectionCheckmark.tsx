import { Check } from 'lucide-react';
import { cn } from '@/utils';

interface SelectionCheckmarkProps {
    position?: 'top-left' | 'left-center';
}

export function SelectionCheckmark({ position = 'top-left' }: SelectionCheckmarkProps) {
    return (
        <div
            className={cn(
                'absolute z-10 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center',
                position === 'top-left' && 'top-2 left-2',
                position === 'left-center' && 'left-2 top-1/2 -translate-y-1/2'
            )}
        >
            <Check className="w-3 h-3 text-white" />
        </div>
    );
}
