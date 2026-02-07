import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/utils/cn';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={cn(
                    'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'focus-visible:ring-2 focus-visible:ring-offset-2',
                    {
                        // Variants
                        'bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700 focus-visible:ring-primary-500':
                            variant === 'primary',
                        'bg-gray-100 dark:bg-dark-700 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-dark-600 focus-visible:ring-gray-500':
                            variant === 'secondary',
                        'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 focus-visible:ring-gray-500':
                            variant === 'ghost',
                        'bg-red-500 text-white hover:bg-red-600 active:bg-red-700 focus-visible:ring-red-500':
                            variant === 'danger',
                        // Sizes
                        'px-2.5 py-1.5 text-xs': size === 'sm',
                        'px-4 py-2 text-sm': size === 'md',
                        'px-6 py-3 text-base': size === 'lg',
                    },
                    className
                )}
                {...props}
            >
                {children}
            </button>
        );
    }
);

Button.displayName = 'Button';

export { Button };
